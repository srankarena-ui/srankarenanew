#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

//! Cliente de escritorio de S-Rank Arena.
//!
//! Hace de sensor: lee la Live Client Data API local mientras juegas y le
//! reporta al backend qué campeón/rol estás usando. Nunca lleva la key de Riot
//! — todo lo que necesita la API oficial (maestría) lo resuelve el backend con
//! su propia key.

mod live_client;

use std::collections::HashSet;
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};

// Se hornean al compilar: `SRANK_API_BASE=... npm run tauri build`.
// Ver desktop-client/README.md.
fn api_base() -> &'static str {
    option_env!("SRANK_API_BASE").unwrap_or("http://localhost:3000")
}
fn supabase_url() -> &'static str {
    option_env!("SRANK_SUPABASE_URL").unwrap_or("")
}
fn supabase_anon_key() -> &'static str {
    option_env!("SRANK_SUPABASE_ANON_KEY").unwrap_or("")
}

/// Cada cuánto se pregunta por la partida. En partida se consulta seguido para
/// dar feedback rápido; fuera de partida se espacia para no gastar CPU.
const POLL_IN_GAME: u64 = 15;
const POLL_IDLE: u64 = 30;

#[derive(Serialize, Deserialize, Clone)]
struct Session {
    access_token: String,
    refresh_token: String,
    /// Epoch en segundos.
    expires_at: u64,
    email: String,
}

struct AppState {
    session: Mutex<Option<Session>>,
    http: reqwest::Client,
    /// Cliente aparte para la Live Client Data API: Riot la sirve con un
    /// certificado autofirmado, y solo apunta a 127.0.0.1.
    lcu: reqwest::Client,
}

#[derive(Serialize, Clone)]
struct Status {
    state: &'static str,
    detail: String,
}

fn now_secs() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs()
}

fn emit_status(app: &AppHandle, state: &'static str, detail: impl Into<String>) {
    let _ = app.emit("status", Status { state, detail: detail.into() });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sesión en disco
// ─────────────────────────────────────────────────────────────────────────────

fn session_file(app: &AppHandle) -> Option<std::path::PathBuf> {
    let dir = app.path().app_data_dir().ok()?;
    std::fs::create_dir_all(&dir).ok()?;
    Some(dir.join("session.json"))
}

fn save_session(app: &AppHandle, session: &Session) {
    if let Some(path) = session_file(app) {
        if let Ok(json) = serde_json::to_string(session) {
            let _ = std::fs::write(path, json);
        }
    }
}

fn load_session(app: &AppHandle) -> Option<Session> {
    let path = session_file(app)?;
    let json = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&json).ok()
}

fn clear_session(app: &AppHandle) {
    if let Some(path) = session_file(app) {
        let _ = std::fs::remove_file(path);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase Auth (GoTrue) a mano: son dos endpoints, no hace falta un SDK.
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: String,
    expires_in: u64,
    #[serde(default)]
    user: Option<TokenUser>,
}

#[derive(Deserialize)]
struct TokenUser {
    #[serde(default)]
    email: Option<String>,
}

async fn request_token(
    http: &reqwest::Client,
    grant: &str,
    body: serde_json::Value,
) -> Result<TokenResponse, String> {
    if supabase_url().is_empty() || supabase_anon_key().is_empty() {
        return Err("El cliente se compiló sin SRANK_SUPABASE_URL / SRANK_SUPABASE_ANON_KEY".into());
    }

    let res = http
        .post(format!("{}/auth/v1/token?grant_type={}", supabase_url(), grant))
        .header("apikey", supabase_anon_key())
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("No se pudo conectar: {e}"))?;

    if !res.status().is_success() {
        return Err(if res.status() == 400 {
            "Email o contraseña incorrectos".to_string()
        } else {
            format!("Error de autenticación ({})", res.status())
        });
    }

    res.json::<TokenResponse>().await.map_err(|e| e.to_string())
}

fn to_session(token: TokenResponse, fallback_email: &str) -> Session {
    let email = token
        .user
        .and_then(|u| u.email)
        .unwrap_or_else(|| fallback_email.to_string());
    Session {
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expires_at: now_secs() + token.expires_in,
        email,
    }
}

/// Devuelve un access token válido, renovándolo si está por vencer. `None` si
/// no hay sesión o el refresh falló (en cuyo caso se limpia).
async fn valid_token(app: &AppHandle) -> Option<String> {
    let state = app.state::<AppState>();

    let session = { state.session.lock().unwrap().clone() }?;
    if session.expires_at > now_secs() + 60 {
        return Some(session.access_token);
    }

    let body = serde_json::json!({ "refresh_token": session.refresh_token });
    match request_token(&state.http, "refresh_token", body).await {
        Ok(token) => {
            let refreshed = to_session(token, &session.email);
            let access = refreshed.access_token.clone();
            save_session(app, &refreshed);
            *state.session.lock().unwrap() = Some(refreshed);
            Some(access)
        }
        Err(_) => {
            clear_session(app);
            *state.session.lock().unwrap() = None;
            None
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Comandos expuestos a la ventana
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
async fn login(app: AppHandle, email: String, password: String) -> Result<String, String> {
    let http = { app.state::<AppState>().http.clone() };
    let body = serde_json::json!({ "email": email, "password": password });
    let session = to_session(request_token(&http, "password", body).await?, &email);
    let display = session.email.clone();

    save_session(&app, &session);
    *app.state::<AppState>().session.lock().unwrap() = Some(session);

    Ok(display)
}

#[tauri::command]
fn logout(app: AppHandle) {
    clear_session(&app);
    *app.state::<AppState>().session.lock().unwrap() = None;
}

#[tauri::command]
fn current_email(state: State<'_, AppState>) -> Option<String> {
    state.session.lock().unwrap().as_ref().map(|s| s.email.clone())
}

#[tauri::command]
fn autostart_enabled(app: AppHandle) -> bool {
    app.autolaunch().is_enabled().unwrap_or(false)
}

#[tauri::command]
fn set_autostart(app: AppHandle, enabled: bool) {
    let manager = app.autolaunch();
    let _ = if enabled { manager.enable() } else { manager.disable() };
}

/// Solo se llama después de que la ventana confirmó el cierre.
#[tauri::command]
fn exit_app(app: AppHandle) {
    app.exit(0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Bucle de sondeo
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Deserialize)]
struct ActiveChallenge {
    #[serde(rename = "challengeId")]
    challenge_id: String,
    title: String,
}

#[derive(Deserialize)]
struct ActiveResponse {
    challenges: Vec<ActiveChallenge>,
}

#[derive(Deserialize)]
struct ReportResponse {
    #[serde(default)]
    completed: bool,
}

async fn poll_loop(app: AppHandle) {
    // Identificador de la partida en curso. La Live Client Data API no expone
    // el gameId real de Riot, así que se genera uno al detectar cada partida:
    // sirve para que el backend deduplique los reportes de un mismo tick a
    // tick, que es todo lo que necesita.
    let mut game_id: Option<i64> = None;
    let mut reported: HashSet<String> = HashSet::new();

    loop {
        let token = match valid_token(&app).await {
            Some(token) => token,
            None => {
                emit_status(&app, "logged_out", "Inicia sesión para verificar retos");
                tokio::time::sleep(Duration::from_secs(5)).await;
                continue;
            }
        };

        let lcu = { app.state::<AppState>().lcu.clone() };
        let game = live_client::current_game(&lcu).await;

        match game {
            Ok(Some(game)) => {
                if game_id.is_none() {
                    game_id = Some(now_secs() as i64 * 1000);
                    reported.clear();
                }

                emit_status(
                    &app,
                    "in_game",
                    format!("Partida detectada — {} ({})", game.champion, game.game_mode),
                );

                report_challenges(&app, &token, &game, game_id.unwrap(), &mut reported).await;
                tokio::time::sleep(Duration::from_secs(POLL_IN_GAME)).await;
            }
            Ok(None) => {
                game_id = None;
                reported.clear();
                emit_status(&app, "waiting", "Sin partida en curso");
                tokio::time::sleep(Duration::from_secs(POLL_IDLE)).await;
            }
            Err(err) => {
                emit_status(&app, "error", format!("No se pudo leer la partida: {err}"));
                tokio::time::sleep(Duration::from_secs(POLL_IDLE)).await;
            }
        }
    }
}

async fn report_challenges(
    app: &AppHandle,
    token: &str,
    game: &live_client::LiveGame,
    game_id: i64,
    reported: &mut HashSet<String>,
) {
    let http = { app.state::<AppState>().http.clone() };

    let active = http
        .get(format!("{}/api/challenges/active", api_base()))
        .bearer_auth(token)
        .send()
        .await;

    let Ok(res) = active else { return };
    if !res.status().is_success() {
        return;
    }
    let Ok(active) = res.json::<ActiveResponse>().await else { return };

    for challenge in active.challenges {
        if reported.contains(&challenge.challenge_id) {
            continue;
        }

        // La cola (queueId) no va: la Live Client Data API solo expone gameMode.
        // Los retos que dependen de la cola los cierra el sync post-partida.
        let body = serde_json::json!({
            "challengeId": challenge.challenge_id,
            "gameId": game_id,
            "champion": game.champion,
            "role": game.role,
        });

        let res = http
            .post(format!("{}/api/challenges/report", api_base()))
            .bearer_auth(token)
            .json(&body)
            .send()
            .await;

        let Ok(res) = res else { continue };
        if !res.status().is_success() {
            continue;
        }

        if res.json::<ReportResponse>().await.map(|r| r.completed).unwrap_or(false) {
            reported.insert(challenge.challenge_id);
            emit_status(app, "completed", format!("¡Reto cumplido: {}!", challenge.title));
        }
    }
}

fn main() {
    let lcu = reqwest::Client::builder()
        // Solo se usa contra 127.0.0.1:2999, que Riot sirve con un certificado
        // autofirmado — sin esto toda llamada al cliente de League falla.
        .danger_accept_invalid_certs(true)
        .timeout(Duration::from_secs(5))
        .build()
        .expect("cliente HTTP local");

    let http = reqwest::Client::builder()
        .timeout(Duration::from_secs(20))
        .build()
        .expect("cliente HTTP");

    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .manage(AppState {
            session: Mutex::new(None),
            http,
            lcu,
        })
        .invoke_handler(tauri::generate_handler![
            login,
            logout,
            current_email,
            autostart_enabled,
            set_autostart,
            exit_app
        ])
        .setup(|app| {
            let handle = app.handle().clone();

            // Arrancar con el sistema es el default: el cliente solo sirve si
            // está corriendo cuando juegas. Se puede desactivar desde la UI.
            let _ = app.autolaunch().enable();

            if let Some(session) = load_session(&handle) {
                *app.state::<AppState>().session.lock().unwrap() = Some(session);
            }

            tauri::async_runtime::spawn(poll_loop(handle));
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Cerrar deja de verificar partidas: se confirma en la ventana
                // antes de salir de verdad (ver index.html).
                api.prevent_close();
                let _ = window.emit("confirm-close", ());
            }
        })
        .run(tauri::generate_context!())
        .expect("error al iniciar el cliente");
}

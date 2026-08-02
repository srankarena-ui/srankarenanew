//! Lectura de la Live Client Data API de League (https://127.0.0.1:2999).
//! Solo responde mientras hay una partida en curso; fuera de partida el puerto
//! ni siquiera escucha, así que un error de conexión es el caso normal, no un
//! fallo. Sirve un certificado autofirmado: el cliente HTTP que se le pase
//! tiene que aceptarlo (ver `lcu_client` en main.rs).

use serde::Deserialize;

const ALL_GAME_DATA: &str = "https://127.0.0.1:2999/liveclientdata/allgamedata";

/// Se puede apuntar a otra URL con SRANK_LIVE_URL para probar contra el mock
/// (`node desktop-client/mock-lcu.js`) sin entrar a una partida real.
fn all_game_data_url() -> String {
    std::env::var("SRANK_LIVE_URL").unwrap_or_else(|_| ALL_GAME_DATA.to_string())
}

#[derive(Debug, Clone, PartialEq)]
pub struct LiveGame {
    pub champion: String,
    /// "TOP" | "JUNGLE" | "MIDDLE" | "BOTTOM" | "UTILITY", o "" en modos sin
    /// posiciones (ARAM). Mismos valores que usa match-v5.
    pub role: String,
    pub game_mode: String,
    /// Segundos transcurridos de partida.
    pub game_time: f64,
}

#[derive(Deserialize)]
struct AllGameData {
    #[serde(rename = "activePlayer", default)]
    active_player: ActivePlayer,
    #[serde(rename = "allPlayers", default)]
    all_players: Vec<PlayerEntry>,
    #[serde(rename = "gameData", default)]
    game_data: GameData,
}

#[derive(Deserialize, Default)]
struct ActivePlayer {
    #[serde(rename = "riotIdGameName", default)]
    riot_id_game_name: String,
    #[serde(rename = "summonerName", default)]
    summoner_name: String,
}

#[derive(Deserialize, Default)]
struct PlayerEntry {
    #[serde(rename = "riotIdGameName", default)]
    riot_id_game_name: String,
    #[serde(rename = "summonerName", default)]
    summoner_name: String,
    #[serde(rename = "championName", default)]
    champion_name: String,
    #[serde(default)]
    position: String,
}

#[derive(Deserialize, Default)]
struct GameData {
    #[serde(rename = "gameMode", default)]
    game_mode: String,
    #[serde(rename = "gameTime", default)]
    game_time: f64,
}

/// `Ok(None)` = no hay partida (o el cliente de League no está abierto).
/// `Err` = había partida pero la respuesta no se pudo interpretar.
pub async fn current_game(client: &reqwest::Client) -> Result<Option<LiveGame>, String> {
    let res = match client.get(all_game_data_url()).send().await {
        Ok(res) => res,
        Err(_) => return Ok(None),
    };

    if !res.status().is_success() {
        return Ok(None);
    }

    let data: AllGameData = res.json().await.map_err(|e| e.to_string())?;

    // Riot cambió summonerName por riotIdGameName; se acepta cualquiera de los
    // dos para no depender del parche instalado.
    let me = data
        .all_players
        .iter()
        .find(|p| {
            (!data.active_player.riot_id_game_name.is_empty()
                && p.riot_id_game_name == data.active_player.riot_id_game_name)
                || (!data.active_player.summoner_name.is_empty()
                    && p.summoner_name == data.active_player.summoner_name)
        })
        .ok_or_else(|| "No se encontró al jugador activo en la lista".to_string())?;

    Ok(Some(LiveGame {
        champion: me.champion_name.clone(),
        role: me.position.clone(),
        game_mode: data.game_data.game_mode.clone(),
        game_time: data.game_data.game_time,
    }))
}

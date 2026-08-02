// Acceso a datos del cliente.
//
// Las lecturas van directas a Supabase con el JWT del usuario: las tablas de
// torneos, perfiles e inscripciones tienen política de lectura pública y RLS se
// encarga del resto, así que no hace falta un endpoint por consulta.
// Las escrituras con lógica (inscribirse, reportar un reto) sí pasan por el
// backend, que valida y usa la clave de servicio.

const { invoke } = window.__TAURI__.core;

let session = null;

/** Pide a Rust el token ya renovado. Se cachea hasta que caduca. */
export async function getSession(force = false) {
  if (!force && session && session.fetchedAt > Date.now() - 60_000) return session;
  const s = await invoke("webview_session");
  session = s ? { ...s, fetchedAt: Date.now() } : null;
  return session;
}

export function clearSession() {
  session = null;
}

async function request(url, { method = "GET", body, headers = {}, supabase = false } = {}) {
  const s = await getSession();
  if (!s) throw new Error("Sesión no iniciada");

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${s.access_token}`,
      ...(supabase ? { apikey: s.supabase_anon_key } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new Error(`${res.status} ${detalle.slice(0, 200)}`);
  }
  return res.status === 204 ? null : res.json();
}

/** Consulta a la API REST de Supabase. `query` es la parte tras la tabla. */
export async function db(table, query = "") {
  const s = await getSession();
  return request(`${s.supabase_url}/rest/v1/${table}${query}`, { supabase: true });
}

/** Llamada al backend de S-Rank Arena. */
export async function api(path, opts) {
  const s = await getSession();
  return request(`${s.api_base}${path}`, opts);
}

// ── Consultas concretas ─────────────────────────────────────────────────────

export const getInbox = () => api("/api/me/inbox");

export const getRetosActivos = () => api("/api/challenges/active");

export async function getPerfil() {
  const s = await getSession();
  const { data } = await invoke("current_user_id").catch(() => ({ data: null }));
  // El id sale del propio JWT; Supabase lo resuelve con el filtro de RLS.
  const filas = await db("profiles", `?select=*&limit=1&order=created_at.asc&id=eq.${data ?? s.user_id ?? ""}`);
  return filas?.[0] ?? null;
}

/** Torneos visibles, con el número de inscritos. */
export const getTorneos = () =>
  db("tournaments", "?select=id,title,game,mode,status,start_date,max_participants,reward_points,banner_url,tournament_format"
    + "&status=in.(registration,active,completed)&order=start_date.desc.nullslast&limit=50");

export const getTorneo = (id) =>
  db("tournaments", `?select=*&id=eq.${id}`).then((f) => f?.[0] ?? null);

export const getParticipantes = (torneoId) =>
  db("tournament_participants", `?select=user_id,profile:profiles(id,username,avatar_url)&tournament_id=eq.${torneoId}`);

export const getClasificacionTrials = (torneoId) =>
  db("summoner_trials_enrollments",
    `?select=user_id,score,leaderboard_rank,matches_tracked,stats_snapshot,profile:profiles(username,avatar_url)`
    + `&tournament_id=eq.${torneoId}&order=score.desc`);

export const getLogros = (userId) =>
  db("user_arena_stats", `?select=*&user_id=eq.${userId}`).then((f) => f?.[0] ?? null);

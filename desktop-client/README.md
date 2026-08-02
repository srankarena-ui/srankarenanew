# Cliente de escritorio — S-Rank Arena

App de Tauri que verifica retos leyendo la partida en curso. Hace de **sensor**:
lee la Live Client Data API local de League (`127.0.0.1:2999`, sin auth, solo
disponible durante la partida) y le reporta al backend qué campeón y rol estás
jugando. **No lleva la key de Riot**: todo lo que necesita la API oficial
(maestría) lo resuelve el backend con su propia key.

## Requisitos

- [Rust](https://rustup.rs) (el repo principal no lo necesita, solo este cliente)
- Node 20+ para el CLI de Tauri
- En Windows: WebView2 (ya viene con Windows 11)

## Configuración

Las tres URLs/keys se hornean al compilar. La anon key de Supabase es pública
por diseño (es la que usa el navegador), así que puede ir en el binario:

```bash
export SRANK_API_BASE=https://tu-dominio-de-srank-arena
export SRANK_SUPABASE_URL=https://TU-PROYECTO.supabase.co
export SRANK_SUPABASE_ANON_KEY=eyJ...
```

Sin ellas el cliente compila igual pero avisa al intentar iniciar sesión.

## Desarrollo

```bash
npm install
npm run dev
```

### Probar sin entrar a una partida

El mock sirve la misma forma de respuesta que Riot, en HTTP plano:

```bash
node mock-lcu.js --champion Jhin --role BOTTOM      # una terminal
SRANK_LIVE_URL=http://127.0.0.1:2999/liveclientdata/allgamedata npm run dev
```

`--no-game` hace que responda 404, para ver el estado "sin partida".

## Instalador

```bash
npm run tauri icon ruta/al/logo.png   # genera src-tauri/icons/, solo la primera vez
npm run build
```

Deja el `.exe` de instalación en `src-tauri/target/release/bundle/nsis/`.

El instalador **no está firmado**: Windows SmartScreen mostrará una advertencia
la primera vez. Firmarlo requiere un certificado de code signing aparte.

## Comportamiento

- **Arranca con Windows** por defecto (se puede desactivar desde la ventana): el
  cliente solo sirve si está corriendo mientras juegas.
- **Al cerrar pide confirmación**, porque cerrarlo deja de verificar los retos
  que dependen de datos en vivo.
- Sondea cada 15 s en partida y cada 30 s fuera de ella.
- La sesión (tokens de Supabase) se guarda en el directorio de datos de la app y
  se renueva sola.

## Límites conocidos

- La Live Client Data API **no expone el `queueId`** (solo `gameMode`), así que
  los retos por cola no se pueden cerrar en vivo: los cierra el job
  `POST /api/challenges/sync` con el historial (match-v5).
- Tampoco expone el `gameId` real de Riot: el cliente genera uno por partida
  detectada, que al backend le alcanza para deduplicar los reportes de cada tick.

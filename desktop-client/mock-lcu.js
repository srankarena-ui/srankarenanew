// Mock de la Live Client Data API para probar el cliente sin entrar a una
// partida real. Sirve HTTP plano (la de Riot es HTTPS con cert autofirmado),
// así que hay que apuntar el cliente con SRANK_LIVE_URL:
//
//   node desktop-client/mock-lcu.js --champion Jhin --role BOTTOM
//   SRANK_LIVE_URL=http://127.0.0.1:2999/liveclientdata/allgamedata npm run dev
//
// Con --no-game responde 404, para probar el estado "sin partida".
import { createServer } from "node:http";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    champion: { type: "string", default: "Jhin" },
    role: { type: "string", default: "BOTTOM" },
    mode: { type: "string", default: "CLASSIC" },
    name: { type: "string", default: "TestSummoner" },
    port: { type: "string", default: "2999" },
    "no-game": { type: "boolean", default: false },
  },
});

const body = () => JSON.stringify({
  activePlayer: { riotIdGameName: values.name, summonerName: values.name },
  allPlayers: [
    {
      riotIdGameName: values.name,
      summonerName: values.name,
      championName: values.champion,
      position: values.role,
    },
  ],
  gameData: { gameMode: values.mode, gameTime: 300.0 },
});

createServer((req, res) => {
  if (values["no-game"]) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "content-type": "application/json" }).end(body());
}).listen(Number(values.port), "127.0.0.1", () => {
  const state = values["no-game"] ? "sin partida" : `${values.champion} / ${values.role} / ${values.mode}`;
  console.log(`mock Live Client Data en http://127.0.0.1:${values.port} — ${state}`);
});

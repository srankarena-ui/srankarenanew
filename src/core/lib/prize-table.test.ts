// Self-check: `node src/core/lib/prize-table.test.ts`
import assert from "node:assert/strict";
import { parsePrizeTable, placementLabel, medalFor, overlappingRows } from "./prize-table.ts";

assert.equal(placementLabel({ from: 1, to: 1 }), "1º");
assert.equal(placementLabel({ from: 3, to: 4 }), "3º-4º");
assert.equal(placementLabel({ from: 5, to: 8 }), "5º-8º");

assert.equal(medalFor({ from: 1 }), "🥇");
assert.equal(medalFor({ from: 3 }), "🥉");
assert.equal(medalFor({ from: 4 }), null);
// Un rango que empieza en el podio lo lleva; 5º-8º no.
assert.equal(medalFor({ from: 5 }), null);

// Se ordena por puesto aunque venga desordenado.
assert.deepEqual(
  parsePrizeTable([
    { from: 5, to: 8, prize: "Camiseta" },
    { from: 1, to: 1, prize: "500 RP" },
  ]).map((r) => r.from),
  [1, 5]
);

// `to` ausente = puesto suelto.
assert.deepEqual(parsePrizeTable([{ from: 2, prize: "250 RP" }]), [{ from: 2, to: 2, prize: "250 RP" }]);

// Basura descartada en vez de pintarse rota.
assert.equal(parsePrizeTable([{ from: 1, to: 1, prize: "   " }]).length, 0, "premio vacio");
assert.equal(parsePrizeTable([{ from: 0, to: 2, prize: "x" }]).length, 0, "puesto 0");
assert.equal(parsePrizeTable([{ from: 4, to: 2, prize: "x" }]).length, 0, "rango invertido");
assert.equal(parsePrizeTable([{ from: "a", prize: "x" }]).length, 0, "puesto no numerico");
assert.equal(parsePrizeTable(null).length, 0);
assert.equal(parsePrizeTable("[]").length, 0);

// Los textos se recortan.
assert.equal(parsePrizeTable([{ from: 1, prize: "  500 RP  " }])[0].prize, "500 RP");

// Solapamientos: el 3º no puede cobrar dos premios.
assert.equal(overlappingRows(parsePrizeTable([
  { from: 1, to: 3, prize: "a" },
  { from: 3, to: 4, prize: "b" },
])).length, 1);
assert.equal(overlappingRows(parsePrizeTable([
  { from: 1, to: 2, prize: "a" },
  { from: 3, to: 4, prize: "b" },
])).length, 0);

console.log("prize-table: OK");

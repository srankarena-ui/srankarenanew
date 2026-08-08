// Catálogo de objetos de Data Dragon: qué es una bota y cuánto cuesta cada cosa.
//
// Hace falta para verificar dos castigos ("sin botas" y "presupuesto ajustado")
// y se resuelve con el catálogo en vez de una lista de IDs a mano: hay 44 items
// con la etiqueta Boots en el parche actual y Riot añade botas nuevas cada
// temporada. Una lista escrita a mano se queda vieja en silencio y el castigo
// pasaría a dar por bueno lo que no lo es.

interface Catalogo {
  /** IDs con la etiqueta Boots. */
  botas: Set<number>;
  /** Coste total en oro por id. */
  precio: Map<number, number>;
  /**
   * Lo que de verdad se puede comprar en la Grieta.
   *
   * `item.json` trae mucho más que la tienda: objetos de otros modos, piezas
   * retiradas que siguen en el archivo, y las mejoras de Ornn, que valen una
   * fortuna y no las compra nadie. Sin este filtro, una lista de "objetos de
   * más de 3000" saldría llena de cosas que el jugador no puede ni ver.
   */
  enTienda: Set<number>;
}

// ponytail: caché en memoria por proceso, sin expiración. El catálogo solo
// cambia al salir un parche, y un despliegue lo renueva. Si algún día el
// servidor vive semanas sin desplegarse, añadir un TTL de 24 h.
let cache: Promise<Catalogo> | null = null;

export function itemCatalog(): Promise<Catalogo> {
  cache ??= cargar();
  return cache;
}

/** Id numérico de campeón → nombre tal y como lo devuelve match-v5 ("MonkeyKing"). */
let campeones: Promise<Map<number, string>> | null = null;

export function championCatalog(): Promise<Map<number, string>> {
  campeones ??= (async () => {
    const v = await version();
    const data = await fetch(`https://ddragon.leagueoflegends.com/cdn/${v}/data/en_US/champion.json`)
      .then((r) => r.json() as Promise<{ data: Record<string, { key: string; id: string }> }>)
      .then((j) => j.data);

    // `key` es el id numérico y `id` el nombre interno. Es al revés de lo que
    // sugieren los nombres, y confundirlos deja el mapa vacío sin dar error.
    return new Map(Object.values(data).map((c) => [Number(c.key), c.id]));
  })();
  return campeones;
}

let versionCache: Promise<string> | null = null;
function version(): Promise<string> {
  versionCache ??= fetch("https://ddragon.leagueoflegends.com/api/versions.json")
    .then((r) => r.json() as Promise<string[]>)
    .then((v) => v[0]);
  return versionCache;
}

async function cargar(): Promise<Catalogo> {
  const v = await version();

  const data = await fetch(`https://ddragon.leagueoflegends.com/cdn/${v}/data/en_US/item.json`)
    .then((r) => r.json() as Promise<{
      data: Record<string, {
        tags?: string[];
        gold: { total: number; purchasable?: boolean };
        maps?: Record<string, boolean>;
        inStore?: boolean;
        requiredAlly?: string;
      }>;
    }>)
    .then((j) => j.data);

  const botas = new Set<number>();
  const precio = new Map<number, number>();
  const enTienda = new Set<number>();

  for (const [id, item] of Object.entries(data)) {
    const n = Number(id);
    precio.set(n, item.gold?.total ?? 0);
    if (item.tags?.includes("Boots")) botas.add(n);

    // Mapa 11 es la Grieta del Invocador. `requiredAlly` marca las mejoras de
    // Ornn, que aparecen como comprables y no lo son.
    if (item.gold?.purchasable && item.maps?.["11"] && item.inStore !== false && !item.requiredAlly) {
      enTienda.add(n);
    }
  }

  return { botas, precio, enTienda };
}

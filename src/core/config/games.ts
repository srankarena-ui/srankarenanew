// ponytail: solo LoL activo por ahora — agregar el nombre aquí para
// reactivar un juego de cara al usuario (Dota 2, CS2, etc. siguen en la
// tabla `games` y en GameManager, listos para reactivarse sin migración).
export const ACTIVE_GAMES = ["League of Legends"] as const;

// ponytail: el vault solo contiene cosméticos de Dota 2, así que mientras ese
// juego esté apagado no tiene sentido ofrecerlos como premio ni acreditar
// donantes. Se corta en las consultas (no en los componentes): así reciben
// listas vacías y dejan de pintarse solos, sin condicionales repartidos.
export const VAULT_ENABLED = (ACTIVE_GAMES as readonly string[]).includes("Dota 2");

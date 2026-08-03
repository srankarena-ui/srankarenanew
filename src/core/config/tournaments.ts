// Reglas de inscripción compartidas entre el servidor (validación) y la UI
// (qué alerta mostrar). Viven fuera de `modules/tournaments/actions.ts` porque
// ese archivo es "use server" y solo puede exportar funciones async.

/** Miembros aceptados que necesita un equipo para entrar en cola Flex (5v5). */
export const TEAM_MIN_MEMBERS = 5;

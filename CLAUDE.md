@AGENTS.md

# Reglas de trabajo

## Ahorro de contexto entre sesiones
- Después de cada implementación (feature, fix, refactor pedido), añade una entrada al principio de `CHANGELOG.md` en la raíz: fecha, resumen de 2-4 líneas de qué se hizo y por qué, archivos principales tocados. Así una sesión nueva puede leer el changelog en vez de re-derivar todo del historial de git.
- No repitas en el chat contenido que ya vas a dejar escrito en el changelog o en el código — resume, no dupliques.

## Cambios quirúrgicos, no oportunistas
- Al implementar un cambio pedido, toca únicamente lo necesario para ese cambio. No "aproveches" para arreglar warnings preexistentes, refactorizar código cercano, o cambiar convenciones no relacionadas — aunque se vean mejorables — salvo que se pida explícitamente.
- Si notas algo aparte que valdría la pena arreglar, menciónalo al usuario en vez de tocarlo sin permiso.

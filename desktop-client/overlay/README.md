# Overlay de stream para League of Legends

Un overlay para OBS que muestra en vivo tu rango, ícono, sesión del día (W/L), KDA, farm,
racha de asesinatos, dragones, objetivos, némesis, insignias (Primera Sangre / Multikill / Ace)
y una tarjeta especial mientras estás muerto con el contador de reaparición real.

Corre **100% en tu propia PC** — no necesita internet salvo para consultar tu rango (opcional) y
no manda tu información a ningún servidor externo.

## Requisitos

- **Node.js** (v18 o más nuevo). Descárgalo de [nodejs.org](https://nodejs.org) — instalación
  normal, sin configurar nada especial.
- Windows (los `.bat` de inicio son para Windows; en Mac/Linux corre `node server.mjs` desde
  una terminal en esta carpeta).

## Cómo arrancarlo

1. Doble clic en **`Iniciar.bat`**.
2. Se abre solo tu navegador en el panel de control, y una ventana negra (la terminal) que debes
   **dejar abierta** mientras streameas — ahí corre el servidor. Cerrarla apaga el overlay.
3. ¿Quieres probarlo sin jugar? Doble clic en **`Iniciar-Demo.bat`** en su lugar — simula una
   partida completa (kills, muertes, dragones, victoria) en bucle, para ver el overlay funcionando
   sin necesidad de tener League abierto.

## Configurar tu panel

En el panel (`http://localhost:8787/panel.html`, se abre solo):

1. **Cuenta de Riot · Rango**: pega tu **clave de desarrollador de Riot** — la sacas gratis en
   [developer.riotgames.com](https://developer.riotgames.com) (inicia sesión, "Regenerate API
   Key", cópiala). Ojo: esa clave gratuita **expira cada 24 horas** — hay que volver a pegar una
   nueva cada vez que la anterior venza (Riot no ofrece nada mejor gratis para uso personal).
2. Pon tu **Riot ID** (nombre#tag) y tu **región**, y haz clic en "Guardar y buscar rango".
3. En **"Ajuste del marco + ícono"**: elige Grande/Mini, fija la vista, y mueve los sliders hasta
   que el ícono calce bien dentro de tu borde de rango — se ve reflejado al instante.
4. El resto (animación, estilo de borde) es al gusto.

La **"Sesión de hoy" (W/L)** solo suma partidas Ranked Solo/Duo o Flex, y solo cuando la API de
Riot confirma cola y resultado — normales y personalizadas no cuentan. Como el historial de
partidas tarda un poco en publicarse, la victoria/derrota puede demorar uno o dos minutos en
reflejarse después de que termina la partida.

## Colocar los elementos en pantalla

En la **vista previa en vivo** del panel:

1. Sube una **captura de tu juego** en "Fondo de referencia" — así colocas todo viendo exactamente
   qué tapa qué. Ese fondo vive solo en el panel: OBS sigue recibiendo el overlay transparente.
2. Marca **"Mostrar todos los elementos a la vez"** para que aparezca todo junto (con datos de
   ejemplo si no estás jugando), en vez de solo lo que está pasando ahora mismo.
3. Haz clic en **"Activar modo edición"** y arrastra cada elemento para moverlo, o el punto celeste de
   su esquina para cambiar su tamaño. Se guarda solo al soltar.

En **"Elementos del overlay"** destildas lo que no quieras mostrar — desde una tarjeta entera hasta
una pieza suelta (el título, las insignias, los ítems…). Eso sí aplica también a OBS.

## Comandos desde el chat de Kick

En **"Bot de chat · Kick"** escribe el nombre de tu canal (el de `kick.com/<nombre>`) y haz clic en
**Conectar**. No hace falta iniciar sesión, ni contraseña, ni token, ni dar permisos: el chat de
Kick se puede leer de forma anónima, y el overlay **solo lee** — nunca escribe en tu chat.

Comandos disponibles (cada uno sale 10 segundos):

| Comando | Qué muestra |
|---|---|
| `!runas` | Tus runas completas de la partida actual |
| `!comp` (o `!composicion`) | Los 10 campeones por equipos, con la keystone y los dos árboles de cada uno |
| `!build` (o `!items`) | Tus ítems (completos o no), con el minuto en que los compraste |
| `!rank` (o `!rango`, `!hoy`) | Tu rango y LP, más el balance de victorias y derrotas de hoy |

Reglas de aparición:

- **Solo se ve un panel a la vez.** Si piden dos, el segundo espera turno.
- **Mientras estás muerto no sale ninguno**: ahí manda la tarjeta de muerte, que ya lleva tu build.
  Lo que pidan durante la muerte espera en la cola y aparece al revivir.
- Un comando repetido antes de que pase la espera (por defecto 60 s) se ignora, igual que si el
  panel ya está en pantalla. Los dos tiempos se cambian en el panel.
- Un comando sin datos que mostrar (por ejemplo `!build` sin ítems todavía) no hace nada, y **no
  gasta la espera** — así funciona en cuanto haya algo que enseñar.
- Los botones **▶ !runas / !comp / !build / !rank** los disparan sin depender del chat.
- Cada panel es un elemento más: se coloca arrastrándolo y se apaga desde "Elementos del overlay".

**Quien escucha el chat es el overlay**, no el panel. Si dice "nadie está escuchando todavía", es
que no hay ninguna fuente de navegador abierta: tenlo puesto en OBS (o activa la vista previa).

## Winrate de enfrentamiento (`!matchup`)

**No lo pide el chat: sale solo.** Al empezar la partida, entre el segundo 5 y el 25 (ajustable en
el panel), con animación de entrada y salida.

Una pantalla de "VS": tu campeón contra el rival de **tu mismo carril**, los dos con la skin que
lleváis puestas, y abajo una barra con el rol y tu winrate en ese enfrentamiento como diferencia
contra el 50% (+2,3% favorable, −1,8% desfavorable).

En el panel eliges cómo se juntan los dos artes (fundido, diagonal o corte recto), la tipografía de
los nombres, y si quieres el texto "VS" en el centro.

Sale de datos agregados de **u.gg** — millones de partidas — y **no usa tu clave de Riot**. Al
empezar la partida se descarga el fichero de tu campeón (unos 2,5 MB, se guarda en caché en
`data/ugg/`).

Quién es tu rival de carril lo dice el propio cliente de League. Si en alguna cola no lo dice, el
panel no sale: prefiero eso a adivinar contra quién juegas.

En el panel eliges el **rango** de la muestra (por defecto todos), la **región** (por defecto
**Mundo**) y el **mínimo de partidas**.

Deja la región en Mundo salvo que sepas lo que haces: en una región concreta muchos enfrentamientos
se quedan en 2-20 partidas. Comprobado con Amumu jungla — en LAN daba 2, 15 y 19 partidas contra los
mismos rivales que en Mundo tenían 67, 289 y 4.647.

Ese mínimo importa: con 9 partidas un 66% no significa nada, y en pantalla parece un dato serio.
Por debajo del mínimo el enfrentamiento no se muestra. Si u.gg no responde, el parche todavía no
está publicado o la muestra es pequeña, **el panel no sale** — nunca un número dudoso en directo.

Dos avisos honestos: es una fuente **no documentada** (puede cambiar sin avisar), y u.gg publica el
parche ya cerrado, así que los datos son los del parche anterior al que está en vivo.

## Agregarlo a OBS

1. En OBS: **Fuentes → + → Navegador**.
2. URL: `http://localhost:8787/overlay.html`
3. Ancho **1920**, alto **1080**.
4. Listo — el overlay tiene fondo transparente, se superpone sobre tu gameplay.

Si editas la configuración y no ves el cambio reflejado en OBS, clic derecho en la fuente →
**"Refrescar caché de la página actual"**.

## Límites importantes (no son bugs)

- **Tiene que correr en la misma PC donde juegas.** Lee los datos en vivo de la partida
  (`127.0.0.1:2999`, la Live Client Data API del propio cliente de League), que Riot solo expone
  de forma local — ninguna herramienta, de nadie, puede leer esto desde otra máquina.
- La clave de Riot personal **expira cada 24h** (ver arriba).
- Algunos datos (dragones, objetivos, resultado de la partida) dependen de eventos que Riot no
  documenta al 100% — si algo no calza en tu primera partida real, avisa para ajustarlo.

## Tu configuración es tuya

La carpeta `data/` (tu clave, tu calibración, tu foto de perfil) se genera sola la primera vez
que arrancas el overlay y **nunca se comparte** — si le pasas esta carpeta a otro streamer,
bórrale su `data/` antes (o simplemente no se la copies) para que arranque desde cero con la suya.

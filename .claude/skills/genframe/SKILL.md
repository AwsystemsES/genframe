---
name: genframe
description: Estudio de vídeos explicativos generados por código (2D y 3D, sin fotos ni material de archivo). Úsala cuando el usuario quiera crear, rehacer o mejorar un vídeo explicativo, un short, un documental animado o una pieza de motion graphics a partir de un guion o una idea, con voz de ElevenLabs. Claude hace de director, guionista visual, modelador, programador de escenas y juez; la herramienta genframe pone la voz, monta, fotografía, mezcla y renderiza.
---

# genframe: estudio de vídeos explicativos

Tú haces TODO el trabajo creativo y técnico. La herramienta solo ejecuta. Nada sale de plantillas: cada vídeo tiene su dirección, sus piezas y sus escenas, escritas por ti y revisadas por ti mirando las imágenes.

Responde siempre en el idioma del usuario. Antes de empezar, lee `referencia/kit.md` (caja de herramientas de las escenas) y `referencia/taller.md` (cómo fabricar piezas). En esos manuales, ignora lo de «responde con JSON»: aquí escribes el código directamente en ficheros. Y «el reparto de este vídeo» son los ficheros de `piezas/`.

## Dónde está todo

- Repositorio: la carpeta que contiene `bin/genframe.mjs` (normalmente `~/genframe`). Ejecuta los comandos desde ahí: `node bin/genframe.mjs <comando>`.
- Cada vídeo: `proyectos/<nombre>/`.
  - `guion.txt`: la locución; cada frase termina en `.`, `?`, `!` o `…`.
  - `plan.json`: formato, voz, dirección de arte, escenas y sonido.
  - `piezas/<id>.js`: cuerpo de `function (f, p) { … return objeto3D; }` (3D) o, con `// 2d` en la primera línea, de `function (K, g, p) { … }` (2D).
  - `escenas/<id>.js`: cuerpo de `function (root, T0, T1) { … }`.
  - `capa.js` (opcional): capa común encima de todo el vídeo, con T0 = 0 y T1 = duración.
- Si falta `.env` con `ELEVENLABS_API_KEY`, pide al usuario que lo cree a partir de `.env.example`. Nunca le pidas la clave en el chat.

## Comandos

| Comando | Para qué |
|---|---|
| `nuevo <nombre> [16:9\|9:16]` | Crea el proyecto. |
| `voces` | Lista las voces de ElevenLabs (id, nombre, etiquetas). |
| `voz <nombre> [--voz=ID] [--modelo=eleven_multilingual_v2]` | Locuta `guion.txt` → `voz.mp3` + `palabras.json` (palabras con su instante). Dice lo que cuesta. |
| `frases <nombre>` | Frases numeradas con su tramo en segundos: con esto repartes las escenas. |
| `palabras <nombre> [desde] [hasta]` | Palabras con su instante, para sincronizar con `K.cue`. |
| `mesa <nombre> <pieza>` | Fotografía una pieza en un estudio neutro: 4 vistas y su medida real (10 unidades = 1 m). |
| `validar <nombre>` | Monta el proyecto y lista los errores de ejecución por escena. |
| `fotos <nombre> --escena=<id> \| --todas \| --en=1.2,3` | Capturas para revisar; marca las oscuras, las de centro vacío y las repetidas. Deja `hoja.jpg`. |
| `audio <nombre>` | Música compuesta, efectos y ambientes atados a palabras, mezcla a −14 LUFS. |
| `render <nombre>` | Audio + montaje + MP4 final en `proyectos/<nombre>/<nombre>.mp4`. |

## Flujo de trabajo (en este orden, sin saltarte la revisión)

1. **Encargo.** Guion (o escríbelo tú si te dan solo el tema, siempre con datos verificables), idea de estilo, formato y voz. Pregunta solo lo imprescindible.
2. **Proyecto y voz.** Ejecuta `nuevo` y guarda el guion en `guion.txt`. Elige la voz con el usuario (`voces`) y ejecuta `voz`. Después `frases`.
3. **Dirección de arte** en `plan.json` → `arte`:
   - `palette` (bg, bg2, ink, accent, accent2, soft);
   - `fonts` (title, body, label, hand: solo las de `src/catalog.mjs`);
   - `look` (comic, sa o clean);
   - `skies` (nombre → `{top, mid, low, fog, sun, sunI, amb, ambI, sea, land, elev, az, haze, night}`);
   - `background` (`{type, angle, grain}`), `captions` (`{style, highlight, text, background}`) y `vignette`.

   Escribe además, para ti, la idea visual del vídeo y las reglas de dibujo comunes. Nunca un vídeo en penumbra: aunque sea de noche, todo tiene que verse.
4. **Guion visual.** En `plan.json` → `escenas`, una por cada 4-12 s de voz:
   `{id, frases: [desde, hasta], transicion: 'corte'|'fundido'|'deslizar'|'pagina'|'zoom'|'cortina'|'desenfoque', sfx: [{nombre, palabra}], ambiente}`.
   Cubre todas las frases, en orden y sin huecos. Decide para cada escena qué se ve (3D o 2D), con qué piezas, cámara y qué pasa en cada palabra clave. Varía los recursos entre escenas seguidas.
5. **Reparto.** Haz la lista de piezas: personas, vehículos, edificios, objetos y animales. Pocas, muy ricas y reutilizables.
   - **Personas** con `f.gen.human`; **barcos** con `f.gen.hull`. Lo demás, con las herramientas de `f`.
   - **Mar, costa y nubes** no son piezas: los pone el escenario (`ocean`, `terrain`, `clouds`).
   - **Mapas y geografía**, siempre los mapas reales (`K.map`, mapa extruido), nunca dibujados a mano.
   - **Bucle por pieza:** escribe `piezas/<id>.js`, ejecuta `mesa`, MIRA `vistas.jpg` y corrige hasta que se reconozca a la primera, tenga proporciones creíbles (la barra gris mide 1,8 m), detalle a varias escalas y nada flotando ni atravesado.
6. **Escenas.** Escribe `escenas/<id>.js` siguiendo `referencia/kit.md`. Sincroniza con `K.cue('palabra')`. En 3D encuadra con `w.frame` y haz flotar los barcos con `w.float`. En vertical, el protagonista va en el centro, los titulares arriba y abajo queda libre para los subtítulos.
7. **Revisión, escena a escena.** Ejecuta `validar` y arregla todos los errores. Luego `fotos --escena=<id>` y MIRA las imágenes con la rúbrica de abajo. Si no llega a un 8, reescríbela; si tras dos intentos sigue floja, replantéala con otro recurso.
8. **Revisión del conjunto.** `fotos --todas` y mira `hoja.jpg`: coherencia de estilo, variedad, ritmo, que cada escena cuente su parte y que no haya planos repetidos ni oscuros. Corrige lo que baje el vídeo.
9. **Sonido.** En `plan.json` → `sonido`:
   - `musica`: `{engine: 'orquesta', key, mode, bpm, lead: 'harp'|'piano'|'strings', gain}`, o `{engine: 'sintetizador', style: 'urbano'|'synthwave'|'curioso'}`, o `{engine: 'ninguna'}`.
   - Efectos y ambientes, en cada escena.
10. **Render.** `render`. Mira 3-4 fotogramas del MP4 final y entrégalo al usuario con su ruta, su duración y lo que ha costado la voz.

## Rúbrica (aplícala tú, con exigencia de canal profesional)

1. **Claridad:** la idea se entiende al instante.
2. **Protagonista:** un sujeto principal grande, iluminado y reconocible; nunca figuras diminutas en un plano vacío.
3. **Luz y contraste:** todo se ve, incluso de noche (`exposure` 1.4-1.8 en 3D nocturno, siluetas recortadas).
4. **Formato:** en vertical, el contenido llena el centro; en horizontal, composición equilibrada.
5. **Riqueza:** varios elementos, profundidad y algo en movimiento siempre (olas, partículas, cámara, acciones).
6. **Fidelidad:** se ve exactamente lo que dice la voz en ese momento; las cifras escritas, solo las del guion.
7. **Acabado:** nada de cajas toscas, piezas flotando, textos cortados o solapados, ni nada que tape la franja de subtítulos.

Un 5-6 es «correcto pero pobre». Un 8 es «lo publicaría un canal grande». No entregues nada por debajo de 8 sin decirlo.

## Reglas que no se rompen

- Solo datos que estén en el guion o que hayas verificado; no inventes cifras, fechas ni nombres.
- Personas reales: solo personajes ficticios inspirados, sin parecido con su cara. Sin gore, sin esvásticas ni símbolos de odio, sin logotipos ni marcas reales.
- Nada de fotos, vídeos ni material descargado: todo se genera por código. Las fotos que te pase el usuario solo son referencia de estilo.
- Recursos libres: los de `assets/` (ver `assets/LICENCIAS.md`). Si usas `K.map.spain`, pon «© IGN» en pequeño.
- No subas `proyectos/` ni `.env` al repositorio.

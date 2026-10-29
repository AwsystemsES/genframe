---
name: turboframe
description: Estudio de vídeos explicativos generados por código (2D y 3D, sin fotos ni material de archivo). Úsala cuando el usuario quiera crear, rehacer o mejorar un vídeo explicativo, un short, un documental animado o una pieza de motion graphics a partir de un guion o una idea, con voz de ElevenLabs. Claude hace de director, guionista visual, modelador, programador de escenas y juez; la herramienta TurboFrame pone la voz, monta, fotografía, mezcla y renderiza.
---

# TurboFrame: estudio de vídeos explicativos

Tú haces TODO el trabajo creativo y técnico. La herramienta solo ejecuta. Nada sale de plantillas: cada vídeo tiene su dirección, sus piezas y sus escenas, escritas por ti y revisadas por ti mirando las imágenes.

Responde siempre en el idioma del usuario. Antes de empezar, lee `referencia/kit.md` (caja de herramientas de las escenas) y `referencia/taller.md` (cómo fabricar piezas). En esos manuales, ignora lo de «responde con JSON»: aquí escribes el código directamente en ficheros. Y «el reparto de este vídeo» son los ficheros de `piezas/`.

## Dónde está todo

- Repositorio: la carpeta que contiene `bin/turboframe.mjs` (en el Mac del usuario, `/Applications/MAMP/htdocs/rsaas.io/rsaas.io/desarrollos/genframe`). Ejecuta los comandos desde ahí: `node bin/turboframe.mjs <comando>`.
- Cada vídeo: `proyectos/<nombre>/`.
  - `guion.txt`: la locución; cada frase termina en `.`, `?`, `!` o `…`.
  - `plan.json`: formato, voz, dirección de arte, escenas y sonido.
  - `piezas/<id>.js`: cuerpo de `function (f, p) { … return objeto3D; }` (3D) o, con `// 2d` en la primera línea, de `function (K, g, p) { … }` (2D).
  - `escenas/<id>.js`: cuerpo de `function (root, T0, T1) { … }`.
  - `capa.js` (opcional): capa común encima de todo el vídeo, con T0 = 0 y T1 = duración. La capa común, la viñeta y los subtítulos van siempre por encima de todas las escenas, sea cual sea su número.
- Si falta `.env` con `ELEVENLABS_API_KEY`, pide al usuario que lo cree a partir de `.env.example`. Nunca le pidas la clave en el chat.

## Comandos

| Comando | Para qué |
|---|---|
| `comprobar` | Revisa la instalación (Node, dependencias, Chrome, ffmpeg, Python, claves sin enseñarlas, skill y espacio) y monta un vídeo de prueba. Úsalo si algo no arranca. |
| `encolar <nombre>` · `cola` · `noche` · `programar --hora=03:00` | Render de noche: deja el vídeo en la cola; ver la cola y sus resultados (`--quitar=<n>`, `--limpiar`); renderizar la cola ahora (lo lanza solo la programación); programar la hora diaria (macOS; `--quitar` la quita). De noche usa más navegadores (`TURBOFRAME_WORKERS_NOCHE`), no deja dormir al ordenador, audita, renderiza aunque haya graves (los anota) y deja `render-noche.log` en el proyecto. |
| `version` · `actualizar` | Versión instalada · descarga la última y enseña las novedades (los proyectos y el `.env` no se tocan). |
| `nuevo <nombre> [16:9\|9:16]` | Crea el proyecto. |
| `voces` | Lista las voces de ElevenLabs (id, nombre, etiquetas). |
| `voz <nombre> [--voz=ID] [--modelo=eleven_multilingual_v2]` | Locuta `guion.txt` → `voz.mp3` + `palabras.json` (palabras con su instante). Dice lo que cuesta. Después ajusta a la voz real los bordes de las palabras junto a cada pausa (ElevenLabs los marca unos 100 ms tarde); los tiempos originales quedan en `palabras.eleven.json`. |
| `afinar <nombre>` | Repite ese ajuste acústico en un proyecto con voz ya hecha (siempre desde `palabras.eleven.json`). No gasta nada. |
| `frases <nombre>` | Frases numeradas con su tramo en segundos: con esto repartes las escenas. |
| `palabras <nombre> [desde] [hasta]` | Palabras con su instante, para sincronizar con `K.cue`. |
| `mesa <nombre> <pieza>` | Fotografía una pieza en un estudio neutro: 4 vistas y su medida real (10 unidades = 1 m). |
| `validar <nombre>` | Monta el proyecto y lista los errores de ejecución por escena. |
| `auditar <nombre> [--paso=0.25]` | Recorre el vídeo y lista lo que está mal: piezas que se atraviesan, cámara en el agua o dentro de algo, olas que tapan, pies que patinan, piezas enterradas o flotando, textos cortados, fuera de la zona segura o solapados, escenas que tapan los subtítulos, la capa común o la viñeta, tramos de más de 2 s casi quietos, fotogramas oscuros y **cifras en pantalla que el guion no dice** (textos y rótulos 3D; entiende números con letras en inglés y español, años, décadas y precios, y no avisa de marcas de ejes, coordenadas, numeraciones ni códigos). Deja `auditoria.json`. Un aviso de cifra es un dato que hay que comprobar: o falta en el guion o está mal en pantalla. |
| `fotos <nombre> --escena=<id> \| --todas \| --en=1.2,3` | Capturas para revisar; marca las oscuras, las de centro vacío y las repetidas. Deja `hoja.jpg`. |
| `audio <nombre>` | Música compuesta y efectos atados a palabras, mezcla a −14 LUFS. Sin ambientes de fondo. |
| `render <nombre> [--forzar]` | Audio, montaje, auditoría y MP4 final en `proyectos/<nombre>/<nombre>.mp4`. Si la auditoría encuentra problemas graves, no renderiza (salvo `--forzar`). Si el vídeo dura más de 90 s, renderiza **por tramos con caché** (~45 s, empezando en una escena, en `proyectos/<nombre>/tramos/`): cada tramo lleva la huella de todo lo que le afecta (motor, arte, piezas, capa común, sus escenas y palabras) y solo se rehacen los que cambiaron; se unen sin recomprimir. `--tramos=0` lo desactiva, `--tramos=<s>` cambia la longitud y `--rehacer` los rehace todos. Al final revisa el MP4 (como `revisar`). Abre los navegadores de render justos para la RAM del ordenador (2 con 16 GB) y con prioridad baja; `--workers=N` o `TURBOFRAME_WORKERS` en el `.env` lo cambian. Si el usuario dice que el ordenador se congela, baja a 1. |
| `revisar <nombre>` | Revisa el MP4 final fotograma a fotograma: destellos de uno o dos fotogramas, más de medio segundo en negro y más de 3 s congelado. |

Cualquier comando acepta también una ruta en vez de un nombre (por ejemplo, `auditar /ruta/a/otra/carpeta`).

## Flujo de trabajo (en este orden, sin saltarte la revisión)

**El ordenador del usuario va primero, la velocidad da igual.** Agentes en paralelo: los que diga `comprobar` en la línea «agentes en paralelo» (1 con 16 GB; `TURBOFRAME_AGENTES` en el `.env`). Cada agente revisa con su propio Chrome con 3D, así que con más tramos que agentes ve por tandas, empezando por los más avanzados. Lo pesado va siempre en serie: nada de lanzar ffmpeg, Chrome o Blender a la vez (ni con «&», ni con «xargs -P», ni en segundo plano mientras corre otro). Claude Code tiene un guardia (`bin/guardia.mjs`) que bloquea esos comandos y espera a que haya memoria: si te bloquea, hazlo en serie, no busques cómo saltarlo. Los comandos de TurboFrame piden turno y esperan memoria solos: si dicen «esperando turno» o «esperando memoria», es normal; espera, no los relances.

1. **Encargo.** Guion (o escríbelo tú si te dan solo el tema, siempre con datos verificables), idea de estilo, formato y voz. Pregunta solo lo imprescindible.
2. **Proyecto y voz.** Ejecuta `nuevo` y guarda el guion en `guion.txt`. Elige la voz con el usuario (`voces`) y ejecuta `voz`. Después `frases`.
3. **Dirección de arte** en `plan.json` → `arte`:
   - `palette` (bg, bg2, ink, accent, accent2, soft);
   - `fonts` (title, body, label, hand: solo las de `src/catalog.mjs`);
   - `look` (comic, sa o clean);
   - `skies` (nombre → `{top, mid, low, fog, sun, sunI, amb, ambI, sea, land, elev, az, haze, night}`; con `fisico: true`, cielo físico según la altura del sol);
   - `look`: `'comic'`, `'sa'`, `'clean'` o `'realista'` (materiales físicos que reflejan el cielo, con variación y suciedad);
   - `render` (opcional): ajuste de la imagen final `{supermuestreo, ao, bloom, grano, contraste, saturacion, calidez, subfotogramas, obturador, pelicula}`;
   - `background` (`{type, angle, grain}`), `captions` (`{style, highlight, text, background}`) y `vignette`. Estilos de subtítulo: `tira`, `sombra`, `cinta`, `sombra_color`, `contorno`, `ninguno` y **`cine`** (sin caja; la frase a media luz y cada palabra se enciende al sonar; la palabra clave, una cifra o la palabra larga, va mayor y en el color de resalte; `mezcla: 'exclusion'` invierte el texto contra la imagen).

   Escribe además, para ti, la idea visual del vídeo y las reglas de dibujo comunes. Nunca un vídeo en penumbra: aunque sea de noche, todo tiene que verse.
4. **Guion visual.** En `plan.json` → `escenas`, una por cada 4-12 s de voz:
   `{id, frases: [desde, hasta], transicion: 'corte'|'fundido'|'deslizar'|'pagina'|'zoom'|'cortina'|'desenfoque', sfx: [{nombre, palabra}]}`. No pongas `ambiente`: los ambientes de fondo (mar, viento, lluvia, río) son un siseo continuo que molesta y el motor ya no los mezcla.
   Cubre todas las frases, en orden y sin huecos. Decide para cada escena qué se ve (3D o 2D), con qué piezas, cámara y qué pasa en cada palabra clave. Varía los recursos entre escenas seguidas.
5. **Reparto.** Haz la lista de piezas: personas, vehículos, edificios, objetos y animales. Pocas, muy ricas y reutilizables. Fabrícalas con formas redondeadas (`f.rbox`, `f.rcyl`, `f.capsula`), acabados con textura en las superficies grandes (`acabado: 'pintura'|'metal'|'hormigon'|…`) y todos los textos con `f.letrero` (nunca se cortan). En la mesa, un aviso de «rótulo demasiado pequeño» se corrige antes de seguir.
   - **Personas** con `f.gen.human`; **barcos** con `f.gen.hull`. Lo demás, con las herramientas de `f`.
   - **Mar, costa y nubes** no son piezas: los pone el escenario (`ocean`, `terrain`, `clouds`).
   - **Mapas y geografía**, siempre los mapas reales (`K.map`, mapa extruido), nunca dibujados a mano.
   - **Bucle por pieza:** escribe `piezas/<id>.js`, ejecuta `mesa`, MIRA `vistas.jpg` y corrige hasta que se reconozca a la primera, tenga proporciones creíbles (la barra gris mide 1,8 m), detalle a varias escalas y nada flotando ni atravesado.
6. **Escenas.** Escribe `escenas/<id>.js` siguiendo `referencia/kit.md`. Ningún plano con suelo vacío: viste el entorno con `w.decorar` (ciudad, campo o interior, con la época que toque). En ciudad, ajusta `skyline` a la escala del sitio (un pueblo o Washington, `'baja'` o `'media'`; Manhattan, `'alta'`) y deja el tráfico y los peatones salvo que la escena pida calles vacías. Sincroniza con `K.cue('palabra')`. En 3D encuadra con `w.frame` y haz flotar los barcos con `w.float`. En vertical, el protagonista va en el centro, los titulares arriba y abajo queda libre para los subtítulos.
7. **Revisión, escena a escena.** Ejecuta `validar` y arregla todos los errores. Luego `fotos --escena=<id>` y MIRA las imágenes con la rúbrica de abajo. Si no llega a un 8, reescríbela; si tras dos intentos sigue floja, replantéala con otro recurso.
8. **Revisión del conjunto.** `auditar` y arregla todo lo grave y los avisos que se vean. Después `fotos --todas` y mira `hoja.jpg`: coherencia de estilo, variedad, ritmo, que cada escena cuente su parte y que no haya planos repetidos ni oscuros. Corrige lo que baje el vídeo.
9. **Sonido.** En `plan.json` → `sonido`:
   - `musica`: `{engine: 'orquesta', key, mode, bpm, lead: 'harp'|'piano'|'strings', gain}`, o `{engine: 'sintetizador', style: 'urbano'|'synthwave'|'curioso'}`, o `{engine: 'ninguna'}`.
   - Efectos puntuales en cada escena (golpes, pasos, transiciones). Nada de ambientes de fondo.
   - `musica.build`: dónde entran más instrumentos, en segundos o con palabras del guion (`["adelante", "rampas"]`).
   - `musica.curva`: volumen de la música atado a palabras: `[{t: 0, gain: 0.85}, {palabra: "piensa", gain: 0.12}, {palabra: "adelante", desfase: -0.08, gain: 0.08}, {palabra: "adelante", gain: 1.05}]` (silencios, entradas de golpe y crescendos; se interpola entre puntos).
10. **Render.** Renderizar se come el ordenador (varios navegadores con 3D durante minutos u horas), así que por defecto **va de noche**:
   - Si hay render de noche programado (`encolar` dice la hora) o el usuario no ha pedido el vídeo ya, `encolar <nombre>` y dile que estará listo por la mañana. Si no hay hora programada, ofrécele `programar --hora=03:00`.
   - Solo si pide el vídeo ya, `render` (avísale de que el ordenador irá lento y de que cierre Chrome y lo que no use).
   - Por la mañana (o cuando pregunte), `cola`: si un vídeo está «hecho», mira 3-4 fotogramas del MP4 y entrégalo con su ruta, su duración y lo que costó la voz; si está con «avisos» o «fallo», lee `proyectos/<nombre>/render-noche.log`, arregla lo grave y vuelve a encolarlo.
   - En vídeos largos, de día usa `fotos --escena` y `mesa` (ligeros). `auditar` y `fotos --todas` cargan todas las escenas a la vez: déjalos para el render de noche, que ya audita.

## Rúbrica (aplícala tú, con exigencia de canal profesional)

1. **Claridad:** la idea se entiende al instante.
2. **Protagonista:** un sujeto principal grande, iluminado y reconocible; nunca figuras diminutas en un plano vacío.
3. **Luz y contraste:** todo se ve, incluso de noche (`exposure` 1.4-1.8 en 3D nocturno, siluetas recortadas). Una noche que parece de día es un fallo: usa un cielo con `night: true` para que se enciendan farolas, ventanas y faros.
4. **Formato:** en vertical, el contenido llena el centro; en horizontal, composición equilibrada.
5. **Riqueza:** varios elementos, profundidad y algo en movimiento siempre (olas, partículas, cámara, acciones).
6. **Fidelidad:** se ve exactamente lo que dice la voz en ese momento; las cifras escritas, solo las del guion.
7. **Acabado:** nada de cajas toscas, piezas flotando, textos cortados o solapados, ni nada que tape la franja de subtítulos.

Un 5-6 es «correcto pero pobre». Un 8 es «lo publicaría un canal grande». No entregues nada por debajo de 8 sin decirlo.

## Mejorar el motor (para todos los vídeos)

Cada fallo que aparezca en un vídeo se arregla, si se puede, en el motor (`src/kit/*.js`, `bin/turboframe.mjs`) y no en la escena:
1. Arreglo en el motor, genérico, sin nada de un vídeo concreto.
2. Una comprobación en `auditar` si se puede detectar sola.
3. Comprobarlo con un proyecto mínimo de usar y tirar (fuera de `proyectos/` o borrándolo después): `validar`, `mesa`, `fotos` y `auditar` sin graves.

A la skill solo va el criterio (encuadre, ritmo, estilo); todo lo que se pueda resolver con código va al motor.

## Recetas y fallos aprendidos

- **Revisar imágenes nuevas:** el visor puede devolver la imagen anterior si la ruta coincide. Copia cada `hoja.jpg` con un nombre nuevo (por ejemplo, en el scratchpad) antes de mirarla.
- **Cifras:** `K.count` usa `Intl` es-ES, que no pone punto en números de 4 cifras («7000»). Formatéalas a mano con `String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')`.
- **`f.lathe`:** el perfil va de abajo arriba (y creciente). Si no, las normales quedan hacia dentro y la pieza sale negra.
- **Interiores:** usa `w.shot` manual y calcula de qué lado queda la cámara (posición = objetivo + (sin yaw, cos yaw) × dist). Mantén la cámara por debajo de las lámparas colgantes, y pasa a primer plano con un corte (`dur: 0.02`) en vez de un vuelo que atraviese el decorado.
- **Barcos largos en vertical:** un buque de 175 m no cabe de costado. Encuádralo desde la proa, con las torres en primer término.
- **Fogonazos y destellos que deben verse sí o sí:** una capa 2D colocada en cada fotograma proyectando la posición 3D (`obj.getWorldPosition(v); v.project(w.camera)`) dentro de un `K.onFrame` creado después de `K.world3d`. Las esferas emisivas grandes, vistas de cerca, parecen globos opacos.
- **Mar con olas grandes:** cámara en picado (20-30°) para que ninguna ola tape la lancha.
- **Lluvia:** se lee mejor en 2D (un canvas por encima con trazos diagonales en `K.onFrame`) que con `w.fx('rain')`.
- **Mapa con playas o puntos cercanos:** etiquetas alternadas arriba y abajo con línea guía, el centro dentro de `K.safe`, y `transformBox: 'fill-box'` en los círculos SVG que crecen con `K.show`.
- **Títulos en dos líneas:** `K.splitWords` pierde los `<br>`. Usa una caja por línea.
- **Caras:** nada de bigotes cortos y oscuros en militares; pueden evocar a quien no se debe.

## Reglas que no se rompen

- Solo datos que estén en el guion o que hayas verificado; no inventes cifras, fechas ni nombres.
- Personas reales: solo personajes ficticios inspirados, sin parecido con su cara. Sin gore, sin esvásticas ni símbolos de odio, sin logotipos ni marcas reales.
- Nada de fotos, vídeos ni material descargado: todo se genera por código. Las fotos que te pase el usuario solo son referencia de estilo.
- Recursos libres: los de `assets/` (ver `assets/LICENCIAS.md`). Si usas `K.map.spain`, pon «© IGN» en pequeño.
- No subas `proyectos/` ni `.env` al repositorio.

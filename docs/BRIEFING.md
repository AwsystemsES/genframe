# Briefing de TurboFrame

Estado a 17-10-2026. Este documento sirve para seguir TurboFrame en un chat nuevo, sin depender de la conversación ni del proyecto Autake. Léelo entero antes de tocar nada.

## 1. Qué es y por qué existe

**TurboFrame** es un estudio local de vídeos explicativos generados por código: escenas 2D y 3D programadas a medida para cada vídeo, sin fotos, vídeos de archivo ni modelos descargados.

- **Claude**, mediante la skill `turboframe`, hace todo el trabajo creativo y técnico: dirección de arte, guion visual, fabricación de piezas 3D/2D, programación de escenas y revisión mirando las imágenes.
- **La herramienta `bin/turboframe.mjs`** solo ejecuta:
  - pone la voz con ElevenLabs;
  - monta el proyecto HyperFrames;
  - hace fotos para revisar;
  - compone y mezcla el audio;
  - renderiza el MP4.

Nació dentro de la app Autake como tipo de vídeo «Vídeo explicativo», con un motor automático que usaba OpenAI (gpt-6-luna y gpt-6-sol) en máquinas de render de Hetzner. El 17-10-2026 el usuario decidió:

1. **Sacarlo de Autake por completo.** Se borró sin rastro: código, configuración, worker, imagen y datos (ver §10).
2. **Seguirlo aquí, con Claude dirigiendo**, porque los vídeos que Claude programó a mano con la caja de herramientas (un VOX estilo GTA San Andreas y un A350 marcha atrás) quedaron muy por encima de los automáticos.

Repositorio y skill:
- **Repositorio:** https://github.com/AwsystemsES/genframe (privado), en el Mac del usuario en `/Applications/MAMP/htdocs/rsaas.io/rsaas.io/desarrollos/genframe` (antes `~/turboframe`).
- **Skill:** `.claude/skills/turboframe/SKILL.md`, enlazada en `~/.claude/skills/turboframe` (`npm run instalar-skill`). Aparece como `/turboframe`.

## 2. Reglas del usuario (obligatorias)

- **Idioma:** responder siempre en español de España, también en los avisos, en los títulos de las tareas y en las instrucciones a otros agentes. Todo lo visible y el razonamiento.
- **Gasto:** antes de cualquier ensayo que gaste dinero (ElevenLabs u otras API), preguntar y decir cuánto costará.
- **Material:**
  - Nada de fotos ni de internet: todo se genera por código. Las fotos del usuario solo son referencia de estilo.
  - Recursos 100 % libres con licencia comercial (`assets/LICENCIAS.md`).
  - «© IGN» si salen las comunidades autónomas.
- **Contenido:**
  - Personas reales solo como personajes ficticios inspirados, sin parecido facial.
  - Sin gore, sin esvásticas ni símbolos de odio, sin logotipos ni marcas reales.
- **Datos:** solo los del guion o verificados; no inventar cifras.
- **Separación:** TurboFrame no tiene nada que ver con Autake. No tocar el repositorio de Autake para esto ni usar sus servidores, su flota ni sus claves.
- **Repositorio:** no subir `proyectos/` ni `.env` (ya están en `.gitignore`).
- **Credenciales:** nunca pedir claves en el chat. El usuario las pone en el `.env`.

## 3. Instalación y entorno

En el Mac del usuario ya está todo instalado en `/Applications/MAMP/htdocs/rsaas.io/rsaas.io/desarrollos/genframe` (movida allí el 17-10 desde `~/genframe`; la skill se reenlazó con `npm run instalar-skill`).

- **Node:** está en `~/.local/node/bin` y no en el PATH del sistema. Usa `PATH=~/.local/node/bin:$PATH node bin/turboframe.mjs …`.
- **ffmpeg y ffprobe:** vienen con `npm install` (paquetes `ffmpeg-static` 5.3.0 y `ffprobe-static` 3.1.0). La herramienta los pone delante en el PATH para que HyperFrames los encuentre. `FFMPEG`/`FFPROBE` en el `.env` solo hacen falta si se quieren otros. TurboFrame ya no depende del laboratorio de Descargas: se probó renderizando con el laboratorio oculto y el 17-10 el laboratorio (`~/Downloads/explicativo-lab`) se movió a la Papelera; todo lo que valía está en este repositorio (`referencias/`, `assets/`, `docs/historia-laboratorio/`).
- **Python:** `python3` con numpy 2.0.2 (para `src/audio.py`).
- **`.env`:** copia de `.env.example`, ya con `ELEVENLABS_API_KEY` y `ELEVENLABS_VOICE_ID`. La clave no tiene el permiso `voices_read`: `voces` da 401, pero `voz` funciona. Modelo elegido: `eleven_multilingual_v2` (0,08 $ por cada 1.000 caracteres).
- **GitHub:**
  - Acceso con la deploy key `~/.ssh/github_genframe` (con escritura), alias SSH `github-genframe` en `~/.ssh/config`.
  - El remoto del clon es `git@github-genframe:AwsystemsES/genframe.git`; commits con «Manuel Rodríguez Llanes».
  - Hacer push solo cuando lo pida el usuario o al cerrar una tarea acordada.
- **En otra máquina:** `git clone`, `npm install` (dependencias, Three.js empaquetado en `dist/three.js` y el Chrome de HyperFrames), `.env` con la clave y `npm run instalar-skill`.

## 4. Estructura del repositorio

| Ruta | Qué es |
|---|---|
| `bin/turboframe.mjs` | Herramienta de línea de comandos (ver §5). |
| `bin/postinstall.mjs`, `bin/instalar-skill.mjs` | Tras `npm install`: empaqueta Three.js y prepara el navegador; enlaza la skill. |
| `src/kit/kit.js` | Caja 2D global `K`: sincronía con la voz (`K.cue`), elementos (`K.box`, `K.svg`, `K.shape`, `K.rough`, `K.icon`, `K.flag`), animación sobre una línea de tiempo anime.js (`K.show`, `K.anim`, `K.draw`, `K.count`, `K.typeOn`, `K.camera`, `K.onFrame`), mapas reales (`K.map.world` con `center`/`focus`, `K.map.spain`), dibujos fabricados (`K.figure`), bocadillos y flechas. |
| `src/kit/world3d.js` | Mundo 3D `K.world3d` (Three.js con un único WebGL compartido, ver §6). |
| `src/kit/gen.js` | Generadores procedurales del taller: `f.gen.human` y `f.gen.hull` (ver §7). |
| `src/kit/build/three-entry.js` | Entrada de esbuild para `dist/three.js`. |
| `src/assemble.mjs` | Monta el proyecto HyperFrames (ver §8). |
| `src/audio.py` | Música compuesta (VSCO 2 o síntesis), efectos Kenney, ambientes sintetizados, ducking de la voz y loudnorm a −14 LUFS. |
| `src/catalog.mjs` | Lo único fijo: tipografías (39 de Fontsource), transiciones, estilos de subtítulo, efectos, ambientes y límites de la música. |
| `assets/` | Muestras VSCO 2 CE (piano, arpa, cuerdas), efectos Kenney (CC0), `countries.json`, `LICENCIAS.md`. |
| `.claude/skills/turboframe/` | `SKILL.md` (flujo, comandos, rúbrica y reglas) y `referencia/kit.md` y `referencia/taller.md`: los manuales que antes leía la IA de OpenAI; las notas de la skill explican cómo adaptarlos. |
| `docs/encargos/` | Encargos pendientes (el short de Normandía). |
| `proyectos/` | Un directorio por vídeo (no se sube). |

## 5. La herramienta (`node bin/turboframe.mjs <comando>`)

| Comando | Qué hace |
|---|---|
| `nuevo <nombre> [16:9\|9:16]` | Crea `proyectos/<nombre>/` con `guion.txt`, `plan.json`, `piezas/` y `escenas/`. |
| `voces` | Lista las voces de ElevenLabs. |
| `voz <nombre> [--voz=ID] [--modelo=…]` | Locuta `guion.txt` con `/v1/text-to-speech/{voz}/with-timestamps`, en trozos de unos 4.000 caracteres cortados en final de frase y con `previous_text`/`next_text` para que no cambie el tono. Une los audios en `voz.mp3` y convierte la alineación por caracteres en `palabras.json` (`[{t, a, b}]`). Dice lo que cuesta. Sin probar todavía con la API real (falta la clave). |
| `frases <nombre>` | Frases numeradas desde 1 con su tramo. Las escenas se definen por rangos de frases. |
| `palabras <nombre> [desde] [hasta]` | Palabras con su instante. |
| `mesa <nombre> <pieza>` | Monta la pieza sola en un estudio de luz neutra y saca 4 vistas (frente, tres cuartos, lado y desde atrás y arriba, esta con su primera acción) en `mesa/<pieza>/vistas.jpg`. Mide el modelo (ancho × alto × fondo, base) mediante `console.error('MEDIDA …')`, que el validador recoge. Junto a la pieza hay una barra gris de 1,8 m. |
| `validar <nombre>` | Monta y lista los errores de ejecución por escena o pieza. |
| `fotos <nombre> --en=1.2,3 \| --escena=<id> \| --todas` | Capturas con su `hoja.jpg`, marcando brillo medio, «dibujo» por tercios verticales, ⚠ OSCURA (brillo < 48), ⚠ CENTRO VACÍO (vertical) y ⚠ igual que otra captura. |
| `audio <nombre>` | `sonido.json` (música de `plan.sonido.musica`, efectos atados a palabras y ambientes por escena) y `audio.py` → `mix.wav` a −14 LUFS. |
| `auditar <nombre> [--paso=0.25]` | Recorre el vídeo montado en el Chrome de HyperFrames con `puppeteer-core` y lista los problemas físicos y visuales, y las cifras en pantalla que no dice el guion (`src/cifras.mjs`). Deja `auditoria.json`; ver la skill. |
| `afinar <nombre>` | Ajuste acústico de `palabras.json` con la energía de `voz.mp3` (`src/onsets.py`); lo hace `voz`. |
| `revisar <nombre>` | Destellos, negros y congelados en el MP4 final; lo hace `render`. |
| `render <nombre> [--forzar] [--tramos=0\|<s>] [--rehacer]` | Audio, montaje, validación, auditoría y `hyperframes render` → `proyectos/<nombre>/<nombre>.mp4`. Con problemas graves no renderiza. Más de 90 s: por tramos con caché en `tramos/` (solo se rehacen los tramos cuya huella cambió). |

Formato de `plan.json`:
```json
{"formato": "9:16", "voz": {"id": "…", "modelo": "eleven_multilingual_v2", "ajustes": {"stability": 0.45}},
 "arte": {"palette": {"bg": "#…", "bg2": "#…", "ink": "#…", "accent": "#…", "accent2": "#…", "soft": "#…"},
          "fonts": {"title": "Archivo Black", "body": "Inter", "label": "IBM Plex Mono", "hand": "Caveat"},
          "look": "comic|sa|clean", "skies": {"amanecer": {"top": "#…", "mid": "#…", "low": "#…", "fog": "#…", "sun": "#…", "sunI": 2, "amb": "#…", "ambI": 1.1, "sea": "#…", "land": "#…", "elev": 14, "az": 200, "haze": 0, "night": false}},
          "background": {"type": "gradient", "angle": 160, "grain": {"frequency": 0.8, "octaves": 3, "strength": 0.15}},
          "captions": {"style": "sombra", "highlight": "#e5ad58"}, "vignette": 0.2},
 "escenas": [{"id": "fecha", "frases": [1, 2], "transicion": "corte", "sfx": [{"nombre": "golpe_suave", "palabra": "Cinco"}], "ambiente": "mar"}],
 "sonido": {"musica": {"engine": "orquesta", "key": "D", "mode": "minor", "bpm": 76, "lead": "strings", "gain": 1}},
 "subtitulos": true}
```
Las piezas son `piezas/<id>.js`: el cuerpo de `function (f, p)`, que devuelve un `Object3D`. Si la primera línea es `// 2d`, son el cuerpo de `function (K, g, p)` y dibujan en una caja de 1000×1000. Las escenas son `escenas/<id>.js`: el cuerpo de `function (root, T0, T1)`. Si existe `capa.js`, va encima de todo el vídeo.

## 6. El mundo 3D (`K.world3d(root, T0, T1, opciones)`)

- **Suelo:** `ground: 'none'` (diorama a escala real, 10 unidades = 1 m), `'spain'|'iberia'|'europe'|'mediterranean'|'atlantic'|'world'` o una caja de coordenadas (mapa real extruido de Natural Earth; con `regions: true`, España por comunidades). `highlight: {es: '#color'}`.
- **Luz y cielo:**
  - `sky`: el nombre de un cielo de `arte.skies` o un objeto con sus colores. Sin cielo, se deduce de la paleta. No hay cielos predefinidos.
  - `look`: aspecto 3D (comic, sa o clean).
  - `exposure` (por defecto 1.15; de noche, 1.4-1.8). `rim`: intensidad del contraluz.
  - Hay siempre luz ambiente mínima, relleno desde la cámara y contraluz que recorta siluetas.
- **`ocean: {waves, length, direction, choppy, color, crest, foam, foamLevel, speed, seed}`:** mar con suma de 5 ondas deterministas.
  - La malla es densa cerca del centro (espaciado cuadrático), sigue a la cámara y tiene espuma en las crestas.
  - `w.float(obj, {offset, tilt})` hace flotar y cabecear un objeto, muestreando a su escala.
  - `w.seaHeight(x, z, t)` da la altura del mar en un punto.
- **`terrain: {coast: {z, beach, bluff, bluffWidth, cliff, wiggle}, x, z, size, roughness, colors: {sand, grass, rock, wet}}`:** costa con la tierra hacia `z < coast.z` y el mar delante.
  - Tiene playa, loma o acantilado, relieve fbm y colores por altura y pendiente.
  - `w.add` apoya los objetos en el terreno; `w.groundHeight(x, z)` da su altura.
- **`clouds: {amount, dark, color, height, size, spread, seed}`:** nubes con sprites difusos.
- **Cámara:**
  - **`w.frame(t, objetivos, {shot, angle, side, dur, yaw})`, el encuadre automático:**
    - `shot`: general, conjunto, medio, cerrado o detalle. `angle`: frontal, tres_cuartos, lateral, espalda, picado, contrapicado o cenital.
    - Calcula la distancia según el formato, la anchura vista desde ese ángulo y una distancia mínima por tipo de plano.
    - En vertical sube el sujeto para dejar libres los subtítulos.
    - La primera llamada fija la toma; las siguientes vuelan.
  - **Toma manual:** `w.shot(t, dónde, {dist, pitch, yaw, h, dur})`.
  - **Deriva:** `w.drift(grados por segundo)`.
  - La cámara nunca baja del mar ni del terreno.
- **Objetos:** `w.add(id, {x,z}|[lon,lat], {scale, rotate, y, t, ...parámetros})`, `w.pose(o, t, {articulación: {x,y,z}})`, `w.act(o, 'acción', t0, t1, {rate})`, `w.move`, `w.show`, `w.hide`, `w.country`, `w.label` (city, pin o title), `w.route`, `w.fx` (fire, smoke, explosion, rain o sparkle), `w.flow`, `w.attach`, `w.onUpdate`.
- **`K.forge` (lo que recibe cada pieza):** `T` (Three.js), `mat`, `mesh`, `box`, `cyl`, `cone`, `sphere` (la `y` de estos cuatro es el centro), `lathe`, `extrude` (con `holes` y `bevel`), `tube`, `canvasTexture`, `pivot` (articulación con nombre), `group`, `rand`, `palette`. Registro: `K.defineModel` y `K.models`.

## 7. Generadores procedurales (`src/kit/gen.js`)

No son modelos fijos: el usuario no quiere nada prefabricado. Son constructores de calidad que se configuran con parámetros y sobre los que la pieza añade lo suyo.

- **`f.gen.human(p)`:** persona articulada con los pies en y = 0.
  - **Cuerpo:** `height` (18 = 1,8 m), `build`, `style` (`real` 7,4 cabezas, `comic` 6,2, `chibi` 3,8), `female`, `skin`, `hair {style: corto|largo|recogido|calvo|rapado, color}`, `beard`, `glasses`.
  - **Ropa:** `top`, `jacket`, `jacketLength`, `buttons`, `tie`, `belt`, `bottom`, `skirt`, `shoes`, `boots`, `gloves`, `badge`.
  - **Cabeza:** `headwear` (casco_m1, casco_brodie, casco_aleman, gorra_plato, gorra, boina, sombrero, gorro, casco_obra, corona o ninguno) y `headwearColor`.
  - **Equipo:** `backpack`, `rifle`.
  - **Construcción:** torso torneado y aplastado, extremidades con cápsulas que se estrechan, cabeza con mandíbula, nariz, orejas, ojos y cejas.
  - **Articulaciones:** cadera, columna, cuello, cabeza, hombro_*, codo_*, mano_*, muslo_*, rodilla_*, tobillo_*.
  - **Acciones:** respirar, andar, correr, hablar, saludar.
- **`f.gen.hull(p)`:** casco por secciones (loft), con triángulos orientados hacia fuera y colores por vértice.
  - **Medidas:** `length`, `beam`, `depth`, `draft`.
  - **Forma:** `bow` (punta, rampa, redonda o lancha), `stern` (espejo o redonda), `flat` (de 0 = V a 1 = fondo plano), `sheer`.
  - **Colores:** `color`, `bottom`, `stripe`.
  - **Extras:** `deck`, `rail`, `strakes`, `cabin`, `afloat`.
  - **Articulación «rampa»** con la acción abrir; todos tienen la acción cabecear.
- **Pendientes de crear:** generadores de aviones (fuselaje por loft, alas extruidas, hélices), vehículos de ruedas y orugas, edificios por plantas, árboles y vegetación, animales (cuadrúpedos por esqueleto), terreno urbano y personajes 2D articulados. Hacerlos igual: paramétricos, probados en `mesa` y documentados en `referencia/taller.md`.

## 8. Montaje (`src/assemble.mjs`)

- Copia las librerías (anime.js, d3, rough.js, topojson y el kit; Three.js, `world3d.js` y `gen.js` si hay 3D) y las tipografías usadas.
- Escribe `data.js` con palabras, paleta, cielos, look, iconos, banderas y la geografía usada, y `models.js`: cada pieza se compila aparte con `new Function`, así que un error de sintaxis no tumba las demás.
- Cada escena va en un `<section>` con su transición y también se compila aparte; si falla, sale un rótulo con su frase.
- Subtítulos con la palabra que suena resaltada (estilos tira, sombra, cinta, contorno o ninguno), grano por ruido SVG y viñeta.
- El tiempo de todo es determinista: lo mueve HyperFrames fotograma a fotograma, con `window.__hfAnime` y el evento `hf-seek`.

## 9. Flujo de trabajo de Claude (resumen de la skill)

1. **Encargo:** guion, idea, formato y voz.
2. **Voz:** `nuevo`, `voz` y `frases`.
3. **Dirección de arte en `plan.arte`:** nunca un vídeo en penumbra.
4. **Guion visual en `plan.escenas`:** una escena cada 4-12 s, sin huecos y variando recursos.
5. **Reparto:** pocas piezas muy ricas. Personas con `f.gen.human`, barcos con `f.gen.hull`; mar, costa y nubes los pone el escenario; mapas, siempre reales. Bucle `mesa` → mirar → corregir.
6. **Escenas:** con `K.cue` y `w.frame`; en vertical, el protagonista en el centro.
7. **Revisión por escena:** `validar` y `fotos --escena`, aplicando la rúbrica. Rehacer si no llega a 8; replantear tras dos intentos.
8. **Revisión del conjunto:** `fotos --todas` y la hoja de contactos.
9. **Sonido:** `plan.sonido` y efectos por escena.
10. **Render:** `render`, mirar el MP4 y entregarlo con su duración y el coste de la voz.

**Rúbrica** (8 = lo publicaría un canal grande; 5-6 = correcto pero pobre):
1. claridad;
2. protagonista grande e iluminado;
3. luz y contraste;
4. composición del formato;
5. riqueza y movimiento;
6. fidelidad exacta a la voz;
7. acabado (nada de cajas, nada flotando ni cortado, nada que tape los subtítulos).

## 10. Historia y lecciones (para no repetir errores)

1. **15-10, motor automático en Autake** (imagen de worker -61; director, guionista y programador con OpenAI, `hf validate`, revisor con visión):
   - El primer vídeo de prueba (114, «Countries that almost touch», 39 s) funcionó de punta a punta.
   - Tenía errores de geografía: el globo de Rusia enseñaba la Antártida porque el manual decía `rotate: [lon, lat]` y d3 quiere `[-lon, -lat]`. Se corrigió con `center` y el giro automático hacia `focus`.
2. **16-10, «nada prefabricado»:**
   - Se borró la biblioteca de modelos (castillos, barcos, personas, material de 1944…), el muñeco de palo, el HUD fijo, los cielos, los ánimos de música y las texturas.
   - Se creó el taller: fichas del jefe de taller, fabricación, mesa de giro y juez con nota mínima 8; también jueces de escena y un orquestador final.
   - Ensayo del Día D (40 s): 32 min y unos 4 $ con Sol. Notas del taller entre 3,3 y 7,4: cajas, escala mal (la lancha medía 2 m), personas pobres.
   - Lecciones: fotografiar en estudio neutro y no con la luz nocturna del vídeo; medir la escala; que el fabricante vea sus fotos.
3. **Sol frente a Luna** (mismo plan):

   | | Sol | Luna |
   |---|---|---|
   | Coste | ≈ 4,03 $ | ≈ 0,36 $ |
   | Tiempo | 32 min | 42 min |
   | Nota del orquestador | 5 | 4 |
   | Lancha | se construyó | no consiguió construirla |
   | Mapas | dibujado a mano | reales |

   La diferencia existe, pero no es enorme; el límite está en el taller.
4. **17-10, botón «Convertir en dirección técnica»:** una IA tradujo la idea del cliente a 20.000 caracteres de dirección escena a escena. Funcionó muy bien como texto. Su catálogo está en `docs/historia-autake/` y es útil como lista de capacidades.
5. **Vídeos 154 (Normandía, 61 s, 5,42 $) y 156 (países, 23 s, 0,98 $), los dos con Sol:** el usuario dijo que eran «una mierda» y la auditoría le dio la razón:
   - todo oscuro y apagado (doble viñeta y paletas nocturnas);
   - en vertical, la mitad del plano vacía y los protagonistas diminutos;
   - modelos de cajas;
   - la escena de los paracaidistas enseñaba un barco, y se repetían planos;
   - Eisenhower casi no se veía;
   - nubes de óvalos planos;
   - el mismo mapa tres veces;
   - «Russia ↔ USA» sobre Europa.

   **Causa:** pedir a una IA que invente cuerpos, barcos, mar y luz en cada vídeo, con jueces que miraban miniaturas en baja resolución y sin ninguna barrera.

   **Respuesta:** los generadores de §6 y §7 y jueces más duros (alta resolución, medidas de brillo, de centro vacío y de planos repetidos, y replanteo desde cero). Luego se decidió que dirija Claude.
6. **Coste orientativo** del motor automático: unos 6 $ de OpenAI por minuto con Sol. Con TurboFrame no hay OpenAI: el coste es el uso de Claude más ElevenLabs (unos céntimos por short).
7. **Rentabilidad:** un Short tendría que pasar de unas 55.000-180.000 visitas para recuperar 5,4 $ (RPM de Shorts entre 0,03 y 0,10 $). Los vídeos largos se recuperan antes (RPM de 1 a 5 $).
8. **Render:** en la flota sin GPU (CPX42, 8 vCPU), unas 3,5 veces la duración del vídeo con 3D. En el Mac con GPU, unas 0,7 veces: 6 s de prueba en 39 s, incluidos audio y montaje.

**Limpieza de Autake (17-10):**
- **Código:** se deshicieron los commits a22079f, f7866b3, d6b931f, 1fea802 y 688ddd7 y se borraron `resources/js/explainer`, los servicios `Explainer*`, el trabajo de dirección, sus tests y documentos, el claim `/explainer/claim` y el bucle del worker. Es la rama `feature/quitar-explicativo`, f6d6e6c, que ahora es `production`.
- **Servidores:** desplegado en Autake y Cayman, con copias en `/root/copias/quitar-explicativo/`. Se quitaron las variables `VIDEO_TYPE_EXPLAINER*` de los `.env`.
- **Datos:** se borraron los vídeos 114, 154 y 156 de Cayman, con copia de filas y ficheros. Se conservaron sus proyectos (112, 153 y 155) y el libro de créditos.
- **Flota:** imagen de worker -63 sin el motor; las instantáneas nuevas las hace el usuario.
- **GitHub:** borradas las ramas `feature/explicativo-*`.
- **Lo que queda:** los commits antiguos siguen en el historial de `production`. Nada de esto debe volver a Autake.

## 11. Estado y próximos pasos

1. **Lo que hay:** TurboFrame montado, independiente (trae su propio ffmpeg), subido y probado de punta a punta, con la clave de ElevenLabs ya en el `.env`.
2. **Primer encargo, hecho (17-10):** el short vertical del Día D está en `proyectos/normandia/normandia.mp4`.
   - Duración y coste: 75,8 s; voz real de ElevenLabs por ≈ 0,07 $; render en 156 s en el Mac.
   - Trabajo: 10 piezas revisadas en la mesa y 14 escenas revisadas con sus fotos.
   - Notas: la mitad de las escenas se quedan en 7,5. El detalle y lo aprendido están en `docs/encargos/normandia-estado.md` y en `SKILL.md` (recetas y fallos).
   - Cambios en la herramienta:
     - los cortes ya no se adelantan 0,55 s (`src/assemble.mjs`);
     - curva de volumen de la música atada a palabras: `musica.curva`;
     - `build` acepta palabras (`bin/turboframe.mjs` y `src/audio.py`).
3. **Motor de calidad, para todos los vídeos (17-10, tras auditar el short):**
   - **Física:** flotación con inercia; máscara de agua en cascos abiertos; mar de Gerstner con reflejo, espuma de flotación y estela; cámara que nunca entra en el agua ni queda tapada por una ola; separación automática de piezas que nacen solapadas; terreno seguido al moverse.
   - **Herramientas nuevas:** `w.walk` (A*, sin pies que patinan), `w.formation`, `w.scatter`, `w.point`, `w.look`, `w.shake`; efectos con profundidad, anclables a piezas, más `fogonazo` y `columna`.
   - **Textos y mapas:** títulos que se encogen solos para caber, mapas a sangre y `K.map.labels`.
   - **Control:** comando `auditar` integrado en `render`.
   - **Decoración (18-10):** `w.decorar('ciudad'|'campo'|'interior', {epoca})`, para que ningún plano tenga el suelo vacío; el auditor avisa de «suelo vacío» y el mobiliario no tapa nunca la cámara. Segundo vídeo: `proyectos/crack29/crack29.mp4`, el crack del 29 (60,3 s, ≈0,06 $ de voz).
   - **Calidad visual (19-10, tras auditar el vídeo del diésel):**
     - mar sin bordes ni patrón de manchas (11 ondas, rizo fino, bruma de horizonte, espuma con forma de casco);
     - edificios de fondo de cinco tipos con ventanas por plantas, comercios, cornisas, azoteas y `skyline`;
     - vida urbana en `w.decorar('ciudad')`: tráfico, coches aparcados, autobuses, taxis, semáforos y peatones;
     - luz: sombras de contacto y noche real (suelos oscurecidos, farolas con charco de luz, ventanas y faros encendidos).
     - taller (19-10, tras auditar el vídeo de las gasolineras): acabados con textura y relieve (`acabado`, 13 materiales), formas redondeadas (`f.rbox`, `f.rcyl`, `f.capsula`) y rótulos que siempre caben (`f.letrero`), con aviso en la mesa y el auditor si la letra queda demasiado pequeña.
     - apilado (20-10, tras auditar el vídeo de los Apalaches): en vídeos de más de 50 escenas, las escenas tapaban los subtítulos, la capa común y la viñeta (las escenas se apilaban con 10 + su número y esas capas tenían 50-60). Ahora van siempre encima (`CAPAS` en `src/assemble.mjs`) y `auditar` marca como grave cualquier escena que las tape.
     - imagen y naturaleza (20-10): posprocesado de cada fotograma (supermuestreo, oclusión ambiental GTAO, resplandor, etalonaje con grano, SMAA; `arte.render`), luz de entorno a partir del cielo de cada escena y aspecto `'realista'` con materiales físicos, cielo físico (`fisico: true`), agua que refleja el cielo, hierba instanciada que se mece, y generadores `f.gen.arbol` (10 especies) y `f.gen.animal` (10 cuadrúpedos y 5 aves, articulados y con zancada). Tras actualizar hace falta `npm install` (el paquete de Three.js lleva módulos nuevos).
   - **Realismo (20-10, tras auditar el vídeo de Ogallala):** anatomía real de los cuadrúpedos y acción `montar` para jinetes; en `'realista'`, variación de tono y brillo, suciedad a ras de suelo y etalonaje propio; suelo con manchas a gran escala y arboledas en el horizonte; `w.lago` y `w.rio`; `f.gen.montana`; sombras 4096 con alcance según el plano y bruma baja (`bruma`).
   - **Imagen de cine (22-10, ideas estudiadas en Frontier y reescritas):** obturador con subfotogramas (desenfoque de movimiento real, antialiasing, adaptativo según el movimiento), profundidad de campo (`foco`), capa de película (`pelicula`: curva fílmica, halación, vaivén, parpadeo, polvo, virado) y niebla de altura con perspectiva aérea en todos los materiales (`niebla`). Arreglado: `arte.render` no llegaba a la página, y el MP4 de un proyecto pasado por ruta se guardaba en una carpeta equivocada.
   - **Render por tramos (22-10):** los vídeos de más de 90 s se renderizan en tramos de ~45 s con huella y caché; cambiar una escena rehace solo su tramo. Comprobado fotograma a fotograma contra el render entero (misma imagen salvo el grano).
   - **Verdad en pantalla y tiempos (22-10):** el auditor avisa de cada cifra en pantalla que el guion no dice; `voz` ajusta a la voz real los bordes de palabra junto a las pausas (ElevenLabs los daba ~100 ms tarde: el resalte del subtítulo y los efectos se adelantaban a la voz); `render` revisa el MP4 final (destellos, negros, congelados).
   - **Subtítulos de cine y mapas en mesa (22-10):** estilo de subtítulo `cine` con palabra clave y mapas `K.map.world({inclinar})` tumbados en perspectiva, con rutas en `m.capa()` y rótulos de pie.
   - **Cámara y atmósfera 3D (22-10):** `w.barrido`, `w.golpe`, `w.vertigo`, `w.mano` (y `fov` en las tomas); `w.nubes` (nubes de volumen atravesables) y humo y fuego como bocanadas iluminadas.
   - **Arreglos tras el antes/después (22-10):** la curva fílmica del etalonado se volvía negativa con luces por encima de 1,5 (el sol reflejado en el mar tras el resplandor salía como mancha negra con halo azul); ahora se acota antes. Las manchas de luz del suelo liso solo salen en exteriores (`manchas: 'auto'`, cielo con bruma): en un estudio de fondo liso ensuciaban el fondo. La mesa inclinada proyecta la geometría del mapa (la transformación 3D de CSS no salía en el render de HyperFrames).
   - **Comprobación (22-10):** antes/después en 21 instantes de ogallala, appalachians y diesel-deal (mismo aspecto, más perspectiva aérea; dos regresiones encontradas y corregidas) y un vídeo de laboratorio de 30 s con seis escenas parecidas hechas con lo nuevo (render en 145 s, sin graves).
   - **Nombre (23-10):** el producto pasa a llamarse **TurboFrame** (antes genframe; dominio turboframe.ai). Cambiado en código, comando (`bin/turboframe.mjs`), skill (`turboframe`) y documentación. Siguen con el nombre antiguo el repositorio de GitHub, el alias SSH y la carpeta del Mac.
   - **Render sin congelar el Mac (25-10):** HyperFrames abría unos 6 navegadores a la vez y dejaba el Mac de 16 GB sin memoria (Claude se congelaba). Ahora `render` abre los justos según la RAM (2 con 16 GB: mitad de memoria, +13 % de tiempo) y con prioridad baja (`nice`); `--workers` y `TURBOFRAME_WORKERS` lo cambian; `comprobar` dice cuántos usa.
   - **Render de noche (25-10):** aun con 2 navegadores el Mac de 16 GB se congelaba (va al 20 % libre en reposo; `validar` de un vídeo de 25 min ya lo baja al 11 %). Cola en `proyectos/.cola.json`: `encolar`, `cola`, `noche` (render uno a uno en procesos aparte, `caffeinate`, 3 navegadores, `--forzar` y graves anotados, `render-noche.log`, notificación) y `programar --hora` (LaunchAgent `ai.turboframe.noche`). La skill encola por defecto y deja la auditoría completa de los vídeos largos para la noche.
   - **Agentes y navegadores (25-10):** el Mac se colgó con 8 agentes en paralelo programando escenas (cada uno con su Chrome para mesa, fotos y validar; vídeo de Luisiana, casi todo 3D con agua y cipreses). Turno global de navegadores entre procesos (`withBrowsers`: un fichero por turno en la carpeta temporal con su pid, todo o nada, el render reserva y tiene prioridad; `TURBOFRAME_NAVEGADORES`, 2 con 16 GB) y como mucho 2 agentes en paralelo en la skill (`TURBOFRAME_AGENTES`). Probado: 6 «fotos» lanzadas a la vez, nunca más de 2 Chrome.
   - **Producto (23-10):** decidido vender TurboFrame empaquetado para el Claude Code de cada cliente. Carpeta `producto/` (ver su README): empaquetador con limpieza de lo personal, README de cliente, licencia (borrador), avisos de terceros y novedades; comandos `comprobar`, `version` y `actualizar`. Versión 1.0.0. Probado instalando el paquete desde cero y simulando una actualización.
   - **Limpieza (20-10):** a petición del usuario se retiraron el banco de pruebas (`pruebas/`, `npm test`), los vídeos de referencia, la historia del laboratorio y de Autake, y los recursos que el motor no usaba (HDRI, texturas, la Tierra de la NASA, Natural Earth en shapefiles). Siguen en el historial de git si alguna vez hacen falta.
4. **Generadores pendientes:** aviones, edificios protagonistas, vegetación variada, animales y personajes 2D; decoraciones `'industrial'`, `'carretera'`, `'puerto'` y `'oficial'`.
5. **Mejoras de la herramienta:**
   - `fotos --escena` con zoom de detalle;
   - previsualización en GIF o vídeo corto de una escena;
   - caché de piezas entre proyectos;
   - plantilla de `plan.json` más completa;
   - `voz` con «request stitching» de ElevenLabs para guiones largos.
6. **Cuando se aprenda algo** (una receta que funciona, un fallo frecuente), añadirlo a `SKILL.md` o a `referencia/`. La skill es la memoria del estudio.

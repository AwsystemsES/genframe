/*
 * Motor del vídeo explicativo: de la voz (palabras con tiempos), el guion y las instrucciones de estilo
 * al MP4 final. La IA (OpenAI) hace de director de arte, guionista visual, programador de escenas y
 * revisor con visión; nada sale de plantillas.
 *
 * Uso: node explain.mjs <carpeta>   (con <carpeta>/input.json: {script, style, words:[{t,a,b}], duration, voice})
 * Deja en <carpeta>: plan.json, proyecto/ (HyperFrames), mix.wav, video.mp4 y report.json.
 */
import fs from 'fs';
import path from 'path';
import {execFile} from 'child_process';
import {promisify} from 'util';
import {fileURLToPath} from 'url';
import {askJson, pool, usage, MODEL} from './ai.mjs';
import {assemble} from './assemble.mjs';
import {FONTS, TEXTURES, TRANSITIONS, CAPTION_STYLES, SFX, AMBIENCES, MUSIC_MOODS} from './catalog.mjs';

const run = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MANUAL = fs.readFileSync(path.join(HERE, 'prompts/manual.md'), 'utf8');
const HF = process.env.HYPERFRAMES_BIN || path.join(HERE, '../node_modules/.bin/hyperframes');
const PYTHON = process.env.PYTHON || 'python3';
const PARALLEL = Number(process.env.EXPLAINER_PARALLEL || 4);
const strip = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]/g, '');
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const r3 = (x) => Math.round(x * 1000) / 1000;
/** Formato del vídeo: '16:9' (1920×1080) o '9:16' (1080×1920, Shorts). Lo fija explain() con el del trabajo. */
let FMT = '16:9';
const formatText = () => FMT === '9:16'
  ? 'FORMATO VERTICAL 9:16 (1080×1920, Shorts/Reels): composición en columna, un solo foco por plano, textos grandes y centrados, nada importante arriba del todo (y < 200), en la columna derecha (x > 940) ni debajo de y 1200 (ahí van los subtítulos y la interfaz de Shorts). Cámara 3D más cerrada y vertical (planos medios, picados y contrapicados).'
  : 'FORMATO HORIZONTAL 16:9 (1920×1080).';
const CODER_MODEL = process.env.OPENAI_EXPLAINER_CODER_MODEL || 'gpt-6-sol';

/** Frases de la narración con su tramo, a partir de las palabras alineadas. */
export function sentences(words) {
  const out = [];
  let cur = [];
  for (const w of words) {
    cur.push(w);
    if (/[.?!…]["»”)]*$/.test(w.t)) { out.push(cur); cur = []; }
  }
  if (cur.length) out.push(cur);
  return out.map((ws, i) => ({i, text: ws.map((w) => w.t).join(' '), a: ws[0].a, b: ws[ws.length - 1].b}));
}

function cueOf(words, text, after = 0) {
  const key = strip(text).slice(0, 14);
  const hit = words.find((w) => w.a >= after - 0.05 && key && strip(w.t).startsWith(key));
  return hit ? hit.a : null;
}

/* ------------------------------------------------------------------ 1. dirección de arte */
async function direct(input, sents) {
  const fonts = Object.entries(FONTS).map(([n, [, , c]]) => `${n} (${c})`).join('; ');
  const system = `Eres director de arte de vídeos explicativos animados para YouTube (estilo Vox, Kurzgesagt, Johnny Harris, infografía de prensa).
Decides la identidad visual y sonora de UN vídeo a partir de su guion y de las instrucciones del cliente, y justificas cada elección por el tema, el tono y el público.
Cada vídeo debe tener una identidad propia: no repitas combinaciones genéricas (nada de "fondo blanco y azul corporativo" por defecto).
Responde SOLO con JSON.`;
  const user = `GUION:
${input.script}

INSTRUCCIONES DE ESTILO DEL CLIENTE (mandan sobre tu criterio si las hay):
${input.style || '(ninguna)'}

DURACIÓN: ${input.duration.toFixed(1)} s, ${sents.length} frases.\n${formatText()}${(input.photos || []).length ? '\nFOTOS DE INSPIRACIÓN: van adjuntas. Úsalas para el estilo (paleta, luz, ambiente, época, encuadres) y para saber qué objetos y escenarios recrear con los modelos disponibles. Nunca reproduzcas caras de personas reales.' : ''}

CATÁLOGO (elige solo de aquí):
- Tipografías: ${fonts}
- Texturas de fondo (grano sobre el color, opcional): ${Object.keys(TEXTURES).join(', ')}
- Estilos de subtítulo: ${CAPTION_STYLES.join(', ')} (tira = caja clara; sombra = texto blanco con sombra, para fondos oscuros; cinta = papel ligeramente girado; ninguno)
- Música (urbano y synthwave son emisoras sintetizadas de videojuego; el resto, orquesta real): ${Object.keys(MUSIC_MOODS).join(', ')}
- Ambientes: ${AMBIENCES.join(', ')} (solo si el tema lo pide de verdad)

Devuelve:
{
 "concept": "la idea visual del vídeo en una frase",
 "rationale": "por qué estas elecciones (tema, tono, público)",
 "palette": {"bg": "#hex fondo", "bg2": "#hex segundo tono del fondo", "ink": "#hex texto y trazo principal", "accent": "#hex color de lo importante", "accent2": "#hex segundo acento", "soft": "#hex tono suave para elementos secundarios"},
 "fonts": {"title": "...", "body": "... (legible: subtítulos y textos)", "label": "... (etiquetas cortas)", "hand": "... (anotaciones, puede ser manuscrita)"},
 "background": {"type": "solid|gradient", "texture": "nombre o null", "strength": 0.15-0.45, "angle": 0-360},
 "captions": {"style": "...", "highlight": "#hex del resaltado de la palabra que suena", "text": "#hex", "background": "rgba(...) o null"},
 "vignette": 0-0.5,
 "music": {"mood": "...", "gain": 0.6-1.2},
 "hud": "juego (interfaz de videojuego: radar, año como marcador, estrellas de búsqueda, misiones; SOLO si el cliente pide estética de videojuego) o ninguno",
 "visual_language": "reglas de dibujo comunes a todas las escenas (grosor de trazo, a mano o geométrico, cómo se marcan las cifras, cómo entran los textos)",
 "references": "si hay fotos de inspiración: qué tomar de cada una (objetos, escenarios, colores, encuadres) para que el guionista y el programador lo recreen; si no, null"
}
Contraste mínimo WCAG AA entre ink y bg. Si el fondo es oscuro, subtítulos "sombra" o una tira oscura.`;
  const photos = (input.photos || []).filter((f) => fs.existsSync(f)).slice(0, 8);
  const content = photos.length ? [{type: 'text', text: user}, ...photos.map((f) => ({type: 'image_url', image_url: {url: `data:image/${/\.png$/i.test(f) ? 'png' : 'jpeg'};base64,` + fs.readFileSync(f).toString('base64'), detail: 'low'}}))] : user;
  return askJson(system, content, {tag: 'director'});
}

/* ------------------------------------------------------------------ 2. guion visual */
async function storyboard(input, sents, art) {
  const system = `Eres guionista visual de vídeos explicativos animados. Divides la narración en escenas y decides qué se VE en cada una para que el espectador entienda y no se aburra.
Principios: una idea visual fuerte por escena; mostrar en vez de escribir lo que dice la voz; datos reales del guion convertidos en gráficos, mapas, comparaciones, diagramas, líneas de tiempo, metáforas visuales;
variedad: no repitas el mismo recurso en escenas seguidas.
Solo existe lo que se genera por código, nunca fotos ni vídeos: formas y trazos SVG (a mano o geométricos), iconos de línea, banderas, mapas reales 2D del mundo y de España, texto y cifras animadas, partículas, personajes de palo articulados con bocadillos,
y un MUNDO 3D: maqueta del mapa real extruido (España, Iberia, Europa, Mediterráneo, Atlántico o mundo) o un suelo libre para dioramas, con cielo de atardecer/día/noche/tormenta, vuelos de cámara, balizas de destino, rutas de GPS, humo, fuego, explosiones y lluvia,
y modelos 3D generados: castillo, torre, casas, ciudad (romana, medieval o moderna), templo, acueducto, anfiteatro, mezquita, catedral, palacio, parlamento, barco, galera, soldados, ejércitos, cañón, árboles, bosque, montaña, cueva, coche, tren, avión, fábrica, estadio, tanque, bandera, corona, hoguera, personas articuladas (con casco, traje, uniformes), aeropuerto y avión A350, calles de ciudad, y material de 1944: lancha de desembarco Higgins con rampa, buque LST, acorazado, destructor, globos de barrera, tanque Sherman (y anfibio DD), semioruga, camión, jeep, DUKW, avión C-47 con franjas de invasión, planeador Horsa, soldados con casco M1 o Brodie, erizos checos, puertas belgas, postes con mina, búnker, nido de ametralladora, costa con playa y loma o acantilado, campos de bocage, puerto Mulberry y cementerio militar. Hay humo, fuego, explosiones, lluvia y corrientes de partículas.
Responde SOLO con JSON.`;
  const CHUNK = 36;
  const all = [];
  let chapters = 0;
  for (let from = 0; from < sents.length; from += CHUNK) {
    const part = sents.slice(from, from + CHUNK);
    const before = all.slice(-6).map((x) => `${x.id}: ${x.device}`).join('; ');
    const user = `DIRECCIÓN DE ARTE: ${JSON.stringify({concept: art.concept, visual_language: art.visual_language, palette: art.palette, hud: art.hud})}
INSTRUCCIONES DEL CLIENTE: ${input.style || '(ninguna)'}
${formatText()}
${art.references ? 'LO QUE HAY QUE RECREAR DE LAS FOTOS DE INSPIRACIÓN: ' + art.references + '\n' : ''}${before ? `ÚLTIMAS ESCENAS YA DISEÑADAS (no repitas su recurso): ${before}\nCAPÍTULOS ABIERTOS HASTA AHORA: ${chapters}` : 'Es el comienzo del vídeo.'}

FRASES (índice, tramo en segundos, texto):
${part.map((x) => `${x.i} [${x.a.toFixed(1)}–${x.b.toFixed(1)}] ${x.text}`).join('\n')}

Agrupa frases CONSECUTIVAS en escenas de 4 a 12 segundos (una frase muy larga puede ir sola). Cubre todas estas frases, en orden, sin saltarte ninguna.
Transiciones disponibles: ${TRANSITIONS.join(', ')} (corte para ritmo, fundido para cambio de tono, pagina/deslizar para pasar capítulo; no abuses de una sola).
Efectos de sonido disponibles: ${Object.keys(SFX).join(', ')}. Con moderación (0–3 por escena), atados a una palabra que se dice.
Ambientes: ${AMBIENCES.join(', ')} (opcional).

Devuelve:
{"scenes": [
 {"id": "corto-sin-espacios", "sentences": [${part[0].i}, ${part[0].i + 1}], "transition": "...",
  "visual": "descripción concreta y detallada de lo que se ve (2D o 3D), composición, cámara y qué aparece al decir cada palabra clave (cita la palabra exacta del guion)",
  "device": "recurso principal",
  "year": año de lo que se cuenta (número; negativo = antes de Cristo; null si no aplica),
  "place": {"name": "lugar en pantalla, corto", "lon": número, "lat": número} o null,
  "wanted": 0-5 (nivel de tensión o conflicto: 0 paz, 5 guerra total),
  "chapter": "título corto y con gancho si en esta escena empieza un capítulo nuevo de la historia (cada 1-3 minutos), si no null",
  "sfx": [{"name": "...", "word": "palabra exacta del guion en esa escena"}],
  "ambience": "nombre o null"}
]}`;
    const out = await askJson(system, user, {tag: 'guionista'});
    for (const sc of out.scenes || []) { if (sc.chapter) chapters++; all.push(sc); }
    log('guionista', `frases ${from}–${from + part.length - 1}: ${(out.scenes || []).length} escenas`);
  }
  return {scenes: all};
}

/* ------------------------------------------------------------------ 3. programación de cada escena */
function sceneContext(scene, words) {
  return K_WORDS(words, scene.start, scene.end);
}
function K_WORDS(words, a, b) {
  return words.filter((w) => w.a >= a - 0.01 && w.a < b).map((w) => `${w.a.toFixed(2)} ${w.t}`).join(' | ');
}

const CODER = `Eres un programador creativo de motion graphics. Escribes el código JavaScript de UNA escena de un vídeo explicativo usando la caja de herramientas K.
Calidad de estudio: composición equilibrada, jerarquía clara, movimiento con intención, todo sincronizado con la voz. Respeta la dirección de arte y el guion visual, pero si algo no se puede hacer con K, resuélvelo con lo que hay.
Responde SOLO con JSON: {"code": "cuerpo de la función"}.

${MANUAL}`;

async function code(scene, art, words, {previous = null, problems = null} = {}) {
  const user = `DIRECCIÓN DE ARTE: ${JSON.stringify({palette: art.palette, fonts: art.fonts, visual_language: art.visual_language})}${art.hud === 'juego' ? '\nHay una interfaz de videojuego AUTOMÁTICA encima de todo: radar abajo a la izquierda (x < 340, y > 740), año y estrellas de búsqueda arriba a la derecha (x > 1300, y < 190), nombre de la zona abajo a la derecha y los rótulos de «MISIÓN» y «¡MISIÓN SUPERADA!». NUNCA dibujes tú misiones, misión superada, respeto, estrellas, año-marcador, radar ni nombre de zona: ya salen solos. No pongas nada importante en esas zonas. Tú dibujas el CONTENIDO de la escena (3D, personajes, mapas, cifras).' : ''}
${formatText()} Lienzo: K.W×K.H.\nESCENA "${scene.id}": T0 = ${scene.start.toFixed(2)} s, T1 = ${scene.end.toFixed(2)} s.${scene.year != null ? ` Año: ${scene.year}.` : ''}${scene.place ? ` Lugar: ${scene.place.name} [${scene.place.lon}, ${scene.place.lat}].` : ''}
TEXTO QUE DICE LA VOZ: ${scene.text}
PALABRAS CON SU INSTANTE: ${sceneContext(scene, words)}
GUION VISUAL: ${scene.visual}
RECURSO PRINCIPAL: ${scene.device}
${previous ? `\nCÓDIGO ANTERIOR:\n${previous}\n\nPROBLEMAS QUE CORREGIR (corrígelos todos sin romper lo que estaba bien):\n${problems}` : ''}`;
  const out = await askJson(CODER, user, {tag: 'programador', model: CODER_MODEL});
  return String(out.code || '');
}

/* ------------------------------------------------------------------ 4. revisión */
async function validate(project) {
  try {
    const {stdout} = await run(HF, ['validate', '--json', '--no-contrast', '--timeout', '20000', project], {maxBuffer: 1 << 26, env: {...process.env, HYPERFRAMES_NO_TELEMETRY: '1'}});
    return JSON.parse(stdout).errors || [];
  } catch (error) {
    try { return JSON.parse(error.stdout).errors || []; } catch { return [{text: 'validate: ' + error.message}]; }
  }
}

async function snapshots(project, times) {
  const dir = path.join(project, 'snapshots');
  fs.rmSync(dir, {recursive: true, force: true});
  await run(HF, ['snapshot', '--at', times.map((t) => t.toFixed(2)).join(','), '--no-end', '--describe', 'false', '-o', dir, project], {maxBuffer: 1 << 26, env: {...process.env, HYPERFRAMES_NO_TELEMETRY: '1'}});
  return fs.readdirSync(dir).filter((f) => /^frame-\d+/.test(f)).sort((a, b) => parseInt(a.slice(6)) - parseInt(b.slice(6))).map((f) => path.join(dir, f));
}

/** Cuánto «dibujo» tiene un fotograma (bordes fuertes fuera de la franja de subtítulos); el fondo con grano da ~0,2. */
const EMPTY = 0.5;
const FFMPEG = process.env.FFMPEG || path.join(HERE, '../../bin/ffmpeg');
async function busyness(png) {
  try {
    const {stdout} = await run(FFMPEG, ['-v', 'error', '-i', png, '-vf', FMT === '9:16' ? 'crop=1080:1000:0:200,format=gray,edgedetect=low=0.2:high=0.4,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-' : 'crop=1920:820:0:60,format=gray,edgedetect=low=0.2:high=0.4,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-', '-f', 'null', '-']);
    return parseFloat((/YAVG=([\d.]+)/.exec(stdout) || [])[1] ?? '99');
  } catch {
    return 99;
  }
}

async function review(scene, images) {
  const system = `Eres el revisor de calidad de un estudio de vídeos explicativos. Miras fotogramas de UNA escena y detectas lo que un espectador vería mal.
Busca: textos cortados, solapados o fuera de pantalla; elementos que tapan la franja de subtítulos (abajo); pantalla vacía o casi vacía; textos ilegibles por tamaño o contraste;
composición desequilibrada; elementos rotos (iconos vacíos, mapas sin forma, cuadros sin contenido); algo que contradiga lo que dice la voz.
No pidas cambios de gusto si la escena funciona. La interfaz de videojuego (radar, año, estrellas, nombre de zona, rótulos de misión) es automática y común a todo el vídeo: no la juzgues ni pidas cambiarla. Responde SOLO con JSON: {"ok": true|false, "problems": ["problema concreto y cómo arreglarlo", ...]}`;
  const content = [{type: 'text', text: `Escena "${scene.id}" (${scene.start.toFixed(1)}–${scene.end.toFixed(1)} s). Voz: ${scene.text}\nGuion visual: ${scene.visual}\nFotogramas en orden temporal:`}];
  for (const img of images) content.push({type: 'image_url', image_url: {url: 'data:image/png;base64,' + fs.readFileSync(img).toString('base64'), detail: 'low'}});
  return askJson(system, content, {tag: 'revisor', effort: 'low'});
}

/* ------------------------------------------------------------------ montaje */
function job(input, plan, sceneCode) {
  const art = plan.art;
  return {
    duration: input.duration,
    format: FMT,
    words: input.words,
    art: {
      palette: art.palette,
      fonts: Object.fromEntries(Object.entries(art.fonts).map(([k, v]) => [k, FONTS[v] ? v : 'Inter'])),
      background: {type: art.background?.type === 'gradient' ? 'gradient' : 'solid', from: art.palette.bg, to: art.palette.bg2, angle: art.background?.angle, texture: art.background?.texture, strength: art.background?.strength},
      captions: art.captions || {style: 'tira'},
      vignette: art.vignette,
    },
    hud: plan.hud || null,
    scenes: plan.scenes.map((s) => ({id: s.id, start: s.start, end: s.end, transition: s.transition, text: s.text, code: sceneCode[s.id] || ''})),
  };
}

function soundPlan(input, plan, out) {
  const sfx = [];
  const amb = [];
  for (const s of plan.scenes) {
    for (const fx of s.sfx || []) {
      const t = fx.word ? cueOf(input.words, fx.word, s.start) : null;
      if (t !== null && t < s.end && SFX[fx.name]) sfx.push({name: fx.name, t});
    }
    if (s.transition === 'pagina' && s.start > 1) sfx.push({name: 'pagina', t: s.start - 0.45, gain: 0.8});
    if (s.ambience && AMBIENCES.includes(s.ambience)) amb.push({kind: s.ambience, from: s.start, to: s.end});
  }
  for (const m of plan.hud?.missions || []) {
    sfx.push({name: 'golpe', t: m.t0 + 0.15, gain: 0.9});
    if (m.t1 - m.t0 > 12) sfx.push({name: 'confirmar', t: m.t1 - 2.8, gain: 1.2});
  }
  const third = plan.scenes[Math.floor(plan.scenes.length / 3)]?.start;
  const two = plan.scenes[Math.floor((plan.scenes.length * 2) / 3)]?.start;
  return {duration: input.duration, voice: input.voice, music: {mood: plan.art.music?.mood || 'documental', gain: plan.art.music?.gain || 1, build: [third, two].filter(Boolean)}, sfx, ambience: amb};
}

export async function explain(dir) {
  const started = Date.now();
  const input = JSON.parse(fs.readFileSync(path.join(dir, 'input.json'), 'utf8'));
  input.voice = path.resolve(dir, input.voice);
  FMT = input.format === '9:16' ? '9:16' : '16:9';
  input.photos = (input.photos || []).map((f) => path.resolve(dir, f));
  // Ensayo: solo los primeros EXPLAINER_LIMIT segundos (frases completas).
  if (process.env.EXPLAINER_LIMIT) {
    const cut = sentences(input.words).filter((x) => x.b <= Number(process.env.EXPLAINER_LIMIT)).pop();
    if (cut) { input.words = input.words.filter((w) => w.a <= cut.b); input.duration = r3(cut.b + 1.2); }
  }
  const sents = sentences(input.words);
  const project = path.join(dir, 'proyecto');
  const report = {model: MODEL, steps: []};
  const step = (name, extra = {}) => { report.steps.push({name, s: r3((Date.now() - started) / 1000), ...extra}); log(name, JSON.stringify(extra)); };

  // Reanudar: si ya hay un plan con el código de las escenas, solo se hacen la banda sonora y el render.
  const planFile = path.join(dir, 'plan.json');
  if (process.env.EXPLAINER_RESUME && fs.existsSync(planFile)) {
    const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
    if (plan.code) {
      const sound = soundPlan(input, plan);
      fs.writeFileSync(path.join(dir, 'sound.json'), JSON.stringify(sound, null, 1));
      await run(PYTHON, [path.join(HERE, 'audio.py'), path.join(dir, 'sound.json'), path.join(dir, 'mix.wav')], {maxBuffer: 1 << 24});
      const final = job(input, plan, plan.code);
      final.audio = path.join(dir, 'mix.wav');
      assemble(final, project);
      step('audio (reanudado)');
      await run(HF, ['render', '--output', path.resolve(dir, 'video.mp4'), project], {cwd: project, maxBuffer: 1 << 28, env: {...process.env, HYPERFRAMES_NO_TELEMETRY: '1'}});
      step('render');
      return report;
    }
  }
  // 1-2: dirección de arte y guion visual.
  const art = await direct(input, sents);
  step('director', {concept: art.concept});
  const board = await storyboard(input, sents, art);
  const scenes = [];
  let covered = 0;
  for (const s of board.scenes || []) {
    const idx = (s.sentences || []).filter((i) => i >= covered && i < sents.length);
    if (!idx.length) continue;
    const last = Math.max(...idx);
    scenes.push({...s, id: strip(s.id).slice(0, 24) || 's' + scenes.length, from: covered, to: last});
    covered = last + 1;
  }
  if (!scenes.length) throw new Error('El guion visual no devolvió escenas');
  if (covered < sents.length) scenes[scenes.length - 1].to = sents.length - 1;
  const seen = new Set();
  scenes.forEach((s, i) => {
    if (seen.has(s.id)) s.id += '-' + i;
    seen.add(s.id);
    s.start = i === 0 ? 0 : sents[s.from].a - 0.15;
    s.text = sents.slice(s.from, s.to + 1).map((x) => x.text).join(' ');
    if (!TRANSITIONS.includes(s.transition) || i === 0) s.transition = i === 0 ? 'corte' : 'fundido';
  });
  scenes.forEach((s, i) => { s.start = r3(s.start); s.end = r3(i < scenes.length - 1 ? scenes[i + 1].start : input.duration); });
  const plan = {art, scenes};
  if (art.hud === 'juego') {
    const starts = scenes.filter((s) => s.chapter);
    plan.hud = {
      missions: starts.map((s, k) => ({n: k + 1, title: String(s.chapter).toUpperCase(), t0: s.start, t1: starts[k + 1] ? starts[k + 1].start : input.duration})),
      marks: scenes.map((s) => ({t: s.start, year: Number.isFinite(+s.year) && s.year !== null ? +s.year : null, wanted: +s.wanted || 0, place: s.place && Number.isFinite(+s.place.lon) ? {name: s.place.name, lon: +s.place.lon, lat: +s.place.lat} : null})),
    };
  }
  fs.writeFileSync(path.join(dir, 'plan.json'), JSON.stringify(plan, null, 1));
  step('guionista', {scenes: scenes.length});

  // 3: código de cada escena en paralelo.
  const sceneCode = {};
  await pool(scenes, PARALLEL, async (s) => { sceneCode[s.id] = await code(s, art, input.words).catch((e) => { log('programador', s.id, e.message); return ''; }); });
  step('programador', {scenes: Object.keys(sceneCode).length});

  // 4: errores de ejecución → se reescribe la escena con el error (dos intentos).
  for (let round = 1; round <= 2; round++) {
    assemble(job(input, plan, sceneCode), project);
    const errors = await validate(project);
    const broken = new Map();
    for (const e of errors) {
      const m = /Escena ([\w-]+): (.*)/.exec(e.text || '');
      if (m) broken.set(m[1], m[2]);
    }
    step('validación ' + round, {errors: errors.length, scenes: [...broken.keys()]});
    if (!broken.size) break;
    await pool([...broken], PARALLEL, async ([id, message]) => {
      const s = scenes.find((x) => x.id === id);
      if (s) sceneCode[id] = await code(s, art, input.words, {previous: sceneCode[id], problems: 'Error al ejecutar: ' + message}).catch(() => sceneCode[id]);
    });
  }

  // 5: revisión de cada escena (tres fotogramas): medida de pantalla vacía y revisor con visión; hasta dos rondas
  // sobre las escenas corregidas. Un arreglo que rompe la escena se descarta y se queda la versión anterior.
  let pending = process.env.EXPLAINER_REVIEW === '0' ? [] : scenes;
  for (let round = 1; round <= 2 && pending.length; round++) {
    const times = pending.flatMap((s) => [0.3, 0.6, 0.92].map((f) => s.start + 0.6 + (s.end - s.start - 0.6) * f));
    const shots = await snapshots(project, times);
    const fixes = [];
    await pool(pending, PARALLEL, async (s, i) => {
      const imgs = shots.slice(i * 3, i * 3 + 3);
      if (!imgs.length) return;
      const problems = [];
      for (const [k, img] of imgs.entries()) {
        if (await busyness(img) < EMPTY) problems.push(`El fotograma del segundo ${times[i * 3 + k].toFixed(1)} sale VACÍO (solo fondo). Comprueba que cada elemento acaba con opacidad 1, dentro de la pantalla y en un instante entre T0 y T1, y que la escena tiene contenido visible hasta T1.`);
      }
      const verdict = await review(s, imgs).catch(() => ({ok: true}));
      if (!verdict.ok) problems.push(...(verdict.problems || []));
      if (problems.length) fixes.push([s, problems]);
    });
    step('revisor ' + round, {fixes: fixes.map(([s, p]) => `${s.id}: ${p.join(' / ')}`)});
    if (!fixes.length) break;
    const before = {...sceneCode};
    await pool(fixes, PARALLEL, async ([s, problems]) => {
      const fixed = await code(s, art, input.words, {previous: sceneCode[s.id], problems: problems.map((p) => '- ' + p).join('\n')}).catch(() => null);
      if (fixed) sceneCode[s.id] = fixed;
    });
    assemble(job(input, plan, sceneCode), project);
    const broken = new Set((await validate(project)).map((e) => (/Escena ([\w-]+):/.exec(e.text || '') || [])[1]).filter(Boolean));
    for (const id of broken) sceneCode[id] = before[id];
    if (broken.size) assemble(job(input, plan, sceneCode), project);
    step('validación tras revisor ' + round, {reverted: [...broken]});
    pending = fixes.map(([s]) => s).filter((s) => !broken.has(s.id));
  }
  plan.code = sceneCode;
  fs.writeFileSync(path.join(dir, 'plan.json'), JSON.stringify(plan, null, 1));

  // 6: banda sonora y render.
  const sound = soundPlan(input, plan);
  fs.writeFileSync(path.join(dir, 'sound.json'), JSON.stringify(sound, null, 1));
  await run(PYTHON, [path.join(HERE, 'audio.py'), path.join(dir, 'sound.json'), path.join(dir, 'mix.wav')], {maxBuffer: 1 << 24});
  const final = job(input, plan, sceneCode);
  final.audio = path.join(dir, 'mix.wav');
  assemble(final, project);
  step('audio');
  await run(HF, ['render', '--output', path.resolve(dir, 'video.mp4'), project], {cwd: project, maxBuffer: 1 << 28, env: {...process.env, HYPERFRAMES_NO_TELEMETRY: '1'}});
  step('render');
  report.usage = usage;
  report.seconds = r3((Date.now() - started) / 1000);
  fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 1));
  return report;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  explain(path.resolve(process.argv[2])).then((r) => log('listo', JSON.stringify(r.usage), r.seconds + ' s')).catch((e) => { console.error(e); process.exit(1); });
}

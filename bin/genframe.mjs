#!/usr/bin/env node
/*
 * genframe: estudio de vídeos explicativos generados por código. Claude (con la skill genframe) escribe la
 * dirección, fabrica las piezas y programa las escenas; esta herramienta pone la voz (ElevenLabs), monta el
 * proyecto HyperFrames, hace fotos para revisar, mezcla el audio y renderiza el MP4.
 *
 * Cada vídeo vive en proyectos/<nombre>/:
 *   guion.txt        el texto que se locuta (una frase termina en . ? ! o …)
 *   plan.json        formato, dirección de arte, escenas (qué frases cubre cada una), sonido
 *   piezas/<id>.js   cuerpo de la función constructora de cada pieza (3D por defecto; «// 2d» en la primera línea para dibujos)
 *   escenas/<id>.js  cuerpo de la función de cada escena (root, T0, T1)
 *   capa.js          (opcional) capa común encima de todo el vídeo
 *   voz.mp3, palabras.json   los genera «genframe voz»
 */
import fs from 'fs';
import path from 'path';
import {execFile} from 'child_process';
import {promisify} from 'util';
import {fileURLToPath} from 'url';
import {createRequire} from 'module';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECTS = path.join(ROOT, 'proyectos');
for (const line of fs.existsSync(path.join(ROOT, '.env')) ? fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n') : []) {
  const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\n]*)"?\s*$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
process.env.HYPERFRAMES_NO_TELEMETRY = '1';
const HF = process.env.HYPERFRAMES_BIN || path.join(ROOT, 'node_modules/.bin/hyperframes');
// ffmpeg y ffprobe vienen con «npm install» (ffmpeg-static y ffprobe-static); el .env puede indicar otros.
const req = createRequire(import.meta.url);
const bundled = (name, pick) => { try { const v = pick(req(name)); return v && fs.existsSync(v) ? v : null; } catch { return null; } };
const FFMPEG = process.env.FFMPEG || bundled('ffmpeg-static', (m) => m) || 'ffmpeg';
const FFPROBE = process.env.FFPROBE || bundled('ffprobe-static', (m) => m.path) || 'ffprobe';
// HyperFrames busca ffmpeg y ffprobe en el PATH: sus carpetas van delante.
for (const bin of [FFPROBE, FFMPEG]) if (bin.includes('/')) process.env.PATH = path.dirname(bin) + path.delimiter + process.env.PATH;
const PYTHON = process.env.PYTHON || 'python3';
const {assemble} = await import(path.join(ROOT, 'src/assemble.mjs'));
const {FONTS, SFX, AMBIENCES} = await import(path.join(ROOT, 'src/catalog.mjs'));
const r3 = (x) => Math.round(x * 1000) / 1000;
/** Opciones «--clave=valor» o «--clave» (true). */
const opts = (list) => Object.fromEntries(list.filter((a) => a.startsWith('--')).map((a) => { const [k, ...v] = a.slice(2).split('='); return [k, v.length ? v.join('=') : true]; }));
const strip = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]/g, '');
const die = (msg) => { console.error('✖ ' + msg); process.exit(1); };

/* ------------------------------------------------------------------ proyecto */
function project(name) {
  if (!name) die('Falta el nombre del proyecto.');
  const dir = path.join(PROJECTS, name);
  if (!fs.existsSync(dir)) die(`No existe el proyecto ${name} (crea uno con «genframe nuevo ${name}»).`);
  const read = (f, d = null) => (fs.existsSync(path.join(dir, f)) ? fs.readFileSync(path.join(dir, f), 'utf8') : d);
  const plan = JSON.parse(read('plan.json', '{}'));
  const words = JSON.parse(read('palabras.json', '[]'));
  return {name, dir, plan, words, read, fmt: plan.formato === '9:16' ? '9:16' : '16:9'};
}

/** Frases de la narración con su tramo, a partir de las palabras con tiempos (igual que el motor). */
function sentences(words) {
  const out = [];
  let cur = [];
  for (const w of words) { cur.push(w); if (/[.?!…]["»”)]*$/.test(w.t)) { out.push(cur); cur = []; } }
  if (cur.length) out.push(cur);
  return out.map((ws, i) => ({n: i + 1, text: ws.map((w) => w.t).join(' '), a: ws[0].a, b: ws[ws.length - 1].b}));
}

function duration(p) {
  const last = p.words[p.words.length - 1];
  return r3((p.plan.duracion || (last ? last.b + 1.2 : 5)));
}

/** Escenas con su tramo: cada escena cubre las frases [desde, hasta] (numeradas desde 1, como «genframe frases»). */
function timedScenes(p) {
  const sents = sentences(p.words);
  const total = duration(p);
  const list = (p.plan.escenas || []).map((s) => ({...s}));
  list.forEach((s, i) => {
    const [from] = s.frases || [1, 1];
    s.start = i === 0 ? 0 : r3((sents[from - 1]?.a ?? 0) - 0.15);
    s.text = sents.slice((s.frases?.[0] || 1) - 1, s.frases?.[1] || 1).map((x) => x.text).join(' ');
  });
  list.forEach((s, i) => { s.end = i < list.length - 1 ? list[i + 1].start : total; });
  return list;
}

function pieces(p) {
  const dir = path.join(p.dir, 'piezas');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort().map((f) => {
    const code = fs.readFileSync(path.join(dir, f), 'utf8');
    return {id: f.slice(0, -3), kind: /^\s*\/\/\s*2d\b/i.test(code) ? '2d' : '3d', code};
  });
}

const fontsOf = (art) => Object.fromEntries(Object.entries(art.fonts || {}).map(([k, v]) => [k, FONTS[v] ? v : 'Inter']));

function artOf(p) {
  const a = p.plan.arte || {};
  const palette = a.palette || {bg: '#16202b', bg2: '#0e151d', ink: '#f2efe6', accent: '#e5ad58', accent2: '#c76e5a', soft: '#aabbc0'};
  return {
    palette, fonts: fontsOf({fonts: a.fonts || {title: 'Archivo Black', body: 'Inter', label: 'IBM Plex Mono', hand: 'Caveat'}}), skies: a.skies || {}, look: a.look || 'comic',
    background: {type: a.background?.type === 'gradient' ? 'gradient' : 'solid', from: palette.bg, to: palette.bg2, angle: a.background?.angle, grain: a.background?.grain},
    captions: p.plan.subtitulos === false ? {style: 'ninguno'} : (a.captions || {style: 'sombra'}), vignette: a.vignette ?? 0.2,
  };
}

function job(p, {audio = null} = {}) {
  const scenes = timedScenes(p);
  return {
    duration: duration(p), format: p.fmt, words: p.words, art: artOf(p), models: pieces(p),
    overlay: p.read('capa.js'),
    scenes: scenes.map((s) => ({id: s.id, start: s.start, end: s.end, transition: s.transicion || 'corte', text: s.text, code: p.read(path.join('escenas', s.id + '.js'), '')})),
    ...(audio ? {audio} : {}),
  };
}

async function validate(dir) {
  try {
    const {stdout} = await run(HF, ['validate', '--json', '--no-contrast', '--timeout', '30000', dir], {maxBuffer: 1 << 26});
    return JSON.parse(stdout).errors || [];
  } catch (error) {
    try { return JSON.parse(error.stdout).errors || []; } catch { return [{text: 'validate: ' + error.message}]; }
  }
}

async function snapshots(dir, times, out) {
  fs.rmSync(out, {recursive: true, force: true});
  await run(HF, ['snapshot', '--at', times.map((t) => t.toFixed(2)).join(','), '--no-end', '--describe', 'false', '-o', out, dir], {maxBuffer: 1 << 26});
  return fs.readdirSync(out).filter((f) => /^frame-\d+/.test(f)).sort((a, b) => parseInt(a.slice(6)) - parseInt(b.slice(6))).map((f) => path.join(out, f));
}

/** Brillo medio, «dibujo» por tercios verticales y miniatura (para detectar planos oscuros, vacíos o repetidos). */
async function frameStats(png, fmt) {
  const [w, h] = fmt === '9:16' ? [36, 64] : [64, 36];
  const {stdout: px} = await run(FFMPEG, ['-v', 'error', '-i', png, '-vf', `scale=${w}:${h},format=gray`, '-f', 'rawvideo', '-'], {encoding: 'buffer', maxBuffer: 1 << 20});
  let sum = 0;
  for (const v of px) sum += v;
  const thirds = [0, 0, 0], counts = [0, 0, 0];
  for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) {
    const i = y * w + x, t = Math.min(2, Math.floor((y / h) * 3));
    counts[t]++;
    if (Math.abs(px[i] - px[i + 1]) + Math.abs(px[i] - px[i + w]) > 22) thirds[t]++;
  }
  return {brillo: Math.round(sum / px.length), tercios: thirds.map((c, k) => Math.round((c / counts[k]) * 100)), thumb: px};
}

async function sheet(files, out, cols, width) {
  if (!files.length) return null;
  const tmp = out + '.d';
  fs.rmSync(tmp, {recursive: true, force: true}); fs.mkdirSync(tmp, {recursive: true});
  files.forEach((f, i) => fs.copyFileSync(f, path.join(tmp, String(i).padStart(4, '0') + '.png')));
  const rows = Math.ceil(files.length / cols);
  await run(FFMPEG, ['-v', 'error', '-y', '-framerate', '1', '-i', path.join(tmp, '%04d.png'), '-vf', `scale=${width}:-2,tile=${cols}x${rows}:padding=6:color=white`, '-frames:v', '1', '-q:v', '3', out]);
  fs.rmSync(tmp, {recursive: true, force: true});
  return out;
}

/* ------------------------------------------------------------------ voz (ElevenLabs) */
async function eleven(pathname, body = null) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) die('Falta ELEVENLABS_API_KEY en el .env de genframe.');
  const res = await fetch('https://api.elevenlabs.io/v1' + pathname, {method: body ? 'POST' : 'GET', headers: {'xi-api-key': key, 'Content-Type': 'application/json'}, body: body ? JSON.stringify(body) : undefined});
  const data = await res.json().catch(() => ({}));
  if (!res.ok) die(`ElevenLabs ${res.status}: ${JSON.stringify(data.detail || data).slice(0, 300)}`);
  return data;
}

/** Trozos del guion de hasta ~4.000 caracteres, cortados siempre al final de una frase. */
function chunks(text, max = 4000) {
  const parts = text.replace(/\s+/g, ' ').trim().split(/(?<=[.?!…]["»”)]*)\s+/);
  const out = [];
  let cur = '';
  for (const s of parts) { if (cur && (cur + ' ' + s).length > max) { out.push(cur); cur = s; } else cur = cur ? cur + ' ' + s : s; }
  if (cur) out.push(cur);
  return out;
}

async function voice(p, args) {
  const text = (p.read('guion.txt') || '').trim();
  if (!text) die('guion.txt está vacío.');
  const voiceId = args.voz || p.plan.voz?.id || process.env.ELEVENLABS_VOICE_ID;
  if (!voiceId) die('Falta la voz: «--voz <id>», plan.voz.id o ELEVENLABS_VOICE_ID (lista con «genframe voces»).');
  const model = args.modelo || p.plan.voz?.modelo || process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
  const settings = {stability: 0.45, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true, ...(p.plan.voz?.ajustes || {})};
  const parts = chunks(text);
  const tmp = path.join(p.dir, '.voz');
  fs.rmSync(tmp, {recursive: true, force: true}); fs.mkdirSync(tmp, {recursive: true});
  const words = [];
  let offset = 0;
  let chars = 0;
  for (const [i, part] of parts.entries()) {
    const data = await eleven(`/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps?output_format=mp3_44100_128`, {
      text: part, model_id: model, voice_settings: settings,
      ...(i > 0 ? {previous_text: parts[i - 1].slice(-600)} : {}), ...(i < parts.length - 1 ? {next_text: parts[i + 1].slice(0, 600)} : {}),
    });
    const file = path.join(tmp, `${String(i).padStart(3, '0')}.mp3`);
    fs.writeFileSync(file, Buffer.from(data.audio_base64, 'base64'));
    const al = data.alignment || data.normalized_alignment;
    let cur = null;
    al.characters.forEach((ch, k) => {
      if (/\s/.test(ch)) { if (cur) { words.push(cur); cur = null; } return; }
      const a = r3(al.character_start_times_seconds[k] + offset), b = r3(al.character_end_times_seconds[k] + offset);
      if (!cur) cur = {t: ch, a, b}; else { cur.t += ch; cur.b = b; }
    });
    if (cur) words.push(cur);
    const {stdout} = await run(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
    offset += parseFloat(stdout);
    chars += part.length;
    console.log(`trozo ${i + 1}/${parts.length}: ${part.length} caracteres`);
  }
  const list = path.join(tmp, 'lista.txt');
  fs.writeFileSync(list, fs.readdirSync(tmp).filter((f) => f.endsWith('.mp3')).sort().map((f) => `file '${path.join(tmp, f)}'`).join('\n'));
  await run(FFMPEG, ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c:a', 'libmp3lame', '-b:a', '192k', path.join(p.dir, 'voz.mp3')]);
  fs.writeFileSync(path.join(p.dir, 'palabras.json'), JSON.stringify(words));
  fs.rmSync(tmp, {recursive: true, force: true});
  const price = model.startsWith('eleven_flash') || model.startsWith('eleven_turbo') ? 0.04 : 0.08;
  console.log(`✔ voz.mp3 (${offset.toFixed(1)} s) y palabras.json (${words.length} palabras) · modelo ${model} · ${chars} caracteres ≈ ${(chars / 1000 * price).toFixed(2)} $`);
}

/* ------------------------------------------------------------------ comandos */
const COMMANDS = {
  async nuevo([name, fmt]) {
    if (!name) die('Uso: genframe nuevo <nombre> [16:9|9:16]');
    const dir = path.join(PROJECTS, name);
    if (fs.existsSync(dir)) die('Ya existe ' + dir);
    for (const d of ['piezas', 'escenas']) fs.mkdirSync(path.join(dir, d), {recursive: true});
    fs.writeFileSync(path.join(dir, 'guion.txt'), '');
    fs.writeFileSync(path.join(dir, 'plan.json'), JSON.stringify({formato: fmt === '9:16' ? '9:16' : '16:9', voz: {id: process.env.ELEVENLABS_VOICE_ID || '', modelo: process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2'}, arte: {}, escenas: [], sonido: {musica: {engine: 'orquesta', key: 'D', mode: 'minor', bpm: 76, lead: 'strings', gain: 1}, ambientes: []}}, null, 1));
    console.log('✔ ' + dir);
  },
  async voces() {
    const data = await eleven('/voices');
    for (const v of data.voices || []) console.log(`${v.voice_id}  ${v.name}  ${JSON.stringify(v.labels || {})}`);
  },
  async voz([name, ...rest]) {
    const args = opts(rest);
    await voice(project(name), args);
  },
  async frases([name]) {
    const p = project(name);
    if (!p.words.length) die('Primero «genframe voz ' + name + '».');
    for (const s of sentences(p.words)) console.log(`${s.n}. [${s.a.toFixed(2)}–${s.b.toFixed(2)}] ${s.text}`);
    console.log(`duración ${duration(p)} s`);
  },
  async palabras([name, desde, hasta]) {
    const p = project(name);
    const a = Number(desde || 0), b = Number(hasta || 1e9);
    console.log(p.words.filter((w) => w.a >= a && w.a <= b).map((w) => `${w.a.toFixed(2)} ${w.t}`).join(' | '));
  },
  async montar([name]) {
    const p = project(name);
    const out = path.join(p.dir, 'proyecto');
    assemble(job(p, {audio: fs.existsSync(path.join(p.dir, 'mix.wav')) ? path.join(p.dir, 'mix.wav') : null}), out);
    console.log('✔ ' + out);
    return out;
  },
  async validar([name]) {
    const out = await COMMANDS.montar([name]);
    const errors = await validate(out);
    if (!errors.length) console.log('✔ sin errores');
    for (const e of errors) console.log('✖ ' + (e.text || JSON.stringify(e)));
  },
  /** Fotos de instantes concretos (--en=1.2,3.4), de una escena (--escena=id: tres momentos) o de todas (--todas). */
  async fotos([name, ...rest]) {
    const p = project(name);
    const args = opts(rest);
    const scenes = timedScenes(p);
    let times = [], labels = [];
    if (args.en) { times = args.en.split(',').map(Number); labels = times.map((t) => t.toFixed(1) + ' s'); }
    const pick = args.escena ? scenes.filter((s) => s.id === args.escena) : args.todas ? scenes : [];
    for (const s of pick) for (const f of [0.15, 0.5, 0.88]) { times.push(r3(s.start + (s.end - s.start) * f)); labels.push(`${s.id} ${(s.start + (s.end - s.start) * f).toFixed(1)} s`); }
    if (!times.length) die('Uso: genframe fotos <proyecto> --en=1.2,3.4 | --escena=<id> | --todas');
    const out = await COMMANDS.montar([name]);
    const errors = await validate(out);
    for (const e of errors) console.log('✖ ' + (e.text || JSON.stringify(e)));
    const dir = path.join(p.dir, 'fotos', args.escena || (args.todas ? 'todas' : 'instantes'));
    const files = await snapshots(out, times, dir);
    const thumbs = {};
    for (const [i, f] of files.entries()) {
      const st = await frameStats(f, p.fmt);
      const warn = [st.brillo < 48 ? 'OSCURA' : '', p.fmt === '9:16' && st.tercios[1] < 4 ? 'CENTRO VACÍO' : ''].filter(Boolean).join(' · ');
      const same = Object.entries(thumbs).find(([, th]) => { let d = 0; for (let k = 0; k < th.length; k++) d += Math.abs(th[k] - st.thumb[k]); return d / th.length < 7; });
      thumbs[labels[i]] = st.thumb;
      console.log(`${f}  [${labels[i]}] brillo ${st.brillo} · dibujo por tercios ${st.tercios.join('/')}${warn ? ' · ⚠ ' + warn : ''}${same ? ' · ⚠ igual que ' + same[0] : ''}`);
    }
    const s = await sheet(files, path.join(dir, 'hoja.jpg'), p.fmt === '9:16' ? Math.min(6, files.length) : Math.min(4, files.length), p.fmt === '9:16' ? 300 : 480);
    console.log('hoja: ' + s);
  },
  /** Una pieza sola en la mesa de giro: 4 vistas en un estudio neutro (2D: reposo y primera acción), con su medida real. */
  async mesa([name, id]) {
    const p = project(name);
    const piece = pieces(p).find((x) => x.id === id);
    if (!piece) die(`No existe piezas/${id}.js`);
    const art = artOf(p);
    const studio = {top: '#9fb3c8', mid: '#d5dee8', low: '#eef2f6', fog: '#e3e9ef', sun: '#fff8ee', sunI: 2.6, amb: '#f4f6fb', ambI: 1.5, sea: '#c3cbd3', land: '#c9cfd6', elev: 42, az: 215, haze: 0};
    const code3d = `const w = K.world3d(root, 0, 2, {ground: 'none', sky: ${JSON.stringify(studio)}});
const o = w.add(${JSON.stringify(id)}, {x: 0, z: 0});
const T = w.THREE, b = new T.Box3().setFromObject(o), s = new T.Vector3(), c = new T.Vector3();
b.getSize(s); b.getCenter(c);
if (!(s.x + s.y + s.z > 0.01)) throw new Error('el modelo está vacío');
console.error('MEDIDA ' + [s.x, s.y, s.z, b.min.y].map((v) => v.toFixed(1)).join(' '));
const d = Math.max(s.x, s.y * 1.2, s.z, 20) * 1.9;
const ref = K.forge.box(1.2, 18, 1.2, '#9aa0a6', 9, {outline: 0}); ref.position.set(b.min.x - 10, 0, c.z); w.scene.add(ref);
w.drift(0);
w.shot(0, {x: c.x, z: c.z}, {dist: d, pitch: 10, yaw: 0, h: c.y});
w.shot(0.5, {x: c.x, z: c.z}, {dist: d, pitch: 26, yaw: 42, h: c.y, dur: 0.02});
w.shot(1.0, {x: c.x, z: c.z}, {dist: d, pitch: 8, yaw: 90, h: c.y, dur: 0.02});
w.shot(1.5, {x: c.x, z: c.z}, {dist: d, pitch: 48, yaw: -140, h: c.y, dur: 0.02});
const acts = Object.keys(o.userData.actions || {});
if (acts[0]) w.act(o, acts[0], 1.5, 2.1);`;
    const code2d = `const f = K.figure(${JSON.stringify(id)}, root, K.W / 2, K.H - 60, {size: K.H - 140});
if (f.actions[0]) f.act(f.actions[0], 1, 2.1);`;
    const dir = path.join(p.dir, 'mesa', id);
    const out = path.join(dir, 'proyecto');
    assemble({duration: 2, format: '16:9', words: [], art: {...art, background: {type: 'solid'}, captions: {style: 'ninguno'}, vignette: 0}, models: [piece],
      scenes: [{id: 'mesa', start: 0, end: 2, transition: 'corte', text: '', code: piece.kind === '2d' ? code2d : code3d}]}, out);
    const found = (await validate(out)).map((e) => String(e.text || '').replace(/^Escena mesa: /, ''));
    const measure = found.find((e) => /MEDIDA /.test(e));
    const errors = found.filter((e) => e !== measure);
    if (errors.length) { for (const e of errors) console.log('✖ ' + e); process.exitCode = 1; return; }
    if (measure) { const [w, h, d, base] = measure.replace(/^.*MEDIDA /, '').split(' '); console.log(`medida: ${w} × ${h} × ${d} unidades (ancho × alto × fondo; 10 = 1 m) · base en y = ${base}`); }
    const times = piece.kind === '2d' ? [0.5, 1.6] : [0.3, 0.8, 1.3, 1.85];
    const shots = await snapshots(out, times, path.join(dir, 'fotos'));
    const layout = piece.kind === '2d' ? ['-filter_complex', '[0][1]hstack=inputs=2,scale=1920:-2'] : ['-filter_complex', '[0][1][2][3]xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0,scale=1920:-2'];
    await run(FFMPEG, ['-v', 'error', '-y', ...shots.flatMap((f) => ['-i', f]), ...layout, '-frames:v', '1', '-q:v', '3', path.join(dir, 'vistas.jpg')]);
    console.log('vistas: ' + path.join(dir, 'vistas.jpg') + (piece.kind === '2d' ? ' (reposo · primera acción)' : ' (frente · tres cuartos · lado · atrás y arriba con su primera acción)'));
  },
  async audio([name]) {
    const p = project(name);
    if (!fs.existsSync(path.join(p.dir, 'voz.mp3'))) die('Falta voz.mp3 («genframe voz»).');
    const scenes = timedScenes(p);
    const cue = (word, after) => { const k = strip(word).slice(0, 14); const w = p.words.find((x) => x.a >= after - 0.05 && k && strip(x.t).startsWith(k)); return w ? w.a : null; };
    const sfx = [], amb = [];
    for (const s of scenes) {
      for (const fx of s.sfx || []) { const t = fx.t ?? (fx.palabra ? cue(fx.palabra, s.start) : null); if (t !== null && SFX[fx.name || fx.nombre]) sfx.push({name: fx.name || fx.nombre, t, gain: fx.gain ?? 1}); }
      if (s.ambiente && AMBIENCES.includes(s.ambiente)) amb.push({kind: s.ambiente, from: s.start, to: s.end});
    }
    const music = p.plan.sonido?.musica || {engine: 'ninguna'};
    const third = scenes[Math.floor(scenes.length / 3)]?.start, two = scenes[Math.floor((scenes.length * 2) / 3)]?.start;
    const sound = {duration: duration(p), voice: path.join(p.dir, 'voz.mp3'), music: {...music, build: music.build || [third, two].filter(Boolean)}, sfx, ambience: amb};
    fs.writeFileSync(path.join(p.dir, 'sonido.json'), JSON.stringify(sound, null, 1));
    const {stdout} = await run(PYTHON, [path.join(ROOT, 'src/audio.py'), path.join(p.dir, 'sonido.json'), path.join(p.dir, 'mix.wav')], {maxBuffer: 1 << 24, env: {...process.env, FFMPEG}});
    console.log('✔ mix.wav · ' + stdout.trim());
  },
  async render([name]) {
    const p = project(name);
    const started = Date.now();
    await COMMANDS.audio([name]);
    const out = await COMMANDS.montar([name]);
    const errors = await validate(out);
    for (const e of errors) console.log('✖ ' + (e.text || JSON.stringify(e)));
    const mp4 = path.join(p.dir, name + '.mp4');
    await run(HF, ['render', '--output', mp4, out], {cwd: out, maxBuffer: 1 << 28});
    console.log(`✔ ${mp4} · ${duration(p)} s de vídeo en ${((Date.now() - started) / 1000).toFixed(0)} s`);
  },
};

const [cmd, ...rest] = process.argv.slice(2);
if (!COMMANDS[cmd]) {
  console.log(`genframe <comando>
  nuevo <nombre> [16:9|9:16]   crea proyectos/<nombre>
  voces                        lista las voces de ElevenLabs
  voz <nombre> [--voz=ID] [--modelo=eleven_multilingual_v2]   locuta guion.txt → voz.mp3 + palabras.json
  frases <nombre>              frases numeradas con su tramo (para repartir escenas)
  palabras <nombre> [desde] [hasta]   palabras con su instante
  mesa <nombre> <pieza>        fotos de una pieza en la mesa de giro
  validar <nombre>             monta el proyecto y lista los errores
  fotos <nombre> --en=1.2,3 | --escena=<id> | --todas   capturas para revisar (con brillo, vacío y repetidos)
  audio <nombre>               música, efectos y mezcla a -14 LUFS
  render <nombre>              audio + montaje + MP4 final`);
  process.exit(cmd ? 1 : 0);
}
await COMMANDS[cmd](rest);

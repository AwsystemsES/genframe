#!/usr/bin/env node
/*
 * TurboFrame: estudio de vídeos explicativos generados por código. Claude (con la skill turboframe) escribe la
 * dirección, fabrica las piezas y programa las escenas; esta herramienta pone la voz (ElevenLabs), monta el
 * proyecto HyperFrames, hace fotos para revisar, mezcla el audio y renderiza el MP4.
 *
 * Cada vídeo vive en proyectos/<nombre>/:
 *   guion.txt        el texto que se locuta (una frase termina en . ? ! o …)
 *   plan.json        formato, dirección de arte, escenas (qué frases cubre cada una), sonido
 *   piezas/<id>.js   cuerpo de la función constructora de cada pieza (3D por defecto; «// 2d» en la primera línea para dibujos)
 *   escenas/<id>.js  cuerpo de la función de cada escena (root, T0, T1)
 *   capa.js          (opcional) capa común encima de todo el vídeo
 *   voz.mp3, palabras.json   los genera «turboframe voz»
 */
import fs from 'fs';
import path from 'path';
import {execFile, execFileSync, spawn} from 'child_process';
import {promisify} from 'util';
import {fileURLToPath} from 'url';
import {createRequire} from 'module';
import {unspoken} from '../src/cifras.mjs';
import crypto from 'crypto';
import os from 'os';

const runRaw = promisify(execFile);
// ffmpeg, ffprobe y Python también piden turno (ver withBrowsers): nada pesado del motor corre a la vez que otra cosa pesada.
const run = (cmd, ...a) => ([FFMPEG, PYTHON].includes(cmd) && typeof withBrowsers === 'function' ? withBrowsers(1, () => runRaw(cmd, ...a)) : runRaw(cmd, ...a));
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECTS = path.join(ROOT, 'proyectos');
for (const line of fs.existsSync(path.join(ROOT, '.env')) ? fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n') : []) {
  const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\n]*)"?\s*$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
process.env.HYPERFRAMES_NO_TELEMETRY = '1';
/*
 * Prioridad de fondo: en macOS todo TurboFrame (y lo que lanza: Chrome, ffmpeg, Python) corre en la cola de fondo del
 * sistema, la de las copias de seguridad: usa los núcleos de eficiencia y cede la CPU y el disco a lo que el usuario esté
 * haciendo. Tarda más, pero el ordenador no se nota cargado. TURBOFRAME_PRIORIDAD=normal lo desactiva.
 */
if (process.platform === 'darwin' && !process.env.TURBOFRAME_EN_FONDO && process.env.TURBOFRAME_PRIORIDAD !== 'normal' && fs.existsSync('/usr/sbin/taskpolicy')) {
  const {spawnSync} = await import('child_process');
  const r = spawnSync('/usr/sbin/taskpolicy', ['-b', process.execPath, ...process.argv.slice(1)], {stdio: 'inherit', env: {...process.env, TURBOFRAME_EN_FONDO: '1'}});
  process.exit(r.status ?? 1);
}
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
  // Un nombre es un proyecto de proyectos/; una ruta (con / o que empiece por .) es cualquier carpeta.
  const dir = /[\\/]/.test(name) || name.startsWith('.') ? path.resolve(name) : path.join(PROJECTS, name);
  name = path.basename(dir);
  if (!fs.existsSync(dir)) die(`No existe el proyecto ${name} (crea uno con «turboframe nuevo ${name}»).`);
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

/** Escenas con su tramo: cada escena cubre las frases [desde, hasta] (numeradas desde 1, como «turboframe frases»). */
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
    render: a.render || {},  // ajuste de la imagen final (posprocesado, obturador, película)
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

/*
 * Turno de navegadores, común a todos los procesos del ordenador. Cada «validar», «fotos», «mesa» o «auditar» abre su
 * Chrome con 3D; con varios agentes trabajando a la vez llegaban a ser 8 y el ordenador de 16 GB se colgaba. Ahora cada
 * proceso pide turno antes de abrir Chrome (un fichero por turno en la carpeta temporal, con su pid: si el proceso muere,
 * el turno se libera solo) y espera si están todos ocupados. El render los ocupa todos y tiene prioridad: reserva y las
 * fotos nuevas esperan a que acabe. Por defecto, 2 turnos con 16 GB; TURBOFRAME_NAVEGADORES en el .env lo cambia.
 */
const SLOTS = path.join(os.tmpdir(), 'turboframe-navegadores');
const browserSlots = () => { const gb = os.totalmem() / 2 ** 30; return Math.max(1, Number(process.env.TURBOFRAME_NAVEGADORES) || (gb <= 17 ? 1 : gb <= 33 ? 2 : 3)); };
/** Memoria libre del sistema en %, la misma que da «memory_pressure» (macOS) o MemAvailable (Linux). */
function memFree() {
  try {
    if (process.platform === 'darwin') return Number(execFileSync('/usr/sbin/sysctl', ['-n', 'kern.memorystatus_level'], {encoding: 'utf8'}).trim()) || 100;
    if (process.platform === 'linux') { const m = fs.readFileSync('/proc/meminfo', 'utf8'), v = (k) => Number((new RegExp(k + ':\\s+(\\d+)').exec(m) || [])[1]); return Math.round((v('MemAvailable') / v('MemTotal')) * 100); }
  } catch { /* sin dato */ }
  return 100;
}
const memMin = () => Number(process.env.TURBOFRAME_MEMORIA_MIN) || 12;
/** Presión de memoria de macOS: 1 normal, 2 aviso (amarillo en el Monitor de Actividad), 4 crítica (rojo). */
function memPressure() { try { return process.platform === 'darwin' ? Number(execFileSync('/usr/sbin/sysctl', ['-n', 'kern.memorystatus_vm_pressure_level'], {encoding: 'utf8'}).trim()) || 1 : 1; } catch { return 1; } }
/** ¿Hay memoria para arrancar algo pesado? Con presión crítica nunca; con aviso, solo si queda bastante libre. */
const memOk = () => { const f = memFree(), p = memPressure(); return p < 4 && f >= memMin() && !(p >= 2 && f < memMin() + 6); };
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
let slotsHeld = [];
const releaseSlots = () => { for (const f of slotsHeld) fs.rmSync(f, {force: true}); slotsHeld = []; fs.rmSync(path.join(SLOTS, 'reserva-' + process.pid), {force: true}); };
process.on('exit', releaseSlots);
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => { releaseSlots(); process.exit(130); });
async function withBrowsers(n, fn) {
  if (slotsHeld.length) return fn();  // este proceso ya tiene turno (p. ej. el render que valida y audita dentro)
  const total = browserSlots(), want = Math.min(n, total), exclusive = want >= total;
  fs.mkdirSync(SLOTS, {recursive: true});
  const owner = (f) => { try { return +fs.readFileSync(f, 'utf8'); } catch { return 0; } };
  const sweep = () => { for (const f of fs.readdirSync(SLOTS)) { const full = path.join(SLOTS, f), pid = owner(full); if (!pid || !alive(pid)) fs.rmSync(full, {force: true}); } };
  if (exclusive) fs.writeFileSync(path.join(SLOTS, 'reserva-' + process.pid), String(process.pid));
  let told = false;
  for (;;) {
    sweep();
    const reserved = fs.readdirSync(SLOTS).some((f) => f.startsWith('reserva-') && f !== 'reserva-' + process.pid);
    const mem = memFree(), lowMem = !memOk();
    if ((!reserved || exclusive) && !lowMem) {
      const got = [];
      for (let i = 0; i < total && got.length < want; i++) {
        const f = path.join(SLOTS, 'turno-' + i);
        try { const fd = fs.openSync(f, 'wx'); fs.writeSync(fd, String(process.pid)); fs.closeSync(fd); got.push(f); } catch { /* ocupado */ }
      }
      if (got.length === want) { slotsHeld = got; break; }
      for (const f of got) fs.rmSync(f, {force: true});  // o todos los que hacen falta, o ninguno: así nadie se bloquea a medias
    }
    if (!told || (lowMem && told !== 'mem')) { process.stderr.write(lowMem ? `… esperando memoria: el ordenador va justo (${mem} % libre, presión ${['', 'normal', 'en aviso', '', 'crítica'][memPressure()] || memPressure()}) y TurboFrame no arranca nada pesado así (cierra lo que no uses)\n` : `… esperando turno (${total} trabajo${total > 1 ? 's' : ''} pesado${total > 1 ? 's' : ''} a la vez en este ordenador${reserved ? '; hay un render en marcha' : ''})\n`); told = lowMem ? 'mem' : true; }
    await new Promise((r) => setTimeout(r, 3000));
  }
  try { return await fn(); } finally { releaseSlots(); }
}

async function validate(dir) {
  return withBrowsers(1, () => validateNow(dir));
}
async function validateNow(dir) {
  try {
    const {stdout} = await run(HF, ['validate', '--json', '--no-contrast', '--timeout', '30000', dir], {maxBuffer: 1 << 26});
    return JSON.parse(stdout).errors || [];
  } catch (error) {
    try { return JSON.parse(error.stdout).errors || []; } catch { return [{text: 'validate: ' + error.message}]; }
  }
}

async function snapshots(dir, times, out) {
  fs.rmSync(out, {recursive: true, force: true});
  await withBrowsers(1, () => run(HF, ['snapshot', '--at', times.map((t) => t.toFixed(2)).join(','), '--no-end', '--describe', 'false', '-o', out, dir], {maxBuffer: 1 << 26}));
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
  if (!key) die('Falta ELEVENLABS_API_KEY en el .env de TurboFrame.');
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

/** Tiempos acústicos: lleva a la voz real los bordes de las palabras que lindan con una pausa (ver src/onsets.py). */
async function tune(p) {
  const {stdout} = await run(PYTHON, [path.join(ROOT, 'src/onsets.py'), path.join(p.dir, 'voz.mp3'), path.join(p.dir, 'palabras.json'), FFMPEG], {maxBuffer: 1 << 24});
  console.log('✔ palabras.json · ' + stdout.trim());
}

/**
 * Revisión del MP4 final, fotograma a fotograma: destellos de un solo fotograma (un negro o un blanco colado), tramos en
 * negro y vídeo congelado. Son fallos que solo existen en el MP4 (unión de tramos, un fotograma que no cargó…).
 */
async function checkMp4(mp4, fps = 30) {
  const tmp = mp4 + '.stats';
  await run(FFMPEG, ['-v', 'error', '-i', mp4, '-an', '-vf', `scale=160:-2,format=gray,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=${tmp}`, '-f', 'null', '-'], {maxBuffer: 1 << 24});
  const y = fs.readFileSync(tmp, 'utf8').split('\n').filter((l) => l.includes('YAVG')).map((l) => parseFloat(l.split('=')[1]));
  fs.rmSync(tmp, {force: true});
  const out = [], tc = (i) => `${Math.floor(i / fps / 60)}:${String(Math.floor(i / fps) % 60).padStart(2, '0')}.${String(Math.round(((i / fps) % 1) * 100)).padStart(2, '0')}`;
  // Destello: un fotograma (o dos) muy distinto de sus vecinos, que a su vez se parecen entre sí. Un corte no lo es (no vuelve).
  for (let i = 1; i + 2 < y.length; i++) {
    for (const w of [1, 2]) {
      const a = y[i - 1], b = y[i + w], mid = y.slice(i, i + w);
      if (Math.abs(a - b) < 6 && mid.every((m) => Math.abs(m - a) > 28)) { out.push(`destello de ${w} fotograma${w > 1 ? 's' : ''} en ${tc(i)} (brillo ${a.toFixed(0)} → ${mid[0].toFixed(0)} → ${b.toFixed(0)})`); i += w; break; }
    }
  }
  // Negro: más de medio segundo seguido casi negro.
  let k0 = null;
  for (let i = 0; i <= y.length; i++) { const dark = i < y.length && y[i] < 8; if (dark && k0 === null) k0 = i; if (!dark && k0 !== null) { if (i - k0 > fps / 2) out.push(`${((i - k0) / fps).toFixed(1)} s en negro desde ${tc(k0)}`); k0 = null; } }
  // Congelado: freezedetect de ffmpeg (más de 3 s sin un solo cambio de imagen).
  try {
    const {stderr} = await run(FFMPEG, ['-v', 'info', '-i', mp4, '-an', '-vf', 'scale=320:-2,freezedetect=n=0.0015:d=3', '-f', 'null', '-'], {maxBuffer: 1 << 26});
    for (const m of stderr.matchAll(/freeze_start: ([\d.]+)[\s\S]*?freeze_duration: ([\d.]+)/g)) out.push(`congelado ${(+m[2]).toFixed(1)} s desde ${tc(+m[1] * fps)}`);
  } catch (e) { /* sin freezedetect, sin esa comprobación */ }
  return {frames: y.length, out};
}

async function voice(p, args) {
  const text = (p.read('guion.txt') || '').trim();
  if (!text) die('guion.txt está vacío.');
  const voiceId = args.voz || p.plan.voz?.id || process.env.ELEVENLABS_VOICE_ID;
  if (!voiceId) die('Falta la voz: «--voz <id>», plan.voz.id o ELEVENLABS_VOICE_ID (lista con «turboframe voces»).');
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
  fs.rmSync(path.join(p.dir, 'palabras.eleven.json'), {force: true});  // voz nueva: los tiempos de ElevenLabs de ahora son los buenos
  await tune(p);
  const price = model.startsWith('eleven_flash') || model.startsWith('eleven_turbo') ? 0.04 : 0.08;
  console.log(`✔ voz.mp3 (${offset.toFixed(1)} s) y palabras.json (${words.length} palabras) · modelo ${model} · ${chars} caracteres ≈ ${(chars / 1000 * price).toFixed(2)} $`);
}

/* ------------------------------------------------------------------ auditoría */
function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const base = path.join(process.env.HOME || '', '.cache/hyperframes/chrome');
  const stack = [base];
  while (stack.length) {
    const d = stack.pop();
    let list = [];
    try { list = fs.readdirSync(d, {withFileTypes: true}); } catch { continue; }
    for (const e of list) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) stack.push(f);
      else if (/^chrome(-headless-shell)?(\.exe)?$/.test(e.name)) return f;
    }
  }
  die('No encuentro el Chrome de HyperFrames: ejecuta «npx hyperframes browser ensure» o pon CHROME en el .env.');
}

/**
 * Recorre el vídeo montado cada `paso` segundos en el Chrome de HyperFrames y junta:
 *  - lo que dice el motor 3D (piezas que se atraviesan, cámara en el agua o dentro de algo, olas que tapan, pies que patinan…),
 *  - lo que dicen los textos (cortados, fuera de la zona segura, en la franja de subtítulos, solapados),
 *  - lo que dicen los píxeles (tramos casi quietos y fotogramas oscuros).
 * Devuelve {graves, avisos, issues} y deja auditoria.json en el proyecto.
 */
async function auditProject(...a) { return withBrowsers(1, () => auditProjectNow(...a)); }
async function auditProjectNow(p, out, {paso = 0.25, silencio = false} = {}) {
  const puppeteer = req('puppeteer-core');
  const fmtW = p.fmt === '9:16' ? 1080 : 1920, fmtH = p.fmt === '9:16' ? 1920 : 1080;
  const browser = await puppeteer.launch({executablePath: findChrome(), headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', ...(process.platform === 'darwin' ? ['--use-angle=metal'] : []), '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required']});
  const shots = path.join(p.dir, 'auditoria');
  fs.rmSync(shots, {recursive: true, force: true}); fs.mkdirSync(shots, {recursive: true});
  const issues = [], seen = new Map();
  try {
    const page = await browser.newPage();
    await page.setViewport({width: fmtW, height: fmtH, deviceScaleFactor: 0.25});
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    // La auditoría mide física, cámara y textos: dibuja sin posprocesado para ir rápido.
    await page.evaluateOnNewDocument(() => { window.__gfCalidad = 'borrador'; });
    await page.goto('file://' + path.join(out, 'index.html'), {waitUntil: 'load', timeout: 120000});
    await page.evaluate(() => (document.fonts ? document.fonts.ready.then(() => true) : true));
    await page.evaluate(() => {
      window.__gfSeek = (t) => {
        document.querySelectorAll('#root > [data-start]').forEach((el) => { const a = +el.dataset.start, d = +(el.dataset.duration || 1e9); el.style.display = t >= a && t < a + d ? '' : 'none'; });
        for (const tl of window.__hfAnime || []) tl.seek(t * 1000);
        window.dispatchEvent(new CustomEvent('hf-seek', {detail: {time: t}}));
      };
    });
    const dur = duration(p);
    const times = [];
    for (let t = 0; t < dur - 0.05; t += paso) times.push(r3(t));
    for (const [i, t] of times.entries()) {
      const found = await page.evaluate((tt) => {
        __gfSeek(tt);
        const res = [];
        const top = [...document.querySelectorAll('#root > section.scene')].filter((s) => s.style.display !== 'none').map((s) => s.id.replace('sc-', ''));
        for (const w of (window.K && K._worlds) || []) {
          const sec = w.root.closest('section');
          if (tt < w.T0 || tt > w.T1 || !sec || sec.style.display === 'none') continue;
          try { for (const q of w.W.audit(tt)) res.push({...q, escena: sec.id.replace('sc-', '')}); } catch (e) { res.push({tipo: 'error', grave: true, texto: 'auditoría 3D: ' + e.message, escena: sec.id.replace('sc-', '')}); }
        }
        try { for (const q of K.auditDom()) res.push({...q, escena: top[top.length - 1] || '?'}); } catch (e) { res.push({tipo: 'error', grave: false, texto: 'auditoría de textos: ' + e.message, escena: '?'}); }
        // Capas: ninguna escena visible puede quedar por encima de la viñeta, la capa común o los subtítulos.
        { const z = (el) => +getComputedStyle(el).zIndex || 0, vis = (el) => el && el.style.display !== 'none';
          const fixed = [['la viñeta', document.getElementById('fx')], ['la capa común', document.getElementById('overlay')], ...[...document.querySelectorAll('#root > .cap')].filter(vis).map((c) => ['los subtítulos', c])].filter(([, el]) => vis(el));
          const scenesZ = [...document.querySelectorAll('#root > section.scene')].filter(vis);
          for (const [name, el] of fixed) { const over = scenesZ.find((sc) => z(sc) >= z(el)); if (over) res.push({tipo: 'capas', grave: true, texto: `la escena tapa ${name} (orden de apilado)`, escena: over.id.replace('sc-', '')}); } }
        // Textos a la vista (sin subtítulos): sus cifras se contrastan con el guion.
        const textos = [...document.querySelectorAll('#root > section.scene, #overlay')].filter((s) => s.style.display !== 'none').map((s) => [s.id.replace('sc-', ''), s.innerText || '']).filter(([, x]) => /\d\d/.test(x));
        return {res, textos};
      }, t);
      for (const q of found.res) issues.push({...q, t});
      for (const [esc, x] of found.textos) for (const l of x.split('\n')) if (/\d\d/.test(l)) { const k = esc + '|' + l; if (!seen.has(k)) seen.set(k, {escena: esc, texto: l, t}); }
      await page.screenshot({path: path.join(shots, `f${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 60});
      if (!silencio && i % 40 === 0) process.stdout.write(`  auditando ${t.toFixed(1)} / ${dur.toFixed(1)} s\r`);
    }
    for (const e of errs) issues.push({tipo: 'error', grave: true, texto: 'error en la página: ' + e, t: 0, escena: '?'});
    // Verdad en pantalla: toda cifra que se ve (textos y rótulos 3D) tiene que decirla el guion.
    const guion = p.read('guion.txt', '');
    if (guion.trim()) {
      for (const x of await page.evaluate(() => [...((window.K && K._textos3d) || [])])) if (/\d\d/.test(x) && !seen.has('3d|' + x)) seen.set('3d|' + x, {escena: 'rótulo 3D', texto: x, t: 0});
      const miss = [...seen.values()].flatMap((v) => unspoken([v.texto], guion).map(({tok}) => ({...v, tok, n: Number(tok.replace(/,/g, ''))})));
      // Las marcas de un eje o una escala (200, 400, 600 FT) no son datos: tres o más a paso fijo en una escena no avisan.
      const ticks = new Set();
      for (const esc of new Set(miss.map((x) => x.escena))) {
        const ns = [...new Set(miss.filter((x) => x.escena === esc && Number.isFinite(x.n)).map((x) => x.n))].sort((a, b) => a - b);
        for (let k = 0; k + 2 < ns.length; k++) if (Math.abs(ns[k + 1] - ns[k] - (ns[k + 2] - ns[k + 1])) < 1e-9) [ns[k], ns[k + 1], ns[k + 2]].forEach((n) => ticks.add(esc + '|' + n));
      }
      for (const x of miss) if (!ticks.has(x.escena + '|' + x.n)) issues.push({tipo: 'cifra', grave: false, texto: `la cifra «${x.tok}» («${x.texto.trim().slice(0, 50)}») no está en el guion: compruébala`, t: x.t, escena: x.escena});
    }
  } finally { await browser.close(); }
  // Píxeles: brillo de cada muestra y diferencia con la anterior.
  const stats = path.join(shots, 'stats.txt');
  const sc = p.fmt === '9:16' ? '270:480' : '480:270';
  const seq = ['-v', 'error', '-framerate', String(1 / paso), '-i', path.join(shots, 'f%05d.jpg')];
  try {
    await run(FFMPEG, [...seq, '-vf', `scale=${sc},format=gray,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=${stats}.luma`, '-f', 'null', '-']);
    await run(FFMPEG, [...seq, '-vf', `scale=${sc},format=gray,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=${stats}.diff`, '-f', 'null', '-']);
  } catch (e) { console.warn('⚠ no se pudo medir el brillo y el movimiento: ' + e.message.split('\n')[0]); }
  const vals = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.includes('YAVG')).map((l) => parseFloat(l.split('=')[1])) : []);
  const luma = vals(stats + '.luma'), diff = vals(stats + '.diff');
  const scenes = timedScenes(p), sceneAt = (t) => (scenes.filter((s) => s.start <= t + 1e-6).pop() || {id: '?'}).id;
  const stillThr = 2.0 * Math.sqrt(paso / 0.5);
  let run0 = null;
  for (let i = 1; i <= diff.length; i++) {
    const still = i < diff.length && diff[i] < stillThr && sceneAt((i - 1) * paso) === sceneAt(i * paso);
    if (still && run0 === null) run0 = i - 1;
    if (!still && run0 !== null) { if ((i - 1 - run0) * paso >= 2) issues.push({tipo: 'quieto', grave: false, texto: `${((i - 1 - run0) * paso).toFixed(1)} s casi quieto: añade movimiento (cámara, partículas, acción)`, t: r3(run0 * paso), escena: sceneAt(run0 * paso)}); run0 = null; }
  }
  luma.forEach((v, i) => { if (v < 40) issues.push({tipo: 'oscuro', grave: false, texto: `fotograma oscuro (brillo ${v.toFixed(0)}): sube la exposición o aclara la paleta`, t: r3(i * paso), escena: sceneAt(i * paso)}); });
  // Agrupa lo repetido en tramos.
  const groups = new Map();
  for (const q of issues) { const k = q.escena + '|' + q.tipo + '|' + (q.tipo === 'cifra' ? q.texto : q.texto.replace(/\d+([.,]\d+)?/g, '#')); if (!groups.has(k)) groups.set(k, {...q, desde: q.t, hasta: q.t, n: 0}); const g = groups.get(k); g.desde = Math.min(g.desde, q.t); g.hasta = Math.max(g.hasta, q.t); g.n++; g.grave = g.grave || q.grave; }
  const list = [...groups.values()].sort((a, b) => a.desde - b.desde);
  // Un choque o un problema de cámara de un solo instante suelto es grave igual; un aviso suelto de texto en una transición, no.
  // Lo de un solo instante en los textos suele ser una transición (dos rótulos que se cruzan): no cuenta.
  const kept = list.filter((g) => !(g.tipo === 'texto' && g.n === 1));
  const graves = kept.filter((g) => g.grave), avisos = kept.filter((g) => !g.grave);
  fs.writeFileSync(path.join(p.dir, 'auditoria.json'), JSON.stringify({paso, graves, avisos}, null, 1));
  if (!silencio) {
    process.stdout.write(' '.repeat(40) + '\r');
    for (const g of graves) console.log(`✖ ${g.escena} ${g.desde.toFixed(2)}–${g.hasta.toFixed(2)} s · ${g.texto}`);
    for (const g of avisos) console.log(`⚠ ${g.escena} ${g.desde.toFixed(2)}–${g.hasta.toFixed(2)} s · ${g.texto}`);
    console.log(graves.length || avisos.length ? `auditoría: ${graves.length} graves, ${avisos.length} avisos (auditoria.json; fotos en auditoria/)` : '✔ auditoría sin problemas');
  }
  return {graves, avisos};
}

/* ------------------------------------------------------------------ render */
/*
 * Cuántos navegadores renderizan a la vez. Cada uno es un Chrome con WebGL y posprocesado: en un Mac de 16 GB, los
 * ~6 que abre HyperFrames por su cuenta se comen la memoria y congelan todo lo demás (Claude incluido). Con 2, el
 * render usa la mitad de memoria y tarda un 13 % más (medido el 25-10). Se elige por la RAM total; --workers=N o
 * TURBOFRAME_WORKERS en el .env lo fijan a mano.
 */
function renderWorkers(pedido = null) {
  const v = pedido || process.env.TURBOFRAME_WORKERS;
  if (v) return String(v);
  const gb = os.totalmem() / 2 ** 30;
  return String(gb <= 17 ? 1 : gb <= 33 ? 2 : Math.min(6, Math.max(3, Math.floor(os.cpus().length / 4))));
}
/** Render de HyperFrames con prioridad baja (el Mac sigue respondiendo) y los navegadores justos. */
function renderHF(rest, {cwd, workers = null}) {
  const argv = [HF, 'render', '--workers', renderWorkers(workers), ...rest];
  return process.platform === 'win32' ? run(argv[0], argv.slice(1), {cwd, maxBuffer: 1 << 28}) : run('nice', ['-n', '10', ...argv], {cwd, maxBuffer: 1 << 28});
}

/* ------------------------------------------------------------------ render de noche */
/*
 * El render es lo único que se come el ordenador. De día, Claude prepara el vídeo (guion, voz, piezas, escenas, fotos) y lo
 * deja en la cola; de noche, «noche» renderiza la cola sin que nadie esté usando el ordenador. La cola vive en
 * proyectos/.cola.json (las actualizaciones nunca tocan proyectos/).
 */
const QUEUE = path.join(PROJECTS, '.cola.json');
const readQueue = () => { try { return JSON.parse(fs.readFileSync(QUEUE, 'utf8')); } catch { return []; } };
const writeQueue = (q) => { fs.mkdirSync(PROJECTS, {recursive: true}); fs.writeFileSync(QUEUE, JSON.stringify(q, null, 1)); };
const stamp = () => new Date().toLocaleString('es-ES', {dateStyle: 'short', timeStyle: 'short'});
/** De noche nadie usa el ordenador: más navegadores que de día (3 con 16 GB), salvo TURBOFRAME_WORKERS_NOCHE. */
const nightWorkers = () => process.env.TURBOFRAME_WORKERS_NOCHE || String(os.totalmem() / 2 ** 30 <= 17 ? 2 : Math.max(3, Number(renderWorkers()) * 2));
const notify = (title, text) => { if (process.platform === 'darwin') execFile('osascript', ['-e', `display notification ${JSON.stringify(text)} with title ${JSON.stringify(title)}`], () => {}); };
const LAUNCH_LABEL = 'ai.turboframe.noche';
const launchPlist = () => path.join(os.homedir(), 'Library', 'LaunchAgents', LAUNCH_LABEL + '.plist');

/* ------------------------------------------------------------------ versión e instalación */
const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
const semver = (v) => String(v).split('.').map((n) => parseInt(n, 10) || 0);
const newer = (a, b) => { const x = semver(a), y = semver(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };
/** Novedades de CAMBIOS.md (en el paquete, en la raíz; en el repositorio de desarrollo, en producto/): [{version, titulo, texto}]. */
function changelog() {
  const f = [path.join(ROOT, 'CAMBIOS.md'), path.join(ROOT, 'producto', 'CAMBIOS.md')].find((x) => fs.existsSync(x));
  if (!f) return [];
  return fs.readFileSync(f, 'utf8').split(/^## /m).slice(1).map((b) => { const [titulo, ...rest] = b.split('\n'); return {version: titulo.split(/\s/)[0], titulo: titulo.trim(), texto: rest.join('\n').trim()}; });
}

/** Comprobación de la instalación: qué falta y cómo arreglarlo, sin gastar nada ni enseñar claves. */
async function doctor() {
  const res = [];
  const ok = (t) => res.push(['✔', t]), warn = (t, fix) => res.push(['⚠', t, fix]), bad = (t, fix) => res.push(['✖', t, fix]);
  const major = parseInt(process.versions.node, 10);
  if (major >= 20) ok(`Node ${process.versions.node}`); else bad(`Node ${process.versions.node}: hace falta la 20 o superior`, 'instala la versión LTS desde nodejs.org');
  if (fs.existsSync(HF)) ok('dependencias instaladas'); else bad('faltan las dependencias', 'ejecuta «npm install» en esta carpeta');
  if (fs.existsSync(path.join(ROOT, 'dist', 'three.js'))) ok('Three.js empaquetado'); else bad('falta dist/three.js', 'ejecuta «npm run build»');
  try { await run(FFMPEG, ['-version']); ok('ffmpeg'); } catch { bad('ffmpeg no arranca', 'ejecuta «npm install» o pon FFMPEG= en el .env'); }
  let chrome = null;
  try { chrome = findChrome(); } catch { /* sin Chrome */ }
  if (chrome && fs.existsSync(chrome)) ok('Chrome de render'); else bad('no encuentro el Chrome de render', 'ejecuta «npx hyperframes browser ensure» o pon CHROME= en el .env');
  try { await run(PYTHON, ['-c', 'import numpy']); ok(`Python con numpy (${PYTHON})`); } catch { bad(`Python con numpy (${PYTHON}) no funciona`, 'python3 -m pip install --user numpy, o un entorno virtual con PYTHON= en el .env'); }
  if (!fs.existsSync(path.join(ROOT, '.env'))) bad('falta el fichero .env', 'cópialo de .env.example y pon tu clave de ElevenLabs');
  else {
    if (process.env.ELEVENLABS_API_KEY) ok('clave de ElevenLabs puesta (no se comprueba ni se enseña)'); else bad('ELEVENLABS_API_KEY está vacía en el .env', 'pon tu clave de ElevenLabs en el .env');
    if (process.env.ELEVENLABS_VOICE_ID) ok('voz por defecto puesta'); else warn('ELEVENLABS_VOICE_ID está vacía', 'pon el Voice ID en el .env (o una voz en cada plan.json)');
  }
  const skill = path.join(os.homedir(), '.claude', 'skills', 'turboframe');
  if (fs.existsSync(skill)) ok('skill TurboFrame disponible en Claude Code'); else warn('la skill solo funciona abriendo Claude Code en esta carpeta', 'ejecuta «npm run instalar-skill» para tenerla en cualquier sesión');
  ok(`${(os.totalmem() / 2 ** 30).toFixed(0)} GB de RAM: render con ${renderWorkers()} navegador${renderWorkers() === '1' ? '' : 'es'} a la vez`);
  ok(`navegadores a la vez entre todos los procesos (fotos, mesa, validar, auditar): ${browserSlots()}`);
  ok(`agentes en paralelo: ${Math.max(1, Number(process.env.TURBOFRAME_AGENTES) || (os.totalmem() / 2 ** 30 <= 17 ? 1 : 2))}`);
  ok(`memoria libre ahora: ${memFree()} %, presión ${['', 'normal', 'en aviso', '', 'crítica'][memPressure()] || memPressure()} (nada pesado arranca con presión crítica o por debajo del ${memMin()} %) · prioridad ${process.env.TURBOFRAME_EN_FONDO ? 'de fondo' : 'normal'}`);
  try { const st = fs.statfsSync(ROOT), gb = (st.bavail * st.bsize) / 1e9; if (gb >= 2) ok(`${gb.toFixed(0)} GB libres`); else warn(`solo ${gb.toFixed(1)} GB libres`, 'deja al menos 2 GB para renders'); } catch { /* sin statfs */ }
  // Montaje de prueba: un proyecto vacío montado y validado en el navegador de render.
  if (!res.some(([s]) => s === '✖')) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'turboframe-comprobacion-'));
    try {
      for (const d of ['piezas', 'escenas']) fs.mkdirSync(path.join(tmp, d));
      fs.writeFileSync(path.join(tmp, 'guion.txt'), '');
      fs.writeFileSync(path.join(tmp, 'plan.json'), JSON.stringify({formato: '16:9', arte: {}, escenas: []}));
      const out = path.join(tmp, 'proyecto');
      assemble(job(project(tmp)), out);
      const errors = await validate(out);
      if (!errors.length) ok('montaje de prueba en el navegador de render'); else bad('el montaje de prueba falla: ' + (errors[0].text || JSON.stringify(errors[0])).slice(0, 120), 'revisa los pasos anteriores o reinstala con «npm install»');
    } catch (e) { bad('el montaje de prueba falla: ' + e.message.split('\n')[0], 'reinstala con «npm install»'); } finally { fs.rmSync(tmp, {recursive: true, force: true}); }
  }
  return res;
}

/* ------------------------------------------------------------------ comandos */
const COMMANDS = {
  async comprobar() {
    console.log(`TurboFrame ${VERSION} · comprobando la instalación…`);
    const res = await doctor();
    for (const [s, t, fix] of res) console.log(`${s} ${t}${fix ? ` → ${fix}` : ''}`);
    const n = res.filter(([s]) => s === '✖').length;
    console.log(n ? `✖ ${n} problema${n > 1 ? 's' : ''}: arréglalo${n > 1 ? 's' : ''} y vuelve a comprobar` : '✔ todo listo');
    if (n) process.exitCode = 1;
  },
  async version() {
    const last = changelog()[0];
    console.log(`TurboFrame ${VERSION}` + (last && last.version !== VERSION ? ` (última en CAMBIOS.md: ${last.titulo})` : ''));
  },
  /** Actualiza a la última versión publicada: git pull, npm install y las novedades desde la versión que había. */
  async actualizar() {
    if (!fs.existsSync(path.join(ROOT, '.git'))) die('Esta copia no se instaló con git: descarga la versión nueva y copia tu carpeta proyectos/ y tu .env.');
    // npm puede reescribir package-lock.json en cada ordenador: no es un cambio del cliente y no debe bloquear.
    try { await run('git', ['checkout', '--', 'package-lock.json'], {cwd: ROOT}); } catch { /* sin lock */ }
    const {stdout: dirty} = await run('git', ['status', '--porcelain', '--untracked-files=no'], {cwd: ROOT});
    if (dirty.trim()) die('Hay cambios en el motor de TurboFrame (' + dirty.split('\n').filter((l) => l.trim()).map((l) => l.slice(3)).slice(0, 4).join(', ') + '): las actualizaciones lo sustituyen. Deshazlos con «git checkout -- .» (tus proyectos no se tocan) o pide ayuda al soporte de TurboFrame.');
    const before = VERSION;
    console.log(`TurboFrame ${before} · buscando la versión nueva…`);
    try { await run('git', ['pull', '--ff-only'], {cwd: ROOT}); } catch (e) { die('No se pudo descargar: ' + (e.stderr || e.message).trim().split('\n')[0] + '. ¿Sigue activa tu suscripción y tu acceso a GitHub?'); }
    const after = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
    if (after === before) { console.log('✔ ya tienes la última versión'); return; }
    console.log('instalando dependencias…');
    await run('npm', ['install'], {cwd: ROOT, maxBuffer: 1 << 26});
    console.log(`✔ actualizado de ${before} a ${after}. Novedades:\n`);
    for (const c of changelog().filter((c) => newer(c.version, before))) console.log(`## ${c.titulo}\n${c.texto}\n`);
  },
  /** Deja un proyecto preparado en la cola del render de noche. */
  async encolar([name]) {
    const p = project(name);
    if (!fs.existsSync(path.join(p.dir, 'voz.mp3'))) die('Ese proyecto aún no tiene voz («turboframe voz»): no se puede renderizar.');
    const q = readQueue().filter((e) => e.dir !== p.dir || e.estado !== 'pendiente');
    q.push({dir: p.dir, nombre: path.basename(p.dir), estado: 'pendiente', encolado: stamp()});
    writeQueue(q);
    const pend = q.filter((e) => e.estado === 'pendiente').length;
    const hora = fs.existsSync(launchPlist()) ? (/<key>Hour<\/key>\s*<integer>(\d+)<\/integer>\s*<key>Minute<\/key>\s*<integer>(\d+)/.exec(fs.readFileSync(launchPlist(), 'utf8')) || []).slice(1).map((x) => x.padStart(2, '0')).join(':') : '';
    console.log(`✔ ${path.basename(p.dir)} en la cola (${pend} pendiente${pend > 1 ? 's' : ''}). ` + (hora ? `Se renderiza esta noche a las ${hora}.` : 'No hay hora programada: «turboframe programar --hora=03:00», o «turboframe noche» para lanzarla ya.'));
  },
  /** Cola del render de noche: pendientes y resultados. --quitar=<nombre> saca un pendiente; --limpiar borra los terminados. */
  async cola([...rest]) {
    const args = opts(rest);
    let q = readQueue();
    if (args.quitar) { q = q.filter((e) => !(e.nombre === args.quitar && e.estado === 'pendiente')); writeQueue(q); }
    if (args.limpiar) { q = q.filter((e) => e.estado === 'pendiente'); writeQueue(q); }
    if (!q.length) return console.log('La cola está vacía.');
    for (const e of q) console.log(`${e.estado === 'pendiente' ? '·' : e.estado === 'hecho' ? '✔' : e.estado === 'avisos' ? '⚠' : '✖'} ${e.nombre} · ${e.estado}` + (e.fin ? ` · ${e.fin}` : ` · encolado ${e.encolado}`) + (e.nota ? ` · ${e.nota}` : ''));
  },
  /**
   * Renderiza la cola, uno tras otro, sin dejar dormir al ordenador. Cada render va en su propio proceso (si uno falla, los
   * demás siguen) con registro en proyectos/<nombre>/render-noche.log. Si la auditoría encuentra problemas graves, renderiza
   * igualmente y lo anota: por la mañana hay vídeo y la lista de lo que arreglar.
   */
  async noche() {
    const q = readQueue(), pend = q.filter((e) => e.estado === 'pendiente');
    if (!pend.length) return console.log(`${stamp()} · cola vacía, nada que renderizar`);
    // caffeinate impide que el ordenador se duerma mientras dure este proceso.
    if (process.platform === 'darwin') spawn('caffeinate', ['-i', '-s', '-w', String(process.pid)], {stdio: 'ignore', detached: true}).unref();
    const workers = nightWorkers();
    console.log(`${stamp()} · render de noche: ${pend.length} vídeo${pend.length > 1 ? 's' : ''} con ${workers} navegadores`);
    const done = [];
    for (const e of pend) {
      e.estado = 'renderizando'; e.inicio = stamp(); writeQueue(q);
      const log = path.join(e.dir, 'render-noche.log'), fd = fs.openSync(log, 'w'), t0 = Date.now();
      const code = await new Promise((res) => spawn(process.execPath, [fileURLToPath(import.meta.url), 'render', e.dir, '--forzar', `--workers=${workers}`], {cwd: ROOT, stdio: ['ignore', fd, fd]}).on('close', res));
      fs.closeSync(fd);
      const txt = fs.readFileSync(log, 'utf8'), mins = ((Date.now() - t0) / 60000).toFixed(0);
      const graves = (/La auditoría encuentra (\d+)|auditoría: (\d+) graves/.exec(txt) || []).slice(1).find(Boolean);
      e.fin = stamp();
      if (code === 0 && /✔ .*\.mp4/.test(txt)) { e.estado = graves && graves !== '0' ? 'avisos' : 'hecho'; e.nota = `${mins} min` + (graves && graves !== '0' ? ` · ${graves} problemas graves en la auditoría (ver render-noche.log)` : ''); }
      else { e.estado = 'fallo'; e.nota = `${mins} min · ` + (txt.trim().split('\n').filter((l) => l.startsWith('✖')).pop() || txt.trim().split('\n').pop() || 'sin salida').slice(0, 160); }
      writeQueue(q);
      console.log(`${e.fin} · ${e.nombre}: ${e.estado} · ${e.nota}`);
      done.push(`${e.nombre}: ${e.estado}`);
    }
    notify('TurboFrame · render de noche', done.join(' · '));
  },
  /** Programa el render de noche a una hora fija (macOS, launchd). --quitar lo desprograma. */
  async programar([...rest]) {
    const args = opts(rest);
    const plist = launchPlist(), uid = process.getuid ? process.getuid() : 0;
    const unload = () => { try { execFileSync('launchctl', ['bootout', `gui/${uid}`, plist], {stdio: 'ignore'}); } catch { /* no estaba cargado */ } };
    if (process.platform !== 'darwin') die(`Programar solo está hecho para macOS. En Linux, añade a «crontab -e»: «0 3 * * * cd ${ROOT} && ${process.execPath} bin/turboframe.mjs noche >> noche.log 2>&1».`);
    if (args.quitar) { unload(); fs.rmSync(plist, {force: true}); return console.log('✔ render de noche desprogramado'); }
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(args.hora || ''));
    if (!m || +m[1] > 23 || +m[2] > 59) die('Uso: turboframe programar --hora=03:00 (o --quitar)');
    const logf = path.join(os.homedir(), 'Library', 'Logs', 'turboframe-noche.log');
    const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    fs.mkdirSync(path.dirname(plist), {recursive: true});
    fs.writeFileSync(plist, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>${LAUNCH_LABEL}</string>
  <key>ProgramArguments</key><array><string>${esc(process.execPath)}</string><string>${esc(fileURLToPath(import.meta.url))}</string><string>noche</string></array>
  <key>WorkingDirectory</key><string>${esc(ROOT)}</string>
  <key>EnvironmentVariables</key><dict><key>PATH</key><string>${esc(path.dirname(process.execPath))}:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string></dict>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>${+m[1]}</integer><key>Minute</key><integer>${+m[2]}</integer></dict>
  <key>StandardOutPath</key><string>${esc(logf)}</string><key>StandardErrorPath</key><string>${esc(logf)}</string>
</dict></plist>
`);
    unload();
    execFileSync('launchctl', ['bootstrap', `gui/${uid}`, plist]);
    const hh = m[1].padStart(2, '0') + ':' + m[2];
    console.log(`✔ render de noche programado cada día a las ${hh} (registro en ${logf}).`);
    console.log('  El ordenador tiene que estar encendido a esa hora. Si suele estar dormido, que se despierte solo: en una terminal,');
    const w = new Date(2000, 0, 1, +m[1], +m[2] - 5);
    console.log(`  sudo pmset repeat wakeorpoweron MTWRFSU ${String(w.getHours()).padStart(2, '0')}:${String(w.getMinutes()).padStart(2, '0')}:00`);
  },
  async nuevo([name, fmt]) {
    if (!name) die('Uso: turboframe nuevo <nombre> [16:9|9:16]');
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
  async afinar([name]) {
    const p = project(name);
    if (!fs.existsSync(path.join(p.dir, 'voz.mp3'))) die('Falta voz.mp3 («turboframe voz»).');
    await tune(p);
  },
  async revisar([name]) {
    const p = project(name);
    const mp4 = path.join(p.dir, path.basename(p.dir) + '.mp4');
    if (!fs.existsSync(mp4)) die('Falta ' + mp4 + ' («turboframe render»).');
    const rev = await checkMp4(mp4);
    for (const x of rev.out) console.log('⚠ ' + x);
    console.log(rev.out.length ? `${rev.out.length} avisos en ${rev.frames} fotogramas` : `✔ ${rev.frames} fotogramas sin destellos, negros ni congelados`);
  },
  async frases([name]) {
    const p = project(name);
    if (!p.words.length) die('Primero «turboframe voz ' + name + '».');
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
    if (!times.length) die('Uso: turboframe fotos <proyecto> --en=1.2,3.4 | --escena=<id> | --todas');
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
    const code3d = `const w = K.world3d(root, 0, 2, {ground: 'none', manchas: false, sky: ${JSON.stringify(studio)}});
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
if (acts[0]) w.act(o, acts[0], 1.5, 2.1);
const avisos = new Set(); o.traverse((n) => { if (n.userData && n.userData.letreroAviso) avisos.add(n.userData.letreroAviso); }); for (const a of avisos) console.error('AVISO ' + a);`;
    const code2d = `const f = K.figure(${JSON.stringify(id)}, root, K.W / 2, K.H - 60, {size: K.H - 140});
if (f.actions[0]) f.act(f.actions[0], 1, 2.1);`;
    const dir = path.join(p.dir, 'mesa', id);
    const out = path.join(dir, 'proyecto');
    assemble({duration: 2, format: '16:9', words: [], art: {...art, background: {type: 'solid'}, captions: {style: 'ninguno'}, vignette: 0}, models: [piece],
      scenes: [{id: 'mesa', start: 0, end: 2, transition: 'corte', text: '', code: piece.kind === '2d' ? code2d : code3d}]}, out);
    const found = (await validate(out)).map((e) => String(e.text || '').replace(/^Escena mesa: /, ''));
    const measure = found.find((e) => /MEDIDA /.test(e));
    const avisosMesa = found.filter((e) => /^AVISO /.test(e));
    for (const a of avisosMesa) console.log('⚠ ' + a.replace(/^AVISO /, ''));
    const errors = found.filter((e) => e !== measure && !/^AVISO /.test(e));
    if (errors.length) { for (const e of errors) console.log('✖ ' + e); process.exitCode = 1; return; }
    if (measure) { const [w, h, d, base] = measure.replace(/^.*MEDIDA /, '').split(' '); console.log(`medida: ${w} × ${h} × ${d} unidades (ancho × alto × fondo; 10 = 1 m) · base en y = ${base}`); }
    const times = piece.kind === '2d' ? [0.5, 1.6] : [0.3, 0.8, 1.3, 1.85];
    const shots = await snapshots(out, times, path.join(dir, 'fotos'));
    const layout = piece.kind === '2d' ? ['-filter_complex', '[0][1]hstack=inputs=2,scale=1920:-2'] : ['-filter_complex', '[0][1][2][3]xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0,scale=1920:-2'];
    await run(FFMPEG, ['-v', 'error', '-y', ...shots.flatMap((f) => ['-i', f]), ...layout, '-frames:v', '1', '-q:v', '3', path.join(dir, 'vistas.jpg')]);
    console.log('vistas: ' + path.join(dir, 'vistas.jpg') + (piece.kind === '2d' ? ' (reposo · primera acción)' : ' (frente · tres cuartos · lado · atrás y arriba con su primera acción)'));
  },
  /** Auditoría física y visual del vídeo entero (--paso=0.25 por defecto). */
  async auditar([name, ...rest]) {
    const p = project(name);
    const args = opts(rest);
    const out = await COMMANDS.montar([name]);
    const errors = await validate(out);
    for (const e of errors) console.log('✖ ' + (e.text || JSON.stringify(e)));
    const res = await auditProject(p, out, {paso: Number(args.paso) || 0.25});
    if (res.graves.length) process.exitCode = 1;
    return res;
  },
  async audio([name]) {
    const p = project(name);
    if (!fs.existsSync(path.join(p.dir, 'voz.mp3'))) die('Falta voz.mp3 («turboframe voz»).');
    const scenes = timedScenes(p);
    const cue = (word, after) => { const k = strip(word).slice(0, 14); const w = p.words.find((x) => x.a >= after - 0.05 && k && strip(x.t).startsWith(k)); return w ? w.a : null; };
    const sfx = [], amb = [];
    for (const s of scenes) {
      for (const fx of s.sfx || []) { const t = fx.t ?? (fx.palabra ? cue(fx.palabra, s.start) : null); if (t !== null && SFX[fx.name || fx.nombre]) sfx.push({name: fx.name || fx.nombre, t, gain: fx.gain ?? 1}); }
      // Sin ambientes de ruido (mar, viento, lluvia, río): eran un siseo continuo bajo la voz y molestaban (29-10).
      // TURBOFRAME_AMBIENTES=1 en el .env los recupera.
      if (s.ambiente && AMBIENCES.includes(s.ambiente) && process.env.TURBOFRAME_AMBIENTES === '1') amb.push({kind: s.ambiente, from: s.start, to: s.end});
    }
    const music = p.plan.sonido?.musica || {engine: 'ninguna'};
    const third = scenes[Math.floor(scenes.length / 3)]?.start, two = scenes[Math.floor((scenes.length * 2) / 3)]?.start;
    // build y curva aceptan segundos o palabras del guion ({palabra, gain} o 'palabra').
    const when = (x) => (typeof x === 'number' ? x : cue(typeof x === 'string' ? x : x.palabra, typeof x === 'object' && x.tras ? (cue(x.tras, 0) ?? 0) : 0));
    const build = (music.build || [third, two]).map(when).filter((x) => x !== null && x !== undefined);
    const curve = (music.curva || []).map((c) => [c.t ?? (when(c) === null ? null : when(c) + (c.desfase || 0)), c.gain ?? 1]).filter(([t]) => t !== null && t !== undefined).sort((a, b) => a[0] - b[0]);
    const sound = {duration: duration(p), voice: path.join(p.dir, 'voz.mp3'), music: {...music, build, curve}, sfx, ambience: amb};
    fs.writeFileSync(path.join(p.dir, 'sonido.json'), JSON.stringify(sound, null, 1));
    const {stdout} = await run(PYTHON, [path.join(ROOT, 'src/audio.py'), path.join(p.dir, 'sonido.json'), path.join(p.dir, 'mix.wav')], {maxBuffer: 1 << 24, env: {...process.env, FFMPEG}});
    console.log('✔ mix.wav · ' + stdout.trim());
  },
  /** El render ocupa todos los turnos de navegador mientras dura (dentro valida y audita con los suyos). */
  async render(argv) { return withBrowsers(Infinity, () => COMMANDS.renderNow(argv)); },
  async renderNow([name, ...rest]) {
    const p = project(name);
    const args = opts(rest);
    const started = Date.now();
    await COMMANDS.audio([name]);
    const out = await COMMANDS.montar([name]);
    const errors = await validate(out);
    for (const e of errors) console.log('✖ ' + (e.text || JSON.stringify(e)));
    // Antes de renderizar, la auditoría: con problemas graves no se renderiza (salvo --forzar).
    if (!args['sin-auditar']) {
      const res = await auditProject(p, out, {paso: Number(args.paso) || 0.5});
      if (res.graves.length && !args.forzar) die(`La auditoría encuentra ${res.graves.length} problemas graves: arréglalos o renderiza con --forzar.`);
    }
    const mp4 = path.join(p.dir, path.basename(p.dir) + '.mp4');
    const total = duration(p);
    if (args.tramos === '0' || (!args.tramos && total < 90)) await renderHF(['--output', mp4, out], {cwd: out, workers: args.workers});
    else await renderTramos(p, mp4, {forzar: !!args.rehacer, len: Number(args.tramos) || 45, workers: args.workers});
    const rev = await checkMp4(mp4);
    for (const x of rev.out) console.log('⚠ MP4: ' + x);
    console.log(`✔ ${mp4} · ${duration(p)} s de vídeo en ${((Date.now() - started) / 1000).toFixed(0)} s` + (rev.out.length ? ` · ${rev.out.length} avisos del MP4` : ' · MP4 revisado sin destellos, negros ni congelados'));
  },
};

/*
 * Render por tramos: el vídeo se parte en trozos de ~45 s que empiezan en una escena, cada uno con la huella de TODO lo
 * que influye en él (motor, dirección de arte, piezas, capa común, sus escenas, sus palabras y su intervalo). Solo se
 * renderiza el tramo cuya huella no está en proyectos/<nombre>/tramos/: cambiar una escena de un vídeo de 25 minutos
 * vuelve a renderizar su minuto, no el vídeo entero. Los tramos se unen por copia (sin recomprimir) y se añade el audio.
 */
async function renderTramos(p, mp4, {forzar = false, len = 45, workers = null} = {}) {
  const fps = 30, total = duration(p), scenes = timedScenes(p), q = (t) => Math.round(t * fps) / fps;
  const cuts = [0];
  for (const s of scenes) if (s.start - cuts[cuts.length - 1] >= len && total - s.start >= len / 3) cuts.push(q(s.start));
  cuts.push(total);
  const engine = crypto.createHash('sha1');
  for (const f of ['src/assemble.mjs', 'src/kit/kit.js', 'src/kit/world3d.js', 'src/kit/gen.js']) if (fs.existsSync(path.join(ROOT, f))) engine.update(fs.readFileSync(path.join(ROOT, f)));
  const base = job(p, {}), common = engine.digest('hex') + JSON.stringify({art: base.art, models: base.models, overlay: base.overlay, fmt: base.format, dur: base.duration});
  const dir = path.join(p.dir, 'tramos'); fs.mkdirSync(dir, {recursive: true});
  const files = [], started = Date.now(); let made = 0;
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i], b = cuts[i + 1];
    // Las escenas que el montaje mete en el tramo: las que se ven en él (con el fundido de entrada, si lo hay).
    const mine = base.scenes.filter((s, k) => { const end = k === base.scenes.length - 1 ? total : base.scenes[k + 1].start + 0.02; return end > a && (k === 0 ? 0 : s.start - (s.transition === 'corte' ? 0 : 1)) < b; });
    const words = base.words.filter((w) => w.b > a - 1 && w.a < b + 1);
    const h = crypto.createHash('sha1').update(common + JSON.stringify({a, b, mine, words})).digest('hex').slice(0, 16);
    const file = path.join(dir, `${String(i).padStart(3, '0')}_${h}.mp4`);
    files.push(file);
    if (fs.existsSync(file) && !forzar) continue;
    const build = path.join(dir, '_montaje');
    fs.rmSync(build, {recursive: true, force: true});
    assemble({...base, tramo: {a, b}}, build);
    process.stdout.write(`  tramo ${i + 1}/${cuts.length - 1} (${a.toFixed(0)}–${b.toFixed(0)} s)…\r`);
    await renderHF(['--quiet', '--output', file, build], {cwd: build, workers});
    fs.rmSync(build, {recursive: true, force: true});
    made++;
  }
  // Fuera los tramos viejos que ya no forman parte del vídeo.
  for (const f of fs.readdirSync(dir)) { const full = path.join(dir, f); if (f.endsWith('.mp4') && !files.includes(full)) fs.rmSync(full); }
  const list = path.join(dir, 'lista.txt');
  fs.writeFileSync(list, files.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'));
  const video = path.join(dir, '_video.mp4');
  await run(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', video]);
  const mix = path.join(p.dir, 'mix.wav');
  await run(FFMPEG, ['-y', '-loglevel', 'error', '-i', video, ...(fs.existsSync(mix) ? ['-i', mix, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k'] : []), '-c:v', 'copy', '-movflags', '+faststart', mp4]);
  fs.rmSync(video, {force: true});
  console.log(`  ${made} de ${files.length} tramos renderizados (${files.length - made} reutilizados) en ${((Date.now() - started) / 1000).toFixed(0)} s` + ' '.repeat(10));
}

const [cmd, ...rest] = process.argv.slice(2);
if (!COMMANDS[cmd]) {
  console.log(`turboframe ${VERSION} <comando>
  comprobar                    revisa la instalación (Node, dependencias, Chrome, ffmpeg, Python, claves, skill) y monta una prueba
  version                      versión instalada
  encolar <nombre>             deja el vídeo en la cola del render de noche
  cola [--quitar=<n>] [--limpiar]   la cola: pendientes y resultados
  noche                        renderiza la cola (lo lanza solo «programar»)
  programar --hora=03:00 | --quitar   render de noche automático a esa hora (macOS)
  actualizar                   descarga la última versión y enseña las novedades
  nuevo <nombre> [16:9|9:16]   crea proyectos/<nombre>
  voces                        lista las voces de ElevenLabs
  voz <nombre> [--voz=ID] [--modelo=eleven_multilingual_v2]   locuta guion.txt → voz.mp3 + palabras.json
  afinar <nombre>              ajusta a la voz real los bordes de las palabras junto a las pausas (lo hace «voz»)
  revisar <nombre>             revisa el MP4 final: destellos de un fotograma, negros y congelados (lo hace «render»)
  frases <nombre>              frases numeradas con su tramo (para repartir escenas)
  palabras <nombre> [desde] [hasta]   palabras con su instante
  mesa <nombre> <pieza>        fotos de una pieza en la mesa de giro
  validar <nombre>             monta el proyecto y lista los errores
  fotos <nombre> --en=1.2,3 | --escena=<id> | --todas   capturas para revisar (con brillo, vacío y repetidos)
  audio <nombre>               música, efectos y mezcla a -14 LUFS
  auditar <nombre> [--paso=0.25]   auditoría física y visual: choques, cámara, textos, tramos quietos y oscuros
  render <nombre> [--forzar] [--sin-auditar] [--tramos=0|segundos] [--rehacer] [--workers=N]   audio + montaje + auditoría + MP4 final (por tramos con caché si dura más de 90 s)`);
  process.exit(cmd ? 1 : 0);
}
await COMMANDS[cmd](rest);

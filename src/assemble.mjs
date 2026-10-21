/*
 * Montador del vídeo explicativo: con la dirección de arte, las palabras de la voz, los modelos y
 * dibujos que fabricó el taller y el código de cada escena, escribe un proyecto HyperFrames completo
 * (index.html, estilos, datos y recursos) en `out`. Cada modelo y cada escena se compila por separado:
 * uno que falla (incluso por sintaxis) se queda fuera o se sustituye por un rótulo con su frase, nunca
 * tumba el vídeo.
 */
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {FONTS} from './catalog.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENGINE = path.resolve(HERE, '..');
const ASSETS = path.join(ENGINE, 'assets');
const NM = path.join(ENGINE, 'node_modules');
const TURN = 0.55;
/** Librerías del navegador: salen de node_modules (versiones fijadas en package.json); Three.js se empaqueta con «npm run build». */
const VENDOR = {
  'anime.js': path.join(NM, 'animejs/dist/bundles/anime.umd.min.js'),
  'd3.js': path.join(NM, 'd3/dist/d3.min.js'),
  'rough.js': path.join(NM, 'roughjs/bundled/rough.js'),
  'topojson.js': path.join(NM, 'topojson-client/dist/topojson-client.min.js'),
  'three.js': path.join(ENGINE, 'dist/three.js'),
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const copy = (from, to) => { fs.mkdirSync(path.dirname(to), {recursive: true}); fs.copyFileSync(from, to); };

/** Subtítulos: tramos de hasta ~52 caracteres; siempre cortan al final de frase y, si van llenos, en comas. */
export function captionChunks(words, max = 52) {
  const chunks = [];
  let cur = [];
  const len = (list) => list.map((w) => w.t).join(' ').length;
  for (const w of words) {
    if (cur.length && len([...cur, w]) > max) { chunks.push(cur); cur = []; }
    cur.push(w);
    if (/[.?!…]$/.test(w.t) || (/[,;:]$/.test(w.t) && len(cur) > max * 0.5)) { chunks.push(cur); cur = []; }
  }
  if (cur.length) chunks.push(cur);
  return chunks;
}

function fontFaces(art, out, extra = []) {
  const css = [];
  const used = new Set([...Object.values(art.fonts || {}), ...extra]);
  for (const name of used) {
    const entry = FONTS[name];
    if (!entry) continue;
    const [pkg, weights] = entry;
    for (const w of weights) {
      for (const sub of ['latin', 'latin-ext']) {
        const file = `${pkg}-${sub}-${w}-normal.woff2`;
        const src = path.join(NM, '@fontsource', pkg, 'files', file);
        if (!fs.existsSync(src)) continue;
        copy(src, path.join(out, 'assets/fonts', file));
        css.push(`@font-face{font-family:'${name}';font-weight:${w};src:url(./assets/fonts/${file}) format('woff2');${sub === 'latin-ext' ? 'unicode-range:U+0100-024F;' : ''}}`);
      }
    }
  }
  return css.join('\n');
}

/** Datos que la caja de herramientas necesita: palabras, paleta y solo los iconos, banderas y mapas que el código usa. */
function kitData(job, code) {
  const icons = {};
  for (const m of code.matchAll(/K\.icon\([^,]+,\s*['"]([a-z0-9-]+)['"]/g)) {
    const name = m[1];
    const lucide = path.join(NM, 'lucide-static/icons', name + '.svg');
    const tabler = path.join(NM, '@tabler/icons/icons/outline', name + '.svg');
    const file = fs.existsSync(lucide) ? lucide : fs.existsSync(tabler) ? tabler : null;
    if (file) icons[name] = fs.readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ').trim();
  }
  const flags = {};
  for (const m of code.matchAll(/K\.flag\([^,]+,\s*['"]([a-zA-Z]{2})['"]/g)) {
    const file = path.join(NM, 'flag-icons/flags/4x3', m[1].toLowerCase() + '.svg');
    if (fs.existsSync(file)) flags[m[1].toLowerCase()] = fs.readFileSync(file, 'utf8');
  }
  const geo = {};
  if (/K\.map\.world|K\.world3d|ground\s*:/.test(code)) geo.world = JSON.parse(fs.readFileSync(path.join(NM, 'world-atlas/countries-50m.json')));
  if (/K\.map\.spain|regions\s*:\s*true/.test(code)) {
    geo.ccaa = JSON.parse(fs.readFileSync(path.join(NM, 'es-atlas/es/autonomous_regions.json')));
    if (/level\s*:\s*['"]provinces/.test(code)) geo.provinces = JSON.parse(fs.readFileSync(path.join(NM, 'es-atlas/es/provinces.json')));
  }
  const countries = JSON.parse(fs.readFileSync(path.join(ASSETS, 'countries.json')));
  const [W, H] = job.format === '9:16' ? [1080, 1920] : [1920, 1080];
  return {width: W, height: H, duration: job.duration, words: job.words, palette: job.art.palette, skies: job.art.skies || {}, look: job.art.look || 'comic', render: job.art.render || {}, calidad: job.calidad || 'alta', offset: job.tramo ? job.tramo.a : 0, icons, flags, geo, countries};
}

/** Fondo de las escenas: color o degradado de la paleta y, encima, grano procedural (ruido SVG en gris, no tiñe la paleta). */
function background(art) {
  const bg = art.background || {};
  const base = bg.type === 'gradient'
    ? `linear-gradient(${bg.angle ?? 160}deg, ${bg.from || art.palette.bg}, ${bg.to || art.palette.bg2 || art.palette.bg})`
    : (bg.color || art.palette.bg);
  let grain = '';
  const g = bg.grain;
  if (g && Number(g.strength) > 0) {
    const freq = Math.min(2, Math.max(0.05, Number(g.frequency) || 0.8)), oct = Math.min(6, Math.max(1, Math.round(Number(g.octaves) || 3)));
    const noise = `<svg xmlns='http://www.w3.org/2000/svg' width='${g.size || 600}' height='${g.size || 600}'><filter id='n'><feTurbulence type='${g.type === 'turbulence' ? 'turbulence' : 'fractalNoise'}' baseFrequency='${freq}' numOctaves='${oct}' seed='${Math.round(Number(g.seed) || 3)}' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`;
    grain = `.scene::before{content:'';position:absolute;inset:0;pointer-events:none;background:url("data:image/svg+xml;utf8,${noise}") repeat;filter:contrast(${Number(g.contrast) || 1.4});mix-blend-mode:multiply;opacity:${Math.min(0.6, Number(g.strength))}}`;
  }
  return {base, grain};
}

// Orden de apilado: cada escena va encima de la anterior (10 + su número, para que las transiciones solapen bien) y la
// viñeta, la capa común y los subtítulos van SIEMPRE por encima de todas, tenga el vídeo las escenas que tenga.
export const CAPAS = {escenas: 10, vineta: 900000, capa: 900010, subtitulos: 900020};

function captionCss(art) {
  const p = art.palette, f = art.fonts, c = art.captions || {};
  const base = `.cap{z-index:${CAPAS.subtitulos};inset:auto;left:0;right:0;bottom:44px;display:flex;justify-content:center}
.cap .box{position:relative;z-index:0;max-width:1560px;text-align:center;font:600 40px/1.3 '${f.body}';color:${c.text || p.ink}}
.w{position:relative;display:inline-block;margin:0 .06em}
.w .hl{position:absolute;left:-3px;right:-3px;top:12%;bottom:6%;background:${c.highlight || p.accent};opacity:.85;z-index:-1;transform-origin:0 50%;transform:scaleX(0);border-radius:6px}`;
  const style = {
    tira: `.cap .box{background:${c.background || 'rgba(255,255,255,.9)'};padding:10px 26px 12px;border-radius:14px;box-shadow:0 8px 20px rgba(0,0,0,.2)}`,
    sombra: `.cap .box{color:${c.text || '#fff'};text-shadow:0 2px 0 rgba(0,0,0,.6),0 0 18px rgba(0,0,0,.65)}`,
    cinta: `.cap .box{background:${c.background || 'rgba(250,244,230,.92)'};padding:10px 26px 12px;transform:rotate(-.5deg);box-shadow:0 6px 16px rgba(0,0,0,.18)}`,
    ninguno: '.cap{display:none!important}',
    sombra_color: `.cap .box{font:700 44px/1.25 '${f.body}';color:#fff;text-shadow:0 2px 2px rgba(0,0,0,.55),0 0 18px rgba(0,0,0,.5)}.w .hl{display:none}`,
    contorno: `.cap .box{font:400 46px/1.25 '${f.body}';color:#fff;text-shadow:0 0 2px #000,3px 3px 0 #000,-3px 3px 0 #000,3px -3px 0 #000,-3px -3px 0 #000,0 3px 0 #000,3px 0 0 #000,-3px 0 0 #000,0 -3px 0 #000}.w .hl{display:none}`,
  }[c.style || 'tira'];
  return base + '\n' + style + (art.overlayCaptions ? '\n.cap .box{max-width:1180px}' : '') + (art.vertical ? '\n.cap{bottom:560px}.cap .box{max-width:900px;font-size:54px!important;line-height:1.2}' : '');
}

function transition(scene, prevEnd) {
  const t0 = Math.max(0, scene.start - TURN), id = `#sc-${scene.id}`, d = Math.round((TURN + 0.15) * 1000), at = Math.round(t0 * 1000);
  switch (scene.transition) {
    case 'fundido': return `K.tl.add('${id}', {opacity: [0, 1], duration: ${d}, ease: 'inOutSine'}, ${at});`;
    case 'deslizar': return `K.tl.add('${id}', {translateX: ['100%', '0%'], duration: ${d}, ease: 'outCubic'}, ${at});`;
    case 'pagina': return `K.tl.add('${id}', {translateX: ['104%', '0%'], rotate: [2.5, 0], duration: ${d}, ease: 'outCubic'}, ${at});`;
    case 'zoom': return `K.tl.add('${id}', {opacity: [0, 1], scale: [1.18, 1], duration: ${d}, ease: 'outCubic'}, ${at});`;
    case 'cortina': return `K.tl.add('${id}', {clipPath: ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'], duration: ${d}, ease: 'inOutCubic'}, ${at});`;
    case 'desenfoque': return `K.tl.add('${id}', {opacity: [0, 1], filter: ['blur(18px)', 'blur(0px)'], duration: ${d}, ease: 'outCubic'}, ${at});`;
    default: return '';
  }
}

/**
 * @param {object} job {duration, words:[{t,a,b}], audio?, art:{palette,fonts,skies,look,background,captions,vignette}, models:[{id,kind:'3d'|'2d',code,info}], overlay?, scenes:[{id,start,end,transition,code,text}]}
 * @param {string} out carpeta del proyecto
 */
export function assemble(job, out) {
  fs.mkdirSync(out, {recursive: true});
  const art = job.art;
  const [W, H] = job.format === '9:16' ? [1080, 1920] : [1920, 1080];
  art.vertical = H > W;
  art.overlayCaptions = !!job.overlay;
  const models = job.models || [];
  const code = [...job.scenes.map((s) => s.code || ''), job.overlay || '', ...models.map((m) => m.code || '')].join('\n');
  const uses3d = /K\.world3d/.test(code) || models.some((m) => m.kind === '3d');
  for (const lib of ['anime.js', 'd3.js', 'rough.js', 'topojson.js', 'kit.js', ...(uses3d ? ['three.js', 'world3d.js', 'gen.js'] : [])]) copy(VENDOR[lib] || path.join(HERE, 'kit', lib), path.join(out, 'lib', lib));
  fs.writeFileSync(path.join(out, 'models.js'), models.map((m) => `/* ${m.kind} ${m.id} */
try {
  ${m.kind === '3d' ? `if (K.forge) K.defineModel(${JSON.stringify(m.id)}, new Function('f', 'p', ${JSON.stringify(m.code || '')}), ${JSON.stringify(m.info || {})});` : `K.defineDrawing(${JSON.stringify(m.id)}, new Function('K', 'g', 'p', ${JSON.stringify(m.code || '')}), ${JSON.stringify(m.info || {})});`}
} catch (error) { console.error('Modelo ${m.id}: ' + error.message); }`).join('\n'));
  fs.writeFileSync(path.join(out, 'data.js'), 'window.KIT_DATA = ' + JSON.stringify(kitData(job, code)) + ';');
  const p = art.palette, f = art.fonts;
  const bg = background(art);
  const css = `${fontFaces(art, out, job.fonts || [])}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:${p.bg}}
#root{position:relative;width:${W}px;height:${H}px;overflow:hidden;color:${p.ink};font-family:'${f.body}'}
.clip{position:absolute;inset:0}
.scene{background:${bg.base};overflow:hidden}
${bg.grain}
.scene.shadow{box-shadow:-30px 0 60px rgba(0,0,0,.35)}
.scene-root{position:absolute;inset:0}
:root{--bg:${p.bg};--ink:${p.ink};--accent:${p.accent};--accent2:${p.accent2 || p.accent};--soft:${p.soft || p.ink};--title:'${f.title}';--body:'${f.body}';--label:'${f.label || f.body}';--hand:'${f.hand || f.title}'}
.title{font-family:var(--title);font-weight:${FONTS[f.title]?.[1]?.slice(-1)[0] || 700};line-height:1.05;letter-spacing:-.01em}
.body{font-family:var(--body)}
.label{font-family:var(--label);letter-spacing:.08em;text-transform:uppercase}
.hand{font-family:var(--hand)}
.scene-root:has(canvas) .title,.scene-root:has(canvas) .label{text-shadow:0 3px 0 rgba(0,0,0,.35),0 10px 28px rgba(0,0,0,.55)}
#fx-vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 45%,transparent 58%,rgba(0,0,0,${art.vignette ?? 0.25}) 100%)}
.fallback{position:absolute;left:${art.vertical ? 80 : 160}px;right:${art.vertical ? 80 : 160}px;top:${art.vertical ? 500 : 300}px;font-family:var(--title);font-size:72px;line-height:1.15;text-align:center}
${captionCss(art)}`;
  fs.writeFileSync(path.join(out, 'style.css'), css);

  // Tramo (render por trozos): solo las escenas y subtítulos que tocan [a, b]; sus tiempos en el reloj del tramo. La página
  // suma el desfase a, así que las escenas, la voz y la cámara siguen en tiempo absoluto.
  const TR = job.tramo || null, OFF = TR ? TR.a : 0;
  // HyperFrames renderiza ceil(duración × 30) fotogramas: un tramo intermedio dura medio fotograma menos de sus n fotogramas
  // exactos, para que al unirlos no sobre ninguno y el vídeo no se desplace.
  const LEN = !TR ? job.duration : TR.b >= job.duration - 1e-6 ? TR.b - TR.a : (Math.round((TR.b - TR.a) * 30) - 0.5) / 30;
  const inTr = (a, b) => !TR || (b > TR.a && a < TR.b);
  const clipT = (a, b) => (TR ? [Math.max(a, TR.a) - TR.a, Math.min(b, TR.b) - Math.max(a, TR.a)] : [a, b - a]);
  // Escenas: cada una en su sección, que entra por encima de la anterior con su transición.
  const sceneSpan = (s, i) => [i === 0 ? 0 : Math.max(0, s.start - ((s.transition || 'corte') === 'corte' ? 0 : TURN)), i === job.scenes.length - 1 ? job.duration : job.scenes[i + 1].start + 0.02];
  const keep = job.scenes.map((s, i) => inTr(...sceneSpan(s, i)));
  const sections = job.scenes.map((s, i) => {
    if (!keep[i]) return '';
    // Un corte entra justo en su instante; las demás transiciones empiezan TURN antes para fundirse con la anterior.
    const start = i === 0 ? 0 : Math.max(0, s.start - ((s.transition || 'corte') === 'corte' ? 0 : TURN));
    const end = i === job.scenes.length - 1 ? job.duration : job.scenes[i + 1].start + 0.02;
    const [cs, cd] = clipT(start, end);
    return `<section id="sc-${s.id}" class="clip scene${s.transition === 'pagina' ? ' shadow' : ''}" style="z-index:${CAPAS.escenas + i}" data-start="${cs.toFixed(3)}" data-duration="${cd.toFixed(3)}"><div class="scene-root"></div></section>`;
  });
  // Cada escena se compila aparte: si no compila o falla al ejecutarse, sale un rótulo con su frase.
  const runs = job.scenes.map((s, i) => !keep[i] ? '' : `
/* escena ${s.id} */
(function (root, T0, T1) {
  try {
    new Function('root', 'T0', 'T1', ${JSON.stringify(s.code || '')})(root, T0, T1);
  } catch (error) {
    console.error('Escena ${s.id}: ' + error.message);
    root.innerHTML = '';
    const n = K.el(root, 'div', {cls: 'fallback', html: ${JSON.stringify(esc(s.text || ''))}});
    K.show(n, T0 + 0.1);
  }
})(document.querySelector('#sc-${s.id} .scene-root'), ${s.start.toFixed(3)}, ${s.end.toFixed(3)});
${transition(s)}`).join('\n');

  // Subtítulos con la palabra que suena resaltada.
  let cid = 0;
  const caps = [];
  const marks = [];
  for (const chunk of captionChunks(job.words, art.vertical ? 26 : job.overlay ? 40 : 52)) {
    cid++;
    const a = chunk[0].a, b = chunk[chunk.length - 1].b;
    if (!inTr(a, b)) continue;
    const [ca, cd] = clipT(a, b);
    caps.push(`<div class="clip cap" data-start="${ca.toFixed(3)}" data-duration="${cd.toFixed(3)}"><span class="box">${chunk.map((w, k) => `<span class="w" id="c${cid}w${k}">${esc(w.t)}</span>`).join(' ')}</span></div>`);
    chunk.forEach((w, k) => marks.push([`c${cid}w${k}`, w.a, w.b]));
  }
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=${W}, height=${H}" />
<link rel="stylesheet" href="./style.css" />
<script src="./lib/anime.js"></script>
<script src="./lib/d3.js"></script>
<script src="./lib/rough.js"></script>
<script src="./lib/topojson.js"></script>
<script src="./data.js"></script>
<script src="./lib/kit.js"></script>
${uses3d ? '<script src="./lib/three.js"></script>\n<script src="./lib/world3d.js"></script>\n<script src="./lib/gen.js"></script>' : ''}
<script src="./models.js"></script>
</head>
<body>
<div id="root" data-composition-id="main" data-no-timeline data-start="0" data-duration="${LEN.toFixed(3)}" data-width="${W}" data-height="${H}">
  ${sections.join('\n  ')}
  <div id="fx" class="clip" style="z-index:${CAPAS.vineta};pointer-events:none" data-start="0" data-duration="${LEN.toFixed(3)}"><div id="fx-vig"></div></div>
  ${job.overlay ? `<div id="overlay" class="clip" style="z-index:${CAPAS.capa};pointer-events:none" data-start="0" data-duration="${LEN.toFixed(3)}"></div>` : ''}
  ${caps.join('\n  ')}
  ${job.audio && !TR ? `<audio id="mix" src="./assets/mix.wav" data-start="0" data-duration="${job.duration.toFixed(3)}" data-volume="1"></audio>` : ''}
</div>
<script>
${runs}
${job.overlay ? `/* capa común a todo el vídeo (la programa la IA si la dirección la pide) */
try { new Function('root', 'T0', 'T1', ${JSON.stringify(job.overlay)})(document.getElementById('overlay'), 0, ${job.duration.toFixed(3)}); } catch (error) { console.error('Capa: ' + error.message); }` : ''}
/* subtítulos */
${JSON.stringify(marks)}.forEach(([id, a, b]) => {
  const span = document.getElementById(id);
  if (!span) return;
  ${['contorno', 'sombra_color'].includes((art.captions || {}).style) ? `K.tl.add(span, {color: ['#ffffff', '${(art.captions || {}).highlight || '#f2c14e'}'], duration: 80}, K.ms(a));
  K.tl.add(span, {color: ['${(art.captions || {}).highlight || '#f2c14e'}', '#ffffff'], duration: 80}, K.ms(b - 0.03));
  return;` : ''}
  const hl = K.el(span, 'i', {cls: 'hl'});
  K.tl.add(hl, {scaleX: [0, 1], duration: 140, ease: 'outQuad'}, K.ms(a));
  K.tl.add(hl, {opacity: [0.85, 0], duration: 90, ease: 'linear'}, K.ms(b - 0.03));
});
${OFF ? `// Tramo: HyperFrames también descubre K.tl por su cuenta, así que el desfase va en su propio seek.
{ const seek0 = K.tl.seek; K.tl.seek = function (ms, ...r) { return seek0.call(this, ms + ${Math.round(OFF * 1000)}, ...r); }; }` : ''}
window.__hfAnime = [...(window.__hfAnime || []), K.tl];
</script>
</body>
</html>`;
  fs.writeFileSync(path.join(out, 'index.html'), html);
  if (job.audio && fs.existsSync(job.audio)) copy(job.audio, path.join(out, 'assets/mix.wav'));
  return out;
}

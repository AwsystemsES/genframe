#!/usr/bin/env node
/*
 * Empaqueta genframe para los clientes: una copia limpia del motor, sin nada personal, con su README de cliente, licencia,
 * avisos de terceros y novedades, en producto/salida/genframe/ (un repositorio git propio, el de distribución) y en un zip.
 *
 *   node producto/empaquetar.mjs              prepara la versión de package.json en local
 *   node producto/empaquetar.mjs --publicar   además la sube al repositorio de producto.json (rama main y etiqueta vX.Y.Z)
 *   --permitir-cambios                        empaqueta aunque haya cambios sin commit (solo para probar)
 *
 * El paquete sale de lo que está en git (git ls-files), nunca de ficheros sueltos: lo que no está en un commit no se vende.
 */
import fs from 'fs';
import path from 'path';
import {execFileSync} from 'child_process';
import {fileURLToPath} from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT = path.join(HERE, 'salida');
const DEST = path.join(OUT, 'genframe');
const args = new Set(process.argv.slice(2));
const die = (m) => { console.error('✖ ' + m); process.exit(1); };
const git = (a, cwd = ROOT) => execFileSync('git', a, {cwd, encoding: 'utf8', maxBuffer: 1 << 26}).trim();
const read = (f) => fs.readFileSync(f, 'utf8');

const cfg = JSON.parse(read(path.join(HERE, 'producto.json')));
const version = JSON.parse(read(path.join(ROOT, 'package.json'))).version;

// 1. La versión tiene que tener sus novedades: es lo que ve el cliente al actualizar.
const cambios = read(path.join(HERE, 'CAMBIOS.md'));
if (!new RegExp(`^## ${version.replace(/\./g, '\\.')}\\b`, 'm').test(cambios)) die(`Añade las novedades de la ${version} a producto/CAMBIOS.md («## ${version} · fecha»).`);

// 2. Solo lo que está en un commit.
if (!args.has('--permitir-cambios') && git(['status', '--porcelain', '--untracked-files=no'])) die('Hay cambios sin commit en el motor: haz commit antes de empaquetar (o --permitir-cambios para probar).');

// 3. Repositorio de distribución: de él salen las direcciones del README.
const repo = cfg.repositorio || '';
// Vale cualquier forma: https://github.com/org/repo, git@github.com:org/repo.git o un alias SSH (git@github-genframe:org/repo.git).
const m = /[:/]([^/:]+)\/([^/:]+?)(\.git)?$/.exec(repo);
const urls = m ? {web: `https://github.com/${m[1]}/${m[2]}`, https: `https://github.com/${m[1]}/${m[2]}.git`, ssh: `git@github.com:${m[1]}/${m[2]}.git`}
  : {web: 'https://github.com/TU-ORGANIZACION/genframe', https: 'https://github.com/TU-ORGANIZACION/genframe.git', ssh: 'git@github.com:TU-ORGANIZACION/genframe.git'};
if (!m) console.warn('⚠ producto.json no tiene «repositorio»: el README sale con TU-ORGANIZACION y no se puede publicar.');

// 4. Copia limpia: se vacía la salida (salvo su .git) y se copia lo que está en git, menos lo excluido.
fs.mkdirSync(DEST, {recursive: true});
for (const f of fs.readdirSync(DEST)) if (f !== '.git') fs.rmSync(path.join(DEST, f), {recursive: true, force: true});
const excluded = (f) => cfg.excluir.some((e) => (e.endsWith('/') ? f.startsWith(e) : f === e));
const files = git(['ls-files']).split('\n').filter((f) => f && !excluded(f));
for (const f of files) { fs.mkdirSync(path.dirname(path.join(DEST, f)), {recursive: true}); fs.copyFileSync(path.join(ROOT, f), path.join(DEST, f)); }

// 5. Lo que cambia para el cliente.
const fill = (s) => s.replace(/\{\{REPO_WEB\}\}/g, urls.web).replace(/\{\{REPO_HTTPS\}\}/g, urls.https).replace(/\{\{REPO_SSH\}\}/g, urls.ssh).replace(/\{\{VERSION\}\}/g, version);
fs.writeFileSync(path.join(DEST, 'README.md'), fill(read(path.join(HERE, 'plantillas', 'README.md'))));
for (const f of ['LICENCIA.md', 'AVISOS-TERCEROS.md', 'CAMBIOS.md']) fs.copyFileSync(path.join(HERE, f), path.join(DEST, f));
const skillPath = path.join(DEST, '.claude', 'skills', 'genframe', 'SKILL.md');
let skill = read(skillPath);
// Sin rutas del ordenador del autor.
skill = skill.replace(/^- Repositorio: .*$/m, '- Repositorio: la carpeta que contiene `bin/genframe.mjs` (donde se instaló genframe). Ejecuta los comandos desde ahí: `node bin/genframe.mjs <comando>`.');
// El cliente no modifica el motor: los fallos se anotan para el soporte.
const a = skill.indexOf('## Mejorar el motor'), b = skill.indexOf('\n## ', a + 5);
if (a < 0 || b < 0) die('No encuentro la sección «## Mejorar el motor» de la skill: actualiza empaquetar.mjs.');
skill = skill.slice(0, a) + read(path.join(HERE, 'plantillas', 'skill-mejorar.md')).trim() + '\n' + skill.slice(b);
fs.writeFileSync(skillPath, skill);

// 6. Nada personal: ninguna palabra prohibida en ningún fichero de texto.
const hits = [];
const walk = (d) => { for (const e of fs.readdirSync(d, {withFileTypes: true})) { if (e.name === '.git') continue; const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else if (/\.(m?js|json|md|txt|py|css|html|example|gitignore)$|^\.env\.example$|^\.gitignore$/.test(e.name)) { const s = read(f); for (const w of cfg.prohibido) if (s.toLowerCase().includes(w.toLowerCase())) hits.push(`${path.relative(DEST, f)}: «${w}»`); } } };
walk(DEST);
if (hits.length) die('El paquete contiene datos personales:\n  ' + hits.join('\n  '));

// 7. Repositorio de distribución: un commit y una etiqueta por versión (en una prueba, ni lo uno ni lo otro).
if (args.has('--permitir-cambios')) { console.log(`✔ prueba de genframe ${version}: ${files.length} ficheros en ${path.relative(ROOT, DEST)}/ (sin commit, etiqueta ni zip)`); process.exit(0); }
if (!fs.existsSync(path.join(DEST, '.git'))) { git(['init', '-q', '-b', 'main'], DEST); }
git(['add', '-A'], DEST);
const changed = git(['status', '--porcelain'], DEST);
const tags = git(['tag', '--list'], DEST).split('\n');
if (changed) {
  if (tags.includes('v' + version)) die(`La ${version} ya está publicada y el motor ha cambiado: sube la versión en package.json y añade sus novedades.`);
  // Firmado con el nombre del producto, no con la identidad personal del autor.
  git(['-c', `user.name=${cfg.autor.nombre}`, '-c', `user.email=${cfg.autor.correo}`, 'commit', '-q', '-m', `genframe ${version}`], DEST);
  git(['tag', 'v' + version], DEST);
} else if (!tags.includes('v' + version)) git(['tag', 'v' + version], DEST);
const zip = path.join(OUT, `genframe-${version}.zip`);
git(['archive', '--format=zip', `--prefix=genframe/`, '-o', zip, 'v' + version], DEST);

const size = (d) => fs.readdirSync(d, {withFileTypes: true}).reduce((s, e) => (e.name === '.git' ? s : s + (e.isDirectory() ? size(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size)), 0);
console.log(`✔ genframe ${version}: ${files.length} ficheros, ${(size(DEST) / 1e6).toFixed(1)} MB → ${path.relative(ROOT, DEST)}/ y ${path.relative(ROOT, zip)}`);

// 8. Publicar.
if (args.has('--publicar')) {
  if (!m) die('Pon el repositorio de distribución en producto/producto.json antes de publicar.');
  const remotes = git(['remote'], DEST).split('\n');
  if (!remotes.includes('origin')) git(['remote', 'add', 'origin', repo], DEST); else git(['remote', 'set-url', 'origin', repo], DEST);
  git(['push', '-u', 'origin', 'main'], DEST);
  git(['push', 'origin', '--tags'], DEST);
  console.log(`✔ publicada en ${urls.web}: los clientes la reciben con «node bin/genframe.mjs actualizar».`);
} else console.log('Para publicarla: pon «repositorio» en producto/producto.json y ejecuta «node producto/empaquetar.mjs --publicar».');

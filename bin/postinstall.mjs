/* Tras «npm install»: empaqueta Three.js para el navegador y descarga el Chrome de HyperFrames. */
import {execFileSync} from 'child_process';
import path from 'path';
import {fileURLToPath} from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = {...process.env, HYPERFRAMES_NO_TELEMETRY: '1'};
execFileSync('npm', ['run', 'build'], {cwd: ROOT, stdio: 'inherit', env});
try { execFileSync(path.join(ROOT, 'node_modules/.bin/hyperframes'), ['browser', 'ensure'], {cwd: ROOT, stdio: 'inherit', env}); } catch { console.warn('No se pudo preparar el navegador de HyperFrames: ejecuta «npx hyperframes browser ensure».'); }

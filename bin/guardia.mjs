#!/usr/bin/env node
/*
 * Guardia de Claude Code (gancho PreToolUse, ver .claude/settings.json): revisa cada comando y cada agente ANTES de que
 * se lancen, sin depender de que el agente cumpla las normas de la skill. Con 16 GB, dos veces se colgó el ordenador:
 * 8 agentes con su Chrome cada uno y 42 ffmpeg lanzados a la vez por un script.
 *
 * - Procesos pesados (ffmpeg, Chrome, Blender…) lanzados en paralelo (`&`, `xargs -P`, `parallel`, en segundo plano):
 *   se bloquean y se pide hacerlos en serie. Los comandos de TurboFrame no, porque ya esperan su turno solos.
 * - Un proceso pesado suelto espera (hasta 10 min) a que acabe otro pesado y a que haya memoria libre; si no, se bloquea.
 * - Un agente nuevo espera a que haya memoria libre.
 * Bloquear = salir con código 2: Claude Code no ejecuta la orden y le pasa al agente el motivo (stderr).
 */
import fs from 'fs';
import {execFileSync} from 'child_process';

const MIN = Number(process.env.TURBOFRAME_MEMORIA_MIN) || 12, WAIT_MS = (Number(process.env.TURBOFRAME_GUARDIA_ESPERA) || 600) * 1000;
const block = (msg) => { process.stderr.write('TurboFrame (protección del ordenador): ' + msg + '\n'); process.exit(2); };
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const sys = (k, d) => { try { return process.platform === 'darwin' ? Number(execFileSync('/usr/sbin/sysctl', ['-n', k], {encoding: 'utf8'})) || d : d; } catch { return d; } };
const memFree = () => sys('kern.memorystatus_level', 100);
// Presión de memoria de macOS (1 normal, 2 aviso, 4 crítica): con crítica nunca; con aviso, solo si queda bastante libre.
const memOk = () => { const f = memFree(), p = sys('kern.memorystatus_vm_pressure_level', 1); return p < 4 && f >= MIN && !(p >= 2 && f < MIN + 6); };
const heavyRunning = () => { try { return execFileSync('/bin/ps', ['-axo', 'command='], {encoding: 'utf8'}).split('\n').filter((l) => /(^|\/)(ffmpeg|ffprobe)\s|chrome-headless-shell(?!.*--type=)|Blender\.app\/Contents\/MacOS\/Blender/.test(l)).length; } catch { return 0; } };
/** Espera a que se cumpla ok(); si no llega en WAIT_MS, devuelve false. */
const waitFor = (ok) => { const t0 = Date.now(); while (!ok()) { if (Date.now() - t0 > WAIT_MS) return false; sleep(5000); } return true; };

let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { process.exit(0); }
const tool = input.tool_name || '', ti = input.tool_input || {};

if (tool === 'Agent' || tool === 'Task') {
  if (!waitFor(memOk)) block(`el ordenador va justo de memoria (${memFree()} % libre): no lances más agentes. Espera a que acaben los que hay o sigue tú en serie.`);
  process.exit(0);
}
if (tool !== 'Bash') process.exit(0);

const cmd = String(ti.command || '');
// Solo cuenta si el comando EJECUTA algo pesado (al principio de una orden: tras ; && | ( do then exec xargs time nice…),
// no si solo lo nombra (un «ps | grep ffmpeg» para mirar, un texto, un fichero de log).
const RUNS = /(^|[;&|(\n]\s*|\b(do|then|else|exec|time|command)\s+|\bnice\s+(-n\s*-?\d+\s+)?|\bxargs\b[^|;&\n]*?\s)(["']?\S*\/)?(ffmpeg|ffprobe|blender|chrome-headless-shell)\b|\b(npx\s+)?hyperframes\s+(render|snapshot|validate)\b/i;
if (!RUNS.test(cmd)) process.exit(0);
// Los comandos de TurboFrame se ponen en cola solos (turnos y memoria): no hace falta frenarlos aquí.
if (/turboframe\.mjs/.test(cmd) && !/(^|[;&|(\n]\s*|\bdo\s+)(\S*\/)?(ffmpeg|ffprobe|blender)\b/i.test(cmd)) process.exit(0);

// Un «&» suelto (no «&&» ni redirecciones como «2>&1» o «&>») manda el proceso a segundo plano y sigue con el siguiente.
const parallel = /&/.test(cmd.replace(/&&|\d*>&\d*|&>>?/g, '')) || /xargs\b[^|\n]*\s-P\s*\d*/.test(cmd) || /\bparallel\b/.test(cmd);
if (parallel) block('este comando lanza procesos pesados (ffmpeg, Chrome, Blender…) a la vez. Hazlo en serie: un bucle que espere a que acabe cada uno (sin «&», «xargs -P» ni «parallel»), con «-threads 2» en ffmpeg.');
if (ti.run_in_background && heavyRunning()) block('ya hay un proceso pesado en marcha: espera a que termine antes de lanzar otro en segundo plano.');

if (!waitFor(() => heavyRunning() === 0)) block(`hay otro proceso pesado en marcha desde hace más de ${Math.round(WAIT_MS / 60000) || 1} min (un render o un ffmpeg): espera a que termine y vuelve a intentarlo.`);
if (!waitFor(memOk)) block(`el ordenador va justo de memoria (${memFree()} % libre): espera o pide al usuario que cierre aplicaciones.`);
process.exit(0);

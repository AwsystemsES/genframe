#!/usr/bin/env node
/*
 * Banco de pruebas del motor («npm test»). Cada carpeta de pruebas/ es un proyecto mínimo que fuerza un caso difícil
 * (mar con tormenta, multitud entre obstáculos, efectos, textos y mapas). Para cada una:
 *   1. auditar: no puede haber problemas graves (choques, cámara en el agua, textos cortados…);
 *   2. fotos --todas y comparación con su referencia aprobada (pruebas/<x>/referencia.jpg) por similitud (SSIM).
 * «npm test -- --actualizar» guarda las fotos actuales como nuevas referencias (después de mirarlas).
 * «npm test -- mar textos» prueba solo esas.
 */
import fs from 'fs';
import path from 'path';
import {execFile} from 'child_process';
import {promisify} from 'util';
import {fileURLToPath} from 'url';
import {createRequire} from 'module';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'pruebas');
const FFMPEG = createRequire(import.meta.url)('ffmpeg-static');
const args = process.argv.slice(2);
const update = args.includes('--actualizar');
const only = args.filter((a) => !a.startsWith('--'));
const cli = (cmd, ...rest) => run(process.execPath, [path.join(ROOT, 'bin/genframe.mjs'), cmd, ...rest], {cwd: ROOT, maxBuffer: 1 << 26});

const names = fs.readdirSync(DIR).filter((n) => fs.existsSync(path.join(DIR, n, 'plan.json')) && (!only.length || only.includes(n))).sort();
let failed = 0;
for (const name of names) {
  const rel = path.join('pruebas', name);
  const t0 = Date.now();
  const problems = [];
  try { await cli('auditar', rel, '--paso=0.25'); } catch { /* el código de salida 1 solo indica graves: se leen del informe */ }
  const rep = JSON.parse(fs.readFileSync(path.join(DIR, name, 'auditoria.json'), 'utf8'));
  for (const g of rep.graves) problems.push(`grave: ${g.texto} (${g.desde}–${g.hasta} s)`);
  await cli('fotos', rel, '--todas');
  const shot = path.join(DIR, name, 'fotos/todas/hoja.jpg'), ref = path.join(DIR, name, 'referencia.jpg');
  let ssim = null;
  if (update || !fs.existsSync(ref)) fs.copyFileSync(shot, ref);
  else {
    const {stderr} = await run(FFMPEG, ['-hide_banner', '-i', shot, '-i', ref, '-lavfi', '[0][1]scale2ref[a][b];[a][b]ssim', '-f', 'null', '-'], {maxBuffer: 1 << 24}).catch((e) => e);
    const m = /All:([\d.]+)/.exec(String(stderr));
    ssim = m ? Number(m[1]) : 0;
    if (ssim < 0.9) problems.push(`las fotos cambian respecto a la referencia (SSIM ${ssim.toFixed(3)}): míralas y, si el cambio es bueno, «npm test -- --actualizar»`);
  }
  const avisos = rep.avisos.length ? ` · ${rep.avisos.length} avisos` : '';
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  if (problems.length) { failed++; console.log(`✖ ${name} (${secs} s)${avisos}`); problems.forEach((p) => console.log('    ' + p)); }
  else console.log(`✔ ${name} (${secs} s)${ssim !== null ? ` · SSIM ${ssim.toFixed(3)}` : ' · referencia guardada'}${avisos}`);
}
console.log(failed ? `\n${failed} de ${names.length} pruebas fallan` : `\n✔ ${names.length} pruebas superadas`);
process.exit(failed ? 1 : 0);

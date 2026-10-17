/*
 * Cliente de OpenAI del motor. En el laboratorio va directo a la API con OPENAI_API_KEY; en la flota,
 * OPENAI_BASE_URL apunta al proxy del backend (que guarda la clave y apunta el coste) y la clave es el
 * token del trabajador. Cada respuesta es JSON y se reintenta si llega mal o la API falla.
 */
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

// En el laboratorio, la clave vive en explicativo-lab/.env (nunca en el código ni en el chat).
const ENV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env');
if (fs.existsSync(ENV)) {
  for (const line of fs.readFileSync(ENV, 'utf8').split('\n')) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\n]*)"?\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const BASE = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const KEY = process.env.OPENAI_API_KEY || '';
export const MODEL = process.env.OPENAI_EXPLAINER_MODEL || 'gpt-6-luna';
export const usage = {calls: 0, input: 0, output: 0};

/**
 * @param {string} system
 * @param {string|Array} user texto o partes [{type:'text'},{type:'image_url'}]
 * @param {{model?: string, effort?: string, tag?: string}} opts
 */
export async function askJson(system, user, {model = MODEL, effort = process.env.OPENAI_EXPLAINER_EFFORT || 'medium', tag = ''} = {}) {
  if (!KEY) throw new Error('Falta OPENAI_API_KEY');
  let last;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(BASE + '/chat/completions', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + KEY, ...(tag ? {'X-Explainer-Step': tag} : {})},
        body: JSON.stringify({
          model,
          reasoning_effort: effort,
          response_format: {type: 'json_object'},
          messages: [{role: 'system', content: system}, {role: 'user', content: user}],
        }),
        signal: AbortSignal.timeout(240000),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(`OpenAI ${res.status}: ${body.error?.message || JSON.stringify(body).slice(0, 300)}`);
      usage.calls++;
      usage.input += body.usage?.prompt_tokens || 0;
      usage.output += body.usage?.completion_tokens || 0;
      return JSON.parse(body.choices[0].message.content);
    } catch (error) {
      last = error;
      if (/ 40[013]:/.test(error.message)) break;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  throw last;
}

/** Ejecuta tareas con un máximo de `n` a la vez, conservando el orden de los resultados. */
export async function pool(items, n, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({length: Math.min(n, items.length)}, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); }
  }));
  return out;
}

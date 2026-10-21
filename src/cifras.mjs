/**
 * Cifras: qué números dice un guion (en dígitos o con letras, en inglés y en español) y qué números enseña la pantalla.
 * La auditoría avisa de toda cifra en pantalla que el guion no dice: suele ser un dato inventado o una errata.
 */

const EN = {zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  twenties: 20, thirties: 30, forties: 40, fifties: 50, sixties: 60, seventies: 70, eighties: 80, nineties: 90};  // décadas: «the nineteen fifties»
const ES = {cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiun: 21, veintiuno: 21, veintiuna: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300,
  cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500, seiscientos: 600, seiscientas: 600, setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800, novecientos: 900, novecientas: 900};
const SCALE = {hundred: 100, thousand: 1e3, million: 1e6, billion: 1e9, trillion: 1e12, mil: 1e3, millon: 1e6, millones: 1e6, billon: 1e12, billones: 1e12};
const JOIN = new Set(['and', 'y']);  // «one hundred and fifty», «treinta y cinco»
const POINT = new Set(['point', 'coma']);

const plain = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const unit = (w) => (w in EN ? EN[w] : w in ES ? ES[w] : null);
const clean = (n) => String(Math.round(n * 1e6) / 1e6);

/** Valor de un grupo de palabras numéricas («one hundred and fifty» → 150). */
function value(ws) {
  let total = 0, cur = 0;
  for (const w of ws) {
    if (JOIN.has(w)) continue;
    if (w === 'hundred') { cur = (cur || 1) * 100; continue; }
    if (w in SCALE) { total += (cur || 1) * SCALE[w]; cur = 0; continue; }
    cur += unit(w) || 0;
  }
  return total + cur;
}

/** Todos los números que dice un texto: en dígitos y con letras, con las lecturas de años («nineteen thirty-five»). */
export function spokenNumbers(text) {
  const out = new Set();
  for (const m of text.matchAll(/\d[\d.,]*\d|\d/g)) for (const v of digitValues(m[0])) out.add(v);
  // Cada frase y cada inciso por separado: una cifra no salta una coma («eighteen oh five. Ciento…»).
  for (const clause of plain(text).split(/[.,;:!?()«»"“”]+/)) spokenIn(clause.replace(/[-–]/g, ' ').split(/[^a-zñ0-9]+/).filter(Boolean), out);
  return out;
}

function spokenIn(words, out) {
  const groups = [];
  for (let i = 0; i < words.length; i++) {
    // «a», «un», «una» solo cuentan delante de una escala («a hundred», «un millón»).
    const isNum = (w, k) => (['a', 'un', 'una'].includes(w) ? k === i && (words[k + 1] || '') in SCALE : unit(w) !== null || w in SCALE);
    if (!isNum(words[i], i)) continue;
    const g = [];
    let j = i;
    while (j < words.length && (isNum(words[j], j) || (JOIN.has(words[j]) && g.length && isNum(words[j + 1] || '', j + 1)))) g.push(words[j++]);
    // Decimales: «one point five million», «dos coma cinco».
    let dec = '';
    if (POINT.has(words[j]) && unit(words[j + 1] || '') !== null) { j++; while (j < words.length && unit(words[j]) !== null && unit(words[j]) < 10) dec += unit(words[j++]); }
    let scale = 1;
    if (dec) while (j < words.length && words[j] in SCALE) scale *= SCALE[words[j++]];
    const core = g.filter((w) => !(w in SCALE) || w === 'hundred');
    const v = value(g);
    if (dec) { const base = Number(value(core) + '.' + dec); out.add(clean(base)); out.add(clean(base * scale)); }
    out.add(clean(v));
    // Cada escala parcial también vale («150 thousand» → 150 y 150 000).
    if (core.length && core.length < g.length) out.add(clean(value(core)));
    // Años leídos por pares: «nineteen thirty-five» → 1935, «eighteen oh five» → 1805.
    const units = g.filter((w) => !JOIN.has(w)).map((w) => unit(w));
    if (units.length >= 2 && units.length <= 3 && units.every((u) => u !== null) && units[0] >= 10 && units[0] < 100) {
      const rest = units.slice(1).reduce((a, b) => a + b, 0);
      if (rest < 100) out.add(String(units[0] * 100 + rest));
    }
    if (units.length === 2 && units[0] >= 10 && units[0] < 100 && g[1] === 'hundred') out.add(String(units[0] * 100));
    groups.push({i, j, v});
    // «the fifties», «los años cincuenta»: la década del siglo XX.
    if (g.length === 1 && v >= 20 && v <= 90 && v % 10 === 0 && (/ies$/.test(g[0]) || words[i - 1] === 'anos')) out.add(String(1900 + v));
    i = j - 1;
  }
  // Precios: «six dollars and fifty cents» → 6.50, «cuatro euros con cuarenta» → 4.40.
  for (let k = 0; k + 1 < groups.length; k++) {
    const a = groups[k], b = groups[k + 1], mid = words.slice(a.j, b.i);
    if (/^(dollars?|euros?|dolares|pounds?|libras|pesos)$/.test(mid[0] || '') && mid.length <= 2 && b.v < 100) out.add(clean(a.v + b.v / 100));
  }
}

/** Lecturas posibles de una cifra escrita con dígitos («1,500» → 1500; «2.5» → 2.5; «1.500» → 1500). */
function digitValues(tok) {
  const vals = new Set([tok.replace(/[.,]/g, '')]);
  const dot = tok.replace(/,/g, ''), comma = tok.replace(/\./g, '').replace(',', '.');
  for (const s of [dot, comma]) if (/^\d+(\.\d+)?$/.test(s)) vals.add(clean(Number(s)));
  return [...vals];
}

/** Cifras de un texto en pantalla que merece la pena contrastar (de dos dígitos en adelante). */
export function screenNumbers(text) {
  const out = [];
  for (const m of text.matchAll(/\d[\d.,]*\d|\d/g)) {
    const tok = m[0];
    if (tok.replace(/\D/g, '').length < 2) continue;
    // Horas y marcadores de tiempo (12:30) o escalas de mapa no son datos del guion.
    const before = text[m.index - 1] || '', after = text[m.index + tok.length] || '';
    // También coordenadas y grados (40.6°N), numeraciones (Nº 05, #3), códigos (T-101, 55-210) y contadores con ceros (00015).
    const prev = text.slice(Math.max(0, m.index - 3), m.index);
    if (before === ':' || after === ':' || /[#°º]/.test(before + after) || /n[º°o]\.?\s?$/i.test(prev) || /[A-Za-z0-9]-$/.test(prev) || after === '-' || /^0\d/.test(tok)) continue;
    out.push({tok, vals: digitValues(tok)});
  }
  return out;
}

/** Cifras en pantalla que el guion no dice. */
export function unspoken(screenTexts, guion) {
  const said = spokenNumbers(guion);
  const miss = new Map();
  for (const t of screenTexts) for (const n of screenNumbers(t)) if (!n.vals.some((v) => said.has(v)) && !miss.has(n.tok)) miss.set(n.tok, t.trim().slice(0, 60));
  return [...miss].map(([tok, ctx]) => ({tok, ctx}));
}

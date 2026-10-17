/*
 * Interfaz de videojuego sobre todo el vídeo (K.hud): radar con el mapa real, año como marcador,
 * nivel de búsqueda en estrellas, nombre de la zona y rótulos de misión. Se construye una vez con
 * las marcas del guion visual; todo va en la línea de tiempo común.
 *
 * hud: {missions: [{t0, t1, n, title}], marks: [{t, year, wanted, place: {name, lon, lat}}]}
 */
(function () {
  const K = window.K;
  if (!K) return;
  const OUT = '0 0 1px #000, 3px 3px 0 #000, -3px 3px 0 #000, 3px -3px 0 #000, -3px -3px 0 #000, 0 3px 0 #000, 3px 0 0 #000, -3px 0 0 #000, 0 -3px 0 #000';
  const num = (v) => (Math.abs(v) >= 10000 ? Math.round(v).toLocaleString('es-ES') : String(Math.round(v)));
  const yearText = (y) => (y < 0 ? `${num(-y)} a. C.` : `AÑO ${num(y)}`);

  K.hud = function (root, {missions = [], marks = [], duration, counter = null, stars: showStars = true, passedText = null}) {
    const W = K.W, H = K.H, V = K.vertical;
    const hud = K.box(root, 0, 0, {w: W, h: H, style: {pointerEvents: 'none'}});
    const ms = [...marks].sort((a, b) => a.t - b.t);

    /* ---- radar ---- */
    const R = V ? 110 : 128, cx = 60 + R, cy = V ? H - 620 - R : H - 64 - R;
    const radar = K.box(hud, cx - R, cy - R, {w: R * 2, h: R * 2, style: {borderRadius: '50%', overflow: 'hidden', background: '#2a3b4f', boxShadow: '0 0 0 6px #0c0c10, 0 0 0 9px rgba(255,255,255,.18), 0 8px 24px rgba(0,0,0,.5)'}});
    const svg = K.svg(radar, 0, 0, R * 2, R * 2, {overflow: 'hidden'});
    const layer = K.shape(svg, 'g');
    const topo = (K.data.geo || {}).world;
    const SCALE = 2600;
    const proj = d3.geoMercator().scale(SCALE).translate([0, 0]).center([0, 0]);
    if (topo) {
      const fc = topojson.feature(topo, topo.objects.countries);
      const path = d3.geoPath(proj);
      for (const f of fc.features) {
        const [[a, b], [c, d]] = d3.geoBounds(f);
        if (c < -100 || a > 60 || d < 0 || b > 72) continue;
        const dd = path(f);
        if (dd) K.shape(layer, 'path', {d: dd}, {fill: '#5b6b62', stroke: '#90a39a', strokeWidth: 3});
      }
    }
    // Retícula de «calles» para que parezca un radar de ciudad.
    const grid = K.shape(svg, 'g', {}, {opacity: 0.18});
    for (let i = -6; i <= 6; i++) { K.shape(grid, 'line', {x1: R + i * 40, y1: 0, x2: R + i * 40, y2: R * 2}, {stroke: '#fff', strokeWidth: 1}); K.shape(grid, 'line', {x1: 0, y1: R + i * 40, x2: R * 2, y2: R + i * 40}, {stroke: '#fff', strokeWidth: 1}); }
    K.shape(svg, 'path', {d: `M${R} ${R - 16} L${R + 11} ${R + 12} L${R} ${R + 6} L${R - 11} ${R + 12} Z`}, {fill: '#fff', stroke: '#000', strokeWidth: 2.5});
    const north = K.box(hud, cx - 14, cy - R - 26, {w: 28, h: 28, html: 'N', style: {borderRadius: '50%', background: '#0c0c10', color: '#fff', font: "16px 'Russo One'", textAlign: 'center', lineHeight: '28px'}});
    const pos = {x: 0, y: 0, rot: 0};
    const placeXY = (p) => proj([p.lon, p.lat]);
    const applyRadar = () => layer.setAttribute('transform', `translate(${R} ${R}) rotate(${pos.rot}) translate(${-pos.x} ${-pos.y})`);
    const withPlace = ms.filter((m) => m.place && isFinite(m.place.lon));
    if (withPlace.length) { [pos.x, pos.y] = placeXY(withPlace[0].place); }
    let prev = withPlace[0];
    for (const m of withPlace.slice(1)) {
      const [x, y] = placeXY(m.place);
      if (Math.abs(x - pos.x) < 1 && Math.abs(y - pos.y) < 1 && prev && prev.place.name === m.place.name) continue;
      const [px, py] = placeXY(prev.place);
      K.tl.add(pos, {x: [px, x], y: [py, y], duration: 1600, ease: 'inOutSine', onUpdate: applyRadar}, K.ms(m.t));
      prev = m;
    }
    const spin = {r: 0};
    K.tl.add(spin, {r: [-8, 8], duration: K.ms(duration), ease: 'linear', onUpdate: () => { pos.rot = spin.r; applyRadar(); north.style.transform = `rotate(${spin.r}deg)`; }}, 0);
    applyRadar();

    /* ---- marcador de progreso (en lugar del año) ---- */
    if (counter) {
      const box = K.box(hud, W - 70 - 520, 50, {w: 520, style: {textAlign: 'right'}});
      const lab = K.el(box, 'div', {html: `${counter.label} 0/${counter.total}`, style: {font: "58px 'Russo One'", color: '#8fd16f', textShadow: OUT}});
      const bar = K.el(box, 'div', {style: {marginTop: '12px', marginLeft: 'auto', width: '360px', height: '20px', background: 'rgba(0,0,0,.55)', boxShadow: '0 0 0 3px #000'}});
      const fill = K.el(bar, 'div', {style: {width: '0%', height: '100%', background: '#5bbf3a'}});
      counter.steps.forEach((t, i) => {
        K.tl.add(fill, {width: [`${(i / counter.total) * 100}%`, `${((i + 1) / counter.total) * 100}%`], duration: 600, ease: 'outCubic'}, K.ms(t));
        const n = {v: i};
        K.tl.add(n, {v: [i, i + 1], duration: 300, onUpdate: () => { lab.textContent = `${counter.label} ${Math.round(n.v)}/${counter.total}`; }}, K.ms(t));
        K.tl.add(lab, {scale: [1.2, 1], duration: 450, ease: 'outBack'}, K.ms(t));
      });
    }
    /* ---- año como marcador ---- */
    const yearEl = K.box(hud, W - 70 - 520, 54, {w: 520, html: '', style: {textAlign: 'right', font: "62px 'Russo One'", color: '#8fd16f', textShadow: OUT, letterSpacing: '.02em', display: counter || !ms.some((m) => isFinite(m.year) && m.year !== null) ? 'none' : 'block'}});
    const yr = {v: (ms.find((m) => isFinite(m.year)) || {year: 0}).year};
    yearEl.textContent = yearText(yr.v);
    let lastYear = yr.v;
    for (const m of ms) {
      if (!isFinite(m.year) || m.year === lastYear) continue;
      const from = lastYear;
      K.tl.add(yr, {v: [from, m.year], duration: K.ms(Math.min(2.4, 0.6 + Math.log10(1 + Math.abs(m.year - from)) * 0.5)), ease: 'outCubic', onUpdate: () => { yearEl.textContent = yearText(yr.v); }}, K.ms(m.t));
      K.tl.add(yearEl, {scale: [1.18, 1], duration: 500, ease: 'outBack'}, K.ms(m.t));
      lastYear = m.year;
    }

    /* ---- nivel de búsqueda ---- */
    const stars = [];
    const starPath = 'M20 2 L25.3 14.2 L38.5 15.4 L28.5 24.2 L31.4 37.2 L20 30.4 L8.6 37.2 L11.5 24.2 L1.5 15.4 L14.7 14.2 Z';
    for (let i = 0; i < (showStars ? 5 : 0); i++) {
      const s = K.svg(hud, W - 70 - (5 - i) * 50, 136, 40, 40);
      stars.push(K.shape(s, 'path', {d: starPath}, {fill: 'rgba(0,0,0,.35)', stroke: '#000', strokeWidth: 3}));
    }
    let level = 0;
    for (const m of ms) {
      if (!isFinite(m.wanted)) continue;
      const w = Math.max(0, Math.min(5, Math.round(m.wanted)));
      if (w === level) continue;
      stars.forEach((s, i) => {
        const on = i < w, was = i < level;
        if (on === was) return;
        K.tl.add(s, {fill: on ? ['rgba(0,0,0,.35)', '#ffffff'] : ['#ffffff', 'rgba(0,0,0,.35)'], duration: 200}, K.ms(m.t));
        if (on) for (let k = 0; k < 4; k++) K.tl.add(s, {opacity: [1, 0.2, 1], duration: 360}, K.ms(m.t + 0.3 + k * 0.4));
      });
      level = w;
    }

    /* ---- nombre de la zona ---- */
    let lastPlace = null;
    for (const m of ms) {
      if (!m.place || !m.place.name || m.place.name === lastPlace) continue;
      lastPlace = m.place.name;
      const el = K.box(hud, W - 90 - (V ? 700 : 900), V ? 1210 : 820, {w: V ? 700 : 900, html: m.place.name, style: {textAlign: 'right', font: "italic 66px 'Bangers'", letterSpacing: '.03em', color: '#fff', textShadow: OUT, opacity: 0}});
      K.show(el, m.t + 0.4, {from: {x: 30}, dur: 0.5});
      K.hide(el, m.t + 3.6, {dur: 0.6});
    }

    /* ---- misiones ---- */
    for (const mi of missions) {
      const card = K.box(hud, 0, V ? 620 : 330, {w: W, style: {textAlign: 'center', opacity: 0}});
      K.el(card, 'div', {html: mi.label || `MISIÓN ${mi.n}`, style: {font: "44px 'Russo One'", color: '#fff', textShadow: OUT, letterSpacing: '.18em'}});
      K.el(card, 'div', {html: mi.title, style: {font: "130px 'Bangers'", color: '#f2c14e', textShadow: OUT + ', 0 10px 30px rgba(0,0,0,.6)', letterSpacing: '.03em', lineHeight: 1}});
      K.show(card, mi.t0 + 0.15, {from: {scale: 1.25}, dur: 0.45, ease: 'outBack'});
      K.hide(card, mi.t0 + (mi.hold || 2.9), {dur: 0.5, to: {scale: 0.9}});
      if (passedText && mi.passed !== false) {
        const done = K.box(hud, 0, V ? 1180 : 880, {w: W, html: passedText, style: {textAlign: 'center', opacity: 0, font: "46px 'Russo One'", color: '#8fd16f', textShadow: OUT, letterSpacing: '.08em'}});
        K.show(done, mi.t1 - 1.6, {from: {y: 16}, dur: 0.3});
        K.hide(done, mi.t1 - 0.2, {dur: 0.3});
      } else if (mi.passed !== false && mi.t1 - mi.t0 > 12) {
        const done = K.box(hud, 0, V ? 640 : 360, {w: W, style: {textAlign: 'center', opacity: 0}});
        K.el(done, 'div', {html: '¡MISIÓN SUPERADA!', style: {font: "120px 'Bangers'", color: '#f2c14e', textShadow: OUT, letterSpacing: '.03em'}});
        K.el(done, 'div', {html: 'RESPETO +', style: {font: "48px 'Russo One'", color: '#fff', textShadow: OUT, letterSpacing: '.1em'}});
        K.show(done, mi.t1 - 2.8, {from: {scale: 0.7}, dur: 0.4, ease: 'outBack'});
        K.hide(done, mi.t1 - 0.4, {dur: 0.35});
      }
    }
    return hud;
  };
})();

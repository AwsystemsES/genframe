/*
 * Caja de herramientas del vídeo explicativo (K).
 *
 * Cada escena es una función que recibe K, su contenedor (K.W×K.H: 1920×1080 o, en vertical, 1080×1920) y sus tiempos absolutos, y
 * describe lo que pasa con una única línea de tiempo de anime.js que HyperFrames mueve fotograma a
 * fotograma. Nada depende del reloj real ni del azar sin semilla: el mismo vídeo sale siempre igual.
 * Todo lo que se sincroniza con la voz usa K.cue('palabra'): el momento exacto en que se dice.
 */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const D = window.KIT_DATA || {};
  const tl = anime.createTimeline({autoplay: false, duration: Math.round((D.duration || 1) * 1000)});
  const frameHooks = [];
  let seedCounter = 1;
  const strip = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]/g, '');
  const words = (D.words || []).map((w) => ({...w, k: strip(w.t)}));

  const K = {
    tl, data: D, words,
    W: D.width || 1920, H: D.height || 1080, vertical: (D.height || 1080) > (D.width || 1920),
    /** Zona segura: los subtítulos ocupan la franja inferior; en vertical, además, la parte de abajo y la columna derecha son de la interfaz de Shorts. */
    safe: (D.height || 1080) > (D.width || 1920) ? {top: 200, bottom: 1200, left: 70, right: 940} : {top: 90, bottom: 860, left: 90, right: 1830},
    ms: (s) => Math.max(0, Math.round(s * 1000)),
    clamp: (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)),
    ramp: (t, a, b) => Math.max(0, Math.min(1, (t - a) / Math.max(1e-6, b - a))),
    smooth: (x) => x * x * (3 - 2 * x),
    stagger: (v, o) => anime.stagger(v, o),
    palette: D.palette || {},

    /** Instante (s) en que la voz dice la palabra que empieza por `text` (sin tildes ni signos), a partir de `after`. */
    cue(text, {after = 0, nth = 0, fallback = null} = {}) {
      const key = strip(text).slice(0, 14);
      const hits = words.filter((w) => w.a >= after - 0.05 && key && w.k.startsWith(key));
      if (hits[nth]) return hits[nth].a;
      return fallback ?? after;
    },
    /** Instante en que termina esa palabra. */
    cueEnd(text, opts = {}) {
      const a = K.cue(text, opts);
      const w = words.find((x) => Math.abs(x.a - a) < 1e-6);
      return w ? w.b : a + 0.4;
    },
    /** Palabras de un tramo (para quien quiera repartir elementos por la frase). */
    wordsBetween: (a, b) => words.filter((w) => w.a >= a - 0.01 && w.a < b),

    /** Generador aleatorio con semilla (nunca Math.random). */
    rand(seed = seedCounter++) {
      let s = seed | 0;
      return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    },

    /* ---------------- construcción ---------------- */
    el(parent, tag = 'div', {cls = '', style = {}, html = '', attrs = {}} = {}) {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      Object.assign(n.style, style);
      for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
      if (html) n.innerHTML = html;
      parent.appendChild(n);
      return n;
    },
    /** Elemento absoluto en (x, y) del contenedor. */
    box(parent, x, y, {w, h, cls = '', style = {}, html = ''} = {}) {
      return K.el(parent, 'div', {cls, html, style: {position: 'absolute', left: x + 'px', top: y + 'px', ...(w ? {width: w + 'px'} : {}), ...(h ? {height: h + 'px'} : {}), ...style}});
    },
    svg(parent, x = 0, y = 0, w = K.W, h = K.H, {viewBox = null, overflow = 'visible'} = {}) {
      const s = document.createElementNS(NS, 'svg');
      s.setAttribute('width', w); s.setAttribute('height', h); s.setAttribute('viewBox', viewBox || `0 0 ${w} ${h}`);
      Object.assign(s.style, {position: 'absolute', left: x + 'px', top: y + 'px', overflow});
      parent.appendChild(s);
      return s;
    },
    shape(parent, tag, attrs = {}, style = {}) {
      const n = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
      Object.assign(n.style, style);
      parent.appendChild(n);
      return n;
    },
    /** Trazo a mano (rough.js) con semilla fija: line, rectangle, ellipse, circle, curve, linearPath, polygon, path, arc. */
    rough(svgEl, kind, args, opts = {}) {
      const node = rough.svg(svgEl)[kind](...args, {seed: seedCounter++, roughness: 1.3, bowing: 1.1, stroke: K.palette.ink || '#111', strokeWidth: 3, ...opts});
      svgEl.appendChild(node);
      return node;
    },
    /** Icono vectorial por nombre (Lucide/Tabler incluidos en el vídeo). */
    icon(parent, name, x, y, size = 64, {color = K.palette.ink || '#111', stroke = 1.8} = {}) {
      const svg = (D.icons || {})[name];
      const n = K.box(parent, x, y, {w: size, h: size, html: svg || ''});
      const s = n.querySelector('svg');
      if (s) { s.setAttribute('width', size); s.setAttribute('height', size); s.style.stroke = color; s.style.strokeWidth = stroke; s.style.color = color; }
      return n;
    },
    /** Bandera de un país por su código ISO de dos letras ('es', 'fr'…). */
    flag(parent, iso2, x, y, w = 120) {
      const svg = (D.flags || {})[String(iso2).toLowerCase()];
      const n = K.box(parent, x, y, {w, h: Math.round(w * 0.75), html: svg || ''});
      const s = n.querySelector('svg');
      if (s) { s.setAttribute('width', w); s.setAttribute('height', Math.round(w * 0.75)); s.setAttribute('preserveAspectRatio', 'xMidYMid slice'); }
      n.style.boxShadow = '0 6px 18px rgba(0,0,0,.25)';
      return n;
    },
    /** Envuelve cada palabra de un texto en un span para animarlas por separado. */
    splitWords(el) {
      const parts = el.textContent.split(/(\s+)/);
      el.textContent = '';
      return parts.filter((p) => p.length).map((p) => /^\s+$/.test(p) ? (el.appendChild(document.createTextNode(p)), null) : K.el(el, 'span', {html: p, style: {display: 'inline-block'}})).filter(Boolean);
    },

    /* ---------------- animación ---------------- */
    /** Animación genérica de anime.js en el instante t (s). Los valores son [desde, hasta]. */
    anim(target, t, props, dur = 0.6, ease = 'outCubic') {
      tl.add(target, {...props, duration: K.ms(dur), ease}, K.ms(t));
    },
    /** Aparece en t; `from` define el punto de partida (y, x, scale, rotate…). */
    show(target, t, {from = {y: 24}, dur = 0.6, ease = 'outCubic', stagger = 0} = {}) {
      const list = target instanceof Element ? [target] : [...target];
      list.forEach((n) => { n.style.opacity = 0; });
      const props = {opacity: [0, 1]};
      for (const [k, v] of Object.entries(from)) Object.assign(props, K._prop(k, v, true));
      tl.add(list, {...props, duration: K.ms(dur), ease, ...(stagger ? {delay: anime.stagger(K.ms(stagger))} : {})}, K.ms(t));
    },
    hide(target, t, {dur = 0.4, to = {}} = {}) {
      const props = {opacity: [1, 0]};
      for (const [k, v] of Object.entries(to)) Object.assign(props, K._prop(k, v, false));
      tl.add(target, {...props, duration: K.ms(dur), ease: 'inQuad'}, K.ms(t));
    },
    /** Par [desde, hasta] de una propiedad de show/hide: lo «normal» es sin desplazar, escala 1, opacidad 1 y sin desenfoque. */
    _prop(k, v, entering) {
      const map = {x: 'translateX', y: 'translateY', scale: 'scale', rotate: 'rotate', scaleX: 'scaleX', scaleY: 'scaleY', blur: 'filter', opacity: 'opacity'};
      const name = map[k] || k;
      let rest;
      if (name.startsWith('scale')) rest = 1;
      else if (name === 'filter' || k === 'blur') { const px = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^\d.]/g, '')) || 8; return {filter: entering ? ['blur(' + px + 'px)', 'blur(0px)'] : ['blur(0px)', 'blur(' + px + 'px)']}; }
      else if (['translateX', 'translateY', 'rotate'].includes(name)) rest = 0;
      else return {};
      if (name === 'opacity') return entering ? {opacity: [v, 1]} : {opacity: [1, v]};
      return {[name]: entering ? [v, rest] : [rest, v]};
    },
    /** Dibuja un trazo SVG (o todos los de un grupo) como si se hiciera a mano. */
    draw(node, t, dur = 0.8, ease = 'inOutSine') {
      const paths = ['path', 'line', 'polyline', 'circle', 'ellipse', 'rect', 'polygon'].includes(node.tagName) ? [node] : [...node.querySelectorAll('path,line,polyline,circle,ellipse,rect,polygon')];
      paths.forEach((p, i) => {
        const len = (p.getTotalLength && p.getTotalLength()) || 2000;
        p.style.strokeDasharray = `${len}`;
        p.style.strokeDashoffset = `${len}`;
        const each = dur / Math.max(1, paths.length);
        tl.add(p, {strokeDashoffset: [len, 0], duration: K.ms(Math.max(0.12, each * 1.6)), ease}, K.ms(t + i * each * 0.6));
      });
      // Los rótulos de un grupo (flechas, esquemas) aparecen al terminar el trazo.
      if (node.querySelectorAll) node.querySelectorAll('text').forEach((tx) => { tx.style.opacity = 0; tl.add(tx, {opacity: [0, 1], duration: 250}, K.ms(t + dur * 0.8)); });
    },
    /** Revela un elemento como una cortina (izquierda, derecha, arriba, abajo). */
    reveal(el, t, dur = 0.8, dir = 'left', ease = 'inOutSine') {
      const from = {left: 'inset(0 100% 0 0)', right: 'inset(0 0 0 100%)', top: 'inset(0 0 100% 0)', bottom: 'inset(100% 0 0 0)'}[dir];
      el.style.clipPath = from;
      tl.add(el, {clipPath: [from, 'inset(0% 0% 0% 0%)'], duration: K.ms(dur), ease}, K.ms(t));
    },
    /** Escribe un texto letra a letra. */
    typeOn(el, t, dur = 1) {
      const text = el.textContent;
      el.textContent = '';
      const spans = [...text].map((c) => K.el(el, 'span', {html: c === ' ' ? '&nbsp;' : c, style: {opacity: 0}}));
      spans.forEach((s, i) => tl.add(s, {opacity: [0, 1], duration: 30}, K.ms(t + (dur * i) / spans.length)));
    },
    /** Número que sube con formato español (puntos de miles, coma decimal). */
    count(el, t, from, to, {dur = 1.4, decimals = 0, prefix = '', suffix = '', ease = 'outExpo'} = {}) {
      const fmt = new Intl.NumberFormat('es-ES', {minimumFractionDigits: decimals, maximumFractionDigits: decimals});
      const o = {v: from};
      el.textContent = prefix + fmt.format(from) + suffix;
      tl.add(o, {v: [from, to], duration: K.ms(dur), ease, onUpdate: () => { el.textContent = prefix + fmt.format(o.v) + suffix; }}, K.ms(t));
    },
    /** Llama a fn(t) en cada fotograma (partículas, olas, lluvia…). Debe dibujar solo según t. */
    onFrame(fn) { frameHooks.push(fn); },
    /** Cámara sobre un elemento grande: tomas [t, x, y, escala] con transición suave; nunca enseña fuera de sus bordes. */
    camera(target, shots, {w = K.W, h = K.H, dur = 1.6} = {}) {
      const cam = {x: shots[0][1], y: shots[0][2], s: shots[0][3]};
      const apply = () => {
        const tx = K.clamp(K.W / 2 - cam.x * cam.s, K.W - w * cam.s, 0), ty = K.clamp(K.H / 2 - cam.y * cam.s, K.H - h * cam.s, 0);
        target.style.transformOrigin = '0 0';
        target.style.transform = `translate(${tx}px, ${ty}px) scale(${cam.s})`;
      };
      for (let k = 1; k < shots.length; k++) {
        const [, x0, y0, s0] = shots[k - 1], [t1, x1, y1, s1] = shots[k];
        tl.add(cam, {x: [x0, x1], y: [y0, y1], s: [s0, s1], duration: K.ms(dur), ease: 'inOutSine', onUpdate: apply}, K.ms(t1));
      }
      apply();
    },

    /* ---------------- mapas reales ---------------- */
    map: {
      /** Países del mundo (Natural Earth). focus: códigos ISO2 a encuadrar o caja [[lonO,latS],[lonE,latN]]. */
      world(parent, {x = 0, y = 0, w = K.W, h = K.H, projection = 'equalEarth', focus = null, rotate = null, fill = 'rgba(0,0,0,.06)', stroke = K.palette.ink || '#222', strokeWidth = 1} = {}) {
        const topo = (D.geo || {}).world;
        const fc = topojson.feature(topo, topo.objects.countries);
        const iso = {};
        for (const [a2, v] of Object.entries(D.countries || {})) iso[v.n] = a2.toLowerCase();
        const proj = d3['geo' + projection[0].toUpperCase() + projection.slice(1)]();
        if (rotate) proj.rotate(rotate);
        let target = fc;
        if (Array.isArray(focus) && typeof focus[0] === 'string') target = {type: 'FeatureCollection', features: fc.features.filter((f) => focus.includes(iso[f.id]))};
        else if (Array.isArray(focus)) { const [[a, b], [c, d]] = focus; target = {type: 'Feature', geometry: {type: 'Polygon', coordinates: [[[a, b], [a, d], [c, d], [c, b], [a, b]]]}}; }
        proj.fitExtent([[0, 0], [w, h]], target);
        const svg = K.svg(parent, x, y, w, h, {overflow: 'hidden'});
        const path = d3.geoPath(proj);
        const countries = {};
        for (const f of fc.features) {
          const d = path(f);
          if (!d) continue;
          const p = K.shape(svg, 'path', {d}, {fill, stroke, strokeWidth, strokeLinejoin: 'round'});
          const code = iso[f.id];
          if (code) countries[code] = p;
        }
        return {svg, countries, project: (lonlat) => proj(lonlat), centroid: (code) => { const f = fc.features.find((g) => iso[g.id] === code); return f ? path.centroid(f) : null; }, name: (code) => (D.countries[String(code).toUpperCase()] || {}).es};
      },
      /** España por comunidades autónomas o provincias (IGN), con Canarias en un recuadro. */
      spain(parent, {x = 0, y = 0, w = 900, h = 760, level = 'ccaa', fill = 'rgba(255,255,255,.6)', stroke = K.palette.ink || '#222', strokeWidth = 1.4} = {}) {
        const topo = (D.geo || {})[level === 'provinces' ? 'provinces' : 'ccaa'];
        const fc = topojson.feature(topo, topo.objects[Object.keys(topo.objects)[0]]);
        const isCan = (f) => /canari|palmas|tenerife/i.test(f.properties.name);
        const main = {type: 'FeatureCollection', features: fc.features.filter((f) => !isCan(f) && f.id !== '20')};
        const can = {type: 'FeatureCollection', features: fc.features.filter(isCan)};
        const pm = d3.geoConicConformal().rotate([3.5, 0]).parallels([36, 43]).fitExtent([[0, 0], [w, h * 0.84]], main);
        const pc = d3.geoConicConformal().rotate([15.5, 0]).parallels([27, 29]).fitExtent([[0, h * 0.86], [w * 0.3, h]], can);
        const svg = K.svg(parent, x, y, w, h);
        const regions = {};
        const centroids = {};
        for (const f of fc.features) {
          if (f.id === '20') continue;
          const path = d3.geoPath(isCan(f) ? pc : pm);
          const p = K.shape(svg, 'path', {d: path(f)}, {fill, stroke, strokeWidth, strokeLinejoin: 'round'});
          regions[f.properties.name] = p;
          centroids[f.properties.name] = path.centroid(f);
        }
        return {svg, regions, centroids, project: (lonlat) => pm(lonlat), names: Object.keys(regions)};
      },
    },
  };

  /* ---------------- personajes de palo ---------------- */
  // Ángulos en grados. Tronco: 0 = recto hacia arriba. Brazos y piernas: 0 = colgando hacia abajo,
  // positivo hacia delante (hacia donde mira el muñeco). Codo y rodilla se suman al tramo superior.
  const POSES = {
    stand: {torso: 0, head: 0, lSh: -8, lEl: 4, rSh: 8, rEl: -4, lHip: -4, lKn: 0, rHip: 4, rKn: 0, lift: 0},
    wave: {torso: -2, head: -4, lSh: -10, lEl: 4, rSh: 160, rEl: 25, lHip: -4, lKn: 0, rHip: 4, rKn: 0, lift: 0},
    point: {torso: 4, head: 6, lSh: -10, lEl: 6, rSh: 92, rEl: 0, lHip: -6, lKn: 0, rHip: 8, rKn: 0, lift: 0},
    pointUp: {torso: -2, head: -14, lSh: -8, lEl: 4, rSh: 150, rEl: 10, lHip: -4, lKn: 0, rHip: 4, rKn: 0, lift: 0},
    think: {torso: 2, head: 10, lSh: 30, lEl: 80, rSh: 60, rEl: 120, lHip: -4, lKn: 0, rHip: 4, rKn: 0, lift: 0},
    shrug: {torso: 0, head: -8, lSh: -55, lEl: -70, rSh: 55, rEl: 70, lHip: -5, lKn: 0, rHip: 5, rKn: 0, lift: 0},
    cheer: {torso: -4, head: -12, lSh: -150, lEl: -15, rSh: 150, rEl: 15, lHip: -10, lKn: 0, rHip: 10, rKn: 0, lift: 0},
    surprised: {torso: -8, head: -10, lSh: -120, lEl: -40, rSh: 120, rEl: 40, lHip: -8, lKn: 0, rHip: 8, rKn: 0, lift: 0},
    explain: {torso: 2, head: 4, lSh: 40, lEl: 50, rSh: 70, rEl: 30, lHip: -5, lKn: 0, rHip: 5, rKn: 0, lift: 0},
    hold: {torso: 0, head: 6, lSh: 70, lEl: 20, rSh: 75, rEl: 20, lHip: -4, lKn: 0, rHip: 4, rKn: 0, lift: 0},
    wings: {torso: 0, head: 0, lSh: -92, lEl: 0, rSh: 92, rEl: 0, lHip: -6, lKn: 0, rHip: 6, rKn: 0, lift: 0},
    sit: {torso: -6, head: 0, lSh: 20, lEl: 40, rSh: 30, rEl: 40, lHip: 90, lKn: -90, rHip: 85, rKn: -85, lift: -0.2},
    sad: {torso: 14, head: 22, lSh: 4, lEl: 0, rSh: 6, rEl: 0, lHip: -3, lKn: 0, rHip: 3, rKn: 0, lift: 0},
  };
  const JOINTS = Object.keys(POSES.stand);
  K.poses = Object.keys(POSES);
  K.stickman = function (parent, x, y, {height = 300, color = K.palette.ink || '#111', stroke = null, facing = 1, pose = 'stand', face = true, head = null} = {}) {
    const H = height, sw = stroke || Math.max(4, H / 36);
    const svg = K.svg(parent, x - H, y - H * 1.15, H * 2, H * 1.3, {overflow: 'visible'});
    const g = K.shape(svg, 'g', {}, {});
    const line = () => K.shape(g, 'path', {}, {fill: 'none', stroke: color, strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round'});
    const parts = {body: line(), lArm: line(), rArm: line(), lLeg: line(), rLeg: line()};
    const headEl = K.shape(g, 'circle', {r: H * 0.1}, {fill: head || K.palette.bg || '#fff', stroke: color, strokeWidth: sw});
    const eye = face ? K.shape(g, 'circle', {r: Math.max(2.5, H * 0.012)}, {fill: color}) : null;
    const st = {...POSES[pose] || POSES.stand, dx: 0, dy: 0, facing};
    const walks = [];
    const L = {torso: H * 0.32, up: H * 0.16, low: H * 0.16, thigh: H * 0.22, shin: H * 0.22, r: H * 0.1};
    const rad = (d) => (d * Math.PI) / 180;
    const fig = {svg, state: st, height: H};
    let last = {...st};
    fig.draw = (t = K.now()) => {
      const s = {...st};
      for (const w of walks) {
        if (t < w.a || t > w.b) continue;
        const p = K.ramp(t, w.a, w.b), e = w.ease ? K.smooth(p) : p;
        s.dx = w.x0 + (w.x1 - w.x0) * e;
        const ph = (t - w.a) * w.rate * Math.PI * 2, amp = w.run ? 42 : 26, fade = Math.min(1, (t - w.a) / 0.2, (w.b - t) / 0.2);
        s.lHip = Math.sin(ph) * amp * fade; s.rHip = -s.lHip;
        s.lKn = -Math.max(0, -Math.sin(ph)) * (w.run ? 70 : 35) * fade; s.rKn = -Math.max(0, Math.sin(ph)) * (w.run ? 70 : 35) * fade;
        s.lSh = -s.lHip * 0.9; s.rSh = -s.rHip * 0.9; s.lEl = w.run ? 70 * fade : 10; s.rEl = w.run ? 70 * fade : 10;
        s.torso = w.run ? 12 * fade : 3 * fade;
        s.dy = -Math.abs(Math.sin(ph)) * H * (w.run ? 0.05 : 0.02);
      }
      const f = s.facing >= 0 ? 1 : -1;
      const hip = [H, H * 1.15 - (L.thigh + L.shin) + s.dy - s.lift * H];
      const tip = (o, ang, len) => [o[0] + Math.sin(rad(ang)) * len * f, o[1] - Math.cos(rad(ang)) * len];
      const limb = (o, a1, a2, l1, l2) => { const k = tip(o, a1, l1); const e = tip(k, a1 + a2, l2); return `M${o[0]} ${o[1]} L${k[0]} ${k[1]} L${e[0]} ${e[1]}`; };
      const neck = tip(hip, s.torso, L.torso);
      const sh = tip(hip, s.torso, L.torso * 0.92);
      parts.body.setAttribute('d', `M${hip[0]} ${hip[1]} L${neck[0]} ${neck[1]}`);
      // Los miembros cuelgan: 180 - ángulo respecto a la vertical hacia arriba.
      parts.lArm.setAttribute('d', limb(sh, 180 - s.lSh, -s.lEl, L.up, L.low));
      parts.rArm.setAttribute('d', limb(sh, 180 - s.rSh, -s.rEl, L.up, L.low));
      parts.lLeg.setAttribute('d', limb(hip, 180 - s.lHip, -s.lKn, L.thigh, L.shin));
      parts.rLeg.setAttribute('d', limb(hip, 180 - s.rHip, -s.rKn, L.thigh, L.shin));
      const hc = tip(neck, s.torso + s.head * 0.5, L.r * 1.05);
      headEl.setAttribute('cx', hc[0]); headEl.setAttribute('cy', hc[1]);
      if (eye) { const ec = tip(hc, s.torso + s.head + 75, L.r * 0.45); eye.setAttribute('cx', ec[0]); eye.setAttribute('cy', ec[1]); }
      svg.style.transform = `translateX(${s.dx}px)`;
      fig.hands = {l: tip(tip(sh, 180 - s.lSh, L.up), 180 - s.lSh - s.lEl, L.low), r: tip(tip(sh, 180 - s.rSh, L.up), 180 - s.rSh - s.rEl, L.low)};
    };
    /** Cambia a una postura (nombre de K.poses u objeto con ángulos) en t, con transición suave. Llamadas en orden temporal. */
    fig.pose = (t, p, dur = 0.45, ease = 'inOutSine') => {
      const target = typeof p === 'string' ? (POSES[p] || POSES.stand) : {...last, ...p};
      const props = {};
      for (const j of JOINTS) if (target[j] !== undefined && target[j] !== last[j]) props[j] = [last[j], target[j]];
      if (Object.keys(props).length) tl.add(st, {...props, duration: K.ms(dur), ease, onUpdate: () => fig.draw()}, K.ms(t));
      last = {...last, ...target};
    };
    /** Camina (o corre con {run: true}) desplazándose dx píxeles entre t0 y t1. */
    fig.walk = (t0, t1, dx, {run = false} = {}) => {
      const x0 = walks.length ? walks[walks.length - 1].x1 : 0;
      walks.push({a: t0, b: t1, x0, x1: x0 + dx, rate: run ? 2.6 : 1.7, run});
      tl.add(st, {dx: [x0, x0 + dx], duration: K.ms(t1 - t0), ease: 'linear', onUpdate: () => fig.draw()}, K.ms(t0));
    };
    /** Se da la vuelta en t. */
    fig.turn = (t) => { const to = -last.facing; tl.add(st, {facing: [last.facing, to], duration: 120, ease: 'linear', onUpdate: () => fig.draw()}, K.ms(t)); last.facing = to; };
    /** Pequeño balanceo de respiración entre t0 y t1 para que no esté congelado. */
    fig.idle = (t0, t1) => frameHooks.push((t) => { if (t >= t0 && t <= t1 && !walks.some((w) => t >= w.a && t <= w.b)) { svg.style.translate = `0 ${Math.sin(t * 2.4) * H * 0.006}px`; } });
    last.facing = facing; last.dx = 0;
    frameHooks.push(() => fig.draw());
    fig.draw(0);
    return fig;
  };

  /** Bocadillo de diálogo o pensamiento sobre (x, y) = punta de la cola; aparece en t y se va en t2. */
  K.bubble = function (parent, x, y, html, t, t2 = null, {w = 420, think = false, side = 1, size = 40} = {}) {
    const b = K.box(parent, x - (side > 0 ? 40 : w - 40), y - 30, {w, cls: 'body', html, style: {transform: 'translateY(-100%)', background: '#fff', color: K.palette.ink || '#111', border: `4px solid ${K.palette.ink || '#111'}`, borderRadius: think ? '50px' : '26px', padding: '18px 26px', fontSize: size + 'px', lineHeight: 1.2, textAlign: 'center'}});
    const tail = K.el(b, 'div', {style: {position: 'absolute', bottom: '-22px', [side > 0 ? 'left' : 'right']: '28px', width: '28px', height: '28px', background: '#fff', borderRight: `4px solid ${K.palette.ink || '#111'}`, borderBottom: `4px solid ${K.palette.ink || '#111'}`, transform: 'rotate(45deg)'}});
    K.show(b, t, {from: {scale: 0.6}, dur: 0.3, ease: 'outBack'});
    if (t2) K.hide(b, t2, {dur: 0.25});
    return b;
  };

  /** Flecha (fuerzas, flujos, recorridos) en un svg: se dibuja con K.draw; label opcional junto a la punta. */
  K.arrow = function (svgEl, x1, y1, x2, y2, {color = K.palette.accent || '#c00', width = 8, head = 26, label = '', labelSize = 38, curve = 0} = {}) {
    const g = K.shape(svgEl, 'g');
    const mx = (x1 + x2) / 2 - (y2 - y1) * curve, my = (y1 + y2) / 2 + (x2 - x1) * curve;
    K.shape(g, 'path', {d: `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`}, {fill: 'none', stroke: color, strokeWidth: width, strokeLinecap: 'round'});
    const a = Math.atan2(y2 - my, x2 - mx);
    const p = (da) => `${x2 - head * Math.cos(a + da)} ${y2 - head * Math.sin(a + da)}`;
    K.shape(g, 'path', {d: `M${p(0.45)} L${x2} ${y2} L${p(-0.45)}`}, {fill: 'none', stroke: color, strokeWidth: width, strokeLinecap: 'round', strokeLinejoin: 'round'});
    if (label) {
      const tx = K.shape(g, 'text', {x: x2 + Math.cos(a) * 20 + (Math.abs(Math.cos(a)) < 0.3 ? 24 : 0), y: y2 + Math.sin(a) * 20 + labelSize * 0.35, 'text-anchor': Math.cos(a) > 0.3 ? 'start' : Math.cos(a) < -0.3 ? 'end' : 'start'}, {fill: color, fontFamily: 'var(--label)', fontSize: labelSize + 'px', fontWeight: 700});
      tx.textContent = label;
    }
    return g;
  };

  // Un único reloj que llama a los dibujos por fotograma.
  const clock = {t: 0};
  K.now = () => clock.t;
  const runHooks = (t) => frameHooks.forEach((fn) => { try { fn(t); } catch (e) { /* una escena no tumba el vídeo */ } });
  // En el render, HyperFrames avisa con «hf-seek» cuando ya ha colocado la línea de tiempo: se dibuja ahí, una vez.
  // Sin ese aviso (vista previa), dibuja el propio reloj.
  let seeks = false;
  window.addEventListener('hf-seek', (e) => { seeks = true; clock.t = Number(e.detail && e.detail.time) || 0; runHooks(clock.t); });
  tl.add(clock, {t: [0, D.duration || 1], duration: K.ms(D.duration || 1), ease: 'linear', onUpdate: () => { if (!seeks) runHooks(clock.t); }}, 0);
  window.K = K;
})();

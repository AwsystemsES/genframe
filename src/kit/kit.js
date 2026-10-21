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
      /**
       * Países del mundo (Natural Earth). focus: códigos ISO2 a encuadrar o caja [[lonO,latS],[lonE,latN]].
       * center [lon, lat]: punto que queda en medio (el globo 'orthographic' mira ahí; los planos giran solo en longitud,
       * útil en el Pacífico). Sin center, se gira hacia lo que se encuadra. rotate es el giro crudo de d3 ([-lon, -lat]).
       * inclinar (grados, 0-65): el mapa se tumba como sobre una mesa vista en perspectiva, con el fondo perdiéndose en
       * bruma; giro (grados) lo gira sobre la mesa. Lo que se dibuje en m.svg o en m.capa() va tumbado con el mapa; m.screen
       * da la posición en pantalla de un [lon, lat] y K.map.labels pone los rótulos de pie, encima, en su sitio.
       */
      world(parent, {x = 0, y = 0, w = K.W, h = K.H, projection = 'equalEarth', focus = null, center = null, rotate = null, fill = 'rgba(0,0,0,.06)', stroke = K.palette.ink || '#222', strokeWidth = 1, bleed = 'auto', fade = 'auto', inclinar = 0, giro = 0, perspectiva = 1700, bruma = 0.35} = {}) {
        const topo = (D.geo || {}).world;
        const fc = topojson.feature(topo, topo.objects.countries);
        const iso = {};
        for (const [a2, v] of Object.entries(D.countries || {})) iso[v.n] = a2.toLowerCase();
        let target = fc;
        if (Array.isArray(focus) && typeof focus[0] === 'string') {
          const codes = focus.map((c) => String(c).toLowerCase());
          target = {type: 'FeatureCollection', features: fc.features.filter((f) => codes.includes(iso[f.id]))};
          if (!target.features.length) target = fc;
        } else if (Array.isArray(focus)) {
          const [[a, b], [c, d]] = focus;
          const e = c < a ? c + 360 : c;
          const ring = [];
          for (let i = 0; i <= 8; i++) ring.push([a + (e - a) * i / 8, b]);
          for (let i = 8; i >= 0; i--) ring.push([a + (e - a) * i / 8, d]);
          ring.push([a, b]);
          target = {type: 'Feature', geometry: {type: 'Polygon', coordinates: [ring]}};
          if (d3.geoArea(target) > 2 * Math.PI) target.geometry.coordinates = [ring.slice().reverse()];
        }
        const globe = projection === 'orthographic';
        const proj = d3['geo' + projection[0].toUpperCase() + projection.slice(1)]();
        if (rotate) proj.rotate(rotate);
        else if (center || globe || target !== fc) {
          const [lon, lat] = center || (target === fc ? [10, 25] : d3.geoCentroid(target));
          proj.rotate(globe ? [-lon, -lat] : [-lon, 0]);
        }
        if (globe && target === fc) proj.fitExtent([[0, 0], [w, h]], {type: 'Sphere'});
        else proj.fitExtent([[0, 0], [w, h]], target);
        // A sangre: un mapa grande (fondo) sigue dibujándose fuera de su caja hasta el borde del lienzo, sin cortes rectos.
        // Las coordenadas siguen siendo las de la caja (project, centroid y lo que se dibuje en svg). Uno pequeño se funde en sus bordes.
        const toBleed = bleed === 'auto' ? w >= K.W * 0.6 : !!bleed;
        // Mesa inclinada: una capa del tamaño del lienzo, tumbada alrededor del centro del mapa.
        const tilt = K.clamp(inclinar, 0, 65), ocx = x + w / 2, ocy = y + h / 2;
        // Tumbado, el borde cercano se agranda y el lejano se ve: la mesa (y lo que lleva) se extiende M más allá del lienzo.
        let mesa = null;
        const M = tilt || giro ? Math.round(K.W * 0.45) : 0;
        if (tilt || giro) {
          const host = parent;
          mesa = K.el(host, 'div', {style: {position: 'absolute', left: -M + 'px', top: -M + 'px', width: K.W + 2 * M + 'px', height: K.H + 2 * M + 'px', transformOrigin: `${ocx + M}px ${ocy + M}px`, transform: `perspective(${perspectiva}px) rotateX(${tilt}deg) rotateZ(${giro}deg)`}});
          // Lo lejano se pierde en bruma en vez de acabar en un borde recto.
          if (bruma > 0) { const top = (q) => Math.round(((M + K.H * q) / (K.H + 2 * M)) * 100), m = `linear-gradient(180deg, transparent ${top(0)}%, rgba(0,0,0,${(1 - bruma).toFixed(2)}) ${top(0.12 + tilt / 300)}%, #000 ${top(0.34 + tilt / 300)}%)`; mesa.style.webkitMaskImage = mesa.style.maskImage = m; }
          parent = mesa;
        }
        const svg = toBleed ? K.svg(parent, 0, 0, K.W + 2 * M, K.H + 2 * M, {viewBox: `${-x - M} ${-y - M} ${K.W + 2 * M} ${K.H + 2 * M}`, overflow: 'hidden'}) : K.svg(parent, x + M, y + M, w, h, {overflow: 'hidden'});
        if (!toBleed && (fade === 'auto' || fade)) { const m = 'linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent), linear-gradient(180deg, transparent, #000 6%, #000 94%, transparent)'; svg.style.webkitMaskImage = svg.style.maskImage = m; svg.style.webkitMaskComposite = 'source-in'; svg.style.maskComposite = 'intersect'; }
        const path = d3.geoPath(proj);
        const countries = {};
        for (const f of fc.features) {
          const d = path(f);
          if (!d) continue;
          const p = K.shape(svg, 'path', {d}, {fill, stroke, strokeWidth, strokeLinejoin: 'round'});
          const code = iso[f.id];
          if (code) countries[code] = p;
        }
        // Pantalla de un punto de la mesa (coordenadas del lienzo): la misma cuenta que hace el navegador con la perspectiva.
        const a = (tilt * Math.PI) / 180, gz = (giro * Math.PI) / 180;
        const toScreen = (X, Y) => {
          if (!mesa) return [X, Y];
          let px = X - ocx, py = Y - ocy;
          [px, py] = [px * Math.cos(gz) - py * Math.sin(gz), px * Math.sin(gz) + py * Math.cos(gz)];
          const y2 = py * Math.cos(a), z2 = py * Math.sin(a), k = perspectiva / (perspectiva - z2);
          return [ocx + px * k, ocy + y2 * k];
        };
        // m.capa(): un svg tumbado con el mapa, en coordenadas del lienzo (como m.project + box), para rutas, zonas y puntos.
        return {svg, mesa, countries, box: {x, y, w, h}, inclinado: !!mesa, capa: () => K.svg(mesa || parent, M, M, K.W, K.H), project: (lonlat) => proj(lonlat),
          screen: (lonlat) => { const q = proj(lonlat); return q ? toScreen(q[0] + x, q[1] + y) : null; }, centroid: (code) => { const f = fc.features.find((g) => iso[g.id] === code); return f ? path.centroid(f) : null; }, name: (code) => (D.countries[String(code).toUpperCase()] || {}).es};
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

  /* ---------------- dibujos fabricados por el taller ---------------- */
  /**
   * Los personajes e ilustraciones 2D de cada vídeo los fabrica el taller (no hay biblioteca). Cada uno es
   * build(K, g, params): dibuja en el grupo SVG `g` dentro de una caja de 1000×1000 (pies o base en y = 1000,
   * centrado en x = 500) y puede devolver {actions: {nombre(fase, intensidad)}}. Las partes animables son
   * grupos <g data-part="nombre" data-pivot="x y"> (el pivote en coordenadas de la caja).
   */
  K.drawings = {};
  K.defineDrawing = (id, build, info = {}) => { K.drawings[id] = {build, ...info}; };
  /** Coloca un dibujo fabricado: (x, y) = centro de su base, `size` = alto en px. Devuelve {el, svg, parts, act(nombre, t0, t1, {rate})}. */
  K.figure = function (id, parent, x, y, {size = 400, flip = false, ...params} = {}) {
    const d = K.drawings[id];
    if (!d) throw new Error('Dibujo no fabricado: ' + id + ' (hay: ' + Object.keys(K.drawings).join(', ') + ')');
    const svg = K.svg(parent, x - size / 2, y - size, size, size, {viewBox: '0 0 1000 1000'});
    const g = K.shape(svg, 'g', flip ? {transform: 'translate(1000 0) scale(-1 1)'} : {});
    const out = d.build(K, g, params) || {};
    const parts = {};
    g.querySelectorAll('[data-part]').forEach((n) => {
      parts[n.getAttribute('data-part')] = n;
      const pv = (n.getAttribute('data-pivot') || '').split(/[ ,]+/).map(Number);
      if (pv.length === 2 && pv.every(Number.isFinite)) { n.style.transformBox = 'view-box'; n.style.transformOrigin = `${pv[0]}px ${pv[1]}px`; }
    });
    const actions = out.actions || {};
    return {el: svg, svg, g, parts, actions: Object.keys(actions), act(name, t0, t1, {rate = 1, fade = 0.25} = {}) {
      const fn = actions[name];
      if (!fn) return;
      frameHooks.push((t) => { if (t >= t0 && t <= t1) fn((t - t0) * rate, Math.min(1, (t - t0) / fade, (t1 - t) / fade), parts); });
    }};
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

  /**
   * Rótulos de lugares sobre un mapa de K.map.world sin solapes: cada nombre busca un hueco alrededor de su punto
   * (arriba, abajo, a los lados, cada vez más lejos), dentro de la zona segura, y si queda lejos lleva línea guía.
   * items: [{text, ll: [lon, lat], color}]. opts: parent (por defecto el padre del mapa), size, color, t (aparecen), stagger, dot.
   * Devuelve [{el, line, dot, x, y}] (x, y del punto en el lienzo).
   */
  K.map.labels = function (m, items, {parent = null, size = K.vertical ? 46 : 40, color = K.palette.accent || '#e5ad58', t = null, stagger = 0.25, dot = true, font = 'title'} = {}) {
    // En un mapa inclinado los rótulos van de pie, fuera de la mesa, sobre la posición en pantalla de cada punto.
    const host = parent || (m.mesa ? m.mesa.parentNode : m.svg.parentNode);
    const ox = m.box ? m.box.x : 0, oy = m.box ? m.box.y : 0;
    const sv = K.svg(host, 0, 0, K.W, K.H);
    const pts = items.map((it) => { if (m.inclinado) return m.screen(it.ll); const [px, py] = m.project(it.ll); return [px + ox, py + oy]; });
    const placed = [], out = [];
    const S = K.safe, pad = 12;
    // Los textos que ya hay en pantalla (titulares, rótulos) también cuentan como ocupados.
    const lay = (el) => { let x = 0, y = 0, n = el; while (n && n !== host && n.id !== 'root') { x += n.offsetLeft || 0; y += n.offsetTop || 0; n = n.offsetParent; } return {x0: x, y0: y, x1: x + el.offsetWidth, y1: y + el.offsetHeight}; };
    (host.closest('.scene-root') || host).querySelectorAll('.title, .label, [data-fit="si"]').forEach((el) => { if (el.offsetWidth) placed.push(lay(el)); });
    const fits = (r) => r.x0 >= S.left && r.x1 <= S.right && r.y0 >= S.top && r.y1 <= S.bottom && !placed.some((q) => r.x0 < q.x1 + pad && r.x1 > q.x0 - pad && r.y0 < q.y1 + pad && r.y1 > q.y0 - pad) && !pts.some(([px, py]) => px > r.x0 - 16 && px < r.x1 + 16 && py > r.y0 - 16 && py < r.y1 + 16);
    items.forEach((it, i) => {
      const [px, py] = pts[i], wd = String(it.text).length * size * 0.66 + 8, ht = size * 1.15;
      const dirs = K.vertical ? [[0, -1], [0, 1], [1, 0], [-1, 0], [1, -1], [-1, -1], [1, 1], [-1, 1]] : [[1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [-1, -1], [1, 1], [-1, 1]];
      let best = null;
      for (const d of [1.1, 2, 3, 4.2, 5.5]) {
        for (const [dx, dy] of dirs) {
          const cx = px + dx * (wd / 2 + size * 0.5) * (dx ? 1 : 0) + dx * size * (d - 1), cy = py + dy * (ht / 2 + size * 0.4) + dy * size * (d - 1) * 1.2;
          const r = {x0: cx - wd / 2, x1: cx + wd / 2, y0: cy - ht / 2, y1: cy + ht / 2, cx, cy, d};
          if (fits(r)) { best = r; break; }
        }
        if (best) break;
      }
      if (!best) { const cx = K.clamp(px, S.left + wd / 2, S.right - wd / 2), cy = py - ht; best = {x0: cx - wd / 2, x1: cx + wd / 2, y0: cy - ht / 2, y1: cy + ht / 2, cx, cy, d: 1}; }
      placed.push(best);
      const c = it.color || color;
      const el = K.box(host, best.x0, best.y0, {w: wd, cls: font, html: it.text, style: {fontSize: size + 'px', lineHeight: ht + 'px', textAlign: 'center', color: c, whiteSpace: 'nowrap', textShadow: '0 3px 0 rgba(0,0,0,.35), 0 8px 22px rgba(0,0,0,.55)'}});
      const ex = K.clamp(px, best.x0, best.x1), ey = py < best.y0 ? best.y0 : py > best.y1 ? best.y1 : best.cy;
      const line = Math.hypot(ex - px, ey - py) > size * 0.6 ? K.shape(sv, 'line', {x1: px, y1: py, x2: ex, y2: ey}, {stroke: c, strokeWidth: 4, strokeLinecap: 'round'}) : null;
      const dt = dot ? K.shape(sv, 'circle', {cx: px, cy: py, r: Math.max(8, size * 0.28)}, {fill: c, stroke: '#101C29', strokeWidth: 4, transformBox: 'fill-box', transformOrigin: 'center'}) : null;
      if (t !== null) { const ti = typeof it.t === 'number' ? it.t : t + i * stagger; if (dt) K.show(dt, ti - 0.05, {from: {scale: 0}, dur: 0.3, ease: 'outBack'}); if (line) K.draw(line, ti, 0.25); K.show(el, ti + 0.05, {from: {y: py < best.cy ? 16 : -16}, dur: 0.3}); }
      out.push({el, line, dot: dt, x: px, y: py});
    });
    return out;
  };

  /**
   * Titular que nunca se sale: se centra en la zona segura y, si el texto no cabe, reduce su cuerpo (también lo hace el
   * ajuste automático con cualquier .title o .label). opts: y, size, cls ('title'), color, align, maxWidth, scrim (franja oscura detrás).
   */
  K.title = function (parent, html, {y = K.vertical ? 240 : 120, size = K.vertical ? 120 : 110, cls = 'title', color = K.palette.ink, align = 'center', maxWidth = null, scrim = false, style = {}} = {}) {
    const S = K.safe, wmax = maxWidth || S.right - S.left;
    const el = K.box(parent, S.left + (S.right - S.left - wmax) / 2, y, {w: wmax, cls, html, style: {fontSize: size + 'px', textAlign: align, color, textShadow: '0 4px 0 rgba(0,0,0,.35), 0 12px 34px rgba(0,0,0,.6)', ...(scrim ? {background: 'linear-gradient(180deg, rgba(10,14,20,.0), rgba(10,14,20,.55) 25%, rgba(10,14,20,.55) 75%, rgba(10,14,20,0))', padding: '0.15em 0'} : {}), ...style}});
    el.dataset.fit = 'si';
    return el;
  };

  /* ---- ajuste automático de textos: ningún titular ni rótulo se sale de la zona segura (en cualquier vídeo) ---- */
  const layoutLeft = (el) => { let x = 0, n = el; while (n && !n.classList?.contains('scene-root') && n.id !== 'root' && n.id !== 'overlay') { x += n.offsetLeft || 0; n = n.offsetParent; } return x; };
  K._fitTexts = function () {
    if (document.fonts && document.fonts.status !== 'loaded') return;
    const S = K.safe;
    document.querySelectorAll('.scene-root .title, .scene-root .label, #overlay .title, [data-fit="si"]').forEach((el) => {
      if (el.dataset.fit === 'no' || !el.offsetParent) return;
      const key = el.innerHTML.length + '|' + el.textContent;
      if (el._fitKey === key) return;
      el._fitKey = key;
      const cs = getComputedStyle(el);
      const orig = el._fitOrig || parseFloat(cs.fontSize);
      el._fitOrig = orig;
      if (orig < 30 || cs.whiteSpace === 'nowrap' && el.closest('[data-label3d]')) return;
      el.style.fontSize = orig + 'px';
      let wrap = el.querySelector(':scope > .fitwrap');
      if (!wrap) { wrap = document.createElement('span'); wrap.className = 'fitwrap'; wrap.style.display = 'inline-block'; while (el.firstChild) wrap.appendChild(el.firstChild); el.appendChild(wrap); }
      // Ancho máximo que respeta la zona segura. Un texto que cabe en su caja se alinea como diga la caja; uno que la desborda
      // se pinta desde el inicio de la caja. Se elige el mayor ancho válido de los dos casos.
      const bx = layoutLeft(el), bw = el.offsetWidth, width = wrap.offsetWidth, ta = cs.textAlign, L = S.left, R = S.right;
      const inBox = ta === 'center' ? Math.min(bw, 2 * Math.min(bx + bw / 2 - L, R - bx - bw / 2)) : ta === 'right' || ta === 'end' ? Math.min(bw, bx + bw - L) : Math.min(bw, R - bx);
      const over = bx >= L ? R - bx : 0;
      const allowed = Math.max(inBox, over > bw ? over : 0);
      const k = allowed > 0 ? Math.min(1, allowed / Math.max(1, width)) : Math.min(1, (R - L) / Math.max(1, width));
      // Se encoge hasta lo que haga falta (mínimo 30 %); si ni así cabe, se permite partir la palabra.
      if (k < 0.995) el.style.fontSize = Math.max(orig * 0.3, orig * k * 0.97) + 'px';
      if (k < 0.3) el.style.overflowWrap = 'anywhere';
    });
  };

  /**
   * Auditoría de los textos visibles en t: cortados por el borde, fuera de la zona segura, metidos en la franja de
   * subtítulos o solapados entre sí. Devuelve [{tipo, grave, texto}]. La usa «genframe auditar».
   */
  K.auditDom = function () {
    const S = K.safe, out = [], seen = [];
    const visible = (el) => { let o = 1, n = el; while (n && n !== document.body) { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden') return 0; o *= parseFloat(cs.opacity); n = n.parentElement; } return o; };
    const walker = document.createTreeWalker(document.getElementById('root') || document.body, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim()) continue;
      const el = n.parentElement;
      if (!el || el.closest('.cap') || el.closest('svg')) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 24 || visible(el) < 0.35) continue;
      range.selectNodeContents(n);
      const r = range.getBoundingClientRect();
      if (r.width < 2) continue;
      const txt = n.textContent.trim().slice(0, 40);
      if (r.left < -2 || r.right > K.W + 2 || r.top < -2 || r.bottom > K.H + 2) out.push({tipo: 'texto', grave: true, texto: `«${txt}» se sale del lienzo`});
      else if (r.left < S.left - 6 || r.right > S.right + 6) out.push({tipo: 'texto', grave: false, texto: `«${txt}» se sale de la zona segura por los lados`});
      if (fs >= 56 && r.bottom > S.bottom + 10 && !el.closest('#overlay')) out.push({tipo: 'texto', grave: false, texto: `«${txt}» invade la franja de los subtítulos`});
      for (const q of seen) {
        const ix = Math.min(r.right, q.r.right) - Math.max(r.left, q.r.left), iy = Math.min(r.bottom, q.r.bottom) - Math.max(r.top, q.r.top);
        if (ix > 0 && iy > 0 && ix * iy > 0.25 * Math.min(r.width * r.height, q.r.width * q.r.height) && q.el !== el && !q.el.contains(el) && !el.contains(q.el)) out.push({tipo: 'texto', grave: false, texto: `«${txt}» se solapa con «${q.txt}»`});
      }
      seen.push({r, el, txt});
    }
    return out;
  };

  // Un único reloj que llama a los dibujos por fotograma.
  const clock = {t: 0};
  K.now = () => clock.t;
  const runHooks = (t) => { frameHooks.forEach((fn) => { try { fn(t); } catch (e) { /* una escena no tumba el vídeo */ } }); try { K._fitTexts(); } catch (e) { /* nunca tumba el vídeo */ } };
  // En el render, HyperFrames avisa con «hf-seek» cuando ya ha colocado la línea de tiempo: se dibuja ahí, una vez.
  // Sin ese aviso (vista previa), dibuja el propio reloj.
  let seeks = false;
  // En un tramo (render por trozos) el reloj de HyperFrames empieza en 0 y el vídeo en D.offset.
  window.addEventListener('hf-seek', (e) => { seeks = true; clock.t = (Number(e.detail && e.detail.time) || 0) + (D.offset || 0); runHooks(clock.t); });
  tl.add(clock, {t: [0, D.duration || 1], duration: K.ms(D.duration || 1), ease: 'linear', onUpdate: () => { if (!seeks) runHooks(clock.t); }}, 0);
  window.K = K;
})();

/*
 * Mundo 3D de la caja de herramientas (K.world3d): una maqueta en baja poligonización generada al
 * momento con Three.js — mapa real extruido (Natural Earth), mar, cielo por hora del día, sombreado de
 * cómic con contorno negro y modelos hechos por código (castillos, ciudades, barcos, ejércitos…).
 * Todo se dibuja por fotograma según t; nada depende del reloj real.
 */
(function () {
  const T = window.THREE;
  if (!T || !window.K) return;
  const K = window.K;

  const GROUNDS = {
    spain: [[-10.2, 35.4], [4.6, 44.2]],
    iberia: [[-11.5, 31], [6.5, 45.5]],
    europe: [[-12, 34], [32, 59]],
    mediterranean: [[-10, 29], [37, 47.5]],
    atlantic: [[-98, 4], [8, 50]],
    world: [[-170, -56], [179, 76]],
  };
  const SKIES = {
    atardecer: {top: '#2b1d4f', mid: '#c8457a', low: '#ffb05c', fog: '#e88a6a', sun: '#ffc58a', sunI: 2.4, amb: '#7a5fa8', ambI: 1.1, sea: '#2c5d8a', land: '#d9b27c', elev: 9, az: 235},
    dia: {top: '#3d8fe0', mid: '#79b8ef', low: '#cfe7fb', fog: '#bcd9f2', sun: '#fff3dd', sunI: 2.6, amb: '#9cc3ea', ambI: 1.2, sea: '#2f78b8', land: '#cdb17f', elev: 48, az: 200},
    noche: {top: '#05060f', mid: '#141a3a', low: '#2b3466', fog: '#1d2348', sun: '#9fb4ff', sunI: 0.9, amb: '#2a3270', ambI: 0.9, sea: '#0d1a33', land: '#4b4f6b', elev: 35, az: 140},
    tormenta: {top: '#1d2228', mid: '#3d454f', low: '#6b7480', fog: '#59626d', sun: '#cfd6df', sunI: 1.2, amb: '#56606c', ambI: 1.3, sea: '#2d3d4a', land: '#7d7a6c', elev: 30, az: 210},
    sa: {top: '#d9832f', mid: '#efaa45', low: '#f6c862', fog: '#eaa448', sun: '#ffe1a6', sunI: 1.5, amb: '#f4b766', ambI: 1.55, sea: '#4f7f8f', land: '#b39a6a', elev: 11, az: 200, haze: 2.3},
    plomizo: {top: '#5f6b75', mid: '#8a959d', low: '#aab3b8', fog: '#9aa4aa', sun: '#d9dde0', sunI: 1.3, amb: '#9aa6b0', ambI: 1.5, sea: '#2f4a4a', land: '#7d8a6a', elev: 20, az: 120, haze: 6},
    noche_luna: {top: '#060b16', mid: '#0e1a2b', low: '#1b2a40', fog: '#14223a', sun: '#9fb6e0', sunI: 0.9, amb: '#2a3a5a', ambI: 0.9, sea: '#0c1a26', land: '#2a3328', elev: 35, az: 160, haze: 6},
    dorada: {top: '#7fa9d6', mid: '#e9c4a4', low: '#ffd6aa', fog: '#efcfb4', sun: '#ffd49c', sunI: 2.6, amb: '#c3cfe2', ambI: 1.15, sea: '#4f7f8f', land: '#5d5a57', elev: 11, az: 250, haze: 7},
    sa_noche: {top: '#1c1a2e', mid: '#3b2f4a', low: '#7a5a52', fog: '#5a4550', sun: '#ffcf8a', sunI: 0.5, amb: '#6a5878', ambI: 1.1, sea: '#22313a', land: '#4f4a48', elev: 25, az: 150, haze: 2.6},
    amanecer: {top: '#33507a', mid: '#e39a9a', low: '#ffd9a0', fog: '#f0b9a0', sun: '#ffe0b0', sunI: 2.2, amb: '#8f8fc0', ambI: 1.1, sea: '#3a6a96', land: '#d8b886', elev: 12, az: 110},
  };

  // Material de cómic: tres tonos de luz y contorno negro por casco invertido.
  const toonRamp = (() => {
    const data = new Uint8Array([125, 125, 125, 255, 195, 195, 195, 255, 255, 255, 255, 255]);
    const tex = new T.DataTexture(data, 3, 1, T.RGBAFormat);
    tex.minFilter = tex.magFilter = T.NearestFilter;
    tex.needsUpdate = true;
    return tex;
  })();
  const matCache = {};
  // Aspecto: 'comic' (sombreado de tres tonos y contorno negro) o 'sa' (videojuego de los 2000: luz suave, sin contorno, bruma).
  let LOOK = 'comic';
  const toon = (color, extra = {}) => {
    const key = LOOK + color + JSON.stringify(extra);
    if (!matCache[key]) matCache[key] = LOOK === 'clean' ? new T.MeshStandardMaterial({color: new T.Color(color), roughness: 0.5, metalness: 0.05, ...extra}) : LOOK === 'sa' ? new T.MeshLambertMaterial({color: new T.Color(color), ...extra}) : new T.MeshToonMaterial({color: new T.Color(color), gradientMap: toonRamp, ...extra});
    return matCache[key];
  };
  const OUTLINE = new T.MeshBasicMaterial({color: 0x0b0b12, side: T.BackSide});
  const EDGE = new T.LineBasicMaterial({color: 0x15121c});
  const mesh = (geo, color, {outline = 0.06, cast = true, extra = {}} = {}) => {
    const g = new T.Group();
    const m = new T.Mesh(geo, toon(color, extra));
    m.castShadow = cast; m.receiveShadow = true;
    g.add(m);
    if (outline && LOOK === 'comic') {
      const o = new T.Mesh(geo, OUTLINE);
      o.scale.setScalar(1 + outline);
      g.add(o);
    }
    return g;
  };
  const box = (w, h, d, color, y = h / 2, o) => { const m = mesh(new T.BoxGeometry(w, h, d), color, o); m.position.y = y; return m; };
  const cyl = (r1, r2, h, color, seg = 10, y = h / 2, o) => { const m = mesh(new T.CylinderGeometry(r1, r2, h, seg), color, o); m.position.y = y; return m; };
  const cone = (r, h, color, seg = 8, y = h / 2, o) => { const m = mesh(new T.ConeGeometry(r, h, seg), color, o); m.position.y = y; return m; };
  const sphere = (r, color, y = r, o) => { const m = mesh(new T.SphereGeometry(r, 12, 8), color, o); m.position.y = y; return m; };
  const at = (obj, x, y, z, ry = 0) => { obj.position.set(x, y, z); obj.rotation.y = ry; return obj; };

  /** Modelos generados por código. Medidas en «unidades de maqueta» (un castillo mide ~10). */
  const MODELS = {
    castle({color = '#b9a27f', roof = '#7a3b2e'} = {}) {
      const g = new T.Group();
      g.add(box(10, 4, 10, color));
      for (const [x, z] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) { g.add(at(cyl(1.4, 1.6, 6.5, color), x, 0, z)); g.add(at(cone(1.9, 2.6, roof), x, 6.5, z)); }
      g.add(at(box(4.5, 8, 4.5, color), 0, 0, 0));
      g.add(at(cone(3.4, 3.2, roof, 4), 0, 8, 0));
      for (let i = -4; i <= 4; i += 2) { g.add(at(box(0.9, 0.9, 0.6, color), i, 4, -5)); g.add(at(box(0.9, 0.9, 0.6, color), i, 4, 5)); }
      return g;
    },
    tower({color = '#b9a27f', roof = '#7a3b2e', height = 12} = {}) {
      const g = new T.Group();
      g.add(cyl(2, 2.4, height, color));
      g.add(at(cone(2.8, 3.5, roof), 0, height, 0));
      return g;
    },
    house({color = '#efe6d6', roof = '#b5523b'} = {}) {
      const g = new T.Group();
      g.add(box(3, 2.4, 3, color));
      const r = cone(2.5, 1.6, roof, 4); r.rotation.y = Math.PI / 4; r.position.y = 2.4 + 0.8; g.add(r);
      return g;
    },
    city({era = 'medieval', n = 28, radius = 14, seed = 7, color, roof} = {}) {
      const g = new T.Group();
      const r = K.rand(seed);
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2, d = Math.sqrt(r()) * radius, x = Math.cos(a) * d, z = Math.sin(a) * d;
        let b;
        if (era === 'moderna') {
          const h = 3 + r() * r() * 26;
          b = box(2.6 + r() * 2, h, 2.6 + r() * 2, color || ['#d9d4cc', '#9fb2c4', '#c9b79c', '#7f8fa3'][Math.floor(r() * 4)], h / 2, {extra: K._windows ? {emissiveMap: K._windows(), emissive: new T.Color('#ffd27a'), emissiveIntensity: 0} : {}});
          b.userData.lit = true;
        } else if (era === 'romana') {
          b = MODELS.house({color: color || '#f1ead9', roof: roof || '#c0643f'});
        } else {
          b = MODELS.house({color: color || ['#efe6d6', '#e4d3b3', '#d6c7a8'][Math.floor(r() * 3)], roof: roof || ['#b5523b', '#9c4a36', '#c4673f'][Math.floor(r() * 3)]});
        }
        g.add(at(b, x, 0, z, r() * Math.PI));
      }
      return g;
    },
    temple({color = '#f0ead8'} = {}) {
      const g = new T.Group();
      g.add(box(12, 1, 7, color));
      for (let i = 0; i < 6; i++) for (const z of [-2.8, 2.8]) g.add(at(cyl(0.45, 0.5, 5, color, 8), -5 + i * 2, 1, z));
      g.add(at(box(12.4, 0.8, 7.4, color), 0, 6, 0));
      const p = mesh(new T.CylinderGeometry(0.01, 4.2, 2.2, 3, 1), color); p.rotation.z = Math.PI / 2; p.rotation.y = Math.PI / 2; p.scale.set(1, 2.9, 1); p.position.y = 7.6; g.add(p);
      return g;
    },
    aqueduct({color = '#b8a07a', arches = 9} = {}) {
      const g = new T.Group();
      for (let i = 0; i < arches; i++) {
        g.add(at(box(1.2, 9, 1.6, color), -arches * 1.6 + i * 3.2, 0, 0));
        const a = mesh(new T.TorusGeometry(1, 0.35, 6, 10, Math.PI), color); a.position.set(-arches * 1.6 + i * 3.2 + 1.6, 8.6, 0); g.add(a);
      }
      g.add(at(box(arches * 3.2 + 1.2, 1.2, 1.6, color), -1.6 + 1.6, 9.4, 0));
      return g;
    },
    amphitheater({color = '#c9b48d'} = {}) {
      const g = new T.Group();
      const ring = mesh(new T.TorusGeometry(9, 2.2, 6, 24), color); ring.rotation.x = Math.PI / 2; ring.scale.set(1, 0.7, 1.6); ring.position.y = 2.4; g.add(ring);
      g.add(cyl(7.5, 7.5, 0.3, '#d8c49a', 24));
      return g;
    },
    mosque({color = '#efe3c8', dome = '#3f7d6e'} = {}) {
      const g = new T.Group();
      g.add(box(12, 4, 10, color));
      g.add(at(sphere(3.4, dome, 0), 0, 4, 0));
      g.add(at(cyl(1, 1.1, 13, color, 8), 7, 0, -4));
      g.add(at(cone(1.4, 2.2, dome), 7, 13, -4));
      for (let i = -4; i <= 4; i += 2) g.add(at(box(1.2, 2.8, 0.4, '#b5523b', 1.4, {outline: 0}), i, 0, 5.05));
      return g;
    },
    cathedral({color = '#d7c9ad', roof = '#5d5a6b'} = {}) {
      const g = new T.Group();
      g.add(box(16, 7, 7, color));
      const r = mesh(new T.CylinderGeometry(0.01, 4.8, 16, 3), roof); r.rotation.z = Math.PI / 2; r.rotation.x = Math.PI / 2; r.scale.set(1, 1, 0.75); r.position.y = 8.6; g.add(r);
      for (const z of [-2.6, 2.6]) { g.add(at(box(3, 14, 3, color), 8, 0, z)); g.add(at(cone(1.9, 6, roof, 4), 8, 14, z)); }
      return g;
    },
    palace({color = '#c9bea4', roof = '#4e5560'} = {}) {
      const g = new T.Group();
      g.add(box(24, 6, 16, color));
      g.add(at(box(14, 0.5, 8, '#9c9480'), 0, 5.8, 0));
      for (const [x, z] of [[-12, -8], [12, -8], [-12, 8], [12, 8]]) { g.add(at(box(3, 10, 3, color), x, 0, z)); g.add(at(cone(2.3, 4, roof, 4), x, 10, z)); }
      g.add(at(sphere(3, roof, 0), 0, 6, 0));
      return g;
    },
    parliament({color = '#e7dfcf'} = {}) {
      const g = MODELS.temple({color});
      g.add(at(box(24, 6, 10, color), 0, 0, -6));
      return g;
    },
    ship({hull = '#6b3f24', sail = '#f3ead2', masts = 3, flag = null} = {}) {
      const g = new T.Group();
      const s = new T.Shape(); s.moveTo(-7, 1.8); s.lineTo(7.5, 1.8); s.lineTo(5.5, -1); s.lineTo(-6, -1); s.lineTo(-7.5, 2.6); s.closePath();
      const geo = new T.ExtrudeGeometry(s, {depth: 3.4, bevelEnabled: false}); geo.translate(0, 1, -1.7);
      g.add(mesh(geo, hull));
      for (let i = 0; i < masts; i++) {
        const x = -4 + i * (8 / Math.max(1, masts - 1));
        g.add(at(cyl(0.18, 0.22, 11, '#4a2e1c', 6), x, 2.6, 0));
        for (const [y, w] of [[6, 4.4], [10, 3.2]]) { const sl = mesh(new T.BoxGeometry(0.2, 3, w), sail, {outline: 0.04}); sl.position.set(x + 0.3, y, 0); g.add(sl); }
      }
      if (flag) { const f = mesh(new T.BoxGeometry(1.6, 1, 0.05), flag, {outline: 0}); f.position.set(-4.8, 14.2, 0); g.add(f); }
      return g;
    },
    galley({hull = '#7a4b2c', sail = '#c84d3b'} = {}) {
      const g = MODELS.ship({hull, sail, masts: 1});
      for (let i = 0; i < 7; i++) for (const z of [-2.2, 2.2]) { const o = box(0.15, 0.15, 3, '#4a2e1c', 1.6, {outline: 0}); o.position.set(-5 + i * 1.6, 1.6, z * 1.2); o.rotation.x = z > 0 ? 0.5 : -0.5; g.add(o); }
      return g;
    },
    soldier({color = '#a8312c', head = '#e9c9a3', spear = true} = {}) {
      const g = new T.Group();
      g.add(cone(0.6, 1.8, color, 6, 0.9, {outline: 0.1}));
      g.add(sphere(0.38, head, 2.05, {outline: 0.12}));
      if (spear) g.add(at(cyl(0.05, 0.05, 3.2, '#3a2a1a', 4, 1.6, {outline: 0}), 0.55, 0, 0));
      return g;
    },
    army({n = 30, color = '#a8312c', cols = 6, gap = 1.6, banner = null} = {}) {
      const g = new T.Group();
      for (let i = 0; i < n; i++) g.add(at(MODELS.soldier({color}), (i % cols - (cols - 1) / 2) * gap, 0, Math.floor(i / cols) * gap));
      if (banner) { g.add(at(cyl(0.08, 0.08, 6, '#3a2a1a', 4), -cols * gap / 2 - 1, 0, 0)); const f = mesh(new T.BoxGeometry(2, 1.3, 0.05), banner, {outline: 0.05}); f.position.set(-cols * gap / 2, 5.3, 0); g.add(f); }
      return g;
    },
    cannon({color = '#2e2e33'} = {}) {
      const g = new T.Group();
      const b = cyl(0.5, 0.7, 4, color, 10, 0); b.rotation.z = Math.PI / 2.4; b.position.set(0.6, 1.4, 0); g.add(b);
      for (const z of [-0.8, 0.8]) { const w = cyl(0.9, 0.9, 0.3, '#5a3a22', 10, 0); w.rotation.x = Math.PI / 2; w.position.set(0, 0.9, z); g.add(w); }
      return g;
    },
    tree({color = '#3f7a3a', trunk = '#5b3b23'} = {}) {
      const g = new T.Group();
      g.add(cyl(0.3, 0.4, 2, trunk, 6));
      g.add(at(cone(1.6, 3.6, color, 7), 0, 1.6, 0));
      return g;
    },
    forest({n = 40, radius = 14, seed = 3, color} = {}) {
      const g = new T.Group(); const r = K.rand(seed);
      for (let i = 0; i < n; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * radius; const t = MODELS.tree({color: color || ['#3f7a3a', '#4f8a3f', '#356b33'][Math.floor(r() * 3)]}); t.scale.setScalar(0.7 + r() * 0.7); g.add(at(t, Math.cos(a) * d, 0, Math.sin(a) * d)); }
      return g;
    },
    mountain({color = '#8b7d6b', snow = '#f4f4f4', height = 16} = {}) {
      const g = new T.Group();
      g.add(cone(11, height, color, 7));
      g.add(at(cone(4, height * 0.35, snow, 7), 0, height * 0.65, 0));
      return g;
    },
    cave({color = '#7d6b57'} = {}) {
      const g = MODELS.mountain({color, snow: color, height: 12});
      g.add(at(sphere(2.6, '#14100c', 0, {outline: 0}), 0, 1.5, 8.2));
      return g;
    },
    car({color = '#d23b3b'} = {}) {
      const g = new T.Group();
      g.add(box(4.2, 1.1, 2, color, 0.95));
      g.add(at(box(2.2, 0.9, 1.8, color), -0.2, 1.5, 0));
      for (const [x, z] of [[-1.4, -1], [1.4, -1], [-1.4, 1], [1.4, 1]]) { const w = cyl(0.45, 0.45, 0.3, '#151515', 10, 0, {outline: 0}); w.rotation.x = Math.PI / 2; w.position.set(x, 0.45, z); g.add(w); }
      return g;
    },
    train({color = '#2f3d4f'} = {}) {
      const g = new T.Group();
      const boiler = cyl(1.2, 1.2, 6, color, 12, 0); boiler.rotation.z = Math.PI / 2; boiler.position.set(1, 2, 0); g.add(boiler);
      g.add(at(box(3, 3.4, 2.6, color), -3, 0.4, 0));
      g.add(at(cyl(0.45, 0.6, 2, '#1d1d1d', 8), 3.2, 2.8, 0));
      for (let i = 0; i < 2; i++) g.add(at(box(6, 2.6, 2.6, ['#8c3b2c', '#5b6b3a'][i]), -8.4 - i * 6.6, 0.4, 0));
      return g;
    },
    plane({color = '#e9eef3'} = {}) {
      const g = new T.Group();
      const b = cyl(0.8, 0.6, 10, color, 10, 0); b.rotation.z = Math.PI / 2; g.add(b);
      g.add(at(box(2.2, 0.2, 11, color), 0.5, 0, 0));
      g.add(at(box(1.2, 2, 0.2, color), -4.6, 0.8, 0));
      return g;
    },
    factory({color = '#8c6b55'} = {}) {
      const g = new T.Group();
      g.add(box(12, 5, 8, color));
      for (let i = 0; i < 3; i++) g.add(at(cyl(0.7, 0.9, 12, '#6b4a3a', 8), -4 + i * 4, 0, -2.5));
      return g;
    },
    stadium({color = '#d9d9d9', field = '#3f8f45'} = {}) {
      const g = MODELS.amphitheater({color});
      g.children[1].material = toon(field);
      return g;
    },
    tank({color = '#5b6345'} = {}) {
      const g = new T.Group();
      g.add(box(5, 1.4, 3, color, 0.9));
      g.add(at(box(2.6, 1, 2.2, color), -0.3, 1.6, 0));
      const c = cyl(0.2, 0.2, 3.4, color, 6, 0); c.rotation.z = Math.PI / 2; c.position.set(2, 2.1, 0); g.add(c);
      return g;
    },
    flag({colors = ['#c60b1e', '#ffc400', '#c60b1e'], height = 10} = {}) {
      const g = new T.Group();
      g.add(cyl(0.12, 0.14, height, '#dcdcdc', 6));
      colors.forEach((c, i) => { const s = mesh(new T.BoxGeometry(4.2, 2.4 / colors.length, 0.08), c, {outline: 0}); s.position.set(2.2, height - 0.2 - (i + 0.5) * (2.4 / colors.length), 0); g.add(s); });
      return g;
    },
    crown({color = '#f2c230'} = {}) {
      const g = new T.Group();
      g.add(cyl(3, 3, 1.4, color, 16));
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.add(at(cone(0.6, 2, color, 4), Math.cos(a) * 2.8, 1.4, Math.sin(a) * 2.8)); }
      return g;
    },
    campfire() {
      const g = new T.Group();
      for (let i = 0; i < 4; i++) { const l = cyl(0.2, 0.2, 2.4, '#5b3b23', 5, 0); l.rotation.z = Math.PI / 2; l.rotation.y = (i / 4) * Math.PI; l.position.y = 0.3; g.add(l); }
      return g;
    },
  };

  /* ---------------- personas articuladas ---------------- */
  // Hombre o mujer de proporciones realistas (1,80 m ≈ 18 unidades) hecho de piezas rígidas con pivote en
  // cada articulación. El vestuario es por parámetros: traje, camisa, corbata (con topos), pelo, piel, etc.
  const dotsTex = {};
  const dotted = (base, dot) => {
    const key = base + dot;
    if (dotsTex[key]) return dotsTex[key];
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'); x.fillStyle = base; x.fillRect(0, 0, 64, 64); x.fillStyle = dot;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.beginPath(); x.arc(8 + i * 16 + (j % 2) * 8, 8 + j * 16, 2.6, 0, 7); x.fill(); }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(1, 4); t.colorSpace = T.SRGBColorSpace;
    return (dotsTex[key] = t);
  };
  const OUTFITS = {
    traje: {jacket: '#5f5d5a', trousers: '#57554f', shirt: '#cfe0f2', tie: '#1c2a4a', tieDots: '#e8eef8', shoes: '#141414'},
    traje_azul: {jacket: '#26334d', trousers: '#232e45', shirt: '#f2f4f7', tie: '#8b1d2c', tieDots: null, shoes: '#141414'},
    soldado: {jacket: '#5b6345', trousers: '#4d553a', shirt: '#5b6345', tie: null, shoes: '#2a2118'},
    caballero: {jacket: '#9aa1a8', trousers: '#7c8288', shirt: '#9aa1a8', tie: null, shoes: '#5d636a', cape: '#8b1d2c'},
    romano: {jacket: '#b3312c', trousers: '#e3c9a0', shirt: '#b3312c', tie: null, shoes: '#6b4a2c'},
    tunica: {jacket: '#e9e1cf', trousers: '#e9e1cf', shirt: '#e9e1cf', tie: null, shoes: '#6b4a2c'},
    gi: {jacket: '#5a5a3c', trousers: '#55553a', shirt: '#5a5a3c', tie: null, shoes: '#3a2a1a'},
    tommy: {jacket: '#6b6142', trousers: '#655c3e', shirt: '#6b6142', tie: null, shoes: '#2a2118'},
    obrero: {jacket: '#3e5a7a', trousers: '#2f3d52', shirt: '#d8c9a8', tie: null, shoes: '#2a2118'},
    casual: {jacket: '#c94f3d', trousers: '#2f4a6b', shirt: '#f0f0f0', tie: null, shoes: '#e8e8e8'},
  };
  const HUMAN = ({outfit = 'traje', skin = '#e2b08f', hair = '#8e8f92', hairDark = '#5c5d61', build = 1, height = 1, female = false, backpack = null, headphones = null, vest = null, newspaper = false, glasses = false, beard = null, helmet = null, ...over} = {}) => {
    const O = {...(OUTFITS[outfit] || OUTFITS.traje), ...over};
    const root = new T.Group();
    const J = {};
    const piece = (parent, geo, color, x, y, z, o = 0.05, extra = {}) => { const m = mesh(geo, color, {outline: o, extra}); m.position.set(x, y, z); parent.add(m); return m; };
    const joint = (parent, name, x, y, z) => { const g = new T.Group(); g.position.set(x, y, z); parent.add(g); J[name] = g; return g; };
    const w = build;
    const hips = joint(root, 'hips', 0, 9.6, 0);
    piece(hips, new T.BoxGeometry(3.2 * w, 1.6, 1.9), O.trousers, 0, 0.2, 0);
    const spine = joint(hips, 'spine', 0, 0.9, 0);
    // Torso de chaqueta, algo más ancho en los hombros.
    const torsoGeo = new T.CylinderGeometry(2.05 * w, 1.62 * w, 5.4, 8, 1); torsoGeo.scale(1, 1, 0.62);
    piece(spine, torsoGeo, O.jacket, 0, 2.6, 0);
    if (O.tie !== undefined && outfit.startsWith('traje')) {
      const vee = new T.Shape(); vee.moveTo(-0.85, 0); vee.lineTo(0.85, 0); vee.lineTo(0, -2.8); vee.closePath();
      const v = mesh(new T.ShapeGeometry(vee), O.shirt, {outline: 0}); v.position.set(0, 5.25, 1.01); spine.add(v);
      if (O.tie) {
        const tieMat = O.tieDots ? {map: dotted(O.tie, O.tieDots)} : {};
        const tie = mesh(new T.BoxGeometry(0.42, 2.7, 0.08), O.tieDots ? '#ffffff' : O.tie, {outline: 0.04, extra: tieMat}); tie.position.set(0, 3.95, 1.05); spine.add(tie);
        const knot = mesh(new T.BoxGeometry(0.45, 0.35, 0.12), O.tie, {outline: 0.06}); knot.position.set(0, 5.2, 1.04); spine.add(knot);
      }
      for (const s of [-1, 1]) { const lap = mesh(new T.BoxGeometry(0.5, 2.6, 0.08), '#4b4946', {outline: 0}); lap.position.set(0.62 * s, 4.1, 1.0); lap.rotation.z = -0.32 * s; spine.add(lap); }
      for (const yb of [2.0, 1.1]) piece(spine, new T.SphereGeometry(0.11, 6, 4), '#2a2a2a', 0, yb, 1.03, 0);
    }
    if (O.cape) { const cape = mesh(new T.BoxGeometry(3.6 * w, 6.6, 0.15), O.cape, {outline: 0.04}); cape.position.set(0, 2.2, -1.25); spine.add(cape); }
    const neck = joint(spine, 'neck', 0, 5.35, 0);
    piece(neck, new T.CylinderGeometry(0.55, 0.62, 0.9, 8), skin, 0, 0.3, 0);
    if (outfit.startsWith('traje')) piece(neck, new T.CylinderGeometry(0.72, 0.78, 0.45, 10), O.shirt, 0, 0.0, 0, 0.04);
    const head = joint(neck, 'head', 0, 0.75, 0);
    const skull = new T.SphereGeometry(1.08, 14, 10); skull.scale(0.86, 1.12, 0.98);
    piece(head, skull, skin, 0, 1.25, 0);
    const jaw = new T.BoxGeometry(1.35, 0.9, 1.3); piece(head, jaw, skin, 0, 0.55, 0.12, 0.04);
    piece(head, new T.BoxGeometry(0.26, 0.5, 0.32), skin, 0, 1.15, 1.02, 0.05);   // nariz
    for (const s of [-1, 1]) {
      piece(head, new T.SphereGeometry(0.24, 6, 5), skin, 0.95 * s, 1.15, 0, 0.05);   // orejas
      piece(head, new T.SphereGeometry(0.1, 6, 4), '#1d1b1a', 0.36 * s, 1.42, 0.9, 0);  // ojos
      const brow = piece(head, new T.BoxGeometry(0.46, 0.1, 0.12), hairDark, 0.38 * s, 1.68, 0.92, 0); brow.rotation.z = 0.1 * s;
    }
    piece(head, new T.BoxGeometry(0.55, 0.06, 0.06), '#8a5a4a', 0, 0.62, 0.78, 0);  // boca
    // Pelo corto canoso: casquete con el lado algo más oscuro.
    const hairGeo = new T.SphereGeometry(1.12, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5); hairGeo.scale(0.9, 0.95, 1.02);
    piece(head, hairGeo, hair, 0, 1.45, -0.04, 0.03);
    for (const s of [-1, 1]) piece(head, new T.BoxGeometry(0.22, 0.75, 1.25), hairDark, 0.86 * s, 1.35, -0.2, 0);
    piece(head, new T.BoxGeometry(1.5, 0.3, 0.5), hair, 0, 2.38, 0.52, 0.03);  // tupé
    // Brazos: hombro → codo → muñeca.
    for (const [s, n] of [[-1, 'L'], [1, 'R']]) {
      const sh = joint(spine, 'sh' + n, 2.05 * w * s, 4.7, 0);
      piece(sh, new T.SphereGeometry(0.72, 8, 6), O.jacket, 0, 0, 0, 0.04);
      piece(sh, new T.CylinderGeometry(0.6, 0.52, 3.2, 8), O.jacket, 0, -1.6, 0);
      const el = joint(sh, 'el' + n, 0, -3.2, 0);
      piece(el, new T.CylinderGeometry(0.52, 0.46, 3.0, 8), O.jacket, 0, -1.5, 0);
      if (outfit.startsWith('traje')) piece(el, new T.CylinderGeometry(0.47, 0.47, 0.3, 8), O.shirt, 0, -3.0, 0, 0.03);
      const hand = joint(el, 'hand' + n, 0, -3.1, 0);
      piece(hand, new T.BoxGeometry(0.55, 1.05, 0.32), skin, 0, -0.5, 0, 0.06);
      piece(hand, new T.BoxGeometry(0.2, 0.55, 0.22), skin, -0.32 * s, -0.25, 0.12, 0.05);
      // Piernas: cadera → rodilla → tobillo.
      const th = joint(hips, 'th' + n, 0.82 * w * s, -0.3, 0);
      piece(th, new T.CylinderGeometry(0.78, 0.62, 4.6, 8), O.trousers, 0, -2.3, 0);
      const kn = joint(th, 'kn' + n, 0, -4.6, 0);
      piece(kn, new T.CylinderGeometry(0.6, 0.5, 4.4, 8), O.trousers, 0, -2.2, 0);
      const ft = joint(kn, 'ft' + n, 0, -4.45, 0);
      piece(ft, new T.BoxGeometry(0.85, 0.55, 2.1), O.shoes, 0, -0.18, 0.45, 0.06);
    }
    if (female) {
      const long = mesh(new T.BoxGeometry(2.1, 2.6, 0.9), hair, {outline: 0.03}); long.position.set(0, 0.7, -0.75); head.add(long);
      for (const sx of [-1, 1]) { const side = mesh(new T.BoxGeometry(0.35, 2.2, 1.3), hair, {outline: 0.02}); side.position.set(0.98 * sx, 0.9, -0.15); head.add(side); }
    }
    if (backpack) { const bp = mesh(new T.BoxGeometry(2.6, 3.4, 1.3), backpack, {outline: 0.04}); bp.position.set(0, 2.9, -1.55); spine.add(bp); }
    if (headphones) { const hp = mesh(new T.TorusGeometry(0.85, 0.18, 6, 16), headphones, {outline: 0.04}); hp.rotation.x = Math.PI / 2; hp.position.set(0, 0.05, 0.05); neck.add(hp); }
    if (vest) { const vg = new T.CylinderGeometry(2.0 * w, 1.6 * w, 4.2, 8, 1); vg.scale(1.04, 1, 0.66); const v = mesh(vg, vest, {outline: 0.03}); v.position.set(0, 2.2, 0); spine.add(v); }
    if (newspaper) { const np = mesh(new T.BoxGeometry(0.3, 2.6, 1.8), '#efeae0', {outline: 0.04}); np.position.set(0.1, -1.0, 0.6); J.elL.add(np); }
    if (glasses) for (const sx of [-1, 1]) { const gl = mesh(new T.TorusGeometry(0.22, 0.05, 4, 10), '#1b1b1b', {outline: 0}); gl.position.set(0.36 * sx, 1.42, 0.98); head.add(gl); }
    if (helmet) { const hg = new T.SphereGeometry(1.32, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55); const hm = mesh(hg, helmet === 'brodie' ? '#4f5232' : '#4a4d2f', {outline: 0.03}); hm.position.set(0, 1.55, 0); head.add(hm); if (helmet === 'brodie') { const br = mesh(new T.CylinderGeometry(1.9, 1.9, 0.12, 16), '#4f5232', {outline: 0.02}); br.position.set(0, 1.6, 0); head.add(br); } }
    if (beard) { const bd = mesh(new T.BoxGeometry(1.4, 0.8, 0.5), beard, {outline: 0.02}); bd.position.set(0, 0.45, 0.62); head.add(bd); }
    root.scale.setScalar(height);
    root.userData.joints = J;
    return root;
  };
  MODELS.person = HUMAN;
  /** Calle a escala humana: asfalto con línea discontinua y aceras (largo en unidades; 10 = 1 m). */
  MODELS.street = ({length = 400, width = 70, asphalt = '#3b3a40', walk = '#a39a90'} = {}) => {
    const g = new T.Group();
    g.add(box(length, 0.3, width, asphalt, 0.15, {outline: 0, cast: false}));
    for (const s of [-1, 1]) g.add(at(box(length, 1.4, 22, walk, 0.7, {outline: 0.01}), 0, 0, s * (width / 2 + 11)));
    for (let x = -length / 2 + 10; x < length / 2; x += 40) g.add(at(box(20, 0.1, 1.4, '#f2c14e', 0.35, {outline: 0, cast: false}), x, 0, 0));
    return g;
  };
  MODELS.streetlight = ({color = '#2b2b30', light = '#ffd98a'} = {}) => {
    const g = new T.Group();
    g.add(cyl(0.5, 0.7, 60, color, 8));
    const arm = box(14, 0.8, 0.8, color, 0); arm.position.set(6, 59, 0); g.add(arm);
    g.add(at(box(4, 1.2, 2.4, light, 0, {outline: 0.05, extra: {emissive: new T.Color(light), emissiveIntensity: 0.8}}), 12, 57.6, 0));
    return g;
  };
  MODELS.building = ({height = 140, width = 90, depth = 70, color = '#c9b79c', seed = 1} = {}) => {
    const g = new T.Group();
    const tex = K._windows().clone(); tex.needsUpdate = true; tex.repeat.set(Math.max(1, Math.round(width / 30)), Math.max(1, Math.round(height / 60)));
    g.add(box(width, height, depth, color, height / 2, {outline: 0.01, extra: {emissiveMap: tex, emissive: new T.Color('#ffd27a'), emissiveIntensity: 0.25}}));
    g.add(at(box(width + 4, 4, depth + 4, '#5d5a55', 0, {outline: 0.01}), 0, height, 0));
    return g;
  };
  MODELS.podium = ({color = '#3d4743', emblem = '#c9a64a'} = {}) => {
    const g = new T.Group();
    g.add(at(box(7, 11, 3.2, color), 0, 0, 0));
    g.add(at(box(7.6, 0.4, 3.8, '#2e3633'), 0, 11, 0));
    g.add(at(box(1.2, 1.5, 0.1, emblem, 0, {outline: 0}), 0, 7.5, 1.65));
    for (const s of [-1, 1]) {
      const stem = cyl(0.08, 0.08, 5, '#1b1b1b', 6, 0, {outline: 0}); stem.position.set(1.2 * s, 13.5, 0.6); stem.rotation.x = 0.25; stem.rotation.z = -0.12 * s; g.add(stem);
      g.add(at(cyl(0.22, 0.18, 0.9, '#1b1b1b', 8, 0, {outline: 0.05}), 1.5 * s, 15.9, 1.2));
    }
    return g;
  };

  /* ---------------- ciudad de videojuego de los 2000 (escala humana: 10 unidades = 1 m) ---------------- */
  // Textos sobre lienzo (carteles, vallas): se redibujan cuando las tipografías terminan de cargar.
  const textTextures = [];
  const drawText = (c, {text, bg, fg, font, sub, subFont, border}) => {
    const x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height);
    if (border) { x.strokeStyle = border; x.lineWidth = c.height * 0.06; x.strokeRect(0, 0, c.width, c.height); }
    x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
    const lines = String(text).split('\n');
    let size = c.height * (sub ? 0.42 : 0.62) / lines.length;
    x.font = `${size}px ${font}`;
    const widest = Math.max(...lines.map((l) => x.measureText(l).width));
    if (widest > c.width * 0.9) { size *= (c.width * 0.9) / widest; x.font = `${size}px ${font}`; }
    lines.forEach((l, i) => x.fillText(l, c.width / 2, c.height * (sub ? 0.38 : 0.5) + (i - (lines.length - 1) / 2) * size * 1.05));
    if (sub) { x.font = `${c.height * 0.2}px ${subFont || font}`; x.fillText(sub, c.width / 2, c.height * 0.78); }
  };
  const textTexture = (opts) => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * (opts.ratio || 0.4));
    const o = {text: '', bg: '#f2c14e', fg: '#1b1b1b', font: "'Russo One', 'Arial Black', sans-serif", ...opts};
    drawText(c, o);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
    textTextures.push({c, o, t, done: false});
    return t;
  };
  K._refreshTexts = () => {
    if (!document.fonts || document.fonts.status !== 'loaded') return;
    for (const e of textTextures) if (!e.done) { drawText(e.c, e.o); e.t.needsUpdate = true; e.done = true; }
  };
  const plane = (w, h, tex) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({map: tex, fog: true})); return m; };

  Object.assign(MODELS, {
    palm({height = 90, color = '#3f5a2a', trunk = '#7a5f45', seed = 1} = {}) {
      const g = new T.Group(); const r = K.rand(seed); const lean = (r() - 0.5) * 0.25;
      const tr = cyl(1.1, 1.8, height, trunk, 7); tr.rotation.z = lean; g.add(tr);
      const top = new T.Vector3(-Math.sin(lean) * height, height, 0);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + r();
        const leaf = mesh(new T.ConeGeometry(3.4, 30, 4, 1), color, {outline: 0.02});
        leaf.scale.set(1, 1, 0.18);
        leaf.position.copy(top).add(new T.Vector3(Math.cos(a) * 12, -4, Math.sin(a) * 12));
        leaf.rotation.order = 'YXZ'; leaf.rotation.y = -a; leaf.rotation.x = 0; leaf.rotation.z = Math.PI / 2 + 0.45;
        leaf.lookAt(top.x + Math.cos(a) * 40, top.y - 12, top.z + Math.sin(a) * 40); leaf.rotateX(Math.PI / 2);
        g.add(leaf);
      }
      g.add(at(sphere(2.6, trunk, 0), top.x, top.y - 1, 0));
      return g;
    },
    pine({height = 120, color = '#33452c', trunk = '#4d3a2a'} = {}) {
      const g = new T.Group();
      g.add(cyl(1.4, 2, height * 0.35, trunk, 6));
      for (let i = 0; i < 4; i++) g.add(at(cone(16 - i * 3.2, height * 0.32, color, 7), 0, height * (0.22 + i * 0.17), 0));
      return g;
    },
    pole({height = 90, color = '#5b4a3a'} = {}) {
      const g = new T.Group();
      g.add(cyl(0.9, 1.1, height, color, 6));
      g.add(at(box(22, 1, 1, color, 0), 0, height - 6, 0));
      for (const x of [-9, -3, 3, 9]) g.add(at(cyl(0.4, 0.4, 1.6, '#cfcfcf', 5, 0, {outline: 0}), x, height - 4.6, 0));
      return g;
    },
    trafficlight({color = '#2b2b2e', arm = 70} = {}) {
      const g = new T.Group();
      g.add(cyl(1, 1.2, 62, color, 8));
      g.add(at(box(arm, 1.2, 1.2, color, 0), arm / 2, 58, 0));
      for (const x of [arm * 0.55, arm * 0.9]) {
        g.add(at(box(4, 12, 3.4, '#1f1f22', 0), x, 47, 0));
        [['#ff3b2f', 1], ['#5a4a1a', 0], ['#1a4a2a', 0]].forEach(([c, on], i) => g.add(at(sphere(1.25, c, 0, {outline: 0, extra: on ? {emissive: new T.Color(c), emissiveIntensity: 1.2} : {}}), x, 56 - i * 4, 1.8)));
      }
      return g;
    },
    billboard({text = 'ELECCIONES', sub = '', bg = '#f2c14e', fg = '#1b1b1b', width = 120, height = 50, legs = 70} = {}) {
      const g = new T.Group();
      for (const x of [-width * 0.3, width * 0.3]) g.add(at(cyl(1.4, 1.6, legs, '#3a3a3e', 6), x, 0, 0));
      g.add(at(box(width + 4, height + 4, 2.4, '#2a2a2e', 0), 0, legs, -1.3));
      const p = plane(width, height, textTexture({text, sub, bg, fg, ratio: height / width})); p.position.set(0, legs + height / 2 + 2, 0.1); g.add(p);
      return g;
    },
    sign({text = 'HACIENDA', sub = '', bg = '#1d3d6b', fg = '#ffffff', width = 60, height = 14} = {}) {
      const g = new T.Group();
      g.add(at(box(width + 1.5, height + 1.5, 1, '#202024', 0), 0, -height / 2 - 0.75, -0.6));
      const p = plane(width, height, textTexture({text, sub, bg, fg, ratio: height / width})); p.position.set(0, 0, 0.01); g.add(p);
      return g;
    },
    houseSA({color = '#d8c6a3', roof = '#6d4b3a', width = 90, depth = 70, seed = 2} = {}) {
      const g = new T.Group(); const r = K.rand(seed);
      g.add(box(width, 32, depth, color));
      const prof = new T.Shape(); prof.moveTo(-depth / 2 - 4, 0); prof.lineTo(depth / 2 + 4, 0); prof.lineTo(0, depth * 0.28); prof.closePath();
      const rg = new T.ExtrudeGeometry(prof, {depth: width + 8, bevelEnabled: false}); rg.translate(0, 0, -(width + 8) / 2); rg.rotateY(Math.PI / 2);
      const rf = mesh(rg, roof, {outline: 0.01}); rf.position.y = 32; g.add(rf);
      g.add(at(box(width * 0.5, 2, 18, '#8a7a66', 1), -width * 0.15, 0, depth / 2 + 9));
      for (const x of [-width * 0.38, width * 0.3]) g.add(at(box(14, 12, 1, r() > 0.4 ? '#ffd27a' : '#3b4a5a', 0, {extra: {emissive: new T.Color('#ffb04a'), emissiveIntensity: 0.35}}), x, 12, depth / 2 + 0.6));
      g.add(at(box(10, 22, 1, '#5a3f2e', 0), 0, 0, depth / 2 + 0.6));
      return g;
    },
    fence({length = 200, height = 30, color = '#8d9399'} = {}) {
      const g = new T.Group();
      for (let x = -length / 2; x <= length / 2; x += 20) g.add(at(cyl(0.5, 0.5, height, color, 6), x, 0, 0));
      g.add(at(box(length, 0.8, 0.8, color, 0), 0, height, 0));
      const net = new T.Mesh(new T.PlaneGeometry(length, height), new T.MeshLambertMaterial({color: new T.Color(color), transparent: true, opacity: 0.38, side: T.DoubleSide}));
      net.position.y = height / 2; g.add(net);
      for (let x = -length / 2; x < length / 2; x += 6) { const c = cyl(0.25, 0.25, 7, '#b7bcc2', 4, 0, {outline: 0}); c.rotation.z = Math.PI / 2; c.position.set(x + 3, height + 2.5, 0); g.add(c); }
      return g;
    },
    booth({color = '#e9e4da', roof = '#3d5a80', text = 'CONTROL'} = {}) {
      const g = new T.Group();
      g.add(box(24, 26, 20, color));
      g.add(at(box(30, 3, 26, roof, 0), 0, 26, 0));
      g.add(at(box(16, 9, 0.6, '#9fc3d9', 0), 0, 12, 10.2));
      const sg = MODELS.sign({text, width: 22, height: 5, bg: roof}); sg.position.set(0, 24.5, 13.2); g.add(sg);
      const bar = box(40, 1.2, 1.2, '#d23b3b', 0); bar.position.set(32, 10, 0); g.add(bar);
      return g;
    },
    container({color = '#b8452f'} = {}) {
      const g = new T.Group();
      g.add(box(60, 26, 24, color));
      for (let x = -27; x <= 27; x += 4.5) g.add(at(box(1, 24, 24.6, color, 0, {outline: 0}), x, 1, 0));
      return g;
    },
    hemicycle({color = '#8e2b2b', seats = '#c94a3a'} = {}) {
      const g = new T.Group();
      for (let row = 0; row < 6; row++) {
        const r0 = 40 + row * 14;
        const ring = mesh(new T.RingGeometry(r0, r0 + 11, 32, 1, 0, Math.PI), row % 2 ? seats : color, {outline: 0}); ring.rotation.x = -Math.PI / 2; ring.position.y = 2 + row * 4.5; g.add(ring);
        for (let k = 0; k < 10 + row * 3; k++) { const a = (k + 0.5) / (10 + row * 3) * Math.PI; g.add(at(box(3, 4, 3, row % 2 ? color : seats, 0, {outline: 0}), Math.cos(a) * (r0 + 5.5), 2 + row * 4.5, -Math.sin(a) * (r0 + 5.5))); }
      }
      g.add(at(box(36, 10, 12, '#5b3a28', 0), 0, 0, 10));
      return g;
    },
    plaza({radius = 160, color = '#c9b89a', ring = '#a8977c'} = {}) {
      const g = new T.Group();
      g.add(at(cyl(radius, radius, 0.6, color, 40, 0.3, {outline: 0, cast: false}), 0, 0, 0));
      for (let r = 30; r < radius; r += 30) { const m = mesh(new T.RingGeometry(r - 0.8, r + 0.8, 48), ring, {outline: 0, cast: false}); m.rotation.x = -Math.PI / 2; m.position.y = 0.65; g.add(m); }
      return g;
    },
    office({text = 'HACIENDA', color = '#d6cbb8', height = 120} = {}) {
      const g = MODELS.building({height, width: 140, depth: 70, color});
      for (let i = 0; i < 6; i++) g.add(at(cyl(2.2, 2.4, 34, '#efe8da', 10), -55 + i * 22, 0, 37));
      g.add(at(box(140, 5, 12, '#efe8da', 0), 0, 34, 37));
      const sg = MODELS.sign({text, width: 70, height: 13, bg: '#1d3d6b'}); sg.position.set(0, 46, 36); g.add(sg);
      return g;
    },
  });
  // La calle admite doble línea amarilla continua en el centro.
  const streetBase = MODELS.street;
  MODELS.street = (o = {}) => {
    const g = streetBase(o);
    if (o.center === 'double') {
      g.children.filter((c) => c.position.y > 0 && Math.abs(c.position.z) < 1 && c.position.x !== 0).forEach((c) => (c.visible = false));
      for (const z of [-1.6, 1.6]) g.add(at(box(o.length || 400, 0.1, 1.2, '#e8b92e', 0.36, {outline: 0, cast: false}), 0, 0, z));
    }
    return g;
  };


  /* ---------------- aeropuerto (escala humana: 10 unidades = 1 m) ---------------- */
  const extrudeXZ = (pts, thick, color, o) => {
    const sh = new T.Shape(pts.map(([x, z]) => new T.Vector2(x, z)));
    const g = new T.ExtrudeGeometry(sh, {depth: thick, bevelEnabled: false});
    g.rotateX(Math.PI / 2);
    return mesh(g, color, o);
  };
  /**
   * Airbus A350-900 a escala (66,8 m × 64,75 m). Origen en el suelo bajo el eje del tren principal; el morro mira a +X.
   * userData: {reversers: [manguitos], fans: [discos], noseGear: Vector3 local}
   */
  MODELS.a350 = ({body = '#f4f5f7', tail = '#1f3f9a', belly = '#e9ebee', engine = '#eef0f3', mask = '#15181d'} = {}) => {
    const root = new T.Group();
    const g = new T.Group(); g.position.set(310, 50, 0); root.add(g);
    // Fuselaje: perfil de revolución del morro a la cola, con la cola algo levantada.
    const prof = [[0, 0], [2.5, 1], [9, 4], [15, 9], [21, 18], [25.5, 30], [28.5, 48], [29.8, 70], [30, 95], [30, 470], [28, 540], [22, 600], [14, 640], [6, 664], [2, 668]];
    const lathe = new T.LatheGeometry(prof.map(([r, y]) => new T.Vector2(r, y)), 28);
    const pos = lathe.attributes.position;
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (y > 470) pos.setX(i, pos.getX(i) + (y - 470) ** 2 * 0.00055); }
    lathe.rotateZ(Math.PI / 2); lathe.computeVertexNormals();
    g.add(mesh(lathe, body, {outline: 0.004}));
    // Máscara negra de la cabina.
    const mk = new T.CylinderGeometry(25.2, 22.8, 11, 24, 1, true, -1.15, 2.3); mk.rotateZ(Math.PI / 2);
    const maskM = new T.Mesh(mk, toon(mask, {side: T.DoubleSide})); maskM.position.set(-40, 1.5, 0); maskM.scale.set(1, 1.01, 1.01); g.add(maskM);
    // Ventanillas (instancias) y puertas.
    const win = new T.InstancedMesh(new T.BoxGeometry(2.4, 3.4, 1), toon('#2a2f38'), 2 * 52);
    let k = 0; const m4 = new T.Matrix4();
    for (const s of [-1, 1]) for (let i = 0; i < 52; i++) { m4.makeTranslation(-110 - i * 8.6, 7, s * 29.6); win.setMatrixAt(k++, m4); }
    g.add(win);
    for (const x of [-72, -180, -390, -540]) for (const s of [-1, 1]) { const d = new T.Mesh(new T.BoxGeometry(10, 18, 0.6), toon('#d9dce1')); d.position.set(x, 1, s * 29.9); g.add(d); }
    // Barriga carenada y alas.
    const fair = new T.SphereGeometry(1, 16, 10); fair.scale(150, 18, 34); const fm = mesh(fair, belly, {outline: 0}); fm.position.set(-300, -16, 0); g.add(fm);
    const reversers = [], fans = [];
    for (const s of [-1, 1]) {
      const wingPts = [[-200, 22], [-392, 318], [-420, 322], [-386, 112], [-372, 22]].map(([x, z]) => [x, z * s]);
      const wing = extrudeXZ(wingPts, 4.5, body, {outline: 0.004}); wing.position.y = -14; wing.rotation.x = s * -0.1; g.add(wing);
      const tipFin = mesh(new T.BoxGeometry(18, 22, 1.2), body, {outline: 0}); tipFin.position.set(-405, -14 + 320 * Math.sin(0.1) + 10, s * 321); tipFin.rotation.x = s * -0.35; g.add(tipFin);
      // Motor Trent XWB bajo el ala.
      const eng = new T.Group(); eng.position.set(-246, -30, s * 116); g.add(eng);
      const nac = new T.CylinderGeometry(15.5, 15, 34, 28, 1, true); nac.rotateZ(Math.PI / 2); const nm = new T.Mesh(nac, toon(engine, {side: T.DoubleSide})); nm.position.x = 4; eng.add(nm);
      const lip = new T.TorusGeometry(15, 1.6, 10, 28); lip.rotateY(Math.PI / 2); const lm = new T.Mesh(lip, toon('#c9ccd2')); lm.position.x = 21; eng.add(lm);
      const fanG = new T.CircleGeometry(14.2, 28); fanG.rotateY(Math.PI / 2); const fan = new T.Mesh(fanG, toon('#22252b')); fan.position.x = 15; eng.add(fan); fans.push(fan);
      for (let b = 0; b < 18; b++) { const bl = new T.Mesh(new T.BoxGeometry(0.4, 13, 1.6), toon('#3b3f47')); bl.rotation.x = (b / 18) * Math.PI * 2; bl.position.x = 15.3; bl.geometry.translate(0, 6.5, 0); fan.add(bl); bl.position.set(0.3, 0, 0); }
      const sp = new T.ConeGeometry(3.4, 8, 16); sp.rotateZ(-Math.PI / 2); const spm = new T.Mesh(sp, toon('#f0f0f0')); spm.position.x = 18; eng.add(spm);
      const casc = new T.CylinderGeometry(14.4, 14, 10, 24, 1, true); casc.rotateZ(Math.PI / 2); const cm = new T.Mesh(casc, toon('#3a3d44', {side: T.DoubleSide})); cm.position.x = -17; eng.add(cm);
      const sl = new T.CylinderGeometry(12, 15, 22, 28, 1, true); sl.rotateZ(Math.PI / 2); const slm = new T.Mesh(sl, toon(engine, {side: T.DoubleSide})); slm.position.x = -23; eng.add(slm); reversers.push(slm);
      const core = new T.ConeGeometry(7, 18, 18); core.rotateZ(Math.PI / 2); const crm = new T.Mesh(core, toon('#8b8f96')); crm.position.x = -40; eng.add(crm);
      const py = mesh(new T.BoxGeometry(46, 16, 4), body, {outline: 0}); py.position.set(-6, 14, 0); eng.add(py);
      // Tren principal: pata, bogie y cuatro ruedas.
      const gx = -310, gz = s * 48;
      const strut = new T.Mesh(new T.CylinderGeometry(2, 2, 32, 10), toon('#b9bcc2')); strut.position.set(gx, -34, gz); g.add(strut);
      const bog = new T.Mesh(new T.BoxGeometry(26, 2.4, 2.4), toon('#9a9da3')); bog.position.set(gx, -43, gz); g.add(bog);
      for (const ax of [-8, 8]) for (const wz of [-5, 5]) { const wh = new T.Mesh(new T.CylinderGeometry(7, 7, 4.2, 20), toon('#1d1d1f')); wh.rotation.x = Math.PI / 2; wh.position.set(gx + ax, -43, gz + wz); wh.castShadow = true; g.add(wh); const hub = new T.Mesh(new T.CylinderGeometry(3.4, 3.4, 4.4, 14), toon('#c7c9ce')); hub.rotation.x = Math.PI / 2; hub.position.copy(wh.position); g.add(hub); }
    }
    // Tren de morro.
    const ns = new T.Mesh(new T.CylinderGeometry(1.5, 1.5, 22, 10), toon('#b9bcc2')); ns.position.set(-62, -38, 0); g.add(ns);
    for (const wz of [-3.6, 3.6]) { const wh = new T.Mesh(new T.CylinderGeometry(5.3, 5.3, 3.4, 20), toon('#1d1d1f')); wh.rotation.x = Math.PI / 2; wh.position.set(-62, -44.7, wz); wh.castShadow = true; g.add(wh); const hub = new T.Mesh(new T.CylinderGeometry(2.5, 2.5, 3.6, 12), toon('#c7c9ce')); hub.rotation.x = Math.PI / 2; hub.position.copy(wh.position); g.add(hub); }
    // Cola: estabilizadores horizontal y vertical.
    for (const s of [-1, 1]) { const hs = extrudeXZ([[-575, 14], [-632, 108], [-648, 110], [-640, 14]].map(([x, z]) => [x, z * s]), 2.5, body, {outline: 0.004}); hs.position.y = 14; g.add(hs); }
    const vt = new T.Shape([[-552, 24], [-640, 168], [-668, 170], [-662, 24]].map(([x, y]) => new T.Vector2(x, y)));
    const vg = new T.ExtrudeGeometry(vt, {depth: 3, bevelEnabled: false}); vg.translate(0, 0, -1.5);
    g.add(mesh(vg, tail, {outline: 0.004}));
    g.traverse((n) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
    root.userData = {reversers, fans, noseGear: new T.Vector3(310 - 62, 0, 0), body: g, baseScale: 1};
    return root;
  };
  MODELS.terminal = ({length = 1400, height = 120, depth = 160, glass = '#7fa6c4', frame = '#dcd8d0'} = {}) => {
    const g = new T.Group();
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
    x.fillStyle = glass; x.fillRect(0, 0, 256, 128); x.strokeStyle = '#3d4f60'; x.lineWidth = 3;
    for (let i = 0; i <= 256; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.stroke(); }
    x.beginPath(); x.moveTo(0, 64); x.lineTo(256, 64); x.stroke();
    const tex = new T.CanvasTexture(c); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(length / 120, 1); tex.colorSpace = T.SRGBColorSpace;
    const front = new T.Mesh(new T.BoxGeometry(depth, height, length), [toon(frame), toon(frame, {map: tex}), toon(frame), toon(frame), toon(frame), toon(frame)]);
    front.position.y = height / 2; g.add(front);
    g.add(at(box(depth + 30, 8, length + 30, '#bfbab0', 0), 0, height, 0));
    return g;
  };
  /** Pasarela de embarque de (x1, z1) a (x2, z2) a la altura de la puerta. */
  MODELS.jetbridge = ({x1 = 0, z1 = 0, x2 = 100, z2 = 0, height = 52, color = '#cfcac0'} = {}) => {
    const g = new T.Group();
    const len = Math.hypot(x2 - x1, z2 - z1), ang = Math.atan2(-(z2 - z1), x2 - x1);
    const tube = box(len, 26, 24, color, 0); tube.position.set((x1 + x2) / 2, height, (z1 + z2) / 2); tube.rotation.y = ang; g.add(tube);
    const leg = cyl(2.2, 2.2, height - 13, '#6b6f75', 8); leg.position.set(x1 + (x2 - x1) * 0.7, 0, z1 + (z2 - z1) * 0.7); g.add(leg);
    for (const s of [-4, 4]) { const wh = cyl(4, 4, 3, '#1d1d1f', 12, 0); wh.rotation.x = Math.PI / 2; wh.position.set(leg.position.x + s, 4, leg.position.z); g.add(wh); }
    return g;
  };
  MODELS.tug = ({color = '#f2c230', bar = true, barLength = 60} = {}) => {
    const g = new T.Group();
    g.add(box(64, 14, 30, color, 9));
    g.add(at(box(14, 12, 26, '#2b2f36', 0), 18, 16, 0));
    for (const [x, z] of [[-20, -15], [20, -15], [-20, 15], [20, 15]]) { const w = cyl(6, 6, 5, '#1d1d1f', 14, 0); w.rotation.x = Math.PI / 2; w.position.set(x, 6, z); g.add(w); }
    if (bar) { const b = cyl(1.2, 1.2, barLength, '#e8e8e8', 8, 0); b.rotation.z = Math.PI / 2; b.position.set(-32 - barLength / 2, 6, 0); g.add(b); }
    g.add(at(box(6, 3, 30, '#ff7a1a', 0, {outline: 0}), -31, 16, 0));
    return g;
  };
  MODELS.fueltruck = ({color = '#f4f4f4', stripe = '#c0392b'} = {}) => {
    const g = new T.Group();
    g.add(box(30, 26, 26, color, 13)); g.children[0].position.x = 40;
    const tank = cyl(13, 13, 80, color, 20, 0); tank.rotation.z = Math.PI / 2; tank.position.set(-15, 20, 0); g.add(tank);
    g.add(at(box(80, 3, 27, stripe, 0, {outline: 0}), -15, 18, 0));
    for (const x of [40, -10, -40]) for (const z of [-13, 13]) { const w = cyl(5.5, 5.5, 4, '#1d1d1f', 14, 0); w.rotation.x = Math.PI / 2; w.position.set(x, 5.5, z); g.add(w); }
    return g;
  };
  MODELS.cart = ({color = '#8a8f96', bags = true, seed = 3} = {}) => {
    const g = new T.Group(); const r = K.rand(seed);
    g.add(box(30, 2, 16, color, 6));
    for (const [x, z] of [[-12, -7], [12, -7], [-12, 7], [12, 7]]) { const w = cyl(2.5, 2.5, 2, '#1d1d1f', 10, 0); w.rotation.x = Math.PI / 2; w.position.set(x, 2.5, z); g.add(w); }
    if (bags) for (let i = 0; i < 6; i++) g.add(at(box(8, 5 + r() * 3, 6, ['#2b4a7a', '#7a2b2b', '#2f2f33', '#5a6a4a', '#b07a2a'][Math.floor(r() * 5)], 0), -10 + (i % 3) * 10, 7 + Math.floor(i / 3) * 6, (i % 2) * 6 - 3));
    return g;
  };
  MODELS.cone_traffic = () => { const g = new T.Group(); g.add(box(4, 0.6, 4, '#222', 0.3)); g.add(cone(1.6, 7, '#ff6a13', 12)); g.add(at(cyl(1.0, 1.25, 1.2, '#ffffff', 12, 0), 0, 3.2, 0)); return g; };
  /** Líneas pintadas en la plataforma: lista de segmentos [[x1, z1, x2, z2], …]. */
  MODELS.paint = ({lines = [], color = '#f2c230', width = 2.5} = {}) => {
    const g = new T.Group();
    for (const [x1, z1, x2, z2] of lines) { const len = Math.hypot(x2 - x1, z2 - z1); const b = new T.Mesh(new T.BoxGeometry(len, 0.2, width), new T.MeshBasicMaterial({color: new T.Color(color)})); b.position.set((x1 + x2) / 2, 0.15, (z1 + z2) / 2); b.rotation.y = Math.atan2(-(z2 - z1), x2 - x1); g.add(b); }
    return g;
  };


  /* ---------------- Segunda Guerra Mundial, 1944 (escala humana: 10 unidades = 1 m) ---------------- */
  const OD = '#4b5320', GREYN = '#6f7f8a', HULL = '#5d6670';
  const wheel = (r, w, x, y, z) => { const m = cyl(r, r, w, '#1b1b1b', 14, 0, {outline: 0}); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); return m; };
  const tracks = (g, len, z, y = 5, h = 10) => { g.add(at(box(len, h, 7, '#2b2a26', 0), 0, y - h / 2 + 0.5, z)); for (let x = -len / 2 + 6; x < len / 2; x += 11) g.add(wheel(4.2, 7.4, x, y - 1, z)); };
  Object.assign(MODELS, {
    lcvp({color = GREYN, ramp = 0, crew = 0, helmet = 'm1'} = {}) {
      const g = new T.Group();
      const hull = new T.Shape([[-55, -16], [45, -16], [55, -12], [55, 12], [45, 16], [-55, 16]].map(([x, z]) => new T.Vector2(x, z)));
      const hg = new T.ExtrudeGeometry(hull, {depth: 16, bevelEnabled: false}); hg.rotateX(-Math.PI / 2);
      const h = mesh(hg, color, {outline: 0.005}); g.add(h);
      const inner = box(88, 1, 26, '#4f5a63', 4); inner.position.x = 0; g.add(inner);
      const rg = new T.Group(); rg.position.set(55, 4, 0); g.add(rg);
      const rp = box(2, 20, 28, color, 10); rg.add(rp); rg.rotation.z = -ramp; g.userData.ramp = rg;
      g.add(at(box(12, 8, 10, '#566069', 0), -42, 16, 0));
      for (const s of [-1, 1]) { const mg = cyl(0.5, 0.5, 10, '#1d1d1d', 6, 0, {outline: 0}); mg.rotation.z = Math.PI / 2 - 0.2; mg.position.set(-44, 24, s * 9); g.add(mg); }
      for (let i = 0; i < crew; i++) { const sx = 40 - Math.floor(i / 4) * 9, sz = (i % 4) * 6.5 - 9.75; const s = MODELS.soldier({color: '#5a5a3c', helmet}); s.position.set(sx, 4, sz); g.add(s); }
      return g;
    },
    soldier({color = '#5a5a3c', helmet = 'm1', pack = true, rifle = true, skin = '#d9b08c'} = {}) {
      const g = new T.Group();
      g.add(cyl(2.2, 2.6, 9, color, 8, 4.5 + 8));
      g.add(at(cyl(1.1, 1.3, 8.5, color, 6), -1.2, 0, 0)); g.add(at(cyl(1.1, 1.3, 8.5, color, 6), 1.2, 0, 0));
      g.add(sphere(1.7, skin, 19.2, {outline: 0}));
      const hm = helmet === 'brodie' ? cyl(3.2, 3.2, 0.5, '#4f5232', 16, 20.6) : sphere(2.1, '#4a4d2f', 19.9);
      if (helmet === 'brodie') g.add(at(sphere(1.9, '#4f5232', 0), 0, 20, 0)); g.add(hm);
      if (pack) g.add(at(box(3.4, 4.5, 2.6, '#6b6a4a', 0), 0, 13, -2.8));
      if (rifle) { const r = box(0.5, 11, 0.5, '#3b2a1a', 0); r.position.set(2.6, 14, 1.2); r.rotation.x = 0.3; g.add(r); }
      return g;
    },
    troops({n = 24, cols = 6, gap = 9, color = '#5a5a3c', helmet = 'm1', seed = 3} = {}) {
      const g = new T.Group(); const r = K.rand(seed);
      for (let i = 0; i < n; i++) { const s = MODELS.soldier({color, helmet}); s.position.set(Math.floor(i / cols) * -gap + (r() - 0.5) * 4, 0, (i % cols - (cols - 1) / 2) * gap + (r() - 0.5) * 4); s.rotation.y = (r() - 0.5) * 0.4; g.add(s); }
      return g;
    },
    sherman({color = OD, dd = false, star = true} = {}) {
      const g = new T.Group();
      const hull = box(58, 14, 26, color, 14); g.add(hull);
      const glacis = box(16, 2, 26, color, 0); glacis.position.set(27, 18, 0); glacis.rotation.z = -0.6; g.add(glacis);
      tracks(g, 60, 13.5); tracks(g, 60, -13.5);
      const tur = cyl(10, 11, 9, color, 12, 0); tur.position.set(-2, 25, 0); g.add(tur);
      const gun = cyl(1.2, 1.2, 30, '#3b3f2a', 8, 0); gun.rotation.z = Math.PI / 2; gun.position.set(22, 27, 0); g.add(gun);
      if (star) for (const s of [-1, 1]) { const st = new T.Mesh(new T.CircleGeometry(4, 5), new T.MeshBasicMaterial({color: '#e8e8e0'})); st.position.set(-6, 15, s * 13.1); st.rotation.y = s > 0 ? 0 : Math.PI; g.add(st); }
      if (dd) { const sc = new T.Mesh(new T.CylinderGeometry(34, 34, 18, 24, 1, true), toon('#8a8a6a', {side: T.DoubleSide})); sc.scale.set(1, 1, 0.55); sc.position.y = 20; g.add(sc); }
      return g;
    },
    halftrack({color = OD} = {}) {
      const g = new T.Group();
      g.add(box(40, 10, 20, color, 11)); g.add(at(box(14, 8, 19, color, 0), 24, 8, 0));
      g.add(wheel(4.4, 3, 27, 4.4, 9)); g.add(wheel(4.4, 3, 27, 4.4, -9));
      const tg = new T.Group(); tracks(tg, 22, 9, 6, 9); tracks(tg, 22, -9, 6, 9); tg.position.x = -8; g.add(tg);
      return g;
    },
    truck({color = OD, canvas = '#5f6045'} = {}) {
      const g = new T.Group();
      g.add(box(16, 12, 20, color, 12)); g.children[0].position.x = 22;
      g.add(at(box(36, 14, 21, canvas, 0), -6, 10, 0));
      for (const x of [24, -6, -18]) for (const z of [-9, 9]) g.add(wheel(4.4, 3, x, 4.4, z));
      return g;
    },
    jeep({color = OD} = {}) {
      const g = new T.Group(); g.add(box(30, 6, 15, color, 7)); g.add(at(box(2, 6, 14, '#2b2b2b', 0), 3, 10, 0));
      for (const x of [10, -10]) for (const z of [-8, 8]) g.add(wheel(3.2, 2.5, x, 3.2, z));
      return g;
    },
    dukw({color = OD} = {}) {
      const g = new T.Group();
      const sh = new T.Shape([[-45, -12], [36, -12], [48, 0], [36, 12], [-45, 12]].map(([x, z]) => new T.Vector2(x, z)));
      const hg = new T.ExtrudeGeometry(sh, {depth: 12, bevelEnabled: false}); hg.rotateX(-Math.PI / 2); const hm = mesh(hg, color, {outline: 0.005}); hm.position.y = 6; g.add(hm);
      for (const x of [26, -10, -24]) for (const z of [-11, 11]) g.add(wheel(4.4, 3, x, 4.4, z));
      g.add(at(box(10, 7, 22, '#3d4228', 0), 18, 18, 0));
      return g;
    },
    c47({color = '#5d6142', belly = '#9aa0a6', stripes = true} = {}) {
      const g = new T.Group();
      const f = new T.CylinderGeometry(9, 5, 190, 14); f.rotateZ(Math.PI / 2); const fm = mesh(f, color, {outline: 0.004}); fm.position.y = 0; g.add(fm);
      const nose = sphere(9, color, 0); nose.position.x = 95; nose.scale.set(1.6, 1, 1); g.add(nose);
      const wing = box(30, 2.4, 290, color, 0); wing.position.set(25, -4, 0); g.add(wing);
      if (stripes) for (const s of [-1, 1]) for (let k = 0; k < 5; k++) { const b = new T.Mesh(new T.BoxGeometry(30.4, 2.6, 7), toon(k % 2 ? '#141414' : '#f2f2f2')); b.position.set(25, -4, s * (60 + k * 7)); g.add(b); }
      if (stripes) for (let k = 0; k < 5; k++) { const b = new T.Mesh(new T.CylinderGeometry(6.2, 6.4, 5, 14, 1, true), toon(k % 2 ? '#141414' : '#f2f2f2', {side: T.DoubleSide})); b.rotation.z = Math.PI / 2; b.position.set(-45 - k * 5, 0, 0); g.add(b); }
      for (const s of [-1, 1]) { const e = cyl(5, 4.5, 20, '#4a4d36', 12, 0); e.rotation.z = Math.PI / 2; e.position.set(40, -3, s * 42); g.add(e); const p = new T.Mesh(new T.CircleGeometry(12, 20), new T.MeshBasicMaterial({color: '#777', transparent: true, opacity: 0.3})); p.rotation.y = Math.PI / 2; p.position.set(51, -3, s * 42); g.add(p); }
      g.add(at(box(22, 1.6, 90, color, 0), -88, 2, 0));
      const fin = box(24, 34, 1.6, color, 0); fin.position.set(-90, 17, 0); g.add(fin);
      return g;
    },
    horsa({color = '#5d6142', stripes = true} = {}) {
      const g = MODELS.c47({color, stripes});
      g.children.filter((c) => c.geometry && c.geometry.type === 'CircleGeometry').forEach((c) => (c.visible = false));
      return g;
    },
    warship({length = 1800, color = '#6d757d', turrets = 4, funnel = true} = {}) {
      const g = new T.Group(); const L = length, W = L * 0.13;
      const sh = new T.Shape([[-L / 2, -W / 2], [L * 0.32, -W / 2], [L / 2, 0], [L * 0.32, W / 2], [-L / 2, W / 2]].map(([x, z]) => new T.Vector2(x, z)));
      const hg = new T.ExtrudeGeometry(sh, {depth: W * 0.35, bevelEnabled: false}); hg.rotateX(-Math.PI / 2);
      g.add(mesh(hg, color, {outline: 0.002}));
      g.add(at(box(L * 0.18, W * 0.5, W * 0.45, color, 0), -L * 0.02, W * 0.35, 0));
      g.add(at(box(L * 0.06, W * 0.9, W * 0.25, color, 0), L * 0.03, W * 0.6, 0));
      if (funnel) g.add(at(cyl(W * 0.12, W * 0.13, W * 0.5, '#5a6066', 10), -L * 0.08, W * 0.8, 0));
      const tur = [];
      const xs = [L * 0.3, L * 0.18, -L * 0.22, -L * 0.34].slice(0, turrets);
      for (const x of xs) {
        const tg = new T.Group(); tg.position.set(x, W * 0.35, 0); g.add(tg);
        tg.add(cyl(W * 0.16, W * 0.18, W * 0.14, color, 12, 0));
        for (const z of [-W * 0.06, 0, W * 0.06]) { const b = cyl(W * 0.018, W * 0.018, W * 0.55, '#4b5056', 6, 0, {outline: 0}); b.rotation.z = Math.PI / 2 - 0.15; b.position.set((x > 0 ? 1 : -1) * W * 0.3, W * 0.1, z); tg.add(b); }
        if (x < 0) tg.rotation.y = Math.PI;
        tur.push(tg);
      }
      g.userData.turrets = tur;
      return g;
    },
    lst({number = 'US 310', color = '#4f565c', ramp = 0} = {}) {
      const g = new T.Group();
      g.add(box(1000, 70, 150, color, 35));
      g.add(at(box(140, 70, 140, color, 0), -380, 70, 0));
      g.add(at(cyl(4, 4, 90, '#3b3f44', 6), -360, 140, 0));
      for (const s of [-1, 1]) { const sg = MODELS.sign({text: number, bg: color, fg: '#f2f2f2', width: 120, height: 34}); sg.position.set(380, 48, s * 75.6); sg.rotation.y = s > 0 ? 0 : Math.PI; g.add(sg); }
      const rg = new T.Group(); rg.position.set(500, 6, 0); g.add(rg); rg.add(at(box(4, 120, 90, '#444b51', 0), 0, 0, 0)); rg.children[0].position.y = 60; rg.rotation.z = -ramp; g.userData.ramp = rg;
      return g;
    },
    balloon({color = '#c9cdd1', cable = 300} = {}) {
      const g = new T.Group();
      const b = sphere(14, color, 0); b.scale.set(2.6, 1, 1); b.position.y = cable; g.add(b);
      for (const [rx, ry] of [[0, 1], [0, -1], [1, 0]]) { const f = box(14, 12, 1.2, color, 0); f.position.set(-32, cable + ry * 9, rx * 9); f.rotation.x = rx ? Math.PI / 2 : 0; g.add(f); }
      const c = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(0, 0, 0), new T.Vector3(-6, cable - 12, 0)]), new T.LineBasicMaterial({color: '#2b2b2b'})); g.add(c);
      return g;
    },
    hedgehog({color = '#3b3a38'} = {}) {
      const g = new T.Group();
      for (const [rx, rz] of [[0.6, 0.6], [-0.6, 0.6], [0, -0.9]]) { const b = box(1.6, 26, 1.6, color, 0); b.rotation.set(rx, 0, rz); b.position.y = 9; g.add(b); }
      return g;
    },
    belgiangate({color = '#4a4846'} = {}) {
      const g = new T.Group();
      for (let i = 0; i < 6; i++) g.add(at(box(1.4, 28, 1.4, color, 14), -15 + i * 6, 0, 0));
      for (const y of [6, 16, 26]) g.add(at(box(32, 1.4, 1.4, color, 0), 0, y, 0));
      const br = box(1.4, 30, 1.4, color, 0); br.position.set(0, 14, -6); br.rotation.x = 0.6; g.add(br);
      return g;
    },
    stake({color = '#6b5a45'} = {}) {
      const g = new T.Group(); const p = cyl(1, 1.2, 34, color, 6, 0); p.position.y = 14; p.rotation.z = -0.6; g.add(p);
      g.add(at(cyl(2.8, 2.8, 2.6, '#3f3f3a', 10, 0), 9.5, 27, 0));
      return g;
    },
    bunker({color = '#9a968c', gun = true} = {}) {
      const g = new T.Group();
      g.add(box(70, 30, 60, color, 15));
      g.add(at(box(80, 6, 70, color, 0), 0, 30, 0));
      g.add(at(box(2, 5, 30, '#1b1b1b', 0, {outline: 0}), 35.2, 18, 0));
      if (gun) { const b = cyl(1.5, 1.5, 30, '#3b3b3b', 8, 0); b.rotation.z = Math.PI / 2; b.position.set(48, 20, 0); g.add(b); }
      return g;
    },
    pillbox({color = '#9a968c'} = {}) {
      const g = new T.Group(); g.add(cyl(14, 16, 14, color, 10)); g.add(at(cyl(16, 16, 3, color, 10), 0, 14, 0));
      g.add(at(box(2, 3, 14, '#1b1b1b', 0, {outline: 0}), 15.5, 9, 0));
      return g;
    },
    /** Costa: mar (z < 0), playa de arena, muro de guijarros y loma de hierba (bluff) de altura `bluff`. */
    coast({length = 3000, beach = 380, bluff = 300, sand = '#c9b48a', grass = '#5f7046', sea = '#2f4a4a', cliff = false} = {}) {
      const g = new T.Group();
      const water = new T.Mesh(new T.PlaneGeometry(length * 3, 4000), new T.MeshStandardMaterial({color: new T.Color(sea), roughness: 0.25, metalness: 0.1}));
      water.rotation.x = -Math.PI / 2; water.position.set(0, 0.6, -2000); g.add(water);
      const sd = new T.Mesh(new T.PlaneGeometry(length * 3, beach + 100), toon(sand)); sd.rotation.x = -Math.PI / 2; sd.position.set(0, 0.3, beach / 2 - 50); g.add(sd);
      for (let x = -length * 1.4; x < length * 1.4; x += 60) g.add(at(box(62, 0.3, 6, '#e8eef0', 0.8, {outline: 0, cast: false}), x, 0, -6));
      g.add(at(box(length * 3, 8, 26, '#8d8a80', 4, {outline: 0}), 0, 0, beach + 10));
      const prof = cliff ? [[0, 0], [10, bluff], [600, bluff], [600, 0]] : [[0, 0], [bluff * 0.9, bluff * 0.85], [bluff * 1.4, bluff], [900, bluff], [900, 0]];
      const sh = new T.Shape(prof.map(([z, y]) => new T.Vector2(z, y)));
      const bg = new T.ExtrudeGeometry(sh, {depth: length * 3, bevelEnabled: false}); bg.translate(0, 0, -length * 1.5); bg.rotateY(-Math.PI / 2);
      const bm = new T.Mesh(bg, toon(cliff ? '#8d8676' : grass)); bm.position.set(0, 0, beach + 23); bm.receiveShadow = bm.castShadow = true; g.add(bm);
      if (cliff) { const top = new T.Mesh(new T.PlaneGeometry(length * 3, 600), toon(grass)); top.rotation.x = -Math.PI / 2; top.position.set(0, bluff + 0.5, beach + 330); g.add(top); }
      return g;
    },
    bocage({fields = 5, size = 260, seed = 2, grass = '#6e8a4a'} = {}) {
      const g = new T.Group(); const r = K.rand(seed);
      const ground = new T.Mesh(new T.PlaneGeometry(fields * size, fields * size), toon(grass)); ground.rotation.x = -Math.PI / 2; ground.position.y = 0.3; g.add(ground);
      for (let i = 0; i <= fields; i++) for (const dir of [0, 1]) {
        const p = -fields * size / 2 + i * size;
        const hedge = box(fields * size, 22, 12, '#3f5a2c', 11, {outline: 0}); if (dir) hedge.rotation.y = Math.PI / 2; hedge.position[dir ? 'x' : 'z'] = p; g.add(hedge);
        for (let k = 0; k < fields * 3; k++) { const t = MODELS.tree({color: ['#3f5a2c', '#4a6a34'][Math.floor(r() * 2)]}); t.scale.setScalar(5 + r() * 4); const q = -fields * size / 2 + r() * fields * size; t.position.set(dir ? p : q, 0, dir ? q : p); g.add(t); }
      }
      return g;
    },
    mulberry({color = '#b3ada2'} = {}) {
      const g = new T.Group();
      for (let i = 0; i < 14; i++) g.add(at(box(600, 180, 160, color, 0), -3900 + i * 610, 0, -2600 - Math.abs(i - 7) * 90));
      for (let i = 0; i < 3; i++) { g.add(at(box(40, 6, 2600, '#6b6e70', 3), -1000 + i * 1000, 0, -1300)); for (let k = 0; k < 12; k++) g.add(at(box(70, 12, 70, '#5b5e60', 6), -1000 + i * 1000, 0, -200 - k * 220)); }
      return g;
    },
    cemetery({rows = 14, cols = 30, gap = 34, star = 0.03, seed = 5} = {}) {
      const g = new T.Group(); const r = K.rand(seed);
      const lawn = new T.Mesh(new T.PlaneGeometry(cols * gap + 200, rows * gap + 200), toon('#5f8a3e')); lawn.rotation.x = -Math.PI / 2; lawn.position.y = 0.4; g.add(lawn);
      const n = rows * cols;
      const cross = new T.InstancedMesh(new T.BoxGeometry(1.2, 9, 1), toon('#f4f4f2'), n);
      const arm = new T.InstancedMesh(new T.BoxGeometry(1.2, 1.2, 6), toon('#f4f4f2'), n);
      const m4 = new T.Matrix4(); let k = 0;
      for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
        const x = -cols * gap / 2 + j * gap, z = -rows * gap / 2 + i * gap;
        if (r() < star) { const st = new T.Mesh(new T.CylinderGeometry(3.4, 3.4, 1, 6), toon('#f4f4f2')); st.rotation.x = Math.PI / 2; st.position.set(x, 7, z); g.add(st); g.add(at(box(1.2, 5, 1, '#f4f4f2', 2.5, {outline: 0}), x, 0, z)); m4.makeTranslation(0, -100, 0); }
        else m4.makeTranslation(x, 4.5, z);
        cross.setMatrixAt(k, m4); m4.makeTranslation(x, 6.5, z); arm.setMatrixAt(k++, m4);
      }
      cross.castShadow = arm.castShadow = true;
      g.add(cross, arm);
      return g;
    },
  });

  // Posturas en grados por articulación (x = adelante/atrás, z = abrir hacia fuera).
  const HPOSE = {
    stand: {shLx: 0, shLz: 4, shRx: 0, shRz: -4, elLx: -8, elRx: -8, spine: 0, head: 0, headY: 0},
    hands_on_podium: {shLx: -38, shLz: 10, shRx: -38, shRz: -10, elLx: -42, elRx: -42, spine: 4, head: -2, headY: 0},
    explain: {shLx: -30, shLz: 14, shRx: -45, shRz: -12, elLx: -70, elRx: -80, spine: 2, head: 0, headY: 0},
    point: {shLx: 0, shLz: 4, shRx: -88, shRz: -4, elLx: -8, elRx: 0, spine: 0, head: 0, headY: 0},
    wave: {shLx: 0, shLz: 4, shRx: -10, shRz: -150, elLx: -8, elRx: -30, spine: 0, head: -6, headY: 0},
    arms_crossed: {shLx: -40, shLz: -26, shRx: -40, shRz: 26, elLx: -110, elRx: -110, spine: 0, head: 4, headY: 0},
    victory: {shLx: -10, shLz: 150, shRx: -10, shRz: -150, elLx: -10, elRx: -10, spine: -4, head: -12, headY: 0},
    think: {shLx: -20, shLz: -20, shRx: -60, shRz: -18, elLx: -90, elRx: -140, spine: 2, head: 10, headY: -12},
    shield: {shLx: -120, shLz: 10, shRx: -120, shRz: -10, elLx: -70, elRx: -70, spine: -8, head: 12, headY: 0},
    shrug: {shLx: -15, shLz: 35, shRx: -15, shRz: -35, elLx: -80, elRx: -80, spine: 0, head: -4, headY: 8},
    nod: {shLx: 0, shLz: 4, shRx: 0, shRz: -4, elLx: -8, elRx: -8, spine: 4, head: 14, headY: 0},
    look_up: {shLx: 0, shLz: 4, shRx: 0, shRz: -4, elLx: -8, elRx: -8, spine: -4, head: -18, headY: 0},
  };
  K.personPoses = Object.keys(HPOSE);

  K.models3d = Object.keys(MODELS);

  // Ventanas iluminadas para la ciudad moderna (textura generada).
  let windowsTex = null;
  K._windows = () => {
    if (windowsTex) return windowsTex;
    const c = document.createElement('canvas'); c.width = 64; c.height = 128;
    const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 64, 128);
    const r = K.rand(99);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 16; j++) if (r() > 0.45) { x.fillStyle = r() > 0.5 ? '#ffd27a' : '#ffefc2'; x.fillRect(4 + i * 7.5, 4 + j * 7.7, 4, 4.5); }
    windowsTex = new T.CanvasTexture(c);
    windowsTex.wrapS = windowsTex.wrapT = T.RepeatWrapping;
    return windowsTex;
  };

  /**
   * Crea la maqueta en `root` (ocupa K.W×K.H) y la dibuja solo entre T0 y T1.
   * opts: {ground: 'spain'|'iberia'|'europe'|'mediterranean'|'atlantic'|'world'|[[lonO,latS],[lonE,latN]]|'none',
   *        sky: 'atardecer'|'dia'|'noche'|'tormenta'|'amanecer', land, sea, highlight: {es: '#color'}, borders: true}
   */
  let sharedRenderer = null;
  const shared = () => {
    if (sharedRenderer) return sharedRenderer;
    const c = document.createElement('canvas'); c.width = K.W; c.height = K.H;
    const r = new T.WebGLRenderer({canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true});
    r.setPixelRatio(1);
    r.setSize(K.W, K.H, false);
    r.shadowMap.enabled = true;
    r.shadowMap.type = T.PCFSoftShadowMap;
    r.toneMapping = T.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    sharedRenderer = r;
    return r;
  };
  // La geometría del mapa se calcula una vez por encuadre y país, y la comparten todas las escenas.
  const geoCache = {};

  // Bocanada difuminada para humo, fuego y explosiones.
  let puffTex = null;
  const puff = () => {
    if (puffTex) return puffTex;
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return (puffTex = new T.CanvasTexture(c));
  };
  K.world3d = function (root, T0, T1, {ground = 'iberia', sky = null, land = null, sea = null, highlight = {}, tilt = true, look = 'comic', regions = false, glow = null, haze = null} = {}) {
    LOOK = look;
    sky = sky || (look === 'sa' ? 'sa' : 'atardecer');
    const S = SKIES[sky] || SKIES.atardecer;
    const wrap = K.box(root, 0, 0, {w: K.W, h: K.H, style: {background: `linear-gradient(180deg, ${S.top} 0%, ${S.mid} 45%, ${S.low} 70%, ${S.fog} 100%)`, overflow: 'hidden'}});
    const canvas = K.el(wrap, 'canvas', {attrs: {width: K.W, height: K.H}, style: {position: 'absolute', inset: '0', width: K.W + 'px', height: K.H + 'px'}});
    const ctx2d = canvas.getContext('2d');
    // Resplandor de videojuego: copia desenfocada del fotograma sumada encima.
    const glowOn = glow ?? look === 'sa';
    const glowCanvas = glowOn ? K.el(wrap, 'canvas', {attrs: {width: K.W / 4, height: K.H / 4}, style: {position: 'absolute', inset: '0', width: K.W + 'px', height: K.H + 'px', filter: 'blur(10px)', mixBlendMode: 'screen', opacity: look === 'sa' ? '0.55' : '0.35'}}) : null;
    const glowCtx = glowCanvas ? glowCanvas.getContext('2d') : null;
    if (look === 'sa') K.box(wrap, 0, 0, {w: K.W, h: K.H, style: {pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(255,170,60,.18), rgba(255,140,40,.10) 60%, rgba(60,30,10,.25))', mixBlendMode: 'soft-light'}});
    // Etalonaje de atardecer de videojuego: luz cálida arriba, viñeta y un punto de contraste.
    K.box(wrap, 0, 0, {w: K.W, h: K.H, style: {pointerEvents: 'none', zIndex: 1, background: `radial-gradient(ellipse at 50% 40%, transparent 55%, rgba(10,4,25,.55) 100%), linear-gradient(180deg, ${S.low}33, transparent 45%, ${S.top}44)`, mixBlendMode: 'normal'}});
    const labels = K.box(wrap, 0, 0, {w: K.W, h: K.H, style: {pointerEvents: 'none', zIndex: 2}});
    // Un único contexto WebGL para todo el vídeo (Chrome no admite más de ~16): cada escena copia su fotograma a su lienzo.
    const renderer = shared();
    const scene = new T.Scene();
    scene.fog = new T.Fog(new T.Color(S.fog), 900, 2600);
    const camera = new T.PerspectiveCamera(K.vertical ? 62 : 38, K.W / K.H, 1, 6000);
    let sunSprite = null;
    if (look === 'sa' || S.haze) {
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const x = c.getContext('2d'); const gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
      gr.addColorStop(0, 'rgba(255,250,220,1)'); gr.addColorStop(0.12, 'rgba(255,235,170,1)'); gr.addColorStop(0.3, 'rgba(255,200,110,.55)'); gr.addColorStop(1, 'rgba(255,170,60,0)');
      x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
      sunSprite = new T.Sprite(new T.SpriteMaterial({map: new T.CanvasTexture(c), fog: false, depthWrite: false, transparent: true, blending: T.AdditiveBlending}));
      scene.add(sunSprite);
    }
    scene.add(new T.HemisphereLight(new T.Color(S.amb), new T.Color(S.sea), S.ambI));
    const sun = new T.DirectionalLight(new T.Color(S.sun), S.sunI);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = sun.shadow.camera.bottom = -220;
    sun.shadow.camera.right = sun.shadow.camera.top = 220;
    sun.shadow.camera.far = 1600;
    sun.shadow.bias = -0.0006;
    scene.add(sun, sun.target);
    const fill = new T.DirectionalLight(new T.Color('#ffe2c4'), 0.9);
    scene.add(fill, fill.target);

    // Suelo: mapa real extruido.
    let project = (ll) => [ll[0] * 10, -ll[1] * 10];
    const countries = {};
    const regionMeshes = {};
    const HL = 3;
    const seaMesh = new T.Mesh(new T.PlaneGeometry(9000, 9000), new T.MeshStandardMaterial({color: new T.Color(ground === 'none' ? (land || S.land) : (sea || S.sea)), roughness: ground === 'none' ? 0.92 : 0.32, metalness: 0}));
    seaMesh.rotation.x = -Math.PI / 2; seaMesh.receiveShadow = true;
    scene.add(seaMesh);
    if (ground !== 'none') {
      const bbox = Array.isArray(ground) ? ground : GROUNDS[ground] || GROUNDS.iberia;
      const topo = (K.data.geo || {}).world;
      const fc = topojson.feature(topo, topo.objects.countries);
      const iso = {};
      for (const [a2, v] of Object.entries(K.data.countries || {})) iso[v.n] = a2.toLowerCase();
      const [[w0, s0], [e0, n0]] = bbox;
      const proj = d3.geoMercator().fitExtent([[-500, -320], [500, 320]], {type: 'Feature', geometry: {type: 'Polygon', coordinates: [[[w0, s0], [w0, n0], [e0, n0], [e0, s0], [w0, s0]]]}});
      project = (ll) => proj(ll);
      const pad = Math.max(e0 - w0, n0 - s0) * 0.6;
      const inBox = (f) => { const [[a, b], [c, d]] = d3.geoBounds(f); return !(c < w0 - pad || a > e0 + pad || d < s0 - pad || b > n0 + pad) || (c - a > 180); };
      const feats = fc.features.filter((f) => !(regions && iso[f.id] === 'es'));
      if (regions && (K.data.geo || {}).ccaa) {
        const ct = K.data.geo.ccaa;
        for (const f of topojson.feature(ct, ct.objects[Object.keys(ct.objects)[0]]).features) feats.push({...f, id: 'ccaa:' + f.properties.name, region: f.properties.name});
      }
      for (const f of feats) {
        if (!f.region && !inBox(f)) continue;
        const code = f.region ? null : iso[f.id];
        const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [];
        const shapes = [];
        for (const poly of polys) {
          const ring = (r) => {
            const out = [];
            for (const q of r) { const p = proj(q); if (!p || !isFinite(p[0]) || !isFinite(p[1])) continue; const l = out[out.length - 1]; if (l && Math.abs(l[0] - p[0]) < 0.05 && Math.abs(l[1] - p[1]) < 0.05) continue; out.push(p); }
            if (out.length > 1 && Math.abs(out[0][0] - out[out.length - 1][0]) < 0.05 && Math.abs(out[0][1] - out[out.length - 1][1]) < 0.05) out.pop();
            return out;
          };
          const outer = ring(poly[0]);
          if (outer.length < 3) continue;
          const shape = new T.Shape(outer.map(([x, y]) => new T.Vector2(x, -y)));
          for (const hole of poly.slice(1)) { const h = ring(hole); if (h.length > 2) shape.holes.push(new T.Path(h.map(([x, y]) => new T.Vector2(x, -y)))); }
          shapes.push(shape);
        }
        if (!shapes.length) continue;
        const gk = JSON.stringify(bbox) + '|' + f.id + '|' + (f.properties && f.properties.name);
        if (!geoCache[gk]) {
          // Un polígono que no se puede triangular se descarta (se prueba uno a uno) en vez de tumbar la escena.
          let g0 = null;
          try { g0 = new T.ExtrudeGeometry(shapes, {depth: HL, bevelEnabled: false}); } catch (e) {
            const ok = shapes.filter((sh) => { try { new T.ShapeGeometry(sh); return true; } catch (er) { return false; } });
            try { g0 = ok.length ? new T.ExtrudeGeometry(ok, {depth: HL, bevelEnabled: false}) : null; } catch (er) { g0 = null; }
          }
          if (!g0) continue;
          g0.rotateX(-Math.PI / 2);
          geoCache[gk] = {geo: g0, edges: new T.EdgesGeometry(g0, 30)};
        }
        const geo = geoCache[gk].geo;
        const color = highlight[code] || land || S.land;
        const m = new T.Mesh(geo, LOOK !== 'comic' ? new T.MeshLambertMaterial({color: new T.Color(color)}) : new T.MeshToonMaterial({color: new T.Color(color), gradientMap: toonRamp}));
        m.receiveShadow = true; m.castShadow = true;
        scene.add(m);
        const edges = new T.LineSegments(geoCache[gk].edges, EDGE);
        scene.add(edges);
        if (code) countries[code] = m;
        if (f.region) { regionMeshes[f.region] = m; m.material.color.offsetHSL(0, 0, (Object.keys(regionMeshes).length % 3) * 0.04 - 0.04); }
      }
    }

    const W = {scene, camera, renderer, THREE: T, countries, regions: regionMeshes, project};
    const toXZ = (p) => {
      if (!p) return [0, 0];
      if (Array.isArray(p)) { const q = project(p); return [q[0], q[1]]; }
      if (p.lon !== undefined) { const q = project([p.lon, p.lat]); return [q[0], q[1]]; }
      return [p.x || 0, p.z || 0];
    };
    W.xz = toXZ;
    const objects = [];
    /** Elemento HTML (icono, rótulo) que sigue a un objeto 3D aunque se mueva. */
    W.attach = (html, obj, t, t2 = null, {y = 10, size = 48} = {}) => {
      const el = K.el(labels, 'div', {html, style: {position: 'absolute', left: '0', top: '0', transform: 'translate(-50%, -100%)', fontSize: size + 'px', opacity: 0}});
      tags.push({el, obj, y});
      K.show(el, t, {from: {scale: 0.4}, dur: 0.35, ease: 'outBack'});
      if (t2) K.hide(el, t2);
      return el;
    };
    /** Cables colgantes entre las puntas de una fila de postes ({x, z} o [lon, lat]), a `height`. */
    W.wires = (points, {height = 84, sag = 6, color = '#1d1a18', n = 3} = {}) => {
      const mat = new T.LineBasicMaterial({color: new T.Color(color)});
      for (let k = 0; k < n; k++) for (let i = 0; i < points.length - 1; i++) {
        const [x0, z0] = toXZ(points[i]), [x1, z1] = toXZ(points[i + 1]);
        const pts = [];
        for (let j = 0; j <= 16; j++) { const u = j / 16; pts.push(new T.Vector3(x0 + (x1 - x0) * u + (k - 1) * 6, height - k * 1.2 - Math.sin(u * Math.PI) * sag, z0 + (z1 - z0) * u)); }
        scene.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), mat));
      }
    };

    /** Añade un modelo (K.models3d) en un punto [lon, lat] o {x, z}. Devuelve el objeto 3D. */
    W.add = (name, where, {scale = 1, rotate = 0, y = null, t = null, ...params} = {}) => {
      const make = MODELS[name];
      if (!make) throw new Error('Modelo 3D desconocido: ' + name);
      const obj = make(params);
      const [x, z] = toXZ(where);
      obj.position.set(x, y ?? (ground === 'none' ? 0 : HL), z);
      obj.rotation.y = (rotate * Math.PI) / 180;
      obj.scale.setScalar(scale);
      obj.userData.baseScale = scale;
      scene.add(obj);
      objects.push(obj);
      if (t !== null) W.show(obj, t);
      return obj;
    };
    /** Aparece creciendo con rebote en t. */
    W.show = (obj, t, dur = 0.6) => { const s = obj.userData.baseScale || 1; obj.scale.setScalar(0.0001); K.tl.add(obj.scale, {x: [0.0001, s], y: [0.0001, s], z: [0.0001, s], duration: K.ms(dur), ease: 'outBack'}, K.ms(t)); };
    W.hide = (obj, t, dur = 0.4) => { const s = obj.userData.baseScale || 1; K.tl.add(obj.scale, {x: [s, 0.0001], y: [s, 0.0001], z: [s, 0.0001], duration: K.ms(dur), ease: 'inBack'}, K.ms(t)); };
    /** Mueve un objeto a otro punto entre t y t+dur (mirando hacia donde va). */
    W.move = (obj, t, to, dur = 2, ease = 'inOutSine') => {
      const [x, z] = toXZ(to);
      const from = obj.userData.lastXZ || [obj.position.x, obj.position.z];
      obj.userData.lastXZ = [x, z];
      const ry = Math.atan2(-(z - from[1]), x - from[0]);
      K.tl.add(obj.rotation, {y: [obj.rotation.y, ry], duration: 200}, K.ms(t));
      K.tl.add(obj.position, {x: [from[0], x], z: [from[1], z], duration: K.ms(dur), ease}, K.ms(t));
    };
    /** Colorea un país (código ISO2) en t. */
    W.country = (code, t, color, dur = 0.6) => {
      const m = countries[code];
      if (!m) return;
      const c = new T.Color(color), from = m.material.color.clone(), o = {k: 0};
      K.tl.add(o, {k: [0, 1], duration: K.ms(dur), ease: 'outQuad', onUpdate: () => m.material.color.copy(from).lerp(c, o.k)}, K.ms(t));
      K.tl.add(m.position, {y: [0, 1.5], duration: K.ms(dur), ease: 'outBack'}, K.ms(t));
    };

    // Etiquetas HTML que siguen un punto 3D.
    const tags = [];
    /** Rótulo sobre un punto: estilo 'city' (nombre), 'pin' (marcador de destino con baliza) o 'title' (grande). */
    W.label = (text, where, t, t2 = null, {style = 'city', color = '#ffd84a', height = 6} = {}) => {
      const [x, z] = toXZ(where);
      const el = K.el(labels, 'div', {html: text, style: {position: 'absolute', left: '0', top: '0', whiteSpace: 'nowrap', transform: 'translate(-50%, -100%)', fontFamily: style === 'title' ? 'var(--title)' : 'var(--label)', fontSize: style === 'title' ? '64px' : '34px', color: '#fff', textShadow: '0 0 2px #000, 2px 2px 0 #000, -2px 2px 0 #000, 2px -2px 0 #000, -2px -2px 0 #000', letterSpacing: '.04em', textTransform: 'uppercase', opacity: 0}});
      if (style === 'pin') {
        const beam = new T.Mesh(new T.CylinderGeometry(1.2, 1.2, 120, 12, 1, true), new T.MeshBasicMaterial({color: new T.Color(color), transparent: true, opacity: 0.35, depthWrite: false}));
        beam.position.set(x, HL + 60, z); beam.scale.setScalar(0.0001); scene.add(beam);
        const mk = cone(3.2, 5, color, 4, 0, {outline: 0.08}); mk.rotation.x = Math.PI; mk.position.set(x, HL + 12, z); mk.scale.setScalar(0.0001); scene.add(mk);
        K.tl.add(beam.scale, {x: [0.0001, 1], y: [0.0001, 1], z: [0.0001, 1], duration: 400, ease: 'outCubic'}, K.ms(t));
        K.tl.add(mk.scale, {x: [0.0001, 1], y: [0.0001, 1], z: [0.0001, 1], duration: 500, ease: 'outBack'}, K.ms(t));
        K.onFrame((tt) => { mk.rotation.y = tt * 2; mk.position.y = HL + 12 + Math.sin(tt * 3) * 1.2; });
        el.style.color = color;
        height = 22;
      }
      tags.push({el, p: new T.Vector3(x, HL + height, z)});
      K.show(el, t, {from: {y: 12}, dur: 0.35});
      if (t2) K.hide(el, t2);
      return el;
    };
    /** Ruta de GPS que se dibuja entre t y t+dur por los puntos [lon, lat] (o {x, z}). */
    W.route = (points, t, dur = 2, {color = '#b04cff', width = 1.6, lift = 1.5, arc = 0} = {}) => {
      const v = points.map((p, i) => { const [x, z] = toXZ(p); const k = i / Math.max(1, points.length - 1); return new T.Vector3(x, HL + lift + Math.sin(k * Math.PI) * arc, z); });
      const curve = new T.CatmullRomCurve3(v);
      const segs = Math.max(40, points.length * 30);
      const geo = new T.TubeGeometry(curve, segs, width, 6, false);
      const m = new T.Mesh(geo, new T.MeshBasicMaterial({color: new T.Color(color)}));
      scene.add(m);
      const total = geo.index.count;
      geo.setDrawRange(0, 0);
      K.onFrame((tt) => geo.setDrawRange(0, Math.floor(total * K.ramp(tt, t, t + dur) / 6) * 6));
      return m;
    };
    /** Efectos de partículas deterministas: 'fire', 'smoke', 'explosion', 'rain', 'sparkle'. */
    W.fx = (kind, where, t0, t1, {size = 1, n = 40, seed = 5} = {}) => {
      const [x, z] = toXZ(where);
      const r = K.rand(seed);
      const col = {fire: ['#ffb02e', '#ff5a1f', '#ffe066'], smoke: ['#5e5a62', '#7d7884', '#3f3c44'], explosion: ['#fff2b0', '#ff8a1f', '#d6331f'], rain: ['#bcd6ff'], sparkle: ['#fff6b0', '#ffd84a']}[kind] || ['#fff'];
      const parts = [];
      for (let i = 0; i < n; i++) {
        let m;
        if (kind === 'rain') m = new T.Mesh(new T.BoxGeometry(0.15, 3, 0.15), new T.MeshBasicMaterial({color: new T.Color(col[i % col.length]), transparent: true, opacity: 0}));
        else { m = new T.Sprite(new T.SpriteMaterial({map: puff(), color: new T.Color(col[i % col.length]), transparent: true, opacity: 0, depthWrite: false, blending: kind === 'smoke' ? T.NormalBlending : T.AdditiveBlending})); m.userData.sprite = true; }
        scene.add(m);
        parts.push({m, ph: r(), dx: (r() - 0.5) * 8 * size, dz: (r() - 0.5) * 8 * size, sp: 0.6 + r() * 0.8});
      }
      K.onFrame((tt) => {
        const on = tt >= t0 && tt <= t1;
        for (const p of parts) {
          if (!on) { p.m.material.opacity = 0; continue; }
          const life = ((tt - t0) * p.sp + p.ph) % 1;
          if (kind === 'rain') { p.m.position.set(x + p.dx * 12, HL + 80 - life * 80, z + p.dz * 12); p.m.material.opacity = 0.6; continue; }
          const rise = kind === 'smoke' ? 30 : kind === 'explosion' ? 14 : 10;
          const spread = kind === 'explosion' ? 1 + life * 2.5 : 1 + life;
          p.m.position.set(x + p.dx * spread * 0.4, HL + life * rise * size, z + p.dz * spread * 0.4);
          p.m.scale.setScalar((kind === 'smoke' ? 1 + life * 2.5 : 1.2 - life) * size * (p.m.userData.sprite ? 3.2 : 1));
          p.m.material.opacity = Math.sin(life * Math.PI) * (kind === 'smoke' ? 0.55 : 0.95);
        }
      });
    };

    // Cámara: tomas [t, {lon, lat | x, z, dist, pitch, yaw}] con transición suave y deriva lenta.
    const cam = {x: 0, z: 0, dist: 520, pitch: 52, yaw: 0, h: HL};
    let camSet = false;
    /** Toma de cámara en t: centra el punto, a `dist` unidades, con inclinación `pitch` (grados sobre el suelo) y giro `yaw`. */
    W.shot = (t, where, {dist = 260, pitch = 48, yaw = 0, h = HL, dur = 2.2, ease = 'inOutSine'} = {}) => {
      const [x, z] = toXZ(where);
      if (!camSet) { Object.assign(cam, {x, z, dist, pitch, yaw, h}); camSet = true; W._last = {x, z, dist, pitch, yaw, h}; return; }
      const a = W._last;
      K.tl.add(cam, {x: [a.x, x], z: [a.z, z], dist: [a.dist, dist], pitch: [a.pitch, pitch], yaw: [a.yaw, yaw], h: [a.h, h], duration: K.ms(dur), ease}, K.ms(t));
      W._last = {x, z, dist, pitch, yaw, h};
    };
    let drift = 2.5;
    /** Velocidad de giro lento de la cámara (grados por segundo; 0 = quieta). */
    W.drift = (degPerSecond) => { drift = degPerSecond; };
    const tmp = new T.Vector3();
    const updaters = [];
    /**
     * Persona articulada en un punto. Devuelve {obj, pose(t, nombre|ángulos, dur), walk(t0, t1, destino), talk(t0, t1), face(t, grados)}.
     * opts: {outfit: 'traje'|'traje_azul'|'soldado'|'caballero'|'romano'|'tunica'|'obrero'|'casual', skin, hair, hairDark, build, height, jacket, tie, tieDots…, pose, rotate}
     */
    W.person = (where, {pose = 'stand', rotate = 0, t = null, ...opts} = {}) => {
      const obj = W.add('person', where, {rotate, t, ...opts});
      const J = obj.userData.joints;
      const st = {...HPOSE.stand, ...(HPOSE[pose] || {})};
      let last = {...st};
      const walks = [], talks = [];
      const rad = (d) => (d * Math.PI) / 180;
      const P = {obj};
      P.pose = (tt, p, dur = 0.5) => {
        const target = typeof p === 'string' ? (HPOSE[p] || HPOSE.stand) : {...last, ...p};
        const props = {};
        for (const k of Object.keys(HPOSE.stand)) if (target[k] !== undefined && target[k] !== last[k]) props[k] = [last[k], target[k]];
        if (Object.keys(props).length) K.tl.add(st, {...props, duration: K.ms(dur), ease: 'inOutSine'}, K.ms(tt));
        last = {...last, ...target};
      };
      P.walk = (t0, t1, to) => {
        const from = walks.length ? walks[walks.length - 1].to : [obj.position.x, obj.position.z];
        const [x, z] = toXZ(to);
        walks.push({a: t0, b: t1, from, to: [x, z], yaw: Math.atan2(x - from[0], z - from[1])});
      };
      P.talk = (t0, t1) => talks.push([t0, t1]);
      P.face = (tt, deg, dur = 0.5) => K.tl.add(obj.rotation, {y: [obj.rotation.y, rad(deg)], duration: K.ms(dur), ease: 'inOutSine'}, K.ms(tt));
      updaters.push((tt) => {
        const a = {...st};
        let thL = 0, thR = 0, knL = 0, knR = 0, bob = 0;
        for (const w of walks) {
          if (tt < w.a) continue;
          const k = K.ramp(tt, w.a, w.b);
          obj.position.x = w.from[0] + (w.to[0] - w.from[0]) * k;
          obj.position.z = w.from[1] + (w.to[1] - w.from[1]) * k;
          if (tt <= w.b) {
            obj.rotation.y = w.yaw;
            const ph = (tt - w.a) * 1.9 * Math.PI * 2, fade = Math.min(1, (tt - w.a) / 0.25, (w.b - tt) / 0.25);
            thL = Math.sin(ph) * 28 * fade; thR = -thL;
            knL = Math.max(0, -Math.sin(ph)) * 40 * fade; knR = Math.max(0, Math.sin(ph)) * 40 * fade;
            a.shLx = -thL * 0.8; a.shRx = -thR * 0.8; a.elLx = -18; a.elRx = -18;
            bob = Math.abs(Math.cos(ph)) * 0.25 * fade;
          }
        }
        for (const [t0, t1] of talks) {
          if (tt < t0 || tt > t1) continue;
          const f = Math.min(1, (tt - t0) / 0.4, (t1 - tt) / 0.4);
          a.elRx += Math.sin(tt * 3.1) * 14 * f; a.shRx += Math.sin(tt * 1.7 + 1) * 9 * f;
          a.elLx += Math.sin(tt * 2.6 + 2) * 10 * f; a.head += Math.sin(tt * 2.3) * 3 * f; a.headY += Math.sin(tt * 0.9) * 8 * f;
        }
        J.thL.rotation.x = rad(-thL); J.thR.rotation.x = rad(-thR);
        J.knL.rotation.x = rad(knL); J.knR.rotation.x = rad(knR);
        J.shL.rotation.x = rad(a.shLx); J.shR.rotation.x = rad(a.shRx);
        J.shL.rotation.z = -rad(a.shLz); J.shR.rotation.z = -rad(a.shRz);
        J.elL.rotation.x = rad(a.elLx); J.elR.rotation.x = rad(a.elRx);
        J.spine.rotation.x = rad(a.spine) + Math.sin(tt * 1.6) * 0.012;
        J.head.rotation.x = rad(a.head); J.head.rotation.y = rad(a.headY);
        J.hips.position.y = 9.6 + bob;
      });
      return P;
    };
    /** Función que se ejecuta en cada fotograma justo antes de dibujar (para animaciones que dependen de otras). */
    W.onUpdate = (fn) => updaters.push(fn);
    /** Flujo de aire: partículas alargadas y translúcidas que corren de `from` a `to` ({x, y, z}) entre t0 y t1. */
    W.flow = (from, to, t0, t1, {color = '#2f86d6', n = 60, spread = 10, speed = 1.2, size = 1, opacity = 0.75, seed = 7} = {}) => {
      const r = K.rand(seed);
      const a = new T.Vector3(from.x, from.y, from.z), b = new T.Vector3(to.x, to.y, to.z), dir = b.clone().sub(a), len = dir.length();
      const geo = new T.BoxGeometry(len * 0.06 * size, 0.6 * size, 0.6 * size);
      const mat = new T.MeshBasicMaterial({color: new T.Color(color), transparent: true, opacity: 0, depthWrite: false});
      const parts = [];
      const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(1, 0, 0), dir.clone().normalize());
      for (let i = 0; i < n; i++) { const m = new T.Mesh(geo, mat.clone()); m.quaternion.copy(q); scene.add(m); parts.push({m, ph: r(), off: new T.Vector3((r() - 0.5) * spread, (r() - 0.5) * spread, (r() - 0.5) * spread), sp: 0.7 + r() * 0.6}); }
      updaters.push((tt) => {
        const on = tt >= t0 && tt <= t1, fade = on ? Math.min(1, (tt - t0) / 0.4, (t1 - tt) / 0.4) : 0;
        for (const p of parts) {
          const u = ((tt - t0) * speed * p.sp + p.ph) % 1;
          p.m.position.copy(a).addScaledVector(dir, u).addScaledVector(p.off, 0.4 + u);
          p.m.material.opacity = fade * opacity * Math.sin(u * Math.PI);
        }
      });
    };
    const render = (t) => {
      for (const fn of updaters) fn(t);
      const yaw = ((cam.yaw + (t - T0) * drift) * Math.PI) / 180, pitch = (K.clamp(cam.pitch, 8, 89) * Math.PI) / 180;
      camera.near = Math.max(0.5, cam.dist / 60); camera.updateProjectionMatrix();
      camera.position.set(cam.x + Math.sin(yaw) * Math.cos(pitch) * cam.dist, cam.h + Math.sin(pitch) * cam.dist, cam.z + Math.cos(yaw) * Math.cos(pitch) * cam.dist);
      camera.lookAt(cam.x, cam.h, cam.z);
      const el = (S.elev * Math.PI) / 180, az = (S.az * Math.PI) / 180;
      sun.position.set(cam.x + Math.cos(el) * Math.sin(az) * 600, Math.sin(el) * 600 + 80, cam.z + Math.cos(el) * Math.cos(az) * 600);
      sun.target.position.set(cam.x, 0, cam.z);
      fill.position.copy(camera.position).add(new T.Vector3(0, cam.dist * 0.4, 0));
      fill.target.position.set(cam.x, cam.h, cam.z);
      sun.shadow.camera.left = sun.shadow.camera.bottom = -Math.max(120, cam.dist * 0.8);
      sun.shadow.camera.right = sun.shadow.camera.top = Math.max(120, cam.dist * 0.8);
      sun.shadow.camera.updateProjectionMatrix();
      if (haze || S.haze) { const far = Math.max(cam.dist * (haze || S.haze), 420); scene.fog.near = far * 0.08; scene.fog.far = far; }
      else { scene.fog.near = cam.dist * 1.4; scene.fog.far = cam.dist * 4.5; }
      if (sunSprite) { const d = scene.fog.far * 0.9; sunSprite.position.set(camera.position.x + Math.cos(el) * Math.sin(az) * d, camera.position.y + Math.sin(el) * d * 0.9 + 10, camera.position.z + Math.cos(el) * Math.cos(az) * d); sunSprite.scale.setScalar(d * 0.55); }
      K._refreshTexts && K._refreshTexts();
      if (sky === 'noche') objects.forEach((o) => o.traverse((n) => { if (n.material && n.material.emissiveMap) n.material.emissiveIntensity = 1.4; }));
      renderer.render(scene, camera);
      ctx2d.clearRect(0, 0, K.W, K.H);
      ctx2d.drawImage(renderer.domElement, 0, 0);
      if (glowCtx) { glowCtx.clearRect(0, 0, K.W / 4, K.H / 4); glowCtx.filter = 'brightness(1.1) contrast(1.6)'; glowCtx.drawImage(renderer.domElement, 0, 0, K.W / 4, K.H / 4); }
      for (const g of tags) {
        if (g.obj) { g.obj.getWorldPosition(tmp); tmp.y += g.y; } else tmp.copy(g.p);
        tmp.project(camera);
        g.el.style.left = ((tmp.x + 1) / 2) * K.W + 'px';
        g.el.style.top = ((1 - tmp.y) / 2) * K.H + 'px';
        g.el.style.visibility = tmp.z < 1 ? 'visible' : 'hidden';
      }
    };
    K.onFrame((t) => { if (t >= T0 - 0.8 && t <= T1 + 0.1) render(t); });
    W.render = render;
    return W;
  };
})();

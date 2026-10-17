/*
 * Mundo 3D de la caja de herramientas (K.world3d): una maqueta generada al momento con Three.js — mapa
 * real extruido (Natural Earth), mar, cielo y luz definidos por la dirección de arte de cada vídeo, y los
 * modelos que el taller fabrica para ese vídeo. Aquí NO hay ningún modelo: solo el escenario, la cámara,
 * los efectos y las herramientas de fabricación (K.forge) que usan las funciones constructoras del taller.
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
  /** Luz y cielo: los define la dirección de arte de cada vídeo (K.data.skies); sin ella, se deducen de la paleta. */
  const SKY_DEFAULTS = {sunI: 2.2, ambI: 1.1, elev: 30, az: 210, haze: 0, night: false};
  const skyOf = (sky) => {
    const named = K.data.skies || {};
    const S = sky && typeof sky === 'object' ? sky : named[sky] || Object.values(named)[0];
    if (S) return {...SKY_DEFAULTS, ...S};
    const p = K.palette;
    return {...SKY_DEFAULTS, top: p.bg2 || p.bg || '#3d6fa8', mid: p.soft || '#9cc0e0', low: p.bg || '#e8eef4', fog: p.bg || '#d8e2ea', sun: '#fff4e0', amb: p.soft || '#9fb4cc', sea: p.accent2 || '#2f6c9e', land: p.soft || '#cdb98f'};
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

  const lathe = (profile, color, {seg = 24, o} = {}) => mesh(new T.LatheGeometry(profile.map(([r, y]) => new T.Vector2(r, y)), seg), color, o);
  const extrude = (points, depth, color, {holes = [], bevel = 0, curveSegments = 8, o} = {}) => {
    const shape = new T.Shape(points.map(([x, y]) => new T.Vector2(x, y)));
    for (const h of holes) shape.holes.push(new T.Path(h.map(([x, y]) => new T.Vector2(x, y))));
    const geo = new T.ExtrudeGeometry(shape, {depth, curveSegments, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2});
    geo.translate(0, 0, -depth / 2);
    return mesh(geo, color, o);
  };
  const tube = (points, radius, color, {seg = 32, radial = 8, closed = false, o} = {}) => mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(([x, y, z]) => new T.Vector3(x, y, z)), closed), seg, radius, radial, closed), color, o);
  const canvasTexture = (w, h, draw) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace; tx.wrapS = tx.wrapT = T.RepeatWrapping; tx.anisotropy = 4;
    return tx;
  };
  const pivot = (parent, name, x = 0, y = 0, z = 0) => { const g = new T.Group(); g.name = name; g.position.set(x, y, z); parent.add(g); return g; };

  /**
   * K.forge: lo que recibe cada función constructora del taller. Medidas en unidades: 10 = 1 metro.
   * mesh/box/cyl/cone/sphere/lathe/extrude/tube crean piezas con el material y el contorno del aspecto del vídeo;
   * pivot crea una articulación con nombre (se anima con w.pose); canvasTexture pinta texturas procedurales.
   */
  K.forge = {T, mat: toon, mesh, box, cyl, cone, sphere, at, lathe, extrude, tube, canvasTexture, pivot, group: () => new T.Group(), rand: (s) => K.rand(s), palette: () => K.palette};
  /** Modelos fabricados por el taller para este vídeo: id → {build(forge, params) → THREE.Object3D, size}. */
  K.models = {};
  K.defineModel = (id, build, info = {}) => { K.models[id] = {build, ...info}; };

  /**
   * Crea la maqueta en `root` (ocupa K.W×K.H) y la dibuja solo entre T0 y T1.
   * opts: {ground: 'spain'|'iberia'|'europe'|'mediterranean'|'atlantic'|'world'|[[lonO,latS],[lonE,latN]]|'none',
   *        sky: nombre de un cielo de la dirección de arte o {top, mid, low, fog, sun, sunI, amb, ambI, sea, land, elev, az, haze, night},
   *        land, sea, highlight: {es: '#color'}, look: 'comic'|'sa'|'clean'}
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
  K.world3d = function (root, T0, T1, {ground = 'iberia', sky = null, land = null, sea = null, highlight = {}, tilt = true, look = K.data.look || 'comic', regions = false, glow = null, haze = null, ocean = null, terrain = null, clouds = null, exposure = 1.15, rim = 1} = {}) {
    LOOK = look;
    const S = skyOf(sky);
    const wrap = K.box(root, 0, 0, {w: K.W, h: K.H, style: {background: `linear-gradient(180deg, ${S.top} 0%, ${S.mid} 45%, ${S.low} 70%, ${S.fog} 100%)`, overflow: 'hidden'}});
    const canvas = K.el(wrap, 'canvas', {attrs: {width: K.W, height: K.H}, style: {position: 'absolute', inset: '0', width: K.W + 'px', height: K.H + 'px'}});
    const ctx2d = canvas.getContext('2d');
    // Resplandor de videojuego: copia desenfocada del fotograma sumada encima.
    const glowOn = glow ?? look === 'sa';
    const glowCanvas = glowOn ? K.el(wrap, 'canvas', {attrs: {width: K.W / 4, height: K.H / 4}, style: {position: 'absolute', inset: '0', width: K.W + 'px', height: K.H + 'px', filter: 'blur(10px)', mixBlendMode: 'screen', opacity: look === 'sa' ? '0.55' : '0.35'}}) : null;
    const glowCtx = glowCanvas ? glowCanvas.getContext('2d') : null;
    if (look === 'sa') K.box(wrap, 0, 0, {w: K.W, h: K.H, style: {pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(255,170,60,.18), rgba(255,140,40,.10) 60%, rgba(60,30,10,.25))', mixBlendMode: 'soft-light'}});
    // Etalonaje de atardecer de videojuego: luz cálida arriba, viñeta y un punto de contraste.
    K.box(wrap, 0, 0, {w: K.W, h: K.H, style: {pointerEvents: 'none', zIndex: 1, background: `radial-gradient(ellipse at 50% 40%, transparent 62%, rgba(10,4,25,.3) 100%), linear-gradient(180deg, ${S.low}33, transparent 45%, ${S.top}44)`, mixBlendMode: 'normal'}});
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
    // Luz siempre legible: un mínimo de ambiente aunque sea de noche, relleno desde la cámara y contraluz que recorta las siluetas.
    scene.add(new T.HemisphereLight(new T.Color(S.amb), new T.Color(S.sea), Math.max(S.ambI, S.night ? 0.75 : 0.95)));
    const sun = new T.DirectionalLight(new T.Color(S.sun), S.sunI);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = sun.shadow.camera.bottom = -220;
    sun.shadow.camera.right = sun.shadow.camera.top = 220;
    sun.shadow.camera.far = 1600;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.6;
    scene.add(sun, sun.target);
    const fill = new T.DirectionalLight(new T.Color('#ffe2c4'), S.night ? 0.7 : 0.9);
    scene.add(fill, fill.target);
    const rimLight = new T.DirectionalLight(new T.Color(S.night ? '#9fb6e0' : S.low || '#ffffff'), rim * (S.night ? 1.6 : 1.1));
    scene.add(rimLight, rimLight.target);

    const updatersEarly = [];
    // Suelo: mapa real extruido.
    let project = (ll) => [ll[0] * 10, -ll[1] * 10];
    const countries = {};
    const regionMeshes = {};
    const HL = 3;
    const seaMesh = new T.Mesh(new T.PlaneGeometry(9000, 9000), new T.MeshStandardMaterial({color: new T.Color(ground === 'none' ? (land || S.land) : (sea || S.sea)), roughness: ground === 'none' ? 0.92 : 0.32, metalness: 0}));
    seaMesh.rotation.x = -Math.PI / 2; seaMesh.receiveShadow = true;
    scene.add(seaMesh);

    /* ---- generadores de escenario: mar con olas, terreno con costa y nubes ---- */
    const noiseR = (seed) => { const r = K.rand(seed); const p = Array.from({length: 512}, () => r()); return (x, z) => { const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi; const h = (a, b) => p[((a * 73856093) ^ (b * 19349663)) >>> 0 & 511]; const s = (t) => t * t * (3 - 2 * t); const a = h(xi, zi), b = h(xi + 1, zi), c = h(xi, zi + 1), d = h(xi + 1, zi + 1); return a + (b - a) * s(xf) + (c - a) * s(zf) + (a - b - c + d) * s(xf) * s(zf); }; };
    const fbm = (n, x, z, oct = 4) => { let v = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { v += a * (n(x * f, z * f) * 2 - 1); a *= 0.5; f *= 2.03; } return v; };
    let terrainHeight = null;
    if (terrain) {
      const o = terrain === true ? {} : terrain;
      const size = o.size || 1600, seg = o.segments || 180, nz = noiseR(o.seed || 11);
      const cz = (o.coast || {}).z ?? 0, beach = (o.coast || {}).beach ?? 70, bluff = (o.coast || {}).bluff ?? 30, bluffW = (o.coast || {}).cliff ? 8 : ((o.coast || {}).bluffWidth ?? 70), wig = (o.coast || {}).wiggle ?? 40;
      const rough = o.roughness ?? 6;
      terrainHeight = (x, z) => {
        const d = cz + fbm(nz, x / 300, 7.3, 3) * wig - z;
        let h;
        if (d < 0) h = d * 0.12;
        else if (d < beach) h = (d / beach) * 2.2;
        else { const u = Math.min(1, (d - beach) / bluffW); h = 2.2 + bluff * u * u * (3 - 2 * u); }
        return h + fbm(nz, x / 140, z / 140, 4) * rough * Math.min(1, Math.max(0, d) / (beach + bluffW)) + fbm(nz, x / 30, z / 30, 2) * 0.4;
      };
      const geo = new T.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2);
      const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3);
      const cs = {wet: new T.Color((o.colors || {}).wet || '#8f7f63'), sand: new T.Color((o.colors || {}).sand || '#cdb68a'), grass: new T.Color((o.colors || {}).grass || '#6c8448'), rock: new T.Color((o.colors || {}).rock || '#8a8578')};
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i) + (o.x || 0), z = pos.getZ(i) + (o.z || 0), h = terrainHeight(x, z);
        pos.setY(i, h);
        const slope = Math.abs(terrainHeight(x, z + 4) - h) / 4 + Math.abs(terrainHeight(x + 4, z) - h) / 4;
        const c = slope > 0.9 ? cs.rock : h < 0.6 ? cs.wet : h < 3.2 ? cs.sand : cs.grass;
        const k = 0.92 + fbm(nz, x / 20, z / 20, 2) * 0.12;
        cols[i * 3] = c.r * k; cols[i * 3 + 1] = c.g * k; cols[i * 3 + 2] = c.b * k;
      }
      geo.setAttribute('color', new T.BufferAttribute(cols, 3)); geo.computeVertexNormals();
      const land = new T.Mesh(geo, new T.MeshStandardMaterial({vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0}));
      land.position.set(o.x || 0, 0, o.z || 0); land.receiveShadow = true; land.castShadow = true;
      scene.add(land);
    }
    let seaHeight = () => 0;
    if (ocean) {
      const o = ocean === true ? {} : ocean;
      const A = o.waves ?? 6, lambda = o.length ?? 120, dir = ((o.direction ?? 0) * Math.PI) / 180, chop = o.choppy ?? 1.6, r = K.rand(o.seed || 21);
      const waves = Array.from({length: 5}, (_, i) => { const l = lambda * (0.45 + r() * 0.9), a = dir + (r() - 0.5) * 1.1, k = (2 * Math.PI) / l; return {kx: Math.sin(a) * k, kz: Math.cos(a) * k, w: Math.sqrt(98 * k) * (o.speed ?? 1), amp: (A / 2.4) * (l / lambda) * (0.6 + r() * 0.4), ph: r() * Math.PI * 2}; });
      seaHeight = (x, z, t) => { let h = 0; for (const v of waves) { const s = (Math.sin(v.kx * x + v.kz * z - v.w * t + v.ph) + 1) / 2; h += v.amp * (2 * Math.pow(s, chop) - 1); } return h; };
      const size = o.size || 5000, seg = o.segments || 190, cell = o.cell || 12;
      const geo = new T.PlaneGeometry(2, 2, seg, seg); geo.rotateX(-Math.PI / 2);
      // Celdas pequeñas junto a la cámara y grandes hacia el horizonte (sin facetas enormes en primer plano).
      const warp = (u) => Math.sign(u) * Math.pow(Math.abs(u), 2.4) * size / 2;
      { const a = geo.attributes.position.array; for (let i = 0; i < a.length; i += 3) { a[i] = warp(a[i]); a[i + 2] = warp(a[i + 2]); } }
      const base = Float32Array.from(geo.attributes.position.array);
      const cols = new Float32Array(geo.attributes.position.count * 3);
      geo.setAttribute('color', new T.BufferAttribute(cols, 3));
      const deep = new T.Color(o.color || S.sea || '#2c5d8a'), crest = new T.Color(o.crest || '#7fa7bf'), foam = new T.Color(o.foam || '#eef4f6');
      const water = new T.Mesh(geo, new T.MeshStandardMaterial({vertexColors: true, flatShading: true, roughness: 0.62, metalness: 0.02}));
      water.receiveShadow = true; scene.add(water);
      seaMesh.position.y = -A * 3; seaMesh.material.color = deep.clone().multiplyScalar(0.6);
      const tc = new T.Color();
      updatersEarly.push((t) => {
        const ox = Math.round(cam.x / cell) * cell, oz = Math.round(cam.z / cell) * cell;
        water.position.set(ox, 0, oz);
        const arr = geo.attributes.position.array;
        for (let i = 0; i < arr.length; i += 3) {
          const h = seaHeight(base[i] + ox, base[i + 2] + oz, t);
          arr[i + 1] = h;
          const u = Math.min(1, Math.max(0, (h / A + 0.5)));
          tc.copy(deep).lerp(crest, u * 0.85);
          if (h > A * (o.foamLevel ?? 0.62)) tc.lerp(foam, Math.min(1, (h / A - (o.foamLevel ?? 0.62)) * 4));
          cols[i] = tc.r; cols[i + 1] = tc.g; cols[i + 2] = tc.b;
        }
        geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
      });
    }
    if (clouds) {
      const o = clouds === true ? {} : clouds;
      const r = K.rand(o.seed || 31), n = Math.round(14 + (o.amount ?? 0.6) * 70), hgt = o.height ?? 420, size = o.size ?? 300, spread = o.spread ?? 2600;
      const ccol = new T.Color(o.color || (S.night ? '#2a3350' : o.dark ? '#5b636e' : '#f2f2f4'));
      for (let i = 0; i < n; i++) {
        const sp = new T.Sprite(new T.SpriteMaterial({map: puff(), color: ccol.clone().multiplyScalar(0.85 + r() * 0.25), transparent: true, opacity: 0.45 + r() * 0.4, depthWrite: false, fog: true}));
        sp.position.set((r() - 0.5) * spread, hgt + (r() - 0.5) * hgt * 0.35, (r() - 0.5) * spread);
        sp.scale.set(size * (0.8 + r() * 1.4), size * (0.35 + r() * 0.35), 1);
        scene.add(sp);
      }
    }
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
    /** Altura del mar (con olas) y del terreno en un punto, para colocar o hacer flotar cosas. */
    W.seaHeight = (x, z, t) => seaHeight(x, z, t);
    W.groundHeight = (x, z) => (terrainHeight ? terrainHeight(x, z) : 0);
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

    /** Añade un modelo fabricado por el taller (K.models) en un punto [lon, lat] o {x, z}. Devuelve el objeto 3D. */
    W.add = (name, where, {scale = 1, rotate = 0, y = null, t = null, ...params} = {}) => {
      const model = K.models[name];
      if (!model) throw new Error('Modelo 3D no fabricado: ' + name + ' (hay: ' + Object.keys(K.models).join(', ') + ')');
      const obj = model.build(K.forge, params);
      const [x, z] = toXZ(where);
      obj.position.set(x, y ?? (ground === 'none' ? (terrainHeight ? terrainHeight(x, z) : 0) : HL), z);
      obj.rotation.y = (rotate * Math.PI) / 180;
      obj.scale.setScalar(scale);
      obj.userData.baseScale = scale;
      const joints = {};
      obj.traverse((n) => { if (n.name && n !== obj) joints[n.name] = n; });
      obj.userData.joints = joints;
      obj.userData.actions = obj.userData.actions || {};
      scene.add(obj);
      objects.push(obj);
      if (t !== null) W.show(obj, t);
      return obj;
    };
    /** Lleva articulaciones con nombre a unos ángulos (grados, {x, y, z}) entre t y t+dur. */
    W.pose = (obj, t, angles, dur = 0.5, ease = 'inOutSine') => {
      const rad = (d) => (d * Math.PI) / 180;
      for (const [name, rot] of Object.entries(angles)) {
        const j = (obj.userData.joints || {})[name];
        if (!j) continue;
        const last = j.userData.lastRot || {x: j.rotation.x, y: j.rotation.y, z: j.rotation.z};
        const props = {};
        for (const k of ['x', 'y', 'z']) if (rot[k] !== undefined) props[k] = [last[k], rad(rot[k])];
        j.userData.lastRot = {...last, ...Object.fromEntries(Object.entries(props).map(([k, v]) => [k, v[1]]))};
        K.tl.add(j.rotation, {...props, duration: K.ms(dur), ease}, K.ms(t));
      }
    };
    /** Ejecuta una acción del modelo (obj.userData.actions[nombre](fase, intensidad)) entre t0 y t1: andar, hablar, girar hélices… */
    W.act = (obj, name, t0, t1, {rate = 1, fade = 0.25} = {}) => {
      const fn = (obj.userData.actions || {})[name];
      if (!fn) return;
      updaters.push((tt) => {
        if (tt < t0 || tt > t1) return;
        fn((tt - t0) * rate, Math.min(1, (tt - t0) / fade, (t1 - tt) / fade));
      });
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
    /** Hace flotar un objeto en el mar con olas: sube, baja y cabecea con ellas (offset: cuánto sobresale). */
    W.float = (obj, {offset = 0, tilt = 1} = {}) => {
      const bb = new T.Box3().setFromObject(obj), bs = bb.getSize(new T.Vector3());
      const e = Math.max(4, Math.max(bs.x, bs.z) * 0.4);
      updaters.push((tt) => {
        const x = obj.position.x, z = obj.position.z;
        obj.position.y = seaHeight(x, z, tt) + offset;
        if (tilt) { const base = obj.userData.floatRot ??= {x: obj.rotation.x, z: obj.rotation.z}; obj.rotation.x = base.x - Math.atan2(seaHeight(x, z + e, tt) - seaHeight(x, z - e, tt), 2 * e) * 0.6 * tilt; obj.rotation.z = base.z + Math.atan2(seaHeight(x + e, z, tt) - seaHeight(x - e, z, tt), 2 * e) * 0.6 * tilt; }
      });
    };
    /**
     * Encuadre automático: plano 'general' | 'conjunto' | 'medio' | 'cerrado' | 'detalle' de uno o varios objetos
     * (o {x, z, w, h, d}) desde un ángulo 'frontal' | 'tres_cuartos' | 'lateral' | 'espalda' | 'picado' | 'contrapicado' | 'cenital'.
     * Calcula la distancia para que el sujeto llene el formato (vertical u horizontal) y lo sube un poco en vertical para dejar libres los subtítulos.
     */
    W.frame = (t, targets, {shot = 'medio', angle = 'tres_cuartos', side = 1, dur = 1.8, ease = 'inOutSine', yaw: extraYaw = 0} = {}) => {
      const list = Array.isArray(targets) ? targets : [targets];
      const box = new T.Box3();
      for (const o of list) {
        if (o && o.isObject3D) { o.updateMatrixWorld(true); box.expandByObject(o); }
        else if (o) { const [x, z] = toXZ(o); const w = o.w || 10, hh = o.h || 18, d = o.d || w; box.expandByPoint(new T.Vector3(x - w / 2, o.y || 0, z - d / 2)); box.expandByPoint(new T.Vector3(x + w / 2, (o.y || 0) + hh, z + d / 2)); }
      }
      if (box.isEmpty()) return;
      const size = box.getSize(new T.Vector3()), c = box.getCenter(new T.Vector3());
      const fill = {general: 0.5, conjunto: 0.66, medio: 0.82, cerrado: 1.05, detalle: 1.5}[shot] || 0.82;
      const A = {frontal: [0, 6], tres_cuartos: [35, 13], lateral: [90, 6], espalda: [180, 12], picado: [25, 42], contrapicado: [18, 2], cenital: [5, 84]}[angle] || [35, 13];
      const first = list.find((o) => o && o.isObject3D);
      const yaw = (first ? (first.rotation.y * 180) / Math.PI : 0) + A[0] * side + extraYaw;
      const vf = (camera.fov * Math.PI) / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
      // Ancho y fondo tal como los ve la cámara desde su ángulo (una lancha de espaldas solo enseña su manga).
      const yr = (yaw * Math.PI) / 180;
      const span = Math.abs(size.x * Math.cos(yr)) + Math.abs(size.z * Math.sin(yr));
      const depth = Math.abs(size.x * Math.sin(yr)) + Math.abs(size.z * Math.cos(yr));
      // En vertical, lo alargado (barcos, aviones) puede desbordar por los lados: manda la altura y el ancho cuenta menos.
      const dist = Math.max(size.y / (2 * Math.tan(vf / 2)), (span * (K.vertical ? 0.62 : 1)) / (2 * Math.tan(hf / 2))) / fill + depth * 0.5;
      // Distancia mínima según el plano, proporcional al tamaño del sujeto: un general siempre lo enseña entero y con entorno.
      const minDist = ({general: 2.4, conjunto: 1.7, medio: 1.15, cerrado: 0.75, detalle: 0.4}[shot] || 1.15) * Math.max(size.x, size.y, size.z);
      const h = c.y + (angle === 'contrapicado' ? size.y * 0.25 : 0) - (K.vertical ? size.y * 0.12 : 0);
      W.shot(t, {x: c.x, z: c.z}, {dist: Math.max(dist, minDist), pitch: A[1], yaw, h, dur});
    };
    const tmp = new T.Vector3();
    const updaters = [];
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
      for (const fn of updatersEarly) fn(t);
      for (const fn of updaters) fn(t);
      renderer.toneMappingExposure = exposure;
      const yaw = ((cam.yaw + (t - T0) * drift) * Math.PI) / 180, pitch = (K.clamp(cam.pitch, 2, 89) * Math.PI) / 180;
      camera.near = Math.max(0.5, cam.dist / 60); camera.updateProjectionMatrix();
      camera.position.set(cam.x + Math.sin(yaw) * Math.cos(pitch) * cam.dist, cam.h + Math.sin(pitch) * cam.dist, cam.z + Math.cos(yaw) * Math.cos(pitch) * cam.dist);
      { const floor = Math.max(ocean ? seaHeight(camera.position.x, camera.position.z, t) + Math.max(3, cam.dist * 0.04) : -Infinity, terrainHeight ? terrainHeight(camera.position.x, camera.position.z) + 3 : -Infinity); if (camera.position.y < floor) camera.position.y = floor; }
      camera.lookAt(cam.x, cam.h, cam.z);
      const el = (S.elev * Math.PI) / 180, az = (S.az * Math.PI) / 180;
      sun.position.set(cam.x + Math.cos(el) * Math.sin(az) * 600, Math.sin(el) * 600 + 80, cam.z + Math.cos(el) * Math.cos(az) * 600);
      sun.target.position.set(cam.x, 0, cam.z);
      fill.position.copy(camera.position).add(new T.Vector3(0, cam.dist * 0.4, 0));
      fill.target.position.set(cam.x, cam.h, cam.z);
      rimLight.position.set(cam.x - Math.sin(yaw) * cam.dist, cam.h + cam.dist * 0.7, cam.z - Math.cos(yaw) * cam.dist);
      rimLight.target.position.set(cam.x, cam.h, cam.z);
      sun.shadow.camera.left = sun.shadow.camera.bottom = -Math.max(120, cam.dist * 0.8);
      sun.shadow.camera.right = sun.shadow.camera.top = Math.max(120, cam.dist * 0.8);
      sun.shadow.camera.updateProjectionMatrix();
      if (haze || S.haze) { const far = Math.max(cam.dist * (haze || S.haze), 420); scene.fog.near = far * 0.08; scene.fog.far = far; }
      else { scene.fog.near = cam.dist * 1.4; scene.fog.far = cam.dist * 4.5; }
      if (sunSprite) { const d = scene.fog.far * 0.9; sunSprite.position.set(camera.position.x + Math.cos(el) * Math.sin(az) * d, camera.position.y + Math.sin(el) * d * 0.9 + 10, camera.position.z + Math.cos(el) * Math.cos(az) * d); sunSprite.scale.setScalar(d * 0.55); }
            if (S.night) objects.forEach((o) => o.traverse((n) => { if (n.material && n.material.emissiveMap) n.material.emissiveIntensity = 1.4; }));
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

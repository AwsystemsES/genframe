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
  /* ---------------------------------------------------------------- colisiones
   * Cada pieza se aproxima por las cajas orientadas (OBB) de sus mallas (o por sus colisionadores explícitos,
   * userData.colliders, para piezas cóncavas como los cascos abiertos). Sirve para separar lo que nace solapado,
   * para que las personas esquiven obstáculos y para que el auditor detecte cosas que se atraviesan. */
  const isOutline = (m) => m.material === OUTLINE || (m.material && m.material.isMeshBasicMaterial && m.material.side === T.BackSide);
  const obbOfMesh = (m) => {
    const g = m.geometry;
    if (!g || !g.attributes || !g.attributes.position) return null;
    if (!g.boundingBox) g.computeBoundingBox();
    const bb = g.boundingBox;
    if (!bb || bb.isEmpty()) return null;
    const e = m.matrixWorld.elements;
    const ax = [new T.Vector3(e[0], e[1], e[2]), new T.Vector3(e[4], e[5], e[6]), new T.Vector3(e[8], e[9], e[10])];
    const sc = ax.map((a) => a.length() || 1);
    ax.forEach((a, i) => a.divideScalar(sc[i]));
    const half = [((bb.max.x - bb.min.x) / 2) * sc[0], ((bb.max.y - bb.min.y) / 2) * sc[1], ((bb.max.z - bb.min.z) / 2) * sc[2]];
    const c = bb.getCenter(new T.Vector3()).applyMatrix4(m.matrixWorld);
    const ext = [0, 1, 2].map((i) => Math.abs(ax[0].getComponent(i)) * half[0] + Math.abs(ax[1].getComponent(i)) * half[1] + Math.abs(ax[2].getComponent(i)) * half[2]);
    const box = new T.Box3(new T.Vector3(c.x - ext[0], c.y - ext[1], c.z - ext[2]), new T.Vector3(c.x + ext[0], c.y + ext[1], c.z + ext[2]));
    return {c, ax, half, box, mesh: m};
  };
  /** Cajas orientadas de una pieza en su posición actual. Se ignoran contornos, sprites, máscaras, mallas diminutas y lo marcado con userData.noCollide. */
  const obbsOf = (obj, minHalf = 0.35) => {
    obj.updateMatrixWorld(true);
    const out = [];
    const push = (m) => { const o = obbOfMesh(m); if (o && Math.max(...o.half) >= minHalf) out.push(o); };
    const walk = (n) => {
      if (n.userData.noCollide || n.userData.collider || n.isSprite || n.isLight) return;
      if (n.visible === false) return;
      if (n.userData.colliders) { n.userData.colliders.forEach(push); return; }
      if (n.isMesh && !isOutline(n) && n.material && n.material.colorWrite !== false && !n.material.transparent) push(n);
      n.children.forEach(walk);
    };
    walk(obj);
    const box = new T.Box3();
    out.forEach((o) => box.union(o.box));
    return {obbs: out, box};
  };
  /** Penetración entre dos cajas orientadas (teorema de los ejes separadores); 0 si no se tocan. */
  const obbPen = (a, b) => {
    const axes = [...a.ax, ...b.ax];
    for (const x of a.ax) for (const y of b.ax) { const c = new T.Vector3().crossVectors(x, y); if (c.lengthSq() > 1e-6) axes.push(c.normalize()); }
    const d = new T.Vector3().subVectors(b.c, a.c);
    let min = Infinity;
    for (const L of axes) {
      const ra = a.half[0] * Math.abs(a.ax[0].dot(L)) + a.half[1] * Math.abs(a.ax[1].dot(L)) + a.half[2] * Math.abs(a.ax[2].dot(L));
      const rb = b.half[0] * Math.abs(b.ax[0].dot(L)) + b.half[1] * Math.abs(b.ax[1].dot(L)) + b.half[2] * Math.abs(b.ax[2].dot(L));
      const o = ra + rb - Math.abs(d.dot(L));
      if (o <= 0) return 0;
      if (o < min) min = o;
    }
    return min;
  };
  /** Peor penetración entre dos piezas (ya convertidas con obbsOf). tol: lo que se tolera (contactos, apoyos). */
  const collide = (A, B, tol = 0.8) => {
    if (!A.obbs.length || !B.obbs.length || !A.box.intersectsBox(B.box)) return null;
    let worst = null;
    for (const a of A.obbs) {
      if (!a.box.intersectsBox(B.box)) continue;
      for (const b of B.obbs) {
        if (!a.box.intersectsBox(b.box)) continue;
        const pen = obbPen(a, b);
        const lim = Math.max(tol, 0.2 * Math.min(...a.half, ...b.half));
        if (pen > lim && (!worst || pen > worst.pen)) worst = {pen, a: a.mesh, b: b.mesh};
      }
    }
    return worst;
  };
  K.collide = {obbsOf, obbPen, collide};
  /** Mundos 3D creados en este vídeo (para el auditor). */
  K._worlds = [];

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
    // De noche, menos ambiente y una luna fría: lo que brilla (farolas, ventanas, faros) resalta y el contraluz mantiene las siluetas.
    scene.add(new T.HemisphereLight(new T.Color(S.amb), new T.Color(S.night ? '#141c2c' : S.sea), S.night ? Math.max(0.5, S.ambI * 0.5) : Math.max(S.ambI, 0.95)));
    const sun = new T.DirectionalLight(new T.Color(S.night ? new T.Color(S.sun).lerp(new T.Color('#8fa8d8'), 0.5) : S.sun), S.night ? S.sunI * 0.42 : S.sunI);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = sun.shadow.camera.bottom = -220;
    sun.shadow.camera.right = sun.shadow.camera.top = 220;
    sun.shadow.camera.far = 1600;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.6;
    scene.add(sun, sun.target);
    const fill = new T.DirectionalLight(new T.Color(S.night ? '#c8d4ee' : '#ffe2c4'), S.night ? 0.5 : 0.9);
    scene.add(fill, fill.target);
    const rimLight = new T.DirectionalLight(new T.Color(S.night ? '#9fb6e0' : S.low || '#ffffff'), rim * (S.night ? 0.95 : 1.1));
    scene.add(rimLight, rimLight.target);

    const updatersEarly = [];
    // Bruma del horizonte: un anillo alrededor de la cámara, opaco hasta la altura de los ojos (color de la bruma) y transparente arriba, que funde
    // el final del mar o del suelo con el cielo sin una línea dura.
    const horizon = (() => { if (ground !== 'none') return null; const c = document.createElement('canvas'); c.width = 4; c.height = 128; const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 128); const fc = new T.Color(S.fog); const rgb = `${Math.round(fc.r * 255)},${Math.round(fc.g * 255)},${Math.round(fc.b * 255)}`; g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(0.3, `rgba(${rgb},0.45)`); g.addColorStop(0.5, `rgba(${rgb},1)`); g.addColorStop(1, `rgba(${rgb},1)`); x.fillStyle = g; x.fillRect(0, 0, 4, 128); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; const m = new T.Mesh(new T.CylinderGeometry(1, 1, 1, 48, 1, true), new T.MeshBasicMaterial({map: t, transparent: true, side: T.BackSide, depthWrite: false, fog: false, toneMapped: false})); m.renderOrder = -1; scene.add(m); return m; })();
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
    // Objetos que flotan: el mar les pinta espuma en la línea de flotación y, si navegan, estela.
    const floaters = [];
    let seaGeo = null;
    if (ocean) {
      const o = ocean === true ? {} : ocean;
      const A = o.waves ?? 6, lambda = o.length ?? 120, dir = ((o.direction ?? 0) * Math.PI) / 180, chop = o.choppy ?? 1.6, r = K.rand(o.seed || 21);
      // Gerstner: los puntos del agua se desplazan hacia la cresta (crestas afiladas, valles abiertos).
      const Q = o.gerstner ?? 0.6;
      // Espectro de ondas: longitudes repartidas en escala geométrica (de 0,3 a 1,6 veces la principal), direcciones abiertas
      // alrededor del viento y las cortas más suaves (altura ∝ longitud^1,5), como en el mar real. Con pocas ondas parecidas el agua forma un patrón de manchas que se repite; con muchas, no.
      const NW = Math.max(3, Math.round(o.ondas ?? 11)), ampK = Math.sqrt(5 / NW) * 0.85;
      const waves = Array.from({length: NW}, (_, i) => { const l = lambda * 0.3 * Math.pow(1.6 / 0.3, i / (NW - 1)) * (0.9 + r() * 0.2), a = dir + (r() - 0.5) * (1.1 + 0.9 * (1 - i / (NW - 1))), k = (2 * Math.PI) / l; return {kx: Math.sin(a) * k, kz: Math.cos(a) * k, k, w: Math.sqrt(98 * k) * (o.speed ?? 1), amp: ampK * (A / 2.4) * Math.pow(l / lambda, 1.5) * (0.6 + r() * 0.4), ph: r() * Math.PI * 2}; });
      // Desplazamiento de cada onda limitado para que la superficie nunca se pliegue sobre sí misma (Σ k·d < 1).
      waves.forEach((v) => { v.d = Math.min(Q * v.amp, (Q * 0.85) / (v.k * waves.length)); });
      seaHeight = (x, z, t) => { let h = 0; for (const v of waves) { const s = (Math.sin(v.kx * x + v.kz * z - v.w * t + v.ph) + 1) / 2; h += v.amp * (2 * Math.pow(s, chop) - 1); } return h; };
      const size = o.size || 5000, seg = o.segments || 220, cell = o.cell || 12, nzSea = noiseR((o.seed || 21) + 7);
      const geo = new T.PlaneGeometry(2, 2, seg, seg); geo.rotateX(-Math.PI / 2);
      // Celdas pequeñas junto a la cámara y grandes hacia el horizonte (sin triángulos larguísimos que dejen vetas).
      const warp = (u) => Math.sign(u) * Math.pow(Math.abs(u), 2.0) * size / 2;
      { const a = geo.attributes.position.array; for (let i = 0; i < a.length; i += 3) { a[i] = warp(a[i]); a[i + 2] = warp(a[i + 2]); } }
      const base = Float32Array.from(geo.attributes.position.array);
      const cols = new Float32Array(geo.attributes.position.count * 3);
      geo.setAttribute('color', new T.BufferAttribute(cols, 3));
      const deep = new T.Color(o.color || S.sea || '#2c5d8a'), crest = new T.Color(o.crest || '#7fa7bf'), foam = new T.Color(o.foam || '#eef4f6');
      const skyRef = new T.Color(S.mid || '#9cb4c8').lerp(deep, 0.25);
      // Rizo fino: mapa de normales de ruido, en coordenadas del mundo, que se desplaza con el viento (detalle de cerca que la
      // malla no puede tener).
      const rippleTex = (() => { const N = 256, rr = K.rand((o.seed || 21) + 3), hgt = new Float32Array(N * N); const sm = (q) => q * q * (3 - 2 * q); for (let k = 0, amp = 0.5; k < 4; k++, amp *= 0.5) { const P = 8 << k, G = Array.from({length: P * P}, () => rr()); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const fx = (x / N) * P, fy = (y / N) * P, xi = Math.floor(fx), yi = Math.floor(fy), u = sm(fx - xi), v = sm(fy - yi), g = (i, j) => G[((j % P) * P) + (i % P)]; const a0 = g(xi, yi), b0 = g(xi + 1, yi), c0 = g(xi, yi + 1), d0 = g(xi + 1, yi + 1); hgt[y * N + x] += amp * (a0 + (b0 - a0) * u + (c0 - a0) * v + (a0 - b0 - c0 + d0) * u * v); } } const c = document.createElement('canvas'); c.width = c.height = N; const x2 = c.getContext('2d'), img = x2.createImageData(N, N); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const hx = hgt[y * N + ((x + 1) % N)] - hgt[y * N + ((x + N - 1) % N)], hy = hgt[((y + 1) % N) * N + x] - hgt[((y + N - 1) % N) * N + x]; const nx = -hx * 6, ny = -hy * 6, l = Math.hypot(nx, ny, 1), i = (y * N + x) * 4; img.data[i] = (nx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (ny / l * 0.5 + 0.5) * 255; img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255; } x2.putImageData(img, 0, 0); const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; return t; })();
      const uvs = geo.attributes.uv, rippleScale = o.rizo ?? 70;
      const water = new T.Mesh(geo, new T.MeshStandardMaterial({vertexColors: true, flatShading: false, roughness: o.roughness ?? 0.6, metalness: 0.0, normalMap: rippleTex, normalScale: new T.Vector2(o.rizoFuerza ?? 0.3, o.rizoFuerza ?? 0.3)}));
      water.receiveShadow = true; water.renderOrder = 2; scene.add(water);
      seaGeo = geo;
      seaMesh.position.y = -A * 3; seaMesh.material.color = deep.clone().multiplyScalar(0.6); seaMesh.renderOrder = 2; seaMesh.scale.setScalar(25);
      const tc = new T.Color(), nrm = new T.Vector3(), view = new T.Vector3();
      const foamLevel = o.foamLevel ?? 0.62, slopeFoam = o.foamSlope ?? 0.42;
      updatersEarly.push((t) => {
        const ox = Math.round(cam.x / cell) * cell, oz = Math.round(cam.z / cell) * cell;
        water.position.set(ox, 0, oz);
        // Que el agua llegue siempre más allá de la cámara y de la bruma: en planos lejanos la malla se agranda (a saltos
        // de media vez, para no hacer temblar las olas) y nunca se ve su borde ni el fondo oscuro de debajo.
        const reach = Math.hypot(camera.position.x - ox, camera.position.z - oz) + scene.fog.far;
        const sc = Math.max(1, Math.ceil((reach / (size / 2)) * 2) / 2);
        seaMesh.position.set(camera.position.x, seaMesh.position.y, camera.position.z);
        const arr = geo.attributes.position.array;
        for (let i = 0; i < arr.length; i += 3) {
          const x = base[i] * sc + ox, z = base[i + 2] * sc + oz;
          let dx = 0, dz = 0;
          for (const v of waves) { const c = Math.cos(v.kx * x + v.kz * z - v.w * t + v.ph) * v.d; dx += c * (v.kx / v.k); dz += c * (v.kz / v.k); }
          arr[i] = base[i] * sc + dx; arr[i + 1] = seaHeight(x, z, t); arr[i + 2] = base[i + 2] * sc + dz;
          const j = (i / 3) * 2; uvs.array[j] = x / rippleScale + t * 0.05; uvs.array[j + 1] = z / rippleScale + t * 0.03;
        }
        uvs.needsUpdate = true;
        geo.attributes.position.needsUpdate = true;
        geo.computeVertexNormals();
        // Espuma de los objetos que flotan: anillo en la línea de flotación y estela si navegan.
        const fl = floaters.map((f) => {
          const ob = f.obj, yaw = ob.rotation.y, v = f.speed(t);
          return {x: ob.position.x, z: ob.position.z, c: Math.cos(yaw), s: Math.sin(yaw), hl: f.hl, hb: f.hb, ring: Math.max(2, f.hb * 0.3), trail: v > 0.5 ? Math.min(f.hl * 4, f.hl * 0.6 + v * 2.2) : 0, R2: Math.pow(Math.max(f.hl, f.hb) * 1.6 + (v > 0.5 ? Math.min(f.hl * 4, f.hl * 0.6 + v * 2.2) : 0), 2)};
        });
        const nr = geo.attributes.normal.array;
        for (let i = 0; i < arr.length; i += 3) {
          const px = arr[i] + ox, py = arr[i + 1], pz = arr[i + 2] + oz;
          const u = Math.min(1, Math.max(0, py / A + 0.5));
          tc.copy(deep).lerp(crest, u * 0.8);
          // Manchas amplias de luz y sombra que derivan despacio: rompen la regularidad de las ondas.
          const blot = fbm(nzSea, px / 520 + t * 0.012, pz / 520 - t * 0.008, 3);
          tc.multiplyScalar(1 + blot * (o.manchas ?? 0.22));
          // Reflejo del cielo según el ángulo (Fresnel): el agua lejana y rasante refleja más.
          nrm.set(nr[i], nr[i + 1], nr[i + 2]);
          view.set(camera.position.x - px, camera.position.y - py, camera.position.z - pz).normalize();
          const fres = Math.pow(1 - Math.max(0, nrm.dot(view)), 4);
          tc.lerp(skyRef, fres * (o.reflejo ?? 0.32));
          // Espuma en las crestas: por altura y por pendiente (donde la ola rompe).
          let f = 0;
          if (py > A * foamLevel) f = Math.min(1, (py / A - foamLevel) * 4);
          if (nrm.y < 1 - slopeFoam * 0.35 && py > A * 0.4) f = Math.max(f, Math.min(0.35, (1 - nrm.y - slopeFoam * 0.35) * 2.2));
          for (const q of fl) {
            const ddx = px - q.x, ddz = pz - q.z;
            if (ddx * ddx + ddz * ddz > q.R2) continue;
            const lx = ddx * q.c - ddz * q.s, lz = ddx * q.s + ddz * q.c;
            // Distancia a la línea de flotación con forma de casco: manga completa en el centro y afinándose hacia proa y popa.
            const zz = Math.min(1, Math.abs(lz) / q.hl), half = q.hb * Math.sqrt(Math.max(0, 1 - Math.pow(zz, 4)));
            const d = Math.abs(lz) <= q.hl ? Math.abs(lx) - half : Math.hypot(Math.abs(lz) - q.hl, Math.abs(lx));
            if (d > -1 && d < q.ring) { const brk = 0.55 + 0.45 * nzSea(px / 9 + t * 0.6, pz / 9); f = Math.max(f, 0.8 * brk * (1 - Math.max(0, d) / q.ring)); }
            if (q.trail) { const along = -lz - q.hl; if (along > 0 && along < q.trail && Math.abs(lx) < q.hb * (0.5 + (along / q.trail) * 0.9)) f = Math.max(f, 0.75 * (1 - along / q.trail)); }
          }
          if (f > 0) tc.lerp(foam, f);
          cols[i] = tc.r; cols[i + 1] = tc.g; cols[i + 2] = tc.b;
        }
        geo.attributes.color.needsUpdate = true;
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

    /**
     * Añade un modelo fabricado por el taller (K.models) en un punto [lon, lat] o {x, z}. Devuelve el objeto 3D.
     * Opciones del motor (el resto va a la pieza): scale, rotate, y (altura fija: la pieza vuela o cuelga), t (aparece en t),
     * separar (true: si nace atravesando otra pieza, se aparta lo justo y avisa), fantasma (no choca con nada), suelo (false: no sigue el terreno).
     */
    W.add = (name, where, {scale = 1, rotate = 0, y = null, t = null, separar = true, fantasma = false, suelo = true, ...params} = {}) => {
      const model = K.models[name];
      if (!model) throw new Error('Modelo 3D no fabricado: ' + name + ' (hay: ' + Object.keys(K.models).join(', ') + ')');
      const obj = model.build(K.forge, params);
      obj.name = obj.name || name;
      // Huella local (sin girar ni mover), para flotar, esquivar y formar.
      obj.updateMatrixWorld(true);
      const lb = new T.Box3().setFromObject(obj);
      obj.userData.local = {min: lb.min.clone().multiplyScalar(scale), max: lb.max.clone().multiplyScalar(scale)};
      const [x, z] = toXZ(where);
      obj.position.set(x, y ?? (ground === 'none' ? (terrainHeight ? terrainHeight(x, z) : 0) : HL), z);
      obj.rotation.y = (rotate * Math.PI) / 180;
      obj.scale.setScalar(scale);
      obj.userData.baseScale = scale;
      obj.userData.model = name;
      obj.userData.ghost = !!fantasma;
      obj.userData.grounded = y === null && suelo !== false;
      const joints = {};
      obj.traverse((n) => { if (n.name && n !== obj) joints[n.name] = n; });
      obj.userData.joints = joints;
      obj.userData.actions = obj.userData.actions || {};
      scene.add(obj);
      if (separar && !fantasma) separate(obj);
      objects.push(obj);
      if (t !== null) W.show(obj, t);
      return obj;
    };
    /** Aparta una pieza recién puesta de las que ya había si se atraviesan (lo justo, en horizontal; si vuela, también en vertical). */
    const separate = (obj) => {
      const others = objects.filter((o) => o.parent === scene && !o.userData.ghost && !o.userData.trafico);
      if (!others.length) return;
      const lim = obj.userData.local, span = Math.max(lim.max.x - lim.min.x, lim.max.z - lim.min.z, 1);
      let moved = 0, hit = null;
      for (let it = 0; it < 14; it++) {
        const A = obbsOf(obj);
        hit = null;
        for (const o of others) { const c = collide(A, obbsOf(o)); if (c) { hit = {o, ...c}; break; } }
        if (!hit) break;
        const ob = new T.Box3().setFromObject(hit.o), oc = ob.getCenter(new T.Vector3());
        const d = new T.Vector3(obj.position.x - oc.x, obj.userData.grounded ? 0 : obj.position.y - oc.y, obj.position.z - oc.z);
        if (d.lengthSq() < 1e-6) d.set(1, 0, 0.3);
        d.normalize().multiplyScalar(Math.max(hit.pen, span * 0.06) * 1.05);
        obj.position.add(d); moved += d.length();
        if (obj.userData.grounded) obj.position.y = ground === 'none' ? (terrainHeight ? terrainHeight(obj.position.x, obj.position.z) : 0) : HL;
      }
      if (moved > 0) console.warn(`genframe: «${obj.userData.model}» nacía atravesando otra pieza; se ha apartado ${moved.toFixed(1)} unidades${hit ? ' (sigue tocando «' + hit.o.userData.model + '»: revisa la colocación)' : ''}.`);
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
      (obj.userData._acts = obj.userData._acts || []).push({name, t0, t1, rate});
      updaters.push((tt) => {
        if (tt < t0 || tt > t1) return;
        fn((tt - t0) * rate, Math.min(1, (tt - t0) / fade, (t1 - tt) / fade));
      });
    };
    /** Aparece creciendo con rebote en t. */
    W.show = (obj, t, dur = 0.6) => { const s = obj.userData.baseScale || 1; obj.scale.setScalar(0.0001); K.tl.add(obj.scale, {x: [0.0001, s], y: [0.0001, s], z: [0.0001, s], duration: K.ms(dur), ease: 'outBack'}, K.ms(t)); };
    W.hide = (obj, t, dur = 0.4) => { const s = obj.userData.baseScale || 1; K.tl.add(obj.scale, {x: [s, 0.0001], y: [s, 0.0001], z: [s, 0.0001], duration: K.ms(dur), ease: 'inBack'}, K.ms(t)); };
    /** Mueve un objeto a otro punto entre t y t+dur (mirando hacia donde va). Si es una persona, mejor w.walk (pies sin patinar). */
    W.move = (obj, t, to, dur = 2, ease = 'inOutSine') => {
      const [x, z] = toXZ(to);
      const from = obj.userData.lastXZ || [obj.position.x, obj.position.z];
      obj.userData.lastXZ = [x, z];
      (obj.userData.track = obj.userData.track || []).push({t0: t, t1: t + dur, x0: from[0], z0: from[1], x1: x, z1: z});
      const ry = Math.atan2(x - from[0], z - from[1]);
      K.tl.add(obj.rotation, {y: [obj.rotation.y, ry], duration: 300, ease: 'inOutSine'}, K.ms(t));
      K.tl.add(obj.position, {x: [from[0], x], z: [from[1], z], duration: K.ms(dur), ease}, K.ms(t));
    };
    /** Velocidad horizontal (unidades/s) de un objeto en t según sus trayectorias registradas (w.move, w.walk). */
    const speedOf = (obj, t) => { for (const s of obj.userData.track || []) if (t >= s.t0 && t <= s.t1) return Math.hypot(s.x1 - s.x0, s.z1 - s.z0) / Math.max(0.01, s.t1 - s.t0); return 0; };
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
      const el = K.el(labels, 'div', {html: text, style: {position: 'absolute', left: '0', top: '0', whiteSpace: 'nowrap', transform: 'translate(-50%, -100%)', fontFamily: style === 'title' ? 'var(--title)' : 'var(--label)', fontSize: style === 'title' ? (K.vertical ? '72px' : '64px') : (K.vertical ? '44px' : '36px'), color: '#fff', textShadow: '0 0 2px #000, 2px 2px 0 #000, -2px 2px 0 #000, 2px -2px 0 #000, -2px -2px 0 #000', letterSpacing: '.04em', textTransform: 'uppercase', opacity: 0}});
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
    /**
     * Efectos de partículas deterministas, con profundidad (lo que queda detrás de una pieza no se ve):
     * 'fire', 'smoke' (humo iluminado: oscuro al nacer, claro al subir), 'explosion', 'rain', 'sparkle',
     * 'fogonazo' (boca de cañón: destello alargado y luz que ilumina lo de alrededor; se repite con `cada` segundos),
     * 'columna' (impacto en el suelo o el agua: columna que sube y cae con gravedad, restos en parábola y marca oscura; material 'arena'|'agua'|'tierra').
     * where: [lon, lat], {x, z, y} o una pieza (se ancla a ella; `offset` {x, y, z} en sus coordenadas). Sin y, nace en el suelo o en el mar.
     * opts: size, n, seed, dir (vector de salida del fogonazo), cada, shake (sacude la cámara en cada disparo o impacto).
     */
    W.fx = (kind, where, t0, t1, {size = 1, n = null, seed = 5, dir = null, cada = 0, shake = 0, material = 'arena', offset = null, wind = 0} = {}) => {
      const r = K.rand(seed);
      const anchor = where && where.isObject3D ? where : null;
      const fixed = anchor ? null : (() => { const [x, z] = toXZ(where); return {x, z, y: where && where.y !== undefined ? where.y : null}; })();
      const off = new T.Vector3(offset ? offset.x || 0 : 0, offset ? offset.y || 0 : 0, offset ? offset.z || 0 : 0);
      const tmpP = new T.Vector3();
      const baseAt = (tt) => {
        if (anchor) { tmpP.copy(off); anchor.localToWorld(tmpP); return tmpP; }
        const y = fixed.y !== null ? fixed.y : ground !== 'none' ? HL : ocean && !terrainHeight ? seaHeight(fixed.x, fixed.z, tt) : terrainHeight ? Math.max(terrainHeight(fixed.x, fixed.z), ocean ? seaHeight(fixed.x, fixed.z, tt) : -Infinity) : 0;
        return tmpP.set(fixed.x, y, fixed.z);
      };
      const sprite = (color, blending = T.AdditiveBlending) => { const m = new T.Sprite(new T.SpriteMaterial({map: puff(), color: new T.Color(color), transparent: true, opacity: 0, depthWrite: false, depthTest: true, blending})); scene.add(m); return m; };
      const shakeAt = (tt) => { if (shake) shakes.push({t: tt, a: shake}); };
      if (kind === 'fogonazo') {
        const period = cada || 0, count = n || 9;
        const d = new T.Vector3(...(dir ? [dir.x || 0, dir.y || 0, dir.z || 1] : [0, 0, 1])).normalize();
        const parts = Array.from({length: count}, (_, i) => ({m: sprite(i < 3 ? '#fff6d8' : i % 2 ? '#ffb347' : '#ff7a2a'), u: i / count, j: (r() - 0.5) * 0.5}));
        const light = new T.PointLight(new T.Color('#ffb860'), 0, 60 * size, 1.4); scene.add(light);
        const shots = []; for (let ts = t0; ts <= t1 && shots.length < 400; ts += period || 1e9) { shots.push(ts); shakeAt(ts); if (!period) break; }
        updaters.push((tt) => {
          let last = null; for (const s0 of shots) if (tt >= s0) last = s0;
          const age = last === null ? 9 : tt - last, on = age < 0.16;
          const p = baseAt(tt), wd = anchor ? d.clone().transformDirection(anchor.matrixWorld) : d;
          light.position.copy(p); light.intensity = on ? 9 * size * (1 - age / 0.16) : 0;
          for (const q of parts) {
            if (!on) { q.m.material.opacity = 0; continue; }
            const k = 1 - age / 0.16;
            q.m.position.copy(p).addScaledVector(wd, (q.u * 9 + 1) * size * (0.6 + (1 - k) * 0.8)).add(new T.Vector3(q.j, q.j * 0.6, -q.j).multiplyScalar(size * 2));
            q.m.scale.setScalar(size * (5.5 - q.u * 3.5) * (0.7 + k * 0.5));
            q.m.material.opacity = k * (q.u < 0.3 ? 1 : 0.85);
          }
        });
        return;
      }
      if (kind === 'columna') {
        const pal = {arena: ['#d9c39c', '#bfa57c', '#8f7b5a'], agua: ['#e8f1f6', '#bcd3e0', '#8fb0c4'], tierra: ['#7a6650', '#5f4d3b', '#463a2e']}[material] || ['#d9c39c', '#bfa57c', '#8f7b5a'];
        const count = n || 46, life = 2.1;
        const parts = Array.from({length: count}, (_, i) => ({m: sprite(pal[i % 3], T.NormalBlending), vx: (r() - 0.5) * 6, vz: (r() - 0.5) * 6, vy: 22 + r() * 26, s: 3.4 + r() * 4, d: r() * 0.12}));
        const debris = Array.from({length: Math.round(count / 3)}, () => { const m = new T.Mesh(new T.BoxGeometry(0.7, 0.5, 0.6), toon(pal[2])); m.visible = false; scene.add(m); return {m, vx: (r() - 0.5) * 30, vz: (r() - 0.5) * 30, vy: 18 + r() * 26, sp: r() * 10}; });
        const scorch = new T.Mesh(new T.CircleGeometry(1, 20), new T.MeshBasicMaterial({color: new T.Color(material === 'agua' ? '#f2f6f8' : '#2a241e'), transparent: true, opacity: 0, depthWrite: false}));
        scorch.rotation.x = -Math.PI / 2; scene.add(scorch);
        const flash = new T.PointLight(new T.Color('#ffc070'), 0, 90 * size, 1.5); scene.add(flash);
        const shots = []; for (let ts = t0; ts <= t1 && shots.length < 200; ts += cada || 1e9) { shots.push(ts); shakeAt(ts); if (!cada) break; }
        const g = 30 * size;
        updaters.push((tt) => {
          let last = null; for (const s0 of shots) if (tt >= s0) last = s0;
          const age = last === null ? -1 : tt - last;
          const p = baseAt(last === null ? tt : last).clone();
          flash.position.set(p.x, p.y + 4 * size, p.z); flash.intensity = age >= 0 && age < 0.18 && material !== 'agua' ? 7 * size * (1 - age / 0.18) : 0;
          for (const q of parts) {
            const a = age - q.d;
            if (a < 0 || a > life) { q.m.material.opacity = 0; continue; }
            q.m.position.set(p.x + q.vx * a * size, p.y + Math.max(0, (q.vy * a - 0.5 * g * a * a / size) * size), p.z + q.vz * a * size + wind * a * a * size);
            q.m.scale.setScalar(size * q.s * (1 + a * 1.6));
            q.m.material.opacity = Math.min(1, a * 10) * Math.pow(Math.max(0, 1 - a / life), 0.7);
          }
          for (const q of debris) {
            if (age < 0 || age > 1.6) { q.m.visible = false; continue; }
            const y = q.vy * age - 0.5 * g * age * age / size;
            q.m.visible = y > -1;
            q.m.position.set(p.x + q.vx * age * size, p.y + y * size, p.z + q.vz * age * size);
            q.m.rotation.set(age * q.sp, age * q.sp * 0.7, 0); q.m.scale.setScalar(size);
          }
          scorch.position.set(p.x, p.y + 0.15, p.z); scorch.scale.setScalar(size * 6 * Math.min(1, Math.max(0, age) * 6));
          scorch.material.opacity = age >= 0 ? Math.min(0.55, age * 4) * (material === 'agua' ? Math.max(0, 1 - age / 1.2) : 1) : 0;
        });
        return;
      }
      const col = {fire: ['#ffb02e', '#ff5a1f', '#ffe066'], smoke: ['#3f3c44', '#5e5a62', '#7d7884'], explosion: ['#fff2b0', '#ff8a1f', '#d6331f'], rain: ['#bcd6ff'], sparkle: ['#fff6b0', '#ffd84a']}[kind] || ['#fff'];
      const count = n || 40;
      const parts = [];
      for (let i = 0; i < count; i++) {
        let m;
        if (kind === 'rain') { m = new T.Mesh(new T.BoxGeometry(0.15, 3, 0.15), new T.MeshBasicMaterial({color: new T.Color(col[i % col.length]), transparent: true, opacity: 0})); scene.add(m); }
        else { m = sprite(col[i % col.length], kind === 'smoke' ? T.NormalBlending : T.AdditiveBlending); m.userData.sprite = true; }
        parts.push({m, ph: r(), dx: (r() - 0.5) * 8 * size, dz: (r() - 0.5) * 8 * size, sp: 0.6 + r() * 0.8});
      }
      if (kind === 'explosion') shakeAt(t0);
      const dark = new T.Color('#2d2a30'), light = new T.Color(kind === 'smoke' ? '#b9b4ba' : '#ffffff');
      updaters.push((tt) => {
        const on = tt >= t0 && tt <= t1;
        const p = baseAt(tt);
        for (const q of parts) {
          if (!on) { q.m.material.opacity = 0; continue; }
          const life = ((tt - t0) * q.sp + q.ph) % 1;
          if (kind === 'rain') { q.m.position.set(p.x + q.dx * 12, p.y + 80 - life * 80, p.z + q.dz * 12); q.m.material.opacity = 0.6; continue; }
          const rise = kind === 'smoke' ? 30 : kind === 'explosion' ? 14 : 10;
          const spread = kind === 'explosion' ? 1 + life * 2.5 : 1 + life;
          q.m.position.set(p.x + q.dx * spread * 0.4 + wind * life * 20 * size, p.y + life * rise * size, p.z + q.dz * spread * 0.4);
          q.m.scale.setScalar((kind === 'smoke' ? 1 + life * 2.5 : 1.2 - life) * size * (q.m.userData.sprite ? 3.2 : 1));
          if (kind === 'smoke') q.m.material.color.copy(dark).lerp(light, Math.min(1, life * 1.4));
          q.m.material.opacity = Math.sin(life * Math.PI) * (kind === 'smoke' ? 0.6 : 0.95);
        }
      });
    };
    /* ---------------- movimiento con criterio: rutas a pie, formaciones y repartos sin choques ---------------- */
    /** Huella de una pieza en planta: centro, semiejes y giro (para esquivar y separar). */
    const footprint = (o) => {
      const l = o.userData.local; if (!l) return null;
      const sc = o.scale.x, cx = (l.min.x + l.max.x) / 2, cz = (l.min.z + l.max.z) / 2, yaw = o.rotation.y, c = Math.cos(yaw), sn = Math.sin(yaw);
      return {x: o.position.x + cx * c + cz * sn, z: o.position.z - cx * sn + cz * c, hb: ((l.max.x - l.min.x) / 2) * (sc / (o.userData.baseScale || 1)), hl: ((l.max.z - l.min.z) / 2) * (sc / (o.userData.baseScale || 1)), c, s: sn, ymin: o.position.y + l.min.y, ymax: o.position.y + l.max.y};
    };
    const gaitOf = (obj, paso) => {
      const l = obj.userData.local || {min: {y: 0}, max: {y: 18}}, H = l.max.y - l.min.y;
      const g = (obj.userData.gaits || {})[paso];
      return g || (paso === 'correr' ? {omega: 10, stride: H * 1.4} : {omega: 6.2, stride: H * 0.8});
    };
    /**
     * Lleva una pieza (normalmente una persona) por una ruta a pie desde t0: la zancada sale de la distancia recorrida
     * (los pies no patinan), sigue la altura del terreno, mira hacia donde va y rodea los obstáculos que encuentra.
     * ruta: [{x, z} | [lon, lat], …] (si es un solo punto, va desde donde está). opts: hasta (t de llegada) o velocidad (u/s),
     * paso: 'andar'|'correr' (acción de la pieza), esquivar (true), acelerar (s). Devuelve {t1, largo}.
     */
    W.walk = (obj, ruta, t0, {hasta = null, velocidad = null, paso = 'andar', esquivar = true, acelerar = 0.35} = {}) => {
      const raw = (Array.isArray(ruta) && ruta.length && (Array.isArray(ruta[0]) || typeof ruta[0] === 'object') ? ruta : [ruta]).map((q) => toXZ(q));
      if (raw.length === 1) raw.unshift([obj.position.x, obj.position.z]);
      const g = gaitOf(obj, paso), natural = (g.stride * g.omega) / (2 * Math.PI);
      const me = obj.userData.local, rad = (me ? Math.max(me.max.x - me.min.x, me.max.z - me.min.z) * 0.5 : 4) + 2.5;
      let path = null, cum = null, L = 0;
      const build = () => {
        // Ruta densa cada 2 unidades; se empuja fuera de los obstáculos (con margen) y se suaviza, varias pasadas.
        let pts = [];
        for (let i = 0; i < raw.length - 1; i++) { const [ax, az] = raw[i], [bx, bz] = raw[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 2)); for (let k = 0; k < n; k++) pts.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]); }
        pts.push(raw[raw.length - 1].slice());
        if (esquivar) {
          const obs = objects.filter((o) => o !== obj && o.parent === scene && !o.userData.ghost && !o.userData.floating && !o.userData.walking && !o.userData.trafico).map(footprint).filter(Boolean).filter((f) => f.ymax > (obj.position.y + 1) && f.ymin < obj.position.y + 15);
          if (obs.length) {
            // Búsqueda de camino (A*) sobre una rejilla con los obstáculos inflados por el tamaño de quien camina; después se
            // estira el camino (solo se quedan las esquinas necesarias). Si no cabe por un hueco, lo rodea.
            const blocked = (x, z) => obs.some((f) => { const dx = x - f.x, dz = z - f.z, lx = dx * f.c - dz * f.s, lz = dx * f.s + dz * f.c; return Math.abs(lx) < f.hb + rad && Math.abs(lz) < f.hl + rad; });
            const big = Math.max(...obs.map((f) => Math.max(f.hb, f.hl))) + rad;
            const xs = raw.map((q) => q[0]), zs = raw.map((q) => q[1]);
            const x0 = Math.min(...xs) - 60 - big * 3, z0 = Math.min(...zs) - 60 - big * 3, x1 = Math.max(...xs) + 60 + big * 3, z1 = Math.max(...zs) + 60 + big * 3;
            const cell = Math.max(1.5, rad * 0.35), nx = Math.ceil((x1 - x0) / cell) + 1, nz = Math.ceil((z1 - z0) / cell) + 1;
            const occ = new Uint8Array(nx * nz);
            for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) occ[j * nx + i] = blocked(x0 + i * cell, z0 + j * cell) ? 1 : 0;
            const ci = (x) => K.clamp(Math.round((x - x0) / cell), 0, nx - 1), cj = (z) => K.clamp(Math.round((z - z0) / cell), 0, nz - 1);
            const astar = (a, b) => {
              const si = ci(a[0]), sj = cj(a[1]), ti = ci(b[0]), tj = cj(b[1]), N = nx * nz;
              const g = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), done = new Uint8Array(N);
              const heap = [], h = (i, j) => { const dx = Math.abs(i - ti), dz = Math.abs(j - tj); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
              const pushH = (k, f) => { heap.push([f, k]); let c = heap.length - 1; while (c > 0) { const p2 = (c - 1) >> 1; if (heap[p2][0] <= heap[c][0]) break; [heap[p2], heap[c]] = [heap[c], heap[p2]]; c = p2; } };
              const popH = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = c * 2 + 1, r2 = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r2 < heap.length && heap[r2][0] < heap[m][0]) m = r2; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
              const s0 = sj * nx + si, t0k = tj * nx + ti;
              g[s0] = 0; pushH(s0, h(si, sj));
              while (heap.length) {
                const [, k] = popH();
                if (done[k]) continue; done[k] = 1;
                if (k === t0k) break;
                const i = k % nx, j = (k / nx) | 0;
                for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
                  const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= nx || jj >= nz) continue;
                  const kk = jj * nx + ii; if (occ[kk] && kk !== t0k) continue;
                  if (di && dj && (occ[j * nx + ii] || occ[jj * nx + i])) continue;
                  const ng = g[k] + (di && dj ? 1.414 : 1);
                  if (ng < g[kk]) { g[kk] = ng; from[kk] = k; pushH(kk, ng + h(ii, jj)); }
                }
              }
              if (from[t0k] < 0 && t0k !== s0) return [a, b];
              const cells = []; for (let k = t0k; k >= 0; k = from[k]) { cells.push([x0 + (k % nx) * cell, z0 + ((k / nx) | 0) * cell]); if (k === s0) break; }
              cells.reverse(); cells[0] = a; cells[cells.length - 1] = b;
              return cells;
            };
            const clear = (a, b) => { const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (cell * 0.5)); for (let k = 1; k < n; k++) { const u = k / n; if (blocked(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u)) return false; } return true; };
            let route = [raw[0]];
            for (let i = 0; i < raw.length - 1; i++) route = route.concat(astar(raw[i], raw[i + 1]).slice(1));
            // Estirar: desde cada punto, saltar al más lejano que se vea sin obstáculos.
            const pulled = [route[0]];
            for (let i = 0; i < route.length - 1;) { let j = route.length - 1; while (j > i + 1 && !clear(route[i], route[j])) j--; pulled.push(route[j]); i = j; }
            pts = [];
            for (let i = 0; i < pulled.length - 1; i++) { const [ax, az] = pulled[i], [bx, bz] = pulled[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 2)); for (let k = 0; k < n; k++) pts.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]); }
            pts.push(pulled[pulled.length - 1].slice());
            // Esquinas un poco redondeadas sin volver a meterse en nada.
            for (let it = 0; it < 3; it++) pts = pts.map((q, i) => { if (i === 0 || i === pts.length - 1) return q; const m = [(pts[i - 1][0] + q[0] * 2 + pts[i + 1][0]) / 4, (pts[i - 1][1] + q[1] * 2 + pts[i + 1][1]) / 4]; return blocked(m[0], m[1]) ? q : m; });
          }
        }
        path = pts; cum = [0];
        for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
        L = cum[cum.length - 1];
      };
      // La ruta se calcula en el primer fotograma, cuando ya están todas las piezas de la escena.
      const straight = raw.reduce((a, q, i) => (i ? a + Math.hypot(q[0] - raw[i - 1][0], q[1] - raw[i - 1][1]) : 0), 0);
      const v0 = velocidad || (hasta ? straight / Math.max(0.2, hasta - t0 - acelerar) : natural);
      const t1 = hasta || t0 + straight / v0 + acelerar;
      obj.userData.walking = (obj.userData.walking || []).concat([{t0, t1}]);
      (obj.userData.track = obj.userData.track || []).push({t0, t1, x0: raw[0][0], z0: raw[0][1], x1: raw[raw.length - 1][0], z1: raw[raw.length - 1][1]});
      const at = (s) => { let i = 1; while (i < cum.length - 1 && cum[i] < s) i++; const u = (s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]); return [path[i - 1][0] + (path[i][0] - path[i - 1][0]) * u, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * u]; };
      updaters.push((tt) => {
        if (!path) build();
        const v = L / Math.max(0.2, t1 - t0 - acelerar);
        const u = K.clamp(tt - t0, 0, t1 - t0), ta = Math.min(acelerar, (t1 - t0) / 2), T = t1 - t0;
        let sd, sp;
        if (u < ta) { sd = (v * u * u) / (2 * ta); sp = (v * u) / ta; } else if (u > T - ta) { const w = T - u; sd = L - (v * w * w) / (2 * ta); sp = (v * w) / ta; } else { sd = v * (u - ta / 2); sp = v; }
        sd = K.clamp(sd, 0, L);
        const [x, z] = at(sd), [xa, za] = at(Math.max(0, sd - 2)), [xb, zb] = at(Math.min(L, sd + 2));
        obj.position.x = x; obj.position.z = z;
        if (terrainHeight) obj.position.y = terrainHeight(x, z);
        if (tt >= t0 - 0.05 && Math.hypot(xb - xa, zb - za) > 0.5) obj.rotation.y = Math.atan2(xb - xa, zb - za);
        const fn = (obj.userData.actions || {})[paso];
        if (fn && tt >= t0 - 0.1 && tt <= t1 + 0.4) fn((sd / g.stride) * ((2 * Math.PI) / g.omega), Math.min(1, sp / Math.max(1e-3, v)));
      });
      return {t1, largo: straight};
    };
    /**
     * Formación de n piezas iguales separadas según su tamaño real (nunca se atraviesan): 'V' (aviones, aves), 'fila'
     * (hombro con hombro), 'columna' (una tras otra), 'rejilla'. center: {x, z} o [lon, lat]. opts: rotate (hacia dónde
     * miran), y, separacion (×tamaño, por defecto 1.3), escalon (altura extra por puesto), params ((i) => ({…}) para variar cada
     * puesto) y el resto, parámetros de la pieza.
     */
    W.formation = (name, n, center, {tipo = 'V', rotate = 0, y = null, separacion = 1.3, escalon = 0, params: per = null, ...params} = {}) => {
      const first = W.add(name, center, {...params, ...(per ? per(0) : {}), rotate, y, separar: false});
      const l = first.userData.local, wd = (l.max.x - l.min.x) * separacion, dp = (l.max.z - l.min.z) * separacion;
      const [cx, cz] = toXZ(center), yaw = (rotate * Math.PI) / 180, c = Math.cos(yaw), sn = Math.sin(yaw);
      const cols = Math.ceil(Math.sqrt(n));
      const slot = (i) => {
        if (tipo === 'fila') return [(i - (n - 1) / 2) * wd, 0];
        if (tipo === 'columna') return [0, -i * dp];
        if (tipo === 'rejilla') return [((i % cols) - (cols - 1) / 2) * wd, -Math.floor(i / cols) * dp];
        const row = Math.ceil(i / 2), side = i % 2 ? -1 : 1; return [side * row * wd * 0.55, -row * dp * 0.75];
      };
      const list = [first];
      const place = (o, i) => { const [lx, lz] = slot(i); o.position.x = cx + lx * c + lz * sn; o.position.z = cz - lx * sn + lz * c; if (y !== null) o.position.y = y + escalon * Math.ceil(i / 2); else if (o.userData.grounded) o.position.y = terrainHeight ? terrainHeight(o.position.x, o.position.z) : o.position.y; };
      place(first, 0);
      for (let i = 1; i < n; i++) { const o = W.add(name, center, {...params, ...(per ? per(i) : {}), rotate, y, separar: false}); place(o, i); list.push(o); }
      return list;
    };
    /**
     * Reparte n piezas por una zona sin que se toquen entre sí ni con lo que ya hay (muestreo de Poisson con semilla).
     * zona: {x, z, w, d} (rectángulo centrado) o {x, z, r} (círculo). opts: seed, separacion (×tamaño, 1.15), giro ('azar' o grados),
     * y el resto, parámetros de la pieza (si es una función (i) => ({…}), se llama para cada una: variantes).
     */
    W.scatter = (name, n, zona, {seed = 3, separacion = 1.15, giro = 'azar', params: per = null, ...params} = {}) => {
      const r = K.rand(seed), list = [];
      const probe = W.add(name, {x: zona.x, z: zona.z}, {...params, ...(per ? per(0) : {}), separar: false});
      const l = probe.userData.local, rad = (Math.hypot(l.max.x - l.min.x, l.max.z - l.min.z) / 2) * separacion * 0.8;
      scene.remove(probe); objects.splice(objects.indexOf(probe), 1);
      const fixedFp = objects.filter((o) => o.parent === scene && !o.userData.ghost).map(footprint).filter(Boolean);
      const pick = () => (zona.r ? (() => { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * zona.r; return [zona.x + Math.cos(a) * d, zona.z + Math.sin(a) * d]; })() : [zona.x + (r() - 0.5) * zona.w, zona.z + (r() - 0.5) * zona.d]);
      const placed = [];
      for (let tries = 0; tries < n * 80 && placed.length < n; tries++) {
        const [x, z] = pick();
        if (placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < rad * 2)) continue;
        if (fixedFp.some((f) => Math.hypot(f.x - x, f.z - z) < rad + Math.hypot(f.hb, f.hl) * 0.75)) continue;
        placed.push([x, z]);
      }
      placed.forEach(([x, z], i) => list.push(W.add(name, {x, z}, {...params, ...(per ? per(i) : {}), rotate: giro === 'azar' ? r() * 360 : giro})));
      if (placed.length < n) console.warn(`genframe: w.scatter solo cabe ${placed.length} de ${n} «${name}» en esa zona sin que se toquen.`);
      return list;
    };
    /** Punto 3D de un destino: pieza, {x, y, z} o [lon, lat]. */
    const pointOf = (target, out = new T.Vector3()) => {
      if (target && target.isObject3D) { const b = new T.Box3().setFromObject(target); return b.getCenter(out); }
      if (target && target.y !== undefined && target.x !== undefined) return out.set(target.x, target.y, target.z);
      const [x, z] = toXZ(target); return out.set(x, ground === 'none' ? (terrainHeight ? terrainHeight(x, z) : 0) + 12 : HL + 6, z);
    };
    /** Una persona señala un destino (pieza, punto o lugar) con el brazo extendido entre t y hasta. brazo: 'der'|'izq'. */
    W.point = (obj, t, target, {brazo = 'der', dur = 0.45, hasta = null} = {}) => {
      const sh = (obj.userData.joints || {})['hombro_' + brazo], el = (obj.userData.joints || {})['codo_' + brazo];
      if (!sh) return;
      const q0 = sh.quaternion.clone(), e0 = el ? el.rotation.x : 0, aim = new T.Vector3(), from = new T.Vector3(), down = new T.Vector3(0, -1, 0), pq = new T.Quaternion(), qt = new T.Quaternion();
      updaters.push((tt) => {
        if (tt < t) return;
        const k = K.smooth(K.ramp(tt, t, t + dur)) * (hasta ? 1 - K.smooth(K.ramp(tt, hasta, hasta + dur)) : 1);
        sh.quaternion.copy(q0);
        obj.updateMatrixWorld(true);
        sh.getWorldPosition(from); pointOf(target, aim);
        const d = aim.sub(from).normalize();
        sh.parent.getWorldQuaternion(pq);
        d.applyQuaternion(pq.invert());
        qt.setFromUnitVectors(down, d);
        sh.quaternion.copy(q0).slerp(qt, k);
        if (el) el.rotation.x = e0 * (1 - k);
      });
    };
    /** Una persona gira la cabeza hacia un destino entre t y t+dur (con límites naturales). */
    W.look = (obj, t, target, {dur = 0.5} = {}) => {
      const hd = (obj.userData.joints || {}).cabeza;
      if (!hd) return;
      const y0 = hd.rotation.y, x0 = hd.rotation.x, p = new T.Vector3(), aim = new T.Vector3(), q = new T.Quaternion();
      updaters.push((tt) => {
        if (tt < t) return;
        const k = K.smooth(K.ramp(tt, t, t + dur));
        hd.rotation.set(x0, y0, hd.rotation.z);
        obj.updateMatrixWorld(true);
        hd.getWorldPosition(p); pointOf(target, aim);
        const d = aim.sub(p).applyQuaternion(hd.parent.getWorldQuaternion(q).invert());
        hd.rotation.y = y0 + K.clamp(Math.atan2(d.x, d.z), -1.2, 1.2) * k;
        hd.rotation.x = x0 + K.clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.6, 0.6) * k;
      });
    };
    /* ---------------- decoración del entorno: que ningún plano quede con el suelo vacío ---------------- */
    /**
     * Viste el entorno alrededor de lo que ya hay en la escena (llámalo DESPUÉS de colocar las piezas principales: las rodea
     * sin pisarlas). tipo:
     *  - 'ciudad': calles en cuadrícula (calzada, aceras con bordillo, pasos de cebra o raíles de tranvía), plazas
     *    adoquinadas donde no cabe calle, farolas, árboles, bancos, bocas de incendio, papeleras y manzanas de edificios al fondo.
     *  - 'campo': hierba con matices, parcelas de cultivo, caminos de tierra, vallas, árboles, arbustos y piedras, y lomas al fondo.
     *  - 'interior': suelo de tarima, alfombra y dos paredes con zócalo, ventanas y cuadros (fondo hacia −z).
     * opts: centro ({x, z}; por defecto el centro de las piezas), radio (alcance), epoca ('clasica' años 1900-1950 | 'moderna'),
     * manzana y calle (medidas de la cuadrícula), densidad (0-1), fondo (edificios o lomas lejanas), seed, colores {…}.
     * El mobiliario cuenta como obstáculo (las personas lo rodean y el auditor lo vigila); calles y suelos, no.
     */
    W.decorar = (tipo = 'ciudad', {centro = null, radio = 1400, epoca = 'moderna', manzana = 520, calle = 110, acera = 34, densidad = 0.7, fondo = true, seed = 17, colores = {}, skyline = null, trafico = null, peatones = null} = {}) => {
      const r = K.rand(seed);
      // De noche los suelos de la decoración se oscurecen (con un punto azul): así resaltan los charcos de luz de las farolas.
      const NIGHT = !!S.night, NIGHT_TINT = new T.Color('#5d6a88');
      const nc = (c) => (NIGHT ? '#' + new T.Color(c).multiply(NIGHT_TINT).getHexString() : c);
      const fps = objects.filter((o) => o.parent === scene && !o.userData.ghost && !o.userData.decor).map(footprint).filter(Boolean);
      const c0 = centro ? toXZ(centro) : fps.length ? [fps.reduce((a, f) => a + f.x, 0) / fps.length, fps.reduce((a, f) => a + f.z, 0) / fps.length] : [0, 0];
      const [cx, cz] = c0;
      // Las calles solo las desvían las piezas grandes (edificios, vehículos); las personas pueden estar en la calle.
      const bigFp = () => fps.filter((f) => Math.max(f.hb, f.hl) > 25);
      const occupiedBig = (x, z, m = 4) => bigFp().some((f) => { const dx = x - f.x, dz = z - f.z, lx = dx * f.c - dz * f.s, lz = dx * f.s + dz * f.c; return Math.abs(lx) < f.hb + m && Math.abs(lz) < f.hl + m; });
      const occupied = (x, z, m = 4) => fps.some((f) => { const dx = x - f.x, dz = z - f.z, lx = dx * f.c - dz * f.s, lz = dx * f.s + dz * f.c; return Math.abs(lx) < f.hb + m && Math.abs(lz) < f.hl + m; });
      const flat = (w, d, mat, x, y, z, ry = 0) => { const m = new T.Mesh(new T.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.rotation.z = ry; m.position.set(x, y, z); m.receiveShadow = true; m.userData.decor = true; scene.add(m); return m; };
      const slab = (w, h, d, color, x, y, z, ry = 0) => { const m = box(w, h, d, nc(color), y + h / 2, {outline: 0.006}); m.position.x = x; m.position.z = z; m.rotation.y = ry; m.traverse((n) => { n.userData.decor = true; }); scene.add(m); return m; };
      // Halo y charco de luz de una farola encendida (de noche): se añaden aparte para no agrandar la huella del mobiliario.
      const lampGlow = (g) => { const [lx, ly, lz] = g.userData.lamp, c = Math.cos(g.rotation.y), sn = Math.sin(g.rotation.y), wx = g.position.x + lx * c + lz * sn, wz = g.position.z - lx * sn + lz * c;
        const halo = new T.Sprite(new T.SpriteMaterial({map: puff(), color: new T.Color('#ffd28a'), transparent: true, opacity: 0.85, depthWrite: false, blending: T.AdditiveBlending})); halo.scale.set(26, 26, 1); halo.position.set(wx, g.position.y + ly, wz); halo.userData.decor = true; scene.add(halo);
        const pool = new T.Mesh(new T.PlaneGeometry(140, 140), new T.MeshBasicMaterial({map: puff(), color: new T.Color('#ffb860'), transparent: true, opacity: 0.55, depthWrite: false, blending: T.AdditiveBlending})); pool.rotation.x = -Math.PI / 2; pool.position.set(wx, g.position.y + 1.2, wz); pool.userData.decor = true; scene.add(pool); };
      const prop = (g, x, z, ry = 0) => { // mobiliario: cuenta como obstáculo
        g.position.set(x, terrainHeight ? terrainHeight(x, z) : 0, z); g.rotation.y = ry; scene.add(g);
        g.updateMatrixWorld(true); const b = new T.Box3().setFromObject(g); b.min.sub(g.position); b.max.sub(g.position);
        g.userData.local = {min: b.min, max: b.max}; g.userData.baseScale = 1; g.userData.model = g.name || 'decorado'; g.userData.decor = true; g.userData.grounded = true; g.userData.joints = {}; g.userData.actions = {};
        objects.push(g); fps.push(footprint(g)); if (g.userData.lamp) lampGlow(g); return g;
      };
      const tex = (w, h, rep, draw) => { const t = canvasTexture(w, h, draw); t.repeat.set(rep[0], rep[1]); const m = new T.MeshLambertMaterial({map: t}); if (NIGHT) m.color.copy(NIGHT_TINT); return m; };
      const P = K.palette;
      // ---- piezas del mobiliario (procedurales, según la época)
      const farola = () => { const g = new T.Group(); g.name = 'farola';
        if (epoca === 'clasica') { g.add(cyl(1.6, 2.4, 3, '#2a2c2e', 10, 1.5)); g.add(cyl(0.7, 0.9, 34, '#2a2c2e', 10, 19)); const gl = sphere(2.6, '#fff1c8', 36, {outline: 0.02, extra: {emissive: '#ffd27a', emissiveIntensity: 0.9}}); g.add(gl); g.add(cone(2, 2.4, '#2a2c2e', 10, 39.5)); }
        else { g.add(cyl(0.9, 1.3, 60, '#5d6266', 10, 30)); const arm = box(14, 0.8, 0.8, '#5d6266', 59); arm.position.x = 6.5; g.add(arm); const hd = box(7, 1.4, 3, '#3c4044', 58.3); hd.position.x = 13; g.add(hd); const led = box(5, 0.3, 2.2, '#fff6dc', 57.5, {outline: 0, extra: {emissive: '#fff1c8', emissiveIntensity: 0.8}}); led.position.x = 13; g.add(led); }
        if (NIGHT) g.userData.lamp = epoca === 'clasica' ? [0, 36, 0] : [13, 57.5, 0];
        return g; };
      const arbol = () => { const g = new T.Group(); g.name = 'arbol'; const h = 34 + r() * 18; g.add(box(10, 0.6, 10, '#5a4a3a', 0.3, {outline: 0})); g.add(cyl(1.4, 2, h * 0.55, '#5a4232', 8, h * 0.275));
        const greens = ['#5f7f45', '#6e8c4e', '#557545']; for (let i = 0; i < 4; i++) { const b = sphere(8 + r() * 5, greens[i % 3], 0, {outline: 0.03}); b.position.set((r() - 0.5) * 9, h * 0.62 + r() * h * 0.35, (r() - 0.5) * 9); b.scale.y = 0.85; g.add(b); } return g; };
      const bancoCalle = () => { const g = new T.Group(); g.name = 'banco_calle'; const wood = '#8a5a34', iron = '#2a2c2e'; for (const sx of [-7, 7]) { g.add(f3(box(0.8, 4.5, 4.5, iron, 2.25), sx, 0, 0)); } g.add(box(17, 0.8, 4.4, wood, 4.6)); const back = box(17, 4, 0.7, wood, 7.4); back.position.z = -2; g.add(back); return g; };
      const hidrante = () => { const g = new T.Group(); g.name = 'boca_incendios'; const col = epoca === 'clasica' ? '#3a4a3a' : '#b8322a'; g.add(cyl(1.6, 1.8, 6, col, 10, 3)); g.add(sphere(1.7, col, 6.2, {outline: 0.04})); for (const s2 of [-1, 1]) { const n = cyl(0.7, 0.7, 2, col, 8, 0); n.rotation.z = Math.PI / 2; n.position.set(s2 * 1.9, 4.2, 0); g.add(n); } return g; };
      const papelera = () => { const g = new T.Group(); g.name = 'papelera'; g.add(cyl(2, 1.8, 7, epoca === 'clasica' ? '#3a3a36' : '#3f5a4a', 12, 3.5)); g.add(cyl(2.2, 2.2, 0.6, '#2a2a28', 12, 7.2)); return g; };
      const f3 = (o, x, y, z) => { o.position.x = x; o.position.z = z; if (y) o.position.y += y; return o; };
      // ---- edificios de fondo: fachadas con ventanas en rejilla por plantas, planta baja con comercios, cornisa y azotea.
      // Cinco tipos (cristal, oficinas, viviendas para 'moderna'; ladrillo y piedra para 'clasica'), con texturas por tramo
      // de fachada (una ventana por planta), así las ventanas quedan alineadas y a escala en cualquier tamaño de edificio.
      const facadeCache = {};
      const facade = (tipo, tono) => {
        const key = tipo + tono;
        if (facadeCache[key]) return facadeCache[key];
        const T2 = {
          cristal: ['#3d5468', '#46606f', '#354a5c'], oficinas: ['#c9c3b6', '#b8b3a8', '#d6d0c2'], vivienda: ['#d8c7a8', '#c7b59a', '#e0d4bf'],
          ladrillo: ['#8a4a36', '#7a4434', '#94573e'], piedra: ['#c2b49a', '#b3a58a', '#cbbfa6'],
        }[tipo][tono];
        const draw = (c, w, h) => {
          c.fillStyle = T2; c.fillRect(0, 0, w, h);
          if (tipo === 'cristal') { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#7f9db4'); g.addColorStop(1, T2); c.fillStyle = g; c.fillRect(2, 2, w - 4, h - 4); c.fillStyle = '#26323c'; c.fillRect(0, 0, w, 3); c.fillRect(0, 0, 3, h); }
          else if (tipo === 'oficinas') { c.fillStyle = '#34444f'; c.fillRect(0, h * 0.3, w, h * 0.46); c.fillStyle = 'rgba(160,190,210,.35)'; c.fillRect(0, h * 0.3, w, h * 0.12); c.fillStyle = '#8a857a'; c.fillRect(w - 3, h * 0.3, 3, h * 0.46); }
          else if (tipo === 'vivienda') { c.fillStyle = '#3a4650'; c.fillRect(w * 0.25, h * 0.22, w * 0.5, h * 0.52); c.fillStyle = 'rgba(170,200,220,.3)'; c.fillRect(w * 0.25, h * 0.22, w * 0.5, h * 0.14); c.fillStyle = '#f0e8d8'; c.fillRect(w * 0.2, h * 0.74, w * 0.6, h * 0.06); }
          else { // ladrillo y piedra: ventana alta con dintel y alféizar
            if (tipo === 'ladrillo') { c.fillStyle = 'rgba(0,0,0,.12)'; for (let y = 0; y < h; y += 6) c.fillRect(0, y, w, 1); }
            c.fillStyle = '#e4dccb'; c.fillRect(w * 0.26, h * 0.12, w * 0.48, h * 0.07); c.fillRect(w * 0.24, h * 0.8, w * 0.52, h * 0.05);
            c.fillStyle = '#2e3a42'; c.fillRect(w * 0.3, h * 0.19, w * 0.4, h * 0.61); c.fillStyle = '#d9d2c2'; c.fillRect(w * 0.49, h * 0.19, w * 0.02, h * 0.61); c.fillRect(w * 0.3, h * 0.46, w * 0.4, h * 0.02);
          }
        };
        const map = canvasTexture(64, 64, draw);
        // Ventanas encendidas de noche: un tramo de 8 × 8 ventanas con unas cuantas luces al azar (se repite poco).
        const lit = canvasTexture(256, 256, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { if (r() > (tipo === 'cristal' ? 0.45 : 0.32)) continue; c.fillStyle = r() < 0.7 ? '#ffd58a' : '#fff2d0'; const bx = x * 32, by = y * 32; if (tipo === 'oficinas' || tipo === 'cristal') c.fillRect(bx + 2, by + (tipo === 'cristal' ? 3 : 10), 28, tipo === 'cristal' ? 26 : 14); else c.fillRect(bx + 9, by + 7, 14, 17); } });
        return (facadeCache[key] = {map, lit});
      };
      const shopTex = canvasTexture(64, 64, (c, w, h) => { c.fillStyle = epoca === 'clasica' ? '#5a4636' : '#2c3238'; c.fillRect(0, 0, w, h); c.fillStyle = '#41525e'; c.fillRect(4, h * 0.3, w - 8, h * 0.62); c.fillStyle = 'rgba(190,215,230,.35)'; c.fillRect(4, h * 0.3, w - 8, h * 0.14); const aw = ['#a8392e', '#2f5d4a', '#c9a03a', '#2f4f7a'][Math.floor(r() * 4)]; c.fillStyle = aw; c.fillRect(0, h * 0.12, w, h * 0.14); c.fillStyle = 'rgba(255,255,255,.35)'; for (let x = 0; x < w; x += 8) c.fillRect(x, h * 0.12, 4, h * 0.14); });
      const roofMat = new T.MeshLambertMaterial({color: '#6e6a64'});
      const facadeMat = (f, rx, ry, glass) => { const m = f.map.clone(); m.needsUpdate = true; m.repeat.set(rx, ry); const opts = {map: m}; if (NIGHT) { const e = f.lit.clone(); e.needsUpdate = true; e.repeat.set(rx / 8, ry / 8); Object.assign(opts, {emissive: new T.Color('#ffcf8a'), emissiveMap: e, emissiveIntensity: 2.4}); } return new T.MeshLambertMaterial(opts); };
      // ---- vehículos y semáforos procedurales (sin marcas), según la época. Frente hacia +z.
      const COCHES = epoca === 'clasica' ? ['#1e1f22', '#2b2f36', '#3a2a24', '#23302a', '#4a4036'] : ['#b8322a', '#2f5d8a', '#d6d2c6', '#3a3e42', '#8a8f96', '#5a7a5a', '#e9e6de', '#c9a03a'];
      const rueda = (g, x, z, rr = 3.2) => { const w = cyl(rr, rr, 2.4, '#1a1a1a', 12, 0, {outline: 0.02}); w.rotation.z = Math.PI / 2; w.position.set(x, rr, z); g.add(w); if (epoca === 'clasica') { const s2 = cyl(rr * 0.62, rr * 0.62, 2.6, '#e9e4d6', 12, 0, {outline: 0}); s2.rotation.z = Math.PI / 2; s2.position.set(x, rr, z); g.add(s2); } };
      const coche = (tipo = 'turismo') => {
        const g = new T.Group(); g.name = tipo === 'autobus' ? 'autobus' : 'coche';
        const col = tipo === 'taxi' ? '#e8b923' : tipo === 'autobus' ? (epoca === 'clasica' ? '#3f5a4a' : '#2f6a9a') : COCHES[Math.floor(r() * COCHES.length)];
        const glass = '#2a3842', lightE = {outline: 0, extra: {emissive: '#fff2c8', emissiveIntensity: NIGHT ? 1.6 : 0.4}}, tailE = {outline: 0, extra: {emissive: '#ff3a2a', emissiveIntensity: NIGHT ? 1.4 : 0.3}};
        if (tipo === 'autobus') {
          g.add(box(22, 26, 110, col, 16)); g.add(f3(box(22.4, 7, 100, glass, 22), 0, 0, 2));
          for (const z of [-38, 36]) { rueda(g, -10, z, 4.6); rueda(g, 10, z, 4.6); }
          for (const sx of [-8, 8]) { g.add(f3(box(3, 2, 0.6, '#fff6dc', 7, lightE), sx, 0, 55.2)); g.add(f3(box(3, 2, 0.6, '#c62a20', 7, tailE), sx, 0, -55.2)); }
          return g;
        }
        if (epoca === 'clasica') {
          g.add(box(15, 6, 40, col, 6.5)); g.add(f3(box(14, 8, 18, col, 13.5), 0, 0, -5)); g.add(f3(box(14.3, 4, 16, glass, 14), 0, 0, -5));
          g.add(f3(box(10, 5, 12, col, 9.5), 0, 0, 13)); g.add(f3(box(9, 7, 1, '#c9ccd0', 8.5), 0, 0, 19.6));
          for (const sx of [-1, 1]) g.add(f3(box(2.2, 1, 36, '#1a1a1a', 3.2), sx * 8.6, 0, 0));
          for (const z of [-13, 13]) { rueda(g, -8, z, 3.6); rueda(g, 8, z, 3.6); }
          for (const sx of [-5, 5]) g.add(f3(sphere(1.6, '#fff1c8', 0, lightE), sx, 9.5, 19.4));
          return g;
        }
        const van = tipo === 'furgoneta';
        g.add(box(18, 7, van ? 48 : 44, col, 6.5));
        if (van) { g.add(f3(box(17.6, 12, 34, col, 15.5), 0, 0, -6)); g.add(f3(box(17.8, 6, 8, glass, 15), 0, 0, 13)); }
        else { g.add(f3(box(16, 6.5, 22, col, 13), 0, 0, -3)); g.add(f3(box(16.3, 4.6, 20.5, glass, 13.2), 0, 0, -3)); }
        if (tipo === 'taxi') g.add(f3(box(6, 2.4, 3, '#f4f0e0', 17.5, {outline: 0, extra: {emissive: '#fff2c0', emissiveIntensity: NIGHT ? 1.2 : 0.2}}), 0, 0, -3));
        for (const z of [-14, 14]) { rueda(g, -9, z); rueda(g, 9, z); }
        for (const sx of [-6, 6]) { g.add(f3(box(3.4, 1.6, 0.6, '#fff6dc', 7.5, lightE), sx, 0, (van ? 24 : 22) + 0.2)); g.add(f3(box(3.4, 1.6, 0.6, '#c62a20', 7.5, tailE), sx, 0, -(van ? 24 : 22) - 0.2)); }
        return g;
      };
      const semaforo = () => { const g = new T.Group(); g.name = 'semaforo'; g.add(cyl(0.9, 1.1, 46, '#3a3e42', 8, 23)); const hd = box(5, 14, 4, '#26292c', 50); g.add(hd);
        const lit = Math.floor(r() * 3); ['#d6453d', '#f2a93b', '#5fbf6a'].forEach((c, i) => { const l = sphere(1.5, i === lit ? c : '#3a3a3a', 0, {outline: 0, extra: i === lit ? {emissive: c, emissiveIntensity: NIGHT ? 2 : 0.9} : {}}); l.position.set(0, 54.5 - i * 4.5, 2.1); g.add(l); }); return g; };
      // Peatón: persona del generador del taller con ropa variada; anda con su zancada (los pies no patinan).
      const peaton = () => { const G = K.forge.gen; if (!G || !G.human) return null; const fem = r() < 0.5; const p = G.human({height: 16.5 + r() * 2.2, build: 0.9 + r() * 0.3, female: fem, skin: ['#e8c4a0', '#d9a684', '#b97f58', '#8a5a3c', '#f0d2b4'][Math.floor(r() * 5)], top: ['#c9412e', '#2f5d8a', '#e9e6de', '#3a3e42', '#6a8a5a', '#d6a03a', '#7a4a6a'][Math.floor(r() * 7)], jacket: r() < 0.4 ? ['#3a3e42', '#5a4a3a', '#2a3a52'][Math.floor(r() * 3)] : null, bottom: ['#2a3040', '#3d4250', '#5a5248', '#1e1f22'][Math.floor(r() * 4)], skirt: fem && r() < 0.3, hair: {style: fem ? (r() < 0.5 ? 'largo' : 'recogido') : (r() < 0.8 ? 'corto' : 'calvo'), color: ['#2a1e16', '#4a3222', '#8a6a3a', '#1a1a1a', '#a8a39a'][Math.floor(r() * 5)]}, headwear: epoca === 'clasica' && !fem ? 'sombrero' : undefined}); p.name = 'peaton'; return p; };
      const edificio = (w, h, d, tipo, tono) => {
        const g = new T.Group(); g.name = 'edificio_fondo';
        const floorH = epoca === 'clasica' ? 40 : 34, bay = tipo === 'cristal' ? 30 : epoca === 'clasica' ? 42 : 36, f = facade(tipo, tono);
        const gfH = floorH * 1.25, bodyH = Math.max(floorH, h - gfH);
        const body = (bw, bh, bd, y0) => { const front = facadeMat(f, Math.max(1, Math.round(bw / bay)), Math.max(1, Math.round(bh / floorH))), side = facadeMat(f, Math.max(1, Math.round(bd / bay)), Math.max(1, Math.round(bh / floorH))); const m = new T.Mesh(new T.BoxGeometry(bw, bh, bd), [side, side, roofMat, roofMat, front, front]); m.position.y = y0 + bh / 2; m.receiveShadow = true; g.add(m); return m; };
        // Planta baja con escaparates y toldos.
        const st = shopTex.clone(); st.needsUpdate = true; st.repeat.set(Math.max(1, Math.round(w / 40)), 1); const st2 = shopTex.clone(); st2.needsUpdate = true; st2.repeat.set(Math.max(1, Math.round(d / 40)), 1);
        const gm = new T.Mesh(new T.BoxGeometry(w + 1, gfH, d + 1), [new T.MeshLambertMaterial({map: st2}), new T.MeshLambertMaterial({map: st2}), roofMat, roofMat, new T.MeshLambertMaterial({map: st}), new T.MeshLambertMaterial({map: st})]); gm.position.y = gfH / 2; g.add(gm);
        // Cuerpo, con retranqueos en las torres altas.
        let top = gfH, corY = 0;
        if (h > 520 && epoca !== 'clasica' && r() < 0.7) { const h1 = bodyH * 0.62; body(w, h1, d, top); top += h1; corY = top; const w2 = w * 0.72, d2 = d * 0.72, h2 = bodyH - h1; body(w2, h2, d2, top); top += h2; if (r() < 0.5) { const sp = new T.Mesh(new T.CylinderGeometry(0.8, 2.5, h * 0.12, 6), roofMat); sp.position.y = top + h * 0.06; g.add(sp); } }
        else if (h > 380 && epoca === 'clasica' && r() < 0.6) { const h1 = bodyH * 0.75; body(w, h1, d, top); top += h1; corY = top; const h2 = bodyH - h1; body(w * 0.66, h2, d * 0.66, top); top += h2; }
        else { body(w, bodyH, d, top); top += bodyH; corY = top; }
        // Cornisa o pretil.
        const cor = new T.Mesh(new T.BoxGeometry(w + (epoca === 'clasica' ? 6 : 2), epoca === 'clasica' ? 5 : 3, d + (epoca === 'clasica' ? 6 : 2)), new T.MeshLambertMaterial({color: epoca === 'clasica' ? '#d9d0bd' : '#8d8a84'})); cor.position.y = corY + 1; g.add(cor);
        // Azotea: depósito de agua, máquinas, casetón o antena.
        const roofY = top, rk = r();
        if (rk < 0.35) { const tk = new T.Group(); for (const [lx, lz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) { const leg = new T.Mesh(new T.BoxGeometry(1, 10, 1), roofMat); leg.position.set(lx, 5, lz); tk.add(leg); } const tank = new T.Mesh(new T.CylinderGeometry(7, 7, 12, 12), new T.MeshLambertMaterial({color: '#7a5a3e'})); tank.position.y = 16; tk.add(tank); const cap = new T.Mesh(new T.ConeGeometry(7.5, 4, 12), new T.MeshLambertMaterial({color: '#5a4636'})); cap.position.y = 24; tk.add(cap); tk.position.set((r() - 0.5) * w * 0.4, roofY, (r() - 0.5) * d * 0.4); g.add(tk); }
        else if (rk < 0.7) { for (let i = 0; i < 2 + Math.floor(r() * 3); i++) { const ac = new T.Mesh(new T.BoxGeometry(10 + r() * 8, 6, 8), new T.MeshLambertMaterial({color: '#9a9a96'})); ac.position.set((r() - 0.5) * w * 0.6, roofY + 3, (r() - 0.5) * d * 0.6); g.add(ac); } }
        else if (rk < 0.85) { const hs = new T.Mesh(new T.BoxGeometry(w * 0.25, 14, d * 0.25), new T.MeshLambertMaterial({color: '#8a857c'})); hs.position.set(w * 0.2, roofY + 7, -d * 0.2); g.add(hs); }
        else { const an = new T.Mesh(new T.CylinderGeometry(0.6, 0.6, 40, 5), roofMat); an.position.set(0, roofY + 20, 0); g.add(an); }
        g.traverse((q) => { q.userData.decor = true; q.castShadow = false; });
        return g;
      };
      if (tipo === 'ciudad') {
        const asf = colores.asfalto || (epoca === 'clasica' ? '#4a4844' : '#3c3e42'), ace = colores.acera || '#a9a397', bord = colores.bordillo || '#c9c3b6';
        // Suelo de plaza adoquinada bajo todo (lo que no es calle).
        const paving = tex(256, 256, [radio / 22, radio / 22], (c, w, h) => { c.fillStyle = epoca === 'clasica' ? '#8d8679' : '#a39d92'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) for (let x = (y / 32) % 2 ? 16 : 0; x < w; x += 32) { const v = (r() - 0.5) * 18; c.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 250 : 0},${v > 0 ? 240 : 0},${Math.abs(v) / 120})`; c.fillRect(x + 1, y + 1, 30, 30); } c.strokeStyle = 'rgba(40,36,30,.35)'; c.lineWidth = 2; for (let y = 0; y <= h; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } for (let y = 0; y < h; y += 32) for (let x = (y / 32) % 2 ? 16 : 0; x <= w; x += 32) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 32); c.stroke(); } });
        flat(radio * 2.4, radio * 2.4, paving, cx, 0.06, cz);
        const asphalt = tex(256, 256, [1, 1], (c, w, h) => { c.fillStyle = asf; c.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.08)'; c.fillRect(r() * w, r() * h, 2, 2); } });
        // Cuadrícula: se elige el desplazamiento que menos calles hace pasar por debajo de las piezas.
        const M = manzana, band = calle / 2 + acera;
        let best = [0, 0], bestHits = Infinity;
        for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const ox = (i / 8) * M, oz = (j / 8) * M; let hits = 0; for (const f of bigFp()) { const dx = ((f.x - cx - ox) % M + M) % M, dz = ((f.z - cz - oz) % M + M) % M; const rr = Math.max(f.hb, f.hl); if (Math.min(dx, M - dx) < band + rr) hits++; if (Math.min(dz, M - dz) < band + rr) hits++; } if (hits < bestHits) { bestHits = hits; best = [ox, oz]; } }
        const n = Math.ceil(radio / M) + 1;
        const segFree = (x0, z0, x1, z1) => { const steps = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 12); for (let k = 0; k <= steps; k++) { const u = k / steps, x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * u; if (occupiedBig(x, z, band)) return false; } return true; };
        const furniture = [], roads = [], crosses = [], mainFps = fps.slice();
        for (let a = -n; a <= n; a++) for (let b = -n; b < n; b++) for (const dir of [0, 1]) {
          // Tramo de calle entre dos cruces: dir 0 = a lo largo de x (en z fija), dir 1 = a lo largo de z.
          const line = (dir ? cx + best[0] : cz + best[1]) + a * M, s0 = (dir ? cz + best[1] : cx + best[0]) + b * M, s1 = s0 + M;
          const [x0, z0, x1, z1] = dir ? [line, s0, line, s1] : [s0, line, s1, line];
          if (Math.hypot((x0 + x1) / 2 - cx, (z0 + z1) / 2 - cz) > radio) continue;
          if (!segFree(x0, z0, x1, z1)) continue;
          const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, len = M - band * 2 + 2, ry = dir ? 0 : Math.PI / 2;
          const road = new T.Mesh(new T.PlaneGeometry(calle, len), asphalt); road.rotation.x = -Math.PI / 2; road.rotation.z = ry; road.position.set(mx, 0.12, mz); road.receiveShadow = true; road.userData.decor = true; scene.add(road);
          roads.push({dir, a, b, line, s0, s1, mx, mz, len});
          for (const sd of [-1, 1]) {
            const ox = dir ? sd * (calle / 2 + acera / 2) : 0, oz = dir ? 0 : sd * (calle / 2 + acera / 2);
            slab(dir ? acera : len, 0.9, dir ? len : acera, ace, mx + ox, 0, mz + oz);
            const cb = dir ? sd * (calle / 2 + 0.9) : 0, cz2 = dir ? 0 : sd * (calle / 2 + 0.9);
            slab(dir ? 1.8 : len, 1.2, dir ? len : 1.8, bord, mx + cb, 0, mz + cz2);
          }
          // Marcas: raya discontinua (moderna) o raíles de tranvía (clásica).
          if (epoca === 'clasica') { for (const off of [-9, -2.5, 2.5, 9]) slab(dir ? 0.7 : len, 0.25, dir ? len : 0.7, '#7d7a74', mx + (dir ? off : 0), 0.1, mz + (dir ? 0 : off)); }
          else for (let k = -len / 2 + 10; k < len / 2 - 10; k += 30) slab(dir ? 1.4 : 14, 0.2, dir ? 14 : 1.4, '#e9e4d2', mx + (dir ? 0 : k), 0.12, mz + (dir ? k : 0));
          // Mobiliario a lo largo de las aceras.
          for (let k = -len / 2 + 40; k < len / 2 - 30; k += 70 + r() * 40) for (const sd of [-1, 1]) {
            if (r() > densidad) continue;
            const off = calle / 2 + acera * 0.62, x = mx + (dir ? sd * off : k), z = mz + (dir ? k : sd * off);
            if (occupied(x, z, 6) || furniture.some(([fx, fz]) => Math.hypot(fx - x, fz - z) < 22)) continue;
            const kind = r(); const g = kind < 0.4 ? farola() : kind < 0.72 ? arbol() : kind < 0.84 ? bancoCalle() : kind < 0.93 ? hidrante() : papelera();
            prop(g, x, z, dir ? (sd > 0 ? -Math.PI / 2 : Math.PI / 2) : (sd > 0 ? Math.PI : 0)); furniture.push([x, z]);
          }
          // Paso de cebra en los dos extremos (moderna).
          if (epoca !== 'clasica') for (const e of [-1, 1]) for (let k = -calle / 2 + 8; k < calle / 2 - 6; k += 14) slab(dir ? 8 : 18, 0.22, dir ? 18 : 8, '#efeadb', mx + (dir ? k : e * (len / 2 - 14)), 0.12, mz + (dir ? e * (len / 2 - 14) : k));
        }
        // Plazas: mobiliario también en los huecos libres que no son calle (farolas, árboles y bancos alrededor de lo que hay).
        for (let i = 0; i < 160 * densidad; i++) {
          const a = r() * Math.PI * 2, d = 60 + Math.sqrt(r()) * radio * 0.75, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
          if (occupied(x, z, 12) || furniture.some(([fx, fz]) => Math.hypot(fx - x, fz - z) < 60)) continue;
          const kind = r(); const g = kind < 0.45 ? farola() : kind < 0.8 ? arbol() : bancoCalle();
          prop(g, x, z, Math.round(r() * 4) * (Math.PI / 2)); furniture.push([x, z]);
        }
        // Cruces (asfalto).
        for (let a = -n; a <= n; a++) for (let b = -n; b <= n; b++) { const x = cx + best[0] + a * M, z = cz + best[1] + b * M; if (Math.hypot(x - cx, z - cz) > radio || occupiedBig(x, z, band)) continue; flat(calle, calle, asphalt, x, 0.11, z); crosses.push([x, z]); }
        // ---- vida urbana: tráfico, coches aparcados, semáforos y peatones (trafico y peatones: 0-1; por defecto, densidad).
        const trf = trafico ?? densidad, pea = peatones ?? densidad;
        const ghostProp = (g, audit = false) => { scene.add(g); g.updateMatrixWorld(true); const b = new T.Box3().setFromObject(g); b.min.sub(g.position); b.max.sub(g.position); Object.assign(g.userData, {local: {min: b.min, max: b.max}, baseScale: 1, model: g.name, decor: true, ghost: !audit, trafico: audit, joints: g.userData.joints || {}, actions: g.userData.actions || {}}); objects.push(g); return g; };
        const along = (dir, line, s, off) => (dir ? [line + off, s] : [s, line + off]);
        // Tráfico solo en las calles de una orientación (las que van a lo largo de x): así nunca se cruzan dos coches en un cruce.
        // Cada carril recorre un tramo continuo de calle que entra y sale por el borde de la ciudad, sin piezas encima.
        if (trf > 0) {
          const byLine = {};
          for (const q of roads) if (q.dir === 0) (byLine[q.a] = byLine[q.a] || []).push(q);
          for (const k in byLine) {
            const qs = byLine[k].sort((p, q) => p.b - q.b);
            const runs = []; let cur = [qs[0]];
            for (let i = 1; i < qs.length; i++) { if (qs[i].b === cur[cur.length - 1].b + 1) cur.push(qs[i]); else { runs.push(cur); cur = [qs[i]]; } }
            runs.push(cur);
            for (const run of runs) {
              const line = run[0].line, s0 = run[0].s0, s1 = run[run.length - 1].s1, L = s1 - s0;
              const far = (s) => Math.hypot(...along(0, line, s, 0).map((v, i) => v - [cx, cz][i])) > radio * 0.7;
              if (L < M * 2 || !far(s0) || !far(s1)) continue;
              for (const sign of [-1, 1]) {
                const off = sign * calle * 0.21;  // carril: deja hueco a los coches aparcados junto al bordillo
                let clear = true; for (let s = s0; s <= s1 && clear; s += 10) { const [x, z] = along(0, line, s, off); if (occupied(x, z, 16)) clear = false; }
                if (!clear) continue;
                const n = Math.max(0, Math.round((L / 320) * trf)), speed = 85 + r() * 40;
                for (let i = 0; i < n; i++) {
                  const kind = r(), tipo = epoca !== 'clasica' && kind < 0.07 ? 'autobus' : epoca !== 'clasica' && kind < 0.2 ? 'taxi' : epoca !== 'clasica' && kind < 0.33 ? 'furgoneta' : 'turismo';
                  const car = ghostProp(coche(tipo), true), ph = (i + r() * 0.4) * (L / n), v = tipo === 'autobus' ? speed * 0.8 : speed;
                  updaters.push((t) => { const u = ((ph + sign * v * (t - T0)) % L + L) % L, [x, z] = along(0, line, s0 + u, off); car.position.set(x, 0, z); car.rotation.y = sign > 0 ? Math.PI / 2 : -Math.PI / 2; car.scale.setScalar(u < 40 || u > L - 40 ? 0.001 : 1); });
                }
              }
            }
          }
        }
        // Coches aparcados junto al bordillo, fuera de los pasos de cebra.
        if (trf > 0) for (const q of roads) for (const sd of [-1, 1]) {
          for (let k = -q.len / 2 + 46; k < q.len / 2 - 46; k += 54 + r() * 30) {
            if (r() > trf * 0.55) continue;
            const sAt = (q.dir ? q.mz : q.mx) + k, [x, z] = along(q.dir, q.line, sAt, sd * (calle / 2 - 10));
            // Comprueba el coche entero (centro y extremos), no solo su centro.
            if (occupied(x, z, 12) || [-22, 22].some((e) => occupied(...along(q.dir, q.line, sAt + e, sd * (calle / 2 - 10)), 7))) continue;
            const kind = r(); prop(coche(epoca !== 'clasica' && kind < 0.12 ? 'taxi' : epoca !== 'clasica' && kind < 0.25 ? 'furgoneta' : 'turismo'), x, z, q.dir ? (r() < 0.5 ? 0 : Math.PI) : (r() < 0.5 ? Math.PI / 2 : -Math.PI / 2));
          }
        }
        // Semáforos en dos esquinas de cada cruce (ciudad moderna).
        if (epoca !== 'clasica') for (const [x, z] of crosses) for (const [sx, sz] of [[1, 1], [-1, -1]]) { const px = x + sx * (calle / 2 + 9), pz = z + sz * (calle / 2 + 9); if (!occupied(px, pz, 8) && r() < 0.8) prop(semaforo(), px, pz, sx > 0 ? Math.PI : 0); }
        // Peatones: van y vuelven por su tramo de acera (no cruzan la calzada), con su zancada.
        if (pea > 0) for (const q of roads) for (const sd of [-1, 1]) {
          if (r() > pea * 0.7) continue;
          const off = sd * (calle / 2 + acera * 0.27), L = q.len - 30, c0 = q.dir ? q.mz : q.mx;
          let clear = true;
          for (let s = -L / 2; s <= L / 2 && clear; s += 8) { const [x, z] = along(q.dir, q.line, c0 + s, off); if (mainFps.some((f) => { const dx = x - f.x, dz = z - f.z, lx = dx * f.c - dz * f.s, lz = dx * f.s + dz * f.c; return Math.abs(lx) < f.hb + 8 && Math.abs(lz) < f.hl + 8; }) || furniture.some(([fx, fz]) => Math.hypot(fx - x, fz - z) < 7)) clear = false; }
          if (!clear) continue;
          for (let i = 0, n = 1 + (r() < pea * 0.5 ? 1 : 0); i < n; i++) {
            const p = peaton(); if (!p) break;
            ghostProp(p);
            const H = p.userData.local.max.y - p.userData.local.min.y, v = (H * 0.8 * 6.2) / (2 * Math.PI) * (0.85 + r() * 0.25), ph = r() * 2 * L, act = (p.userData.actions || {}).andar;
            updaters.push((t) => { const u = ((ph + v * (t - T0)) % (2 * L) + 2 * L) % (2 * L), fwd = u < L, s = fwd ? u : 2 * L - u, [x, z] = along(q.dir, q.line, c0 - L / 2 + s, off); p.position.set(x, 0, z); p.rotation.y = q.dir ? (fwd ? 0 : Math.PI) : (fwd ? Math.PI / 2 : -Math.PI / 2); if (act) act((t - T0) * (v / ((H * 0.8 * 6.2) / (2 * Math.PI))) + i, 1); });
          }
        }
        // Manzanas de edificios al fondo, solo donde no hay nada: alturas según el perfil de la ciudad (skyline) y alineados
        // con la cuadrícula de calles.
        if (fondo) {
          const perfil = skyline || (epoca === 'clasica' ? 'media' : 'media');
          const H = {baja: [50, 200, 0], media: [100, 420, 0.12], alta: [200, 1100, 0.35]}[perfil] || [100, 420, 0.12];
          const tipos = epoca === 'clasica' ? ['ladrillo', 'piedra', 'ladrillo'] : ['oficinas', 'vivienda', 'cristal', 'vivienda'];
          for (let i = 0; i < 80; i++) {
            const a = r() * Math.PI * 2, d = radio * (0.95 + r() * 0.9), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
            if (occupied(x, z, 140)) continue;
            const w = 120 + r() * 140, dd = 110 + r() * 120;
            let h = H[0] + Math.pow(r(), 1.6) * (H[1] - H[0]); if (r() < H[2]) h *= 1.6 + r();
            if (epoca === 'clasica') h = Math.min(h, perfil === 'alta' ? 1300 : 520);
            const tp = tipos[Math.floor(r() * tipos.length)];
            const b = edificio(w, h, dd, tp === 'cristal' && h < 300 ? 'oficinas' : tp, Math.floor(r() * 3));
            b.position.set(x, 0, z); b.rotation.y = Math.round(r() * 4) * (Math.PI / 2); scene.add(b);
            fps.push({x, z, hb: w / 2 + 10, hl: dd / 2 + 10, c: Math.cos(b.rotation.y), s: Math.sin(b.rotation.y), ymin: 0, ymax: h});
          }
        }
      } else if (tipo === 'campo') {
        const grassMat = tex(256, 256, [radio / 25, radio / 25], (c, w, h) => { c.fillStyle = colores.hierba || '#7c9450'; c.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { c.fillStyle = ['rgba(60,80,30,.25)', 'rgba(160,180,90,.22)', 'rgba(110,130,60,.25)'][i % 3]; c.fillRect(r() * w, r() * h, 2 + r() * 3, 3 + r() * 5); } });
        flat(radio * 2.6, radio * 2.6, grassMat, cx, 0.06, cz);
        // Parcelas de cultivo con surcos, donde no hay nada.
        const crops = ['#b9a35a', '#8aa04e', '#a38a5a', '#c2b26a'];
        for (let i = 0; i < 22; i++) { const a = r() * Math.PI * 2, d = radio * (0.12 + Math.pow(r(), 1.4) * 0.8), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, w = 160 + r() * 220, dd = 120 + r() * 200; if (occupied(x, z, Math.max(w, dd) * 0.6)) continue; const col = crops[i % 4]; const fm = tex(64, 64, [w / 40, 1], (c, W2, H2) => { c.fillStyle = col; c.fillRect(0, 0, W2, H2); c.fillStyle = 'rgba(0,0,0,.18)'; for (let x2 = 0; x2 < W2; x2 += 8) c.fillRect(x2, 0, 3, H2); }); flat(w, dd, fm, x, 0.09, z, r() * Math.PI); }
        // Camino de tierra que cruza.
        const dirt = new T.MeshLambertMaterial({color: nc(colores.tierra || '#a88e66')});
        for (let k = -radio; k < radio; k += 30) { const x = cx + k, z = cz + Math.sin(k / 260) * 90 + radio * 0.12; if (!occupied(x, z, 20)) flat(34, 32, dirt, x, 0.1, z); }
        // Vallas, árboles, arbustos y piedras.
        for (let i = 0; i < 170 * densidad; i++) {
          const a = r() * Math.PI * 2, d = radio * (0.06 + Math.pow(r(), 1.6) * 0.95), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
          if (occupied(x, z, 14)) continue;
          const k = r(); let g;
          if (k < 0.4) g = arbol(); else if (k < 0.7) { g = new T.Group(); g.name = 'arbusto'; for (let j = 0; j < 3; j++) { const b = sphere(4 + r() * 3, ['#5f7f45', '#6e8c4e'][j % 2], 0, {outline: 0.03}); b.position.set((r() - 0.5) * 6, 2.5, (r() - 0.5) * 6); g.add(b); } }
          else if (k < 0.85) { g = new T.Group(); g.name = 'valla'; for (let j = 0; j < 5; j++) g.add(f3(box(1.2, 10, 1.2, '#7a5a3a', 5), j * 12 - 24, 0, 0)); g.add(box(52, 1, 0.8, '#8a6a46', 8)); g.add(box(52, 1, 0.8, '#8a6a46', 4)); }
          else { g = new T.Group(); g.name = 'piedra'; const st = mesh(new T.DodecahedronGeometry(3 + r() * 4, 0), '#8a8578'); st.position.y = 2; st.scale.y = 0.6; g.add(st); }
          prop(g, x, z, r() * Math.PI * 2);
        }
        if (fondo) for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2, d = radio * (1.3 + r() * 0.5); const hill = sphere(1, '#6f8a4c', 0, {outline: 0}); hill.scale.set(300 + r() * 400, 80 + r() * 160, 300 + r() * 300); hill.position.set(cx + Math.cos(a) * d, -20, cz + Math.sin(a) * d); hill.traverse((q) => { q.userData.decor = true; }); scene.add(hill); }
      } else if (tipo === 'interior') {
        const plank = tex(256, 256, [radio / 80, radio / 80], (c, w, h) => { for (let i = 0; i < 16; i++) { c.fillStyle = ['#7a5434', '#6c4a2e', '#845c3a'][i % 3]; c.fillRect(0, i * 16, w, 16); c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(0, i * 16, w, 1.5); c.fillRect(((i * 97) % w), i * 16, 2, 16); } });
        flat(radio * 2, radio * 2, plank, cx, 0.06, cz);
        const rug = tex(128, 128, [1, 1], (c, w, h) => { c.fillStyle = colores.alfombra || '#7a2e2a'; c.fillRect(0, 0, w, h); c.strokeStyle = P.accent || '#d9a84e'; c.lineWidth = 6; c.strokeRect(10, 10, w - 20, h - 20); c.lineWidth = 2; c.strokeRect(22, 22, w - 44, h - 44); });
        flat(radio * 0.7, radio * 0.45, rug, cx, 0.1, cz);
        const wallH = Math.max(60, radio * 0.45), wz = cz - radio * 0.55, wx = cx - radio * 0.75;
        const wallC = colores.pared || '#9a9078';
        for (const [w, x, z, ry] of [[radio * 1.6, cx, wz, 0], [radio * 1.1, wx, cz, Math.PI / 2]]) {
          const wall = box(w, wallH, 2, wallC, wallH / 2, {outline: 0}); wall.position.x = x; wall.position.z = z; wall.rotation.y = ry; wall.traverse((q) => { q.userData.decor = true; }); scene.add(wall);
          const dado = box(w, wallH * 0.28, 3, '#5a3e28', wallH * 0.14, {outline: 0}); dado.position.set(x + (ry ? 1 : 0), wallH * 0.14, z + (ry ? 0 : 1)); dado.rotation.y = ry; scene.add(dado);
        }
        for (let i = 0; i < 3; i++) { const x = cx - radio * 0.5 + i * radio * 0.5; const win = box(radio * 0.22, wallH * 0.38, 1, '#bcd3e0', wallH * 0.6, {outline: 0.02, extra: {emissive: '#d8e8f2', emissiveIntensity: 0.35}}); win.position.set(x, wallH * 0.6, wz + 1.6); scene.add(win); const fr = box(radio * 0.24, wallH * 0.4, 0.8, '#e9e4d6', wallH * 0.6, {outline: 0}); fr.position.set(x, wallH * 0.6, wz + 1.1); scene.add(fr); }
        for (let i = 0; i < 2; i++) { const pic = box(1, wallH * 0.22, radio * 0.16, '#3a3028', wallH * 0.62, {outline: 0.02}); pic.position.set(wx + 1.6, wallH * 0.62, cz - radio * 0.2 + i * radio * 0.4); scene.add(pic); }
      }
      return W;
    };

    /** Sacude la cámara en t (amount ≈ 1 un golpe fuerte); se apaga sola en medio segundo. */
    const shakes = [];
    W.shake = (t, amount = 1) => shakes.push({t, a: amount});

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
    /**
     * Hace flotar un objeto en el mar: muestrea el oleaje en 6 puntos de su casco, ajusta altura, cabeceo y balanceo, y
     * les da inercia (responde con retraso según su eslora, como un barco con masa). Todo determinista (solo depende de t).
     * opts: offset (cuánto sobresale), tilt (0-1, cuánto cabecea), maxPitch y maxRoll (grados), inercia (1 = según eslora).
     */
    W.float = (obj, {offset = 0, tilt = 1, maxPitch = 12, maxRoll = 10, inercia = 1} = {}) => {
      const lim = obj.userData.local || (() => { const b = new T.Box3().setFromObject(obj); return {min: b.min.sub(obj.position), max: b.max.sub(obj.position)}; })();
      const hl = Math.max(2, (lim.max.z - lim.min.z) / 2), hb = Math.max(1.5, (lim.max.x - lim.min.x) / 2), cz = (lim.max.z + lim.min.z) / 2, cx = (lim.max.x + lim.min.x) / 2;
      const pts = [[cx - hb * 0.8, cz + hl * 0.85], [cx + hb * 0.8, cz + hl * 0.85], [cx - hb * 0.8, cz - hl * 0.85], [cx + hb * 0.8, cz - hl * 0.85], [cx - hb * 0.85, cz], [cx + hb * 0.85, cz]];
      const tau = Math.min(1.4, (0.12 + hl / 450) * inercia), N = 7, dt = tau / 2.5;
      const wts = Array.from({length: N}, (_, k) => Math.exp(-(k * dt) / tau)), wsum = wts.reduce((a, b) => a + b, 0);
      obj.rotation.order = 'YXZ';
      obj.userData.floating = true;
      floaters.push({obj, hl, hb, speed: (t) => speedOf(obj, t)});
      const r = (d) => (d * Math.PI) / 180;
      updaters.push((tt) => {
        const yaw = obj.rotation.y, c = Math.cos(yaw), sn = Math.sin(yaw), x = obj.position.x, z = obj.position.z;
        let H = 0, P = 0, R = 0;
        for (let k = 0; k < N; k++) {
          const ts = tt - k * dt;
          const h = pts.map(([lx, lz]) => seaHeight(x + lx * c + lz * sn, z - lx * sn + lz * c, ts));
          H += wts[k] * (h[0] + h[1] + h[2] + h[3] + h[4] + h[5]) / 6;
          P += wts[k] * Math.atan2((h[0] + h[1]) / 2 - (h[2] + h[3]) / 2, hl * 1.7);
          R += wts[k] * Math.atan2((h[1] + h[3] + h[5]) / 3 - (h[0] + h[2] + h[4]) / 3, hb * 1.65);
        }
        obj.position.y = H / wsum + offset;
        obj.rotation.x = -K.clamp((P / wsum) * tilt, -r(maxPitch), r(maxPitch));
        obj.rotation.z = K.clamp((R / wsum) * tilt, -r(maxRoll), r(maxRoll));
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
    /**
     * Cámara segura: cuánto hay que subirla en t para que ni ella ni la línea hasta lo que mira queden dentro de una ola
     * o del terreno. Se mira el peor caso del último medio segundo, así sube con suavidad y no tiembla con cada ola.
     */
    const safeLift = (t, pos, look) => {
      if (!ocean && !terrainHeight) return 0;
      const margin = Math.max(2, cam.dist * 0.03);
      let lift = 0;
      for (const ts of [t, t - 0.15, t - 0.3, t - 0.45, t - 0.6]) {
        for (let i = 0; i <= 9; i++) {
          const u = i / 10, x = pos.x + (look.x - pos.x) * u, y = pos.y + (look.y - pos.y) * u, z = pos.z + (look.z - pos.z) * u;
          const top = Math.max(ocean ? seaHeight(x, z, ts) + (i === 0 ? margin : 0.6) : -Infinity, terrainHeight ? terrainHeight(x, z) + (i === 0 ? 3 : 0.6) : -Infinity);
          if (top > y) lift = Math.max(lift, (top - y) / (1 - u));
        }
      }
      return Math.min(lift, cam.dist * 0.8);
    };
    const lookAt = new T.Vector3();
    // Sombras de contacto: una mancha suave bajo cada pieza apoyada (la oclusión que la luz directa no da), del tamaño de su
    // huella; se aclara si la pieza se levanta del suelo y desaparece si vuela. Las piezas con userData.sinSombra no la llevan.
    let blobTex = null; const blobs = new Map();
    const contactShadows = () => {
      if (!blobTex) { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 4, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.55, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); blobTex = new T.CanvasTexture(c); }
      for (const o of objects) {
        if (o.parent !== scene || o.userData.floating || o.userData.sinSombra) continue;
        let b = blobs.get(o);
        const f = footprint(o);
        if (!f || f.ymax - f.ymin > 400 || f.hb > 160 || f.hl > 160) continue;
        if (!b) { b = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({map: blobTex, color: 0x000000, transparent: true, depthWrite: false, opacity: 0.4})); b.rotation.x = -Math.PI / 2; b.renderOrder = 1; scene.add(b); blobs.set(o, b); }
        const gy = terrainHeight ? terrainHeight(f.x, f.z) : 0, lift = Math.max(0, f.ymin - gy);
        b.visible = o.visible !== false && o.scale.x > 0.05 && lift < 40;
        b.position.set(f.x, gy + 1.0, f.z); b.rotation.z = Math.atan2(f.s, f.c);
        b.scale.set(f.hb * 2.5 + 4, f.hl * 2.5 + 4, 1);
        b.material.opacity = (o.userData.decor ? 0.28 : 0.4) * Math.exp(-lift / 12);
      }
    };
    const render = (t) => {
      // Cámara primero (el mar la necesita para el reflejo), con su seguridad y las sacudidas.
      const yaw = ((cam.yaw + (t - T0) * drift) * Math.PI) / 180, pitch = (K.clamp(cam.pitch, 2, 89) * Math.PI) / 180;
      camera.near = Math.max(0.5, cam.dist / 60); camera.updateProjectionMatrix();
      camera.position.set(cam.x + Math.sin(yaw) * Math.cos(pitch) * cam.dist, cam.h + Math.sin(pitch) * cam.dist, cam.z + Math.cos(yaw) * Math.cos(pitch) * cam.dist);
      lookAt.set(cam.x, cam.h, cam.z);
      camera.position.y += safeLift(t, camera.position, lookAt);
      let sx = 0, sy = 0;
      shakes.forEach((q, i) => { const a = t - q.t; if (a >= 0 && a < 0.7) { const k = q.a * Math.exp(-a * 7) * cam.dist * 0.006; sx += Math.sin(a * 61 + i * 1.7) * k; sy += Math.cos(a * 47 + i * 2.3) * k; } });
      camera.position.x += sx; camera.position.y += sy;
      camera.lookAt(lookAt.x + sx * 0.5, lookAt.y + sy * 0.5, lookAt.z);
      camera.updateMatrixWorld();
      // Bruma antes que el mar (el agua se dimensiona para llegar más allá de ella) y plano lejano que nunca la recorta.
      if (haze || S.haze) { const far = Math.max(cam.dist * (haze || S.haze), 420); scene.fog.near = far * 0.08; scene.fog.far = far; }
      else { scene.fog.near = cam.dist * 1.4; scene.fog.far = cam.dist * 4.5; }
      camera.far = Math.max(6000, scene.fog.far * 1.3 + cam.dist); camera.updateProjectionMatrix();
      if (horizon) { const R = scene.fog.far * 1.05, H = R * 0.2 + camera.position.y * 2; horizon.scale.set(R, H, R); horizon.position.set(camera.position.x, camera.position.y, camera.position.z); }
      for (const fn of updatersEarly) fn(t);
      for (const fn of updaters) fn(t);
      // Lo que está apoyado en el suelo lo sigue aunque se mueva (salvo lo que flota, vuela o anda por su cuenta).
      if (terrainHeight) for (const o of objects) if (o.userData.grounded && !o.userData.floating && !(o.userData.walking || []).some((w) => t >= w.t0 - 0.1 && t <= w.t1 + 0.5) && o.parent === scene) o.position.y = terrainHeight(o.position.x, o.position.z);
      // La decoración nunca tapa el plano: el mobiliario que queda entre la cámara y lo que mira se oculta en este fotograma.
      { const cp = camera.position, L = new T.Vector3().subVectors(lookAt, cp), len2 = L.lengthSq(), q = new T.Vector3();
        for (const o of objects) { if (!o.userData.decor) continue; q.set(o.position.x, o.position.y + (o.userData.local ? (o.userData.local.max.y - o.userData.local.min.y) / 2 : 5), o.position.z); const u = K.clamp(q.clone().sub(cp).dot(L) / len2, 0, 1); const d = q.distanceTo(cp.clone().addScaledVector(L, u)); const rad = o.userData.local ? Math.max(o.userData.local.max.x - o.userData.local.min.x, o.userData.local.max.y - o.userData.local.min.y, o.userData.local.max.z - o.userData.local.min.z) * 0.6 : 8; o.visible = !(u > 0 && u < 0.85 && d < rad + Math.sqrt(len2) * 0.06); } }
      renderer.toneMappingExposure = exposure;
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
      if (sunSprite) { const d = scene.fog.far * 0.9; sunSprite.position.set(camera.position.x + Math.cos(el) * Math.sin(az) * d, camera.position.y + Math.sin(el) * d * 0.9 + 10, camera.position.z + Math.cos(el) * Math.cos(az) * d); sunSprite.scale.setScalar(d * 0.55); }
      if (S.night) objects.forEach((o) => o.traverse((n) => { if (n.material && n.material.emissiveMap) n.material.emissiveIntensity = 1.4; }));
      if (ground === 'none') contactShadows();
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
    /**
     * Auditoría física del fotograma t (después de dibujarlo): piezas que se atraviesan, cámara dentro del agua, del
     * terreno o de una pieza, sujeto tapado por una ola, piezas enterradas, flotando o hundidas, y pies que patinan.
     * Devuelve [{tipo, grave, texto}]. La usa «genframe auditar».
     */
    W.audit = (t) => {
      const out = [];
      const tops = objects.filter((o) => o.parent === scene && !o.userData.ghost && o.visible !== false && o.scale.x > 0.05);
      const shapes = tops.map((o) => ({o, sh: obbsOf(o)}));
      for (let i = 0; i < shapes.length; i++) for (let j = i + 1; j < shapes.length; j++) {
        const c = collide(shapes[i].sh, shapes[j].sh, 1.0);
        if (c) out.push({tipo: 'choque', grave: c.pen > 2.5, texto: `«${shapes[i].o.userData.model}» atraviesa «${shapes[j].o.userData.model}» (${(c.pen / 10).toFixed(2)} m)`});
      }
      const cp = camera.position;
      if (ocean && cp.y < seaHeight(cp.x, cp.z, t) + 0.5) out.push({tipo: 'camara', grave: true, texto: 'la cámara está dentro del agua'});
      if (terrainHeight && cp.y < terrainHeight(cp.x, cp.z) + 0.5) out.push({tipo: 'camara', grave: true, texto: 'la cámara está bajo el terreno'});
      for (const {o, sh} of shapes) {
        if (sh.box.containsPoint(cp) && sh.obbs.some((b) => { const d = new T.Vector3().subVectors(cp, b.c); return [0, 1, 2].every((k) => Math.abs(d.dot(b.ax[k])) < b.half[k]); })) out.push({tipo: 'camara', grave: true, texto: `la cámara está dentro de «${o.userData.model}»`});
      }
      if (ocean) { let blocked = false; for (let i = 1; i < 10; i++) { const u = i / 10, x = cp.x + (lookAt.x - cp.x) * u, y = cp.y + (lookAt.y - cp.y) * u, z = cp.z + (lookAt.z - cp.z) * u; if (seaHeight(x, z, t) > y + 0.5) blocked = true; } if (blocked) out.push({tipo: 'camara', grave: true, texto: 'una ola tapa lo que mira la cámara'}); }
      // Pieza pegada a la cámara que tapa lo que mira (en el primer 35 % del camino hasta el sujeto).
      for (const {o, sh} of shapes) {
        let hits = 0;
        for (let i = 1; i <= 7; i++) { const u = i * 0.05, q = new T.Vector3(cp.x + (lookAt.x - cp.x) * u, cp.y + (lookAt.y - cp.y) * u, cp.z + (lookAt.z - cp.z) * u); if (sh.box.containsPoint(q) && sh.obbs.some((b) => { const d = new T.Vector3().subVectors(q, b.c); return [0, 1, 2].every((k) => Math.abs(d.dot(b.ax[k])) < b.half[k]); })) hits++; }
        if (hits) out.push({tipo: 'camara', grave: false, texto: `«${o.userData.model}» pasa pegada a la cámara y tapa el plano`});
      }
      for (const {o, sh} of shapes) {
        if (o.userData.grounded && !o.userData.floating && terrainHeight) { const g = terrainHeight(o.position.x, o.position.z), d = o.position.y - g; if (Math.abs(d) > 3) out.push({tipo: 'suelo', grave: false, texto: `«${o.userData.model}» ${d > 0 ? 'flota' : 'está enterrada'} ${(Math.abs(d) / 10).toFixed(1)} m`}); }
        if (ocean && !o.userData.floating && sh.box.max.y < seaHeight(o.position.x, o.position.z, t) - 1 && !sh.box.isEmpty()) out.push({tipo: 'agua', grave: false, texto: `«${o.userData.model}» queda entera bajo el agua`});
        // Pies que patinan: acción de andar o correr con un desplazamiento que no le corresponde (usa w.walk).
        const acts = (o.userData._acts || []).filter((a) => (a.name === 'andar' || a.name === 'correr') && t >= a.t0 && t <= a.t1);
        const walking = (o.userData.walking || []).some((w) => t >= w.t0 && t <= w.t1);
        const prev = o.userData._auditPrev;
        if (acts.length && !walking && prev && t - prev.t > 0.05 && t - prev.t < 0.6) {
          const v = Math.hypot(o.position.x - prev.x, o.position.z - prev.z) / (t - prev.t), g = gaitOf(o, acts[0].name), nat = (g.stride * g.omega) / (2 * Math.PI) * (acts[0].rate || 1);
          if (Math.abs(v / nat - 1) > 0.4) out.push({tipo: 'pies', grave: false, texto: `«${o.userData.model}» ${acts[0].name} a ${(v / 10).toFixed(1)} m/s con zancada de ${(nat / 10).toFixed(1)} m/s: los pies patinan (usa w.walk)`});
        }
        o.userData._auditPrev = {t, x: o.position.x, z: o.position.z};
      }
      // Suelo vacío: qué parte del plano es el suelo liso de base, sin nada encima (pide decoración).
      if (ground === 'none' && !terrainHeight && !ocean) {
        const rc = new T.Raycaster(); rc.camera = camera;
        const targets = scene.children.filter((n) => !n.isLight && n.visible !== false);
        let bare = 0, total = 0;
        for (let i = 0; i < 9; i++) for (let j = 0; j < 14; j++) {
          rc.setFromCamera(new T.Vector2(-0.9 + (i / 8) * 1.8, -0.55 + (j / 13) * 1.45), camera);
          const hit = rc.intersectObjects(targets, true).find((h) => h.object.visible !== false && !(h.object.isSprite) && !(h.object.material && h.object.material.colorWrite === false));
          total++; if (hit && hit.object === seaMesh) bare++;
        }
        if (bare / total > 0.2) out.push({tipo: 'vacio', grave: false, texto: `suelo vacío en el ${Math.round((bare / total) * 100)} % del plano: decora el entorno (w.decorar)`});
      }
      return out;
    };
    K._worlds.push({T0, T1, W, root});
    return W;
  };
})();

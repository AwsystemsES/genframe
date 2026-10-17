/*
 * Generadores procedurales del taller (K.forge.gen): no son modelos fijos, son constructores de calidad
 * que la IA configura con parámetros para cada pieza (cuerpo humano articulado, casco de barco…) y que
 * después completa con sus propias piezas. Medidas en unidades: 10 = 1 metro. Frente hacia +z.
 */
(function () {
  const K = window.K;
  if (!K || !K.forge) return;
  const F = K.forge;
  const T = F.T;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (v, list, d) => (list.includes(v) ? v : d);
  const shade = (hex, f) => { const c = new T.Color(hex); c.multiplyScalar(f); return '#' + c.getHexString(); };

  /** Cápsula colgando desde su punto superior (y = 0) hacia abajo una longitud total `len`. */
  const limb = (r1, r2, len, color, o) => {
    const g = new T.Group();
    const geo = new T.CylinderGeometry(r1, r2, Math.max(0.01, len - (r1 + r2) * 0.5), 14, 1);
    const body = F.mesh(geo, color, o);
    body.position.y = -len / 2;
    g.add(body);
    const top = F.mesh(new T.SphereGeometry(r1, 14, 10), color, o); top.position.y = -r1 * 0.5; g.add(top);
    const bottom = F.mesh(new T.SphereGeometry(r2, 14, 10), color, o); bottom.position.y = -len + r2 * 0.5; g.add(bottom);
    return g;
  };
  const ellipsoid = (rx, ry, rz, color, o) => { const m = F.mesh(new T.SphereGeometry(1, 20, 14), color, o); m.scale.set(rx, ry, rz); return m; };

  /* ---------------------------------------------------------------- cuerpo humano */
  const HEADWEAR = ['ninguno', 'casco_m1', 'casco_brodie', 'casco_aleman', 'gorra_plato', 'gorra', 'boina', 'sombrero', 'gorro', 'casco_obra', 'corona'];
  const HAIR = ['corto', 'largo', 'recogido', 'calvo', 'rapado'];

  /**
   * Persona articulada. p: {height (18 = 1,8 m), build (0.8-1.3), style: 'real'|'comic'|'chibi', female, skin,
   * hair: {style, color}, beard: color|null, glasses, top, jacket: color|null, jacketLength: 'corta'|'larga', bottom, skirt,
   * shoes, belt, tie, buttons, headwear, headwearColor, backpack: color|null, rifle, sling, gloves, badge: color|null}
   * Articulaciones: cadera, columna, cuello, cabeza, hombro_izq/der, codo_izq/der, mano_izq/der, muslo_izq/der,
   * rodilla_izq/der, tobillo_izq/der. Acciones: respirar, andar, correr, hablar, saludar.
   */
  function human(p = {}) {
    const H = clamp(Number(p.height) || 18, 4, 40);
    const build = clamp(Number(p.build) || 1, 0.7, 1.5);
    const style = pick(p.style, ['real', 'comic', 'chibi'], 'real');
    const heads = {real: 7.4, comic: 6.2, chibi: 3.8}[style];
    const fem = !!p.female;
    const skin = p.skin || '#d9a684';
    const top = p.top || '#d8d2c4';
    const jacket = p.jacket || null;
    const bottom = p.bottom || '#3d4250';
    const shoes = p.shoes || '#26211d';
    const hair = {style: pick((p.hair || {}).style, HAIR, 'corto'), color: (p.hair || {}).color || '#3a2a20'};
    const hw = pick(p.headwear, HEADWEAR, 'ninguno');
    const thin = {outline: 0.04};

    const headH = H / heads;
    const headR = headH * 0.5;
    const neckL = headH * (style === 'chibi' ? 0.12 : 0.28);
    const bodyH = H - headH - neckL;
    const hipY = bodyH * (style === 'chibi' ? 0.42 : 0.53);
    const legL = hipY - H * 0.012;
    const torsoL = bodyH - hipY;
    const shoulderW = Math.min(headH * (style === 'chibi' ? 1.5 : 2.05), H * 0.27) * build * (fem ? 0.9 : 1);
    const hipW = shoulderW * (fem ? 0.98 : 0.82);
    const limbR = H * (style === 'chibi' ? 0.05 : 0.034) * build;
    const armL = (bodyH - hipY) * (style === 'chibi' ? 1.05 : 1.32);

    const root = new T.Group();
    const J = {};
    const hips = F.pivot(root, 'cadera', 0, hipY, 0); J.cadera = hips;
    // Pelvis y pantalón o falda.
    hips.add(ellipsoid(hipW * 0.55, torsoL * 0.17, hipW * 0.36, p.skirt ? p.skirt : bottom));
    const spine = F.pivot(hips, 'columna', 0, torsoL * 0.08, 0); J.columna = spine;
    // Torso torneado (cadera, cintura, pecho, hombros) y aplastado de delante a atrás.
    const wr = hipW * (fem ? 0.4 : 0.45), cr = shoulderW * (fem ? 0.44 : 0.47), sr = shoulderW * 0.36;
    const profile = [[0.01, -torsoL * 0.06], [wr * 1.02, 0], [wr * 0.94, torsoL * 0.28], [cr, torsoL * 0.62], [cr * 0.98, torsoL * 0.8], [sr, torsoL * 0.93], [shoulderW * 0.12, torsoL]];
    const torso = F.lathe(profile, jacket || top, {seg: 22});
    torso.scale.z = 0.66;
    spine.add(torso);
    if (fem && style !== 'chibi') { for (const s of [-1, 1]) { const b = ellipsoid(cr * 0.32, cr * 0.3, cr * 0.28, jacket || top, thin); b.position.set(s * cr * 0.42, torsoL * 0.62, cr * 0.4); spine.add(b); } }
    if (jacket) {
      // Solapas, botones, cinturón y faldón de la chaqueta.
      const lapel = F.extrude([[0, 0], [cr * 0.42, torsoL * 0.36], [cr * 0.14, torsoL * 0.36]], 0.25, shade(jacket, 0.82), {o: thin});
      for (const s of [-1, 1]) { const l = lapel.clone(); l.scale.x = s; l.position.set(0, torsoL * 0.52, cr * 0.64); spine.add(l); }
      if (p.buttons !== false) for (let i = 0; i < 4; i++) { const b = F.sphere(limbR * 0.16, p.buttons || '#c9a64a', 0, {outline: 0}); b.position.set(0, torsoL * (0.1 + i * 0.13), wr * 0.68 + i * 0.05); spine.add(b); }
      if (p.jacketLength === 'larga') { const skirt = F.lathe([[wr * 1.04, 0], [wr * 1.25, -torsoL * 0.45]], jacket, {seg: 22}); skirt.scale.z = 0.7; spine.add(skirt); }
    }
    if (p.tie) { const tie = F.extrude([[-0.35, 0], [0.35, 0], [0.5, -torsoL * 0.42], [0, -torsoL * 0.5], [-0.5, -torsoL * 0.42]], 0.2, p.tie, {o: thin}); tie.position.set(0, torsoL * 0.88, cr * 0.66); spine.add(tie); }
    if (p.belt !== false) { const belt = F.mesh(new T.TorusGeometry(wr * 1.02, limbR * 0.22, 6, 26), p.belt || '#2b241e', thin); belt.rotation.x = Math.PI / 2; belt.scale.y = 0.66; belt.position.y = torsoL * 0.03; spine.add(belt); }
    if (p.badge) { const badge = F.cyl(limbR * 0.35, limbR * 0.35, 0.2, p.badge, 12, 0, {outline: 0}); badge.rotation.x = Math.PI / 2; badge.position.set(cr * 0.45, torsoL * 0.68, cr * 0.62); spine.add(badge); }
    if (p.backpack) {
      const bp = F.box(shoulderW * 0.62, torsoL * 0.52, shoulderW * 0.3, p.backpack, 0, {outline: 0.05});
      bp.position.set(0, torsoL * 0.55, -cr * 0.66 - shoulderW * 0.14); spine.add(bp);
      const flap = F.box(shoulderW * 0.64, torsoL * 0.18, shoulderW * 0.32, shade(p.backpack, 0.85), 0, {outline: 0}); flap.position.set(0, torsoL * 0.76, -cr * 0.66 - shoulderW * 0.14); spine.add(flap);
      for (const s of [-1, 1]) { const strap = F.tube([[s * shoulderW * 0.22, torsoL * 0.95, 0], [s * shoulderW * 0.24, torsoL * 0.7, cr * 0.62], [s * shoulderW * 0.22, torsoL * 0.25, wr * 0.66]], limbR * 0.12, shade(p.backpack, 0.7), {o: {outline: 0}}); spine.add(strap); }
    }
    if (p.rifle) {
      const rifle = new T.Group();
      rifle.add(F.at(F.box(0.5, H * 0.5, 0.7, p.rifle === true ? '#4a3626' : p.rifle, 0, {outline: 0.05}), 0, 0, 0));
      rifle.add(F.at(F.cyl(0.14, 0.14, H * 0.26, '#2a2a2c', 8, 0, {outline: 0}), 0, H * 0.34, 0.1));
      rifle.rotation.z = 0.55; rifle.position.set(0, torsoL * 0.55, -cr * 0.7 - (p.backpack ? shoulderW * 0.32 : 0.3)); spine.add(rifle);
    }

    // Cuello y cabeza.
    const neck = F.pivot(spine, 'cuello', 0, torsoL * 0.97, 0); J.cuello = neck;
    const neckMesh = F.cyl(headR * 0.36, headR * 0.42, neckL + headR * 0.3, skin, 12, (neckL + headR * 0.3) / 2, thin); neck.add(neckMesh);
    if (jacket || p.collar) { const collar = F.cyl(headR * 0.5, headR * 0.56, neckL * 0.7, jacket || top, 14, neckL * 0.3, thin); neck.add(collar); }
    const head = F.pivot(neck, 'cabeza', 0, neckL, 0); J.cabeza = head;
    const skull = ellipsoid(headR * 0.86, headR, headR * 0.92, skin); skull.position.y = headR; head.add(skull);
    const jaw = ellipsoid(headR * 0.66, headR * 0.5, headR * 0.7, skin, thin); jaw.position.set(0, headR * 0.6, headR * 0.12); head.add(jaw);
    const nose = F.cone(headR * 0.12, headR * 0.32, skin, 8, 0, {outline: 0.03}); nose.rotation.x = Math.PI / 2; nose.position.set(0, headR * 0.95, headR * 0.98); head.add(nose);
    for (const s of [-1, 1]) {
      const ear = ellipsoid(headR * 0.12, headR * 0.22, headR * 0.1, skin, thin); ear.position.set(s * headR * 0.86, headR * 1.0, 0); head.add(ear);
      const eye = F.sphere(headR * (style === 'chibi' ? 0.13 : 0.085), '#1a1614', 0, {outline: 0}); eye.position.set(s * headR * 0.33, headR * 1.1, headR * 0.86); head.add(eye);
      const brow = F.box(headR * 0.3, headR * 0.06, headR * 0.06, shade(hair.color, 0.9), 0, {outline: 0}); brow.position.set(s * headR * 0.33, headR * 1.3, headR * 0.86); brow.rotation.z = s * -0.08; head.add(brow);
    }
    const mouth = F.box(headR * 0.3, headR * 0.05, headR * 0.05, shade(skin, 0.6), 0, {outline: 0}); mouth.position.set(0, headR * 0.62, headR * 0.86); mouth.name = 'boca'; head.add(mouth);
    if (p.glasses) { for (const s of [-1, 1]) { const lens = F.mesh(new T.TorusGeometry(headR * 0.16, headR * 0.025, 6, 18), '#1d1d1d', {outline: 0}); lens.position.set(s * headR * 0.33, headR * 1.1, headR * 0.93); head.add(lens); } }
    if (p.beard) { const beard = ellipsoid(headR * 0.62, headR * 0.42, headR * 0.5, p.beard, thin); beard.position.set(0, headR * 0.5, headR * 0.35); head.add(beard); }
    // Pelo (si la prenda de la cabeza no lo tapa entero).
    if (!['calvo'].includes(hair.style) && !['casco_m1', 'casco_aleman', 'casco_obra'].includes(hw)) {
      const cap = F.mesh(new T.SphereGeometry(headR * (hair.style === 'rapado' ? 0.9 : 0.97), 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), hair.color, thin);
      cap.scale.set(0.93, 1, 0.98); cap.position.y = headR * 1.02; cap.rotation.x = -0.18; head.add(cap);
      if (hair.style === 'largo') { const back = ellipsoid(headR * 0.82, headR * 1.05, headR * 0.45, hair.color, thin); back.position.set(0, headR * 0.65, -headR * 0.55); head.add(back); }
      if (hair.style === 'recogido') { const bun = F.sphere(headR * 0.32, hair.color, 0, thin); bun.position.set(0, headR * 1.5, -headR * 0.75); head.add(bun); }
    }
    const hc = p.headwearColor || '#4f5a3c';
    const helmet = (rx, ry, rz, rim, y = headR * 1.15) => {
      const dome = F.mesh(new T.SphereGeometry(1, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), hc, {outline: 0.05}); dome.scale.set(rx, ry, rz); dome.position.y = y; head.add(dome);
      if (rim) { const r = F.mesh(new T.CylinderGeometry(rim, rim, headR * 0.06, 26), shade(hc, 0.9), {outline: 0.05}); r.position.y = y; head.add(r); }
    };
    if (hw === 'casco_m1') helmet(headR * 1.08, headR * 1.0, headR * 1.12, headR * 1.18, headR * 1.08);
    if (hw === 'casco_brodie') { helmet(headR * 0.95, headR * 0.65, headR * 0.98, headR * 1.55, headR * 1.3); }
    if (hw === 'casco_aleman') { helmet(headR * 1.05, headR * 1.05, headR * 1.12, null, headR * 1.05); const skirt = F.lathe([[headR * 1.05, 0], [headR * 1.18, -headR * 0.38]], hc, {seg: 22}); skirt.position.y = headR * 1.05; head.add(skirt); }
    if (hw === 'casco_obra') helmet(headR * 1.02, headR * 0.92, headR * 1.12, headR * 1.12, headR * 1.12);
    if (hw === 'gorra_plato') {
      const crown = F.cyl(headR * 1.05, headR * 0.86, headR * 0.5, hc, 22, 0, {outline: 0.05}); crown.position.y = headR * 1.72; head.add(crown);
      const band = F.cyl(headR * 0.88, headR * 0.88, headR * 0.2, shade(hc, 0.6), 22, 0, {outline: 0}); band.position.y = headR * 1.5; head.add(band);
      const visor = F.mesh(new T.CylinderGeometry(headR * 0.55, headR * 0.55, headR * 0.06, 18, 1, false, -Math.PI / 2, Math.PI), '#151515', {outline: 0.04}); visor.position.set(0, headR * 1.42, headR * 0.6); visor.rotation.x = 0.25; head.add(visor);
    }
    if (hw === 'gorra') { const c = F.mesh(new T.SphereGeometry(headR * 0.98, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), hc, {outline: 0.05}); c.position.y = headR * 1.12; head.add(c); const v = F.mesh(new T.CylinderGeometry(headR * 0.62, headR * 0.62, headR * 0.06, 18, 1, false, -Math.PI / 2, Math.PI), shade(hc, 0.85), {outline: 0.04}); v.position.set(0, headR * 1.15, headR * 0.7); head.add(v); }
    if (hw === 'boina') { const c = ellipsoid(headR * 1.08, headR * 0.32, headR * 1.05, hc, {outline: 0.05}); c.position.set(headR * 0.12, headR * 1.72, 0); c.rotation.z = -0.25; head.add(c); }
    if (hw === 'sombrero') { const crown = F.cyl(headR * 0.78, headR * 0.86, headR * 0.7, hc, 20, 0, {outline: 0.05}); crown.position.y = headR * 1.85; head.add(crown); const brim = F.cyl(headR * 1.55, headR * 1.55, headR * 0.06, shade(hc, 0.9), 26, 0, {outline: 0.05}); brim.position.y = headR * 1.52; head.add(brim); }
    if (hw === 'gorro') { const c = F.mesh(new T.SphereGeometry(headR * 1.0, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hc, {outline: 0.05}); c.scale.y = 1.15; c.position.y = headR * 1.08; head.add(c); }
    if (hw === 'corona') { const c = F.cyl(headR * 0.82, headR * 0.82, headR * 0.45, '#e2b23a', 10, 0, {outline: 0.05}); c.position.y = headR * 1.95; head.add(c); }

    // Brazos: hombro → codo → mano, colgando con los brazos algo separados.
    for (const s of [-1, 1]) {
      const side = s < 0 ? 'izq' : 'der';
      const sh = F.pivot(spine, 'hombro_' + side, s * shoulderW * 0.44, torsoL * 0.86, 0); J['hombro_' + side] = sh;
      sh.rotation.z = s * 0.1;
      const sleeve = jacket || top;
      sh.add(ellipsoid(limbR * 1.35, limbR * 1.25, limbR * 1.3, sleeve, thin));
      sh.add(limb(limbR * 1.08, limbR * 0.92, armL * 0.5, sleeve, thin));
      const el = F.pivot(sh, 'codo_' + side, 0, -armL * 0.5, 0); J['codo_' + side] = el;
      el.rotation.x = -0.12;
      el.add(limb(limbR * 0.9, limbR * 0.74, armL * 0.44, sleeve, thin));
      const cuff = F.cyl(limbR * 0.8, limbR * 0.8, limbR * 0.4, shade(sleeve, 0.8), 12, 0, {outline: 0}); cuff.position.y = -armL * 0.42; el.add(cuff);
      const hand = F.pivot(el, 'mano_' + side, 0, -armL * 0.46, 0); J['mano_' + side] = hand;
      const palm = ellipsoid(limbR * 0.62, limbR * 1.05, limbR * 0.36, p.gloves || skin, thin); palm.position.y = -limbR * 0.9; hand.add(palm);
      const thumb = limb(limbR * 0.22, limbR * 0.18, limbR * 0.9, p.gloves || skin, {outline: 0.03}); thumb.position.set(0, -limbR * 0.4, limbR * 0.3); thumb.rotation.x = 0.7; hand.add(thumb);
    }
    // Piernas: muslo → rodilla → tobillo → pie.
    for (const s of [-1, 1]) {
      const side = s < 0 ? 'izq' : 'der';
      const th = F.pivot(hips, 'muslo_' + side, s * hipW * 0.24, 0, 0); J['muslo_' + side] = th;
      const leg = p.skirt ? skin : bottom;
      th.add(limb(limbR * 1.45 * (fem ? 1.05 : 1), limbR * 1.08, legL * 0.5, leg, thin));
      const kn = F.pivot(th, 'rodilla_' + side, 0, -legL * 0.5, 0); J['rodilla_' + side] = kn;
      kn.add(limb(limbR * 1.05, limbR * 0.78, legL * 0.47, leg, thin));
      if (p.boots || p.boots === undefined && hw.startsWith('casco')) { const boot = F.cyl(limbR * 0.95, limbR * 0.95, legL * 0.16, shoes, 12, 0, {outline: 0.04}); boot.position.y = -legL * 0.4; kn.add(boot); }
      const an = F.pivot(kn, 'tobillo_' + side, 0, -legL * 0.47, 0); J['tobillo_' + side] = an;
      const foot = F.box(limbR * 1.5, limbR * 0.9, H * 0.13, shoes, 0, thin); foot.position.set(0, -limbR * 0.2, H * 0.035); an.add(foot);
    }
    if (p.skirt) { const sk = F.lathe([[hipW * 0.55, 0], [hipW * 0.75, -legL * 0.45]], p.skirt, {seg: 22}); sk.scale.z = 0.8; sk.position.y = 0; hips.add(sk); }

    // Acciones: ciclos que ponen la rotación de las articulaciones (fase en segundos, k = intensidad 0-1).
    const base = {};
    for (const [n, j] of Object.entries(J)) base[n] = {x: j.rotation.x, y: j.rotation.y, z: j.rotation.z, py: j.position.y};
    const set = (n, ax, v) => { J[n].rotation[ax] = base[n][ax] + v; };
    const gait = (ph, k, amp, lean, speed) => {
      const a = Math.sin(ph * speed);
      set('muslo_izq', 'x', -a * amp * k); set('muslo_der', 'x', a * amp * k);
      set('rodilla_izq', 'x', Math.max(0, a) * amp * 1.3 * k); set('rodilla_der', 'x', Math.max(0, -a) * amp * 1.3 * k);
      set('hombro_izq', 'x', a * amp * 0.8 * k); set('hombro_der', 'x', -a * amp * 0.8 * k);
      set('codo_izq', 'x', -(0.3 + Math.max(0, a) * 0.5) * k); set('codo_der', 'x', -(0.3 + Math.max(0, -a) * 0.5) * k);
      set('columna', 'x', lean * k);
      J.cadera.position.y = base.cadera.py + Math.abs(Math.cos(ph * speed)) * H * 0.012 * k;
    };
    root.userData.actions = {
      respirar(ph, k) { set('columna', 'x', Math.sin(ph * 1.6) * 0.02 * k); set('cabeza', 'y', Math.sin(ph * 0.4) * 0.08 * k); },
      andar(ph, k) { gait(ph, k, 0.45, 0.04, 6.2); },
      correr(ph, k) { gait(ph, k, 0.85, 0.22, 10); },
      hablar(ph, k) { set('cabeza', 'x', Math.sin(ph * 2.3) * 0.06 * k); set('hombro_der', 'x', (-0.5 + Math.sin(ph * 1.7) * 0.25) * k); set('codo_der', 'x', (-0.9 + Math.sin(ph * 3.1) * 0.3) * k); },
      saludar(ph, k) { set('hombro_der', 'z', -2.6 * k); set('codo_der', 'z', Math.sin(ph * 7) * 0.4 * k); },
    };
    root.userData.size = {w: shoulderW * 1.3, h: H, d: H * 0.18};
    return root;
  }

  /* ---------------------------------------------------------------- casco de barco */
  /**
   * Casco de barco por secciones (no es un barco fijo): p {length, beam, depth (de la quilla a la cubierta), draft
   * (calado, la línea de flotación), bow: 'punta'|'rampa'|'redonda'|'lancha', stern: 'espejo'|'redonda', flat (0 = en V, 1 = fondo plano),
   * sheer (cuánto sube la cubierta en la proa), color, bottom (color bajo el agua), stripe, deck, rail: bool}
   * Articulación «rampa» si la proa es de rampa. El modelo flota con la línea de flotación en y = 0 si p.afloat.
   */
  function hull(p = {}) {
    const L = clamp(Number(p.length) || 110, 10, 4000), B = clamp(Number(p.beam) || L * 0.28, 2, 800), D = clamp(Number(p.depth) || B * 0.45, 1, 400);
    const draft = clamp(Number(p.draft) || D * 0.45, 0, D);
    const bow = pick(p.bow, ['punta', 'rampa', 'redonda', 'lancha'], 'punta');
    const stern = pick(p.stern, ['espejo', 'redonda'], 'espejo');
    const flat = clamp(p.flat ?? (bow === 'rampa' ? 0.85 : 0.35), 0, 1);
    const sheer = Number(p.sheer ?? (bow === 'punta' ? D * 0.35 : D * 0.08));
    const color = p.color || '#6f7880', under = p.bottom || '#7a2f2a', stripe = p.stripe || null;
    const N = 46, M = 18;
    const halfW = (t) => {
      let w = B / 2;
      if (bow === 'punta') w *= t < 0.55 ? 1 : Math.pow(Math.max(0, Math.cos(((t - 0.55) / 0.45) * Math.PI / 2)), 0.75);
      if (bow === 'redonda') w *= t < 0.7 ? 1 : Math.sqrt(Math.max(0, 1 - ((t - 0.7) / 0.3) ** 2));
      if (bow === 'lancha') w *= t < 0.6 ? 1 : 1 - ((t - 0.6) / 0.4) ** 1.6 * 0.88;
      if (stern === 'redonda') w *= t > 0.15 ? 1 : Math.sqrt(Math.max(0.05, 1 - ((0.15 - t) / 0.15) ** 2));
      else w *= t > 0.06 ? 1 : 0.9 + t / 0.06 * 0.1;
      return Math.max(w, 0.02);
    };
    const keel = (t) => (bow === 'lancha' && t > 0.6 ? ((t - 0.6) / 0.4) ** 2 * D * 0.55 : 0) + (stern === 'redonda' && t < 0.12 ? (0.12 - t) / 0.12 * D * 0.25 : 0);
    const deckY = (t) => D + sheer * t * t;
    const pos = [], col = [], idx = [];
    const cTop = new T.Color(color), cBot = new T.Color(under), cStripe = stripe ? new T.Color(stripe) : null;
    for (let i = 0; i <= N; i++) {
      const t = i / N, z = -L / 2 + t * L, w = halfW(t), k = keel(t), top = deckY(t);
      for (let j = 0; j <= M; j++) {
        const th = -Math.PI / 2 + (j / M) * Math.PI;
        const c = Math.cos(th);
        const x = w * Math.sin(th);
        const y = k + (top - k) * (1 - Math.pow(Math.max(0, c), 0.25 + (1 - flat) * 1.4));
        pos.push(x, y, z);
        const cc = y < draft ? cBot : cStripe && y < draft + D * 0.08 ? cStripe : cTop;
        col.push(cc.r, cc.g, cc.b);
      }
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const a = i * (M + 1) + j, b = a + M + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    // Espejo de popa cerrado (y proa cerrada salvo la de rampa, que la cierra la rampa).
    const cap = (i, flip) => { const c0 = pos.length / 3; const t = i / N; pos.push(0, deckY(t), -L / 2 + t * L); col.push(cTop.r, cTop.g, cTop.b); for (let j = 0; j < M; j++) { const a = i * (M + 1) + j; flip ? idx.push(c0, a, a + 1) : idx.push(c0, a + 1, a); } };
    cap(0, false);
    if (bow !== 'rampa') cap(N, true);
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    const outer = new T.Group();
    const g = new T.Group();
    outer.add(g);
    const shell = F.mesh(geo, '#ffffff', {extra: {vertexColors: true, side: T.DoubleSide}, outline: 0.012});
    g.add(shell);
    // Cubierta (solo si se pide: una lancha abierta no la lleva) y regala.
    if (p.deck) {
      const shape = new T.Shape(); const pts = [];
      for (let i = 0; i <= N; i++) pts.push([halfW(i / N) * 0.96, -L / 2 + (i / N) * L]);
      shape.moveTo(-pts[0][0], pts[0][1]); for (const [x, z] of pts) shape.lineTo(-x, z); for (const [x, z] of pts.slice().reverse()) shape.lineTo(x, z);
      const deck = F.mesh(new T.ShapeGeometry(shape), p.deck === true ? '#8a8172' : p.deck, {outline: 0}); deck.rotation.x = Math.PI / 2; deck.scale.y = -1; deck.position.y = D * 0.985; g.add(deck);
    } else {
      const floor = F.box(B * 0.86, D * 0.05, L * 0.86, shade(color, 0.7), D * 0.12, {outline: 0}); g.add(floor);
    }
    if (p.rail !== false) for (const s of [-1, 1]) { const pts = []; for (let i = 0; i <= N; i += 2) { const t = i / N; pts.push([s * halfW(t), deckY(t) + D * 0.04, -L / 2 + t * L]); } g.add(F.tube(pts, Math.max(0.15, D * 0.03), shade(color, 0.75), {seg: 60, radial: 6, o: {outline: 0}})); }
    // Tracas (refuerzos horizontales del costado) y, si se pide, cabina o puente a popa.
    for (let k = 1; k <= (p.strakes ?? 2); k++) for (const s of [-1, 1]) { const h = D * (0.3 + 0.55 * k / ((p.strakes ?? 2) + 1)); const pts = []; for (let i = 1; i < N; i += 2) { const t = i / N; pts.push([s * halfW(t) * 1.01, keel(t) + (deckY(t) - keel(t)) * (h / D), -L / 2 + t * L]); } g.add(F.tube(pts, Math.max(0.1, D * 0.018), shade(color, 0.8), {seg: 50, radial: 5, o: {outline: 0}})); }
    if (p.cabin) {
      const cw = B * 0.5, ch = D * 0.7, cd = L * 0.12;
      const cabin = F.box(cw, ch, cd, p.cabin === true ? shade(color, 1.08) : p.cabin, D + ch / 2 - D * 0.05, {outline: 0.03}); cabin.position.z = -L / 2 + cd * 0.9; g.add(cabin);
      const glass = F.box(cw * 0.8, ch * 0.22, 0.3, '#22313a', 0, {outline: 0}); glass.position.set(0, D + ch * 0.72, -L / 2 + cd * 1.4 + 0.2); g.add(glass);
    }
    if (bow === 'rampa') {
      const ramp = F.pivot(g, 'rampa', 0, keel(1) + D * 0.05, L / 2);
      const plate = F.box(B * 0.92, D * 1.0, Math.max(0.4, D * 0.07), shade(color, 0.92), 0, {outline: 0.03}); plate.position.set(0, D * 0.5, 0); ramp.add(plate);
      for (let i = 1; i < 6; i++) { const rib = F.box(B * 0.88, D * 0.04, D * 0.05, shade(color, 0.75), 0, {outline: 0}); rib.position.set(0, (i / 6) * D, -D * 0.05); ramp.add(rib); }
      g.userData.actions = {abrir(ph, k) { ramp.rotation.x = Math.min(1, ph / 1.2) * 1.45 * k; }};
    }
    g.userData.actions = {...(g.userData.actions || {}), cabecear(ph, k) { g.rotation.x = Math.sin(ph * 1.3) * 0.05 * k; g.rotation.z = Math.sin(ph * 0.9 + 1) * 0.04 * k; }};
    // A flote: la línea de flotación queda en y = 0 aunque la escena coloque el objeto en el suelo.
    if (p.afloat) g.position.y = -draft;
    outer.userData.actions = g.userData.actions;
    outer.userData.size = {w: B, h: D + sheer, d: L};
    return outer;
  }

  F.gen = {human, hull, HEADWEAR, HAIR};
})();

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
    // La piel lleva un poco de luz propia: la cara se lee aunque la tape la visera o el ala del casco.
    const skinO = {outline: 0.05, extra: {emissive: skin, emissiveIntensity: 0.22}}, skinThin = {outline: 0.04, extra: {emissive: skin, emissiveIntensity: 0.22}};

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
    const hold = p.rifle === 'manos';
    if (p.rifle && !hold) {
      const rifle = new T.Group();
      rifle.add(F.at(F.box(0.5, H * 0.5, 0.7, p.rifle === true ? '#4a3626' : p.rifle, 0, {outline: 0.05}), 0, 0, 0));
      rifle.add(F.at(F.cyl(0.14, 0.14, H * 0.26, '#2a2a2c', 8, 0, {outline: 0}), 0, H * 0.34, 0.1));
      rifle.rotation.z = 0.55; rifle.position.set(0, torsoL * 0.55, -cr * 0.7 - (p.backpack ? shoulderW * 0.32 : 0.3)); spine.add(rifle);
    }

    // Cuello y cabeza.
    const neck = F.pivot(spine, 'cuello', 0, torsoL * 0.97, 0); J.cuello = neck;
    const neckMesh = F.cyl(headR * 0.36, headR * 0.42, neckL + headR * 0.3, skin, 12, (neckL + headR * 0.3) / 2, skinThin); neck.add(neckMesh);
    if (jacket || p.collar) { const collar = F.cyl(headR * 0.5, headR * 0.56, neckL * 0.7, jacket || top, 14, neckL * 0.3, thin); neck.add(collar); }
    const head = F.pivot(neck, 'cabeza', 0, neckL, 0); J.cabeza = head;
    const skull = ellipsoid(headR * 0.86, headR, headR * 0.92, skin, skinO); skull.position.y = headR; head.add(skull);
    const jaw = ellipsoid(headR * 0.66, headR * 0.5, headR * 0.7, skin, skinThin); jaw.position.set(0, headR * 0.6, headR * 0.12); head.add(jaw);
    const nose = F.cone(headR * 0.12, headR * 0.32, skin, 8, 0, {outline: 0.03, extra: skinO.extra}); nose.rotation.x = Math.PI / 2; nose.position.set(0, headR * 0.95, headR * 0.98); head.add(nose);
    for (const s of [-1, 1]) {
      const ear = ellipsoid(headR * 0.12, headR * 0.22, headR * 0.1, skin, skinThin); ear.position.set(s * headR * 0.86, headR * 1.0, 0); head.add(ear);
      const eye = F.sphere(headR * (style === 'chibi' ? 0.13 : 0.1), '#1a1614', 0, {outline: 0}); eye.position.set(s * headR * 0.33, headR * 1.1, headR * 0.86); head.add(eye);
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
      const visor = F.mesh(new T.CylinderGeometry(headR * 0.55, headR * 0.55, headR * 0.06, 18, 1, false, -Math.PI / 2, Math.PI), '#151515', {outline: 0.04}); visor.position.set(0, headR * 1.45, headR * 0.6); visor.rotation.x = 0.1; head.add(visor);
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
      sh.add(ellipsoid(limbR * 1.12, limbR * 1.04, limbR * 1.08, sleeve, thin));
      sh.add(limb(limbR * 1.08, limbR * 0.92, armL * 0.5, sleeve, thin));
      const el = F.pivot(sh, 'codo_' + side, 0, -armL * 0.5, 0); J['codo_' + side] = el;
      el.rotation.x = -0.12;
      el.add(limb(limbR * 0.9, limbR * 0.74, armL * 0.44, sleeve, thin));
      const cuff = F.cyl(limbR * 0.8, limbR * 0.8, limbR * 0.4, shade(sleeve, 0.8), 12, 0, {outline: 0}); cuff.position.y = -armL * 0.42; el.add(cuff);
      const hand = F.pivot(el, 'mano_' + side, 0, -armL * 0.46, 0); J['mano_' + side] = hand;
      const palm = ellipsoid(limbR * 0.62, limbR * 1.05, limbR * 0.36, p.gloves || skin, p.gloves ? thin : skinThin); palm.position.y = -limbR * 0.9; hand.add(palm);
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

    // Fusil sujeto con las dos manos, cruzado delante del pecho (la carrera ya no balancea los brazos).
    if (hold) {
      const rifle = new T.Group();
      const wood = typeof p.rifleColor === 'string' ? p.rifleColor : '#4a3626';
      rifle.add(F.at(F.box(H * 0.03, H * 0.05, H * 0.44, wood, 0, {outline: 0.04}), 0, 0, 0));
      const bar = F.cyl(H * 0.009, H * 0.009, H * 0.3, '#262628', 8, 0, {outline: 0}); bar.rotation.x = Math.PI / 2; bar.position.z = H * 0.35; rifle.add(bar);
      rifle.position.set(shoulderW * 0.05, torsoL * 0.5, cr * 1.05); rifle.rotation.set(-0.45, 0.55, 0.25); spine.add(rifle);
      J.hombro_der.rotation.x = -0.75; J.hombro_der.rotation.z += -0.3; J.hombro_izq.rotation.x = -1.0; J.hombro_izq.rotation.z += 0.45;
      J.codo_der.rotation.x = -1.2; J.codo_izq.rotation.x = -1.0;
    }
    // Acciones: ciclos que ponen la rotación de las articulaciones (fase en segundos, k = intensidad 0-1).
    const base = {};
    for (const [n, j] of Object.entries(J)) base[n] = {x: j.rotation.x, y: j.rotation.y, z: j.rotation.z, py: j.position.y};
    const set = (n, ax, v) => { J[n].rotation[ax] = base[n][ax] + v; };
    const gait = (ph, k, amp, lean, speed) => {
      const a = Math.sin(ph * speed);
      set('muslo_izq', 'x', -a * amp * k); set('muslo_der', 'x', a * amp * k);
      set('rodilla_izq', 'x', Math.max(0, a) * amp * 1.3 * k); set('rodilla_der', 'x', Math.max(0, -a) * amp * 1.3 * k);
      if (!hold) {
        set('hombro_izq', 'x', a * amp * 0.8 * k); set('hombro_der', 'x', -a * amp * 0.8 * k);
        set('codo_izq', 'x', -(0.3 + Math.max(0, a) * 0.5) * k); set('codo_der', 'x', -(0.3 + Math.max(0, -a) * 0.5) * k);
      } else { set('hombro_izq', 'x', Math.sin(ph * speed * 2) * 0.05 * k); set('hombro_der', 'x', Math.sin(ph * speed * 2) * 0.05 * k); }
      set('columna', 'x', lean * k);
      J.cadera.position.y = base.cadera.py + Math.abs(Math.cos(ph * speed)) * H * 0.012 * k;
    };
    root.userData.actions = {
      respirar(ph, k) { set('columna', 'x', Math.sin(ph * 1.6) * 0.02 * k); set('cabeza', 'y', Math.sin(ph * 0.4) * 0.08 * k); },
      andar(ph, k) { gait(ph, k, 0.45, 0.04, 6.2); },
      correr(ph, k) { gait(ph, k, 0.85, 0.22, 10); },
      correr_agachado(ph, k) { gait(ph, k, 0.7, 0.5, 10); set('cuello', 'x', -0.3 * k); },
      hablar(ph, k) { set('cabeza', 'x', Math.sin(ph * 2.3) * 0.06 * k); set('hombro_der', 'x', (-0.5 + Math.sin(ph * 1.7) * 0.25) * k); set('codo_der', 'x', (-0.9 + Math.sin(ph * 3.1) * 0.3) * k); },
      saludar(ph, k) { set('hombro_der', 'z', -2.6 * k); set('codo_der', 'z', Math.sin(ph * 7) * 0.4 * k); },
    };
    root.userData.size = {w: shoulderW * 1.3, h: H, d: H * 0.18};
    // Zancada de cada paso (la usa w.walk para que los pies no patinen): omega = rad/s del ciclo, stride = avance por ciclo.
    root.userData.gaits = {andar: {omega: 6.2, stride: H * 0.8}, correr: {omega: 10, stride: H * 1.4}, correr_agachado: {omega: 10, stride: H * 1.2}};
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
    // Colisionadores (el casco es cóncavo: lo que va dentro no choca con él) y máscara de agua en los cascos abiertos.
    {
      const inv = new T.MeshBasicMaterial({visible: false});
      const cbox = (w, h, d, x, y, z) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), inv); m.position.set(x, y, z); m.visible = false; m.userData.collider = true; g.add(m); return m; };
      const th = Math.max(0.6, B * 0.04);
      const cols = [cbox(th, D, L * 0.9, -B / 2 + th / 2, D / 2, 0), cbox(th, D, L * 0.9, B / 2 - th / 2, D / 2, 0), cbox(B * 0.9, Math.max(0.6, D * 0.12), L * 0.9, 0, D * 0.06, 0), cbox(B * 0.9, D, th, 0, D / 2, -L / 2 + th / 2)];
      if (p.deck) cols.push(cbox(B * 0.9, th, L * 0.9, 0, D - th / 2, 0));
      shell.userData.colliders = cols;
      if (!p.deck) {
        const shp = new T.Shape(); const pts = [];
        for (let i = 0; i <= N; i++) pts.push([halfW(i / N) * 0.98, -L / 2 + (i / N) * L]);
        shp.moveTo(-pts[0][0], pts[0][1]); for (const [x, z] of pts) shp.lineTo(-x, z); for (const [x, z] of pts.slice().reverse()) shp.lineTo(x, z);
        const mask = new T.Mesh(new T.ShapeGeometry(shp), new T.MeshBasicMaterial({colorWrite: false, side: T.DoubleSide}));
        mask.rotation.x = Math.PI / 2; mask.scale.y = -1; mask.position.y = D * 0.97; mask.renderOrder = 1; mask.userData.noCollide = true; mask.name = 'mascara_agua';
        g.add(mask);
      }
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


  /* ---------------------------------------------------------------- árboles y plantas */
  const ARBOLES = ['frondoso', 'abedul', 'pino', 'abeto', 'palmera', 'frutal', 'sauce', 'arbusto', 'cactus', 'seco'];
  /** Masa de hojas orgánica: icosaedro con los vértices desplazados (sin dos iguales), sombreado facetado. */
  const blob = (rad, color, r, o = {outline: 0.03}) => {
    const geo = new T.IcosahedronGeometry(rad, 1), p = geo.attributes.position, seen = new Map();
    for (let i = 0; i < p.count; i++) { const k = `${p.getX(i).toFixed(2)},${p.getY(i).toFixed(2)},${p.getZ(i).toFixed(2)}`; if (!seen.has(k)) seen.set(k, 0.82 + r() * 0.32); const f = seen.get(k); p.setXYZ(i, p.getX(i) * f, p.getY(i) * f * 0.92, p.getZ(i) * f); }
    geo.computeVertexNormals();
    return F.mesh(geo, color, {...o, extra: {flatShading: true}});
  };
  /**
   * Árbol o planta por especie. p: {especie: 'frondoso'|'abedul'|'pino'|'abeto'|'palmera'|'frutal'|'sauce'|'arbusto'|'cactus'|'seco',
   * altura (unidades; por defecto la típica de la especie), semilla, estacion: 'primavera'|'verano'|'otono'|'invierno',
   * hojas (color), corteza (color), fruta (color, para 'frutal'), detalle: 'bajo' (menos piezas, para decorados con cientos)}. Tronco curvado con ramas, copa de masas irregulares con
   * tres tonos, y la acción «viento» (la copa se mece). Base en y = 0.
   */
  function arbol(p = {}) {
    const esp = pick(p.especie, ARBOLES, 'frondoso'), r = K.rand(p.semilla ?? p.seed ?? 7), est = pick(p.estacion, ['primavera', 'verano', 'otono', 'invierno'], 'verano');
    const H = clamp(Number(p.altura) || {frondoso: 90, abedul: 110, pino: 140, abeto: 120, palmera: 120, frutal: 55, sauce: 85, arbusto: 18, cactus: 60, seco: 80}[esp], 4, 600);
    const bark = p.corteza || {abedul: '#e9e4da', palmera: '#8a7356', pino: '#6a4a34', abeto: '#5a4232', cactus: '#4f7a3e'}[esp] || '#5e4634';
    const leafBase = p.hojas || {pino: '#3f6a3a', abeto: '#2f5a3a', palmera: '#5f8a3e', sauce: '#7a9a4a', abedul: '#8aa24e', arbusto: '#5d7f45'}[esp] || '#5f8a45';
    const tones = est === 'otono' ? ['#c9822e', '#b5542a', '#d9a63a', '#8a6a2a'] : est === 'primavera' ? [shade(leafBase, 1.15), leafBase, '#e8b7c8'] : [shade(leafBase, 0.85), leafBase, shade(leafBase, 1.15)];
    const low = p.detalle === 'bajo';
    const bare = est === 'invierno' && !['pino', 'abeto', 'palmera', 'cactus'].includes(esp) || esp === 'seco';
    const g = new T.Group(), crown = F.pivot(g, 'copa', 0, 0, 0);
    crown.userData.noCollide = true;  // las copas pueden tocarse entre sí (como en un bosque); el tronco sí choca
    const tone = () => tones[Math.floor(r() * tones.length)];
    const bendX = (r() - 0.5) * H * 0.08, bendZ = (r() - 0.5) * H * 0.08;
    const trunk = (h, r0, pts = 6) => { const P = []; for (let i = 0; i <= pts; i++) { const u = i / pts; P.push([bendX * Math.sin(u * Math.PI * 0.8), u * h, bendZ * Math.sin(u * Math.PI * 0.8)]); } const t = F.tube(P, r0, bark, {seg: 24, radial: 9, o: {outline: 0.04, acabado: esp === 'abedul' ? null : 'madera', escala: 12}}); g.add(t); const foot = F.cone(r0 * 1.9, r0 * 2.2, shade(bark, 0.85), 9, r0 * 1.1, {outline: 0.04}); g.add(foot); return P; };
    const branch = (from, to, rad) => crown.add(F.tube([from, [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 + rad * 2, (from[2] + to[2]) / 2], to], rad, bark, {seg: 10, radial: 6, o: {outline: 0.04}}));
    if (esp === 'pino') {
      trunk(H * 0.86, H * 0.022);
      for (let i = 0; i < (low ? 3 : 5); i++) { const a = r() * Math.PI * 2, y = H * (0.7 + r() * 0.2), d = H * (0.08 + r() * 0.1), to = [Math.cos(a) * d + bendX, y + H * 0.04, Math.sin(a) * d + bendZ]; branch([bendX * 0.9, y - H * 0.06, bendZ * 0.9], to, H * 0.008); const b = blob(H * (0.08 + r() * 0.05), tone(), r); b.scale.y *= 0.45; b.position.set(...to); crown.add(b); }
      const top = blob(H * 0.12, tone(), r); top.scale.y *= 0.5; top.position.set(bendX, H * 0.9, bendZ); crown.add(top);
    } else if (esp === 'abeto') {
      trunk(H * 0.3, H * 0.025);
      const tiers = 6; for (let i = 0; i < tiers; i++) { const u = i / tiers, rad = H * 0.26 * (1 - u * 0.82), hh = H * 0.24; const c = F.cone(rad, hh, tone(), 9, 0, {outline: 0.03}); const cm = c.children[0]; const pp = cm.geometry.attributes.position; for (let k = 0; k < pp.count; k++) if (pp.getY(k) < 0) { const f = 0.85 + r() * 0.3; pp.setX(k, pp.getX(k) * f); pp.setZ(k, pp.getZ(k) * f); pp.setY(k, pp.getY(k) - r() * hh * 0.12); } cm.geometry.computeVertexNormals(); c.position.set(bendX * u, H * 0.18 + u * H * 0.66 + hh / 2, bendZ * u); c.rotation.y = r() * 3; crown.add(c); }
    } else if (esp === 'palmera') {
      const P = []; const lean = (r() - 0.5) * 0.5; for (let i = 0; i <= 8; i++) { const u = i / 8; P.push([Math.sin(u * 1.4) * H * 0.18 * lean * 2, u * H, Math.sin(u * 1.2) * H * 0.05]); }
      g.add(F.tube(P, H * 0.028, bark, {seg: 30, radial: 9, o: {outline: 0.04}}));
      for (let i = 1; i < 14; i++) { const q = P[Math.round((i / 14) * 8)]; const ring = F.cyl(H * 0.032, H * 0.032, H * 0.012, shade(bark, 0.8), 9, 0, {outline: 0}); ring.position.set(q[0], (i / 14) * H, q[2]); g.add(ring); }
      const tip = P[8]; crown.position.set(tip[0], tip[1], tip[2]);
      for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2 + r() * 0.3, L = H * (0.32 + r() * 0.1), pts = []; for (let k = 0; k <= 6; k++) { const u = k / 6; pts.push([Math.cos(a) * L * u, Math.sin(u * Math.PI * 0.7) * L * 0.25 - u * u * L * 0.45, Math.sin(a) * L * u]); }
        crown.add(F.tube(pts, H * 0.006, shade(leafBase, 0.8), {seg: 12, radial: 4, o: {outline: 0}}));
        for (let k = 1; k < 9; k++) { const u = k / 9, i0 = Math.floor(u * 6), q = pts[i0], len = L * 0.16 * Math.sin(u * Math.PI) + L * 0.04; for (const s of [-1, 1]) { const lf = F.box(len, H * 0.002, H * 0.02, k % 2 ? leafBase : shade(leafBase, 1.12), 0, {outline: 0}); lf.position.set(q[0] - Math.sin(a) * s * len / 2, q[1] - len * 0.15, q[2] + Math.cos(a) * s * len / 2); lf.rotation.y = -a + s * 0.0; lf.rotation.z = s * 0.35; crown.add(lf); } } }
      crown.add(F.sphere(H * 0.035, '#6a5a2a', 0, {outline: 0.03}));
    } else if (esp === 'cactus') {
      const R = H * 0.09; g.add(F.capsula(R, H - R * 2, bark, H / 2, {acabado: 'plastico'}));
      for (let i = 0; i < 2; i++) { const s = i ? -1 : 1, y = H * (0.35 + r() * 0.2), up = H * (0.25 + r() * 0.15); const arm = F.capsula(R * 0.7, up, bark, 0); arm.position.set(s * R * 2.4, y + up / 2 + R, 0); g.add(arm); const el = F.capsula(R * 0.7, R * 1.6, bark, 0); el.rotation.z = Math.PI / 2; el.position.set(s * R * 1.5, y, 0); g.add(el); }
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const rib = F.box(R * 0.12, H * 0.9, R * 0.12, shade(bark, 0.8), H * 0.48, {outline: 0}); rib.position.x = Math.cos(a) * R * 0.97; rib.position.z = Math.sin(a) * R * 0.97; g.add(rib); }
    } else if (esp === 'arbusto') {
      for (let i = 0; i < 6; i++) { const b = blob(H * (0.35 + r() * 0.2), tone(), r); b.position.set((r() - 0.5) * H * 0.9, H * (0.35 + r() * 0.3), (r() - 0.5) * H * 0.9); crown.add(b); }
    } else {
      // Frondosos (frondoso, abedul, frutal, sauce, seco): tronco, ramas principales y masas de hojas en sus puntas.
      const th = H * (esp === 'abedul' ? 0.62 : esp === 'frutal' ? 0.42 : 0.5), tr = H * (esp === 'abedul' ? 0.018 : 0.032);
      trunk(th, tr);
      if (esp === 'abedul') for (let i = 0; i < (low ? 4 : 9); i++) { const m = F.box(tr * 1.2, H * 0.012, tr * 0.5, '#2a2622', 0, {outline: 0}); const y = H * 0.06 + r() * th * 0.9, u = y / th; m.position.set(bendX * Math.sin(u * 2.5) + tr * 0.6, y, bendZ * Math.sin(u * 2.5)); m.rotation.y = r() * 3; g.add(m); }
      const nb = low ? 3 : esp === 'abedul' ? 4 : 6, tops = [];
      for (let i = 0; i < nb; i++) { const a = (i / nb) * Math.PI * 2 + r() * 0.6, y0 = th * (0.65 + r() * 0.3), spread = H * (esp === 'sauce' ? 0.3 : esp === 'frutal' ? 0.28 : 0.24) * (0.7 + r() * 0.5), to = [Math.cos(a) * spread + bendX, y0 + H * (0.18 + r() * 0.16), Math.sin(a) * spread + bendZ]; branch([bendX * 0.8, y0, bendZ * 0.8], to, tr * 0.45); tops.push(to); }
      tops.push([bendX, th + H * 0.3, bendZ]);
      if (!bare) for (const [x, y, z] of tops) for (let k = 0; k < (low ? 1 : esp === 'abedul' ? 2 : 3); k++) { const b = blob(H * (esp === 'abedul' ? 0.09 : 0.13) * (low ? 1.35 : 1) * (0.75 + r() * 0.5), tone(), r); b.position.set(x + (r() - 0.5) * H * 0.12, y + (r() - 0.4) * H * 0.1, z + (r() - 0.5) * H * 0.12); crown.add(b); }
      else for (const [x, y, z] of tops) for (let k = 0; k < 3; k++) { const a = r() * 6.28; branch([x, y, z], [x + Math.cos(a) * H * 0.1, y + H * 0.08, z + Math.sin(a) * H * 0.1], tr * 0.18); }
      if (esp === 'frutal' && !bare) for (let i = 0; i < 18; i++) { const [x, y, z] = tops[Math.floor(r() * tops.length)]; const f = F.sphere(H * 0.018, p.fruta || '#c8322a', 0, {outline: 0.02}); f.position.set(x + (r() - 0.5) * H * 0.22, y - H * 0.04 + (r() - 0.5) * H * 0.12, z + (r() - 0.5) * H * 0.22); crown.add(f); }
      if (esp === 'sauce' && !bare) for (const [x, y, z] of tops) for (let k = 0; k < 7; k++) { const a = r() * 6.28, d = H * 0.12, sx = x + Math.cos(a) * d, sz = z + Math.sin(a) * d; crown.add(F.tube([[sx, y, sz], [sx + Math.cos(a) * 2, y - H * 0.2, sz + Math.sin(a) * 2], [sx + Math.cos(a) * 3, y - H * 0.42, sz + Math.sin(a) * 3]], H * 0.006, tone(), {seg: 8, radial: 4, o: {outline: 0}})); }
    }
    g.userData.actions = {viento(ph, k) { crown.rotation.z = Math.sin(ph * 1.1 + 0.4) * 0.025 * k; crown.rotation.x = Math.sin(ph * 0.8) * 0.018 * k; }};
    g.userData.size = {w: H * 0.6, h: H, d: H * 0.6};
    return g;
  }

  /* ---------------------------------------------------------------- animales */
  // Medidas por especie (unidades; 10 = 1 m): L largo del tronco, R radio del tronco, P patas (hasta la cruz), C cuello,
  // Hd cabeza, S hocico, cola, color, y rasgos (orejas, cuernos, astas, lana, crin…).
  const CUADRUPEDOS = {
    perro: {L: 8.5, R: 1.85, P: 4.4, C: 2.4, Hd: 1.8, S: 1.6, cola: 3.2, color: '#a8784a', orejas: 'caidas', colaArriba: 0.6},
    gato: {L: 4.6, R: 1.4, P: 2.4, C: 1.1, Hd: 1.4, S: 0.5, cola: 4, color: '#8a8580', orejas: 'gato', colaArriba: 1.2},
    lobo: {L: 9, R: 2.5, P: 5.2, C: 2.6, Hd: 2.1, S: 1.8, cola: 4.2, color: '#7a7670', orejas: 'tiesas', colaArriba: -0.2},
    zorro: {L: 6, R: 1.7, P: 3.3, C: 1.8, Hd: 1.6, S: 1.6, cola: 4.8, color: '#c8642a', orejas: 'tiesas', colaArriba: 0, colaGruesa: true, punta: '#f0ece2'},
    caballo: {L: 17, R: 4.2, P: 9.5, C: 7.5, Hd: 3.2, S: 3.4, cola: 6, color: '#7a4a2a', orejas: 'tiesas', crin: true, cuello: 0.95, cascos: '#2a2420'},
    vaca: {L: 18, R: 5.2, P: 7.5, C: 3.5, Hd: 3.4, S: 3.2, cuello: 1.15, cola: 7, color: '#efeae0', orejas: 'laterales', cuernos: true, manchas: '#2a2624', ubre: true, cascos: '#2a2420'},
    ciervo: {L: 12, R: 3, P: 9, C: 5, Hd: 2.4, S: 2.2, cola: 1.6, color: '#9a6a3e', orejas: 'grandes', astas: true, cuello: 0.9, cascos: '#2a2420'},
    oveja: {L: 10, R: 3.8, P: 4.5, C: 2.2, Hd: 2.1, S: 1.4, cola: 1.5, color: '#f0ebe0', orejas: 'laterales', lana: true, cara: '#2a2624', cascos: '#2a2420'},
    cerdo: {L: 10, R: 3.6, P: 3.2, C: 1.2, Hd: 2.6, S: 1.2, cola: 1.6, color: '#e8a8a0', orejas: 'caidas', jeta: true, cascos: '#8a5a50'},
    oso: {L: 15, R: 5.2, P: 7, C: 3, Hd: 3.2, S: 2, cola: 1, color: '#5a3e2a', orejas: 'redondas', patasGruesas: true},
  };
  const AVES = {
    gallina: {L: 3.2, R: 1.6, P: 1.8, C: 1.6, Hd: 0.9, pico: 0.6, color: '#c8743a', cresta: '#d63a2a', ala: 3, cola: 'abanico'},
    pato: {L: 3.4, R: 1.4, P: 0.9, C: 1.6, Hd: 0.95, pico: 1.0, color: '#f0ebe0', ala: 3.5, picoColor: '#e8a03a', patas: '#e8a03a', picoPlano: true},
    paloma: {L: 2.6, R: 1.05, P: 0.8, C: 0.9, Hd: 0.7, pico: 0.4, color: '#8a909a', ala: 3.4},
    gaviota: {L: 3.4, R: 1.15, P: 1.2, C: 1.0, Hd: 0.8, pico: 0.8, color: '#f2f0ea', ala: 7, alaColor: '#9aa2aa', picoColor: '#e8b83a', patas: '#e8b83a'},
    aguila: {L: 5, R: 1.8, P: 1.6, C: 1.3, Hd: 1.1, pico: 0.9, color: '#5a3e28', ala: 10, cabezaColor: '#f0ebe0', picoColor: '#e8b83a', patas: '#e8b83a', ganchudo: true},
  };
  /**
   * Animal articulado por especie. Cuadrúpedos: perro, gato, lobo, zorro, caballo, vaca, ciervo, oveja, cerdo, oso.
   * Aves: gallina, pato, paloma, gaviota, aguila. p: {especie, escala (1 = adulto típico), color, color2 (manchas o crin)}.
   * Articulaciones: cuerpo, cuello, cabeza, cola y, por pata, hombro/cadera y rodilla (pata_di, pata_dd, pata_ti, pata_td y
   * rodilla_…); las aves, ala_izq/ala_der. Acciones: andar, correr, comer, mirar, respirar, cola (cuadrúpedos); andar,
   * picotear, aletear, volar (aves). Trae su zancada para w.walk. Patas en y = 0, frente hacia +z.
   */
  function animal(p = {}) {
    const esp = p.especie in AVES ? p.especie : pick(p.especie, Object.keys(CUADRUPEDOS), 'perro');
    const own = Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== null));  // lo no indicado no pisa la especie
    return esp in AVES ? ave({...AVES[esp], ...own, especie: esp}) : cuadrupedo({...CUADRUPEDOS[esp], ...own, especie: esp});
  }
  function cuadrupedo(d) {
    const s = Number(d.escala) || 1, L = d.L * s, R = d.R * s, P = d.P * s, Hd = d.Hd * s, col = d.color, dark = shade(col, 0.72), o = {outline: 0.04, acabado: d.lana ? 'tela' : null, escala: 3};
    const root = new T.Group(), body = F.pivot(root, 'cuerpo', 0, P, 0);
    // Tronco: pecho y cuartos traseros algo más anchos que la barriga.
    const torso = F.mesh(new T.CapsuleGeometry(R, L - R * 2, 8, 16), col, o); torso.rotation.x = Math.PI / 2; torso.scale.set(d.lana ? 1.15 : 0.92, 1, d.lana ? 1.1 : 1); body.add(torso);
    const chest = ellipsoid(R * 1.05, R * 1.08, R * 1.1, col, o); chest.position.set(0, R * 0.05, L * 0.3); body.add(chest);
    const haunch = ellipsoid(R * 1.0, R * 1.05, R * 1.05, col, o); haunch.position.set(0, R * 0.08, -L * 0.3); body.add(haunch);
    if (d.lana) for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, b = ellipsoid(R * 0.5, R * 0.45, R * 0.5, shade(col, 0.95 + (i % 3) * 0.04), {outline: 0.03}); b.position.set(Math.cos(a) * R * 0.85, Math.sin(a) * R * 0.75 + R * 0.15, ((i % 5) - 2) * L * 0.16); body.add(b); }
    if (d.manchas) for (let i = 0; i < 7; i++) { const m = ellipsoid(R * (0.35 + (i % 3) * 0.1), R * 0.3, R * 0.45, d.color2 || d.manchas, {outline: 0}); const a = -0.6 + (i % 4) * 0.5; m.position.set((i % 2 ? 1 : -1) * R * 0.88 * Math.cos(a), R * Math.sin(a) * 0.6 + R * 0.2, (i - 3) * L * 0.11); m.scale.x *= 0.35; body.add(m); }
    if (d.ubre) { const u = ellipsoid(R * 0.4, R * 0.3, R * 0.4, '#e8b0a8', {outline: 0.03}); u.position.set(0, -R * 0.95, -L * 0.18); body.add(u); }
    // Patas: muslo y caña con rodilla, pezuña o zarpa.
    const legR = R * (d.patasGruesas ? 0.42 : 0.3), legs = {};
    for (const [name, z, x] of [['pata_di', L * 0.36, -R * 0.55], ['pata_dd', L * 0.36, R * 0.55], ['pata_ti', -L * 0.36, -R * 0.55], ['pata_td', -L * 0.36, R * 0.55]]) {
      const hip = F.pivot(body, name, x, -R * 0.2, z), up = P * 0.52, lo = P - R * 0.2 - up;
      hip.add(limb(legR * 1.15, legR * 0.85, up, col, o));
      const knee = F.pivot(hip, 'rodilla_' + name.slice(5), 0, -up, 0); knee.add(limb(legR * 0.8, legR * 0.62, lo, d.cara && false ? dark : col, o));
      const foot = d.cascos ? F.cyl(legR * 0.75, legR * 0.85, legR * 0.9, d.cascos, 10, -lo + legR * 0.4, {outline: 0.03}) : ellipsoid(legR * 0.85, legR * 0.5, legR * 1.15, shade(col, 0.9), {outline: 0.03});
      if (!d.cascos) foot.position.set(0, -lo + legR * 0.4, legR * 0.3); knee.add(foot); legs[name] = {hip, knee};
    }
    // Cuello y cabeza.
    const neck = F.pivot(body, 'cuello', 0, R * 0.45, L * 0.42), nl = d.C * s, na = -(d.cuello ?? 0.7);
    const nm = F.mesh(new T.CapsuleGeometry(R * 0.5, nl, 6, 12), d.crin ? col : col, o); nm.position.set(0, Math.cos(na) * nl * 0.5 + R * 0.1, -Math.sin(na) * nl * 0.5); nm.rotation.x = -na; neck.add(nm);
    if (d.crin) for (let i = 0; i < 7; i++) { const c = F.box(R * 0.18, R * 0.55, nl * 0.16, d.color2 || '#2a1e16', 0, {outline: 0.02}); const u = i / 6; c.position.set(0, Math.cos(na) * nl * u + R * 0.55, -Math.sin(na) * nl * u - R * 0.2); c.rotation.x = -na; neck.add(c); }
    const head = F.pivot(neck, 'cabeza', 0, Math.cos(na) * nl + R * 0.3, -Math.sin(na) * nl + R * 0.1);
    const skull = ellipsoid(Hd * 0.7, Hd * 0.72, Hd * 0.85, d.cara || col, o); head.add(skull);
    const snout = F.mesh(new T.CapsuleGeometry(Hd * 0.42, Math.max(0.1, d.S * s), 6, 12), d.cara || col, o); snout.rotation.x = Math.PI / 2 + 0.25; snout.position.set(0, -Hd * 0.18, Hd * 0.55 + d.S * s * 0.45); head.add(snout);
    const nose = d.jeta ? F.cyl(Hd * 0.36, Hd * 0.36, Hd * 0.2, shade(col, 0.85), 14, 0, {outline: 0.03}) : ellipsoid(Hd * 0.2, Hd * 0.16, Hd * 0.14, '#1e1a18', {outline: 0}); if (d.jeta) nose.rotation.x = Math.PI / 2; nose.position.set(0, -Hd * 0.08, Hd * 0.62 + d.S * s * 1.0); head.add(nose);
    for (const sx of [-1, 1]) {
      const eye = F.sphere(Hd * 0.11, '#141210', 0, {outline: 0}); eye.position.set(sx * Hd * 0.42, Hd * 0.18, Hd * 0.55); head.add(eye);
      const glint = F.sphere(Hd * 0.035, '#ffffff', 0, {outline: 0}); glint.position.set(sx * Hd * 0.45, Hd * 0.23, Hd * 0.63); head.add(glint);
      const ear = d.orejas === 'caidas' ? ellipsoid(Hd * 0.18, Hd * 0.48, Hd * 0.32, dark, {outline: 0.03}) : d.orejas === 'redondas' ? F.sphere(Hd * 0.24, dark, 0, {outline: 0.03}) : F.cone(Hd * (d.orejas === 'grandes' ? 0.3 : 0.22), Hd * (d.orejas === 'grandes' ? 0.75 : d.orejas === 'gato' ? 0.5 : 0.6), d.orejas === 'laterales' ? col : dark, 8, 0, {outline: 0.03});
      if (d.orejas === 'caidas') ear.position.set(sx * Hd * 0.6, -Hd * 0.05, -Hd * 0.1); else if (d.orejas === 'laterales') { ear.position.set(sx * Hd * 0.85, Hd * 0.25, -Hd * 0.1); ear.rotation.z = -sx * 1.4; } else { ear.position.set(sx * Hd * 0.42, Hd * 0.75, -Hd * 0.15); ear.rotation.z = -sx * 0.25; }
      head.add(ear);
      if (d.cuernos) { const h = F.tube([[sx * Hd * 0.45, Hd * 0.55, -Hd * 0.2], [sx * Hd * 0.95, Hd * 0.75, -Hd * 0.1], [sx * Hd * 1.05, Hd * 1.05, Hd * 0.05]], Hd * 0.09, '#e8e0cc', {seg: 8, radial: 6, o: {outline: 0.03}}); head.add(h); }
      if (d.astas) { const base = [sx * Hd * 0.35, Hd * 0.65, -Hd * 0.1]; const pts = [base, [sx * Hd * 0.9, Hd * 1.6, -Hd * 0.3], [sx * Hd * 1.3, Hd * 2.6, -Hd * 0.1], [sx * Hd * 1.2, Hd * 3.4, Hd * 0.3]]; head.add(F.tube(pts, Hd * 0.07, '#d8c8a8', {seg: 12, radial: 5, o: {outline: 0.03}})); for (const k of [1, 2]) head.add(F.tube([pts[k], [pts[k][0] + sx * Hd * 0.1, pts[k][1] + Hd * 0.9, pts[k][2] + Hd * 0.5]], Hd * 0.05, '#d8c8a8', {seg: 6, radial: 5, o: {outline: 0.03}})); }
    }
    // Cola.
    const tail = F.pivot(body, 'cola', 0, R * 0.55, -L * 0.48), tl = d.cola * s, ta = 0.9 - (d.colaArriba ?? 0.4);
    const tm = d.colaGruesa ? ellipsoid(R * 0.38, tl * 0.5, R * 0.38, col, o) : F.mesh(new T.CapsuleGeometry(R * (d.lana ? 0.25 : 0.14), tl, 4, 8), col, o);
    tm.position.set(0, -Math.cos(ta) * tl * 0.5, -Math.sin(ta) * tl * 0.5); tm.rotation.x = -ta + (d.colaGruesa ? 0 : 0); if (d.colaGruesa) tm.rotation.x = -ta; tail.add(tm);
    if (d.punta) { const pt = F.sphere(R * 0.3, d.punta, 0, {outline: 0.02}); pt.position.set(0, -Math.cos(ta) * tl * 0.98, -Math.sin(ta) * tl * 0.98); tail.add(pt); }
    // Acciones.
    // Paso en diagonal: delantera izquierda con trasera derecha y viceversa; la rodilla se dobla cuando la pata vuelve.
    const swing = (ph, k, amp, speed) => {
      for (const [n, l] of Object.entries(legs)) {
        const a = Math.sin(ph * speed + (n === 'pata_di' || n === 'pata_td' ? 0 : Math.PI)), front = n.startsWith('pata_d');
        l.hip.rotation.x = a * amp * k;
        l.knee.rotation.x = (front ? -1 : 1) * Math.max(0, front ? a : -a) * amp * 1.3 * k;
      }
      body.position.y = P + Math.abs(Math.cos(ph * speed)) * P * 0.03 * k; tail.rotation.z = Math.sin(ph * speed * 0.5) * 0.25 * k;
    };
    root.userData.actions = {
      andar(ph, k) { swing(ph, k, 0.38, 5.5); head.rotation.x = Math.sin(ph * 11) * 0.04 * k; },
      correr(ph, k) { swing(ph, k, 0.75, 9); body.rotation.x = Math.sin(ph * 9) * 0.06 * k; },
      comer(ph, k) { neck.rotation.x = 0.9 * k; head.rotation.x = (0.3 + Math.sin(ph * 4) * 0.08) * k; },
      mirar(ph, k) { neck.rotation.y = Math.sin(ph * 0.8) * 0.5 * k; head.rotation.y = Math.sin(ph * 0.8) * 0.3 * k; },
      respirar(ph, k) { torso.scale.y = 1 + Math.sin(ph * 2.2) * 0.02 * k; tail.rotation.z = Math.sin(ph * 1.3) * 0.15 * k; },
      cola(ph, k) { tail.rotation.z = Math.sin(ph * 12) * 0.5 * k; },
    };
    root.userData.gaits = {andar: {omega: 5.5, stride: P * 1.1}, correr: {omega: 9, stride: P * 2.6}};
    root.userData.size = {w: R * 2.2, h: P + R + Hd * 2, d: L + nl + d.S * s + tl * 0.5};
    return root;
  }
  function ave(d) {
    const s = Number(d.escala) || 1, L = d.L * s, R = d.R * s, P = d.P * s, Hd = d.Hd * s, col = d.color, o = {outline: 0.04};
    const root = new T.Group(), body = F.pivot(root, 'cuerpo', 0, P + R * 0.8, 0);
    const torso = ellipsoid(R, R * 0.95, L * 0.5, col, o); torso.rotation.x = -0.25; body.add(torso);
    const neck = F.pivot(body, 'cuello', 0, R * 0.5, L * 0.32); const nm = F.mesh(new T.CapsuleGeometry(R * 0.38, d.C * s, 4, 10), col, o); nm.position.y = d.C * s * 0.5; nm.rotation.x = 0.25; neck.add(nm);
    const head = F.pivot(neck, 'cabeza', 0, d.C * s + Hd * 0.3, Hd * 0.2); head.add(ellipsoid(Hd, Hd, Hd * 1.1, d.cabezaColor || col, o));
    const beakL = d.pico * s;
    const beak = d.picoPlano ? ellipsoid(Hd * 0.45, Hd * 0.18, beakL * 0.6, d.picoColor || '#e8a03a', {outline: 0.03}) : F.cone(Hd * 0.32, beakL, d.picoColor || '#c8a03a', 8, 0, {outline: 0.03}); if (!d.picoPlano) beak.rotation.x = Math.PI / 2 + (d.ganchudo ? 0.35 : 0.1); beak.position.set(0, -Hd * 0.1, Hd * 0.95 + beakL * 0.45); head.add(beak);
    for (const sx of [-1, 1]) { const e = F.sphere(Hd * 0.16, '#141210', 0, {outline: 0}); e.position.set(sx * Hd * 0.62, Hd * 0.25, Hd * 0.45); head.add(e); }
    if (d.cresta) for (let i = 0; i < 3; i++) { const c = F.sphere(Hd * 0.28, d.cresta, 0, {outline: 0.02}); c.position.set(0, Hd * (0.95 + (i === 1 ? 0.15 : 0)), Hd * (0.4 - i * 0.35)); head.add(c); }
    if (d.cresta) { const w = ellipsoid(Hd * 0.18, Hd * 0.32, Hd * 0.18, d.cresta, {outline: 0.02}); w.position.set(0, -Hd * 0.65, Hd * 0.75); head.add(w); }
    // Alas plegadas (pivotes para aletear y volar).
    const wings = {};
    for (const [name, sx] of [['ala_izq', -1], ['ala_der', 1]]) {
      const w = F.pivot(body, name, sx * R * 0.85, R * 0.35, L * 0.1), span = d.ala * s;
      const shape = [[0, 0], [sx * span, -L * 0.15], [sx * span * 0.75, -L * 0.45], [sx * span * 0.2, -L * 0.6], [0, -L * 0.45]];
      const wm = F.extrude(shape.map(([x, z]) => [x, z]), R * 0.18, d.alaColor || shade(col, 0.85), {bevel: R * 0.05, o: {outline: 0.03}}); wm.rotation.x = Math.PI / 2; w.add(wm);
      w.rotation.set(0, sx * 1.4, -sx * 0.12); wings[name] = {w, sx};
    }
    // Cola.
    const tail = F.pivot(body, 'cola', 0, R * 0.2, -L * 0.45);
    if (d.cola === 'abanico') for (let i = 0; i < 5; i++) { const f = ellipsoid(R * 0.18, R * 0.9, R * 0.3, i % 2 ? shade(col, 0.6) : '#2a3a2a', {outline: 0.02}); f.position.set((i - 2) * R * 0.22, R * 0.6, -R * 0.2); f.rotation.z = (i - 2) * 0.25; f.rotation.x = -0.5; tail.add(f); }
    else { const tf = F.extrude([[-R * 0.5, 0], [R * 0.5, 0], [R * 0.7, -L * 0.4], [-R * 0.7, -L * 0.4]], R * 0.12, shade(col, 0.85), {o: {outline: 0.03}}); tf.rotation.x = Math.PI / 2 - 0.2; tail.add(tf); }
    // Patas finas con dedos.
    const legs = {};
    for (const [name, sx] of [['pata_i', -1], ['pata_d', 1]]) {
      const hip = F.pivot(body, name, sx * R * 0.4, -R * 0.6, 0); hip.add(limb(R * 0.12, R * 0.1, P + R * 0.2, d.patas || '#c8a03a', {outline: 0.02}));
      for (const a of [-0.5, 0, 0.5]) { const toe = F.box(R * 0.08, R * 0.06, Hd * 0.9, d.patas || '#c8a03a', 0, {outline: 0}); toe.position.set(Math.sin(a) * Hd * 0.3, -(P + R * 0.2) + R * 0.03, Math.cos(a) * Hd * 0.35); toe.rotation.y = a; hip.add(toe); }
      legs[name] = hip;
    }
    // Plegadas: la envergadura apunta hacia atrás. Al aletear o volar se abren (giro en y) y baten (giro en z).
    const flap = (ph, k, amp, speed, open = 1) => { for (const {w, sx} of Object.values(wings)) { w.rotation.y = sx * 1.4 * (1 - open * k); w.rotation.z = sx * (Math.sin(ph * speed) * amp - 0.12) * k - sx * 0.12 * (1 - k); } };
    root.userData.actions = {
      andar(ph, k) { const a = Math.sin(ph * 8); legs.pata_i.rotation.x = a * 0.5 * k; legs.pata_d.rotation.x = -a * 0.5 * k; neck.position.z = L * 0.32 + Math.sin(ph * 16) * R * 0.15 * k; },
      picotear(ph, k) { const u = Math.max(0, Math.sin(ph * 4)); neck.rotation.x = u * 1.1 * k; },
      aletear(ph, k) { flap(ph, k, 0.7, 14, 0.75); },
      volar(ph, k) { flap(ph, k, 1.1, 9); legs.pata_i.rotation.x = -0.9 * k; legs.pata_d.rotation.x = -0.9 * k; body.position.y = P + R * 0.8 + Math.sin(ph * 9) * R * 0.15 * k; },
    };
    root.userData.gaits = {andar: {omega: 8, stride: P * 0.9}};
    root.userData.size = {w: R * 2 + d.ala * s * 0.3, h: P + R * 2 + d.C * s + Hd * 2, d: L + beakL};
    return root;
  }

  F.gen = {human, hull, arbol, animal, HEADWEAR, HAIR, ARBOLES, ANIMALES: [...Object.keys(CUADRUPEDOS), ...Object.keys(AVES)]};
})();

// Prueba: w.scatter de obstáculos, personas con w.walk que los cruzan corriendo y andando (sin atravesarlos ni patinar),
// w.formation de avionetas en V (sin solaparse) e impactos 'columna' con sacudida.
const w = K.world3d(root, T0, T1, {ground: 'none', sky: 'dia', exposure: 1.2, terrain: {coast: {z: 900, beach: 300, bluff: 10, bluffWidth: 100}, z: 0, size: 1600, roughness: 4, colors: {sand: '#d2bb8f', grass: '#7c9450', rock: '#8a8578', wet: '#a08a66'}}});
w.scatter('obstaculo', 22, {x: 0, z: -40, w: 260, d: 140}, {seed: 4});
const gente = [];
for (let i = 0; i < 8; i++) {
  const p = w.add('persona', {x: -110 + i * 30, z: 60}, {rotate: 180, color: ['#4a6a8a', '#8a4a4a', '#5a7a4a', '#7a6a4a'][i % 4]});
  w.walk(p, [{x: -110 + i * 30, z: 60}, {x: -100 + i * 28, z: -150}], T0 + 0.2 + (i % 3) * 0.3, {paso: i % 2 ? 'correr' : 'andar'});
  gente.push(p);
}
const v = w.formation('avioneta', 5, {x: -400, z: -60}, {tipo: 'V', rotate: 90, y: 160});
v.forEach((o) => { w.act(o, 'volar', T0, T1); K.tl.add(o.position, {x: [o.position.x, o.position.x + 700], duration: K.ms(T1 - T0), ease: 'linear'}, K.ms(T0)); });
for (let i = 0; i < 4; i++) w.fx('columna', {x: -120 + i * 80, z: -200 - (i % 2) * 40}, T0 + 1 + i * 0.7, T0 + 1 + i * 0.7, {size: 2.2, shake: 0.6, seed: 9 + i});
w.shot(T0, {x: 0, z: -40}, {dist: 420, pitch: 22, yaw: 0, h: 10});
w.shot(T0 + 0.1, {x: 0, z: -60}, {dist: 360, pitch: 18, yaw: 12, h: 12, dur: T1 - T0 - 0.2, ease: 'linear'});

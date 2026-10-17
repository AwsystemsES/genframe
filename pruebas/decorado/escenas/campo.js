// Prueba: decoración de campo alrededor de unas personas (hierba con matices, parcelas, camino, vallas, árboles, lomas).
const w = K.world3d(root, T0, T1, {ground: 'none', sky: 'dia', exposure: 1.2});
w.scatter('persona', 6, {x: 0, z: 0, w: 80, d: 40}, {seed: 5});
w.decorar('campo', {radio: 1500, seed: 4});
w.shot(T0, {x: 0, z: 0}, {dist: 380, pitch: 18, yaw: 0, h: 20});
w.shot(T0 + 0.1, {x: 0, z: 0}, {dist: 320, pitch: 15, yaw: 20, h: 20, dur: T1 - T0, ease: 'linear'});

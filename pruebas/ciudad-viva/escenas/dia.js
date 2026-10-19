// Prueba: ciudad viva de día. Alrededor de un edificio y un grupo de gente, la decoración debe poner calles con tráfico que
// circula sin chocar, coches aparcados, semáforos, peatones que andan por las aceras y edificios de fondo variados.
const w = K.world3d(root, T0, T1, {ground: 'none', sky: 'dia', exposure: 1.2});
w.add('edificio', {x: 0, z: -220}, {altura: 420});
w.scatter('persona', 6, {x: 0, z: 0, w: 120, d: 60}, {seed: 3});
w.decorar('ciudad', {epoca: 'moderna', radio: 1400, seed: 12});
w.shot(T0, {x: 0, z: 0}, {dist: 520, pitch: 14, yaw: 35, h: 30});
w.shot(T0 + 0.1, {x: 0, z: -20}, {dist: 440, pitch: 12, yaw: 55, h: 30, dur: T1 - T0, ease: 'linear'});

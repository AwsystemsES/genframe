// Prueba: mar abierto visto desde muy lejos y desde cerca. El agua debe llegar hasta el horizonte (sin borde ni fondo oscuro),
// sin un patrón de manchas que se repita, y la espuma de la línea de flotación debe seguir la forma de cada casco.
const w = K.world3d(root, T0, T1, {ground: 'none', sky: 'dia', exposure: 1.2, ocean: {waves: 5, length: 260, choppy: 1.1, color: '#2b4a63', foamLevel: 0.7}});
const bs = w.formation('barco', 3, {x: 0, z: 0}, {tipo: 'fila', rotate: 90, separacion: 1.6});
bs.forEach((b) => w.float(b, {maxPitch: 3, maxRoll: 3}));
w.shot(T0, {x: 0, z: 0}, {dist: 2600, pitch: 12, yaw: 30, h: 10});
w.shot(T0 + 0.1, {x: 0, z: 0}, {dist: 260, pitch: 14, yaw: 60, h: 10, dur: T1 - T0 - 0.2, ease: 'inOutSine'});

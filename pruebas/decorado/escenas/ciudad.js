// Prueba: decoración de ciudad moderna alrededor de dos edificios y un grupo de gente (calles, aceras, pasos de cebra,
// raya discontinua, farolas actuales, árboles, mobiliario y manzanas al fondo). No debe quedar suelo vacío.
const w = K.world3d(root, T0, T1, {ground: 'none', sky: 'dia', exposure: 1.2});
w.add('edificio', {x: -160, z: -200}, {altura: 500}); w.add('edificio', {x: 200, z: -260}, {altura: 700, color: '#b0a698'});
w.scatter('persona', 10, {x: 0, z: 40, w: 160, d: 80}, {seed: 2});
w.decorar('ciudad', {epoca: 'moderna', radio: 1400, seed: 8});
w.shot(T0, {x: 0, z: 0}, {dist: 420, pitch: 24, yaw: 20, h: 20});
w.shot(T0 + 0.1, {x: 0, z: -20}, {dist: 360, pitch: 20, yaw: 30, h: 20, dur: T1 - T0, ease: 'linear'});

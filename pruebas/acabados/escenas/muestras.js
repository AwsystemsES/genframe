// Prueba: acabados con textura y relieve a escala real, formas redondeadas y rótulos que nunca se cortan. Un rótulo
// imposible debe salir avisado («rótulo … demasiado pequeña») sin cortarse.
const w = K.world3d(root, T0, T1, {ground: 'none', sky: 'dia', exposure: 1.2});
const m = w.add('muestrario', {x: 0, z: 0});
w.decorar('interior', {radio: 420, seed: 3});
w.shot(T0, {x: 0, z: -20}, {dist: 330, pitch: 14, yaw: 0, h: 40});
w.shot(T0 + 0.1, {x: 0, z: -20}, {dist: 260, pitch: 12, yaw: 18, h: 40, dur: T1 - T0 - 0.2, ease: 'linear'});

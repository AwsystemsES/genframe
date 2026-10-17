// Prueba: tormenta con olas grandes; dos barcos flotando (uno navega y deja estela); cámara baja que no debe meterse en el agua.
const w = K.world3d(root, T0, T1, {ground: 'none', sky: 'tormenta', exposure: 1.45, ocean: {waves: 24, length: 170, choppy: 2.0, color: '#22435c', crest: '#5f849c', foamLevel: 0.55}, clouds: {amount: 0.8, dark: true, height: 260, size: 420}});
const a = w.add('barco', {x: 0, z: 0}, {rotate: 200}); w.float(a);
const b = w.add('barco', {x: -120, z: -160}, {rotate: 90}); w.float(b);
w.move(b, T0, {x: 160, z: -160}, T1 - T0, 'linear');
w.shot(T0, {x: 0, z: 0}, {dist: 120, pitch: 4, yaw: 120, h: 6});
w.shot(T0 + 0.1, {x: -20, z: -60}, {dist: 200, pitch: 3, yaw: 160, h: 8, dur: T1 - T0 - 0.2, ease: 'linear'});
K.title(root, 'TORMENTA', {});

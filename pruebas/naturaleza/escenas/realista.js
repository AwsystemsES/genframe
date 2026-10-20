// Prueba: el mismo campo con aspecto «realista» (materiales físicos que reflejan el cielo) y cielo físico al atardecer.
const w = K.world3d(root, T0, T1, {ground: 'none', sky: 'atardecer', look: 'realista', exposure: 1.15});
const vacas = w.formation('animal', 3, {x: 0, z: -30}, {tipo: 'fila', rotate: -60, separacion: 1.8, params: () => ({especie: 'vaca'})});
vacas.forEach((v, i) => w.act(v, i === 1 ? 'mirar' : 'comer', T0, T1));
const ciervo = w.add('animal', {x: 110, z: -120}, {especie: 'ciervo', rotate: -90});
w.act(ciervo, 'mirar', T0, T1);
['pino', 'abedul', 'frondoso'].forEach((esp, i) => w.add('arbol', {x: -160 + i * 40, z: -160 - i * 30}, {especie: esp, semilla: i + 2}));
w.decorar('campo', {radio: 1200, seed: 8});
w.shot(T0, {x: 0, z: -40}, {dist: 260, pitch: 10, yaw: -30, h: 14});
w.shot(T0 + 0.1, {x: 0, z: -40}, {dist: 220, pitch: 9, yaw: -10, h: 14, dur: T1 - T0 - 0.2, ease: 'linear'});

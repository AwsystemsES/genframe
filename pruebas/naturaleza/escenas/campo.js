// Prueba: campo vivo con aspecto de cómic. Árboles del generador (decorado), hierba alta instanciada que se mece, caballos
// que pastan, ovejas, gallinas que picotean y un perro que cruza andando con su zancada. Posprocesado: oclusión ambiental,
// supermuestreo, resplandor y etalonaje.
const w = K.world3d(root, T0, T1, {ground: 'none', sky: 'dia', exposure: 1.2});
const caballos = w.formation('animal', 2, {x: -60, z: -40}, {tipo: 'fila', rotate: 30, params: () => ({especie: 'caballo'})});
caballos.forEach((c) => w.act(c, 'comer', T0, T1));
const ovejas = w.scatter('animal', 5, {x: 70, z: -30, w: 90, d: 60}, {seed: 4, params: () => ({especie: 'oveja'})});
ovejas.forEach((o, i) => w.act(o, i % 2 ? 'comer' : 'mirar', T0, T1));
const gallinas = w.scatter('animal', 4, {x: 0, z: 50, w: 50, d: 30}, {seed: 6, params: () => ({especie: 'gallina'})});
gallinas.forEach((g) => w.act(g, 'picotear', T0, T1));
const perro = w.add('animal', {x: -120, z: 80}, {especie: 'perro'});
w.walk(perro, [{x: -120, z: 80}, {x: 120, z: 90}], T0, {paso: 'andar'});
w.add('arbol', {x: 30, z: -140}, {especie: 'frondoso', semilla: 9});
w.decorar('campo', {radio: 1200, seed: 21});
w.shot(T0, {x: 0, z: 0}, {dist: 300, pitch: 14, yaw: 20, h: 12});
w.shot(T0 + 0.1, {x: 0, z: 0}, {dist: 240, pitch: 12, yaw: 40, h: 12, dur: T1 - T0 - 0.2, ease: 'linear'});

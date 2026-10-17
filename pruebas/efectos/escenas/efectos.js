// Prueba: fogonazo anclado a la boca de un cañón que gira (con luz y profundidad), humo iluminado, impacto en el objetivo,
// persona que señala el objetivo con w.point y lo mira con w.look.
const w = K.world3d(root, T0, T1, {ground: 'none', sky: 'dia', exposure: 1.2});
const c = w.add('canon', {x: 0, z: 0}, {rotate: 30});
const objetivo = w.add('obstaculo', {x: 160, z: 260}, {seed: 3});
const per = w.add('persona', {x: -40, z: 20}, {rotate: 40, casco: true});
K.tl.add(c.rotation, {y: [c.rotation.y, c.rotation.y + 0.25], duration: K.ms(T1 - T0), ease: 'inOutSine'}, K.ms(T0));
w.fx('fogonazo', c.userData.joints.boca, T0 + 0.5, T1, {cada: 0.5, size: 1.4, shake: 0.4});
w.fx('smoke', {x: 0, z: 50, y: 14}, T0 + 0.6, T1, {size: 1.4, n: 24, wind: 0.6});
w.fx('columna', objetivo, T0 + 1.2, T1, {cada: 1.5, size: 1.6, material: 'tierra'});
w.point(per, T0 + 0.8, objetivo, {brazo: 'der'});
w.look(per, T0 + 0.6, objetivo);
w.frame(T0, [c, per], {shot: 'conjunto', angle: 'tres_cuartos'});
w.frame(T0 + 2, [c, per], {shot: 'medio', angle: 'tres_cuartos', dur: 2});
w.frame(T0 + 4.5, [per, objetivo], {shot: 'general', angle: 'espalda', dur: 1.5});
K.title(root, 'FUEGO', {});

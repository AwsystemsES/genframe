// Prueba: título demasiado largo (debe encogerse hasta caber en la zona segura), mapa a sangre (sin bordes rectos) y
// rótulos de seis ciudades muy cercanas colocados sin solaparse, con línea guía.
K.box(root, 0, 0, {w: K.W, h: K.H, style: {background: '#14202c'}});
const m = K.map.world(root, {x: 0, y: 420, w: K.W, h: 900, projection: 'mercator', focus: [[2.6, 49.4], [6.4, 52.5]], fill: '#3d566b', stroke: '#9fb2c0', strokeWidth: 2});
K.anim(m.svg, T0, {scale: [1, 1.12]}, T1 - T0, 'linear');
K.title(root, 'INTERNACIONALIZACIÓN', {size: 150});
K.map.labels(m, [
  {text: 'ÁMSTERDAM', ll: [4.90, 52.37]}, {text: 'LA HAYA', ll: [4.30, 52.08]}, {text: 'RÓTERDAM', ll: [4.48, 51.92]},
  {text: 'AMBERES', ll: [4.40, 51.22]}, {text: 'BRUSELAS', ll: [4.35, 50.85]}, {text: 'LUXEMBURGO', ll: [6.13, 49.61]},
], {t: T0 + 0.5, stagger: 0.3});

// Prueba de capas: escena 43 de 60 con fondo opaco a pantalla completa. Los subtítulos, la capa común y la viñeta
// tienen que verse encima en todas (antes, desde la escena 51 la escena los tapaba).
K.box(root, 0, 0, {w: K.W, h: K.H, style: {background: '#4a3f2a'}});
const t = K.title(root, '43', {y: 380, size: 220, color: K.palette.ink});
K.show(t, T0 + 0.05, {from: {scale: 0.9}, dur: 0.3});
K.anim(root, T0, {scale: [1, 1.04]}, T1 - T0, 'linear');

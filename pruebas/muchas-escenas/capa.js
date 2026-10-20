// Capa común: etiqueta fija arriba a la izquierda durante todo el vídeo (debe verse encima de todas las escenas).
const b = K.box(root, 60, 50, {w: 360, h: 70, cls: 'label', html: 'CAPA COMÚN', style: {fontSize: '34px', lineHeight: '70px', textAlign: 'center', color: '#13233a', background: '#f2a93b', borderRadius: '10px'}});
K.show(b, 0.1, {dur: 0.3});

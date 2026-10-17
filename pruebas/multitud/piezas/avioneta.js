// Avioneta genérica de prueba (≈9 m de largo, 12 m de envergadura). Acción hélice.
const g = f.group();
const fus = f.lathe([[0.3, -45], [3, -38], [6, -15], [7, 10], [6, 30], [3, 42], [0.3, 46]], p.color || '#c94f3d', {seg: 18}); fus.rotation.x = Math.PI / 2; g.add(fus);
const wing = f.extrude([[-60, 8], [60, 8], [60, -6], [-60, -6]], 1.6, '#e8e2d2', {bevel: 0.5}); wing.rotation.x = -Math.PI / 2; wing.position.set(0, 0, 8); g.add(wing);
const tail = f.extrude([[-20, 4], [20, 4], [20, -4], [-20, -4]], 1, '#e8e2d2', {bevel: 0.3}); tail.rotation.x = -Math.PI / 2; tail.position.set(0, 2, -38); g.add(tail);
const fin = f.extrude([[0, 0], [12, 0], [4, 14]], 1, '#c94f3d', {bevel: 0.3}); fin.rotation.y = Math.PI / 2; fin.position.set(0, 3, -32); g.add(fin);
const prop = f.pivot(g, 'helice', 0, 0, 47); prop.add(f.box(2, 22, 0.6, '#222', 0, {outline: 0}));
g.userData.actions = {volar(ph) { prop.rotation.z = ph * 40; }};
const out = f.group(); out.add(g); g.position.y = 8; out.userData.actions = g.userData.actions; return out;

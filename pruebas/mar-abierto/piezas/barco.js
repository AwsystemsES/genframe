// Lancha abierta de prueba con carga dentro (comprueba la máscara de agua y la flotación).
const g = f.gen.hull({length: 90, beam: 30, depth: 16, draft: 6, bow: 'rampa', color: '#7a8790', bottom: '#3f4a45', afloat: true});
const inner = g.children[0];
for (let i = 0; i < 6; i++) { const c = f.box(7, 7, 7, i % 2 ? '#b98b52' : '#9c7444', 0, {outline: 0.04}); c.position.set(-8 + (i % 2) * 16, 5.5, -22 + Math.floor(i / 2) * 18); inner.add(c); }
return g;

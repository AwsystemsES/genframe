// Obstáculo genérico: pila de cajas (≈1,3 m).
const g = f.group();
const r = f.rand(p.seed || 1);
for (let i = 0; i < 3; i++) { const c = f.box(7, 6, 7, i % 2 ? '#8f6a3e' : '#a57c48', 3 + (i === 2 ? 6 : 0), {outline: 0.04}); c.position.x = i === 2 ? 0 : (i - 0.5) * 7.4; c.position.y = i === 2 ? 9 : 3; c.rotation.y = (r() - 0.5) * 0.3; g.add(c); }
return g;

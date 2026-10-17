// Edificio genérico de prueba: bloque de oficinas con ventanas.
const g = f.group(); const h = p.altura || 400;
g.add(f.box(180, h, 180, p.color || '#9aa6b0', h / 2));
for (let y = 30; y < h - 20; y += 40) for (const s of [-1, 1]) { const w = f.box(170, 14, 1, '#3c4a56', y, {outline: 0}); w.position.z = s * 90.6; g.add(w); }
return g;

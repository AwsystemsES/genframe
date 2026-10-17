// Cañón genérico de prueba: base y tubo hacia +z; la boca es el pivote «boca» (z = 52, y = 14).
const g = f.group();
g.add(f.box(22, 8, 26, '#5a6150', 4));
const tw = f.cyl(9, 10, 8, '#6b7360', 16, 12); g.add(tw);
const tube = f.cyl(1.8, 2.4, 40, '#3a3d38', 12, 0); tube.rotation.x = Math.PI / 2; tube.position.set(0, 14, 32); g.add(tube);
f.pivot(g, 'boca', 0, 14, 52);
return g;

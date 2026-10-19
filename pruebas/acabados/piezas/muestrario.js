// Muestrario del taller: un bloque redondeado de cada acabado (con su nombre en un rótulo), un cilindro de cantos
// redondeados, una cápsula y rótulos que deben caber siempre (corto, largo, de varias líneas y uno imposible).
const g = f.group();
const cols = ['#b8322a', '#8a9098', '#d0d4d8', '#9a6a4a', '#a8a39a', '#4a4c50', '#8a5a34', '#9a4a36', '#2f6a9a', '#7fa6c0', '#5a6a8a', '#26282b', '#e6e2d8'];
f.acabados.forEach((nombre, i) => {
  const x = (i % 7) * 34 - 102, z = Math.floor(i / 7) * -46;
  g.add(f.at(f.rbox(26, 26, 26, cols[i], 13, {acabado: nombre, desgaste: 0.5, radio: 4}), x, 0, z));
  const l = f.letrero(nombre.toUpperCase(), {ancho: 26, alto: 6, fondo: '#13233a', color: '#f3efe6'}); l.position.set(x, 33, z + 2); g.add(l);
});
g.add(f.at(f.rcyl(12, 22, '#c9a03a', 0, {acabado: 'pintura', radio: 3}), 140, 0, 0));
g.add(f.at(f.capsula(6, 14, '#5fbf6a', 13, {acabado: 'plastico'}), 140, 0, -46));
// Rótulos que siempre caben: corto, largo (se reparte en líneas) y uno imposible (avisa de letra demasiado pequeña).
const corto = f.letrero('ICE', {ancho: 30, alto: 12, fondo: '#2f6a9a', borde: '#ffffff'}); corto.position.set(-80, 70, 10); g.add(corto);
const largo = f.letrero('MARKET · COFFEE · FOOD · ATM', {ancho: 90, alto: 12, fondo: '#d6453d', lineas: 1}); largo.position.set(10, 70, 10); g.add(largo);
const menu = f.letrero('HOT DOG $1.99\nPIZZA SLICE $2.49\nBREAKFAST SANDWICH $3.99', {ancho: 60, alto: 30, fondo: '#1b1d20', color: '#f2a93b', alinear: 'left', lineas: 3}); menu.position.set(120, 60, 10); g.add(menu);
const imposible = f.letrero('ESTE TEXTO ES DEMASIADO LARGO PARA UN CARTEL TAN PEQUEÑO Y DEBE AVISAR', {ancho: 14, alto: 4, fondo: '#444'}); imposible.position.set(-140, 50, 10); g.add(imposible);
return g;

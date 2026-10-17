# Caja de herramientas K (vídeo explicativo, 1920×1080)

Escribes el CUERPO de una función JavaScript que dibuja y anima UNA escena. Se ejecuta así:

```js
(function (root, T0, T1) { /* tu código */ })(contenedor, inicio, fin)
```

- `root`: div absoluto de 1920×1080 de la escena. Todo lo que crees va dentro de `root`.
- `T0`, `T1`: segundos absolutos del vídeo en que la escena empieza y termina.
- Tamaño del lienzo: `K.W`×`K.H` (1920×1080 horizontal o 1080×1920 vertical; `K.vertical` dice cuál). Usa SIEMPRE `K.W`, `K.H` y `K.safe` ({top, bottom, left, right}) para colocar, nunca números pensados para el otro formato.
- En vertical: una sola columna, elementos centrados en x = K.W / 2, textos de 70-130 px con máximo ~14 caracteres por línea, nada fuera de `K.safe` (abajo van subtítulos e interfaz de Shorts; a la derecha, sus botones).
- `K`: caja de herramientas global. TODAS las animaciones van en su única línea de tiempo (`K.tl`, anime.js v4).
- Variables CSS: `var(--bg) var(--ink) var(--accent) var(--accent2) var(--soft)` y clases `.title .body .label .hand` con las tipografías elegidas. Paleta en JS: `K.palette.bg|ink|accent|accent2|soft`.

## Reglas obligatorias

1. Determinista: prohibidos `Math.random`, `Date`, `performance.now`, `setTimeout`, `setInterval`, `requestAnimationFrame`, `fetch`, imágenes o URLs externas. Aleatorio solo con `const r = K.rand(semilla); r()`.
2. Sincroniza con la voz: usa `K.cue('palabra')` (instante en que se dice la palabra que empieza así, sin tildes) en vez de números fijos. Si una palabra se repite, `K.cue('agua', {after: K.cue('lluvia')})` o `{nth: 1}`. Nunca animes antes de `T0` ni después de `T1`.
3. Algo visible en los primeros 0,4 s de la escena (`T0 + 0.1`) y nada vacío más de 1,5 s. La escena tiene que estar viva hasta `T1` (movimiento lento, cámara, partículas).
4. Zona segura: `K.safe` (horizontal: x 90–1830, y 90–860; vertical: x 70–940, y 200–1200). Fuera de ella van los subtítulos y, en vertical, la interfaz de Shorts.
5. Texto grande y poco: titulares 90–150 px, cifras 120–220 px, etiquetas 36–56 px, nunca menos de 32 px. Máximo ~12 palabras escritas a la vez. No repitas literalmente lo que dice la voz: resume, señala, cuantifica.
6. Contraste: texto `--ink` sobre `--bg`, o blanco sobre `--accent` si el acento es oscuro.
7. Nada de emojis. Iconos solo con `K.icon`, banderas con `K.flag`, mapas con `K.map`.
8. Solo datos ciertos que estén en el guion. No inventes cifras.
9. Países, regiones y ciudades SIEMPRE con `K.map` (contornos reales) y ciudades con `m.project([lon, lat])`; nunca dibujes un contorno geográfico a mano.
10. Nada encima de nada: etiquetas separadas al menos 16 px de líneas, puntos y otros textos; ningún texto se sale de su caja.
11. Para que algo aparezca usa `K.show` (ya parte de opacidad 0 y termina en 1). Si creas un elemento con `opacity: 0`, tiene que haber una animación que lo lleve a 1.
12. Los subtítulos ya salen solos abajo: NUNCA escribas en pantalla la frase que dice la voz ni una caja de subtítulos; como mucho, rótulos de 1-5 palabras.
13. Los modelos a escala humana (barcos, lanchas, tanques, personas, edificios) van en dioramas con `ground: 'none'`. Sobre un mapa (`ground: 'europe'`, etc.) no los pongas tal cual: allí se usan balizas, rutas, `w.country` y, si acaso, modelos con `scale` 0.05-0.2.
14. Devuelve solo código; sin `import`, sin `export`, sin `return` al nivel superior más que para salir pronto.

## Tiempo y voz

| Función | Qué hace |
|---|---|
| `K.cue(texto, {after, nth, fallback})` | Segundo en que empieza la palabra. |
| `K.cueEnd(texto, opts)` | Segundo en que termina. |
| `K.wordsBetween(a, b)` | Palabras `{t, a, b}` dichas entre a y b. |
| `K.ms(s)`, `K.clamp(v,a,b)`, `K.ramp(t,a,b)`, `K.smooth(x)` | Utilidades. |

## Construcción

| Función | Qué hace |
|---|---|
| `K.box(parent, x, y, {w, h, cls, style, html})` | Div absoluto. `cls: 'title'` etc. `style` en camelCase (`{fontSize: '120px'}`). |
| `K.el(parent, tag, {cls, style, html, attrs})` | Elemento cualquiera. |
| `K.svg(parent, x, y, w, h)` | Lienzo SVG. |
| `K.shape(svg, 'path'|'circle'|'rect'|'line'|'text'…, attrs, style)` | Forma SVG. |
| `K.rough(svg, tipo, args, opts)` | Trazo a mano alzada (rough.js): `'line' [x1,y1,x2,y2]`, `'rectangle' [x,y,w,h]`, `'circle' [cx,cy,d]`, `'ellipse' [cx,cy,w,h]`, `'curve' [[[x,y],…]]`, `'linearPath' [[[x,y],…]]`, `'polygon' [[[x,y],…]]`, `'path' ['M…']`, `'arc' [x,y,w,h,inicio,fin,cerrado]`. opts: `stroke, strokeWidth, fill, fillStyle ('hachure'|'solid'|'zigzag'|'cross-hatch'|'dots'), roughness`. |
| `K.icon(parent, nombre, x, y, tamaño, {color, stroke})` | Icono de Lucide o Tabler por nombre en kebab-case (`'users'`, `'factory'`, `'house'`, `'scale'`, `'gavel'`, `'droplet'`, `'sun'`, `'cloud-rain'`, `'trending-up'`, `'euro'`, `'landmark'`, `'graduation-cap'`, `'stethoscope'`, `'leaf'`, `'flame'`, `'car'`, `'plane'`, `'ship'`, `'smartphone'`, `'cpu'`…). Escribe el nombre literal en la llamada. |
| `K.flag(parent, 'es', x, y, ancho)` | Bandera por ISO2, literal en la llamada. |
| `K.splitWords(el)` | Envuelve cada palabra en un span y devuelve la lista. |

## Animación (todo en segundos absolutos)

| Función | Qué hace |
|---|---|
| `K.show(el|lista, t, {from: {y: 24, x, scale, rotate, blur}, dur, ease, stagger})` | Aparece (de opacidad 0 a 1; `from` es solo el punto de partida del movimiento). |
| `K.hide(el, t, {dur, to: {y, scale}})` | Desaparece. |
| `K.anim(el, t, {prop: [desde, hasta]}, dur, ease)` | Cualquier propiedad (translateX, scale, rotate, opacity, width, backgroundColor, strokeDashoffset…). |
| `K.draw(svgNodo|grupo, t, dur)` | Dibuja el trazo como a mano. |
| `K.reveal(el, t, dur, 'left'|'right'|'top'|'bottom')` | Cortina. |
| `K.typeOn(el, t, dur)` | Máquina de escribir. |
| `K.count(el, t, desde, hasta, {dur, decimals, prefix, suffix})` | Cifra que sube con formato español. |
| `K.camera(elGrande, [[t, x, y, escala], …], {w, h, dur})` | Cámara que recorre un lienzo mayor que la pantalla (mapas, líneas de tiempo largas) sin enseñar sus bordes. |
| `K.onFrame((t) => {…})` | Dibujo por fotograma según `t` (partículas, olas, lluvia). Debe depender solo de `t`. |

Easings de anime.js v4: `'linear'`, `'outCubic'`, `'inOutSine'`, `'outExpo'`, `'outBack'`, `'outElastic(1, .6)'`, `'inQuad'`…

## Personajes de palo, bocadillos y flechas

```js
const p = K.stickman(root, x, ySuelo, {height: 320, color, facing: 1|-1, pose: 'stand', head: '#fff'}); // (x, ySuelo) = pies
p.pose(t, 'point');            // posturas: stand, wave, point, pointUp, think, shrug, cheer, surprised, explain, hold, wings, sit, sad
p.pose(t, {rSh: 120, head: -10}); // o ángulos sueltos (grados): torso, head, lSh/rSh (hombro, 0 = colgando, 90 = al frente, 180 = arriba), lEl/rEl (codo), lHip/rHip, lKn/rKn, lift
p.walk(t0, t1, dx, {run: false}); // camina (o corre) desplazándose dx px; dx negativo = hacia la izquierda (date la vuelta antes con p.turn)
p.turn(t); p.idle(T0, T1);        // darse la vuelta; respirar para que nunca esté congelado (ponlo siempre)
K.bubble(root, xPunta, yPunta, '¿Y por qué vuela?', t, tFin, {w: 420, side: 1|-1, think: false, size: 40});
K.draw(K.arrow(svg, x1, y1, x2, y2, {color, width: 8, label: 'Sustentación', curve: 0}), t, 0.6);
```

Las llamadas de cada personaje van en orden temporal. Un personaje mide `height` px de los pies a la cabeza; ponle el suelo hacia y = 800. Las manos están en `p.hands.r` / `p.hands.l` (coordenadas relativas al svg del personaje, `p.svg`). Varios personajes pueden conversar con bocadillos; nunca más de ~8 palabras por bocadillo.

## Mundo 3D (maqueta de videojuego, Three.js)

Para escenas en 3D: un mapa real extruido con mar, cielo según la hora, sombras, sombreado de cómic y modelos hechos por código. Úsalo cuando el estilo lo pida; combina con capas 2D encima (`K.box`, textos, iconos) porque el lienzo 3D queda debajo de lo que crees después.

```js
const w = K.world3d(root, T0, T1, {ground: 'spain'|'iberia'|'europe'|'mediterranean'|'atlantic'|'world'|'none', sky: 'atardecer'|'dia'|'noche'|'tormenta'|'amanecer', highlight: {es: '#e8b46a'}});
w.shot(T0, [lon, lat], {dist: 700, pitch: 60, yaw: 0});            // PRIMERA toma = encuadre inicial (sin animación)
w.shot(t, [lon, lat], {dist: 160, pitch: 35, yaw: -30, dur: 2.5});  // siguientes tomas: vuelo suave de cámara
w.drift(3);                                                         // giro lento continuo (grados/s); 0 = quieta
const c = w.add('castle', [lon, lat], {scale: 1.5, rotate: 30, t});  // aparece con rebote en t (sin t: ya está)
w.move(obj, t, [lon, lat], dur);  w.hide(obj, t);  w.show(obj, t);
w.country('fr', t, '#c84d3b');                                     // colorea y eleva un país (ISO2)
w.label('Granada', [lon, lat], t, tFin, {style: 'pin'|'city'|'title', color: '#ffd84a'});  // 'pin' = baliza de destino con haz de luz
w.route([[lon, lat], [lon, lat], …], t, dur, {color: '#b04cff', arc: 0});   // ruta de GPS que se dibuja (arc > 0 = arco, para viajes largos)
w.fx('fire'|'smoke'|'explosion'|'rain'|'sparkle', [lon, lat], t0, t1, {size: 1});
```

Modelos (`w.add(nombre, …, {parámetros})`): castle, tower, house, city ({era: 'romana'|'medieval'|'moderna', n, radius}), temple, aqueduct, amphitheater, mosque, cathedral, palace, parliament, ship ({flag: '#color'}; en el mar pon `y: 0`), galley, soldier, army ({n, color, cols, banner: '#color'}), cannon, tree, forest ({n, radius}), mountain, cave, car ({color}), train, plane, factory, stadium, tank, flag ({colors: ['#c60b1e', '#ffc400', '#c60b1e']}), crown, campfire.

Escala: con `ground` puesto, la península mide ~600 unidades; un castillo ~10. `dist` 600–900 enseña toda España; 150–300 una región; 40–90 un primer plano de un modelo (usa `scale` 2–4 para que se vea). Pon varios modelos juntos para que la escena sea rica (ciudad + castillo + ejército + bosque), nunca un objeto solo en un mapa vacío. Coordenadas siempre reales [lon, lat] (Granada [-3.6, 37.18], Madrid [-3.7, 40.42], Toledo [-4.02, 39.86], Córdoba [-4.78, 37.88], Sevilla [-5.98, 37.39], Cádiz [-6.29, 36.53], Barcelona [2.17, 41.39], Roma [12.5, 41.9]…).

Con `ground: 'none'` hay un plano de suelo infinito: coloca modelos con {x, z} (unidades) para dioramas cercanos (batallas, ciudades, fábricas); cámara con `w.shot(t, {x: 0, z: 0}, {dist: 60, pitch: 25})`.

### Más del mundo 3D

- Aspectos: `look: 'comic'` (contorno negro), `'sa'` (videojuego de los 2000, bruma naranja) o `'clean'` (documental limpio, sin contorno, luz realista). Cielos: `sky: 'atardecer'|'dia'|'noche'|'noche_luna'|'tormenta'|'amanecer'|'plomizo'|'dorada'|'sa'`. `haze: 3-8` controla la bruma.
- `w.flow({x, y, z}, {x, y, z}, t0, t1, {color, n, spread, speed, size, opacity})`: corriente de partículas (aire, chorro, trayectorias, columnas de tropas a distancia).
- `w.attach(html, objeto3D, t, tFin, {y})`: etiqueta HTML que sigue a un objeto. Para un punto fijo crea `const o = new w.THREE.Object3D(); o.position.set(x, y, z); w.scene.add(o);`.
- `w.onUpdate((t) => {...})`: lógica por fotograma que se ejecuta justo antes de dibujar (mover objetos según t).
- Objetos devueltos por `w.add` son de Three.js: puedes animar `obj.position`, `obj.rotation` y `obj.scale` con `K.tl.add(obj.position, {x: [a, b], duration: ms}, K.ms(t))` (SIEMPRE con `duration`).
- Personas: `w.person(punto, {outfit: 'gi'|'tommy'|'soldado'|..., helmet: 'm1'|'brodie', backpack: '#6b6a4a'})` con `p.walk`, `p.pose(t, 'stand'|'point'|'wave'|'shield'|'think'|'shrug'|'nod'|'look_up'|'explain'|'arms_crossed'|'victory'|'hands_on_podium')`, `p.talk`, `p.face`. Para multitudes usa `troops` (más ligero).
- Escala humana con `ground: 'none'`: 10 unidades = 1 m (una persona mide 18). Cámara cercana: `w.shot(t, {x, z}, {dist: 40-120, pitch: 3-12, h: 10-20})`; panorámica: `dist: 600-2600`.

Modelos 1944 (escala humana): `lcvp` ({ramp: 0-1.4, crew: n, helmet}; abre la rampa con `K.tl.add(b.userData.ramp.rotation, {z: [0, -1.4], duration: 600}, K.ms(t))`; en el agua `y: 0`), `lst` ({number: 'US 310'}, 100 m), `warship` ({length, turrets}; acorazado ~1800, destructor 1100 con turrets 2), `balloon` ({cable}), `sherman` ({dd: true} = faldón anfibio), `halftrack`, `truck`, `jeep`, `dukw`, `c47` (con franjas de invasión), `horsa`, `soldier` ({helmet}), `troops` ({n, cols, gap, helmet}), `hedgehog`, `belgiangate`, `stake`, `bunker`, `pillbox`, `coast` ({beach, bluff, cliff: true para acantilado}; mar en z < 0, arena, muro y loma; pon la cámara en el mar mirando a tierra), `bocage` ({fields, size}), `mulberry`, `cemetery` ({rows, cols}). También sirven `tree`, `forest`, `house`, `city`, `cathedral`, `mountain`, `flag`.

Recetas: playa de desembarco = `coast` + 30-60 obstáculos repartidos con `K.rand` en z 20-180 + `bunker`/`pillbox` sobre la loma (y = altura del bluff) + 4-8 `lcvp` en el agua acercándose (`K.tl.add(b.position, {z: [...]})`) que abren la rampa + `troops` en la arena + `w.fx('smoke', …, {size: 6-10})` + un `warship` lejos. Flota = `warship` + varios `lst` + muchos `lcvp` + `balloon`. Noche aérea = `bocage` abajo + filas de `c47` a y 500-700 moviéndose + `w.flow` de paracaídas (color blanco) hacia abajo.

## Mapas reales

```js
const m = K.map.world(root, {x: 100, y: 80, w: 1720, h: 760, projection: 'equalEarth'|'mercator'|'orthographic'|'naturalEarth1', focus: ['es','fr','pt'] /* o [[lonO,latS],[lonE,latN]] */, rotate: [lon, lat], fill, stroke});
m.countries.es   // path SVG del país (anímalo: K.anim(m.countries.es, t, {fill: ['#ddd', K.palette.accent]}))
m.centroid('es') // [x, y] dentro del svg del mapa
m.project([lon, lat]); m.name('es') // nombre en español
const e = K.map.spain(root, {x, y, w: 900, h: 760, level: 'ccaa'|'provinces'});
e.regions['Andalucía']; e.centroids['Madrid, Comunidad de']; e.names; e.project([lon, lat])
```

Los mapas de España son datos del IGN: si usas `K.map.spain`, añade en una esquina `© IGN` en 20 px.

## Recetas que funcionan

- Titular que entra palabra a palabra: `const h = K.box(root, 160, 300, {w: 1600, cls: 'title', html: '…', style: {fontSize: '130px'}}); K.show(K.splitWords(h), T0 + .1, {stagger: .08});`
- Subrayado a mano bajo una palabra: crea un `span` con `position: relative` y dentro un svg con `K.rough(s, 'line', …)` y `K.draw` en su `K.cue`.
- Comparar dos cifras: dos columnas, `K.count` en cada una, barras con `K.anim(barra, t, {height: ['0px', '420px']})`.
- Proceso en pasos: iconos en fila conectados con flechas `K.rough(s, 'line'…)` que se dibujan al decir cada paso.
- Dar vida: deriva lenta del conjunto `K.anim(grupo, T0, {scale: [1, 1.04]}, T1 - T0, 'linear')`.

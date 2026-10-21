# Caja de herramientas K (vídeo explicativo)

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
13. Solo existen los modelos 3D y los dibujos 2D del REPARTO DE ESTE VÍDEO (te llega con la escena): úsalos por su id. No inventes ids ni construyas modelos o personajes dentro de la escena. Los modelos están a escala real (10 unidades = 1 m): van en dioramas con `ground: 'none'`; sobre un mapa extruido (donde 1 unidad son kilómetros) solo con `scale` muy pequeño o, mejor, balizas, rutas y `w.country`.
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

## Dibujos 2D del reparto, bocadillos y flechas

```js
const p = K.figure('id-del-reparto', root, x, ySuelo, {size: 520, flip: false});  // (x, ySuelo) = centro de la base; size = alto en px
K.show(p.el, T0 + 0.1, {from: {y: 30}});
K.anim(p.parts.brazo_derecho, K.cue('mira'), {rotate: ['0deg', '-70deg']}, 0.5, 'outBack');  // partes animables del reparto (giran en su pivote)
p.act('andar', T0, T1);                                                                     // acciones del reparto (andar, hablar, parpadear…)
K.bubble(root, xPunta, yPunta, '¿Y por qué vuela?', t, tFin, {w: 420, side: 1|-1, think: false, size: 40});
K.draw(K.arrow(svg, x1, y1, x2, y2, {color, width: 8, label: 'Sustentación', curve: 0}), t, 0.6);
```

Cada dibujo del reparto dice qué partes (`parts`) y acciones (`act`) tiene. Nunca más de ~8 palabras por bocadillo.

## Mundo 3D (Three.js)

Un escenario con cielo, luz, niebla, sombras y, si quieres, el mapa real extruido. Los modelos son los del REPARTO DE ESTE VÍDEO, fabricados y aprobados para él. Combina con capas 2D encima (`K.box`, textos, iconos): el lienzo 3D queda debajo de lo que crees después.

```js
const w = K.world3d(root, T0, T1, {ground: 'none'|'spain'|'iberia'|'europe'|'mediterranean'|'atlantic'|'world'|[[lonO,latS],[lonE,latN]], sky: 'nombre-de-un-cielo-de-la-dirección', look: 'comic'|'sa'|'clean',
  exposure: 1.15,                                   // sube a 1.4-1.8 en escenas de noche o tormenta: TODO tiene que verse
  ocean: {waves: 6, length: 120, direction: 0, choppy: 1.6, color: '#2c5d8a', foamLevel: 0.62},   // mar con olas reales (solo con ground 'none'); además ondas (11), manchas (0.22), rizo (70), rizoFuerza (0.3)
  terrain: {coast: {z: -400, beach: 80, bluff: 40, bluffWidth: 70, cliff: false}, z: -900, roughness: 6, colors: {sand, grass, rock, wet}},  // tierra en z < coast.z, mar delante
  clouds: {amount: 0.7, dark: false, height: 400, size: 300}});   // nubes volumétricas
const lancha = w.add('id-del-reparto', {x: 0, z: 0}, {rotate: 180});   // en terreno se apoya sola en el suelo
w.float(lancha, {maxPitch: 12, maxRoll: 10});                     // flota con inercia: 6 puntos del casco, cabeceo y balanceo limitados
w.frame(T0, lancha, {shot: 'general'|'conjunto'|'medio'|'cerrado'|'detalle', angle: 'frontal'|'tres_cuartos'|'lateral'|'espalda'|'picado'|'contrapicado'|'cenital', side: 1|-1});  // encuadre automático, PRIMERA toma sin animación
w.frame(K.cue('rampa'), [lancha, soldado], {shot: 'cerrado', angle: 'tres_cuartos', dur: 1.4});   // siguientes: vuelo de cámara al nuevo encuadre
w.shot(t, {x, z}, {dist, pitch, yaw, h, dur});                     // toma manual, solo si w.frame no basta
w.drift(1.5);                                                       // giro lento continuo (grados/s); 0 = quieta
w.pose(o, t, {hombro_der: {x: -80}}, 0.5);  w.act(o, 'andar', t0, t1, {rate: 1});   // articulaciones y acciones del reparto
w.move(o, t, {x: 80, z: 0}, dur);  w.hide(o, t);  w.show(o, t);       // w.move: vehículos y barcos (dejan estela si flotan)
w.walk(persona, [{x, z}, …], t0, {paso: 'andar'|'correr'|'correr_agachado', hasta, velocidad});  // a pie: zancada ligada a la distancia, sigue el terreno y rodea obstáculos (A*)
w.formation('avion', 5, {x, z}, {tipo: 'V'|'fila'|'columna'|'rejilla', rotate, y, separacion: 1.3, params: (i) => ({variante: i})});  // n piezas sin solaparse
w.scatter('roca', 20, {x, z, w, d} | {x, z, r}, {seed, separacion: 1.15, giro: 'azar'});      // reparto sin que se toquen entre sí ni con lo que hay
w.point(persona, t, destino, {brazo: 'der', hasta});  w.look(persona, t, destino);           // señalar y mirar a una pieza, punto {x,y,z} o [lon, lat]
w.shake(t, 1);                                                                                  // sacudida de cámara
w.lago({x, z}, {radio | rx, rz, color, claro, orilla, irregular, seed, giro});  w.rio([{x, z}, …], {ancho, variacion, color, claro, orilla, corriente});  // agua de interior (ver abajo)
w.decorar('ciudad'|'campo'|'interior', {epoca: 'clasica'|'moderna', radio, manzana, calle, densidad, fondo, seed, colores, skyline: 'baja'|'media'|'alta', trafico: 0-1, peatones: 0-1});  // viste el entorno (ver abajo)
w.country('fr', t, '#c84d3b');  w.label('Granada', [lon, lat], t, tFin, {style: 'pin'|'city'|'title', color});
w.route([[lon, lat], …], t, dur, {color, arc: 0});
w.fx('fire'|'smoke'|'explosion'|'rain'|'sparkle'|'fogonazo'|'columna', dónde, t0, t1, {size, cada, dir, material: 'arena'|'agua'|'tierra', shake, wind, offset});
// dónde: [lon, lat], {x, z, y} o UNA PIEZA o articulación (se ancla y la sigue). Con profundidad: lo que hay detrás de algo no se ve.
// 'fogonazo' en la boca de un cañón (destello + luz, se repite «cada» s); 'columna' = impacto en el suelo o el agua (sube y cae, restos, marca).
w.flow({x, y, z}, {x, y, z}, t0, t1, {color, n, spread, speed, size, opacity});
w.attach(html, objeto3D, t, tFin, {y});  w.onUpdate((t) => {…});  w.seaHeight(x, z, t);  w.groundHeight(x, z);
```

- Escala real con `ground: 'none'`: 10 unidades = 1 m (una persona mide ~18). Primer plano: `dist` 30-120, `pitch` 3-15, `h` a la altura de lo que miras; plano general: `dist` 300-2600.
- Con mapa: la península mide ~600 unidades; `dist` 600-900 enseña España, 150-300 una región. Coordenadas reales [lon, lat].
- Los objetos de `w.add` son de Three.js: anima `o.position`, `o.rotation` y `o.scale` con `K.tl.add(o.position, {x: [a, b], duration: ms}, K.ms(t))` (SIEMPRE con `duration`).
- Cielos: solo los que define la dirección de arte de este vídeo (te llegan sus nombres) o un objeto `{top, mid, low, fog, sun, amb, sea, land, elev, az, haze, night}`. Con `fisico: true` (y `turbidez`, `rayleigh`) el cielo es físico: el color sale de la altura del sol (`elev`, `az`), ideal para amaneceres y atardeceres creíbles.
- Aspecto (`look` de la dirección de arte o de la escena: `K.world3d(root, T0, T1, {look})`): `'comic'` (tres tonos y contorno), `'sa'` (videojuego), `'clean'` o `'realista'` (materiales físicos sin contorno que reflejan el cielo de la escena; con acabados, el metal brilla y el óxido no). En `'realista'`, además, cada superficie varía de tono y de brillo, lo bajo de cada pieza se ensucia (barro y polvo) y el etalonaje sube contraste y saturación.
- Imagen final (automático): supermuestreo, oclusión ambiental (sombra en rincones y uniones), resplandor de lo que brilla, etalonaje y suavizado. La dirección de arte lo ajusta con `arte.render = {supermuestreo: 1.5, ao: 0.85, bloom: 0.25, grano: 0.022, contraste: 1.04, saturacion: 1.05, calidez: 0, subfotogramas: 5, obturador: 0.5, pelicula}` (0 desactiva cada efecto; `subfotogramas: 1` apaga el obturador). La auditoría dibuja sin él, para ir rápido.
- Obturador (automático): cuando la imagen se mueve (cámara, piezas que andan o se desplazan, sacudidas) cada fotograma es la media de varios subfotogramas repartidos en medio fotograma: desenfoque de movimiento real y bordes suaves. Más movimiento, más subfotogramas (hasta 17). Un plano quieto se dibuja una sola vez y no cuesta más.
- Foco (`foco` en `K.world3d`): profundidad de campo real. `foco: {apertura: 0-1, objetivo: pieza | articulación | {x, y, z}}`; sin objetivo enfoca el punto al que mira la cámara. Úsalo en primeros planos para separar al protagonista del fondo (apertura 0.3-0.6); con foco, ese plano tarda más en renderizar.
- Película (`pelicula` en `K.world3d` o `arte.render.pelicula`): `'ninguna'`, `'suave'` (curva fílmica y algo de halación; por defecto en `'realista'`), `'cine'` (virado frío/cálido, vaivén leve, grano), `'archivo'` (sepia, vaivén, parpadeo, polvo y rayas: noticiarios y pasado), `'noche'` (por defecto de noche en `'realista'`), `'calida'`.
- Niebla de altura y aire lejano (automático, en todos los materiales): lo alto se despeja sobre la bruma y lo lejano se azula como en la realidad. `niebla: {densidad: 0-1, altura}` en `K.world3d` añade además niebla baja a ras de suelo; `caida`, `despeje` y `aire` la afinan.
- Encuadra SIEMPRE con `w.frame`: el protagonista grande y reconocible, nunca diminuto en un plano vacío. Alterna tipos de plano y ángulos entre escenas; en una escena de más de 5 s, al menos dos encuadres.
- Luz: nada de escenas en penumbra. De noche o con tormenta, `exposure` 1.4-1.8, cielo de la dirección con luna o relámpagos y el protagonista con colores que destaquen; el contraluz automático recorta las siluetas.
- Noche (cielo con `night: true`): el motor ya baja el ambiente y enfría la luna, oscurece los suelos de la decoración y enciende farolas (halo y charco de luz en el suelo), ventanas de los edificios de fondo, faros, pilotos y semáforos. Las piezas del reparto conservan su color: dales luces propias (materiales con `emissive`) si deben brillar.
- Vertical: el protagonista en el centro de la pantalla (w.frame ya lo coloca); arriba, titulares; abajo, libre para subtítulos.
- Mar y costa: usa `ocean` y `terrain`, nunca un plano liso de color. Barcos y lanchas flotan con `w.float`.
- Lagos, charcas y ríos: SIEMPRE `w.lago` y `w.rio` (reflejo del cielo, rizo que se mueve, agua más clara en la orilla, franja de tierra húmeda; el río corre del primer punto al último). Nunca un disco o una cinta azul plana. Llámalos ANTES de `w.decorar`: la decoración no pone hierba ni árboles dentro del agua.
- Bruma baja (`bruma: 0-1` o `{densidad, altura, color}` en `K.world3d` o en el cielo): niebla a ras de suelo que funde lo lejano y deja limpio lo cercano; amaneceres, valles, polvo.
- Montañas al fondo: pieza con `f.gen.montana` (ver el taller) colocada lejos con `fantasma: true`.
- Lo que el motor ya hace solo (no lo programes a mano):
  - **Separar piezas:** `w.add` aparta lo que nace atravesando otra pieza y avisa (`separar: false` para desactivarlo, `fantasma: true` para lo que puede cruzarse).
  - **Terreno:** lo que va apoyado sigue el terreno aunque se mueva (`suelo: false` para desactivarlo).
  - **Cámara segura:** nunca se mete en el agua ni en el terreno, y se eleva si una ola tapa lo que mira.
  - **Cascos abiertos:** el agua no se dibuja dentro de los cascos de `f.gen.hull` sin cubierta.
  - **Mar:** crestas afiladas (Gerstner) con un espectro de 11 ondas (sin patrón de manchas repetido), manchas amplias de luz que derivan, rizo fino en primer plano, reflejo del cielo, espuma con la forma del casco en la línea de flotación y estela al navegar. El agua llega siempre más allá de la bruma (nunca se ve su borde, ni en planos muy lejanos) y una bruma de horizonte la funde con el cielo. `ocean` admite además `gerstner`, `reflejo`, `roughness`, `foamSlope`, `ondas`, `manchas`, `rizo`, `rizoFuerza`.
  - **Sombras de contacto:** cada pieza apoyada lleva debajo una mancha suave del tamaño de su huella (se aclara si se levanta; `userData.sinSombra` la quita).
- Nunca un suelo vacío: en cuanto una escena 3D sin mar ni terreno tenga suelo a la vista, llama a `w.decorar` DESPUÉS de colocar las piezas principales y la gente:
  - **`'ciudad'`:**
    - calles en cuadrícula con aceras y bordillo;
    - pasos de cebra y raya discontinua (`epoca: 'moderna'`) o raíles de tranvía (`'clasica'`);
    - plazas adoquinadas donde no cabe calle;
    - farolas de la época, árboles, bancos, bocas de incendio y papeleras;
    - vida urbana: coches que circulan (solo por calles despejadas de punta a punta y en una orientación, así nunca se cruzan), coches aparcados junto al bordillo, autobuses y taxis (moderna), semáforos en los cruces (moderna) y peatones que andan por las aceras con su zancada. `trafico` y `peatones` (0-1, por defecto `densidad`) los regulan; 0 los quita;
    - edificios de fondo de cinco tipos (cristal, oficinas y viviendas en `'moderna'`; ladrillo y piedra en `'clasica'`), con ventanas en rejilla por plantas, planta baja con comercios y toldos, cornisa, retranqueos en las torres y azotea con depósitos, máquinas o antenas. `skyline: 'baja'` (6-20 m), `'media'` (10-40 m, alguna torre; por defecto) o `'alta'` (rascacielos).
  - **`'campo'`:** manchas a gran escala (zonas secas, tierra, verde oscuro), arboledas en el horizonte, hierba con miles de matas altas que se mecen con el viento, parcelas, camino, vallas, árboles del generador (frondoso, abedul y pino, que se mecen), arbustos, piedras y lomas. `colores.estacion` (`'otono'`, `'invierno'`…) cambia el color de los árboles.
  - **`'interior'`:** tarima, alfombra y paredes con zócalo, ventanas y cuadros hacia −z.

  La decoración rodea lo que ya hay. Las calles solo las desvían las piezas grandes, y el mobiliario y los coches aparcados cuentan como obstáculo; los coches que circulan los vigila el auditor (si una persona cruza su carril con `w.walk`, avisa del choque: pon `trafico: 0` o aparta la ruta). El mobiliario que se interpone entre la cámara y lo que mira se oculta solo. Si falta, el auditor avisa con «suelo vacío».
- Personas que se desplazan: SIEMPRE `w.walk`. Mover una persona con `K.tl` o `w.move` mientras anda hace que los pies patinen, y el auditor lo marca.
- Grupos (aviones, barcos, gente, rocas, árboles): `w.formation` o `w.scatter`, nunca posiciones a ojo que puedan solaparse.
- Escenas ricas: varios modelos del reparto juntos, repetidos con variaciones (`rotate`, `scale`, parámetros), cámara con intención y algo vivo (acciones, partículas, deriva). Nunca un objeto solo en un plano vacío.

## Mapas reales

```js
const m = K.map.world(root, {x: 100, y: 80, w: 1720, h: 760, projection: 'equalEarth'|'mercator'|'orthographic'|'naturalEarth1', focus: ['es','fr','pt'] /* o [[lonO,latS],[lonE,latN]] */, center: [lon, lat], fill, stroke});
m.countries.es   // path SVG del país (anímalo: K.anim(m.countries.es, t, {fill: ['#ddd', K.palette.accent]}))
m.centroid('es') // [x, y] dentro del svg del mapa
m.project([lon, lat]); m.name('es') // nombre en español
const e = K.map.spain(root, {x, y, w: 900, h: 760, level: 'ccaa'|'provinces'});
e.regions['Andalucía']; e.centroids['Madrid, Comunidad de']; e.names; e.project([lon, lat])
```

El mapa se gira solo hacia lo que pones en `focus`. Para un globo (`'orthographic'`) que mire a un sitio usa `center: [lon, lat]` con las coordenadas REALES del sitio (Rusia `[100, 60]`, Brasil `[-52, -10]`); nunca `rotate`. Un estrecho o una frontera de pocos km se encuadra con una caja de 2–6 grados alrededor (`focus: [[lonO, latS], [lonE, latN]]`), no con los países enteros, y los dos extremos se marcan con `m.project([lon, lat])`. Un país con territorios lejanos (Francia con la Guayana) se encuadra con una caja de la zona que se nombra.

Los mapas de España son datos del IGN: si usas `K.map.spain`, añade en una esquina `© IGN` en 20 px.

## Textos y rótulos que nunca se salen

- `K.title(root, html, {y, size, color, scrim})`: titular centrado en la zona segura.
- Cualquier `.title` o `.label` se encoge solo si no cabe; con `data-fit="no"` no se toca.
- `K.map.world` dibuja a sangre cuando es de fondo (`w` ≥ 60 % del lienzo): llega a los bordes sin cortes rectos. Uno pequeño funde sus bordes. Opciones: `bleed`, `fade`.
- `K.map.labels(m, [{text, ll, color}], {t, stagger, size})`: rótulos de lugares sin solapes, dentro de la zona segura, con línea guía cuando quedan lejos de su punto y esquivando los titulares que ya hay.

## Recetas que funcionan

- Titular que entra palabra a palabra: `const h = K.box(root, 160, 300, {w: 1600, cls: 'title', html: '…', style: {fontSize: '130px'}}); K.show(K.splitWords(h), T0 + .1, {stagger: .08});`
- Subrayado a mano bajo una palabra: crea un `span` con `position: relative` y dentro un svg con `K.rough(s, 'line', …)` y `K.draw` en su `K.cue`.
- Comparar dos cifras: dos columnas, `K.count` en cada una, barras con `K.anim(barra, t, {height: ['0px', '420px']})`.
- Proceso en pasos: iconos en fila conectados con flechas `K.rough(s, 'line'…)` que se dibujan al decir cada paso.
- Dar vida: deriva lenta del conjunto `K.anim(grupo, T0, {scale: [1, 1.04]}, T1 - T0, 'linear')`.
- Diorama 3D: `ground: 'none'`, el modelo protagonista del reparto en el centro, otros alrededor a distintas distancias para dar profundidad, cámara que se acerca o rodea y una acción en la palabra clave.

# Recursos libres para el motor de vídeo explicativo

Estudio del 13-10-2026. Para cada recurso: qué es, qué aporta a un vídeo explicativo o documental, ejemplos concretos, cuánto pesa en el render de una CPX42 (8 vCPU, **sin tarjeta gráfica**) y sus límites.

**Criterio de entrada:** licencia que permite uso comercial **sin atribución obligatoria** (MIT, Apache 2.0, BSD, ISC, Zlib, OFL, CC0 o dominio público) y que **funciona 100 % en local**, empaquetado en la imagen del worker y sin llamar a internet al renderizar. Las licencias se comprueban en la fuente oficial antes de meter cada recurso en la imagen (ver §12).

**Leyenda de coste de render:**
- 🟢 **ligero:** casi no añade tiempo.
- 🟡 **medio:** se nota en escenas largas.
- 🔴 **pesado:** hay que limitar duración, resolución o cantidad.

**Prioridad para la v1:**
- ★★★ **imprescindible**
- ★★ **muy útil**
- ★ **opcional**

---

## 1. Por qué una caja de herramientas y no plantillas

Un documental o explicativo bueno se apoya en cinco recursos visuales: **datos** (cifras y gráficos), **geografía** (dónde pasa), **personas** (quién), **tiempo** (cuándo y en qué orden) y **conceptos** (ideas abstractas que hay que hacer visibles). Encima va una capa de **atmósfera**: textura, luz, ritmo, sonido.

Las librerías de este estudio cubren las cinco y la atmósfera. La IA del motor generativo no elige una plantilla: **combina estas herramientas a su manera en cada escena**. Por eso cada vídeo sale distinto sin perder exactitud: los mapas, las banderas y los datos los ponen las herramientas, no la imaginación de la IA.

---

## 2. Motor y animación

### HyperFrames (Apache 2.0) ★★★ 🟢
- **Qué es:** el motor de vídeo. Cada escena es una página web que un Chrome sin ventana captura fotograma a fotograma; FFmpeg une las capturas, la voz y la música en el MP4.
- **Qué aporta:**
  - el render es **determinista** (mismo código, mismo vídeo);
  - trae comprobaciones automáticas (`lint`, `check`: textos que se salen, contraste, sincronía) y capturas de fotogramas para la revisión visual de la IA;
  - reparte el trabajo entre varios Chrome;
  - admite vídeo, audio, Lottie, Three.js y shaders dentro de la misma escena.
- **Ejemplo:** todo el vídeo de VOX (4:12) se hizo con él en unos 2 minutos.
- **Límites:**
  - Proyecto joven con versiones casi diarias, así que **fijamos la versión** en la imagen y solo la subimos tras probarla.
  - **Envía telemetría a PostHog por defecto**: en el worker va siempre `HYPERFRAMES_NO_TELEMETRY=1`.
  - Su animación de referencia es GSAP (licencia propia, ver §14); usaremos anime.js con un adaptador de reloj.

### Catálogo de bloques de HyperFrames (Apache 2.0) ★★ 🟢–🟡
- **Qué es:** unas 392 piezas reutilizables: transiciones con shaders, estilos de subtítulos, gráficos, mapas, rótulos, tarjetas de redes sociales…
- **Qué aporta:** **no son plantillas para el cliente**, sino material de consulta y construcción para la IA: técnicas probadas que puede copiar, mezclar y adaptar. Acortan mucho el camino para efectos difíciles (un *glitch*, una transición de luz).
- **Límites:**
  - **No es libre tal cual**: la mayoría de bloques usan GSAP (licencia propia) y cargan GSAP, three.js y fuentes desde CDN.
  - Hay bloques 3D con Clipper (BSL-1.0) y seis texturas «de origen por confirmar».
  - Solo sirve **como referencia de técnicas** reescritas con anime.js y recursos locales, nunca copiado.

### anime.js (MIT) ★★★ 🟢
- **Qué es:** motor de animación de propósito general: mueve, escala, gira y cambia color o forma de cualquier elemento con curvas de aceleración.
- **Qué aporta:** es el sustituto **sin dudas de licencia** de GSAP. Sirve para todo lo cotidiano del explicativo: textos que entran palabra a palabra, cifras que suben, tarjetas que se reparten, líneas que se dibujan (`stroke-dashoffset`), cronologías que se despliegan.
- **Ejemplos:**
  - el titular «La llave de la Constitución» entrando letra a letra con rebote suave;
  - las 4 propuestas de inmigración apareciendo en escalera, sincronizadas con la voz.
- **Límites:** hay que conectarlo al reloj de HyperFrames (que avance por tiempo y no por sí solo). Es un adaptador pequeño que se hace una vez.

### Motion (MIT) ★ 🟢
- **Qué es:** librería de animación moderna, con muelles físicos (*springs*) muy naturales.
- **Qué aporta:** movimientos con aspecto «de app cara»: rebotes y asentamientos orgánicos. Es una alternativa o complemento de anime.js para escenas con estética tecnológica.
- **Límites:** solapa con anime.js. Bastaría con uno de los dos como base.

### lottie-web (MIT, solo la librería) ★★ 🟢
- **Qué es:** reproduce animaciones vectoriales exportadas de After Effects (formato Lottie).
- **Qué aporta:** permite usar **animaciones Lottie hechas por nosotros o generadas por la IA**: iconos animados (un candado que se cierra, una urna que recibe un voto, un reloj que corre) con calidad de motion designer.
- **Límites:** las animaciones de LottieFiles tienen licencias variadas, así que **solo usamos las propias**. La IA puede generar Lottie sencillos (es JSON), pero los complejos se hacen mejor directamente con SVG + anime.js.

### Rough Notation (MIT) ★★★ 🟢
- **Qué es:** anota texto y elementos como si fuera a mano: subrayados, círculos, recuadros, tachados, resaltados de rotulador.
- **Qué aporta:** es **el recurso documental por excelencia** para leer documentos en pantalla. Al leer una ley, una sentencia o una noticia, se rodea la frase clave mientras la voz la dice. Da sensación de investigación y guía la mirada.
- **Ejemplos:**
  - el artículo 2 de la Constitución con «autonomía de las nacionalidades y regiones» rodeado en rojo;
  - un titular de prensa con la cifra subrayada.
- **Límites:** ninguno relevante.

---

## 3. 3D

### Three.js (MIT) ★★★ 🟡–🔴
- **Qué es:** la librería 3D de referencia en la web.
- **Qué aporta:** **escala y espectacularidad** en los momentos clave:
  - un globo terráqueo que gira hasta el país del que se habla;
  - un hemiciclo en 3D con la cámara volando por encima;
  - barras de datos en 3D;
  - texto monumental flotando;
  - una ciudad de bloques que representa población;
  - cámaras que atraviesan capas de información.
- **Ejemplos:**
  - apertura del vídeo con la Tierra y zoom hasta España;
  - «350 diputados» como 350 esferas que caen y se ordenan en el hemiciclo.
- **Límites:** **sin tarjeta gráfica todo se dibuja por CPU.**
  - Escenas sencillas (decenas o pocos cientos de objetos, materiales simples, sin sombras en tiempo real): 🟡 asumibles.
  - Escenas complejas: 🔴, varias veces más lentas.

  Regla del motor: 3D para **momentos puntuales de pocos segundos**, con presupuesto de geometría.

### postprocessing (Zlib) ★★ 🔴
- **Qué es:** efectos de cine sobre una escena 3D: resplandor (*bloom*), profundidad de campo, viñeta, aberración cromática, grano y *glitch*.
- **Qué aporta:** convierte un 3D correcto en uno **cinematográfico**: un globo con atmósfera brillante, una cifra con halo, un desenfoque que dirige la mirada.
- **Límites:** cada efecto es una pasada más por CPU. Uno o dos efectos y en planos cortos.

### troika-three-text (MIT) ★★ 🟡
- **Qué es:** texto nítido y con cualquier tipografía dentro de escenas 3D.
- **Qué aporta:** rótulos, cifras y nombres integrados en el espacio 3D (el nombre del país sobre el globo, la cifra encima de la barra) sin pixelado.
- **Límites:** depende de Three.js.

### three-globe / globe.gl (MIT) ★★★ 🟡
- **Qué es:** un globo terráqueo listo para cargar datos: países coloreados, puntos, arcos entre ciudades y anillos.
- **Qué aporta:** **la herramienta geográfica más potente para documentales internacionales**:
  - rutas migratorias como arcos;
  - países que se iluminan según un dato;
  - alianzas internacionales;
  - el recorrido de un viaje o de una mercancía.
- **Ejemplos:**
  - «el Pacto Europeo obliga a los 27»: los 27 países se iluminan en el globo;
  - el narcotráfico de Colombia a Honduras como arco animado.
- **Límites:** 🟡 por CPU. Funciona bien con texturas de tierra moderadas (NASA Blue Marble reducida).

### Babylon.js (Apache 2.0) ★ 🔴
- **Qué es:** motor 3D completo, alternativo a Three.js.
- **Qué aporta:** física y materiales avanzados.
- **Límites:** solapa con Three.js. Lo dejaría fuera de la v1 para no duplicar.

---

## 4. 2D, arte generativo y atmósfera

### PixiJS (MIT) ★★ 🟡
- **Qué es:** 2D muy rápido por WebGL. Mueve miles de elementos y aplica filtros (desenfoque, desplazamiento, color).
- **Qué aporta:**
  - **visualizar multitudes y cantidades**: 47 millones de habitantes como puntos que se agrupan por comunidades, el voto de cada provincia como partículas que fluyen al hemiciclo;
  - tratamientos de imagen sobre las fotos reales (barrido de luz, desplazamiento como de papel mojado, duotono).
- **Límites:** por CPU. Miles de elementos sí; cientos de miles no.

### Paper.js (MIT) ★ 🟢
- **Qué es:** dibujo vectorial avanzado: curvas, intersecciones, uniones de formas, trazos que se deforman.
- **Qué aporta:** diagramas que se transforman (un círculo que se divide en 17 comunidades), formas orgánicas y morphing entre siluetas.
- **Límites:** nicho; muchas cosas se pueden hacer directamente con SVG.

### Two.js (MIT) ★ 🟢
- **Qué es:** dibujo 2D sencillo que sirve igual para SVG, Canvas o WebGL.
- **Qué aporta:** ilustración geométrica limpia y rápida (iconografía construida, esquemas).
- **Límites:** solapa con SVG + anime.js. Opcional.

### Rough.js (MIT) ★★★ 🟢
- **Qué es:** dibuja cualquier forma o gráfico **como si estuviera hecho a mano** (trazo de lápiz, relleno a rayas, imperfecto).
- **Qué aporta:**
  - **calidez y cercanía**, ideal para el tono «Documental, cercano» de los canales: diagramas tipo pizarra, mapas mentales, gráficos de barras de cuaderno, flechas que conectan ideas;
  - rompe la sensación de «infografía corporativa»;
  - es muy distintivo y combina con todo.
- **Ejemplo:** el reparto de poderes (Congreso → Senado → Tribunal Constitucional) dibujado como esquema a mano que se va trazando mientras la voz lo explica.
- **Límites:** ninguno.

### tsParticles (MIT) ★★ 🟡
- **Qué es:** partículas configurables: polvo, chispas, confeti, nieve, redes de puntos conectados, burbujas.
- **Qué aporta:** **atmósfera y emoción**:
  - polvo en suspensión en una escena histórica;
  - chispas en un momento de tensión;
  - una red de nodos para hablar de conexiones o redes de influencia;
  - confeti en un resultado electoral.
- **Límites:** 🟡 con muchas partículas. Usado como fondo sutil es ligero.

### Vanta.js (MIT) ★ 🟡
- **Qué es:** fondos animados ya hechos (ondas, niebla, nubes, redes, anillos).
- **Qué aporta:** fondos vivos para titulares y cierres, sin diseñarlos.
- **Límites:** son pocos y se reconocen. Mejor como inspiración para la IA que usados tal cual. Algunos dependen de Three.js.

### Matter.js (MIT) ★ 🟡
- **Qué es:** física 2D: gravedad, choques, apilado, muelles.
- **Qué aporta:** **metáforas físicas** muy explicativas:
  - escaños que caen y se apilan hasta llegar a la mayoría;
  - la balanza fiscal que se inclina de verdad con el peso de las cifras;
  - piezas de dominó de una cadena de consecuencias.
- **Límites:** la física tiene que **precalcularse** para que cada fotograma salga igual. Es un paso más, pero sencillo.

---

## 5. Datos y gráficos

### D3.js (ISC) ★★★ 🟢–🟡
- **Qué es:** la herramienta de referencia para visualizar datos: escalas, ejes, formas y diseños de cualquier gráfico imaginable.
- **Qué aporta:** **cualquier dato del guion convertido en un gráfico a medida**:
  - barras;
  - evolución en el tiempo;
  - carreras de barras (*bar chart race*);
  - redes de relaciones (quién financia a quién);
  - árboles (organigramas);
  - burbujas por tamaño;
  - flujos (Sankey: de dónde sale el dinero y a dónde va);
  - el gráfico de «rosco» de escaños.
- **Ejemplos:** la evolución de escaños de VOX de 2015 a 2023 como líneas que crecen; un Sankey del presupuesto.
- **Límites:** ninguno de licencia. Es la pieza **más importante para la exactitud**: los datos van a la escala real, no a ojo.

### Observable Plot (ISC) ★★ 🟢
- **Qué es:** gráficos rápidos con buen diseño por defecto, construido sobre D3.
- **Qué aporta:** para gráficos «normales» (líneas, barras, puntos) es más corto y fiable que D3 a pelo, así que la IA comete menos errores.
- **Límites:** menos libertad que D3. Se complementan.

### Apache ECharts (Apache 2.0) ★ 🟢
- **Qué es:** gráficos completos y vistosos ya animados (velocímetros, radares, calendarios, mapas de calor, 3D sencillo).
- **Qué aporta:** tipos de gráfico que en D3 costarían mucho: el radar para comparar cinco propuestas, el velocímetro para un índice.
- **Límites:** su estética se reconoce. La IA debe reestilarlos con la paleta del vídeo.

### countUp.js (MIT) ★★★ 🟢
- **Qué es:** números que suben hasta su valor con formato (miles, decimales, moneda).
- **Qué aporta:** **las cifras de impacto**, el recurso más repetido y efectivo del explicativo («176», «12,5 millones», «47 %»), con el formato español correcto (puntos de miles, coma decimal).
- **Límites:** ninguno.

### Mermaid (MIT) ★ 🟢
- **Qué es:** diagramas descritos con texto: flujos, secuencias, organigramas, cronogramas.
- **Qué aporta:** la IA describe un proceso («propuesta → Congreso → Senado → veto → Congreso») y sale un diagrama correcto al instante, que luego se anima.
- **Límites:** su estética por defecto es técnica. Mejor como esqueleto que se redibuja con Rough.js o SVG propio.

---

## 6. Mapas y geografía

### d3-geo + TopoJSON (ISC) ★★★ 🟢
- **Qué es:** proyecciones cartográficas (cómo aplanar la Tierra) y formato compacto de fronteras.
- **Qué aporta:** **mapas exactos y bonitos de cualquier zona**, con zoom, regiones resaltadas, puntos, rutas y coropletas (colorear por dato).
- **Ejemplos:**
  - España por comunidades coloreada por voto;
  - zoom a Ceuta y Melilla;
  - el mapa de Honduras y Colombia con la ruta de la droga;
  - Europa con los países que exigen visado.
- **Límites:** ninguno. Es la base geográfica del motor.

### world-atlas (ISC) y Natural Earth (dominio público) ★★★ 🟢
- **Qué es:** fronteras de todos los países del mundo y de sus regiones principales, ríos, costas y ciudades.
- **Qué aporta:** **las formas reales**, para que la IA nunca dibuje un país de memoria. Natural Earth trae además capitales, ciudades pobladas, lagos y relieve.
- **Límites:** ninguno.

### NASA Blue Marble (dominio público) ★★ 🟢
- **Qué es:** la imagen satélite de la Tierra entera, sin nubes.
- **Qué aporta:** el globo o el mapa **con aspecto real** en vez de colores planos: una apertura «desde el espacio», o regiones vistas como en satélite.
- **Límites:** archivos grandes; se incluye una versión reducida en la imagen del worker. Sin copyright, pero **la NASA pide el crédito** («NASA Earth Observatory»): irá en los créditos de la descripción. No se pueden usar sus logotipos.

### deck.gl (MIT) ★ 🔴
- **Qué es:** visualización de grandes volúmenes de datos sobre mapas: columnas 3D, arcos, mapas de calor y trayectorias.
- **Qué aporta:** el «mapa de datos» espectacular (paro por provincia como columnas 3D que crecen, flujos de migración como arcos).
- **Límites:** 🔴 por CPU. Para planos cortos. Buena parte de lo que hace se consigue con d3-geo + Three.js.

---

## 7. Transiciones

### gl-transitions (MIT) ★★★ 🟡
- **Qué es:** unas 80 transiciones con shaders (fundidos por formas, cortinas, ondas, píxeles, zoom, *glitch*, papel que se quema…).
- **Qué aporta:**
  - **variedad real entre escenas** sin repetir la misma transición (uno de los problemas que vimos en las auditorías: «transiciones 75 %», todas iguales);
  - la IA elige la que encaja con la idea: una onda para «se expande», un corte de píxeles para «tecnología» o una cortina para «se revela».
- **Límites:** 🟡 en cada corte. Con duraciones cortas (0,4–0,8 s) apenas se nota.

---

## 8. Iconos, banderas, ilustraciones y tipografías

### Lucide (ISC), Tabler Icons (MIT), Phosphor (MIT), Material Symbols (Apache 2.0) ★★★ 🟢
- **Qué es:** decenas de miles de iconos vectoriales en varios estilos (línea fina, relleno, duotono).
- **Qué aporta:**
  - **conceptos al instante**: justicia (balanza), sanidad (corazón), educación (birrete), inmigración (pasaporte), economía (gráfico), seguridad (escudo);
  - usar **cuatro colecciones** con estilos distintos da variedad entre vídeos: un vídeo con iconos de línea fina, otro con duotono;
  - en vídeo se pueden animar trazo a trazo.
- **Límites:** ninguno.

### flag-icons (MIT) ★★★ 🟢
- **Qué es:** las banderas de todos los países (y de algunas regiones) en SVG exacto.
- **Qué aporta:** **banderas correctas siempre**, para comparativas entre países, el país del que se habla o las delegaciones de una cumbre. Evita banderas inventadas o desfasadas.
- **Límites:** las banderas autonómicas españolas no vienen todas y habría que completarlas aparte con SVG de dominio público.

### Noto Emoji (Apache 2.0 / OFL) ★ 🟢
- **Qué es:** el conjunto completo de emojis de Google en vectorial.
- **Qué aporta:** emojis consistentes en cualquier máquina, para canales de estilo más informal o tarjetas de redes sociales.
- **Límites:** en documentales serios, poco uso.

### Open Peeps y Humaaans (CC0) ★★ 🟢
- **Qué es:** personajes ilustrados combinables por piezas: posturas, ropa, peinados, expresiones.
- **Qué aporta:** **representar a «la gente»** sin fotos de stock ni personas reales: el votante indeciso, el trabajador, el inmigrante, el jubilado, en estilo ilustración. Encaja de maravilla con Rough.js y con el tono cercano, y sustituye a ese stock genérico extranjero que tanto ha fallado.
- **Ejemplo:** «Para unos es una corrección necesaria; para otros, un retroceso»: dos grupos de personajes ilustrados, cada uno en un lado de la pantalla.
- **Límites:** su estilo es reconocible. La IA debe variar colores y composición.

### Google Fonts / Fontsource (OFL) ★★★ 🟢
- **Qué es:** unas 1.700 tipografías, descargables para ir en local.
- **Qué aporta:**
  - **la tipografía es la mitad de la personalidad de un vídeo**: una serif clásica para un documental histórico, una condensada y contundente para política, una manuscrita para un tono íntimo;
  - con cientos donde elegir, la dirección de arte de cada vídeo puede ser única.
- **Límites:**
  - Hay que **preseleccionar unas 60–100** de calidad y con acentos y ñ completos, para que la IA no elija fuentes malas.
  - Casi todas son OFL, pero hay algunas Apache 2.0 o Ubuntu Font Licence: se revisa cada familia elegida.

---

## 9. Texturas, 3D y materiales

### Poly Haven y ambientCG (CC0) ★★ 🟢
- **Qué es:** texturas fotográficas de altísima calidad (papel, cartón, hormigón, metal, madera, tela) e iluminaciones 360° (HDRI) para 3D.
- **Qué aporta:**
  - **materialidad**: documentos sobre papel envejecido, titulares sobre cartón, una cifra grabada en piedra, fondos de hormigón para un tono duro;
  - en 3D, las iluminaciones dan reflejos realistas sin modelar luces;
  - es lo que separa una infografía plana de un **documental con textura**.
- **Límites:** archivos grandes. Se incluye una selección (unas 40–60 texturas) en resolución moderada.

### Kenney y Quaternius (CC0) ★ 🟡
- **Qué es:** miles de modelos 3D y 2D sencillos (edificios, vehículos, mobiliario urbano, objetos) en estilo low-poly.
- **Qué aporta:** **maquetas 3D de situaciones**: una ciudad, una frontera con una valla, un puerto con contenedores, un aula. Sirve para explicar sin fotos.
- **Límites:** estilo low-poly reconocible, que va mejor con canales de tono divulgativo o juvenil.

---

## 10. Audio

### Tone.js (MIT) ★★★ 🟢
- **Qué es:** un estudio de música por código: sintetizadores, samplers, ritmos, efectos (reverb, delay) y **render offline a archivo**.
- **Qué aporta:**
  - **una banda sonora compuesta para cada vídeo**, sin Content ID (el problema de Storyblocks queda resuelto de raíz);
  - la IA decide tonalidad, tempo e instrumentación según el tono del guion (tensión, esperanza, misterio), y sube o baja la intensidad en los momentos clave;
  - jamás se repite entre vídeos.
- **Límites:** la calidad depende de los sonidos que le demos. Con sintetizadores puros suena a «electrónica»; con **muestras CC0 de instrumentos** (pianos, cuerdas, percusión), mucho más natural. Hay que preparar ese banco de muestras una vez.

### ZzFX y jsfxr (MIT) ★★ 🟢
- **Qué es:** generadores de efectos de sonido por parámetros (golpes, pops, whoosh, notificaciones, risers).
- **Qué aporta:** **un efecto para cada animación**, generado al momento y sutilmente distinto en cada vídeo: el *pop* de la tarjeta, el golpe del sello o el *tic-tic* del contador.
- **Límites:** suenan sintéticos, lo cual es perfecto para motion graphics. Para sonidos realistas (papel, multitud), la siguiente fila.

### Kenney audio y Freesound (solo lo marcado CC0) ★★ 🟢
- **Qué es:** efectos grabados reales: papel, máquina de escribir, cámara de fotos, multitudes, ambientes de calle, campanas.
- **Qué aporta:** **realismo documental**: el sonido de pasar páginas al leer un documento, el murmullo de un parlamento, el obturador cuando aparece una foto.
- **Límites:**
  - Hay que descargarlos una vez y guardarlos en la imagen.
  - En Freesound, filtrar **estrictamente CC0**: su filtro «Free Cultural Works» mezcla CC0 y CC-BY. Descargar exige cuenta.
  - Kenney: revisar el `License.txt` de cada pack de audio.

---

## 11. Tratamiento de fotos reales

### rembg (MIT) ★★★ 🟡
- **Qué es:** recorta personas u objetos y les quita el fondo con IA, en local y por CPU.
- **Qué aporta:**
  - **las personas del documental integradas en el diseño**: el político recortado sobre el fondo del vídeo, junto a sus cifras;
  - dos personas enfrentadas en una comparativa;
  - una figura delante del mapa.
  - Da un salto enorme de calidad frente a la foto en un recuadro.
- **Límites:**
  - 🟡 Unos segundos por foto, que se hacen en la preparación, no en el render.
  - ⚠️ **Su modelo por defecto (bria-rmbg 2.0) NO permite uso comercial sin contrato.** Se fija siempre `birefnet-general` (MIT) o `isnet-general-use`/`u2net` (Apache 2.0).
  - Los modelos se meten en la imagen, para que no los descargue en marcha.

### Real-ESRGAN (BSD) ★★★ 🟡
- **Qué es:** amplía imágenes ×2 o ×4 recuperando detalle con IA, en local.
- **Qué aporta:** **resuelve las fotos pequeñas** (las de 450–700 px que hoy se tiran o se ven blandas). Una foto de Google de 600 px pasa a verse limpia a pantalla completa, y sirve también para el motor actual.
- **Límites:**
  - 🟡 Por CPU tarda unos segundos por foto, en la preparación.
  - En caras puede inventar algún detalle: aplicar con moderación (×2) y no en primeros planos extremos.
  - El código es BSD-3. **Los pesos no declaran licencia aparte**: riesgo bajo, pero se confirma antes de usarlo.

### smartcrop.js (MIT) ★★ 🟢
- **Qué es:** decide el mejor encuadre de una foto (dónde está lo interesante) para recortarla a cualquier proporción.
- **Qué aporta:** recortes que **no cortan cabezas**: la foto vertical en la pantalla dividida, el retrato en un círculo o la miniatura de una tarjeta.
- **Límites:** es heurístico. Combinado con detección de caras, acierta casi siempre.

### MediaPipe, detección de caras (Apache 2.0) ★★ 🟢
- **Qué es:** detecta caras y puntos de la cara en una imagen, en local.
- **Qué aporta:**
  - encuadres centrados en la persona;
  - un zoom lento que acaba en su cara;
  - un rótulo con el nombre colocado sin tapar la cara;
  - comprobar que en la foto **hay** una persona (útil para el juez de «persona equivocada»).
- **Límites:**
  - Solo detecta caras, no reconoce **quién** es (y no debe: eso lo resuelven la búsqueda y el juez).
  - El código es Apache 2.0, pero **la licencia del modelo de caras (BlazeFace) está por confirmar** en su ficha.
  - El WASM y el modelo se alojan en local, porque por defecto los carga de un CDN de Google.

---

## 12. Resumen por prioridad

| Prioridad | Recursos |
|---|---|
| ★★★ Imprescindibles (v1) | HyperFrames, anime.js, Rough Notation, Three.js, globe.gl, Rough.js, D3.js, countUp.js, d3-geo + TopoJSON, world-atlas + Natural Earth, gl-transitions, Lucide/Tabler/Phosphor/Material, flag-icons, Fontsource (selección), Tone.js, rembg, Real-ESRGAN |
| ★★ Muy útiles | Catálogo de HyperFrames, lottie-web, postprocessing, troika-three-text, PixiJS, tsParticles, Observable Plot, NASA Blue Marble, Open Peeps/Humaaans, Poly Haven/ambientCG, ZzFX/jsfxr, efectos CC0, smartcrop.js, MediaPipe |
| ★ Opcionales | Motion, Paper.js, Two.js, Vanta.js, Matter.js, ECharts, Mermaid, deck.gl, Noto Emoji, Kenney/Quaternius, Babylon.js |

## 13. Recetas: qué herramienta para qué momento del documental

| Momento del guion | Combinación |
|---|---|
| Una cifra de impacto | countUp.js + tipografía contundente + un golpe (ZzFX) + partículas sutiles |
| Evolución o comparación de datos | D3/Observable Plot, con Rough.js si el tono es cercano y Rough Notation para el dato clave |
| ¿Dónde pasa? | d3-geo + Natural Earth (mapa) o globe.gl (globo) con zoom al lugar; flag-icons si es un país |
| ¿Quién es? | Foto real → rembg (recorte) → Real-ESRGAN si es pequeña → MediaPipe para el encuadre, sobre fondo con textura (Poly Haven) |
| Leer un documento, una ley o una noticia | Textura de papel + texto con tipografía de imprenta + Rough Notation subrayando mientras se lee + sonido de página (CC0) |
| Una idea abstracta | Iconos animados trazo a trazo + metáfora física (Matter.js) o diagrama a mano (Rough.js) |
| «La gente», «los votantes» | Open Peeps/Humaaans en grupos, o puntos y partículas (PixiJS) que se agrupan |
| Una secuencia en el tiempo | Línea de tiempo dibujada (anime.js + SVG) con hitos que se encienden |
| Un proceso o una cadena de causas | Mermaid como esqueleto → redibujado con Rough.js, o dominó con Matter.js |
| Apertura o momento épico | Three.js (globo, cámara volando, texto monumental) + postprocessing + riser de Tone.js |
| Cambio de bloque | gl-transitions elegida según el sentido del cambio |
| Atmósfera de fondo | Textura de Poly Haven + grano + partículas tenues + pad de Tone.js |

## 14. Verificación de licencias (13-10-2026)

Comprobadas en npm, en el `LICENSE` de cada repositorio y en las webs oficiales.

### ✅ Confirmadas: comercial, sin atribución y offline

anime.js, Motion (sin los extras de pago Motion+), lottie-web, Rough Notation, Rough.js, three.js, postprocessing (Zlib), troika-three-text, three-globe, globe.gl, Babylon.js, PixiJS, Paper.js, Two.js, tsParticles, Vanta.js, Matter.js, D3, Observable Plot (ISC), ECharts, countUp.js, Mermaid, topojson-client, world-atlas (ISC), Natural Earth (dominio público), deck.gl, gl-transitions, Lucide (ISC), Tabler Icons, Phosphor, Material Symbols, flag-icons, Noto Emoji, Open Peeps, Humaaans, Poly Haven, ambientCG, Kenney, Quaternius (CC0), Tone.js, ZzFX (MIT), jsfxr (Unlicense), smartcrop.js.

gl-transitions: de sus 125 transiciones, 123 son MIT, 1 es BSD-2 y 1 es BSD-3 (se conserva su aviso).

### ⚠️ Usables con condiciones

| Recurso | Condición |
|---|---|
| HyperFrames | Apache 2.0. Desactivar la telemetría (`HYPERFRAMES_NO_TELEMETRY=1`) y conservar el fichero NOTICE |
| Catálogo de HyperFrames | Solo como referencia: depende de GSAP y de CDN |
| rembg | Código MIT. **Prohibido su modelo por defecto (bria-rmbg)**; usar `birefnet-general` (MIT) o `u2net`/`isnet` (Apache 2.0) |
| Real-ESRGAN | Código BSD-3; pesos sin licencia declarada (riesgo bajo, por confirmar) |
| MediaPipe | Código Apache 2.0; licencia del modelo de caras por confirmar; alojar los ficheros en local |
| NASA Blue Marble | Sin copyright, pero la NASA pide crédito en la descripción |
| es-atlas | Código MIT; **datos del IGN con CC BY 4.0**: atribución obligatoria («© IGN») |
| Fontsource / Google Fonts | Revisar la licencia de cada familia seleccionada |
| Freesound | Solo sonidos CC0, filtrados uno a uno |
| Dependencias de red | Copiar a la imagen los modelos, el WASM, las texturas y las fuentes que algunas librerías cargan por URL. Nada se descarga durante el render |

### ❌ Descartado: GSAP

Es gratis para uso comercial (incluidos SplitText y MorphSVG), pero su licencia **no es libre**. Prohíbe usarlo, sin permiso escrito de Webflow, en *«tools that allow users to build visual animations without code»* que compitan con Webflow. Un generador de vídeos animados para clientes podría entrar en esa definición, y Webflow puede cambiar la licencia o revocarla en cualquier momento. **El motor usará anime.js**: HyperFrames admite otros motores de animación mediante un adaptador de reloj.

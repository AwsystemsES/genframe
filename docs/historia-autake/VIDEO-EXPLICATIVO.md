# Vídeo explicativo (motor HyperFrames)

Estado: diseño cerrado, desarrollo sin empezar (08-10-2026).

## 1. Qué es

Un **tipo de vídeo nuevo**, «Vídeo explicativo». A diferencia del documental con material de stock, **la imagen la genera nuestro código**: escenas animadas de infografía (cifras, mapas, gráficos, tarjetas, comparativas, líneas de tiempo…). Cuando aporta algo, se suman **fotos reales** (por ejemplo, una pantalla dividida con la persona de la que se habla o una foto de fondo).

El cliente escribe el guion como siempre y, si quiere, unas **instrucciones de estilo** cortas («telediario serio, pantalla dividida con el presidente a la derecha, música ambiente»). Todo lo demás lo hace el motor.

Lo renderiza **HyperFrames** (HeyGen, Apache 2.0): cada escena es una página HTML con animaciones GSAP que un Chrome sin ventana captura fotograma a fotograma, y FFmpeg une las capturas en el MP4. Es otro motor de render, independiente del de Remotion que usan los demás tipos.

Prototipo de referencia, ya validado por ti: vídeo de VOX con mayoría absoluta (`~/Downloads/hyperframes-vox/vox-mayoria-absoluta-v2.mp4`, 4:12, renderizado en unos 2 min).

## 2. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Nombre | «Vídeo explicativo» |
| Precio | Los mismos créditos por minuto que el resto de tipos |
| Dónde aparece | Solo donde el `.env` lo active (`VIDEO_TYPE_EXPLAINER=true`): **Cayman sí, Autake no**. Desactivado, no aparece en el selector ni en el panel, sus rutas dan 404 y el backend rechaza sus trabajos |
| Render | En las **mismas máquinas Hetzner que se alquilan** (la flota). La imagen del worker lleva HyperFrames **en las dos instalaciones**: Autake la tiene preparada pero no la usa |
| Alcance v1 | Infografía + maquetas con fotos reales + instrucciones de estilo |
| Control | La IA **nunca escribe HTML**: rellena una ficha de dirección con piezas de nuestro catálogo |
| Personas reales | Solo en foto o recorte estático. Nunca se anima su cara ni se clona su voz |
| Música y efectos | Sintetizados por nosotros: sin licencias y sin riesgo de Content ID |

## 3. Cómo funciona: tres capas

| Capa | Quién la controla | Qué contiene |
|---|---|---|
| **1. Motor** | Nosotros, en código | Catálogo de escenas y maquetas en HTML+GSAP, transiciones, audio, tipografías, reglas de calidad (legibilidad, tiempos mínimos, nada repetido, personas solo en foto) |
| **2. Perfil de estilo** | Nosotros definimos los mandos | Unos 15–20 mandos cerrados: maqueta base, tono visual, ritmo, transiciones, música, efectos, estilo de subtítulos, densidad de gráficos, colores (de Personalización) |
| **3. Instrucciones** | El cliente | Texto corto y libre (máx. ~500 caracteres) más botones rápidos («Telediario», «Documental», «Viral», «Infografía», «Pantalla dividida», «Sin música») |

### IA intérprete

Lee las instrucciones y las convierte en **perfil + reglas**. Solo puede mover los mandos que existen. Lo que no se puede hacer se descarta y se le explica al cliente.

Ejemplo de entrada: «Estilo telediario serio. Pantalla dividida con el presidente a la derecha cuando se hable de él. Música ambiente suave. Cuando se mencione un país, que salga en el mapa. Nada de efectos llamativos.»

```json
{
  "perfil": {"maqueta_base": "pantalla_completa", "tono": "noticiario", "ritmo": "pausado",
             "transiciones": "suaves", "musica": {"estado": "ambiente", "intensidad": "baja"},
             "efectos_sonido": "discretos", "subtitulos": "palabra_activa", "densidad_graficos": "media"},
  "reglas": [
    {"cuando": "se habla de la persona", "persona": "Presidente del Gobierno", "maqueta": "pantalla_dividida", "lado": "derecha"},
    {"cuando": "se menciona un país", "escena": "mapa"}
  ],
  "descartado": []
}
```

El cliente ve un resumen en lenguaje normal, **«Así lo hemos entendido»**, con avisos de lo descartado. Puede guardar el resultado como **estilo de su canal** para no reescribirlo. Si deja el cuadro vacío, se usa el estilo por defecto y el vídeo sale bien igualmente.

### IA director

Con el guion, los tiempos de cada palabra, el perfil y las reglas, escribe la **ficha de dirección**: para cada tramo del guion, qué escena del catálogo, con qué maqueta y con qué datos (textos, cifras, regiones del mapa, personas). El backend la **valida contra el esquema** y sustituye cualquier pieza inválida por la más parecida del catálogo.

### Compilador (en el worker)

Convierte la ficha en un proyecto HyperFrames (HTML + GSAP + fuentes + fotos + audio) sincronizado con la voz palabra a palabra, y lo renderiza.

## 4. Flujo de una generación

| Etapa | Qué pasa | ¿Nuevo? |
|---|---|---|
| Crear, cobrar, cola | Igual que ahora (mismos créditos y prioridad) | No |
| Voz | ElevenLabs, como ahora | No |
| Alineación | Tiempos de cada palabra, como ahora | No |
| **Planificación del explicativo** | Intérprete → director → ficha validada → fotos de las maquetas (Google vía Content Proxy, con juez y moderación) | **Sí** (sustituye a la selección de stock) |
| **Render** | La máquina de la flota reclama el trabajo, compila la ficha, renderiza con HyperFrames y mezcla el audio | **Sí** (nuevo tipo de trabajo) |
| Subida y entrega | El canal de siempre (ticket de subida, verificación y fin) | No |
| Revisión | **No en la v1**: el vídeo se entrega terminado, sin editor por escenas | — |

## 5. Capacidades de la v1

**Escenas del catálogo** (todas con variables, colores de la marca y animación propia):
- titular y pregunta;
- contador grande;
- hemiciclo o reparto de escaños;
- mapa de España por comunidades y mapa del mundo por países, con resaltado y zoom;
- barras horizontales y verticales con umbrales;
- comparativa A frente a B;
- lista con ✓/✗;
- tarjetas con iconos (más de 2.000 iconos Lucide, MIT);
- sello («REFORMABLE», «DESCARTADO»…);
- cita textual;
- línea de tiempo;
- pasos numerados;
- grupo de personas o instituciones (como los 12 magistrados);
- balanza;
- cierre con llamada a comentar.

**Maquetas:**
- pantalla completa;
- **pantalla dividida** con la foto de una persona a un lado y la escena al otro, la foto a sangre (como `object-fit: cover`);
- **foto de fondo** desenfocada y oscurecida con la escena encima.

**Acabado:**
- subtítulos con la palabra activa resaltada;
- capítulo en pantalla y barra de progreso;
- transiciones de luz o desenfoque;
- acercamiento lento de cámara;
- grano sutil y viñeta.

**Audio:**
- voz de ElevenLabs;
- música sintetizada por estado de ánimo, que baja sola bajo la voz;
- unos 10 efectos sintetizados, sincronizados con cada animación (pop, ding, golpe, whoosh, riser…);
- volumen final a −14 LUFS, el de YouTube.

**Formatos:** 16:9 a 1080p y 30 fps. El 4K es posible con HyperFrames, con más tiempo de render.

## 6. Limitaciones de la v1

- **Sin editor de revisión:** el cliente no puede cambiar escenas sueltas. Puede regenerar el vídeo cambiando el guion o las instrucciones.
- **Sin vídeo real** (clips de stock o de X) dentro del explicativo; solo fotos. Se puede añadir en la v2 (HyperFrames admite `<video>`).
- **Catálogo cerrado:** lo que pida el cliente fuera del catálogo se descarta con aviso. Las escenas a medida escritas por la IA quedan para una versión posterior, con validación automática.
- **Sin vertical (Shorts)** en la v1: el catálogo se diseña en 16:9. El 9:16 pide adaptar cada escena.
- **Música sencilla:** al ser sintetizada, es un fondo correcto pero no una banda sonora rica. Si se quiere más, la opción sin Content ID es Eleven Music.
- **Personas reales solo en foto**, por ley y por las normas de YouTube sobre contenido sintético.
- **Dependencias:** HyperFrames es un proyecto joven, con versiones casi diarias. **Fijamos la versión** (hoy la 0.8.140) y la subimos solo después de probarla.

## 7. ¿Dónde se renderiza?

| Opción | Veredicto | Por qué |
|---|---|---|
| **Flota Hetzner bajo demanda (CPX42, 8 vCPU, 16 GB)** | ✅ **Elegida** | Ya existe, se paga por hora y escala con la demanda. HyperFrames reparte la captura en varios Chrome (unos 256 MB cada uno) y en Linux envía los fotogramas a FFmpeg sin escribirlos en disco |
| Servidor de la propia instalación (Cayman: 2 vCPU, 7,5 GB) | ❌ | Renderizar ocupa toda la CPU durante minutos: la web, Horizon y la cola de los demás vídeos se quedarían sin aire. Además no tiene Chrome ni FFmpeg y no escala |
| Máquina fija de operaciones (CX23, 2 vCPU, 4 GB) | ❌ | Demasiado pequeña: unas 4 veces más lenta que una CPX42 y sin memoria para varios Chrome |
| Nube de HeyGen | ❌ | De pago por minuto, saca el material a un tercero y nos ata a su servicio |
| AWS Lambda / Cloud Run | ❌ por ahora | HyperFrames lo soporta, pero sería otra infraestructura que mantener; la flota ya hace ese papel |

**Velocidad esperada:** en un Mac de 12 núcleos, el prototipo de 4:12 se renderizó en unos 2 minutos con 6 procesos. En una CPX42 calculo que irá a tiempo real o algo mejor: un vídeo de 20 min en unos 15–25 min, parecido a lo que tarda hoy Remotion. **Se mide en la F1** con el vídeo de VOX en una máquina real antes de seguir. Como no hay material que buscar ni descargar, el tiempo total desde que se pulsa «Generar» debería bajar mucho (hoy la selección se lleva 20–30 min).

**Qué lleva la imagen del worker (-60):**
- la CLI de HyperFrames con la versión fijada;
- su `chrome-headless-shell` de Linux;
- las fuentes del catálogo;
- el compilador de fichas (`resources/js/hyperframes/`).

FFmpeg y Node 22 ya están. La imagen crecerá unos 300–500 MB. Hace falta **snapshot nuevo en las dos cuentas de Hetzner**, y la imagen se activa **antes** que el backend, como siempre.

## 8. Fases

### F0 · Interruptor y tipo (backend, sin imagen)
- `config/autake.php`: `'video_type_explainer' => (bool) env('VIDEO_TYPE_EXPLAINER', false)`.
- Migración: tipo `explainer`, «Vídeo explicativo». `VideoTypes::active()` y `keys()` lo ocultan con el interruptor apagado; con él apagado, las rutas y los trabajos del explicativo dan 404 o se rechazan.
- Proyecto: con este tipo elegido aparecen **«Instrucciones de estilo»** (cuadro + botones rápidos). Se guardan en `settings.style_instructions`.
- `NarratedGeneration::submit()`: congela `snapshot.engine = 'hyperframes'`.
- Tras la alineación (`AudioAlignmentDelivery`), si el motor es HyperFrames, pasa a la etapa `explainer_planning` en lugar de ir a la selección de stock. En F0 esa etapa todavía no hace nada: deja el vídeo parado con un aviso claro.
- Tests: interruptor apagado y encendido, selector, validación, desvío de etapa, que Autake no cambia.
- **Hecho cuando:** en local, con `VIDEO_TYPE_EXPLAINER=true` se puede crear un explicativo que llega con voz y alineación hasta la etapa nueva; con el interruptor apagado, nada visible cambia.

### F1 · Motor en el worker (imagen -60 y snapshot)
- `resources/js/hyperframes/`: catálogo de escenas (partiendo de las del prototipo), maquetas, compilador ficha → proyecto, subtítulos, audio sintetizado y mezcla, y llamada a `hyperframes render`.
- Nuevo tipo de trabajo en `worker.mjs` (`renderer: 'hyperframes'`), con progreso, subida y fin por el canal de siempre.
- Pruebas en local con una **ficha escrita a mano** (el vídeo de VOX) y medición en una CPX42.
- **Hecho cuando:** la ficha de VOX sale idéntica al prototipo v2 en una máquina de la flota, y conocemos su tiempo de render.

### F2 · Intérprete, director y material
- Esquema cerrado de mandos y escenas (PHP, validado).
- IA intérprete con «Así lo hemos entendido» y estilos guardados por canal.
- IA director, que produce la ficha por tramos del guion.
- Fotos de las maquetas (persona y fondo) con Content Proxy, juez y moderación.
- **Hecho cuando:** un guion real con instrucciones produce una ficha válida y con sentido, y las fotos son de quien tienen que ser.

### F3 · Integración y prueba real
- `RenderDispatch`: reclamar trabajo y validar el manifiesto del explicativo; versión mínima del worker (`WorkerCompatibility::MIN_BUILD['hyperframes'] = 60`).
- Reintentos, cobro, diagnóstico y telemetría del explicativo.
- Prueba completa en Cayman con 2–3 guiones reales.
- **Hecho cuando:** un cliente de Cayman genera un explicativo de principio a fin sin intervención.

## 9. Dónde se engancha en el código

- Tipos: `app/Models/VideoType.php`, `app/Services/VideoTypes.php` (`active()`, `keys()`, caché de 10 min), selector en `resources/views/livewire/client/project-editor.blade.php` y `ProjectEditor::chooseContentType()`.
- Arranque: `app/Services/NarratedGeneration.php` (`submit()`, snapshot, `pilot_mode`).
- Tras la alineación: `app/Services/Tts/AudioAlignmentDelivery.php` (hoy pasa siempre a `visual_planning`).
- Render: `app/Services/RenderDispatch.php` (`claim()`, `validatedManifest()` solo acepta la composición `AutakeVideo`), `app/Services/WorkerCompatibility.php`.
- Worker: `resources/js/remotion/worker.mjs` (`processJob`, `lightHandlers`), `staging.mjs`, `manifest.mjs` (solo acepta `AutakeVideo`), `deploy/remotion/Dockerfile`.
- Entrega: `GenerationLifecycle::complete()` abre la revisión solo si hay `render.props.shots`; sin ellos el vídeo pasa directo a completado, que es lo que queremos en la v1.

## 10. Riesgos y cómo los cubrimos

| Riesgo | Cobertura |
|---|---|
| Hay listas que solo conocen los modos `narrated_title` y `narrated_stock` (reintentos, TTS) | Se mantiene `pilot_mode = narrated_stock` y el motor va en un campo aparte (`snapshot.engine`) |
| Los reintentos dan por hecho que hay material de stock | Punto de reanudación propio del explicativo (F3) |
| Las validaciones del manifiesto, en el backend y en el worker, solo aceptan `AutakeVideo` | Validación propia del explicativo en los dos lados (F1/F3) |
| HyperFrames cambia a menudo | Versión fijada en la imagen; se sube solo tras probarla |
| Tiempo de render en las CPX42 sin medir | Medición en la F1 antes de seguir |
| La IA director puede hacer fichas pobres o incoherentes | Esquema cerrado, validación, plantilla de respaldo, y pruebas con guiones reales en la F2 |

## 11. Qué hace falta para empezar

1. **Rama limpia:** la carpeta tiene cambios sin guardar de `feature/novedades`. Hay que hacer commit o terminarlos antes de abrir `feature/video-explicativo`.
2. **Un guion real de Cayman** del tipo que queráis producir, para las pruebas de F2/F3.
3. Para la medición de la F1: permiso para arrancar una CPX42 de prueba en la cuenta de Hetzner (unos céntimos por hora).

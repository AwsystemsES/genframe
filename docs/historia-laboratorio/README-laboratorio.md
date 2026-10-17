# Laboratorio del vídeo explicativo

Proyecto local para probar y depurar el motor generativo de vídeo explicativo (HyperFrames) antes de pasarlo a Autake/Cayman. No está en git ni toca la app.

## Arrancar

```bash
source ~/Downloads/explicativo-lab/entorno.sh
```

El entorno pone `ffmpeg` y `ffprobe` en el PATH, desactiva la telemetría de HyperFrames (`HYPERFRAMES_NO_TELEMETRY=1`) y crea el atajo `hf` para la CLI de HyperFrames 0.8.150. La versión está fijada.

## Carpetas

| Carpeta | Contenido |
|---|---|
| `bin/` | ffmpeg 6.0 y ffprobe (estáticos) |
| `engine/` | `package.json` del motor: HyperFrames y todas las librerías (anime.js, Motion, lottie-web, Rough Notation, Three.js, postprocessing, troika, three-globe, globe.gl, PixiJS, Paper.js, Two.js, Rough.js, tsParticles, Matter.js, D3, Observable Plot, ECharts, countUp, Mermaid, topojson, world-atlas, es-atlas, gl-transitions, Lucide, Tabler, Phosphor, Material Symbols, flag-icons, Tone.js, ZzFX, jsfxr, onnxruntime-node, smartcrop, MediaPipe) y 62 tipografías de Fontsource (60 OFL y 2 Apache 2.0) |
| `assets/geo/natural-earth/` | Países, regiones, ciudades, costas, ríos, lagos y océanos (dominio público) |
| `assets/earth/` | La Tierra de día (Blue Marble) y de noche (Black Marble), de la NASA. Crédito «NASA Earth Observatory» |
| `assets/textures/` | Unas 50 texturas CC0 de Poly Haven y ambientCG: hormigón, yeso, madera, tela, metal, roca, ladrillo, papel, cartón… |
| `assets/hdri/` | 8 iluminaciones 360° de Poly Haven (CC0) para 3D |
| `assets/audio/kenney/` | Efectos de sonido CC0: interfaz, impactos, digital, RPG (papel, puertas, monedas…) |
| `assets/models3d/kenney/` | Modelos 3D CC0: ciudad comercial, carreteras y coches |
| `assets/samples/vsco2-ce/` | Instrumentos reales CC0 (VSCO 2 Community Edition): teclados, cuerdas y percusión, para la música de Tone.js |
| `assets/illustrations/` | **Vacía:** Open Peeps y Humaaans solo se descargan desde Figma o Gumroad, a mano |
| `models/` | IA en local: `birefnet-general-lite.onnx` (recorte de personas, MIT), `isnet-general-use.onnx` (recorte, Apache 2.0), `realesrgan/` (ampliar fotos ×2/×4, BSD) y `blaze_face_short_range.tflite` (caras, Apache 2.0) |
| `pruebas/` | Composiciones de prueba (`humo/`: prueba de humo) |
| `renders/` | Vídeos resultantes |
| `scratch/` | Logs y scripts de descarga |

## Comprobado

- `hf doctor`: Node 22, ffmpeg, ffprobe y Chrome headless (que HyperFrames descarga en `~/.cache/hyperframes/`).
- Prueba de humo (`pruebas/humo/`, 6 s, renderizada en 5,3 s): contador con anime.js, barras a escala real con D3, globo Three.js con la textura de la NASA, tipografías locales e icono de Lucide.
- Para anime.js, la línea de tiempo se crea con `autoplay: false` y se añade a `window.__hfAnime`; HyperFrames la mueve fotograma a fotograma. Para Three.js, se dibuja con `window.__hfThreeTime` en cada evento `hf-seek`. La raíz lleva `data-no-timeline` (no hay GSAP).
- Real-ESRGAN: amplía de 220 a 880 px en local.

## Reglas

- **Nada de GSAP** (licencia no libre): anime.js o Motion.
- **rembg**: nunca su modelo por defecto bria-rmbg (no comercial). Usar los de `models/`.
- **Todo en local**: ninguna composición carga nada de internet.
- **Créditos obligatorios en la descripción**: «© IGN» si se usan datos de es-atlas; «NASA Earth Observatory» si sale la Tierra de la NASA.

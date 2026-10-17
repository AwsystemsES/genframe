# genframe

Estudio de vídeos explicativos generados por código: escenas 2D y 3D programadas para cada vídeo, sin fotos ni material de archivo. **Claude** (con la skill `genframe`) hace de director, guionista visual, modelador, programador de escenas y juez. Esta herramienta pone la voz con **ElevenLabs**, monta el proyecto con **HyperFrames**, hace fotos para revisar, compone y mezcla el audio y renderiza el MP4.

## Instalación

Requisitos:
- **Node.js 20 o superior.**
- **`ffmpeg` y `ffprobe`:** `brew install ffmpeg`, o la ruta en el `.env`.
- **`python3` con `numpy`:** `pip3 install numpy`.

```bash
git clone git@github.com:AwsystemsES/genframe.git
cd genframe
npm install                 # dependencias, Three.js empaquetado y el Chrome de HyperFrames
cp .env.example .env        # y pon tu ELEVENLABS_API_KEY
npm run instalar-skill      # opcional: la skill disponible desde cualquier proyecto de Claude Code
```

## Uso

Abre Claude Code en esta carpeta, o en cualquiera si instalaste la skill, y pídele un vídeo: «hazme un short vertical de 1 minuto sobre el Día D con este guion…». Claude sigue el flujo de `.claude/skills/genframe/SKILL.md`:
1. voz;
2. dirección de arte;
3. reparto fabricado y revisado pieza a pieza;
4. escenas revisadas fotograma a fotograma;
5. sonido;
6. render.

También puedes usar la herramienta a mano: `node bin/genframe.mjs` lista los comandos.

## Estructura

| Ruta | Qué es |
|---|---|
| `bin/genframe.mjs` | Herramienta de línea de comandos. |
| `src/kit/kit.js` | Caja de herramientas 2D (`K`): sincronía con la voz, formas, iconos, banderas, mapas reales, animación. |
| `src/kit/world3d.js` | Mundo 3D (`K.world3d`): mapa extruido, mar con olas, costa, nubes, luz y encuadre automático. |
| `src/kit/gen.js` | Generadores procedurales del taller (`f.gen.human`, `f.gen.hull`). |
| `src/assemble.mjs` | Monta el proyecto HyperFrames. |
| `src/audio.py` | Música compuesta, efectos, ambientes y mezcla a −14 LUFS. |
| `assets/` | Recursos libres (ver `assets/LICENCIAS.md`). |
| `.claude/skills/genframe/` | La skill y sus manuales. |
| `proyectos/` | Tus vídeos (no se suben al repositorio). |

## Licencias

Todo lo que usa el motor permite el uso comercial; detalle en `assets/LICENCIAS.md`. Si un vídeo usa los mapas de España por comunidades, hay que citar «© IGN».

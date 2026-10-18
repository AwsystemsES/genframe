# genframe

Estudio de vídeos explicativos generados por código: escenas 2D y 3D programadas para cada vídeo, sin fotos ni material de archivo. **Claude** (con la skill `genframe`) hace de director, guionista visual, modelador, programador de escenas y juez. Esta herramienta pone la voz con **ElevenLabs**, monta el proyecto con **HyperFrames**, hace fotos para revisar, compone y mezcla el audio y renderiza el MP4.

## Instalación en un ordenador nuevo

### Requisitos

- **Acceso al repositorio:** es privado. Hace falta invitación en GitHub o una clave de despliegue.
- **Node.js 20 o superior.**
- **`python3` con `numpy`** (`pip3 install numpy`): lo usa la mezcla de audio.
- **Una clave de ElevenLabs** y el ID de la voz.
  - Para listar voces con `voces`, la clave necesita el permiso `voices_read`. Locutar funciona sin él.
- **No hace falta nada más.** `ffmpeg`, `ffprobe`, Three.js y el Chrome con el que renderiza HyperFrames se instalan con `npm install`. Las muestras de música y los efectos (licencias libres) vienen en `assets/`.

### Pasos

```bash
git clone https://github.com/AwsystemsES/genframe.git
cd genframe
npm install                 # dependencias, ffmpeg, Three.js empaquetado y el Chrome de HyperFrames
cp .env.example .env        # y rellena ELEVENLABS_API_KEY y ELEVENLABS_VOICE_ID
npm run instalar-skill      # enlaza la skill en ~/.claude/skills/genframe (aparece como /genframe)
npm test                    # banco de pruebas: si las pruebas salen en verde, el motor funciona
```

### Plataformas

- **macOS:** probado; es donde se desarrolla.
- **Linux:** debería funcionar. Sin GPU, el render tarda unas 3,5 veces la duración del vídeo; en un Mac, menos de 1 vez.
- **Windows:** sin probar. `instalar-skill` necesita permiso para crear enlaces simbólicos.

### Encargárselo a otro Claude

Pega esto en una sesión de Claude Code abierta en la carpeta donde quieras el proyecto:

```text
Clona https://github.com/AwsystemsES/genframe.git, instálalo (npm install, copia .env.example a .env —las claves las pongo yo, no me las pidas— y npm run instalar-skill) y ejecuta npm test. Si algo falla, arréglalo y dime qué era. Después lee docs/BRIEFING.md y .claude/skills/genframe/SKILL.md entero, y usa la skill genframe para mis vídeos siguiendo sus reglas: respóndeme en español de España, avísame del coste antes de gastar en ElevenLabs, revisa cada pieza en la mesa y cada escena con sus fotos, y no me entregues nada por debajo de un 8 sin decírmelo.
```

### Lo que no viene en el repositorio

- **`proyectos/`:** los vídeos hechos y sus voces. No se suben: un clon nuevo empieza sin vídeos.
- **`.env`:** las claves.
- **El historial de las conversaciones con Claude.** Lo aprendido está en `docs/BRIEFING.md` y en la skill, que es lo que lee cada sesión nueva.

## Uso

Abre Claude Code en esta carpeta (o en cualquiera, si instalaste la skill) y pídele un vídeo: «hazme un short vertical de 1 minuto sobre el crack del 29». Claude sigue el flujo de `.claude/skills/genframe/SKILL.md`:
1. guion con datos verificados y voz, tras confirmar el coste;
2. dirección de arte;
3. reparto fabricado y revisado pieza a pieza (`mesa`);
4. escenas revisadas con fotos (`fotos`) y entorno decorado (`w.decorar`);
5. auditoría (`auditar`) de choques, cámara, textos, suelo vacío, tramos quietos y oscuros;
6. sonido;
7. render. `render` vuelve a auditar y no renderiza con problemas graves.

También puedes usar la herramienta a mano: `node bin/genframe.mjs` lista los comandos. Si cambias el motor, pasa `npm test` antes de subir nada.

## Estructura

| Ruta | Qué es |
|---|---|
| `bin/genframe.mjs` | Herramienta de línea de comandos (`nuevo`, `voz`, `frases`, `mesa`, `fotos`, `validar`, `auditar`, `audio`, `render`…). |
| `bin/pruebas.mjs`, `pruebas/` | Banco de pruebas del motor (`npm test`): escenas mínimas con su imagen de referencia. |
| `src/kit/kit.js` | Caja de herramientas 2D (`K`): sincronía con la voz, formas, iconos, banderas, mapas reales, animación. |
| `src/kit/world3d.js` | Mundo 3D (`K.world3d`): mapa extruido, mar con olas, costa, nubes, luz, cámara segura, colisiones, rutas a pie, formaciones, efectos, decoración del entorno y auditoría física. |
| `src/kit/gen.js` | Generadores procedurales del taller (`f.gen.human`, `f.gen.hull`). |
| `src/assemble.mjs` | Monta el proyecto HyperFrames. |
| `src/audio.py` | Música compuesta, efectos, ambientes y mezcla a −14 LUFS. |
| `assets/` | Recursos libres (ver `assets/LICENCIAS.md`): muestras de instrumentos y efectos que ya usa el motor, y además iluminaciones HDRI, texturas, la Tierra de la NASA y la geografía de Natural Earth en alta resolución, listas para usar en 3D y mapas. |
| `referencias/videos/` | Los mejores vídeos hechos a mano en el laboratorio (VOX estilo GTA, A350, ciclo del agua…): la vara de medir la calidad. |
| `docs/historia-laboratorio/` | El motor del laboratorio del 14-10 (con su biblioteca de modelos, solo como consulta de recetas) y el plan de 123 escenas del documental del Día D. |
| `.claude/skills/genframe/` | La skill y sus manuales. |
| `docs/BRIEFING.md` | Estado del proyecto, reglas del usuario e historia: lo primero que hay que leer. |
| `proyectos/` | Tus vídeos (no se suben al repositorio). |

## Licencias

Todo lo que usa el motor permite el uso comercial; detalle en `assets/LICENCIAS.md`. Si un vídeo usa los mapas de España por comunidades, hay que citar «© IGN».

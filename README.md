# genframe

**genframe** es un estudio de vídeos explicativos generados por código: shorts y documentales animados en 2D y 3D sin fotos ni material de archivo. Todo (personas, barcos, edificios, mapas reales, gráficos, cámaras, efectos) se programa para cada vídeo.

- **Una IA (Claude Code con la skill `genframe`)** hace de directora, guionista visual, modeladora, programadora de escenas y jueza de calidad.
- **Esta herramienta** pone la voz con **ElevenLabs**, monta el vídeo con **HyperFrames**, hace fotos para revisar, audita los fallos, mezcla el audio y renderiza el MP4.

---

## Si no sabes nada de programación: empieza aquí

Necesitas tres cosas. Tu IA hace el resto.

1. **Claude Code** instalado en tu ordenador (la aplicación de escritorio de Claude, pestaña *Code*, o la terminal). Es la IA que instala el motor y hace los vídeos.
2. **Acceso a este repositorio.** Es privado: pide al propietario que te invite en GitHub y acepta la invitación desde tu correo o desde github.com.
3. **Una cuenta de ElevenLabs** (elevenlabs.io), que pone la voz:
   - En tu perfil, entra en **API Keys** y crea una clave con permiso de texto a voz. Si además le das el permiso de lectura de voces (*voices_read*), la IA podrá enseñarte la lista de voces.
   - Elige una voz en la biblioteca de voces y copia su **Voice ID**.
   - Coste orientativo: un short de 1 minuto son unos **0,06-0,08 $** de voz.

Después abre Claude Code en la carpeta donde quieras el proyecto (por ejemplo, Documentos) y **pega este mensaje**:

```text
Quiero instalar el motor de vídeos genframe. Lee y sigue al pie de la letra la sección «Instrucciones para la IA» del README de https://github.com/AwsystemsES/genframe (repositorio privado: usa mi acceso de GitHub; si no puedes clonarlo, dime exactamente qué tengo que hacer). Instala todo lo que falte en mi ordenador explicándome cada paso en lenguaje sencillo, nunca me pidas las claves en el chat (dime en qué fichero ponerlas yo) y no des la instalación por terminada hasta que «npm test» salga en verde.
```

Cuando termine, pídele tu primer vídeo; por ejemplo: «hazme un short vertical de 1 minuto sobre el crack del 29». Antes de gastar en ElevenLabs te dirá cuánto cuesta y te pedirá permiso.

---

## Instrucciones para la IA

Sigue estos pasos en orden. Explica cada uno al usuario en lenguaje sencillo, en su idioma. **Nunca le pidas claves o contraseñas en el chat**: dile en qué fichero ponerlas.

### 1. Comprueba el sistema

| Necesario | Cómo comprobarlo | Si falta |
|---|---|---|
| **Git** | `git --version` | macOS: `xcode-select --install`. Linux: `sudo apt install git` (o el gestor de su distribución). Windows: instala Git for Windows. |
| **Node.js 20 o superior** | `node --version` | Instala la versión LTS desde nodejs.org, o con un gestor (`brew install node`, `nvm install --lts`, `winget install OpenJS.NodeJS.LTS`). Si hay una versión vieja, actualízala. |
| **Python 3 con numpy** | `python3 -c "import numpy; print(numpy.__version__)"` | `python3 -m pip install --user numpy`. Si el Python del sistema no deja instalar paquetes, crea un entorno virtual (`python3 -m venv ~/.genframe-py && ~/.genframe-py/bin/pip install numpy`) y pon `PYTHON=~/.genframe-py/bin/python` en el `.env` (paso 4). |
| **Espacio en disco** | — | Unos **2 GB libres**: repositorio unos 600 MB, dependencias unos 700 MB, Chrome de render unos 200 MB, más los vídeos. |

No hace falta instalar ffmpeg, Three.js ni Chrome: los trae el paso 3.

### 2. Clona el repositorio

```bash
git clone https://github.com/AwsystemsES/genframe.git
cd genframe
```

Es privado. Si pide usuario y contraseña o da error 403/404:
- Puede que el usuario aún no tenga acceso: debe aceptar la invitación del propietario.
- O puede que Git no esté identificado con GitHub. Usa `gh auth login` (GitHub CLI) o configura una clave SSH y clona con `git@github.com:AwsystemsES/genframe.git`. Guía al usuario; no le pidas su contraseña.

### 3. Instala las dependencias

```bash
npm install
```

Tarda unos minutos. Además de las librerías, este paso:
- empaqueta Three.js para el navegador (`dist/three.js`);
- descarga el Chrome sin interfaz con el que HyperFrames renderiza (en `~/.cache/hyperframes`);
- instala ffmpeg y ffprobe.

Si el Chrome no se descarga (red, proxy), ejecuta `npx hyperframes browser ensure`.

### 4. Configura las claves

```bash
cp .env.example .env
```

(En Windows sin terminal Unix, copia el fichero a mano.) Pide al usuario que abra `.env` con un editor de texto y rellene:
- `ELEVENLABS_API_KEY=`: su clave de ElevenLabs.
- `ELEVENLABS_VOICE_ID=`: el ID de la voz.
- `ELEVENLABS_MODEL=eleven_multilingual_v2`: ya viene puesto.
- `PYTHON=`: solo si en el paso 1 creaste un entorno virtual.

El `.env` nunca se sube al repositorio (está en `.gitignore`).

### 5. Instala la skill

```bash
npm run instalar-skill
```

Enlaza `.claude/skills/genframe` en `~/.claude/skills/genframe`, de modo que la skill **genframe** (`/genframe`) esté disponible en cualquier sesión de Claude Code. En Windows, crear el enlace puede requerir activar el «Modo de desarrollador» o una terminal de administrador.

### 6. Verifica que todo funciona

```bash
npm test
```

Pasa el banco de pruebas: varias escenas (mar con tormenta, multitud entre obstáculos, efectos, textos y mapas, decoración de ciudad y campo) que se auditan y se comparan con su imagen de referencia. Tarda unos 6 minutos y **no gasta nada**.
- **Todas en verde (✔):** el motor está bien instalado.
- **Alguna falla con «las fotos cambian respecto a la referencia»** en un ordenador distinto al original: puede deberse a otra tarjeta gráfica. Mira las fotos (`pruebas/<prueba>/fotos/todas/hoja.jpg`) y, si se ven bien, fija las referencias de esta máquina con `npm test -- --actualizar`.
- **Si falla por otra cosa:** lee el error, arréglalo y vuelve a ejecutarlo.

Para comprobar también la voz, que **cuesta unos céntimos**, pide permiso al usuario antes.

### 7. Antes de hacer vídeos

Lee entero `docs/BRIEFING.md` (estado, reglas e historia) y `.claude/skills/genframe/SKILL.md` (flujo de trabajo, comandos y rúbrica de calidad), y sigue sus reglas. Las más importantes:
- **Coste:** antes de gastar en ElevenLabs, di el coste y espera el sí.
- **Calidad:** revisa cada pieza con `mesa` y cada escena con `fotos`, pasa `auditar`, y no entregues nada por debajo de 8 en la rúbrica sin decirlo.
- **Contenido:** solo datos verificados; personas reales como personajes ficticios sin parecido; sin símbolos de odio, logotipos ni gore.

---

## Problemas frecuentes

| Síntoma | Solución |
|---|---|
| `node: command not found` o una versión menor de 20 | Instala o actualiza Node.js (paso 1). Cierra y vuelve a abrir la terminal. |
| `ModuleNotFoundError: numpy` al hacer `audio` o `render` | Instala numpy o crea el entorno virtual y pon `PYTHON=` en el `.env` (paso 1). |
| `No encuentro el Chrome de HyperFrames` | `npx hyperframes browser ensure`, o pon en el `.env` `CHROME=` con la ruta a un Chrome o Chromium. |
| `ElevenLabs 401 … voices_read` al listar voces | Esa clave no tiene ese permiso. Locutar sí funciona: pon el `ELEVENLABS_VOICE_ID` a mano. |
| `ElevenLabs 401` al locutar | Clave mal copiada o sin permiso de texto a voz. Revisa el `.env`. |
| El render tarda mucho | Normal sin GPU (Linux o máquinas virtuales): unas 3,5 veces la duración del vídeo. En un Mac, menos de 1 vez. |
| `render` se niega: «la auditoría encuentra problemas graves» | Es intencionado: el vídeo tiene fallos (piezas que se atraviesan, cámara dentro del agua, textos cortados…). Arréglalos; `--forzar` lo salta bajo tu responsabilidad. |
| `npm run instalar-skill` falla en Windows | Activa el Modo de desarrollador de Windows o usa una terminal de administrador. |

## Actualizar

```bash
git pull
npm install
npm test
```

Los vídeos de `proyectos/` y el `.env` no se tocan al actualizar.

---

## Uso

Con la skill instalada, pide el vídeo a Claude Code en lenguaje normal. La IA sigue el flujo de `.claude/skills/genframe/SKILL.md`:
1. guion con datos verificados y voz, tras confirmar el coste;
2. dirección de arte (paleta, tipografías, cielos);
3. reparto: cada pieza 3D se fabrica y se revisa en una «mesa» de fotos;
4. escenas, con el entorno decorado (calles, campo o interiores) y revisadas con fotos;
5. auditoría automática de choques, cámara, textos, suelo vacío, tramos quietos y fotogramas oscuros;
6. música, efectos y mezcla a −14 LUFS;
7. render del MP4, en `proyectos/<nombre>/<nombre>.mp4`.

La herramienta también se usa a mano: `node bin/genframe.mjs` lista los comandos (`nuevo`, `voz`, `frases`, `palabras`, `mesa`, `fotos`, `validar`, `auditar`, `audio`, `render`). Si cambias el motor, pasa `npm test` antes de subir nada.

**Cifras orientativas** (en un Mac):

| | Tiempo de trabajo de la IA | Render | Voz |
|---|---|---|---|
| Short de 1 minuto | 1-2 horas | ~2,5 min | ~0,07 $ |
| Vídeo de 20 minutos | muchas horas (mejor por capítulos) | ~1 h | ~1,5 $ |

## Estructura

| Ruta | Qué es |
|---|---|
| `README.md` | Este documento. |
| `docs/BRIEFING.md` | Estado del proyecto, reglas del usuario e historia: lo primero que debe leer una IA. |
| `.claude/skills/genframe/` | La skill (`SKILL.md`) y sus manuales: `referencia/kit.md` (escenas) y `referencia/taller.md` (piezas). |
| `bin/genframe.mjs` | Herramienta de línea de comandos. |
| `bin/pruebas.mjs`, `pruebas/` | Banco de pruebas del motor (`npm test`): escenas mínimas con su imagen de referencia. |
| `bin/postinstall.mjs`, `bin/instalar-skill.mjs` | Lo que hacen `npm install` y `npm run instalar-skill`. |
| `src/kit/kit.js` | Caja de herramientas 2D (`K`): sincronía con la voz, formas, iconos, banderas, mapas reales, títulos que se ajustan solos, rótulos sin solapes y animación. |
| `src/kit/world3d.js` | Mundo 3D (`K.world3d`): mapa extruido, mar con olas, costa, nubes, luz, cámara segura, colisiones, rutas a pie, formaciones, efectos, decoración del entorno y auditoría física. |
| `src/kit/gen.js` | Generadores del taller: personas articuladas (`f.gen.human`) y cascos de barco (`f.gen.hull`). |
| `src/assemble.mjs` | Monta el proyecto HyperFrames. |
| `src/audio.py` | Música compuesta, efectos, ambientes y mezcla a −14 LUFS. |
| `assets/` | Recursos libres (detalle en `assets/LICENCIAS.md`): instrumentos, efectos, iluminaciones HDRI, texturas, la Tierra de la NASA y la geografía de Natural Earth. |
| `referencias/videos/` | Vídeos de referencia de calidad. |
| `docs/historia-laboratorio/`, `docs/historia-autake/` | Historia del proyecto; solo para consulta. |
| `proyectos/` | Tus vídeos. No se suben al repositorio. |

## Licencias

Todo lo que usa el motor permite el uso comercial; el detalle está en `assets/LICENCIAS.md`. Si un vídeo usa los mapas de España por comunidades, hay que citar «© IGN». Los datos de la Tierra de la NASA exigen su crédito.

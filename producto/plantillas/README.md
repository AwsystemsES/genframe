# TurboFrame

**TurboFrame** es un estudio de vídeos explicativos generados por código: shorts y documentales animados en 2D y 3D sin fotos ni material de archivo. Todo (personas, barcos, edificios, mapas reales, gráficos, cámaras, efectos) se programa para cada vídeo.

- **Una IA (Claude Code con la skill `turboframe`)** hace de directora, guionista visual, modeladora, programadora de escenas y jueza de calidad.
- **Esta herramienta** pone la voz con **ElevenLabs**, monta el vídeo con **HyperFrames**, hace fotos para revisar, audita los fallos, mezcla el audio y renderiza el MP4.

---

## Si no sabes nada de programación: empieza aquí

Necesitas tres cosas. Tu IA hace el resto.

1. **Claude Code** instalado en tu ordenador (la aplicación de escritorio de Claude, pestaña *Code*, o la terminal). Es la IA que instala el motor y hace los vídeos.
2. **Acceso a este repositorio.** Es privado y viene con tu compra: acepta la invitación de GitHub que te llega al correo (o desde github.com). Si aún no tienes cuenta de GitHub, créala gratis antes.
3. **Una cuenta de ElevenLabs** (elevenlabs.io), que pone la voz:
   - En tu perfil, entra en **API Keys** y crea una clave con permiso de texto a voz. Si además le das el permiso de lectura de voces (*voices_read*), la IA podrá enseñarte la lista de voces.
   - Elige una voz en la biblioteca de voces y copia su **Voice ID**.
   - Coste orientativo: un short de 1 minuto son unos **0,06-0,08 $** de voz.

Después abre Claude Code en la carpeta donde quieras el proyecto (por ejemplo, Documentos) y **pega este mensaje**:

```text
Quiero instalar el motor de vídeos TurboFrame. Lee y sigue al pie de la letra la sección «Instrucciones para la IA» del README de {{REPO_WEB}} (repositorio privado: usa mi acceso de GitHub; si no puedes clonarlo, dime exactamente qué tengo que hacer). Instala todo lo que falte en mi ordenador explicándome cada paso en lenguaje sencillo, nunca me pidas las claves en el chat (dime en qué fichero ponerlas yo) y no des la instalación por terminada hasta que la comprobación del paso 6 diga que todo está bien.
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
| **Python 3 con numpy** | `python3 -c "import numpy; print(numpy.__version__)"` | `python3 -m pip install --user numpy`. Si el Python del sistema no deja instalar paquetes, crea un entorno virtual (`python3 -m venv ~/.turboframe-py && ~/.turboframe-py/bin/pip install numpy`) y pon `PYTHON=~/.turboframe-py/bin/python` en el `.env` (paso 4). |
| **Espacio en disco** | — | Unos **2 GB libres**: repositorio unos 600 MB, dependencias unos 700 MB, Chrome de render unos 200 MB, más los vídeos. |

No hace falta instalar ffmpeg, Three.js ni Chrome: los trae el paso 3.

### 2. Clona el repositorio

```bash
git clone {{REPO_HTTPS}} turboframe
cd turboframe
```

Es privado. Si pide usuario y contraseña o da error 403/404:
- Puede que el usuario aún no tenga acceso: debe aceptar la invitación de GitHub que recibió con su compra.
- O puede que Git no esté identificado con GitHub. Usa `gh auth login` (GitHub CLI) o configura una clave SSH y clona con `{{REPO_SSH}}`. Guía al usuario; no le pidas su contraseña.

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

Enlaza `.claude/skills/turboframe` en `~/.claude/skills/turboframe`, de modo que la skill **TurboFrame** (`/turboframe`) esté disponible en cualquier sesión de Claude Code. En Windows, crear el enlace puede requerir activar el «Modo de desarrollador» o una terminal de administrador.

### 6. Verifica que todo funciona

```bash
node bin/turboframe.mjs comprobar
```

Revisa Node, las dependencias, el Chrome de render, ffmpeg, Python con numpy, las claves del `.env` (sin enseñarlas) y la skill, y monta un vídeo de prueba en el navegador de render. Si termina con **«✔ todo listo»**, el motor está bien instalado. Si algo falla, dice qué es y cómo arreglarlo. No gasta nada.

Para comprobar también la voz, que **cuesta unos céntimos**, pide permiso al usuario antes.

### 7. Antes de hacer vídeos

Lee entero `.claude/skills/turboframe/SKILL.md` (flujo de trabajo, comandos y rúbrica de calidad) y sigue sus reglas. Las más importantes:
- **Coste:** antes de gastar en ElevenLabs, di el coste y espera el sí.
- **Calidad:** revisa cada pieza con `mesa` y cada escena con `fotos`, pasa `auditar`, y no entregues nada por debajo de 8 en la rúbrica sin decirlo.
- **Contenido:** solo datos verificados; personas reales como personajes ficticios sin parecido; sin símbolos de odio, logotipos ni gore.
- **El motor no se toca:** las actualizaciones lo sustituyen. Los vídeos van en `proyectos/`, que las actualizaciones nunca tocan.

---

## Problemas frecuentes

| Síntoma | Solución |
|---|---|
| `node: command not found` o una versión menor de 20 | Instala o actualiza Node.js (paso 1). Cierra y vuelve a abrir la terminal. |
| `ModuleNotFoundError: numpy` al hacer `audio` o `render` | Instala numpy o crea el entorno virtual y pon `PYTHON=` en el `.env` (paso 1). |
| `No encuentro el Chrome de HyperFrames` | `npx hyperframes browser ensure`, o pon en el `.env` `CHROME=` con la ruta a un Chrome o Chromium. |
| `ElevenLabs 401 … voices_read` al listar voces | Esa clave no tiene ese permiso. Locutar sí funciona: pon el `ELEVENLABS_VOICE_ID` a mano. |
| `ElevenLabs 401` al locutar | Clave mal copiada o sin permiso de texto a voz. Revisa el `.env`. |
| El render tarda mucho | Normal sin GPU (Linux o máquinas virtuales): unas 3,5 veces la duración del vídeo. En un Mac, menos de 1 vez. En vídeos de más de 90 s, `render` guarda tramos en `proyectos/<nombre>/tramos/` y, al cambiar una escena, solo rehace su tramo. |
| El ordenador se congela al renderizar | El render abre varios navegadores con 3D y se come la RAM. TurboFrame ya limita cuántos abre según tu memoria (2 con 16 GB) y les baja la prioridad. Si aun así se congela, pon `TURBOFRAME_WORKERS=1` en el `.env` (tarda algo más), cierra otras aplicaciones pesadas mientras renderiza, o mejor, deja los renders para la noche (fila siguiente). |
| Quiero que el render no me moleste | Programa el render de noche: `node bin/turboframe.mjs programar --hora=03:00`. Claude deja cada vídeo en la cola (`encolar`) y a esa hora se renderiza solo, aunque Claude esté cerrado. Por la mañana, pregúntale a Claude por la cola. El ordenador tiene que estar encendido a esa hora (el comando te dice cómo hacer que se despierte solo). |
| `render` se niega: «la auditoría encuentra problemas graves» | Es intencionado: el vídeo tiene fallos (piezas que se atraviesan, cámara dentro del agua, textos cortados…). Arréglalos; `--forzar` lo salta bajo tu responsabilidad. |
| `npm run instalar-skill` falla en Windows | Activa el Modo de desarrollador de Windows o usa una terminal de administrador. |

## Actualizar

```bash
node bin/turboframe.mjs actualizar
```

Descarga la última versión, reinstala lo que haga falta y te enseña las novedades desde la tuya (también en `CAMBIOS.md`). Tus vídeos de `proyectos/` y tu `.env` no se tocan. `node bin/turboframe.mjs version` dice qué versión tienes.

## Soporte

Si algo del motor falla, Claude lo anota en `proyectos/<nombre>/fallos-motor.md`. Envía ese fichero al soporte de TurboFrame.

## Licencia

Uso según `LICENCIA.md`: puedes hacer y vender los vídeos que quieras, pero no compartir ni revender el motor. Componentes de terceros: `AVISOS-TERCEROS.md`.

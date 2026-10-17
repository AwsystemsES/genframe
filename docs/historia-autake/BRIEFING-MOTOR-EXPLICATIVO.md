# Briefing: motor del «Vídeo explicativo» (HyperFrames + OpenAI)

Estado a 15-10-2026. Sirve para seguir el desarrollo en otra sesión. Todo en español.

---

## 1. Qué es y en qué punto está

**Qué es.** Un tipo de vídeo nuevo, «Vídeo explicativo», en el que la IA diseña y programa cada escena (2D y 3D) a partir de:
- el guion;
- la voz del canal;
- un prompt de dirección;
- fotos de inspiración.

Las escenas se renderizan con HyperFrames en las máquinas de la flota de Hetzner. No usa material de stock ni fotos: **todo se genera por código** en el momento.

**Hecho, desplegado y activo** (commit **f7866b3**, incluido en `origin/production`):
- App (Laravel), en las dos instalaciones.
- Imagen del worker **autake-remotion:4.0.525-61** activa en autake-ops-01 y cayman-ops-01.
- Instantáneas **v61** de la flota en las dos cuentas de Hetzner, con los paneles actualizados por el usuario.

**Visibilidad:**
- Solo existe en **Cayman** (`VIDEO_TYPE_EXPLAINER=true`) y solo lo ve el **DUI** (`VIDEO_TYPE_EXPLAINER_PUBLIC=false`; `DUI=<id>` en el `.env` de Cayman).
- En **Autake**, `VIDEO_TYPE_EXPLAINER=false`: no aparece, la validación lo rechaza, sus rutas dan 404 y la flota no enciende máquinas para él.
- **Regla del usuario:** nunca debe aparecer en Autake.

**Pendiente inmediato:**
- La primera prueba real de punta a punta en Cayman con el DUI (proyecto → voz → máquina → MP4).
- Revisar el resultado y ajustar.

---

## 2. Flujo de un vídeo

1. **Proyecto** (`ProjectEditor`, solo con `Explainer::availableTo()`):
   - formato 16:9 o 9:16;
   - prompt de dirección (`settings.style_instructions`, máx. `Explainer::STYLE_MAX` = 4.000);
   - hasta 8 fotos de inspiración (`settings.inspiration_asset_ids`; `ExplainerInspiration` las sube a Hetzner como JPEG de 1.600 px, con `category=inspiration`);
   - guion y voz.

   `VideoConfiguration` solo admite 9:16 y fotos si `content_type=explainer`.
2. **Generar** (`NarratedGeneration`): se congela `snapshot.engine = hyperframes`, sin motor de material ni revisión.
3. **Voz y alineación** como siempre. `AudioAlignmentDelivery::finalize` pasa a la etapa `explainer_planning` («Diseñando tu vídeo explicativo») y lanza `RunRenderFleet`.
4. **Flota** (`RenderFleet::claimableRenderJobs`): cuenta esa etapa solo si la versión de imagen del panel tiene `explainer` (MIN_BUILD 61 en `WorkerCompatibility`) y enciende una máquina.
5. **Claim** `POST /api/workers/{worker}/explainer/claim` (`WorkerJobController::claimExplainer` → `RenderDispatch::claimExplainer`; da 404 si el tipo no existe en la instalación):
   - asigna el vídeo con `startAttempt` (común con el render; etapa `rendering`);
   - devuelve `job` con `ExplainerJob::payload`: guion, palabras `{t,a,b}`, URLs firmadas (3 h) de la voz y las fotos, prompt, formato, subtítulos sí o no, duración, y **clave de OpenAI + modelos + precios**.

   La clave viaja en el claim, como en la alineación de voz.
6. **Worker** (`resources/js/remotion/explainer-job.mjs`, enganchado en el bucle de `worker.mjs` cuando no hay renders normales):
   1. descarga la voz y las fotos;
   2. escribe `input.json`;
   3. lanza `node resources/js/explainer/src/explain.mjs <dir>`;
   4. traduce los pasos del log a progreso (`STEP_PROGRESS`) y para con `SIGTERM` si se cancela;
   5. sube el MP4 (upload-ticket), registra el coste por modelo en `/jobs/{id}/usage` y llama a `/complete`;
   6. si falla, llama a `/fail` con `explainer_staging_failed`, `explainer_engine_failed` o `explainer_delivery_failed`.
7. **Final:** `RenderDispatch::complete` → `GenerationLifecycle::complete`. Sin `shots`, termina **sin revisión**.
   - Si se pierde la máquina: `requeue` lo devuelve a `explainer_planning`, nunca a `render_ready`.
   - Los reintentos (`GenerationRetry`) lanzan la flota.

**Tests:** `tests/Feature/ExplainerWorkerTest.php`, `tests/Feature/ExplainerVideoTypeTest.php` y `resources/js/remotion/explainer-job.test.mjs`.

---

## 3. El motor (`resources/js/explainer`)

### Instalación y empaquetado
- Tiene su **propio `package.json`**: 50 dependencias fijadas (hyperframes 0.8.150, three 0.186.1, animejs 4.5.0, d3, roughjs, topojson-client, world-atlas, es-atlas, lucide-static, @tabler/icons, flag-icons y 39 tipografías de Fontsource), más esbuild en desarrollo.
- **Solo se instala en la imagen del worker** (Dockerfile: `npm ci`, `npm run build`, que empaqueta Three.js en `dist/three.js`, `npm prune` y `hyperframes browser ensure`), con `python3-numpy`.
- **Nunca dejar `node_modules` ni `dist` dentro de `/backend`:** el usuario sube con FileZilla y ya se subieron 30.000 archivos una vez. Para probar en local, copiar el motor a un directorio temporal.
- **En la carpeta local del usuario, `resources/js/explainer` está borrado** (en git sigue). Si se necesita: `git restore resources/js/explainer`, pero preguntar antes, porque puede que lo borrara él a propósito.

### Archivos de `src/`

| Archivo | Qué hace |
|---|---|
| `explain.mjs` | Bucle completo, descrito abajo. |
| `ai.mjs` | `chat/completions` en JSON con reintentos; uso total y por modelo (`usage.byModel`); `EXPLAINER_USAGE_FILE`. |
| `assemble.mjs` | Monta el proyecto HyperFrames: secciones, transiciones, subtítulos con la palabra resaltada, tipografías, iconos, banderas y mapas que usa el código, la interfaz y el 16:9 o 9:16. Una escena que falla → rótulo de respaldo. |
| `catalog.mjs` | Tipografías, texturas, transiciones, estilos de subtítulo, efectos (Kenney), ambientes y ánimos de música. |
| `audio.py` | Música compuesta con muestras VSCO 2 o sintetizada (`urbano`, `synthwave`, `curioso`), efectos, ambientes, efectos sintetizados (roar, gravel, screech, diesel, apu), ducking de la voz y −14 LUFS. |
| `prompts/manual.md` | El manual que lee la IA programadora: API de K, reglas y recetas. **Es lo que más influye en la calidad.** |
| `kit/kit.js` | Caja de herramientas 2D, el objeto global `K` (detalle abajo). |
| `kit/world3d.js` | Mundo 3D con Three.js, `K.world3d` (detalle abajo). |
| `kit/hud.js` | Interfaz de videojuego: radar, año o contador, estrellas, misiones, nombre de zona, «eje completado». |

**Pasos de `explain.mjs`:**
1. Director de arte (con visión de las fotos).
2. Guionista visual, por tramos de 36 frases, con año, lugar, tensión y capítulo.
3. Programador por escena, 4 en paralelo, con **gpt-6-sol**.
4. `hf validate` y reescritura de las escenas con error.
5. Dos rondas de `hf snapshot`, detector de pantalla vacía y revisor con visión, con corrección.
6. Audio y render.

**`kit/kit.js` (`K`):**
- sincronización con la voz con `K.cue`;
- construcción y animación con anime.js;
- trazos a mano con rough.js, iconos, banderas y cifras;
- cámara;
- mapas reales 2D (`K.map.world`, `K.map.spain`);
- personajes de palo, bocadillos y flechas;
- `K.W`, `K.H`, `K.safe` y `K.vertical`.

**`kit/world3d.js` (`K.world3d`):**
- Renderizador **WebGL único compartido** (Chrome no admite más de 16).
- Aspectos `comic`, `sa` (GTA San Andreas) y `clean`.
- Cielos, bruma, sol y resplandor.
- Mapa real extruido, con comunidades autónomas.
- Cámara (`w.shot`, `w.drift`).
- Modelos por código:
  - genéricos: ciudad, castillo, barcos, ejércitos…;
  - ciudad estilo San Andreas;
  - personas articuladas (`w.person` con posturas, andar y hablar);
  - A350 y aeropuerto;
  - material de 1944: LCVP, LST, acorazado, globos, Sherman/DD, C-47, Horsa, obstáculos, búnker, costa, bocage, Mulberry, cementerio.
- Rutas, balizas, `w.flow`, `w.fx` (humo con sprites), `w.attach` y `w.onUpdate`.
- Los dibujos por fotograma se hacen en el evento `hf-seek` de HyperFrames.

### Variables del motor

| Variable | Uso |
|---|---|
| `OPENAI_EXPLAINER_MODEL` | Modelo general; por defecto `gpt-6-luna`. |
| `OPENAI_EXPLAINER_CODER_MODEL` | Modelo programador; por defecto `gpt-6-sol`. En la app, en `config/openai.php` → `explainer`. |
| `EXPLAINER_PARALLEL` | Escenas programadas en paralelo; por defecto 4. En el worker: `AUTAKE_EXPLAINER_PARALLEL`. |
| `EXPLAINER_RESUME=1` | Reutiliza `plan.json` y solo hace audio y render, sin gastar IA. |
| `EXPLAINER_LIMIT=<s>` | Ensayo con los primeros segundos. |
| `EXPLAINER_REVIEW=0` | Sin revisor. |
| `EXPLAINER_USAGE_FILE` | Archivo donde se va guardando el consumo. |
| `FFMPEG`, `HYPERFRAMES_BIN`, `PYTHON` | Rutas de los programas. |
| `EXPLAINER_ENV_FILE` | Solo en local: `.env` con la clave. |

---

## 4. Medidas

**Render en la flota, sin GPU** (CPX42 de 8 vCPU, AMD Genoa):
- Unas 3,5 veces la duración del vídeo con 3D en todas las escenas: 21 s → 74 s.
- Más navegadores en paralelo no mejora: el límite es la CPU con SwiftShader.
- Sin sombras ni antialiasing solo gana un 15 %; no compensa.
- En el Mac con GPU: 0,7 veces la duración.

**Tiempo total:** un short de 21 s se hizo en 4 min 19 s en el Mac. En la flota calcular unos 8–12 min por minuto de vídeo. Un documental de 20 minutos: unas 2 h de IA más unos 70 min de render.

**Coste de OpenAI** (Luna para todo y Sol para programar): unos 0,36 $ por 21 s, algo más de **1 $ por minuto**; casi todo es de Sol. Solo con Luna, unas 20 veces menos, pero con peor calidad.

---

## 5. Infraestructura y cómo sacar una imagen nueva

| Máquina | IP | Cuenta | Acceso | Tamaño | Nota |
|---|---|---|---|---|---|
| autake-ops-01 | 2.28.234.36 | Autake | `autakeops`, clave `~/.ssh/autake_vps_2026`, `sudo -n` | 8 vCPU / 15 GB / **150 GB** | Su instantánea solo sirve para máquinas de 150 GB o más. |
| cayman-ops-01 | 128.140.34.204 | personal del usuario | igual | CX23 de 2 vCPU | Tiene `/swapfile` de 2 GB, vaciado con ceros antes de la instantánea. |

**Cualquier cambio en `resources/js/explainer` o `resources/js/remotion` exige imagen nueva (-62, -63…) e instantánea nueva, y se activa ANTES que el backend.** Pasos:
1. **Subir el código del commit** a la ops:
   ```
   git archive --format=tar <commit> package.json package-lock.json deploy/remotion resources/js/remotion resources/js/explainer public/fonts | ssh … 'tar xf - -C ~/build-NN'
   ```
2. **Construir en cada ops por separado:**
   ```
   docker build --label com.autake.commit=<commit> -t autake-remotion:4.0.525-NN -f deploy/remotion/Dockerfile .
   ```
   Copiar la imagen por el Mac es demasiado lento (4,6 GB); en autake-ops-01 la construcción tarda unos 5 min.
3. **Probar dentro de la imagen:**
   - `node --test` en `resources/js/remotion`: falla siempre `textures.test.mjs`, que importa el editor y no va en la imagen;
   - un render del motor con `EXPLAINER_RESUME=1` y **las mismas opciones del servicio**: `--read-only`, tmpfs `/tmp` noexec, tmpfs `node_modules/.cache` y bind de `/var/lib/autake-render`.
4. **Activar:** guardar copia del env en `/root/autake-identidad/remotion-worker.env.bak-<anterior>`, cambiar `AUTAKE_RENDER_IMAGE` y `AUTAKE_WORKER_RELEASE` en `/etc/autake/remotion-worker.env` y en `/root/autake-identidad/remotion-worker.env`, y reiniciar `autake-remotion-worker`.
5. **Preparar la instantánea:**
   - parar y desactivar el worker y `worker-runtime-agent.timer`;
   - mover los env con token a `/dev/shm/autake-identidad`;
   - borrar la imagen anterior y `node:22-bookworm-slim`, hacer `docker builder prune -af` y borrar `~/build-*`;
   - vaciar `/var/lib/autake-render`, `apt-get clean`, vaciar el journal y hacer `fstrim`;
   - comprobar «sin tokens en disco».
6. **Instantáneas:** las hace el usuario en las dos cuentas y pone en el panel de la flota de cada app el ID de la instantánea, `remotion-4.0.525-NN` y `autake-remotion:4.0.525-NN`.
7. **Restaurar** las identidades desde `/dev/shm`, habilitar e iniciar los dos servicios y comprobar.

**Cuidado:** `docker system prune -a` con el servicio parado borra la imagen del worker. No usarlo.

**Backend:** desde el 15-10 cada cambio va en su rama + push, y se fusiona en `production`, que es igual al servidor. Se despliega en Autake y en Cayman con copia previa y huellas md5 (ver la memoria «rama-production»). Comandos: `rm -f bootstrap/cache/*.php`, `package:discover`, `migrate --force`, `optimize` y `horizon:terminate`, como `studi9000` (Autake) o `cayma2307` (Cayman). **No subir `public/build` recompilado en local:** el `.env` local mete `https://studio.autake.ai/build/` y rompe Cayman; usar el del commit.

---

## 6. Laboratorio (`~/Downloads/explicativo-lab`)

Copia de trabajo anterior del motor, con `engine/node_modules` instalado, recursos completos (5 GB), `.env` con la clave de OpenAI, `voz-lab.py` (voz Mónica de macOS para pruebas) y `entorno.sh`.

- El 14-10 alguien borró `pruebas/` y `renders/`; queda `pruebas/dia-d` con el `plan.json` de 123 escenas del documental del Día D, cuyo render no llegó a terminar.
- El motor del repositorio está más avanzado que el del laboratorio: tiene vertical, fotos, `byModel` y rutas de repositorio. **La fuente de verdad es el repositorio.**

---

## 7. Problemas conocidos e ideas pendientes

1. **Calidad irregular del modo automático.** Hacer más recetas en el manual y más modelos en la biblioteca es lo que más mejora. Los vídeos escritos a mano (VOX GTA, avión A350) quedaron claramente mejor que los automáticos.
2. **La IA a veces inventa cifras de ejemplo** (el «2,33 s ÷ 3» del short del rayo). La regla está en el manual, pero conviene reforzarla en el revisor.
3. **Demasiados mapas o paneles 2D** cuando no se pide 3D explícitamente. Funciona exigirlo en el prompt de dirección.
4. **No hay vídeos sin voz**, solo música y texto: el motor sincroniza todo con las palabras de la voz. Hacerlo exigiría un modo «sin voz» con tiempos por escena.
5. **Vista previa del plan antes del render:** enseñar las escenas y unas capturas para aprobarlas antes de gastar el render. No está hecho.
6. **Render de vídeos largos repartido** entre varias máquinas por tramos. No está hecho; 20 minutos tardan unos 70 min de render.
7. **El 3D de las personas es de piezas simples:** no hay modelos humanos realistas. El usuario no quiere descargas de internet ni fotos; si se quisieran personajes mejores habría que acordarlo.
8. **`explainer_planning` no está en los idle stages del vigilante:** si no arranca ninguna máquina en 3 h, el vídeo falla con `stage_timeout`.
9. **Las máquinas de la flota con poca CPU** (tiers de 2 vCPU) renderizan el 3D muy despacio: unos 8 min por 21 s en una CX23.

---

## 8. Reglas del usuario que aplican

- Responder siempre en español, también en los avisos.
- **Visibilidad:** nada del explicativo en Autake y, en Cayman, solo el DUI hasta que el usuario diga lo contrario.
- **Material:**
  - no usar fotos ni internet para el material del vídeo, todo generado por código; las fotos de inspiración del cliente solo son referencia;
  - recursos 100 % libres con licencia comercial (ver `resources/js/explainer/assets/LICENCIAS.md`); citar «© IGN» si se usan las comunidades autónomas.
- **Personas:**
  - nada de reproducir caras de personas reales (políticos, etc.), solo personajes ficticios;
  - sin gore;
  - ni esvásticas ni símbolos políticos de odio.
- **Despliegue:**
  - la imagen del worker siempre antes que el backend, y avisar de si un cambio exige instantánea nueva;
  - dar siempre los comandos de las dos instalaciones;
  - no dejar `node_modules`/`dist` en `/backend`;
  - no cambiar de rama bajo otras sesiones;
  - commits solo de los archivos propios (`git add -f` porque el `.gitignore` local ignora casi todo).

---

## 9. Documentación relacionada

- `docs/VIDEO-EXPLICATIVO.md`: diseño original (F0).
- `docs/RECURSOS-VIDEO-EXPLICATIVO.md`: estudio de recursos libres con sus licencias.
- `resources/js/explainer/src/prompts/manual.md`: manual de la caja de herramientas para la IA.

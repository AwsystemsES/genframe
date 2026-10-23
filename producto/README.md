# Producto: TurboFrame para clientes

Esta carpeta convierte el motor en el producto que se vende. Los clientes reciben **una copia limpia del motor**: sin documentos internos, sin tus proyectos y sin rutas ni datos tuyos. La reciben por un **repositorio privado de GitHub de distribución**, distinto de este, y la usan con su propio Claude Code y sus propias claves. Este repositorio sigue siendo el de desarrollo: aquí se trabaja, y de aquí sale cada versión.

## Qué hay aquí

| Fichero | Para qué |
|---|---|
| `producto.json` | Configuración: repositorio de distribución, firma de los commits, qué no se incluye (`excluir`) y palabras que no pueden aparecer en el paquete (`prohibido`). |
| `empaquetar.mjs` | Prepara una versión y, con `--publicar`, la sube al repositorio de distribución. |
| `CAMBIOS.md` | Novedades de cada versión, escritas para el cliente. Es lo que ve al ejecutar `actualizar`. |
| `LICENCIA.md` | Licencia de uso. **Es un borrador: revísala con un abogado antes de vender.** |
| `AVISOS-TERCEROS.md` | Licencias de los componentes de terceros (todas permiten el uso comercial). |
| `plantillas/README.md` | README del cliente: instalación pensada para quien no sabe programar, comprobación, actualizar, soporte y licencia. |
| `plantillas/skill-mejorar.md` | Sustituye en la skill del cliente la sección «Mejorar el motor»: el cliente no toca el motor, anota los fallos para el soporte. |
| `salida/` (no se sube) | El repositorio de distribución en local (`salida/turboframe/`) y el zip de cada versión. |

## Qué cambia en el paquete respecto a este repositorio

- **Fuera:** `docs/` (BRIEFING e historial de encargos), `producto/`, `proyectos/`, `.env`.
- **README** del cliente en lugar del de desarrollo, con las direcciones del repositorio de distribución.
- **Skill:** sin la ruta de tu Mac, y con «Fallos del motor» en lugar de «Mejorar el motor».
- **Añadidos en la raíz:** `LICENCIA.md`, `AVISOS-TERCEROS.md` y `CAMBIOS.md`.
- **Comprobación final:** si alguna palabra de `prohibido` aparece en algún fichero, el empaquetado se para y dice dónde.

## Puesta en marcha (una vez)

1. Crea en GitHub un repositorio **privado y vacío** para los clientes (por ejemplo `AwsystemsES/turboframe`).
2. Pon su dirección en `producto.json` → `repositorio`. Vale tu alias SSH: `git@github-genframe:AwsystemsES/turboframe.git`.
3. Conecta la tienda (Whop u otra) con GitHub para que cada compra invite al cliente al repositorio y cada baja le quite el acceso. Sin acceso, `actualizar` deja de traer versiones, pero el cliente conserva la que tiene.
4. Revisa `LICENCIA.md` con un abogado.

## Sacar una versión

1. Haz los cambios del motor aquí, como siempre, y su commit.
2. Sube la versión en `package.json` (y en `package-lock.json`):
   - **parche** `1.0.1`: arreglos;
   - **menor** `1.1.0`: herramientas nuevas que no rompen nada;
   - **mayor** `2.0.0`: algo que obliga a cambiar cómo se hacen los vídeos.
3. Escribe en `CAMBIOS.md` la sección `## X.Y.Z · fecha` con lo nuevo **en lenguaje de cliente**: qué puede hacer ahora, no cómo está programado.
4. Si cambió la instalación o algún comando que el cliente usa, actualiza `plantillas/README.md`.
5. Commit de todo lo anterior.
6. Prueba sin publicar:

   ```bash
   node producto/empaquetar.mjs
   ```

   Mira `producto/salida/turboframe/`. Para ensayar antes del commit existe `--permitir-cambios`, que no crea commit, etiqueta ni zip.
7. Publica:

   ```bash
   node producto/empaquetar.mjs --publicar
   ```

   Sube la rama `main` y la etiqueta `vX.Y.Z`. Los clientes la reciben con `node bin/turboframe.mjs actualizar`.

Una versión publicada no se rehace: si el motor cambia después, el empaquetador pide subir la versión.

## Lo que ve el cliente

- `node bin/turboframe.mjs comprobar`: revisa la instalación (Node, dependencias, Chrome, ffmpeg, Python, claves sin enseñarlas, skill y espacio) y monta un vídeo de prueba. Acaba en «✔ todo listo» o dice qué arreglar.
- `node bin/turboframe.mjs version`: su versión.
- `node bin/turboframe.mjs actualizar`: descarga la última versión, reinstala y le enseña las novedades. Se niega si el cliente ha modificado el motor, para no pisar sus cambios ni romper la actualización. Sus `proyectos/` y su `.env` no se tocan nunca.
- Si algo del motor falla, Claude lo anota en `proyectos/<nombre>/fallos-motor.md` para que te lo envíe.

## Pendiente o sin probar

- **Windows:** la instalación no se ha probado. El enlace de la skill necesita el modo de desarrollador.
- **Licencia:** borrador sin revisión legal.
- **Repositorio de distribución:** sin crear (`repositorio` vacío en `producto.json`).

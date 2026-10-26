# Novedades de TurboFrame

Cada versión, lo que trae. `node bin/turboframe.mjs actualizar` instala la última y te enseña lo nuevo desde la tuya.

## 1.0.1 · 2026-10-25

- **El ordenador ya no se congela al renderizar:** el render abre los navegadores justos para tu memoria (2 en un ordenador de 16 GB) y con prioridad baja, así que puedes seguir usando el ordenador. Si aun así va justo, pon `TURBOFRAME_WORKERS=1` en el `.env`.
- **El ordenador va primero:** todo lo pesado (navegadores, ffmpeg, Python) va de uno en uno en ordenadores de 16 GB, con la prioridad de fondo de macOS, y no arranca nada si la memoria libre baja del 12 %; espera a que la haya. Un guardia de Claude Code bloquea los procesos pesados lanzados a la vez y los agentes nuevos si falta memoria. Tarda más, pero puedes seguir usando el ordenador. Ajustes: `TURBOFRAME_AGENTES`, `TURBOFRAME_NAVEGADORES`, `TURBOFRAME_MEMORIA_MIN`, `TURBOFRAME_PRIORIDAD`.
- `comprobar` dice cuánta RAM tienes y con cuántos navegadores renderizará. También muestra los límites de agentes y navegadores.
- **Render de noche:** Claude prepara el vídeo de día y lo deja en una cola; a la hora que elijas (`programar --hora=03:00`) se renderiza solo, sin Claude abierto y sin que el ordenador se duerma. Por la mañana tienes el vídeo y, si algo falló, el registro.

## 1.0.0 · 2026-10-23

Primera versión pública.

- **Estudio completo con Claude Code:** Claude dirige, escribe el guion visual, fabrica las piezas, programa las escenas y revisa cada plano mirando las imágenes; TurboFrame pone la voz (ElevenLabs), monta, fotografía, audita, mezcla y renderiza.
- **3D de cine:** cielo físico y luz de entorno, materiales realistas, sombras, oclusión ambiental, resplandor, desenfoque de movimiento real, profundidad de campo, capas de película (cine, archivo, cálida, noche) y niebla con perspectiva aérea.
- **Naturaleza y mundo:** mar con olas reales, lagos y ríos, montañas, árboles y animales articulados con anatomía real, hierba que se mece, nubes de volumen que se pueden atravesar, humo y fuego iluminados, ciudades, campo e interiores con tráfico y peatones.
- **Cámara:** encuadres automáticos, barrido rápido, golpe de zoom, efecto vértigo y cámara en mano.
- **Personas, barcos y piezas:** generadores de personas, cascos de barco, árboles y animales; formas redondeadas, acabados con textura y rótulos que siempre caben.
- **2D:** mapas reales (también tumbados en perspectiva, con rutas y rótulos), gráficos, iconos, banderas y textos que nunca se salen.
- **Subtítulos:** varios estilos, entre ellos `cine`, con la palabra que suena encendida y la palabra clave destacada; tiempos ajustados a la voz real.
- **Control de calidad:** auditoría automática (choques, cámara, textos, planos quietos u oscuros y cifras en pantalla que el guion no dice) y revisión del MP4 final (destellos, negros, congelados).
- **Render por tramos con caché:** en vídeos largos, cambiar una escena solo vuelve a renderizar su tramo.

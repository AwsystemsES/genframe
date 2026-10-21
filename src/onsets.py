"""Tiempos acústicos: ajusta el inicio y el final de las palabras de palabras.json a la energía real de voz.mp3.

ElevenLabs da los tiempos de cada carácter, pero alrededor de las pausas suelen ir adelantados o atrasados unas
decenas de milisegundos: el subtítulo resalta la palabra antes de que suene y los golpes de escena caen a destiempo.
En el habla continua la frontera entre palabras no se ve en la energía, así que solo se tocan los bordes que lindan
con un silencio (inicio tras una pausa y final antes de otra), que son justo los que se notan.

Uso: python3 onsets.py voz.mp3 palabras.json [ffmpeg]   (reescribe palabras.json; guarda el original en palabras.eleven.json)
"""
import json, os, shutil, subprocess, sys
import numpy as np

SR, HOP = 16000, 0.005  # 5 ms por muestra de energía
REACH = 0.15            # el borde acústico se busca a ±150 ms del de ElevenLabs


def envelope(path, ffmpeg):
    raw = subprocess.run([ffmpeg, '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    hop, win = int(SR * HOP), int(SR * 0.02)
    n = max(1, (len(x) - win) // hop)
    frames = np.lib.stride_tricks.as_strided(x, shape=(n, win), strides=(x.strides[0] * hop, x.strides[0]))
    db = 20 * np.log10(np.sqrt((frames ** 2).mean(axis=1)) + 1e-6)
    return np.convolve(db, np.ones(3) / 3, mode='same')


def main(voz, palabras, ffmpeg='ffmpeg'):
    words = json.load(open(palabras))
    if not words:
        return print('sin palabras')
    backup = os.path.join(os.path.dirname(palabras), 'palabras.eleven.json')
    if not os.path.exists(backup):
        shutil.copy(palabras, backup)
    else:
        words = json.load(open(backup))  # siempre se afina desde los tiempos de ElevenLabs
    db = envelope(voz, ffmpeg)
    floor, peak = np.percentile(db, 10), np.percentile(db, 95)
    quiet = db < floor + 0.45 * (peak - floor)  # por debajo: silencio o respiración
    # Silencios reales: tramos callados de al menos 90 ms.
    runs, k = [], 0
    while k < len(quiet):
        if quiet[k]:
            e = k
            while e < len(quiet) and quiet[e]:
                e += 1
            if (e - k) * HOP >= 0.09:
                runs.append((k * HOP, e * HOP))
            k = e
        else:
            k += 1
    starts = np.array([w['a'] for w in words]); ends = np.array([w['b'] for w in words])
    moved, shifts = 0, []
    for s0, s1 in runs:
        # La palabra que empieza al acabar el silencio y la que acaba al empezar.
        i = int(np.argmin(np.abs(starts - s1)))
        if abs(starts[i] - s1) < REACH and s1 < words[i]['b'] - 0.03:
            t = round(s1 - 0.01, 3)  # 10 ms antes del ataque: el resalte entra con la consonante
            if abs(t - words[i]['a']) > 0.015:
                shifts.append(t - words[i]['a']); words[i]['a'] = t; moved += 1
        j = int(np.argmin(np.abs(ends - s0)))
        if abs(ends[j] - s0) < REACH and s0 > words[j]['a'] + 0.03:
            t = round(s0 + 0.02, 3)
            if abs(t - words[j]['b']) > 0.015 and (j + 1 >= len(words) or t < words[j + 1]['a']):
                words[j]['b'] = t; moved += 1
    json.dump(words, open(palabras, 'w'))
    s = np.array(shifts) if shifts else np.zeros(1)
    print(f'{len(runs)} pausas · {moved} bordes ajustados a la voz · inicios tras pausa: media {np.mean(s) * 1000:+.0f} ms, máx {np.max(np.abs(s)) * 1000:.0f} ms')


if __name__ == '__main__':
    main(*sys.argv[1:])

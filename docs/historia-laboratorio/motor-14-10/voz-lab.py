"""Solo laboratorio: graba el guion con la voz Mónica de macOS frase a frase y escribe input.json con
las palabras y sus tiempos estimados (en la app vienen de la alineación real de la voz del canal).
Uso: python3 voz-lab.py guion.txt carpeta ["instrucciones de estilo"]"""
import json, os, re, subprocess, sys, wave
LAB = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
FF = f'{LAB}/bin/ffmpeg'
RATE = 48000
script = open(sys.argv[1]).read().strip()
out = sys.argv[2]
os.makedirs(f'{out}/tts', exist_ok=True)
sents = [s for s in re.split(r'(?<=[.?!])\s+', re.sub(r'\s+', ' ', script)) if s]
t, pcm, words = 0.5, b'\x00\x00' * int(RATE * 0.5), []
for n, se in enumerate(sents):
    a, w = f'{out}/tts/{n:03d}.aiff', f'{out}/tts/{n:03d}.wav'
    subprocess.run(['say', '-v', 'Mónica', '-r', os.environ.get('VOZ_RATE', '178'), '-o', a, se], check=True)
    subprocess.run([FF, '-y', '-loglevel', 'error', '-i', a, '-ar', str(RATE), '-ac', '1', '-sample_fmt', 's16', w], check=True)
    os.remove(a)
    with wave.open(w) as f:
        data, d = f.readframes(f.getnframes()), f.getnframes() / RATE
    ws = se.split()
    weights = [len(x) + 1.6 for x in ws]
    k = t
    for x, g in zip(ws, weights):
        step = d * g / sum(weights)
        words.append({'t': x, 'a': round(k, 3), 'b': round(k + step, 3)})
        k += step
    gap = float(os.environ.get('VOZ_GAP', '0.35')) if n < len(sents) - 1 else 1.6
    pcm += data + b'\x00\x00' * int(RATE * gap)
    t += d + gap
with wave.open(f'{out}/voz.wav', 'wb') as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(RATE); f.writeframes(pcm)
style = sys.argv[3] if len(sys.argv) > 3 else ''
json.dump({'script': script, 'style': style, 'duration': round(t, 3), 'voice': 'voz.wav', 'words': words}, open(f'{out}/input.json', 'w'), ensure_ascii=False)
print(len(sents), 'frases,', len(words), 'palabras,', round(t, 1), 's')

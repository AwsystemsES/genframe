"""Banda sonora del vídeo explicativo: música compuesta por código con instrumentos reales (VSCO 2, CC0)
según el estado de ánimo que elige el director de arte, efectos de Kenney (CC0) en los instantes que
marcan las escenas, ambientes sintetizados con filtros y la voz encima (la música baja cuando habla),
normalizado a -14 LUFS.

Uso: python3 audio.py job.json salida.wav
job: {duration, voice, music: {mood, build: [t, t]}, sfx: [{name, t, gain}], ambience: [{kind, from, to, gain}]}
"""
import json, os, re, subprocess, sys, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
LAB = os.environ.get('LAB') or os.path.abspath(os.path.join(HERE, '..', '..'))
FF = os.environ.get('FFMPEG') or f'{LAB}/bin/ffmpeg'
SR = 48000
V = f'{LAB}/assets/samples/vsco2-ce'
KEN = f'{LAB}/assets/audio/kenney'
CAT = json.loads(subprocess.run(['node', '-e', "import('" + os.path.join(HERE, 'catalog.mjs') + "').then(c=>console.log(JSON.stringify({sfx:c.SFX,moods:c.MUSIC_MOODS})))"],
                                capture_output=True, text=True, check=True).stdout)
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
cache = {}


def load(path):
    if path not in cache:
        raw = subprocess.run([FF, '-v', 'error', '-i', path, '-f', 's16le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
        cache[path] = np.frombuffer(raw, dtype='<i2').astype(np.float64).reshape(-1, 2) / 32768
    return cache[path]


def pitch(x, semis):
    if semis == 0:
        return x
    idx = np.arange(0, len(x) - 1, 2 ** (semis / 12))
    return np.stack([np.interp(idx, np.arange(len(x)), x[:, c]) for c in range(2)], 1)


def put(buf, x, t, gain=1.0, length=None, fade=0.25):
    s = int(t * SR)
    if s >= len(buf) or s < 0:
        return
    x = x[: (int(length * SR) if length else len(x))].copy()
    if length:
        f = min(len(x), int(fade * SR))
        x[-f:] *= np.linspace(1, 0, f)[:, None]
    e = min(len(buf), s + len(x))
    buf[s:e] += x[: e - s] * gain


def sampler(folder, pattern):
    """Instrumento por nota MIDI: busca la muestra más cercana y la transporta."""
    files = {}
    for f in os.listdir(folder):
        m = re.match(pattern, f)
        if m:
            files[12 * (int(m.group(2)) + 1) + NOTE[m.group(1)[0]] + ('#' in m.group(1))] = f
    def play(note):
        near = min(files, key=lambda k: abs(k - note))
        return pitch(load(f'{folder}/{files[near]}'), note - near)
    return play


def piano_sampler():
    folder = f'{V}/Keys/Upright Piano'
    mapping = {}
    for line in open(f'{folder}/MappingChart.txt'):
        m = re.match(r'(\d{3})=(\d+)', line.strip())
        if m and os.path.exists(f'{folder}/Player_dyn1_rr1_{m.group(1)}.wav'):
            mapping[int(m.group(2))] = m.group(1)
    def play(note, vel=1):
        near = min(mapping, key=lambda k: abs(k - note))
        return pitch(load(f'{folder}/Player_dyn{vel}_rr1_{mapping[near]}.wav'), note - near)
    return play


def compose(mood, dur, build):
    """Progresión de cuatro acordes en la tonalidad del ánimo; el instrumento principal lleva el arpegio,
    el piano el bajo y las cuerdas entran en los puntos de `build` para que el vídeo crezca."""
    cfg = CAT['moods'].get(mood)
    n = int(SR * dur)
    out = np.zeros((n + SR * 6, 2))
    if not cfg:
        return out[:n]
    piano = piano_sampler()
    harp = sampler(f'{V}/Strings/Harp', r'KSHarp_([A-G]#?)(\d)_')
    cello = sampler(f'{V}/Strings/Cello Section/susvib', r'susvib_([A-G]#?)(\d)_v1')
    violin = sampler(f'{V}/Strings/Violin Section/susVib', r'VlnEns_susVib_([A-G]#?)(\d)_v1')
    tonic = 48 + NOTE[cfg['key']]
    if cfg['mode'] == 'major':
        degrees = [(0, [0, 4, 7]), (7, [-5, -1, 2]), (9, [-3, 0, 4]), (5, [-7, -3, 0])]  # I V vi IV
    else:
        degrees = [(0, [0, 3, 7]), (8, [-4, 0, 3]), (3, [-9, -5, -2]), (10, [-2, 2, 5])]  # i VI III VII
    beat = 60 / cfg['bpm']
    bar = beat * 4
    b1, b2 = (build + [dur * 0.35, dur * 0.65])[:2]
    t, k = 0.3, 0
    while t < dur - 1:
        root, chord = degrees[k % 4]
        notes = [tonic + 12 + c for c in chord]
        bass = tonic - 12 + root
        if cfg['lead'] == 'harp':
            arp = [notes[0], notes[1], notes[2], notes[0] + 12, notes[2], notes[1], notes[0] + 12, notes[2]]
            for j, nt in enumerate(arp):
                put(out, harp(nt), t + j * beat / 2, 0.55, length=beat * 2, fade=0.6)
            put(out, piano(bass, 1), t, 0.6, length=bar, fade=0.6)
        elif cfg['lead'] == 'piano':
            for j, nt in enumerate([notes[0], notes[2], notes[1], notes[2]]):
                put(out, piano(nt, 1), t + j * beat, 0.45, length=beat * 1.8, fade=0.5)
            put(out, piano(bass, 1), t, 0.55, length=bar, fade=0.6)
        else:
            for nt in notes:
                put(out, violin(nt), t, 0.22, length=bar + 0.4, fade=0.9)
            put(out, cello(bass), t, 0.4, length=bar + 0.4, fade=0.9)
            for j in range(4):
                put(out, piano(bass + 12, 2 if j == 0 else 1), t + j * beat, 0.35, length=beat, fade=0.2)
        if t >= b1 - 1 and cfg['lead'] != 'strings':
            put(out, cello(bass), t, 0.32, length=bar, fade=0.9)
        if t >= b2 - 1:
            put(out, violin(notes[1] + 12), t, 0.22, length=bar, fade=1.0)
        t += bar
        k += 1
    put(out, piano(tonic, 1), dur - 2.6, 0.6, length=2.5, fade=1.8)
    out = out[:n]
    ramp = np.arange(n)
    out *= np.minimum(1, ramp / (SR * 1.5))[:, None] * np.minimum(1, (n - ramp) / (SR * 2.5))[:, None]
    return out


def synth_beat(style, dur, build):
    """Emisora de radio de videojuego hecha por síntesis: batería, bajo y acordes. 'urbano' = hip-hop
    pausado (88 ppm, swing); 'synthwave' = 100 ppm con arpegio y pads de sierras desafinadas."""
    n = int(SR * dur)
    out = np.zeros((n + SR * 4, 2))
    bpm = 88 if style == 'urbano' else 100
    soft = style == 'curioso'
    beat = 60 / bpm
    t_ = lambda sec: np.arange(int(sec * SR)) / SR

    def kick():
        x = t_(0.45); f = 45 + 95 * np.exp(-x * 28)
        y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 7)
        return np.stack([y, y], 1) * 0.95
    def snare():
        x = t_(0.3); rng = np.random.default_rng(4)
        y = band(rng.standard_normal(len(x)), 1200, 7000) * np.exp(-x * 18) * 0.9 + np.sin(2 * np.pi * 185 * x) * np.exp(-x * 30) * 0.5
        return np.stack([y, y], 1)
    def hat(open_=False):
        x = t_(0.25 if open_ else 0.06); rng = np.random.default_rng(8)
        y = band(rng.standard_normal(len(x)), 7000, 15000) * np.exp(-x * (12 if open_ else 70)) * 0.35
        return np.stack([y, y * 0.8], 1)
    def saw(freq, sec, detune=0.0):
        x = t_(sec); y = 0
        for d in (-detune, 0, detune):
            y = y + 2 * ((x * freq * (1 + d)) % 1) - 1
        return y / 3
    def lowpass(y, cut):
        a = np.exp(-2 * np.pi * cut / SR); out_ = np.empty_like(y); acc = 0.0
        for i in range(len(y)):
            acc = (1 - a) * y[i] + a * acc; out_[i] = acc
        return out_
    K_, S_, H_, HO = kick(), snare(), hat(), hat(True)
    mf = lambda m: 440 * 2 ** ((m - 69) / 12)
    prog = [(57, [0, 3, 7, 10]), (53, [0, 4, 7, 11]), (48, [0, 4, 7, 9]), (55, [0, 4, 7, 10])]  # Am7 Fmaj7 C6 G7
    if style == 'curioso':
        prog = [(48, [0, 4, 7, 11]), (55, [0, 4, 7, 9]), (57, [0, 3, 7, 10]), (53, [0, 4, 7, 9])]  # Cmaj7 G6 Am7 F6
    bar = beat * 4
    # Acordes y bajo pre-calculados por compás (filtro lento en Python puro: se calcula una vez por acorde).
    chords, basses = {}, {}
    for root, iv in prog:
        y = sum(saw(mf(root + 12 + i), bar, 0.006 if style == 'synthwave' else 0.002) for i in iv) / len(iv)
        y = lowpass(y, 1400 if style == 'synthwave' else 900) * np.minimum(1, t_(bar) / 0.25)
        chords[root] = np.stack([y, np.roll(y, 300)], 1)
        b = lowpass(saw(mf(root - 12), beat * 0.9), 260) * np.exp(-t_(beat * 0.9) * 2.2)
        basses[root] = np.stack([b, b], 1)
    b1, b2 = (list(build) + [dur * 0.3, dur * 0.6])[:2]
    arps = {}
    t, k = 0.0, 0
    while t < dur:
        root, iv = prog[k % 4]
        put(out, chords[root], t, 0.12 if soft else (0.32 if style == 'synthwave' else 0.22))
        for j in range(4):
            bt = t + j * beat
            put(out, K_, bt + (0.02 if style == 'urbano' and j % 2 else 0), 0.9 if j in (0, 2) else (0.5 if style == 'synthwave' else 0))
            if j in (1, 3) and t >= b1 - 1: put(out, S_, bt, 0.25 if soft else 0.7)
            put(out, basses[root], bt, 0.55 if j in (0, 2) or style == 'synthwave' else 0.35)
            for h in range(2):
                sw = beat / 2 * (0.62 if style == 'urbano' and h else 0.5) * h * 2
                put(out, HO if (style == 'synthwave' and h) else H_, bt + sw, 0.5 if t >= b1 - 1 else 0.25)
        if (style == 'synthwave' and t >= b2 - 1) or soft:
            for j in range(8):
                note = root + 24 + iv[j % len(iv)]
                if note not in arps:
                    y = lowpass(saw(mf(note), beat / 2 * 0.9), 3200 if soft else 2500) * np.exp(-t_(beat / 2 * 0.9) * (14 if soft else 6))
                    arps[note] = np.stack([y, y], 1)
                put(out, arps[note], t + j * beat / 2, 0.3 if soft else 0.16)
        t += bar
        k += 1
    out = out[:n]
    ramp = np.arange(n)
    out *= np.minimum(1, ramp / (SR * 1.5))[:, None] * np.minimum(1, (n - ramp) / (SR * 3))[:, None]
    return out


def synth_fx(name, dur):
    """Efectos que no hay en la biblioteca, sintetizados: rugido de reactor, gravilla, chirrido de frenos,
    motor diésel y zumbido de la unidad auxiliar (APU)."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    rng = np.random.default_rng(abs(hash(name)) % 9999)
    env = np.minimum(1, t / 0.4) * np.minimum(1, (dur - t) / 0.6)
    if name == 'roar':
        y = band(rng.standard_normal(n), 60, 2400) * (0.35 + 0.65 * np.minimum(1, t / (dur * 0.6))) + band(rng.standard_normal(n), 2500, 9000) * 0.25 * np.minimum(1, t / dur)
    elif name == 'gravel':
        y = band(rng.standard_normal(n) * (rng.random(n) > 0.995) * 8, 1200, 7000) + band(rng.standard_normal(n), 300, 1500) * 0.2
    elif name == 'screech':
        f = 900 + 500 * np.sin(2 * np.pi * 7 * t) * np.exp(-t)
        y = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.5 + band(rng.standard_normal(n), 2000, 6000) * 0.3
        env = np.minimum(1, t / 0.05) * np.minimum(1, (dur - t) / 0.08)
    elif name == 'diesel':
        y = np.sign(np.sin(2 * np.pi * 32 * t)) * 0.25 + band(rng.standard_normal(n), 80, 500) * 0.5
        y = band(y, 40, 900)
    elif name == 'apu':
        y = np.sin(2 * np.pi * 420 * t) * 0.15 + np.sin(2 * np.pi * 840 * t) * 0.05 + band(rng.standard_normal(n), 200, 2000) * 0.5
    else:
        return None
    y = y / max(1e-9, np.max(np.abs(y))) * env
    return np.stack([y, np.roll(y, 300)], 1)


def band(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    w = np.clip((f - lo * 0.7) / (lo * 0.3 + 1e-9), 0, 1) * np.clip((hi * 1.4 - f) / (hi * 0.4), 0, 1)
    return np.fft.irfft(X * w, len(x))


def ambience(kind, n, seed):
    tt = np.arange(n) / SR
    noise = lambda s: np.random.default_rng(seed * 10 + s).standard_normal(n)
    if kind == 'mar':
        x = band(noise(1), 80, 700) * (0.55 + 0.45 * np.sin(2 * np.pi * tt / 6.5) ** 2)
    elif kind == 'viento':
        x = band(noise(2), 150, 900) * (0.6 + 0.4 * np.sin(2 * np.pi * tt / 4.1))
    elif kind == 'lluvia':
        x = band(noise(3), 1500, 9000) * 0.8 + band(noise(4) * (np.random.default_rng(seed).random(n) > 0.9985), 800, 6000) * 6
    elif kind == 'rio':
        x = band(noise(6), 350, 2200) * (0.7 + 0.3 * np.sin(2 * np.pi * tt * 3.3) * np.sin(2 * np.pi * tt * 1.7))
    else:
        return np.zeros((n, 2))
    x /= max(1e-9, np.max(np.abs(x)))
    return np.stack([x, np.roll(x, 900)], 1)


def window(n, a, b, fade=1.0):
    t = np.arange(n) / SR
    return np.clip((t - a + fade) / fade, 0, 1) * np.clip((b - t + fade) / fade, 0, 1)


def mix(job, out_path):
    dur = float(job['duration'])
    n = int(SR * dur)
    voice = load(job['voice'])
    voice = np.pad(voice, ((0, max(0, n - len(voice))), (0, 0)))[:n]
    music_cfg = job.get('music') or {}
    mood = music_cfg.get('mood', 'documental')
    cfg = CAT['moods'].get(mood) or {}
    music = synth_beat(cfg['synth'], dur, list(music_cfg.get('build') or [])) if cfg.get('synth') else compose(mood, dur, list(music_cfg.get('build') or []))
    fx = np.zeros((n, 2))
    for i, a in enumerate(job.get('ambience') or []):
        a0, a1 = float(a.get('from', 0)), float(a.get('to', dur))
        fx += ambience(a.get('kind'), n, i + 1) * (window(n, a0, a1, 1.2) * 0.3 * float(a.get('gain', 1)))[:, None]
    for s in job.get('sfx') or []:
        synth = synth_fx(s.get('name'), float(s.get('dur', 2)))
        if synth is not None:
            put(fx, synth, float(s['t']), float(s.get('gain', 1)))
            continue
        file = CAT['sfx'].get(s.get('name'))
        if file:
            put(fx, load(f'{KEN}/{file}'), float(s['t']), 0.45 * float(s.get('gain', 1)))
    # La música baja mientras suena la voz.
    env = np.sqrt(np.convolve(voice[:, 0] ** 2, np.ones(2400) / 2400, mode='same'))
    active = (env > 0.01).astype(float)
    g = np.empty(n)
    s = 0.0
    for i in range(0, n, 480):
        s += (active[i] - s) * (0.3 if active[i] > s else 0.05)
        g[i:i + 480] = s
    peak = np.max(np.abs(music))
    if peak > 0:
        music *= (0.42 - 0.24 * g)[:, None] / peak * float(music_cfg.get('gain', 1))
    out = voice + music + fx * 0.7
    out /= max(1.0, np.max(np.abs(out)) / 0.95)
    pre = out_path + '.pre.wav'
    with wave.open(pre, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((out * 32767).astype('<i2').tobytes())
    r = subprocess.run([FF, '-hide_banner', '-i', pre, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}', r, re.S).group(0))
    af = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
          f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    subprocess.run([FF, '-y', '-loglevel', 'error', '-i', pre, '-af', af, '-ar', str(SR), out_path], check=True)
    os.remove(pre)
    return float(m['input_i'])


if __name__ == '__main__':
    job = json.load(open(sys.argv[1]))
    print('mezcla', mix(job, sys.argv[2]), '-> -14 LUFS')

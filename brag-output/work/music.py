"""Synthesizes the 21.6 s soundtrack (100 BPM, 1 beat = 0.6 s) with numpy only.

Every hit lands on a cue in compose.html's renderAt timeline.
Output: soundtrack.wav (44.1 kHz, 16-bit stereo).
"""

import wave
import numpy as np

SR = 44100
B = 0.6
DUR = 21.6
N = int(SR * DUR)
L = np.zeros(N)
R = np.zeros(N)
rng = np.random.default_rng(7)


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def env(n, a, d, s=0.0, curve=4.0):
    """attack seconds, exponential decay seconds, sustain floor"""
    t = np.arange(n) / SR
    att = np.clip(t / max(a, 1e-4), 0, 1)
    dec = s + (1 - s) * np.exp(-np.maximum(t - a, 0) * curve / max(d, 1e-4))
    return att * dec


def lp(x, cutoff):
    """exact one-pole lowpass, block-recursive"""
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    state = 0.0
    step = max(1, min(8192, int(600 / (2 * np.pi * cutoff / SR))))  # keep a**k representable
    for i in range(0, len(x), step):
        blk = x[i:i + step] * (1 - a)
        k = np.arange(1, len(blk) + 1)
        pw = a ** k
        y[i:i + len(blk)] = pw * (state + np.cumsum(blk / pw))
        state = y[i + len(blk) - 1]
    return y


def mx(*xs):
    """sum signals of different lengths"""
    out = np.zeros(max(len(x) for x in xs))
    for x in xs:
        out[:len(x)] += x
    return out


def add(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    l = np.cos((pan + 1) * np.pi / 4)
    r = np.sin((pan + 1) * np.pi / 4)
    L[i:i + len(sig)] += sig * gain * l * 1.414
    R[i:i + len(sig)] += sig * gain * r * 1.414


def tone(f, dur, a=0.005, d=0.4, s=0.0, kind="sine", detune=0.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    if kind == "sine":
        x = np.sin(2 * np.pi * f * t)
    elif kind == "tri":
        x = 2 / np.pi * np.arcsin(np.sin(2 * np.pi * f * t))
    elif kind == "saw":
        x = sum(np.sin(2 * np.pi * f * h * t) / h for h in range(1, 12) if f * h < 9000)
        x *= 0.55
    if detune:
        x = 0.5 * x + 0.5 * tone(f * (1 + detune), dur, a, d, s, kind)
        return x
    return x * env(n, a, d, s)


def kick(soft=1.0):
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 42 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7.5) * soft


def heartbeat():
    return kick(0.9) + np.concatenate([np.zeros(int(0.18 * SR)), kick(0.55)])[: int(0.45 * SR)]


def noise(dur, cutoff, a, d):
    n = int(dur * SR)
    return lp(lp(rng.standard_normal(n), cutoff), cutoff) * env(n, a, d)


def hat():
    n = int(0.08 * SR)
    x = rng.standard_normal(n)
    x = x - lp(x, 6000)
    return x * env(n, 0.001, 0.05, curve=6)


def chime(f, dur=1.6):
    return (tone(f, dur, 0.002, dur * 0.8) + 0.35 * tone(f * 2.01, dur, 0.002, dur * 0.4)
            + 0.12 * tone(f * 3.98, dur, 0.002, dur * 0.2))


def riser(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = rng.standard_normal(n)
    out = np.zeros(n)
    # sweep cutoff up in 8 steps
    for k in range(8):
        lo, hi = k * n // 8, (k + 1) * n // 8
        c = 300 * 2 ** (k * 0.6)
        out[lo:hi] = lp(lp(x, c), c)[lo:hi]
    return out * (t / dur) ** 2


def whoosh(dur=0.5):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return lp(lp(rng.standard_normal(n), 1800), 1800) * np.sin(np.pi * t / dur) ** 2


# ---------------------------------------------------------------- hook B0-6
# A-minor drone that swells, heartbeat on every beat
drone_n = int(3.9 * SR)
dt = np.arange(drone_n) / SR
drone = (np.sin(2 * np.pi * hz(45) * dt) + 0.6 * np.sin(2 * np.pi * hz(52) * dt)
         + 0.25 * np.sin(2 * np.pi * hz(57) * dt * 1.002))
drone *= np.clip(dt / 1.2, 0, 1) * np.clip((3.9 - dt) / 0.3, 0, 1)
add(lp(drone, 900), 0.0, 0.16)
for b in range(6):
    add(heartbeat(), b * B, 0.5 if b < 3 else 0.62)
# typing clicks 0.15-1.7 s
for k, at in enumerate(np.arange(0.17, 1.7, 0.055)):
    if rng.random() < 0.8:
        add(noise(0.02, 5000, 0.0005, 0.012), at, 0.10, pan=rng.uniform(-0.3, 0.3))
# price counter ticks 0.6-1.8 s, decelerating
for at in 0.6 + 1.2 * (1 - (1 - np.linspace(0, 1, 14)) ** 0.5):
    add(tone(hz(88), 0.05, 0.001, 0.04), at, 0.05, pan=0.3)
# "would you pay?" sting at 2.0 s: dissonant low hit
add(tone(hz(33), 1.4, 0.003, 1.0, kind="saw") * 0.6 + tone(hz(46), 1.4, 0.003, 1.0, kind="tri"), 2.0, 0.22)
add(riser(1.55), 2.05, 0.10)

# ---------------------------------------------------------------- drop B6 = 3.6 s
add(kick(1.2), 3.6, 0.8)
add(noise(1.6, 3000, 0.001, 1.2), 3.6, 0.10)
add(chime(hz(72), 2.4), 3.65, 0.16, pan=-0.2)
add(chime(hz(79), 2.4), 3.75, 0.10, pan=0.25)

# chords, 2 beats each from B6 to B31 (midi triads), then outro on C
C, G, Am, F, Dm, Em = [48, 52, 55], [43, 47, 50], [45, 48, 52], [41, 45, 48], [50, 53, 57], [52, 55, 59]
prog = [C, G, Am, F,  # reveal + doc in
        Am, Am, F, Em, Am, F, G,  # danger verdict, flags (darker)
        Am, F, C,  # cost
        F, G]  # voice/journey lifts
beat = 6
for ch in prog:
    at, dur = beat * B, 2 * B
    pad = sum(tone(hz(m + 12), dur + 0.3, 0.06, 1.0, s=0.75, kind="saw", detune=0.004) for m in ch)
    pad *= np.clip((dur + 0.3 - np.arange(len(pad)) / SR) / 0.3, 0, 1)
    add(lp(pad, 1400), at, 0.035, pan=-0.15)
    add(lp(tone(hz(ch[0] - 12), dur, 0.005, 0.9, s=0.3, kind="saw"), 500), at, 0.16)
    # pluck arpeggio in eighths
    for k in range(4):
        m = ch[k % 3] + 24 + (12 if k == 3 else 0)
        add(tone(hz(m), 0.5, 0.002, 0.25, kind="tri"), at + k * B / 2, 0.06, pan=0.35 if k % 2 else -0.35)
    beat += 2

# drums B6-B31: kick on beats, hat on offbeats; lighter during danger verdict
for b in range(6, 31):
    soft = 0.45 if 13 <= b < 19 else 0.62
    add(kick(), b * B, soft)
    add(hat(), b * B + B / 2, 0.06 + (0.03 if b >= 22 else 0), pan=0.4)

# ---------------------------------------------------------------- check SFX
add(whoosh(0.55), 5.75, 0.14)            # doc slides in (6.0)
n = int(1.2 * SR)                          # scan 6.6-7.8 sweep
st = np.arange(n) / SR
scan = np.sin(2 * np.pi * np.cumsum(600 + 900 * st / 1.2) / SR) * np.sin(np.pi * st / 1.2) ** 2
add(lp(scan, 2500), 6.6, 0.04)
add(mx(kick(1.1), tone(hz(38), 1.2, 0.002, 0.9, kind="tri")), 7.8, 0.45)   # verdict thud
for i, at in enumerate([9.0, 9.6, 10.2, 10.8]):  # flags: descending warning plucks
    add(tone(hz(76 - i * 2), 0.6, 0.002, 0.35, kind="tri") + 0.4 * tone(hz(64 - i * 2), 0.6, 0.002, 0.3), at, 0.12)
add(tone(hz(69), 0.4, 0.002, 0.2), 11.4, 0.05)

# ---------------------------------------------------------------- cost SFX
add(whoosh(0.5), 12.95, 0.14)
for k, at in enumerate(np.linspace(13.4, 14.35, 12)):  # bars grow: rising ticks
    add(tone(hz(64 + k), 0.06, 0.001, 0.04), at, 0.04, pan=0.2)
add(mx(kick(1.2), noise(0.9, 4000, 0.001, 0.6) * 0.4), 14.4, 0.5)   # extra amount hit
add(chime(hz(57), 1.2), 14.4, 0.08)

# ---------------------------------------------------------------- voice + journey
add(whoosh(0.5), 15.95, 0.12)
add(mx(chime(hz(84), 0.6) * 0.6, chime(hz(91), 0.6) * 0.4), 16.25, 0.10)  # mic on
for i, m in enumerate([72, 76, 79, 84]):                                 # ring fills to 55
    add(chime(hz(m), 1.4), 16.9 + i * 0.25, 0.08, pan=-0.3 + i * 0.2)

# ---------------------------------------------------------------- outro B31 = 18.6 s
add(kick(1.2), 18.6, 0.6)
add(noise(2.0, 2500, 0.001, 1.5), 18.6, 0.08)
outro_n = DUR - 18.6
pad = sum(tone(hz(m + 12), outro_n, 0.08, 3.0, s=0.4, kind="saw", detune=0.004) for m in [48, 52, 55, 59])
pad *= np.clip((outro_n - np.arange(len(pad)) / SR) / 1.2, 0, 1)
add(lp(pad, 1600), 18.6, 0.05)
add(lp(tone(hz(36), outro_n, 0.01, 2.5, kind="saw"), 400), 18.6, 0.16)
for i, m in enumerate([72, 76, 79, 83, 84]):
    add(chime(hz(m), 2.2), 18.65 + i * 0.3, 0.09, pan=-0.4 + i * 0.2)
add(chime(hz(96), 2.0), 19.85, 0.05)

# ---------------------------------------------------------------- master
mix = np.stack([L, R])
fade = np.ones(N)
fn = int(0.8 * SR)
fade[-fn:] = np.linspace(1, 0, fn) ** 2
mix *= fade
mix = np.tanh(mix * 1.4) / np.tanh(1.4)     # gentle saturation / limiter
mix *= 0.89 / np.max(np.abs(mix))           # about -1 dBFS peak
pcm = (mix.T * 32767).astype(np.int16)
with wave.open("soundtrack.wav", "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("soundtrack.wav", DUR, "s")

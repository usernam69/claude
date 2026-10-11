"""Per-segment RMS/peak, plus a click detector (isolated sample jumps far above local energy).
Usage: python3 -I analyze.py file.wav [segment_seconds]"""
import sys, wave, numpy as np

path = sys.argv[1]
seg = float(sys.argv[2]) if len(sys.argv) > 2 else 0.5
w = wave.open(path)
sr, ch, sw, n = w.getframerate(), w.getnchannels(), w.getsampwidth(), w.getnframes()
raw = np.frombuffer(w.readframes(n), dtype=np.uint8)
if sw == 3:
    b = raw.reshape(-1, 3).astype(np.int32)
    x = (b[:, 0] | (b[:, 1] << 8) | (b[:, 2] << 16))
    x = np.where(x >= 1 << 23, x - (1 << 24), x) / float(1 << 23)
else:
    x = np.frombuffer(raw.tobytes(), dtype=np.int16) / 32768.0
x = x.reshape(-1, ch)
mono = x.mean(axis=1)
db = lambda v: 20 * np.log10(max(v, 1e-9))
print(f"{path}: {n/sr:.2f}s  sr={sr}  ch={ch}  bits={sw*8}")
L = int(seg * sr)
row = []
for i in range(0, len(mono), L):
    s = x[i:i + L]
    row.append(f"{i/sr:5.1f}s {db(np.sqrt((s**2).mean())):6.1f}dB pk{db(np.abs(s).max()):5.1f}")
for i in range(0, len(row), 4):
    print("  " + " | ".join(row[i:i + 4]))
# click detection: second difference vs local RMS of the second difference
d2 = np.abs(np.diff(mono, 2))
win = int(0.01 * sr)
k = np.convolve(d2, np.ones(win) / win, mode="same") + 1e-6
ratio = d2 / k
idx = np.where((ratio > 40) & (d2 > 0.02))[0]
clicks = []
for j in idx:
    if not clicks or j - clicks[-1] > sr * 0.05:
        clicks.append(j)
print(f"possible clicks: {len(clicks)}" + ("  at " + ", ".join(f"{c/sr:.3f}s" for c in clicks[:20]) if clicks else ""))
print(f"clipped samples (|x|>=0.999): {int((np.abs(x) >= 0.999).sum())}")

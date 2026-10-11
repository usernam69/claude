import sys, wave, numpy as np
from faster_whisper import WhisperModel
p = sys.argv[1]; model = sys.argv[2] if len(sys.argv) > 2 else 'small.en'
w = wave.open(p); sr = w.getframerate(); ch = w.getnchannels(); n = w.getnframes(); raw = np.frombuffer(w.readframes(n), np.uint8)
b = raw.reshape(-1, 3).astype(np.int32); x = b[:, 0] | (b[:, 1] << 8) | (b[:, 2] << 16); x = np.where(x >= 1 << 23, x - (1 << 24), x) / float(1 << 23)
x = x.reshape(-1, ch).mean(1)
# resample to 16 kHz (linear)
t16 = np.arange(0, len(x) / sr, 1 / 16000); a = np.interp(t16, np.arange(len(x)) / sr, x).astype(np.float32)
m = WhisperModel(model, compute_type='int8')
segs, _ = m.transcribe(a, language='en', beam_size=5, vad_filter=False, condition_on_previous_text=False)
for s in segs: print(f"{s.start:6.1f} {s.text}")

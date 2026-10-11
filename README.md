# Four pieces about Claude Opus 5.5, made entirely in code

Every frame and every sound here comes from code: HTML, CSS, SVG, canvas, GSAP and Three.js for picture,
and the Web Audio API (rendered offline with `OfflineAudioContext` in headless Chromium) for all music,
sound effects and the sung voice. There are no images, stock footage, samples, audio files or generated media.
Video is rendered with HyperFrames 0.8.79 and muxed with ffmpeg.

| # | Piece | Final file(s) | Spec |
|---|---|---|---|
| 1 | Launch trailer | `opus-trailer/renders/opus-trailer.mp4` | 18 s · 2560×1440 · 60 fps · H.264 + AAC |
| 2 | 3D animated short, "Clawd and the rocket" | `clawd-rocket/renders/clawd-rocket.mp4` | 22 s · 1920×1080 · 30 fps · Three.js |
| 3 | Original song, "Opus" | `opus-song/opus-song.wav`, `opus-song/opus-song.mp3`, `opus-song/lyrics.txt` | 2:30 · 48 kHz 24-bit WAV · 320 kbps MP3 · −9 LUFS, −1 dBTP |
| 4 | Ad | `opus-ad/vertical/renders/opus-ad-1080x1920.mp4`, `opus-ad/landscape/renders/opus-ad-1920x1080.mp4` | 30 s · 30 fps |

Each folder has its plan: `BEATSHEET.md` (trailer, ad), `STORYBOARD.md` (short), `ARRANGEMENT.md` (song).

## Layout

```
tools/
  lib/synth.js         Web Audio synth engine (drums, bass, pads, plucks, FM bells, risers, impacts,
                       reverb, delay, sidechain, formant voice)
  lib/motion.js        easing and seeded helpers (every value is a function of t)
  lib/render-audio.mjs renders a score offline in headless Chromium, masters it, writes WAV
  lib/dsp.mjs          BS.1770 loudness, true-peak limiter, mono bass below 120 Hz, WAV I/O
  sync-assets.sh       copies gsap, Three.js, fonts and motion.js into a project's assets/
opus-trailer/   index.html (canvas dot field + GSAP type) · audio/score.js
clawd-rocket/   index.html · scene.js (Three.js rig, sparks, fireworks) · audio/score.js
opus-song/      score.js (arrangement, formant voice, lyrics as syllables)
opus-ad/        src/index.template.html · build.sh (makes vertical/ and landscape/) · audio/score.js
```

## Rebuild

```bash
cd tools && npm install && npx hyperframes browser ensure && cd ..
# audio
node tools/lib/render-audio.mjs opus-trailer/audio/score.js opus-trailer/audio/score.wav --lufs -14 --tp -1
# video (from a project folder)
cd opus-trailer && npx --prefix ../tools hyperframes render -f 60 -q high -o renders/opus-trailer.mp4
```

Renders are deterministic: all randomness is seeded and every frame is a pure function of time.

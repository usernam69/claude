# Four pieces about Claude Opus 5.5, made entirely in code

Every frame and every sound here comes from code: HTML, CSS, SVG, canvas, GSAP and Three.js for picture,
and the Web Audio API (rendered offline with `OfflineAudioContext`) for all music, sound effects and the
singing voice. There are no images, stock footage, samples, audio files or generated media. Video is
rendered with [HyperFrames](https://www.npmjs.com/package/hyperframes) 0.8.79, and ffmpeg muxes and encodes.

| # | Piece | Final file | Spec |
|---|---|---|---|
| 1 | Launch trailer | `opus-trailer/renders/opus-trailer.mp4` | 18 s · 2560×1440 · 60 fps · H.264 + AAC |
| 2 | 3D animated short "Clawd and the rocket" | `clawd-rocket/renders/clawd-rocket.mp4` | 22 s · 1920×1080 · 30 fps · Three.js |
| 3 | Original song "Opus" | `opus-song/opus-song.wav`, `opus-song.mp3`, `lyrics.txt` | 2:31 · 48 kHz 24-bit WAV · 320 kbps MP3 |
| 4 | Ad | `opus-ad/renders/opus-ad-1080x1920.mp4`, `opus-ad-1920x1080.mp4` | 30 s · vertical + landscape · 30 fps |

Each folder has its plan: `BEATSHEET.md` (trailer, ad), `STORYBOARD.md` (short), `ARRANGEMENT.md` (song).

## Layout

```
_tools/            shared code
  lib/synth.js       Web Audio synth engine (drums, bass, pads, plucks, FM bells, risers, impacts,
                     algorithmic reverb, sidechain ducking, glue comp + limiter, WAV encoder)
  lib/motion.js      easing / per-character text animation helpers (everything is f(t))
  render-audio.mjs   renders a score offline in headless Chrome → WAV (--stem vocals|music)
  audio-report.sh    integrated LUFS, true peak, LRA
  analyze.py         per-segment levels, click detector, clipped-sample count
  transcribe.py      Whisper transcription, used to check the sung lyrics are intelligible
opus-trailer/      index.html + audio/score.js
clawd-rocket/      index.html + scene.js (Three.js) + audio/score.js
opus-song/         score.js (arrangement + formant voice)
opus-ad/           src/template.html + ad.js (one script, both aspect ratios) + audio/score.js + build.sh
```

## Rebuild

```bash
cd _tools && npm install && npx hyperframes browser ensure
# audio (any piece)
node _tools/render-audio.mjs opus-trailer/audio/score.js opus-trailer/audio/score.wav --gain 0.8
# video
cd opus-trailer && npx --prefix ../_tools hyperframes render -f 60 -q high -o renders/opus-trailer.mp4
```

Renders are deterministic. All randomness is seeded (mulberry32) and every frame is a pure function of time.

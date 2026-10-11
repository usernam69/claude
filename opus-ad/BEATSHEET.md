# Ad: beat sheet

30 s · 120 BPM (one beat = 0.5 s) · two cuts from one template and one score
- `vertical/` 1080×1920, 30 fps (social). Text kept clear of the top 250 px and bottom 400 px platform UI.
- `landscape/` 1920×1080, 30 fps. Text kept inside a 5 % safe margin.

The ad works with the sound off: every beat has a picture that reads on its own, and the sound adds a hook without carrying any meaning.

| Time | Beat | On screen | What the viewer takes in | Sound |
|---|---|---|---|---|
| 0.0–1.5 | Hook | Dark screen. A monospace error line types out: `undefined is not a function`, with a blinking clay cursor | A problem every developer knows, in the first second | Sub hit on 0.0, typing clicks 0.2–1.0, a tick |
| 1.5–4.5 | Problem | "It breaks at 2 a.m." then "Only in production." | The frustration: something that only fails when it matters | Riser, kick on 1.5 and 3.0, a second tick |
| 4.5–7.0 | Answer | The background turns cream. "Meet Claude Opus 5.5" | Who the answer is | Whoosh and impact on 4.5, the hook melody starts |
| 7.0–12.0 | UI 1 | A file tree card. Files light up as it reads them. "Reads the whole codebase." | It reads the code it's given | Whoosh on 7.0, a click per file on 8.0, 8.5, 9.0, 9.5, 10.0 |
| 12.0–17.0 | UI 2 | A chat card. The question types in, then the answer. "Explains it in plain words." | It explains the problem clearly | Whoosh on 12.0, click on the question, clicks while the answer types |
| 17.0–21.8 | UI 3 | A diff card. The bad line is struck through, the fix appears, and a "tests passed" pill with a check arrives. "Writes the fix, then checks it." | It writes the fix and verifies it | Whoosh on 17.0, clicks on each line, a bell on the check at 20.6 |
| 21.8–22.0 | Transition | A clay wipe turns the frame ink. The diff card shrinks to a clay dot | The card becomes the logo mark | Whoosh on 21.8 |
| 22.0–30.0 | End card | "Claude Opus 5.5" and "Try it at claude.ai" (held 7.5 s). The clay dot sits above the name | The product, and what to do | Sonic logo on 22.0: a bell arpeggio (C5, E5, G5, C6) over a C major pad with a sub hit. Tail fades 27.2 to 30 |

Notes
- Every claim in the UI moments is a general description of what the model does in a coding session (reads code, explains, writes a fix, runs tests). No numbers, no benchmarks, no testimonials.
- Copy is short: one idea per moment, held at least 1.5 s so it can be read.
- Tone: warm, human, confident. Colors: ink, cream, clay. Serif headlines, sans for the rest, monospace only inside the code UI.
- All motion is eased (expo, back, power). The clay wipes are the only hard transitions and they are motivated: they carry the change from problem to answer and from UI to end card.

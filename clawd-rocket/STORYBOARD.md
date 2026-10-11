# Clawd and the rocket: storyboard

22 s · 1920×1080 · 30 fps · Three.js in HyperFrames · score at 100 BPM (beat = 0.6 s), every hit on its action.
No text anywhere. One continuous little world (a toy-scale Clawd on a big human workbench), with every cut motivated.

| # | Time | Shot / camera | What the viewer must understand | Action (anticipation → action → reaction) | Sound |
|---|---|---|---|---|---|
| 1 | 0.0–3.0 | **Opening transition:** camera starts above the roof looking down through the moonlit skylight, descends through it and settles on a medium-wide of the bench | It's night, a cosy cluttered workshop, a little clay guy is busy | Clawd taps junk into shape: arm lifts (anticipation), slams down (squash), clank ×3 | Soft plucky score starts; clank, clank, clank on 1.8 / 2.4 / 3.0 |
| 2 | 3.0–6.0 | Slow push to medium on Clawd + rocket | He is building a **rocket** out of junk | Funnel nose, then fins hop onto a tin can, one per beat; Clawd's eyes follow each piece; proud bounce at 5.4 | A clank per part, small "ta-da" pluck at 5.4 |
| 3 | 6.0–8.4 | Fast eased dolly down to a low angle on the fuse | He lights it | Clawd strikes a match (6.0), lowers it (anticipation), touches the fuse (7.2); a spark races along the fuse | Match scritch + flare, fuse hiss |
| 4 | 8.4–10.2 | Camera pulls back to a wide (the rocket's shudder motivates the move) | It's going to launch… and it doesn't | Rocket shudders, hops 10 cm, **fizzles** (sad puff), tips over and rolls. Clawd's eyes pop tall, then he flinches | Rattle, sad descending fizzle whistle, tip-over clank |
| 5 | 10.2–12.0 | Slow push-in on Clawd | Disappointment (held reaction) | Clawd **slumps**: body squashes, eyes shrink to half height and look down, arms droop. Held still-but-breathing | Score drops to two sad minor notes |
| 6 | 12.0–13.0 | Same framing → **whip pan** right, led by Clawd's eyes | An idea! A bigger can | Anticipation dip, eyes pop tall, body springs up (stretch). Eyes dart right, camera whips to the big spray can | "Ding!", whoosh on the whip |
| 7 | 13.0–15.6 | Medium tracking the push | He's making it bigger | Clawd shoves the big can under the rocket, tosses the rocket upright on top, tapes the joint twice. Then he hustles back to his spot | Scrape, clunk, **two tape rips**, quick pitter-patter steps |
| 8 | 15.6–17.4 | Two-shot, wide | Second try | New match, new fuse, spark races; everything shudders harder; Clawd squints and leans back | Scritch, hiss, rising rattle, riser |
| 9 | 17.4–19.8 | **Whip tilt up** following the rocket through the skylight; hold looking up through the shattered frame | It works! Fireworks | Rocket rips up, the glass bursts into shards, the rocket bursts into clay / cream / gold fireworks ×3 | Launch roar, glass crash, firework booms + crackle, score turns triumphant (major) |
| 10 | 19.8–22.0 | **Match cut** on a burst of light → low angle on Clawd in the **same spot he started**, looking up, lit by the sky | Joy | Coloured light washes over him on each distant burst; a small happy hop; **closing transition:** camera drifts up and the frame fades to night | Distant booms, gentle resolving pluck chord, tail |

Lighting: warm desk-lamp spot (shadows) against cool moonlight from the skylight, low ambient, a touch of depth of field (bokeh pass), filmic tone mapping.
Determinism: every object's state is computed from `t` alone: no physics, no `Math.random()` (seeded mulberry32), so any frame can be rendered in any order.

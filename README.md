# McDermott Studio: brand film

A 45-second film for the firm's in-house legal software platform. Built in three.js + GSAP, exported to 1920×1080 60fps H.264.

## ⚠ Claims that need Marketing sign-off before any external use

These lines and implications are **not cleared**. Do not show the film outside the firm until Marketing (and, where relevant, Risk/GC) signs off:

| Where | Claim | Why it needs review |
|---|---|---|
| Beat 2, 11s | **"We chose to build our own."** | Implies the firm builds, rather than buys, its tools. Check this against what we actually license. |
| Beat 4, 36s | **"Your information. Our walls."** | A data-residency/security claim. |
| Beat 4 visuals (sealed boundary, gray form stopped at the wall) | **Implies client data never touches a third party** | Must match actual data flows, including any model or hosting providers. |
| Beat 3, 21–35s | **"Bespoke: Built around the matter, not the market."** | Claims tools are built per matter. |
| Beat 3 | **"Fitted: Works the way our teams already work."** | Workflow-fit claim. |
| Beat 3 | **"Supervised: Lawyers review what it produces."** | Human-review claim; must be true for every tool shown. |
| Beat 3 | **"Adaptable: Changes as fast as the law does."** | Speed-of-change claim. |
| Beat 3 | **"Ours: We own it, so we can improve it tomorrow."** | Ownership/IP claim; check licensing of underlying models. |

## Run it

```bash
npm install            # three r169, gsap, puppeteer
npm run vendor         # copies three + gsap into ./vendor (committed; runs offline)
npm run serve          # http://localhost:4545
```

Dev controls: **Space** replays from 0 · **P** pause/resume · **← →** step 1 s · **, .** step 1 frame · **1–5** jump to beat · **M** mute · drag the scrubber · click the frame to pause. `?t=26` opens at 26 s.

## Export

```bash
npm run export                          # → out/mcdermott-studio.mp4 (H.264, 1080p60, AAC)
npm run export -- --from 29 --to 40     # a range
npm run export -- --stills 5,14,26,36   # review stills → out/stills/
```

Every frame is rendered deterministically (seeded randomness, grain keyed to frame index) and captured by Puppeteer. Needs `ffmpeg` with libx264 on PATH (or `FFMPEG=/path/to/ffmpeg`).

## Assets

- `assets/lockup-teal-on-dark.png`: **missing. Drop the approved teal-on-dark lockup here.** It's used as-is: never recolored, rebuilt, or animated (fade in only). Until it arrives, a dashed placeholder frame shows.

## Structure

```
index.html            stage (1920×1080, scaled to fit), type overlay, dev bar, importmap
src/main.js           renderer, master GSAP timeline, camera shots, dips, playback, export hooks
src/post.js           EffectComposer: Render → Bokeh (DOF) → UnrealBloom → Output → SMAA → grain/CA/vignette/dip
src/camera.js         orbit rig + Hermite camera moves (continuous, never stop mid-move)
src/beats/city.js     beats 1–2
src/beats/instruments.js  beats 3–5
src/type.js           copy cues (timings)
src/audio.js          placeholder sound layer; cue timings are final
tools/                vendor, static server, Puppeteer export
```

## Beat map

One continuous shot in one world (the city). No cuts.

| # | Beat | Time | What happens | Copy |
|---|---|---|---|---|
| 1 | The buy reflex | 0–9 s | Identical glass vessels; the same graphite slab lowers into each | 5 s "Most firms are buying the same tools." |
| 2 | The turn | 9–17 s | City dims; one vessel lights from inside; gold point rises | 11 s "We chose to build our own." · 14 s "McDermott Studio" |
| 3 | Built, one by one | 17–35 s | Five neighbours swap the slab for a custom tool (press, gyro, lattice, arches, spire); camera visits each | label + line per tool, 21.35 s then every 2.8 s |
| 4 | Inside the guardrails | 35–41 s | Glass wall rises, teal boundary draws, gold seal; gray slab stops dead at the wall | 39 s "Your information. Our walls." |
| 5 | The answer | 41–45 s | City falls to navy; the boundary frames the lockup | 43 s "Built in-house. Built for law." |

Sound cues: low pad 0–35 s · rise 35–37 s · low hit on the gold seal at 37 s · silence from 41 s.

## Status

| Beat | State |
|---|---|
| Pipeline | ✅ built |
| 1 | blocking, in review |
| 2–5 | blocking |

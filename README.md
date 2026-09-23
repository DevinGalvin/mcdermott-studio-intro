# McDermott Studio: brand film

A 45-second film for the firm's in-house legal software platform. Built in three.js + GSAP, exported to 1920×1080 60fps H.264.

## ⚠ Claims that need Marketing sign-off before any external use

These lines and implications are **not cleared**. Do not show the film outside the firm until Marketing (and, where relevant, Risk/GC) signs off:

| Where | Claim | Why it needs review |
|---|---|---|
| Beat 2, 11s | **"We chose to build our own."** | Implies the firm builds, rather than buys, its tools. Check this against what we actually license. |
| Beat 4, 36s | **"Your information. Our walls."** | A data-residency/security claim. |
| Beat 4 visuals (sealed boundary, gray form stopped at the wall) | **Implies client data never touches a third party** | Must match actual data flows, including any model or hosting providers. |
| Beat 1 | **The fictional "Standard Terms" boilerplate** (e.g. "have not been developed to meet its individual requirements", data "processed by sub-processors, wherever located") | Invented vendor-style terms; must not read as quoting any real provider. |
| Beat 3, 20.6–33s | **Bespoke: "Built around the matter in front of us."** | Claims tools are built per matter. |
| Beat 3 | **Fitted: "Shaped to the way our teams already work."** | Workflow-fit claim. |
| Beat 3 | **Supervised: "Every output is reviewed by a lawyer."** | Absolute human-review claim; must be true for every tool. |
| Beat 3 | **Adaptable: "Amended as fast as the law moves."** | Speed-of-change claim. |
| Beat 3 | **Ours: "Owned by us, improved by us, accountable to you."** | Ownership/accountability claim; check licensing of underlying models. |
| Beat 3 | **The 35 matter names on the rewritten pages** (e.g. "Built for this hospital merger.") | Fictional and generic, but check none reads as a real client matter. |

## Run it

```bash
npm install            # gsap, puppeteer
npm run vendor         # copies gsap into ./vendor (committed; runs offline)
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
index.html            stage (1920×1080, scaled to fit), all type and layout, dev bar
src/main.js           the film: document layers, master GSAP timeline, playback, export hooks
src/audio.js          placeholder sound layer; cue timings are final
tools/                vendor, static server, Puppeteer export
```

## Beat map

"The Document": a kinetic-type film made of legal text. Hard cuts every 0.5–2.6 s, type set huge.

| Section | Time | What happens |
|---|---|---|
| Standard terms | 0–8.2 s | Six 0.55 s cuts of boilerplate phrases ("as-is", "no customization", "wherever located"…), then a slam pull-back to a wall of 128 identical pages. 4.5 s "Most firms are buying the same tools." |
| The turn | 8.2–12.6 s | The clause, huge, struck through in teal. "We chose to" types; "build our own." slams in teal. |
| Title | 12.6–16 s | "McDermott Studio" with a gold rule |
| Built for each matter | 16–30.6 s | The redline rips across the wall. Five pillars, five compositions: Bespoke (matter names flip), Fitted (columns snap to a line), Supervised (gold sign-off stroke), Adaptable (version counter, word rewrites itself), Ours. |
| Inside the walls | 30.6–38.2 s | The frame of the film becomes the wall, sealed in gold at 32.5 s; standard pages fly in and stop dead against it. 35 s "Your information. Our walls." |
| The answer | 38.2–45 s | The wall shrinks to frame the lockup. 40.4 s "Built in-house. Built for law." |

Sound cues: low pad 0–30.6 s · rise 30.6–32.5 s · low hit on the gold seal at 32.5 s · silence from 38.2 s.

## Status

| Beat | State |
|---|---|
| Pipeline | ✅ built |
| 1 | blocking, in review |
| 2–5 | blocking |

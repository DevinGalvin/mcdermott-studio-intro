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
| Beat 3, 18–29s | **1.1 Bespoke: "Built around the matter in front of us."** | Claims tools are built per matter. |
| Beat 3 | **1.2 Fitted: "Shaped to the way our teams already work."** | Workflow-fit claim. |
| Beat 3 | **1.3 Supervised: "Every output is reviewed by a lawyer."** | Absolute human-review claim; must be true for every tool. |
| Beat 3 | **1.4 Adaptable: "Amended as fast as the law moves."** | Speed-of-change claim. |
| Beat 3 | **1.5 Ours: "Owned by us, improved by us, accountable to you."** | Ownership/accountability claim; check licensing of underlying models. |
| Beat 4, 30–33s | **2.1 "Client data stays inside the Firm."** (redlined from "Data may be shared with third parties.") | The strongest data-residency claim in the film. |

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

"The Document": a 2D typographic film made of legal text. One continuous piece, no cuts.

| # | Beat | Time | What happens |
|---|---|---|---|
| 1 | The buy reflex | 0–9 s | Macro on a boilerplate clause; pull out to a wall of identical contract pages. 5 s "Most firms are buying the same tools." |
| 2 | The turn | 9–17 s | Gold cursor; the line is redlined (teal strike, tracked insertion "We chose to build our own."); accept change; 14 s title + gold hairline |
| 3 | Terms of our own | 17–30 s | Our agreement drafts itself: "Built for the matter. Not the market." then clauses 1.1–1.5, one pillar each, with teal margin notes |
| 4 | Inside the walls | 30–40 s | Data clause redlined; pull back; teal border drawn around the agreement, sealed in gold (35.85 s); a boilerplate page stops dead at the border; 36.9 s "Your information. Our walls." |
| 5 | Executed | 40–45 s | The agreement falls away; the border becomes the lockup frame; 43 s "Built in-house. Built for law." |

Sound cues: low pad 0–31 s · rise 31–35.85 s · low hit on the gold seal at 35.85 s · silence from 40 s.

## Status

| Beat | State |
|---|---|
| Pipeline | ✅ built |
| 1 | blocking, in review |
| 2–5 | blocking |

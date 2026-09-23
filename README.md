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
| 17–34s | **The five before/after pairs** ("without warranty" → "reviewed by a lawyer"; "licensed to you" → "owned by us, accountable to you"; etc.) | The "before" lines paraphrase common vendor terms; the "after" lines are factual claims about Studio tools. |
| Throughout | **The matter names on the rewritten pages** (e.g. "Built for this hospital merger.") | Fictional and generic, but check none reads as a real client matter. |
| 34s | **"PRIVILEGED & CONFIDENTIAL" stamp** | Shown on a fictional page as a visual device; confirm it cannot be read as a claim about privilege. |

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

"The Document": a film made of legal text. Six moments, every line held long enough to read.

| Section | Time | What happens |
|---|---|---|
| The same terms | 0–6.5 s | Macro on one boilerplate clause; pull back: it is on every page of a 128-page wall. 3.7 s "Most firms are buying the same tools." |
| One stroke | 6.5–11.5 s | A teal line slices through the whole wall; every clause is struck. 8.1 s "We chose to build our own." |
| The name | 11.5–17 s | The title's letters light up inside a paragraph of boilerplate, everything else fades, and they fly together into "McDermott Studio". |
| Redlining standard terms | 17–34 s | Five industry clichés struck and rewritten, 3.4 s each: "as-is" → as your matter needs it (Bespoke) · "in the same form for all" → in the shape of your team (Fitted) · "without warranty" → reviewed by a lawyer (Supervised) · "may change at any time" → changes when the law does (Adaptable) · "licensed to you" → owned by us, accountable to you (Ours) |
| Privileged & confidential | 34–40.3 s | Our page is stamped PRIVILEGED & CONFIDENTIAL; the frame is walled in teal and sealed in gold (36.2 s); a standard page stops dead at the wall. 37.3 s "Your information. Our walls." |
| The answer | 40.3–45 s | The wall shrinks to frame the lockup. 42.3 s "Built in-house. Built for law." |

Sound cues: low pad 0–34 s · rise 34–36.2 s · low hit on the gold seal at 36.2 s · silence from 40.3 s.

## Status

| Beat | State |
|---|---|
| Pipeline | ✅ built |
| 1 | blocking, in review |
| 2–5 | blocking |

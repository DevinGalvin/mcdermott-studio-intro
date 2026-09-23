# McDermott Studio brand film: build brief

Everything Claude Code needs to know is here. The person running the session watches the render in a browser and steers in real time.

## What we are making

A 45-second cinematic brand film for McDermott Studio, the firm's in-house platform for building custom AI-powered legal software. Audience: clients and prospects. It will be shown at pitches and on screens in reception. The bar is an Apple keynote product intro: restrained, expensive, every frame a still you could print.

Story spine: most firms are buying the same tools. We build our own. We can build anything a matter needs. It all runs inside our walls. Built for you.

## Non-negotiables

- Luxurious, not playful. Slow easing, long holds, weight. Nothing bounces.
- Navy and teal tell the story. Gold appears sparingly as a hairline or a point of light. No royal blue. White only for type.
- Secondary brand colors (orange, magenta, neon) appear only as thin outlines, never fills, and only if a shot genuinely needs them. Default is none.
- Type: Georgia for every line of display copy. Arial only for small tracked-out labels. Never load a webfont.
- Minimal on-screen text. One line per beat at most. The visuals carry the argument.
- Never name a competitor or vendor in copy or on screen.
- Runs as a single self-contained HTML file plus an assets folder. Must also export to a 1920x1080 MP4 at the end (headless capture via Puppeteer, frame by frame, at 60fps).

## Palette

Navy #000042 (ground). Teal #00E2C1 (story). Gold #E5AC2E (accent, sparing). White #FFFFFF (type). Fog and vignette are navy pushed toward black, never gray.

## Tech stack

- three.js, latest r16x, ES modules via importmap from a pinned CDN or vendored locally.
- Post-processing is mandatory: EffectComposer with UnrealBloomPass, BokehPass (depth of field), an SMAA pass, and a custom film-grain plus subtle chromatic aberration shader as the final pass. Without this pipeline the film will look flat. Do not ship without it.
- Materials: MeshPhysicalMaterial with transmission and clearcoat for glass elements. Brushed metal via roughness maps generated procedurally. Teal emissive surfaces drive the bloom. Volumetric feel via layered fog planes with additive blending, not true volumetrics.
- Camera: a single virtual camera driven by a GSAP timeline. Continuous moves only: push-ins, slow orbits, rack focus by animating the BokehPass focus distance. No hard cuts inside a beat. Cuts between beats are a 6-frame dip to navy.
- Type: HTML overlay layer, not 3D text. GSAP animates opacity, tracking, and a subtle blur-to-sharp. Type is always the last thing to arrive in a beat and the first to leave.
- Timeline: one master GSAP timeline in seconds. Every beat is a labeled section. A scrubber in the dev build lets the reviewer drag to any second. Keyboard: space replays, arrow keys step one second.
- Sound: hook a sound layer from the start, even with placeholder tones. Three cues: a sustained low pad through beats 1 to 3, a rising element in beat 4, a single low hit on the seal, silence for the close. Real music comes later; the timing hooks exist now.

## The five beats

### Beat 1, The buy reflex, 0 to 9s
- A city of identical glass towers seen from above at night, navy and black. Camera descends slowly. Into every tower the same gray monolith lowers and locks in. Cold, uniform, a little bleak.
- Copy at 5s: "Most firms are buying the same tools."
- Feel: order without character.

### Beat 2, The turn, 9 to 17s
- Every tower dims except one. Camera pushes toward it. No monolith arrives. Instead, teal light ignites inside and begins drawing structure from within, a lattice growing floor by floor. A single gold point of light rises through the core.
- Copy at 11s: "We chose to build our own." Then at 14s, the title: "McDermott Studio", Georgia, large, arriving through a blur-to-sharp with tracking that tightens.
- Feel: the first warm thing in the film.

### Beat 3, Anything, for anyone, 17 to 29s
- The customization argument. Camera moves through a dark space where five distinct instruments assemble from teal light, each with a different silhouette and mechanism: a stacked press, a rotating ring, a lattice grid, an arc, a spire. Each visibly fits a different shaped body of work moving through it. Depth of field racks from one to the next. Nothing repeats.
- Copy at 26s: "Built for the matter. Not the market."
- Feel: craft, precision, variety. If the five instruments read as variations of one object, the beat fails.

### Beat 4, Inside the guardrails, 29 to 40s
- Slowest beat. Camera pulls back. The five instruments sit inside a single navy structure. A teal boundary draws around it and seals with a gold hairline. A gray form approaches from outside and stops dead at the wall. Inside, light flows freely between the instruments.
- Copy at 36s: "Your information. Our walls."
- Feel: calm, absolute. This is the most important shot in the film. Spend the most time here.

### Beat 5, The answer, 40 to 45s
- The structure resolves into a ring of light around the firm lockup. Hold.
- Copy at 43s: "Built in-house. Built for law."
- Lockup asset: use the teal-on-dark PNG in /assets. Do not recolor, rebuild, or animate the lockup itself. It fades in and holds.

## How to work the session

- Build the pipeline first: renderer, composer with all passes, timeline with scrubber, placeholder shapes for every beat. Get to a full 45-second scrub before polishing any single shot.
- Then polish in story order. Show the reviewer each beat, take notes, move on. Do not polish beat 3 while beat 1 is unapproved.
- After every change, reload in the browser and describe in one line what changed. The reviewer is watching.
- When the reviewer says a beat is approved, lock it and do not touch it again without being asked.
- Performance target: 60fps on a MacBook Pro at 1920x1080 with bloom and depth of field on. If it drops, reduce geometry before reducing post-processing.
- Export: a script that renders every frame to PNG via Puppeteer and stitches with ffmpeg to MP4, H.264, 1920x1080, 60fps.

## Claims that need sign-off before external use

- "We chose to build our own"
- "Your information. Our walls."
- Any implication that client data never touches a third party

Flag these in the README of the project so Marketing sees them.

## Session log

- Beat approvals and locks are recorded in README.md → Status. A locked beat is not touched without being asked.
- The reviewer watches through a private web preview. After every change: `node tools/web.mjs`, republish `out/web` to the same preview URL, and end every message with a ▶ Play link to it. The web build swaps the firm name for "Studio Name" (published pages can't carry a real organization's branding); the repo and the MP4 export keep the real name.

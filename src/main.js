import * as THREE from 'three';
import { gsap } from 'gsap';
import { C, buildEnvironment } from './util.js';
import { buildPost } from './post.js';
import { cameraMove, applyRig, focusDistance } from './camera.js';
import { buildCity, HERO_POS } from './beats/city.js';
import { buildInstruments, instPos, AZ } from './beats/instruments.js';
import { buildType } from './type.js';
import { createPlayer, renderWav } from './audio.js';

const W = 1920, H = 1080, FPS = 60, DURATION = 45;
const params = new URLSearchParams(location.search);
const EXPORT = params.has('export');
if (EXPORT) document.body.classList.add('export');

export const BEATS = [
  { id: 'b1', name: 'The buy reflex', start: 0 },
  { id: 'b2', name: 'The turn', start: 9 },
  { id: 'b3', name: 'Anything, for anyone', start: 17 },
  { id: 'b4', name: 'Inside the guardrails', start: 29 },
  { id: 'b5', name: 'The answer', start: 40 },
];
// 6-frame dips to navy. Only at true cuts: 1→2, 3→4 and 4→5 are written as continuous
// moves in the brief ("every tower dims", "camera pulls back", "resolves"). Flip to true to dip.
const DIPS = { 9: false, 17: true, 29: false, 40: false };

// ─── Renderer, scene, camera ──────────────────────────────────────────────────
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: EXPORT });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.toneMapping = THREE.NeutralToneMapping; // keeps navy and teal on-brand; ACES shifts them
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
const BG = C.navy.clone().multiplyScalar(0.55);
scene.background = BG;
scene.fog = new THREE.FogExp2(BG.clone(), 0.006);
scene.environment = buildEnvironment(renderer);

const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 600);
const post = buildPost(renderer, scene, camera, W, H);

const city = buildCity();
const inst = buildInstruments();
scene.add(city.group, inst.group);

// ─── Master timeline ──────────────────────────────────────────────────────────
const tl = gsap.timeline({ paused: true });
for (const b of BEATS) tl.addLabel(b.id, b.start);

// Shot A, beats 1–2: descend over the city, then push toward the one tower that lights.
const H3 = HERO_POS;
const shotA = cameraMove([
  { t: 0,  tx: 0,         ty: 0,  tz: 0,         r: 135, el: 76, az: 18, fov: 30 },
  { t: 9,  tx: H3.x * .5, ty: 2,  tz: H3.z * .5, r: 88,  el: 60, az: 30, fov: 30 },
  { t: 13, tx: H3.x,      ty: 10, tz: H3.z,      r: 48,  el: 40, az: 38, fov: 30 },
  { t: 17, tx: H3.x,      ty: 15, tz: H3.z,      r: 28,  el: 24, az: 44, fov: 32 },
]);
tl.to(shotA, { u: 1, duration: 17, ease: 'none' }, 0);

// Shot B, beats 3–5: a slow orbit past each instrument, then the long pull-back, then the rise.
const IY = [1.3, 2.2, 2.0, 1.3, 2.6];
const at = (k, dt) => { const p = instPos(k, IY[k]); return { tx: p.x, ty: p.y, tz: p.z }; };
const shotB = cameraMove([
  { t: 17,   ...at(0), r: 10.5, el: 12, az: AZ[0] - 10, fov: 30 },
  { t: 19,   ...at(0), r: 8.4,  el: 10, az: AZ[0] + 16, fov: 30 },
  { t: 21,   ...at(1), r: 8.4,  el: 9,  az: AZ[1] + 16, fov: 30 },
  { t: 23,   ...at(2), r: 8.4,  el: 11, az: AZ[2] + 16, fov: 30 },
  { t: 25,   ...at(3), r: 8.4,  el: 9,  az: AZ[3] + 16, fov: 30 },
  { t: 27.2, ...at(4), r: 9.2,  el: 8,  az: AZ[4] + 16, fov: 30 },
  { t: 29,   ...at(4), r: 10.5, el: 10, az: AZ[4] + 24, fov: 30 },
  { t: 33,   tx: 0, ty: 1.2, tz: 0, r: 31, el: 26, az: 352, fov: 32 },
  { t: 40,   tx: 0, ty: 1.0, tz: 0, r: 39, el: 36, az: 364, fov: 32 },
  { t: 42.8, tx: 0, ty: 0,   tz: 0, r: 59, el: 89.4, az: 372, fov: 30 },
  { t: 45,   tx: 0, ty: 0,   tz: 0, r: 59, el: 89.4, az: 372, fov: 30 },
]);
tl.to(shotB, { u: 1, duration: 28, ease: 'none' }, 17);

// Focus: follows the rig target in shot A; racks instrument to instrument in beat 3.
const fp = { x: 0, y: 0, z: 0, follow: 1 };
tl.set(fp, { follow: 0, ...xyz(instPos(0, IY[0])) }, 17);
for (let k = 1; k < 5; k++) tl.to(fp, { ...xyz(instPos(k, IY[k])), duration: 0.9, ease: 'power2.inOut' }, 17.7 + 2 * k);
tl.to(fp, { x: 0, y: 1.2, z: 0, duration: 2.5, ease: 'sine.inOut' }, 29.6);
function xyz(v) { return { x: v.x, y: v.y, z: v.z }; }

// Post and atmosphere by beat.
const P = post.state, fog = { d: 0.006 };
tl.set(P, { aperture: 0.00025, bloom: 0.7 }, 0);
tl.set(fog, { d: 0.0055 }, 0);
tl.to(P, { bloom: 1.05, duration: 4, ease: 'sine.inOut' }, 9.5);
tl.to(fog, { d: 0.009, duration: 3, ease: 'sine.inOut' }, 9.0);
tl.set(P, { aperture: 0.0014, bloom: 1.0 }, 17);
tl.set(fog, { d: 0.02 }, 17);
tl.to(P, { aperture: 0.00035, bloom: 0.9, duration: 3, ease: 'sine.inOut' }, 29.5);
tl.to(fog, { d: 0.009, duration: 4, ease: 'sine.inOut' }, 29.5);
tl.to(P, { aperture: 0.00008, bloom: 1.15, duration: 2.5, ease: 'sine.inOut' }, 40);
tl.to(fog, { d: 0.004, duration: 2.5, ease: 'sine.inOut' }, 40);

city.timeline(tl);
inst.timeline(tl);
buildType(tl, document.getElementById('type'));
tl.set({}, {}, DURATION);

// ─── Frame ────────────────────────────────────────────────────────────────────
const rig = {}, fpv = new THREE.Vector3();
function renderAt(t) {
  t = Math.min(DURATION, Math.max(0, t));
  tl.time(t, true);
  const inA = t < 17;
  city.group.visible = inA;
  inst.group.visible = !inA;
  (inA ? shotA : shotB).sample(rig);
  applyRig(camera, rig);
  if (fp.follow) fpv.set(rig.tx, rig.ty, rig.tz); else fpv.set(fp.x, fp.y, fp.z);
  P.focus = focusDistance(camera, fpv);
  scene.fog.density = fog.d;
  if (inA) city.update(t); else inst.update(t);

  let dip = 0;
  for (const [c, on] of Object.entries(DIPS)) if (on) dip = Math.max(dip, 1 - Math.abs(t - +c) / (3 / FPS));
  P.dip = Math.max(0, dip);

  post.apply(Math.round(t * FPS));
  post.composer.render();
  return t;
}

// ─── Export hooks (used by tools/export.mjs) ─────────────────────────────────
window.__film = {
  duration: DURATION, fps: FPS,
  renderAt: (t) => { renderAt(t); return renderer.getContext().finish?.() ?? true; },
  renderAudio: () => renderWav(DURATION),
};

// Prime every tween's start values, then park at 0.
tl.time(DURATION, true); tl.time(0, true);

// ─── Playback + dev controls ─────────────────────────────────────────────────
const stage = document.getElementById('stage');
function fit() {
  if (EXPORT) return;
  const f = document.getElementById('frame');
  const s = Math.min(f.clientWidth / W, f.clientHeight / H);
  stage.style.transform = `translate(${-W * s / 2}px, ${-H * s / 2}px) scale(${s})`;
}
addEventListener('resize', fit); fit();

let t = +(params.get('t') ?? 0), playing = false, last = 0;
const audio = createPlayer();
const $t = document.getElementById('t'), $beat = document.getElementById('beat'), $fps = document.getElementById('fps');
const track = document.getElementById('track');
const fill = track.querySelector('.fill'), head = track.querySelector('.head');
for (const b of BEATS) {
  const m = document.createElement('div'); m.className = 'tick'; m.style.left = `${b.start / DURATION * 100}%`;
  m.innerHTML = `<span>${b.start}s ${b.name}</span>`; track.appendChild(m);
}

function play(from = t) { t = from; playing = true; last = performance.now(); audio.play(t); }
function pause() { playing = false; audio.stop(); }
function seek(to) { pause(); t = Math.min(DURATION, Math.max(0, to)); }

addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); play(0); }
  else if (e.key === 'p' || e.key === 'P') playing ? pause() : play(t >= DURATION ? 0 : t);
  else if (e.key === 'ArrowRight') seek(Math.floor(t + 1e-6) + 1);
  else if (e.key === 'ArrowLeft') seek(Math.ceil(t - 1e-6) - 1);
  else if (e.key === '.') seek(t + 1 / FPS);
  else if (e.key === ',') seek(t - 1 / FPS);
  else if (e.key >= '1' && e.key <= '5') seek(BEATS[+e.key - 1].start);
  else if (e.key === 'm' || e.key === 'M') { if (audio.toggleMute()) {} else if (playing) audio.play(t); }
});
let dragging = false;
const scrub = (e) => { const r = track.getBoundingClientRect(); seek((e.clientX - r.left) / r.width * DURATION); };
track.addEventListener('pointerdown', (e) => { dragging = true; track.setPointerCapture(e.pointerId); scrub(e); });
track.addEventListener('pointermove', (e) => dragging && scrub(e));
track.addEventListener('pointerup', () => { dragging = false; });
stage.addEventListener('click', () => (playing ? pause() : play(t >= DURATION ? 0 : t)));

let frames = 0, fpsT = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  if (playing) {
    t += (now - last) / 1000; last = now;
    if (t >= DURATION) { t = DURATION; pause(); }
  }
  renderAt(t);
  const pct = t / DURATION * 100;
  fill.style.width = `${pct}%`; head.style.left = `${pct}%`;
  $t.textContent = `${t.toFixed(2)} s  ·  f${Math.round(t * FPS)}`;
  const b = [...BEATS].reverse().find((x) => t >= x.start);
  $beat.textContent = `${BEATS.indexOf(b) + 1} · ${b.name.toUpperCase()}`;
  frames++;
  if (now - fpsT > 500) { $fps.textContent = `${Math.round(frames * 1000 / (now - fpsT))} fps`; frames = 0; fpsT = now; }
}
if (!EXPORT) requestAnimationFrame(loop);
else renderAt(0);
window.__film.ready = true;

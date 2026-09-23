import * as THREE from 'three';
import { gsap } from 'gsap';
import { C, buildEnvironment } from './util.js';
import { buildPost } from './post.js';
import { cameraMove, applyRig } from './camera.js';
import { buildCity, HERO_POS } from './beats/city.js';
import { buildDistrict, toolPos, DISTRICT } from './beats/district.js';
import { buildType } from './type.js';
import { createPlayer, renderWav } from './audio.js';

const W = 1920, H = 1080, FPS = 60, DURATION = 45;
const params = new URLSearchParams(location.search);
const EXPORT = params.has('export');
// Render scale: previews render the GL at a fraction of 1080p (type layer stays crisp).
const RS = Math.min(1, Math.max(0.25, +(params.get('rs') ?? 1)));
if (EXPORT) document.body.classList.add('export');

export const BEATS = [
  { id: 'b1', name: 'The buy reflex', start: 0 },
  { id: 'b2', name: 'The turn', start: 9 },
  { id: 'b3', name: 'Built, one by one', start: 17 },
  { id: 'b4', name: 'Inside the guardrails', start: 35 },
  { id: 'b5', name: 'The answer', start: 41 },
];
// One continuous shot, one world: no dips. The mechanism stays for a future cut: { second: true }.
const DIPS = {};

// ─── Renderer, scene, camera ──────────────────────────────────────────────────
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: EXPORT });
renderer.setPixelRatio(1);
renderer.setSize(W * RS, H * RS, false);
renderer.toneMapping = THREE.NeutralToneMapping; // keeps navy and teal on-brand; ACES shifts them
renderer.toneMappingExposure = 1.25;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const BG = C.navy.clone().multiplyScalar(0.8);
scene.background = BG;
scene.fog = new THREE.FogExp2(BG.clone(), 0.006);
scene.environment = buildEnvironment(renderer);

const camera = new THREE.PerspectiveCamera(30, W / H, 40, 1400); // camera never gets closer than ~150
const post = buildPost(renderer, scene, camera, W * RS, H * RS);

const city = buildCity(scene);
const district = buildDistrict(city);
scene.add(city.group, district.group);

// ─── Master timeline ──────────────────────────────────────────────────────────
const tl = gsap.timeline({ paused: true });
for (const b of BEATS) tl.addLabel(b.id, b.start);

// One camera move for the whole film. Near-orthographic 7° lens throughout.
const H3 = HERO_POS, DC = { tx: DISTRICT.cx, tz: DISTRICT.cz };
const tool = (k, el, az, t) => { const p = toolPos(k, 6.2); return { t, tx: p.x, ty: p.y, tz: p.z, r: 235, el, az, fov: 7 }; };
const shot = cameraMove([
  { t: 0,    tx: -4,        ty: 0, tz: 4,         r: 430, el: 58, az: 8,  fov: 7 },
  { t: 9,    tx: H3.x * .5, ty: 3, tz: H3.z * .5, r: 315, el: 46, az: 38, fov: 7 },
  { t: 12,   tx: H3.x,      ty: 7, tz: H3.z,      r: 250, el: 40, az: 44, fov: 7 },
  { t: 16.3, tx: H3.x,      ty: 9, tz: H3.z,      r: 185, el: 36, az: 50, fov: 7 },
  { t: 19.8, ...DC, ty: 6, r: 330, el: 38, az: 44, fov: 7 },           // the build-out
  tool(0, 22, 32, 22.4), tool(1, 22, 36, 25.2), tool(2, 22, 40, 28.0),   // one by one
  tool(3, 30, 44, 30.8), tool(4, 30, 36, 33.6),
  { t: 35.8, ...DC, ty: 4, r: 360, el: 46, az: 48, fov: 7 },           // the guardrails
  { t: 39.2, ...DC, ty: 2, r: 380, el: 54, az: 42, fov: 7 },
  { t: 42.2, ...DC, ty: 0, r: 180, el: 89.5, az: 0, fov: 7 },          // the answer, top-down
  { t: 45,   ...DC, ty: 0, r: 180, el: 89.5, az: 0, fov: 7 },
]);
tl.to(shot, { u: 1, duration: DURATION, ease: 'none' }, 0);

// Post and atmosphere. No glow (bloom stays in the pipeline at 0); no depth of field.
const P = post.state, fog = { d: 0.0011 };
tl.set(P, { aperture: 0, bloom: 0, vignette: 0.32, ca: 0.0008 }, 0);
tl.to(fog, { d: 0.0024, duration: 3, ease: 'sine.inOut' }, 9.0);
tl.to(fog, { d: 0.0014, duration: 2, ease: 'sine.inOut' }, 17.5);
tl.to(fog, { d: 0.0, duration: 2, ease: 'sine.inOut' }, 40.4);

city.timeline(tl);
district.timeline(tl);
buildType(tl, document.getElementById('type'));
tl.set({}, {}, DURATION);

// ─── Frame ────────────────────────────────────────────────────────────────────
const rig = {};
function renderAt(t) {
  t = Math.min(DURATION, Math.max(0, t));
  tl.time(t, true);
  shot.sample(rig);
  applyRig(camera, rig);
  scene.fog.density = fog.d;
  city.update(t);
  district.update(t);

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

const bigplay = document.getElementById('bigplay'), playbtn = document.getElementById('playbtn');
const ICON_PLAY = '<svg viewBox="0 0 24 24"><path d="M6 4l14 8-14 8z"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>';
let started = false;
function syncUI() {
  if (playing) started = true;
  bigplay.hidden = playing || started; // the big button is the first-frame invitation only
  playbtn.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
  playbtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
}
function play(from = t) { t = from >= DURATION ? 0 : from; playing = true; last = performance.now(); audio.play(t); syncUI(); }
function pause() { playing = false; audio.stop(); syncUI(); }
bigplay.addEventListener('click', (e) => { e.stopPropagation(); play(t); });
playbtn.addEventListener('click', () => (playing ? pause() : play(t)));
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
track.addEventListener('pointerdown', (e) => { started = true; dragging = true; track.setPointerCapture(e.pointerId); scrub(e); });
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

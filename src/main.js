import { gsap } from 'gsap';
import { createPlayer, renderWav } from './audio.js';

// "The Document." A film made of legal text, 45 s.
//
// Beat 1: a clause, read up close: the customer acknowledges the service was not built
// for them. Pull out: it is one of hundreds of identical contract pages drifting by.
// "Most firms are buying the same tools."
// Beat 2: a gold cursor arrives and the line is redlined like a contract: struck in teal,
// "We chose to build our own." typed in as a tracked insertion. Accept change. Title.
// Beat 3: our own agreement drafts itself, one pillar per clause, each with a margin note.
// Beat 4: the data clause is redlined; the whole agreement is bordered in teal and sealed
// in gold; a boilerplate page slides in and stops dead at the border.
// Beat 5: the agreement falls away; the border becomes the frame for the lockup.

const W = 1920, H = 1080, FPS = 60, DURATION = 45;
const params = new URLSearchParams(location.search);
const EXPORT = params.has('export');
if (EXPORT) document.body.classList.add('export');

export const BEATS = [
  { id: 'b1', name: 'The buy reflex', start: 0 },
  { id: 'b2', name: 'The turn', start: 9 },
  { id: 'b3', name: 'Terms of our own', start: 17 },
  { id: 'b4', name: 'Inside the walls', start: 30 },
  { id: 'b5', name: 'Executed', start: 40 },
];

// ─── The document ─────────────────────────────────────────────────────────────
// Fictional boilerplate. Names no vendor; every clause quietly sets up the argument.
const PAGE = `
  <div class="hd"><span>Master Services Agreement</span><span>Standard Terms</span></div>
  <h4>1. Services</h4>
  <p><b>1.1</b>The Provider shall make the Services available to the Customer on a standard, as-is basis, in accordance with the Documentation and these Standard Terms.</p>
  <p><b>1.2</b>The Services are provided to all customers in the same form. No customization, modification or configuration shall be made for any individual Customer.</p>
  <p class="fcp"><b>1.3</b><span class="fc">The Customer acknowledges that the Services have not been developed to meet its individual requirements.</span></p>
  <h4>2. Customer Data</h4>
  <p><b>2.1</b>Customer Data may be processed by the Provider and its sub-processors, wherever located, in accordance with the Provider’s policies as updated from time to time.</p>
  <p><b>2.2</b>The Provider may use aggregated Customer Data to improve its services.</p>
  <h4>3. Changes</h4>
  <p><b>3.1</b>The Provider may modify, suspend or withdraw any feature of the Services at any time.</p>
  <div class="ft"><span>Standard Terms v4.2</span><span>Page 3 of 48</span></div>`;

const style = document.createElement('style');
style.textContent = `.page { overflow: hidden; } .page p { line-height: 1.5; } .fc { color: rgba(255,255,255,0.92); }`;
document.head.appendChild(style);

const PW = 300, PH = 388, GAP = 36;
function fill(plane, rows, cols) {
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const p = document.createElement('div');
    p.className = 'page'; p.innerHTML = PAGE;
    p.style.left = `${c * (PW + GAP)}px`; p.style.top = `${r * (PH + GAP)}px`;
    plane.appendChild(p);
  }
}
const near = document.getElementById('near'), far = document.getElementById('far');
fill(near, 4, 10);
fill(far, 5, 14);

// Where the camera starts: the clause on the page in row 1, column 3.
const FOCUS = (() => {
  const page = near.children[1 * 10 + 3], p = page.querySelector('.fcp');
  return { x: page.offsetLeft + PW / 2, y: page.offsetTop + p.offsetTop + p.offsetHeight / 2,
           pageX: page.offsetLeft + PW / 2, pageY: page.offsetTop + PH / 2 };
})();

// ─── Master timeline ──────────────────────────────────────────────────────────
const tl = gsap.timeline({ paused: true });
for (const b of BEATS) tl.addLabel(b.id, b.start);

// The camera over the near plane: plane point (fx, fy) sits at screen point (960, 470), scale s.
const cam = { s: 4.6, fx: FOCUS.x, fy: FOCUS.y, o: 0 };
const farS = { o: 0, blur: 1.2 };
const nearS = { o: 1, blur: 0 };
tl.to(cam, { o: 1, duration: 0.6, ease: 'sine.out' }, 0.1);
tl.to(cam, { s: 1, fx: FOCUS.pageX + 120, fy: FOCUS.pageY + 60, duration: 1.9, ease: 'expo.inOut' }, 2.3);
tl.to(farS, { o: 0.32, duration: 1.4, ease: 'sine.inOut' }, 2.9);
tl.to('#scrim', { opacity: 1, duration: 0.8, ease: 'sine.inOut' }, 4.5);

// Beat 1 copy.
const orig = document.getElementById('orig'), row1 = document.getElementById('row1'), row2 = document.getElementById('row2');
tl.set(row1, { opacity: 0 }, 0);
tl.fromTo(row1, { opacity: 0, filter: 'blur(10px)', letterSpacing: '0.06em' },
  { opacity: 1, filter: 'blur(0px)', letterSpacing: '-0.005em', duration: 1.0, ease: 'power3.out', immediateRender: false }, 5.0);

// The document recedes; the line becomes the subject.
tl.to(nearS, { o: 0.3, blur: 2.5, duration: 0.9, ease: 'power2.inOut' }, 8.3);
tl.to(farS, { o: 0.14, duration: 0.9, ease: 'power2.inOut' }, 8.3);

// Beat 2: the redline.
const strike = document.getElementById('strike'), ins = document.getElementById('ins'), caret = document.getElementById('caret');
const INSERT = 'We chose to build our own.';
const ed = { caret: 0, n: 0, strike: 0 };
tl.set(ed, { caret: 1 }, 9.05);
tl.to(ed, { strike: 1, duration: 0.55, ease: 'power2.inOut' }, 9.3);
tl.to(orig, { color: 'rgba(255,255,255,0.42)', duration: 0.4, ease: 'sine.out' }, 9.4);
tl.to(ed, { n: INSERT.length, duration: 1.05, ease: 'none' }, 9.95);
// Accept change: the strike collapses, the insertion takes its place and loses its markup.
tl.set(ed, { caret: 0 }, 12.5);
tl.to(row1, { opacity: 0, duration: 0.3, ease: 'power2.in' }, 12.5);
tl.to(row2, { y: -91, duration: 0.55, ease: 'power3.inOut' }, 12.6);
tl.to(ins, { color: '#ffffff', textDecorationColor: 'rgba(0,226,193,0)', duration: 0.45, ease: 'sine.inOut' }, 12.65);
tl.to('#edit', { opacity: 0, duration: 0.4, ease: 'power2.in' }, 13.5);
tl.to(nearS, { o: 0.06, duration: 0.8, ease: 'sine.inOut' }, 13.3);
tl.to(farS, { o: 0.04, duration: 0.8, ease: 'sine.inOut' }, 13.3);

// Title: blur to sharp, tracking tightening, a gold hairline beneath.
tl.fromTo('#title', { opacity: 0, filter: 'blur(16px)', letterSpacing: '0.3em' },
  { opacity: 1, filter: 'blur(0px)', letterSpacing: '-0.005em', duration: 1.6, ease: 'power3.out', immediateRender: false }, 14.0);
tl.fromTo('#rule', { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: 'power3.inOut', immediateRender: false }, 14.7);
tl.to(['#title', '#rule'], { opacity: 0, duration: 0.5, ease: 'power2.in' }, 16.3);

// ─── Beat 3: terms of our own ─────────────────────────────────────────────────
const own = document.getElementById('own'), sheet = document.getElementById('sheet');
const clauses = [...sheet.querySelectorAll('.cl')], notes = [...own.querySelectorAll('.note')];
const pillars = clauses.slice(0, 5), dcl = document.getElementById('dcl');
// Margin notes sit level with the first line of their clause.
pillars.forEach((c, k) => { notes[k].style.top = `${c.offsetTop + 13}px`; });
const SHEET_H = sheet.offsetHeight;
const view = { s: 1, tx: 0, ty: 150, o: 0 };
const atClause = (el) => 560 - el.offsetTop;
tl.fromTo(view, { o: 0, ty: 190 }, { o: 1, ty: 150, duration: 0.9, ease: 'power3.out', immediateRender: false }, 17.0);
tl.set([...clauses, ...notes], { opacity: 0 }, 0);
tl.set(clauses, { clipPath: 'inset(0 100% 0 0)' }, 0);
tl.set(own.querySelectorAll('.note i'), { scaleX: 0 }, 0);
const T3 = [18.6, 20.9, 23.2, 25.5, 27.8];
pillars.forEach((c, k) => {
  const at = T3[k];
  if (k > 0) tl.to(view, { ty: atClause(c), duration: 0.8, ease: 'power3.inOut' }, at - 0.55);
  tl.to(c, { opacity: 1, clipPath: 'inset(0 0% 0 0)', duration: 0.75, ease: 'power2.out' }, at);
  tl.fromTo(notes[k], { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out', immediateRender: false }, at + 0.2);
  tl.to(notes[k].querySelector('i'), { scaleX: 1, duration: 0.45, ease: 'power2.out' }, at + 0.3);
});

// ─── Beat 4: inside the walls ─────────────────────────────────────────────────
const dOrig = document.getElementById('d-orig'), dStrike = document.getElementById('d-strike');
const dIns = document.getElementById('d-ins'), dCaret = document.getElementById('d-caret');
const D_INSERT = 'Client data stays inside the Firm.';
const dd = { caret: 0, n: 0, strike: 0 };
tl.to(view, { ty: atClause(dcl) - 40, duration: 0.8, ease: 'power3.inOut' }, 30.0);
tl.set('#dsec', { opacity: 0 }, 0);
tl.to('#dsec', { opacity: 1, duration: 0.5, ease: 'sine.out' }, 30.3);
tl.to(dcl, { opacity: 1, clipPath: 'inset(0 0% 0 0)', duration: 0.6, ease: 'power2.out' }, 30.5);
tl.set(dd, { caret: 1 }, 31.2);
tl.to(dd, { strike: 1, duration: 0.5, ease: 'power2.inOut' }, 31.4);
tl.to(dd, { n: D_INSERT.length, duration: 1.1, ease: 'none' }, 31.95);
tl.set(dd, { caret: 0 }, 33.3);
tl.to(dIns, { color: '#ffffff', textDecorationColor: 'rgba(0,226,193,0)', duration: 0.4, ease: 'sine.inOut' }, 33.3);
// Pull back until the whole agreement fits, then wall it in.
const FIT_S = 690 / SHEET_H, FIT = { s: FIT_S, tx: 960 - (520 + 540) * FIT_S, ty: 96 };
tl.to(view, { ...FIT, duration: 1.25, ease: 'expo.inOut' }, 33.5);
tl.to(nearS, { o: 0.16, blur: 1.5, duration: 1.2, ease: 'sine.inOut' }, 33.8);
const M = 26; // the wall stands this far outside the sheet, in screen px
const sheetBox = () => ({ x: FIT.tx + 520 * FIT.s - M, y: FIT.ty - M, w: 1080 * FIT.s + 2 * M, h: SHEET_H * FIT.s + 2 * M });
const FRAME = { x: 520, y: 330, w: 880, h: 420 };
const wall = { p: 0, ...sheetBox() };
tl.to(wall, { p: 0.9, duration: 1.1, ease: 'power2.inOut' }, 34.75);
tl.to(wall, { p: 1, duration: 0.3, ease: 'power2.out' }, 35.85); // the gold hairline closes it
// A boilerplate page slides in from outside and stops dead at the wall.
const intruder = document.getElementById('intruder');
intruder.innerHTML = PAGE;
const INTR_S = 1.25;
const intr = { x: W + 40, o: 0 };
tl.set(intr, { o: 1 }, 36.1);
tl.to(intr, { x: sheetBox().x + sheetBox().w + 18, duration: 0.75, ease: 'none' }, 36.1);
tl.fromTo('#copy4', { opacity: 0, filter: 'blur(10px)', letterSpacing: '0.06em' },
  { opacity: 1, filter: 'blur(0px)', letterSpacing: '-0.005em', duration: 1.0, ease: 'power3.out', immediateRender: false }, 36.9);
tl.to('#copy4', { opacity: 0, duration: 0.5, ease: 'power2.in' }, 39.3);

// The lockup is the approved teal-on-dark PNG in /assets, used as-is. Until it lands, show a frame.
{
  const lock = document.getElementById('lockup'), img = lock.querySelector('img');
  const missing = () => { img.remove(); const d = document.createElement('div'); d.className = 'missing'; d.textContent = 'Lockup PNG · assets/lockup-teal-on-dark.png'; lock.appendChild(d); };
  if (img.complete && img.naturalWidth === 0) missing(); else img.addEventListener('error', missing);
}

// ─── Beat 5: executed ─────────────────────────────────────────────────────────
tl.to(view, { o: 0, duration: 0.6, ease: 'power2.in' }, 40.0);
tl.to(intr, { o: 0, duration: 0.5, ease: 'power2.in' }, 40.0);
tl.to([nearS, farS], { o: 0, duration: 0.8, ease: 'sine.inOut' }, 40.0);
tl.to(wall, { ...FRAME, duration: 1.2, ease: 'power3.inOut' }, 40.4);
tl.set('#lockup', { opacity: 0 }, 0);
tl.to('#lockup', { opacity: 1, duration: 1.2, ease: 'sine.inOut' }, 41.8);
tl.fromTo('#copy5', { opacity: 0, filter: 'blur(8px)', letterSpacing: '0.08em' },
  { opacity: 1, filter: 'blur(0px)', letterSpacing: '0.01em', duration: 1.2, ease: 'power3.out', immediateRender: false }, 43.0);
tl.set({}, {}, DURATION);

// ─── Frame ────────────────────────────────────────────────────────────────────
function renderAt(t) {
  t = Math.min(DURATION, Math.max(0, t));
  tl.time(t, true);
  const drift = -16 * t; // the pages never stop moving past
  near.style.transform = `translate(${960 - cam.fx * cam.s + drift}px, ${470 - cam.fy * cam.s}px) scale(${cam.s})`;
  near.style.opacity = cam.o * nearS.o;
  near.style.filter = nearS.blur > 0.01 ? `blur(${nearS.blur}px)` : 'none';
  far.style.transform = `translate(${-260 - 7 * t}px, ${-150}px) scale(0.58)`;
  far.style.opacity = farS.o;
  far.style.filter = `blur(${farS.blur}px)`;

  strike.style.width = `${(orig.offsetWidth + 8) * ed.strike}px`;
  ins.textContent = INSERT.slice(0, Math.round(ed.n));
  const typing = ed.n > 0 && ed.n < INSERT.length;
  caret.style.opacity = ed.caret && (typing || Math.floor(t * 2.2) % 2 === 0) ? 1 : 0;

  own.style.opacity = view.o;
  own.style.transform = `translate(${view.tx}px, ${view.ty}px) scale(${view.s})`;
  dStrike.style.width = `${(dOrig.offsetWidth + 6) * dd.strike}px`;
  dIns.textContent = D_INSERT.slice(0, Math.round(dd.n));
  const dTyping = dd.n > 0 && dd.n < D_INSERT.length;
  dCaret.style.opacity = dd.caret && (dTyping || Math.floor(t * 2.2) % 2 === 0) ? 1 : 0;
  drawWall();
  intruder.style.opacity = intr.o;
  intruder.style.transform = `translate(${intr.x}px, ${540 - 388 * INTR_S / 2}px) scale(${INTR_S})`;
  return t;
}

// The wall is drawn clockwise from the top-left corner; the last stretch, up the left
// side to where it started, is the gold hairline that seals it.
const WT = 2, GOLD = 0.35; // thickness (px); gold covers the top 35% of the left side
const $w = Object.fromEntries(['t', 'r', 'b', 'l', 'g'].map((k) => [k, document.getElementById('w-' + k)]));
function side(el, x, y, w, h) { el.style.cssText = `left:${x}px;top:${y}px;width:${Math.max(0, w)}px;height:${Math.max(0, h)}px;`; }
function drawWall() {
  const { x, y, w, h } = wall, d = wall.p * (2 * w + 2 * h);
  const top = Math.min(d, w), right = Math.min(Math.max(d - w, 0), h);
  const bottom = Math.min(Math.max(d - w - h, 0), w), left = Math.min(Math.max(d - 2 * w - h, 0), h);
  const g = h * GOLD, tealLeft = Math.min(left, h - g), goldLeft = Math.max(0, left - (h - g));
  side($w.t, x, y, top, WT);
  side($w.r, x + w - WT, y, WT, right);
  side($w.b, x + w - bottom, y + h - WT, bottom, WT);
  side($w.l, x, y + h - tealLeft, WT, tealLeft);
  side($w.g, x, y + g - goldLeft, WT, goldLeft);
}

// ─── Export hooks (used by tools/export.mjs) ─────────────────────────────────
window.__film = {
  duration: DURATION, fps: FPS,
  renderAt: (t) => { renderAt(t); return true; },
  renderAudio: () => renderWav(DURATION),
};
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
const fillBar = track.querySelector('.fill'), head = track.querySelector('.head');
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
  bigplay.hidden = playing || started;
  playbtn.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
  playbtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
}
function play(from = t) { t = from >= DURATION ? 0 : from; playing = true; last = performance.now(); audio.play(t); syncUI(); }
function pause() { playing = false; audio.stop(); syncUI(); }
function seek(to) { pause(); t = Math.min(DURATION, Math.max(0, to)); }
bigplay.addEventListener('click', (e) => { e.stopPropagation(); play(t); });
playbtn.addEventListener('click', () => (playing ? pause() : play(t)));

addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); play(0); }
  else if (e.key === 'p' || e.key === 'P') playing ? pause() : play(t);
  else if (e.key === 'ArrowRight') seek(Math.floor(t + 1e-6) + 1);
  else if (e.key === 'ArrowLeft') seek(Math.ceil(t - 1e-6) - 1);
  else if (e.key === '.') seek(t + 1 / FPS);
  else if (e.key === ',') seek(t - 1 / FPS);
  else if (e.key >= '1' && e.key <= String(BEATS.length)) seek(BEATS[+e.key - 1].start);
  else if (e.key === 'm' || e.key === 'M') { if (!audio.toggleMute() && playing) audio.play(t); }
});
let dragging = false;
const scrub = (e) => { const r = track.getBoundingClientRect(); seek((e.clientX - r.left) / r.width * DURATION); };
track.addEventListener('pointerdown', (e) => { started = true; dragging = true; track.setPointerCapture(e.pointerId); scrub(e); });
track.addEventListener('pointermove', (e) => dragging && scrub(e));
track.addEventListener('pointerup', () => { dragging = false; });
stage.addEventListener('click', () => (playing ? pause() : play(t)));

let frames = 0, fpsT = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  if (playing) { t += (now - last) / 1000; last = now; if (t >= DURATION) { t = DURATION; pause(); } }
  renderAt(t);
  const pct = t / DURATION * 100;
  fillBar.style.width = `${pct}%`; head.style.left = `${pct}%`;
  $t.textContent = `${t.toFixed(2)} s  ·  f${Math.round(t * FPS)}`;
  const b = [...BEATS].reverse().find((x) => t >= x.start);
  $beat.textContent = `${BEATS.indexOf(b) + 1} · ${b.name.toUpperCase()}`;
  frames++;
  if (now - fpsT > 500) { $fps.textContent = `${Math.round(frames * 1000 / (now - fpsT))} fps`; frames = 0; fpsT = now; }
}
if (!EXPORT) requestAnimationFrame(loop); else renderAt(0);
window.__film.ready = true;

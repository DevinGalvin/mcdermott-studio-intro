import { gsap } from 'gsap';
import { createPlayer, renderWav } from './audio.js';

// "The Document." A 45-second film made of legal text. Six moments, each held long enough to read.
//
//  0.0  Everyone signs the same terms   one clause, then the same clause on every page
//  6.5  One stroke                      a teal line through all of it: we chose to build our own
// 11.5  The name in the fine print      the title's letters are found inside the boilerplate
// 17.0  Redlining standard terms        five industry clichés struck and rewritten: the pillars
// 34.0  Privileged & confidential       stamped, walled in gold; a standard page stops dead
// 40.3  The answer                      the wall becomes the lockup frame

const W = 1920, H = 1080, FPS = 60, DURATION = 45;
const params = new URLSearchParams(location.search);
const EXPORT = params.has('export');
if (EXPORT) document.body.classList.add('export');

export const BEATS = [
  { id: 's1', name: 'The same terms', start: 0 },
  { id: 's2', name: 'One stroke', start: 6.5 },
  { id: 's3', name: 'The name', start: 11.5 },
  { id: 's4', name: 'Redlining standard terms', start: 17 },
  { id: 's5', name: 'Privileged & confidential', start: 34 },
  { id: 's6', name: 'The answer', start: 40.3 },
];

const tl = gsap.timeline({ paused: true });
for (const b of BEATS) tl.addLabel(b.id, b.start);

// ─── Building blocks ──────────────────────────────────────────────────────────
const shotsRoot = document.getElementById('shots');
const shots = [], movers = [];
function shot(start, end, build) {
  const el = document.createElement('div'); el.className = 'shot';
  shotsRoot.appendChild(el); shots.push({ start, end, el });
  el.style.display = 'block'; // built visible so layout can be measured
  build(el, start, end);
  el.style.display = 'none';
}
function add(parent, cls, html = '', css = '') {
  const d = document.createElement('div'); d.className = cls; d.innerHTML = html; d.style.cssText = css;
  parent.appendChild(d); return d;
}
// Each word carries its own trailing space, so spacing survives the per-word transforms.
const words = (text) => text.split(' ').map((w) => `<span class="w">${w}&nbsp;</span>`).join('');
// Words land one after another, fast, from below. No overshoot.
function slam(el, at, { stagger = 0.06, dur = 0.42, y = 70 } = {}) {
  const ws = el.querySelectorAll('.w');
  tl.set(ws, { opacity: 0 }, 0);
  tl.fromTo(ws, { opacity: 0, y }, { opacity: 1, y: 0, duration: dur, ease: 'power4.out', stagger, immediateRender: false }, at);
}
const move = (el, fn) => movers.push({ el, fn });
const lerp = (a, b, k) => a + (b - a) * k;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 4);

// Fictional boilerplate. Names no vendor.
const BOILER = 'The Provider shall make the Services available to the Customer on a standard, as-is basis, in accordance with the Documentation and these Standard Terms. The Services are provided to all customers in the same form. No customization, modification or configuration shall be made for any individual Customer. Customer Data may be processed by the Provider and its sub-processors, wherever located. The Provider may modify, suspend or withdraw any feature of the Services at any time. ';
const MATTERS = ['Cross-border merger', 'Antitrust review', 'Clinical trials', 'Patent portfolio', 'Litigation hold',
  'Tax restructuring', 'Health system JV', 'Private credit', 'Class action defense', 'Breach response',
  'Energy transition', 'Trusts & estates', 'FDA submission', 'Supply chain dispute', 'Fund formation',
  'Export controls', 'Real estate portfolio', 'Chapter 11', 'Pharma licensing', 'Government investigation',
  'Carve-out sale', 'Arbitration', 'Benefits plan', 'Insurance recovery', 'Data privacy program',
  'Secondaries', 'Hospital merger', 'Trade secrets', 'Infrastructure fund', 'Sanctions review'];
const pageHTML = (k) => `
  <div class="hd"><span>Master Services Agreement</span><span><span class="st">Standard Terms</span><span class="mt">${MATTERS[k % MATTERS.length]}</span></span></div>
  <h4>1. Services</h4>
  <p><b>1.1</b>The Provider shall make the Services available to the Customer on a standard, as-is basis, in accordance with the Documentation and these Standard Terms.</p>
  <p><b>1.2</b>The Services are provided to all customers in the same form. No customization, modification or configuration shall be made for any individual Customer.</p>
  <p><b>1.3</b><span class="fc">The Customer acknowledges that the Services have not been developed to meet its individual requirements.</span><span class="ins">Built for this ${MATTERS[k % MATTERS.length].toLowerCase()}.</span></p>
  <h4>2. Customer Data</h4>
  <p><b>2.1</b>Customer Data may be processed by the Provider and its sub-processors, wherever located, in accordance with the Provider’s policies as updated from time to time.</p>
  <p><b>2.2</b>The Provider may use aggregated Customer Data to improve its services.</p>
  <h4>3. Changes</h4>
  <p><b>3.1</b>The Provider may modify, suspend or withdraw any feature of the Services at any time.</p>`;
const PW = 300, PH = 388, GAP = 36;
function wall(parent, rows, cols) {
  const plane = add(parent, 'plane');
  const pages = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const p = add(plane, 'page', pageHTML(r * cols + c), `left:${c * (PW + GAP)}px;top:${r * (PH + GAP)}px`);
    pages.push({ el: p, r, c });
  }
  return { plane, pages, w: cols * (PW + GAP) - GAP, h: rows * (PH + GAP) - GAP };
}
// Camera over a plane: plane point (fx, fy) at screen centre, scale s.
const view = (plane, cam) => `translate(${960 - cam.fx * cam.s}px, ${540 - cam.fy * cam.s}px) scale(${cam.s})`;
// A band of boilerplate that slides past behind a shot.
function boilerBand(parent, { top, size, speed, start, opacity = 0.1 }) {
  const b = add(parent, 'abs serif nowrap', BOILER.repeat(3), `top:${top}px;left:0;font-size:${size}px;color:rgba(255,255,255,${opacity})`);
  move(b, (t) => `translateX(${-200 + speed * (t - start)}px)`);
  return b;
}

// ─── 0.0–6.5  Everyone signs the same terms ───────────────────────────────────
// Open on one clause, close enough to read. Pull back: it is on every page.
shot(0, 11.5, (el) => {
  const wl = wall(el, 8, 16);
  const k0 = 3 * 16 + 7, p0 = wl.pages[k0];
  const clause = p0.el.querySelectorAll('p')[1];
  const cam = { s: 5.2, fx: p0.el.offsetLeft + PW / 2, fy: p0.el.offsetTop + clause.offsetTop + clause.offsetHeight / 2 };
  tl.set(cam, { s: 5.2 }, 0);
  tl.to(cam, { s: 0.36, fx: wl.w / 2, fy: wl.h / 2 - 140, duration: 1.6, ease: 'expo.inOut' }, 1.9);
  tl.to(cam, { s: 0.32, fx: wl.w / 2 + 120, duration: 9.5, ease: 'none' }, 3.5);
  move(wl.plane, () => view(wl.plane, cam));
  tl.fromTo(wl.plane, { opacity: 0 }, { opacity: 1, duration: 0.5, immediateRender: false }, 0.1);
  const scrim = add(el, 'abs', '', 'left:0;right:0;bottom:0;height:520px;background:linear-gradient(180deg,rgba(0,0,66,0),rgba(0,0,50,0.96) 55%)');
  tl.set(scrim, { opacity: 0 }, 0);
  tl.to(scrim, { opacity: 1, duration: 0.6 }, 3.2);
  const l1 = add(el, 'abs serif white', words('Most firms are buying the same tools.'), 'left:0;right:0;top:800px;text-align:center;font-size:92px;letter-spacing:-0.015em');
  slam(l1, 3.7, { stagger: 0.09, dur: 0.6, y: 30 });
  tl.to(l1, { opacity: 0, duration: 0.5 }, 6.3);

  // ─── 6.5–11.5  One stroke through all of it ─────────────────────────────────
  const slice = add(el, 'bar', '', 'left:0;top:360px;height:10px;width:1920px;transform-origin:0 50%');
  tl.set(slice, { scaleX: 0 }, 0);
  tl.to(slice, { scaleX: 1, duration: 0.7, ease: 'power3.inOut' }, 6.8);
  tl.to(slice, { opacity: 0, duration: 0.5 }, 8.0);
  wl.pages.forEach((p) => {
    const at = 7.0 + (p.c / 16) * 0.6;
    movers.push({ el: p.el, fn: (t) => { p.el.classList.toggle('rw', t >= at); return ''; } });
  });
  const l2 = add(el, 'abs serif white', words('We chose to') + '<span class="teal">' + words('build our own.') + '</span>',
    'left:0;right:0;top:800px;text-align:center;font-size:104px;letter-spacing:-0.015em');
  slam(l2, 8.1, { stagger: 0.12, dur: 0.6, y: 30 });
  tl.to(l2, { opacity: 0, duration: 0.5 }, 10.9);
  tl.to(wl.plane, { opacity: 0, duration: 0.6 }, 10.9);
});

// ─── 11.5–17  The name was in the fine print all along ─────────────────────────
const TITLE = 'McDermott Studio';
shot(11.5, 17, (el) => {
  const para = add(el, 'abs serif', '', 'left:150px;top:150px;width:1620px;font-size:46px;line-height:1.6;text-align:justify;color:rgba(255,255,255,0.3)');
  const src = ('Master Services Agreement. Standard Terms. ' + BOILER.repeat(2)).slice(0, 860);
  // Find the title's letters in order inside the boilerplate.
  const picks = []; let from = -3;
  for (const ch of TITLE) {
    if (ch === ' ') { picks.push(null); continue; }
    let i = src.indexOf(ch, from + 3);
    if (i < 0) i = src.toLowerCase().indexOf(ch.toLowerCase(), from + 1); // never fail on a letter
    picks.push(i); from = i;
  }
  para.innerHTML = [...src].map((c, i) => `<span data-i="${i}">${c === ' ' ? ' ' : c}</span>`).join('');
  const target = add(el, 'abs serif nowrap', [...TITLE].map((c) => `<span>${c === ' ' ? '&nbsp;' : c}</span>`).join(''),
    'left:0;right:0;top:400px;text-align:center;font-size:220px;line-height:1;letter-spacing:-0.015em;color:transparent');
  tl.fromTo(para, { opacity: 0 }, { opacity: 1, duration: 0.5, immediateRender: false }, 11.5);
  const S = 220 / 46;
  const letters = [];
  picks.forEach((i, k) => {
    if (i === null) return;
    const span = para.querySelector(`[data-i="${i}"]`), tgt = target.children[k];
    span.style.display = 'inline-block'; span.style.transformOrigin = '0 0';
    letters.push({ span, tgt, k });
  });
  // Measured once layout exists; offsets are in stage pixels.
  const o = { lit: 0, fade: 0, fly: 0 };
  tl.set(o, { lit: 0, fade: 0, fly: 0 }, 0);
  tl.to(o, { lit: 1, duration: 1.1, ease: 'none' }, 12.2);
  tl.to(o, { fade: 1, duration: 0.6, ease: 'sine.inOut' }, 13.4);
  tl.to(o, { fly: 1, duration: 1.1, ease: 'expo.inOut' }, 13.8);
  const geo = letters.map((L) => ({
      dx: target.offsetLeft + L.tgt.offsetLeft - (para.offsetLeft + L.span.offsetLeft),
      dy: target.offsetTop + L.tgt.offsetTop - (para.offsetTop + L.span.offsetTop) - 8,
  }));
  movers.push({ el: para, fn: () => {
    para.style.color = `rgba(255,255,255,${0.3 * (1 - o.fade)})`;
    letters.forEach((L, j) => {
      const lit = o.lit * letters.length > j;
      L.span.style.color = lit ? (o.fly > 0.98 ? '#ffffff' : '#00E2C1') : '';
      const f = o.fly;
      L.span.style.transform = `translate(${geo[j].dx * f}px, ${geo[j].dy * f}px) scale(${1 + (S - 1) * f})`;
    });
    return '';
  } });
  const rule = add(el, 'bar gold', '', 'left:610px;width:700px;top:680px;height:4px;transform-origin:50% 50%');
  tl.set(rule, { scaleX: 0 }, 0);
  tl.to(rule, { scaleX: 1, duration: 0.7, ease: 'power3.out' }, 15.0);
});

// ─── 17–34  Redlining the industry's standard terms ───────────────────────────
const PILLARS = [
  { label: 'Bespoke',    was: 'as-is',                   now: 'as your matter needs it' },
  { label: 'Fitted',     was: 'in the same form for all', now: 'in the shape of your team' },
  { label: 'Supervised', was: 'without warranty',        now: 'reviewed by a lawyer' },
  { label: 'Adaptable',  was: 'may change at any time',  now: 'changes when the law does' },
  { label: 'Ours',       was: 'licensed to you',         now: 'owned by us, accountable to you' },
];
const P0 = 17, PD = 3.4;
PILLARS.forEach((q, k) => {
  const a = P0 + k * PD;
  shot(a, a + PD, (el) => {
    add(el, 'abs sans', 'Standard terms', 'left:0;right:0;top:250px;text-align:center;font-size:20px;letter-spacing:0.36em;color:rgba(255,255,255,0.42)');
    const was = add(el, 'abs serif nowrap', `<span class="wv">“${q.was}”</span>`, 'left:0;right:0;top:300px;text-align:center;font-size:120px;line-height:1.1;letter-spacing:-0.015em;color:rgba(255,255,255,0.9)');
    tl.fromTo(was, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out', immediateRender: false }, a + 0.1);
    const wv = was.firstChild; wv.style.position = 'relative'; wv.style.display = 'inline-block';
    const strike = add(wv, 'bar', '', 'left:-10px;right:-10px;top:56%;height:8px;transform-origin:0 50%');
    tl.set(strike, { scaleX: 0 }, 0);
    tl.to(strike, { scaleX: 1, duration: 0.4, ease: 'power2.inOut' }, a + 1.0);
    tl.to(was, { color: 'rgba(255,255,255,0.32)', duration: 0.3 }, a + 1.1);
    const now = add(el, 'abs serif teal nowrap', q.now, 'left:0;right:0;top:500px;text-align:center;font-size:120px;line-height:1.1;letter-spacing:-0.015em');
    tl.fromTo(now, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', immediateRender: false }, a + 1.35);
    const lab = add(el, 'abs sans teal', q.label, 'left:0;right:0;top:720px;text-align:center;font-size:24px;letter-spacing:0.42em');
    tl.fromTo(lab, { opacity: 0 }, { opacity: 1, duration: 0.4, immediateRender: false }, a + 1.8);
    const n = add(el, 'abs sans', `0${k + 1} / 05`, 'right:120px;top:120px;font-size:18px;letter-spacing:0.3em;color:rgba(255,255,255,0.35)');
    tl.to([was, now, lab, n], { opacity: 0, duration: 0.3 }, a + PD - 0.3);
  });
});

// ─── 34–40.2  Privileged & confidential ───────────────────────────────────────
const FR = { x: 200, y: 110, w: 1520, h: 860 };
const LOCK = { x: 580, y: 360, w: 760, h: 300 };
const frame = { p: 0, k: 0 };
shot(34, 45, (el) => {
  const pg = add(el, 'page rw', pageHTML(12), 'left:810px;top:230px;transform-origin:50% 50%;transform:scale(1.55)');
  tl.fromTo(pg, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', immediateRender: false }, 34.0);
  const stamp = add(el, 'abs sans teal nowrap', 'Privileged &amp; Confidential',
    'left:700px;top:440px;font-size:44px;letter-spacing:0.18em;padding:14px 26px;border:5px solid #00E2C1;transform-origin:50% 50%');
  tl.set(stamp, { opacity: 0 }, 0);
  tl.fromTo(stamp, { opacity: 0, scale: 1.8, rotation: -8 }, { opacity: 1, scale: 1, rotation: -8, duration: 0.18, ease: 'power4.in', immediateRender: false }, 34.9);
  // The outsider: a standard page slides in and stops dead at the wall.
  const gray = add(el, 'page gray', pageHTML(3), 'left:0;top:0;transform-origin:0 0');
  const o = { u: 0 };
  tl.set(o, { u: 0 }, 0);
  tl.to(o, { u: 1, duration: 0.5, ease: 'none' }, 36.6);
  move(gray, () => `translate(${lerp(2100, FR.x + FR.w + 8, o.u)}px, 330px) scale(1.4)`);
  const copy = add(el, 'abs serif white nowrap', words('Your information.') + '<span class="teal">' + words('Our walls.') + '</span>',
    'left:0;right:0;top:830px;text-align:center;font-size:84px;letter-spacing:-0.01em');
  slam(copy, 37.3, { stagger: 0.12, dur: 0.6, y: 24 });
  tl.to([pg, stamp, copy, gray], { opacity: 0, duration: 0.4 }, 40.1);
  const lock = add(el, 'abs', '<div id="lockup"><img src="assets/lockup-teal-on-dark.png" alt="McDermott Studio"></div>', `left:${960 - 280}px;top:${540 - 75}px`);
  const img = lock.querySelector('img');
  const missing = () => { img.remove(); add(lock.firstChild, 'missing', 'Lockup PNG · assets/lockup-teal-on-dark.png'); };
  if (img.complete && img.naturalWidth === 0) missing(); else img.addEventListener('error', missing);
  tl.set(lock, { opacity: 0 }, 0);
  tl.to(lock, { opacity: 1, duration: 1.0, ease: 'sine.inOut' }, 41.2);
  const sign = add(el, 'abs serif white nowrap', words('Built in-house. Built for law.'), 'left:0;right:0;top:760px;text-align:center;font-size:56px');
  slam(sign, 42.3, { stagger: 0.14, dur: 0.6, y: 20 });
  ['t', 'r', 'b', 'l', 'g'].forEach((k) => { add(el, k === 'g' ? 'bar gold' : 'bar').id = 'w-' + k; });
});
tl.set(frame, { p: 0, k: 0 }, 0);
tl.to(frame, { p: 0.93, duration: 0.8, ease: 'power2.inOut' }, 35.4);
tl.to(frame, { p: 1, duration: 0.15, ease: 'none' }, 36.2);   // gold seal: the hit
tl.to(frame, { k: 1, duration: 0.9, ease: 'power3.inOut' }, 40.3);

const WT = 3, GOLD = 0.3;
function drawFrame() {
  const L = (a, b) => a + (b - a) * frame.k;
  const x = L(FR.x, LOCK.x), y = L(FR.y, LOCK.y), w = L(FR.w, LOCK.w), h = L(FR.h, LOCK.h);
  const d = frame.p * (2 * w + 2 * h);
  const top = Math.min(d, w), right = Math.min(Math.max(d - w, 0), h);
  const bottom = Math.min(Math.max(d - w - h, 0), w), left = Math.min(Math.max(d - 2 * w - h, 0), h);
  const g = h * GOLD, tealLeft = Math.min(left, h - g), goldLeft = Math.max(0, left - (h - g));
  const side = (id, sx, sy, sw, sh) => { const e = document.getElementById(id); if (e) e.style.cssText = `left:${sx}px;top:${sy}px;width:${Math.max(0, sw)}px;height:${Math.max(0, sh)}px`; };
  side('w-t', x, y, top, WT);
  side('w-r', x + w - WT, y, WT, right);
  side('w-b', x + w - bottom, y + h - WT, bottom, WT);
  side('w-l', x, y + h - tealLeft, WT, tealLeft);
  side('w-g', x, y + g - goldLeft, WT, goldLeft);
}

tl.set({}, {}, DURATION);

// ─── Frame ────────────────────────────────────────────────────────────────────
function renderAt(t) {
  t = Math.min(DURATION, Math.max(0, t));
  tl.time(t, true);
  for (const s of shots) s.el.style.display = t >= s.start && t < s.end ? 'block' : 'none';
  if (t >= DURATION) shots[shots.length - 1].el.style.display = 'block';
  for (const m of movers) {
    const v = m.fn(t);
    if (v) m.el.style.transform = v;
  }
  drawFrame();
  return t;
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

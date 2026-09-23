import { gsap } from 'gsap';
import { createPlayer, renderWav } from './audio.js';

// "The Document." A 45-second kinetic-type film made of legal text.
// Cut fast, set huge. One idea: every firm signs the same standard terms; we rewrite ours.
//
//  0.0  Standard terms   rapid cuts of boilerplate phrases, then the wall of identical pages
//  8.2  The turn         the clause is struck in teal; "We chose to build our own."
// 12.6  Title
// 16.0  Built for each   the redline rips across the wall; five pillars, five compositions
// 30.6  Inside the walls the frame of the film becomes the wall; standard pages hit it
// 38.2  The answer       the wall becomes the lockup frame

const W = 1920, H = 1080, FPS = 60, DURATION = 45;
const params = new URLSearchParams(location.search);
const EXPORT = params.has('export');
if (EXPORT) document.body.classList.add('export');

export const BEATS = [
  { id: 's1', name: 'Standard terms', start: 0 },
  { id: 's2', name: 'The turn', start: 8.2 },
  { id: 's3', name: 'Title', start: 12.6 },
  { id: 's4', name: 'Built for each matter', start: 16.0 },
  { id: 's5', name: 'Inside the walls', start: 30.6 },
  { id: 's6', name: 'The answer', start: 38.2 },
];

const tl = gsap.timeline({ paused: true });
for (const b of BEATS) tl.addLabel(b.id, b.start);

// ─── Building blocks ──────────────────────────────────────────────────────────
const shotsRoot = document.getElementById('shots');
const shots = [], movers = [];
function shot(start, end, build) {
  const el = document.createElement('div'); el.className = 'shot';
  shotsRoot.appendChild(el); shots.push({ start, end, el });
  build(el, start, end);
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

// ─── 0.0–3.3  Boilerplate, cut fast ────────────────────────────────────────────
const PHRASES = [
  { txt: '<i>as-is</i>',        size: 560, left: -40, top: 170, drift: -130 },
  { txt: 'in the same form',    size: 230, left: 110, top: 600, drift: 150, rot: -2 },
  { txt: 'no customization',    size: 250, left: 90, top: 300, drift: -170 },
  { txt: 'wherever located',    size: 215, left: 240, top: 120, drift: 130 },
  { txt: 'at any time',         size: 330, left: 60,  top: 520, drift: -150 },
  { txt: 'Standard Terms',      size: 300, left: -20, top: 340, drift: 110 },
];
PHRASES.forEach((ph, k) => {
  const a = 0.55 * k, b = a + 0.55;
  shot(a, b, (el) => {
    boilerBand(el, { top: 60, size: 40, speed: ph.drift * -0.8, start: a });
    boilerBand(el, { top: 930, size: 40, speed: ph.drift * 0.6, start: a });
    const tag = add(el, 'abs sans', `§ 1.${k + 1}`, `left:${ph.left < 100 ? 120 : ph.left}px;top:${ph.top - 34}px;font-size:18px;letter-spacing:0.3em;color:rgba(255,255,255,0.45)`);
    const x = add(el, 'abs serif nowrap white', ph.txt, `left:${ph.left}px;top:${ph.top}px;font-size:${ph.size}px;line-height:1;letter-spacing:-0.02em`);
    move(x, (t) => `translateX(${ph.drift * (t - a) / 0.55}px) rotate(${ph.rot ?? 0}deg) scale(${1 + 0.05 * (t - a) / 0.55})`);
    move(tag, (t) => `translateX(${ph.drift * 0.6 * (t - a) / 0.55}px)`);
  });
});

// ─── 3.3–8.2  The wall: everyone signs the same thing ─────────────────────────
shot(3.3, 8.2, (el) => {
  const wl = wall(el, 8, 16);
  const cam = { s: 2.8, fx: wl.w / 2, fy: wl.h / 2 };
  tl.set(cam, { s: 2.8 }, 0);
  tl.to(cam, { s: 0.33, duration: 0.8, ease: 'expo.out' }, 3.3);
  tl.to(cam, { s: 0.29, fx: wl.w / 2 + 300, duration: 4.1, ease: 'none' }, 4.1);
  move(wl.plane, () => view(wl.plane, cam));
  add(el, 'abs', '', 'left:0;right:0;bottom:0;height:560px;background:linear-gradient(180deg,rgba(0,0,66,0),rgba(0,0,50,0.95) 60%)');
  const line = add(el, 'abs serif white', words('Most firms are buying') + '<br>' + words('the same tools.'),
    'left:120px;top:640px;font-size:150px;line-height:1.02;letter-spacing:-0.02em');
  slam(line, 4.5, { stagger: 0.07 });
});

// ─── 8.2–9.9  The clause, struck ──────────────────────────────────────────────
shot(8.2, 9.9, (el) => {
  boilerBand(el, { top: 80, size: 34, speed: -90, start: 8.2, opacity: 0.08 });
  add(el, 'abs sans', '§ 1.3', 'left:128px;top:236px;font-size:20px;letter-spacing:0.3em;color:rgba(255,255,255,0.5)');
  const txt = add(el, 'abs serif white', 'The Services have not been<br>developed to meet your<br>individual requirements.',
    'left:120px;top:280px;font-size:124px;line-height:1.12;letter-spacing:-0.015em');
  move(txt, (t) => `scale(${1 + 0.03 * (t - 8.2)})`);
  tl.fromTo(txt, { color: '#ffffff' }, { color: 'rgba(255,255,255,0.32)', duration: 0.3, immediateRender: false }, 9.05);
  [0, 1, 2].forEach((k) => {
    const bar = add(el, 'bar', '', `left:110px;top:${355 + k * 139}px;height:12px;width:${[1480, 1290, 1330][k]}px;transform-origin:0 50%`);
    tl.set(bar, { scaleX: 0 }, 0);
    tl.to(bar, { scaleX: 1, duration: 0.16, ease: 'power2.in' }, 8.95 + k * 0.12);
  });
});

// ─── 9.9–12.6  We chose to build our own ──────────────────────────────────────
shot(9.9, 12.6, (el) => {
  const a = add(el, 'abs serif white nowrap', '', 'left:140px;top:300px;font-size:190px;line-height:1;letter-spacing:-0.025em');
  const caret = add(el, 'abs', '', 'width:6px;height:170px;background:#E5AC2E;top:318px');
  const b = add(el, 'abs serif teal nowrap', words('build our own.'), 'left:140px;top:520px;font-size:190px;line-height:1;letter-spacing:-0.025em');
  slam(b, 10.85, { stagger: 0.09, dur: 0.35, y: 50 });
  const TYPE = 'We chose to';
  movers.push({ el: a, fn: (t) => { a.textContent = TYPE.slice(0, Math.round(clamp01((t - 10.05) / 0.5) * TYPE.length)); return ''; } });
  movers.push({ el: caret, fn: (t) => {
    const typed = t < 10.85;
    caret.style.left = `${140 + (typed ? a.offsetWidth + 14 : b.offsetWidth + 14)}px`;
    caret.style.top = `${typed ? 318 : 538}px`;
    caret.style.opacity = (t < 10.6 || Math.floor(t * 2.4) % 2 === 0) ? 1 : 0;
    return '';
  } });
});

// ─── 12.6–16.0  Title ─────────────────────────────────────────────────────────
shot(12.6, 16.0, (el) => {
  const bg = wall(el, 8, 16);
  bg.plane.style.opacity = 0.12;
  const cam = { s: 0.42, fx: bg.w / 2, fy: bg.h / 2 };
  move(bg.plane, (t) => view(bg.plane, { ...cam, s: 0.42 - 0.03 * (t - 12.6) }));
  const title = add(el, 'abs serif white nowrap', 'McDermott Studio', 'left:0;right:0;top:390px;text-align:center;font-size:250px;line-height:1');
  tl.fromTo(title, { opacity: 0, letterSpacing: '0.22em' }, { opacity: 1, letterSpacing: '-0.015em', duration: 0.9, ease: 'power4.out', immediateRender: false }, 12.6);
  const rule = add(el, 'bar gold', '', 'left:560px;width:800px;top:700px;height:4px;transform-origin:50% 50%');
  tl.set(rule, { scaleX: 0 }, 0);
  tl.to(rule, { scaleX: 1, duration: 0.5, ease: 'power3.out' }, 13.3);
});

// ─── 16.0–17.6  The redline rips across the wall ──────────────────────────────
shot(16.0, 17.6, (el) => {
  const wl = wall(el, 8, 16);
  const cam = { s: 0.3, fx: wl.w / 2, fy: wl.h / 2 };
  tl.set(cam, { s: 0.3 }, 0);
  tl.to(cam, { s: 0.5, duration: 1.6, ease: 'power2.in' }, 16.0);
  move(wl.plane, () => view(wl.plane, cam));
  const cr = 3.5, cc = 7.5;
  wl.pages.forEach((p) => {
    const at = 16.1 + Math.hypot(p.r - cr, (p.c - cc) * 0.6) * 0.16;
    movers.push({ el: p.el, fn: (t) => { p.el.classList.toggle('rw', t >= at); return ''; } });
  });
});

// ─── 17.6–30.6  Five pillars, five compositions ───────────────────────────────
const P = [17.6, 20.2, 22.8, 25.4, 28.0, 30.6];

// Bespoke: the word slides in huge; the matter it is built for flips faster than you can read.
shot(P[0], P[1], (el) => {
  boilerBand(el, { top: 40, size: 34, speed: -120, start: P[0], opacity: 0.08 });
  const word = add(el, 'abs serif teal nowrap', 'Bespoke', 'left:90px;top:520px;font-size:430px;line-height:1;letter-spacing:-0.03em');
  tl.fromTo(word, { x: 420, opacity: 0 }, { x: 0, opacity: 1, duration: 0.55, ease: 'power4.out', immediateRender: false }, P[0]);
  const line = add(el, 'abs serif white nowrap', words('Built around the matter in front of us.'), 'left:120px;top:250px;font-size:84px;letter-spacing:-0.01em');
  slam(line, P[0] + 0.35, { stagger: 0.045 });
  const tag = add(el, 'abs sans teal nowrap', '', 'left:124px;top:190px;font-size:22px;letter-spacing:0.3em');
  movers.push({ el: tag, fn: (t) => { tag.textContent = 'For: ' + MATTERS[Math.floor((t - P[0]) * 9) % MATTERS.length]; return ''; } });
});

// Fitted: three columns of copy snap into alignment on a single line.
shot(P[1], P[2], (el) => {
  const word = add(el, 'abs serif white nowrap', 'Fitted', 'right:110px;top:90px;font-size:400px;line-height:1;letter-spacing:-0.03em;text-align:right');
  tl.fromTo(word, { y: -120, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power4.out', immediateRender: false }, P[1]);
  const cols = [0, 1, 2].map((k) => add(el, 'abs serif', BOILER.slice(k * 90, k * 90 + 260),
    `left:${120 + k * 560}px;top:600px;width:500px;font-size:24px;line-height:1.5;color:rgba(255,255,255,0.28)`));
  cols.forEach((c, k) => tl.fromTo(c, { y: [-90, 140, -40][k] }, { y: 0, duration: 0.6, ease: 'expo.inOut', immediateRender: false }, P[1] + 0.35));
  const guide = add(el, 'bar', '', 'left:120px;top:588px;height:3px;width:1620px;transform-origin:0 50%');
  tl.set(guide, { scaleX: 0 }, 0);
  tl.to(guide, { scaleX: 1, duration: 0.4, ease: 'power3.out' }, P[1] + 0.8);
  const line = add(el, 'abs serif teal nowrap', words('Shaped to the way our teams already work.'), 'left:120px;top:860px;font-size:76px');
  slam(line, P[1] + 1.0, { stagger: 0.04 });
});

// Supervised: the line is signed off: a gold signature stroke draws beneath it.
shot(P[2], P[3], (el) => {
  const ghost = add(el, 'abs serif nowrap', 'Supervised', 'left:120px;top:300px;font-size:400px;line-height:1;letter-spacing:-0.03em;color:transparent;-webkit-text-stroke:2px rgba(0,226,193,0.4)');
  move(ghost, (t) => `translateX(${-70 * (t - P[2])}px)`);
  const line = add(el, 'abs serif white nowrap', words('Every output is reviewed by a lawyer.'), 'left:0;right:0;top:420px;text-align:center;font-size:104px;letter-spacing:-0.015em');
  slam(line, P[2] + 0.15, { stagger: 0.05 });
  const svg = add(el, 'abs', `<svg width="900" height="120" viewBox="0 0 900 120"><path d="M10 80 C 120 20, 180 110, 280 60 S 430 20, 470 70 S 600 100, 660 50 S 820 40, 890 62" fill="none" stroke="#E5AC2E" stroke-width="5" stroke-linecap="round"/></svg>`, 'left:510px;top:585px');
  const path = svg.querySelector('path'), len = 1100;
  path.style.strokeDasharray = len;
  movers.push({ el: path, fn: (t) => { path.style.strokeDashoffset = len * (1 - easeOut((t - P[2] - 0.9) / 0.7)); return ''; } });
  const sig = add(el, 'abs sans', 'Reviewed and approved', 'left:0;right:0;top:730px;text-align:center;font-size:20px;letter-spacing:0.34em;color:rgba(255,255,255,0.5)');
  tl.fromTo(sig, { opacity: 0 }, { opacity: 1, duration: 0.3, immediateRender: false }, P[2] + 1.6);
});

// Adaptable: the version number races while the word rewrites itself.
shot(P[3], P[4], (el) => {
  const ver = add(el, 'abs sans teal nowrap', '', 'right:120px;top:120px;font-size:30px;letter-spacing:0.3em;text-align:right');
  movers.push({ el: ver, fn: (t) => { ver.textContent = `Version ${1 + Math.floor(clamp01((t - P[3]) / 2.2) * 46)}`; return ''; } });
  const word = add(el, 'abs serif white nowrap', '', 'left:110px;top:230px;font-size:400px;line-height:1;letter-spacing:-0.03em');
  const FORMS = ['Revised', 'Amended', 'Updated', 'Adapted', 'Adaptable'];
  movers.push({ el: word, fn: (t) => { word.textContent = FORMS[Math.min(FORMS.length - 1, Math.floor(Math.max(0, t - P[3]) / 0.22))]; return ''; } });
  const line = add(el, 'abs serif teal nowrap', words('Amended as fast as the law moves.'), 'left:124px;top:720px;font-size:90px;letter-spacing:-0.01em');
  slam(line, P[3] + 1.0, { stagger: 0.045 });
});

// Ours: one enormous word, a gold full stop.
shot(P[4], P[5], (el) => {
  const word = add(el, 'abs serif white nowrap', 'Ours<span class="gold">.</span>', 'left:80px;top:40px;font-size:720px;line-height:1;letter-spacing:-0.04em');
  tl.fromTo(word, { scale: 1.12, opacity: 0, transformOrigin: '0% 50%' }, { scale: 1, opacity: 1, duration: 0.6, ease: 'power4.out', immediateRender: false }, P[4]);
  const line = add(el, 'abs serif white nowrap', words('Owned by us, improved by us,') + '<span class="teal">' + words('accountable to you.') + '</span>',
    'left:120px;top:860px;font-size:72px;letter-spacing:-0.01em');
  slam(line, P[4] + 0.6, { stagger: 0.05 });
});

// ─── 30.6–38.2  The frame of the film becomes the wall ────────────────────────
const FR = { x: 260, y: 150, w: 1400, h: 780 };        // the wall, in screen space
const LOCK = { x: 580, y: 360, w: 760, h: 300 };      // where it ends, around the lockup
const frame = { p: 0, k: 0 };
shot(30.6, 45, (el) => {
  const wl = wall(el, 8, 16);
  wl.pages.forEach((p) => p.el.classList.add('rw'));
  const cam = { s: 0.75, fx: wl.w / 2, fy: wl.h / 2 };
  tl.set(cam, { s: 0.75 }, 0);
  tl.to(cam, { s: 0.36, duration: 0.9, ease: 'expo.out' }, 30.6);
  tl.to(cam, { s: 0.33, duration: 7, ease: 'none' }, 31.5);
  move(wl.plane, () => view(wl.plane, cam));
  // Outside the wall goes dark once it is sealed.
  const outside = add(el, 'abs', '', `inset:0;background:rgba(0,0,40,0.9);clip-path:polygon(0 0,100% 0,100% 100%,0 100%,0 0,${FR.x}px ${FR.y}px,${FR.x}px ${FR.y + FR.h}px,${FR.x + FR.w}px ${FR.y + FR.h}px,${FR.x + FR.w}px ${FR.y}px,${FR.x}px ${FR.y}px)`);
  tl.set(outside, { opacity: 0 }, 0);
  tl.to(outside, { opacity: 1, duration: 0.3, ease: 'power2.out' }, 32.5);
  // Standard pages arrive from outside and stop dead against it.
  const HITS = [
    { from: [2200, 360], to: [FR.x + FR.w + 6, 360] }, { from: [-500, 520], to: [FR.x - 6 - PW * 1.2, 520] },
    { from: [900, -600], to: [900, FR.y - 6 - PH * 1.2] }, { from: [1250, 1300], to: [1250, FR.y + FR.h + 6] },
    { from: [2200, 700], to: [FR.x + FR.w + 6, 700] },
  ];
  HITS.forEach((h, k) => {
    const pg = add(el, 'page gray', pageHTML(k), `left:0;top:0;transform-origin:0 0`);
    const o = { u: 0 }; const at = 33.0 + k * 0.17;
    tl.set(o, { u: 0 }, 0);
    tl.to(o, { u: 1, duration: 0.32, ease: 'none' }, at);
    move(pg, () => `translate(${lerp(h.from[0], h.to[0], o.u)}px, ${lerp(h.from[1], h.to[1], o.u)}px) scale(1.2)`);
    tl.to(pg, { opacity: 0, duration: 0.4 }, 38.2);
  });
  const scrim = add(el, 'abs', '', `left:${FR.x}px;top:${FR.y}px;width:${FR.w}px;height:${FR.h}px;background:rgba(0,0,50,0.8)`);
  tl.set(scrim, { opacity: 0 }, 0);
  tl.to(scrim, { opacity: 1, duration: 0.4 }, 34.7);
  const copy = add(el, 'abs serif white nowrap', words('Your information.') + '<span class="teal">' + words('Our walls.') + '</span>',
    'left:0;right:0;top:470px;text-align:center;font-size:118px;letter-spacing:-0.015em');
  slam(copy, 35.0, { stagger: 0.08 });
  tl.to(copy, { opacity: 0, duration: 0.3 }, 38.0);
  // The close: everything but the wall goes; the wall becomes the lockup frame.
  tl.to([wl.plane, scrim], { opacity: 0, duration: 0.4 }, 38.2);
  tl.to(outside, { opacity: 0, duration: 0.4 }, 38.2);
  const lock = add(el, 'abs', '<div id="lockup"><img src="assets/lockup-teal-on-dark.png" alt="McDermott Studio"></div>', `left:${960 - 280}px;top:${540 - 75}px`);
  const img = lock.querySelector('img');
  const missing = () => { img.remove(); add(lock.firstChild, 'missing', 'Lockup PNG · assets/lockup-teal-on-dark.png'); };
  if (img.complete && img.naturalWidth === 0) missing(); else img.addEventListener('error', missing);
  tl.set(lock, { opacity: 0 }, 0);
  tl.to(lock, { opacity: 1, duration: 0.8, ease: 'sine.inOut' }, 39.2);
  const sign = add(el, 'abs serif white nowrap', words('Built in-house. Built for law.'), 'left:0;right:0;top:760px;text-align:center;font-size:56px');
  slam(sign, 40.4, { stagger: 0.1, y: 30 });
  // The wall itself, drawn fast around the frame; the gold hairline closes it.
  ['t', 'r', 'b', 'l', 'g'].forEach((k) => add(el, k === 'g' ? 'bar gold' : 'bar', '', '').id = 'w-' + k);
});
tl.set(frame, { p: 0, k: 0 }, 0);
tl.to(frame, { p: 0.92, duration: 0.8, ease: 'power2.in' }, 31.6);
tl.to(frame, { p: 1, duration: 0.12, ease: 'none' }, 32.4);   // gold seal: the hit
tl.to(frame, { k: 1, duration: 0.8, ease: 'power3.inOut' }, 38.3);

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

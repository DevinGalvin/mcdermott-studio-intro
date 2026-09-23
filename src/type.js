// Type layer. One line per beat. Type is the last thing to arrive in a beat and the first
// to leave: every cue arrives after the beat's visual event and is gone before the beat ends.
// Arrival: blur-to-sharp, tracking tightening, opacity. Nothing moves positionally.

export const CUES = {
  b1:  { in: 5.0,  out: 8.1,  from: '0.14em', to: '0.01em' },
  b2a: { in: 11.0, out: 13.1, from: '0.14em', to: '0.01em' },
  b2b: { in: 14.0, out: 16.3, from: '0.34em', to: '-0.005em', blur: 18, dur: 2.2 },
  b3:  { in: 26.0, out: 28.3, from: '0.14em', to: '0.01em' },
  b4:  { in: 36.0, out: 39.3, from: '0.14em', to: '0.01em' },
  b5:  { in: 43.0, out: null, from: '0.14em', to: '0.01em' },
};
export const LOCKUP_IN = 41.8;

export function buildType(tl, root) {
  for (const [id, c] of Object.entries(CUES)) {
    const el = root.querySelector(`[data-cue="${id}"]`);
    const blur = c.blur ?? 10, dur = c.dur ?? 1.5;
    tl.fromTo(el,
      { opacity: 0, filter: `blur(${blur}px)`, letterSpacing: c.from },
      { opacity: 1, filter: 'blur(0px)', letterSpacing: c.to, duration: dur, ease: 'power3.out', immediateRender: false }, c.in);
    if (c.out != null) {
      tl.to(el, { opacity: 0, filter: 'blur(4px)', duration: 0.7, ease: 'power2.in' }, c.out);
    }
    tl.set(el, { opacity: 0 }, 0);
  }
  const lock = root.querySelector('#lockup');
  tl.set(lock, { opacity: 0 }, 0);
  tl.to(lock, { opacity: 1, duration: 1.4, ease: 'sine.inOut' }, LOCKUP_IN);

  // The lockup is the teal-on-dark PNG in /assets, used as-is. Until it lands, show a frame.
  const img = lock.querySelector('img');
  const missing = () => {
    img.remove();
    const d = document.createElement('div');
    d.className = 'missing label';
    d.textContent = 'Lockup PNG goes here · assets/lockup-teal-on-dark.png';
    lock.appendChild(d);
  };
  if (img.complete && img.naturalWidth === 0) missing(); else img.addEventListener('error', missing);
}

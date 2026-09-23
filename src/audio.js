// Placeholder sound layer. The timing hooks are final; the tones are not.
// Real music later replaces buildGraph() but keeps CUES.
export const CUES = {
  pad:  { start: 0.0,  end: 31.0 },  // sustained low pad, beats 1–3
  rise: { start: 31.0, end: 35.85 },  // rising element, beat 4, resolves on the seal
  hit:  { at: 35.85 },                // single low hit on the seal
  // 40–45: silence for the close
};

// Schedules every cue on any BaseAudioContext. `origin` is the context time that maps to film t=0.
export function buildGraph(ctx, origin, dest = ctx.destination) {
  const at = (t) => Math.max(0, origin + t);
  const master = ctx.createGain(); master.gain.value = 0.8; master.connect(dest);
  const stop = [];

  // Pad: detuned low fifth through a dark filter.
  const padGain = ctx.createGain(); padGain.gain.value = 0;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.3;
  lp.connect(padGain); padGain.connect(master);
  for (const [f, d, g] of [[55, -6, 0.5], [55, 7, 0.5], [82.41, 3, 0.28], [110, -4, 0.12]]) {
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.detune.value = d;
    const og = ctx.createGain(); og.gain.value = g; o.connect(og); og.connect(lp);
    o.start(at(CUES.pad.start)); o.stop(at(CUES.pad.end + 0.2)); stop.push(o);
  }
  padGain.gain.setValueAtTime(0, at(0));
  padGain.gain.linearRampToValueAtTime(0.22, at(3.0));
  padGain.gain.setValueAtTime(0.22, at(28.5));
  padGain.gain.linearRampToValueAtTime(0.0, at(CUES.pad.end));
  lp.frequency.setValueAtTime(420, at(9));
  lp.frequency.linearRampToValueAtTime(900, at(16)); // warms with the turn

  // Rise: filtered saw climbing into the seal, cut dead on the hit.
  const rg = ctx.createGain(); rg.gain.value = 0;
  const rf = ctx.createBiquadFilter(); rf.type = 'lowpass'; rf.Q.value = 4;
  rf.connect(rg); rg.connect(master);
  const ro = ctx.createOscillator(); ro.type = 'sawtooth';
  ro.frequency.setValueAtTime(73.4, at(CUES.rise.start));
  ro.frequency.exponentialRampToValueAtTime(146.8, at(CUES.rise.end));
  rf.frequency.setValueAtTime(200, at(CUES.rise.start));
  rf.frequency.exponentialRampToValueAtTime(2400, at(CUES.rise.end));
  rg.gain.setValueAtTime(0, at(CUES.rise.start));
  rg.gain.linearRampToValueAtTime(0.10, at(CUES.rise.end - 0.05));
  rg.gain.linearRampToValueAtTime(0, at(CUES.rise.end));
  ro.connect(rf); ro.start(at(CUES.rise.start)); ro.stop(at(CUES.rise.end + 0.1)); stop.push(ro);

  // Hit: a pitched-down sine thump plus a short dark noise body, long tail.
  const ho = ctx.createOscillator(); ho.type = 'sine';
  ho.frequency.setValueAtTime(62, at(CUES.hit.at));
  ho.frequency.exponentialRampToValueAtTime(34, at(CUES.hit.at + 1.2));
  const hg = ctx.createGain();
  hg.gain.setValueAtTime(0, at(CUES.hit.at));
  hg.gain.linearRampToValueAtTime(0.9, at(CUES.hit.at + 0.01));
  hg.gain.exponentialRampToValueAtTime(0.001, at(CUES.hit.at + 4.5));
  ho.connect(hg); hg.connect(master); ho.start(at(CUES.hit.at)); ho.stop(at(CUES.hit.at + 4.6)); stop.push(ho);
  const len = Math.floor(ctx.sampleRate * 1.5);
  const nb = ctx.createBuffer(1, len, ctx.sampleRate), nd = nb.getChannelData(0);
  let s = 12345; for (let i = 0; i < len; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; nd[i] = (s / 0x7fffffff * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.25)); }
  const ns = ctx.createBufferSource(); ns.buffer = nb;
  const nf = ctx.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 180;
  const ng = ctx.createGain(); ng.gain.value = 0.5;
  ns.connect(nf); nf.connect(ng); ng.connect(master); ns.start(at(CUES.hit.at)); stop.push(ns);

  return { master, stop: () => { for (const n of stop) { try { n.stop(); } catch {} } master.disconnect(); } };
}

// Live playback from any film time.
export function createPlayer() {
  let ctx = null, graph = null, muted = false;
  return {
    get muted() { return muted; },
    toggleMute() { muted = !muted; if (muted) this.stop(); return muted; },
    play(t0) {
      if (muted) return;
      ctx ??= new AudioContext();
      ctx.resume();
      this.stop();
      graph = buildGraph(ctx, ctx.currentTime - t0);
    },
    stop() { graph?.stop(); graph = null; },
  };
}

// Offline render for the MP4: returns a 16-bit stereo WAV as base64.
export async function renderWav(duration, sampleRate = 48000) {
  const ctx = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate);
  buildGraph(ctx, 0);
  const buf = await ctx.startRendering();
  const n = buf.length, L = buf.getChannelData(0), Rc = buf.getChannelData(1);
  const out = new DataView(new ArrayBuffer(44 + n * 4));
  const str = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); str(8, 'WAVE'); str(12, 'fmt ');
  out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true);
  out.setUint32(24, sampleRate, true); out.setUint32(28, sampleRate * 4, true);
  out.setUint16(32, 4, true); out.setUint16(34, 16, true); str(36, 'data'); out.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) {
    out.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true);
    out.setInt16(46 + i * 4, Math.max(-1, Math.min(1, Rc[i])) * 32767, true);
  }
  const bytes = new Uint8Array(out.buffer);
  let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

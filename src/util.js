import * as THREE from 'three';

// Brand palette. Everything in the film pulls from here.
export const C = {
  navy: new THREE.Color('#000042'),
  teal: new THREE.Color('#00E2C1'),
  gold: new THREE.Color('#E5AC2E'),
  white: new THREE.Color('#FFFFFF'),
  abyss: new THREE.Color('#00000f'), // navy pushed toward black: fog, vignette
  deep: new THREE.Color('#00001f'),
  steel: new THREE.Color('#1c2458'), // cold city hairlines, still in the navy family
  gray: new THREE.Color('#6d7079'),  // the bought monolith
};

// Seeded RNG so every export is frame-identical.
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// Procedural brushed-metal roughness: long horizontal streaks over a mid-grey base.
export function brushedRoughness(seed = 7, size = 512) {
  const r = rng(seed);
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  g.fillStyle = 'rgb(120,120,120)';
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 2600; i++) {
    const y = r() * size, len = 40 + r() * size * 0.9, x = r() * size - len * 0.3;
    const v = 90 + r() * 80 | 0;
    g.strokeStyle = `rgba(${v},${v},${v},${0.10 + r() * 0.25})`;
    g.lineWidth = 0.5 + r() * 1.4;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y + (r() - 0.5) * 1.5); g.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

// Procedural studio for reflections: a dark navy room with one large overhead softbox
// and two long strip lights. No colored panels: teal is a light in the scene, never a
// reflection painted onto everything. Glass edges and brushed metal read off these.
export function buildEnvironment(renderer) {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#02031a');
  const panel = (w, h, hex, k, pos) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.copy(pos); m.lookAt(0, 0, 0); s.add(m);
  };
  panel(16, 16, '#ecebe6', 1.3, new THREE.Vector3(-4, 14, 3));   // overhead softbox, cool
  panel(22, 1.2, '#dcdcdc', 1.0, new THREE.Vector3(-14, 4, -6)); // strip left
  panel(22, 1.2, '#cfcfcf', 0.55, new THREE.Vector3(14, 5, 8));   // strip right, dimmer
  panel(40, 8, '#0a0f3c', 1.0, new THREE.Vector3(0, 2, -18));    // navy bounce wall
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshBasicMaterial({ color: '#000008' }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -5; s.add(floor);
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(s, 0.035).texture;
  pm.dispose();
  return env;
}

// Soft contact shadow: a dark radial blot laid on the floor under an object.
let _contact;
export function contactTexture() {
  if (_contact) return _contact;
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 8, 64, 64, 64);
  grd.addColorStop(0, 'rgba(0,0,0,0.9)'); grd.addColorStop(0.5, 'rgba(0,0,0,0.45)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  _contact = new THREE.CanvasTexture(cv);
  return _contact;
}

// Line material whose colour can exceed 1.0 so it feeds the bloom pass.
export function glowLine(color, intensity = 2, opacity = 1) {
  return new THREE.LineBasicMaterial({
    color: color.clone().multiplyScalar(intensity),
    transparent: true, opacity, depthWrite: false,
    blending: THREE.AdditiveBlending, fog: true,
  });
}

// Flat list of [x,y,z, x,y,z, ...] segment pairs → LineSegments geometry.
export function segGeometry(arr) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
  return g;
}

export function boxEdges(out, cx, cy, cz, w, h, d) {
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy, y1 = cy + h, z0 = cz - d / 2, z1 = cz + d / 2;
  const P = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
  const E = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  for (const [a, b] of E) out.push(...P[a], ...P[b]);
}

export function circleSegs(out, cx, cy, cz, r, n = 96, a0 = 0, a1 = Math.PI * 2, plane = 'xz') {
  for (let i = 0; i < n; i++) {
    const t0 = a0 + (a1 - a0) * (i / n), t1 = a0 + (a1 - a0) * ((i + 1) / n);
    const p = (t) => plane === 'xz' ? [cx + Math.cos(t) * r, cy, cz + Math.sin(t) * r]
      : plane === 'xy' ? [cx + Math.cos(t) * r, cy + Math.sin(t) * r, cz]
        : [cx, cy + Math.sin(t) * r, cz + Math.cos(t) * r];
    out.push(...p(t0), ...p(t1));
  }
}

// Soft radial sprite used for additive fog planes and points of light.
let _soft;
export function softTexture() {
  if (_soft) return _soft;
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const g = cv.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  _soft = new THREE.CanvasTexture(cv);
  return _soft;
}

// Layered additive fog planes: a volumetric feel without volumetrics.
// Flagged noDepth so the Bokeh depth pass ignores them.
export function fogLayers({ count = 6, size = 120, y0 = 0, y1 = 10, color = C.navy, opacity = 0.12, seed = 3 }) {
  const r = rng(seed);
  const grp = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size),
      new THREE.MeshBasicMaterial({
        map: softTexture(), color: color.clone(), transparent: true, opacity,
        depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      }));
    m.rotation.x = -Math.PI / 2;
    m.position.set((r() - 0.5) * size * 0.4, y0 + (y1 - y0) * (i / Math.max(1, count - 1)), (r() - 0.5) * size * 0.4);
    m.userData.noDepth = true;
    m.renderOrder = 10;
    grp.add(m);
  }
  return grp;
}

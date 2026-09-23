import * as THREE from 'three';
import { C, softTexture, brushedRoughness } from '../util.js';
import { pos, VESSEL, HERO } from './city.js';

// Beats 3–5, in the same city. Around the lit hero, five neighbouring vessels give up
// their bought slab and take a tool built for them instead, each a different mechanism.
// The camera then visits them one by one. A wall seals the district; a gray form stops
// dead at it; everything outside falls away and the boundary frames the lockup.

const { W, H, BASE } = VESSEL;
const INNER = W - 2 * VESSEL.T - 0.1;

// The district: the hero plus the five cells around it (3 wide × 2 deep).
export const TOOLS = [
  { i: 5, j: 5, label: 'Bespoke',    line: 'Built around the matter, not the market.' },
  { i: 6, j: 5, label: 'Fitted',     line: 'Works the way our teams already work.' },
  { i: 7, j: 5, label: 'Supervised', line: 'Lawyers review what it produces.' },
  { i: 7, j: 4, label: 'Adaptable',  line: 'Changes as fast as the law does.' },
  { i: 5, j: 4, label: 'Ours',       line: 'We own it, so we can improve it tomorrow.' },
];
export const toolPos = (k, y = 0) => new THREE.Vector3(pos(TOOLS[k].i), y, pos(TOOLS[k].j));

const M = 2.9; // wall offset from the outer vessel centres
export const DISTRICT = {
  x0: pos(5) - M, x1: pos(7) + M, z0: pos(4) - M, z1: pos(5) + M,
  get cx() { return (this.x0 + this.x1) / 2; }, get cz() { return (this.z0 + this.z1) / 2; },
};

// Built tools read as satin aluminium and teal; the bought slab is dark graphite.
function materials() {
  const rough = brushedRoughness(13); rough.repeat.set(2, 2);
  return {
    alu: new THREE.MeshPhysicalMaterial({ color: '#a9aeb8', metalness: 1, roughness: 0.3, roughnessMap: rough, envMapIntensity: 1.0 }),
    teal: new THREE.MeshStandardMaterial({ color: C.teal, emissive: C.teal, emissiveIntensity: 0.28, roughness: 0.35, metalness: 0.1 }),
    frost: new THREE.MeshPhysicalMaterial({ color: '#eefcf9', roughness: 0.32, transmission: 0.85, thickness: 0.12, ior: 1.45 }),
  };
}

// 1. Press: frosted plates on aluminium posts; teal sheets slide between them.
function press(m) {
  const g = new THREE.Group(), n = 9, gap = 1.45, y0 = 1.2, P = INNER - 0.25;
  const plates = [];
  for (let k = 0; k < n; k++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(P, 0.08, P), m.frost); p.position.y = y0 + k * gap; g.add(p); plates.push(p);
  }
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, gap * n, 12), m.alu);
    c.position.set(x * (P / 2 - 0.1), y0 + gap * n / 2 - 0.3, z * (P / 2 - 0.1)); g.add(c);
  }
  const sheets = [];
  for (let k = 0; k < n - 1; k++) { const s = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.03, 1.1), m.teal); g.add(s); sheets.push(s); }
  return { g, update(t) {
    const breathe = 0.5 - 0.5 * Math.cos(t * 2.2);
    plates.forEach((p, k) => { p.position.y = y0 + k * gap * (1 - 0.05 * breathe); });
    sheets.forEach((s, k) => {
      const ph = ((t * 0.55 + k * 0.29) % 1 + 1) % 1;
      s.position.set(Math.sin(ph * Math.PI * 2) * 0.55, y0 + (k + 0.5) * gap * (1 - 0.05 * breathe), 0);
    });
  } };
}

// 2. Gyro: stacked aluminium rings turning on different axes around a rod; an orb climbs.
function gyro(m) {
  const g = new THREE.Group();
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 13.6, 12), m.alu); rod.position.y = 7.0; g.add(rod);
  const rings = [2.6, 5.4, 8.2, 11.0, 13.4].map((y, k) => {
    const r = new THREE.Group(); r.position.y = y;
    r.add(new THREE.Mesh(new THREE.TorusGeometry(1.08 - k * 0.1, 0.075, 16, 96), m.alu));
    r.add(new THREE.Mesh(new THREE.TorusGeometry(0.98 - k * 0.1, 0.03, 12, 96), m.teal));
    g.add(r); return r;
  });
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.26, 32, 20), m.teal); g.add(orb);
  return { g, update(t) {
    rings.forEach((r, k) => { r.rotation.set(Math.PI / 2 + Math.sin(t * 0.9 + k) * 0.5, t * (0.8 + k * 0.25) * (k % 2 ? -1 : 1), 0); });
    const ph = ((t * 0.18) % 1 + 1) % 1; orb.position.y = 1.0 + ph * 12.8;
  } };
}

// 3. Lattice: a column of frosted cubes on a 3×3 grid; teal cubes step through it.
function lattice(m) {
  const g = new THREE.Group(), n = 3, levels = 12, s = 0.62, step = 0.84;
  const cells = [];
  for (let y = 0; y < levels; y++) for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) cells.push([a, y, b]);
  const at = ([a, y, b]) => new THREE.Vector3((a - 1) * step, 1.0 + y * (step + 0.3), (b - 1) * step);
  const cubes = new THREE.InstancedMesh(new THREE.BoxGeometry(s, s, s), m.frost, cells.length);
  cells.forEach((c, k) => cubes.setMatrixAt(k, new THREE.Matrix4().setPosition(at(c)))); g.add(cubes);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const paths = [0, 1, 2].map(() => {
    const p = [[rnd() * n | 0, rnd() * levels | 0, rnd() * n | 0]];
    for (let k = 0; k < 40; k++) {
      const q = [...p[p.length - 1]], ax = rnd() * 3 | 0, lim = ax === 1 ? levels - 1 : n - 1;
      q[ax] = Math.min(lim, Math.max(0, q[ax] + (rnd() < 0.5 ? -1 : 1))); p.push(q);
    }
    return p;
  });
  const movers = paths.map(() => { const c = new THREE.Mesh(new THREE.BoxGeometry(s * 1.04, s * 1.04, s * 1.04), m.teal); g.add(c); return c; });
  return { g, update(t) {
    movers.forEach((c, k) => {
      const f = t * 2.2 + k * 0.4, i = Math.floor(f) % 40, e = f - Math.floor(f);
      const q = e < 0.45 ? 0 : (1 - Math.cos((e - 0.45) / 0.55 * Math.PI)) / 2;
      c.position.copy(at(paths[k][i])).lerp(at(paths[k][i + 1]), q);
    });
  } };
}

// 4. Arches: two crossed aluminium arches spanning the vessel; beads travel over them.
function arches(m) {
  const g = new THREE.Group(), half = INNER / 2 - 0.15, top = 13.8;
  const curves = [0, Math.PI / 2].map((rot) => {
    const pts = [];
    for (let k = 0; k <= 48; k++) { const u = k / 48, x = (u * 2 - 1) * half; pts.push(new THREE.Vector3(x, 0.3 + (top - 0.3) * (1 - (x / half) ** 2), 0)); }
    const c = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(c, 96, 0.07, 10), m.alu); tube.rotation.y = rot; g.add(tube);
    return { c, rot };
  });
  const beads = [];
  for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), m.teal); g.add(b); beads.push(b); }
  const v = new THREE.Vector3();
  return { g, update(t) {
    beads.forEach((b, k) => {
      const A = curves[k % 2], ph = ((t * 0.22 + k / 6) % 1 + 1) % 1;
      A.c.getPoint(ph, v); v.applyAxisAngle(THREE.Object3D.DEFAULT_UP, A.rot); b.position.copy(v);
    });
  } };
}

// 5. Spire: a tapering aluminium helix around a glass rod; a teal bead climbs it.
function spire(m) {
  const g = new THREE.Group(), turns = 6, top = 14;
  const pts = [];
  for (let k = 0; k <= 400; k++) { const u = k / 400, a = u * turns * Math.PI * 2, r = 1.15 * (1 - u) + 0.12; pts.push(new THREE.Vector3(Math.cos(a) * r, 0.4 + u * (top - 0.4), Math.sin(a) * r)); }
  const c = new THREE.CatmullRomCurve3(pts);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(c, 600, 0.06, 8), m.alu));
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, top, 16), m.frost); rod.position.y = top / 2; g.add(rod);
  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), m.teal); g.add(bead);
  return { g, update(t) { c.getPoint(((t * 0.12) % 1 + 1) % 1, bead.position); } };
}

export function buildDistrict(city) {
  const group = new THREE.Group();
  const m = materials();
  const makers = [press, gyro, lattice, arches, spire];

  const tools = TOOLS.map((T, k) => {
    const tool = makers[k](m);
    tool.g.position.copy(toolPos(k, BASE - 16)); // parked under the floor until it rises
    tool.g.visible = false;
    group.add(tool.g);
    const light = new THREE.PointLight(C.teal, 0, 5, 2); light.position.copy(toolPos(k, 3)); group.add(light);
    return { ...T, tool, light, slab: city.slab(T.i, T.j), rise: 0 };
  });

  // The wall: four smoky-glass panels that rise to full height around the district.
  const D = DISTRICT, WH = H + 1;
  const wallMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.06, transmission: 1, thickness: 0.2, ior: 1.5,
    attenuationColor: new THREE.Color('#9fe9df'), attenuationDistance: 2.5, envMapIntensity: 1 });
  const sides = [
    { a: [D.x0, D.z0], b: [D.x1, D.z0] }, { a: [D.x1, D.z0], b: [D.x1, D.z1] },
    { a: [D.x1, D.z1], b: [D.x0, D.z1] }, { a: [D.x0, D.z1], b: [D.x0, D.z0] },
  ];
  const perimeter = sides.reduce((s, e) => s + Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1]), 0);
  const walls = sides.map((e) => {
    const len = Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1]);
    const w = new THREE.Mesh(new THREE.BoxGeometry(len, WH, 0.12).translate(0, WH / 2, 0), wallMat);
    w.position.set((e.a[0] + e.b[0]) / 2, 0, (e.a[1] + e.b[1]) / 2);
    w.rotation.y = -Math.atan2(e.b[1] - e.a[1], e.b[0] - e.a[0]);
    w.visible = false; group.add(w); return w;
  });

  // The boundary: a flat teal band drawn around the base, from the seam, closing on itself.
  const bandMat = new THREE.MeshBasicMaterial({ color: C.teal });
  const band = (y, width) => sides.map((e) => {
    const len = Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1]);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(1, width).rotateX(-Math.PI / 2).translate(0.5, 0, 0), bandMat);
    s.position.set(e.a[0], y, e.a[1]); s.rotation.y = -Math.atan2(e.b[1] - e.a[1], e.b[0] - e.a[0]);
    s.userData.len = len; s.scale.x = 0.0001; group.add(s); return s;
  });
  const ground = band(0.03, 0.28);
  const frame = band(H + 1.4, 0.2); // the same line, lifted above everything for the close

  // The seal: one gold hairline up the seam corner, and a gold point that stays.
  const goldMat = new THREE.MeshBasicMaterial({ color: C.gold });
  const seal = new THREE.Mesh(new THREE.BoxGeometry(0.1, WH, 0.1).translate(0, WH / 2, 0), goldMat);
  seal.position.set(D.x0, 0, D.z0); seal.scale.y = 0.0001; group.add(seal);
  const goldPin = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), goldMat);
  goldPin.position.set(D.x0, H + 1.45, D.z0); goldPin.visible = false; group.add(goldPin);

  // The outsider: the same graphite slab, gliding up the street, stopped dead at the wall.
  const street = pos(4) + VESSEL.GAP / 2;
  const intruder = new THREE.Mesh(city.monoGeo, city.monoMat.clone());
  intruder.material.color.set('#8b8f98'); // same object, lit so it reads against the dark street
  intruder.castShadow = true; intruder.visible = false; group.add(intruder);
  const stopX = D.x1 + 1.1;

  // The close: a navy veil over the city, under the frame.
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(600, 600).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: new THREE.Color('#000042').multiplyScalar(0.8), transparent: true, opacity: 0, depthWrite: false, fog: false }));
  veil.position.y = H + 1.2; veil.userData.noDepth = true; group.add(veil);

  const S = { wall: 0, bound: 0, seal: 0, intr: 0, intrOn: 0, veil: 0, frame: 0 };

  function timeline(tl) {
    // Beat 3a, the build-out: slab out, tool in, one after another.
    tools.forEach((o, k) => {
      const at = 17.3 + k * 0.55;
      tl.to(o.slab, { y: BASE + 420, duration: 1.1, ease: 'power3.in' }, at); // lifts clean out of the world
      tl.to(o, { rise: 1, duration: 1.2, ease: 'power3.out' }, at + 0.35);
    });
    // Beat 4, the guardrails.
    tl.to(S, { wall: 1, duration: 1.2, ease: 'power2.out' }, 35.0);
    tl.to(S, { bound: 1, duration: 1.4, ease: 'power2.inOut' }, 35.6);
    tl.to(S, { seal: 1, duration: 0.4, ease: 'power2.out' }, 37.0);
    tl.set(S, { intrOn: 1 }, 37.1);
    tl.to(S, { intr: 1, duration: 1.6, ease: 'none' }, 37.1); // constant speed, then a dead stop
    // Beat 5, the close.
    tl.to(S, { veil: 1, duration: 1.8, ease: 'sine.inOut' }, 40.4);
    tl.to(S, { frame: 1, duration: 0.01 }, 40.4);
  }

  function update(t) {
    tools.forEach((o, k) => {
      o.tool.g.visible = o.rise > 0.001;
      o.tool.g.position.y = BASE - 16 * (1 - o.rise);
      o.tool.update(t);
      o.light.intensity = 22 * o.rise;
    });
    walls.forEach((w) => { w.visible = S.wall > 0.001; w.scale.y = Math.max(0.001, S.wall); });
    let run = S.bound * perimeter;
    ground.forEach((s) => { const d = Math.min(s.userData.len, Math.max(0, run)); s.scale.x = Math.max(0.0001, d); s.visible = d > 0; run -= s.userData.len; });
    frame.forEach((s) => { s.scale.x = s.userData.len; s.visible = S.frame > 0; });
    seal.scale.y = Math.max(0.0001, S.seal); seal.visible = S.seal > 0;
    goldPin.visible = S.frame > 0;
    intruder.visible = S.intrOn > 0;
    intruder.position.set(THREE.MathUtils.lerp(stopX + 36, stopX, S.intr), 0, street);
    veil.material.opacity = S.veil;
    veil.visible = S.veil > 0.001;
  }

  return { group, timeline, update };
}

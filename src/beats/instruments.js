import * as THREE from 'three';
import { C, rng, clamp01, smooth, brushedRoughness, glowLine, segGeometry, boxEdges, circleSegs, softTexture } from '../util.js';

// Beats 3–5. Five instruments built from teal light, each a different silhouette and
// mechanism, each with a different-shaped body of work moving through it. In beat 4 they
// are revealed inside one navy structure that seals; in beat 5 its boundary becomes the
// ring of light around the lockup.

export const R = 7;              // instruments sit on this circle
export const WALL_R = 10.6;      // the structure's boundary
const WALL_H = 3.2;
const DEG = Math.PI / 180;

// Azimuths (degrees) in the same convention as the camera rig: p = (sin az, 0, cos az) * r.
export const AZ = [0, 72, 144, 216, 288].map((a) => a + 20);
export const instPos = (k, y = 0) => new THREE.Vector3(Math.sin(AZ[k] * DEG) * R, y, Math.cos(AZ[k] * DEG) * R);
export const SEAM_AZ = 150;      // where the boundary closes with gold
export const INTRUDER_AZ = 98;   // where the gray form arrives

function glassMat(extra = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: '#16207a', roughness: 0.06, metalness: 0, transmission: 0.92, thickness: 0.35, ior: 1.5,
    clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.1,
    emissive: C.teal.clone(), emissiveIntensity: 0.04,
    transparent: true, opacity: 0, ...extra,
  });
}
function emissiveMat(color, k, extra = {}) {
  return new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(k), transparent: true, opacity: 0, depthWrite: false, ...extra });
}

// Shared scaffolding: lines revealed by drawRange (assembling "from light"), solids fading in.
function instrument(name) {
  const g = new THREE.Group(); g.name = name;
  const lines = [], solids = [];
  return {
    group: g, lines, solids,
    addLines(arr, k = 2.2, op = 1) {
      const geo = segGeometry(arr);
      const mat = glowLine(C.teal, k, op);
      mat.userData.base = op;
      const l = new THREE.LineSegments(geo, mat);
      l.userData.count = arr.length / 3;
      g.add(l); lines.push(l); return l;
    },
    addSolid(mesh, base = 1) { mesh.material.userData.base = base; g.add(mesh); solids.push(mesh); return mesh; },
    // a: assembly 0..1, vis: global multiplier (beat 5 fade)
    reveal(a, vis) {
      const la = smooth(0, 0.75, a), sa = smooth(0.45, 1, a);
      for (const l of lines) {
        l.geometry.setDrawRange(0, Math.round(l.userData.count * la / 2) * 2);
        l.material.opacity = l.material.userData.base * vis;
      }
      for (const s of solids) { s.material.opacity = s.material.userData.base * sa * vis; s.visible = sa * vis > 0.001; }
    },
  };
}

// 1. The stacked press: low, wide, horizontal layers. Flat sheets slide between plates.
function press() {
  const I = instrument('press');
  const PW = 3.0, PD = 2.2, n = 7, gap = 0.34, y0 = 0.35;
  const arr = [];
  for (const [x, z] of [[-PW / 2, -PD / 2], [PW / 2, -PD / 2], [PW / 2, PD / 2], [-PW / 2, PD / 2]]) arr.push(x, 0, z, x, y0 + gap * n + 0.2, z);
  boxEdges(arr, 0, 0, 0, PW, 0, PD);
  boxEdges(arr, 0, y0 + gap * n + 0.2, 0, PW, 0, PD);
  I.addLines(arr, 2.4);
  const plates = [];
  for (let i = 0; i < n; i++) {
    const p = I.addSolid(new THREE.Mesh(new THREE.BoxGeometry(PW - 0.12, 0.06, PD - 0.12), glassMat()), 1);
    p.position.y = y0 + i * gap; plates.push(p);
    const e = []; boxEdges(e, 0, y0 + i * gap - 0.03, 0, PW - 0.12, 0.06, PD - 0.12);
    I.addLines(e, 1.4, 0.55);
  }
  const sheets = [];
  for (let i = 0; i < n - 1; i++) {
    const s = I.addSolid(new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.05), emissiveMat(C.teal, 1.3, { side: THREE.DoubleSide, blending: THREE.AdditiveBlending })), 0.85);
    s.rotation.x = -Math.PI / 2; s.position.y = y0 + i * gap + gap / 2; sheets.push(s);
  }
  I.work = (t, on) => {
    sheets.forEach((s, i) => {
      const ph = ((t * 0.32 + i * 0.37) % 1 + 1) % 1;
      s.position.x = THREE.MathUtils.lerp(3.2, -3.2, ph);
      s.material.opacity = s.material.userData.base * on * smooth(0, 0.2, ph) * (1 - smooth(0.8, 1, ph)) * (0.5 + 0.5 * (1 - Math.abs(s.position.x) / 3.2));
    });
    const press = 0.5 - 0.5 * Math.cos(t * 1.1);
    plates.forEach((p, i) => { p.position.y = y0 + i * gap * (1 - 0.06 * press * on); });
  };
  return I;
}

// 2. The rotating ring: an upright circle with a gimbal inside. Orbs pass through its eye.
function ring() {
  const I = instrument('ring');
  const cy = 2.2, R1 = 1.6, R2 = 1.22;
  const arr = [];
  circleSegs(arr, 0, cy, 0, R1, 128, 0, Math.PI * 2, 'xy');
  for (let i = 0; i < 60; i++) {
    const a = i / 60 * Math.PI * 2, l = i % 5 === 0 ? 0.22 : 0.1;
    arr.push(Math.cos(a) * (R1 + 0.05), cy + Math.sin(a) * (R1 + 0.05), 0, Math.cos(a) * (R1 + 0.05 + l), cy + Math.sin(a) * (R1 + 0.05 + l), 0);
  }
  arr.push(0, 0, 0, 0, cy - R1, 0);                 // stem
  circleSegs(arr, 0, 0.01, 0, 0.6, 48);             // foot
  I.addLines(arr, 2.6);
  const outer = I.addSolid(new THREE.Mesh(new THREE.TorusGeometry(R1, 0.028, 12, 160), emissiveMat(C.teal, 2.2)), 1);
  outer.position.y = cy;
  const gimbal = new THREE.Group(); gimbal.position.y = cy; I.group.add(gimbal);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(R2, 0.075, 24, 160), glassMat()); inner.material.userData.base = 1;
  gimbal.add(inner); I.solids.push(inner);
  const innerArr = []; circleSegs(innerArr, 0, 0, 0, R2 - 0.12, 96, 0, Math.PI * 2, 'xy');
  const innerLine = new THREE.LineSegments(segGeometry(innerArr), glowLine(C.teal, 1.6, 0.6));
  innerLine.material.userData.base = 0.6; innerLine.userData.count = innerArr.length / 3;
  gimbal.add(innerLine); I.lines.push(innerLine);
  const orbs = [];
  for (let i = 0; i < 3; i++) {
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 24), glassMat({ emissiveIntensity: 0.35 }));
    o.material.userData.base = 1; o.position.y = cy; I.group.add(o); I.solids.push(o); orbs.push(o);
  }
  I.work = (t, on) => {
    gimbal.rotation.y = t * 0.45;
    gimbal.rotation.x = Math.sin(t * 0.3) * 0.25;
    orbs.forEach((o, i) => {
      const ph = ((t * 0.22 + i / 3) % 1 + 1) % 1;
      o.position.z = THREE.MathUtils.lerp(-4, 4, ph);
      o.material.opacity *= on * smooth(0, 0.25, ph) * (1 - smooth(0.75, 1, ph));
    });
  };
  return I;
}

// 3. The lattice: a cubic grid stood on its vertex (a diamond). Cubes step cell to cell.
function lattice() {
  const I = instrument('lattice');
  const n = 3, S = 2.1, h = S / n;
  const inner = new THREE.Group(); I.group.add(inner);
  const arr = [];
  for (let a = 0; a <= n; a++) for (let b = 0; b <= n; b++) {
    const u = -S / 2 + a * h, v = -S / 2 + b * h;
    arr.push(u, v, -S / 2, u, v, S / 2);
    arr.push(u, -S / 2, v, u, S / 2, v);
    arr.push(-S / 2, u, v, S / 2, u, v);
  }
  const l = new THREE.LineSegments(segGeometry(arr), glowLine(C.teal, 2.0, 0.9));
  l.material.userData.base = 0.9; l.userData.count = arr.length / 3;
  inner.add(l); I.lines.push(l);
  const nodes = [];
  for (let a = 0; a <= n; a++) for (let b = 0; b <= n; b++) for (let c = 0; c <= n; c++) nodes.push(-S / 2 + a * h, -S / 2 + b * h, -S / 2 + c * h);
  const ng = new THREE.BufferGeometry(); ng.setAttribute('position', new THREE.Float32BufferAttribute(nodes, 3));
  const nm = new THREE.PointsMaterial({ color: C.teal.clone().multiplyScalar(3), size: 0.12, map: softTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
  const pts = new THREE.Points(ng, nm); pts.material.userData.base = 1; inner.add(pts); I.solids.push(pts);
  // Stand the cube on a vertex: body diagonal vertical.
  inner.rotation.set(Math.atan(1 / Math.SQRT2), 0, Math.PI / 4, 'ZXY');
  const pivot = I.group; const cyl = S * Math.sqrt(3) / 2 + 0.15;
  inner.position.y = cyl;
  const r = rng(21);
  const paths = [0, 1, 2].map(() => {
    const p = [[r() * n | 0, r() * n | 0, r() * n | 0]];
    for (let s = 0; s < 24; s++) {
      const q = [...p[p.length - 1]], ax = r() * 3 | 0;
      q[ax] = Math.min(n - 1, Math.max(0, q[ax] + (r() < 0.5 ? -1 : 1)));
      p.push(q);
    }
    return p;
  });
  const cubes = paths.map(() => {
    const c = new THREE.Mesh(new THREE.BoxGeometry(h * 0.46, h * 0.46, h * 0.46), glassMat({ emissiveIntensity: 0.5 }));
    c.material.userData.base = 1; inner.add(c); I.solids.push(c); return c;
  });
  const cell = (q) => new THREE.Vector3(-S / 2 + (q[0] + 0.5) * h, -S / 2 + (q[1] + 0.5) * h, -S / 2 + (q[2] + 0.5) * h);
  I.work = (t, on) => {
    pivot.rotation.y = t * 0.12;
    cubes.forEach((c, i) => {
      const f = t * 1.4 + i * 0.33, s = Math.floor(f) % 24, e = f - Math.floor(f);
      const k = e < 0.5 ? 0 : (1 - Math.cos((e - 0.5) * 2 * Math.PI)) / 2; // dwell, then glide
      c.position.copy(cell(paths[i][s])).lerp(cell(paths[i][s + 1]), k);
      c.material.opacity *= on;
    });
  };
  return I;
}

// 4. The arc: a tall ribbed arch. Beads travel foot to foot along it.
function arc() {
  const I = instrument('arc');
  const Ro = 2.05, Ri = 1.72, cy = 0.2;
  const arr = [];
  circleSegs(arr, 0, cy, 0, Ro, 96, 0, Math.PI, 'xy');
  circleSegs(arr, 0, cy, 0, Ri, 96, 0, Math.PI, 'xy');
  for (let i = 0; i <= 36; i++) {
    const a = i / 36 * Math.PI;
    arr.push(Math.cos(a) * Ri, cy + Math.sin(a) * Ri, 0, Math.cos(a) * Ro, cy + Math.sin(a) * Ro, 0);
  }
  for (const x of [-(Ro + Ri) / 2, (Ro + Ri) / 2]) { arr.push(x - 0.3, 0, 0, x + 0.3, 0, 0); arr.push(x, 0, 0, x, cy, 0); }
  I.addLines(arr, 2.4);
  const band = I.addSolid(new THREE.Mesh(new THREE.TorusGeometry((Ro + Ri) / 2, 0.1, 16, 128, Math.PI), glassMat()), 1);
  band.position.y = cy;
  const beads = [];
  for (let i = 0; i < 5; i++) {
    const b = I.addSolid(new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), emissiveMat(C.teal, 4)), 1);
    beads.push(b);
  }
  I.work = (t, on) => {
    beads.forEach((b, i) => {
      const ph = ((t * 0.18 + i / 5) % 1 + 1) % 1;
      const a = Math.PI * (1 - ph), rr = (Ro + Ri) / 2;
      b.position.set(Math.cos(a) * rr, cy + Math.sin(a) * rr, 0);
      b.material.opacity *= on * smooth(0, 0.08, ph) * (1 - smooth(0.92, 1, ph));
    });
  };
  return I;
}

// 5. The spire: a tall conic helix around a needle. A thread of light climbs it.
function spire() {
  const I = instrument('spire');
  const Hs = 4.9, turns = 6, seg = 360;
  const helix = [];
  let prev = null;
  for (let i = 0; i <= seg; i++) {
    const u = i / seg, a = u * turns * Math.PI * 2, rr = 0.95 * (1 - u) + 0.04;
    const p = [Math.cos(a) * rr, u * Hs, Math.sin(a) * rr];
    if (prev) helix.push(...prev, ...p);
    prev = p;
  }
  I.addLines(helix, 1.6, 0.7);
  const rings = [];
  for (let i = 0; i < 12; i++) { const u = i / 12; circleSegs(rings, 0, u * Hs, 0, 0.95 * (1 - u) + 0.04, 48); }
  rings.push(0, 0, 0, 0, Hs + 0.7, 0);
  I.addLines(rings, 2.2, 0.8);
  const cone = I.addSolid(new THREE.Mesh(new THREE.ConeGeometry(0.42, Hs * 0.92, 48, 1, true), glassMat({ side: THREE.DoubleSide })), 0.8);
  cone.position.y = Hs * 0.46;
  const thread = new THREE.LineSegments(segGeometry(helix), glowLine(C.teal, 6, 1));
  thread.material.userData.base = 1; I.group.add(thread);
  const tip = I.addSolid(new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), emissiveMat(C.teal, 5)), 1);
  tip.position.y = Hs + 0.7;
  I.work = (t, on) => {
    const len = 48, total = helix.length / 3;
    const ph = ((t * 0.16) % 1 + 1) % 1;
    const start = Math.round(ph * (total - len) / 2) * 2;
    thread.geometry.setDrawRange(start, len);
    thread.material.opacity = on * thread.material.userData.base * (1 - smooth(0.85, 1, ph));
    thread.visible = on > 0.001;
  };
  return I;
}

export function buildInstruments() {
  const group = new THREE.Group();
  const makers = [press, ring, lattice, arc, spire];
  const inst = makers.map((mk, k) => {
    const I = mk();
    I.group.position.copy(instPos(k));
    I.group.rotation.y = AZ[k] * DEG + (k === 0 ? 0.3 : 0); // face outward
    group.add(I.group);
    // Soft teal pool on the floor under each instrument.
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ map: softTexture(), color: C.teal,
      transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    pool.rotation.x = -Math.PI / 2; pool.position.copy(instPos(k, 0.02)); pool.userData.noDepth = true;
    group.add(pool);
    return { I, pool, a: 0 };
  });

  // The floor of the structure: deep navy lacquer, catches teal reflections from the env.
  const floor = new THREE.Mesh(new THREE.CircleGeometry(WALL_R, 128),
    new THREE.MeshPhysicalMaterial({ color: '#00002c', roughness: 0.28, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 0.5 }));
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);
  // Beyond the floor: the dark space.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: '#000014', roughness: 0.8, metalness: 0.1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02;
  group.add(ground);

  // The structure's wall: navy glass that materializes in beat 4.
  const wallMat = glassMat({ color: '#0a1270', transmission: 0.85, roughness: 0.14, side: THREE.DoubleSide, emissiveIntensity: 0.0 });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(WALL_R, WALL_R, WALL_H, 160, 1, true), wallMat);
  wall.position.y = WALL_H / 2; wall.visible = false;
  group.add(wall);

  // The boundary: two teal circles drawn from the seam, closing on themselves.
  const seamA = SEAM_AZ * DEG;
  const bArr = [];
  const circ = (y) => { for (let i = 0; i < 192; i++) {
    const a0 = seamA + i / 192 * Math.PI * 2, a1 = seamA + (i + 1) / 192 * Math.PI * 2;
    bArr.push(Math.sin(a0) * WALL_R, y, Math.cos(a0) * WALL_R, Math.sin(a1) * WALL_R, y, Math.cos(a1) * WALL_R);
  } };
  circ(0.02); const perCircle = bArr.length / 3; circ(WALL_H);
  const boundGeo = segGeometry(bArr);
  const boundMat = glowLine(C.teal, 3.2, 1);
  const bound = new THREE.LineSegments(boundGeo, boundMat);
  bound.geometry.setDrawRange(0, 0);
  group.add(bound);
  // Two draw calls so both circles draw at once.
  const bound2 = new THREE.LineSegments(boundGeo, boundMat);
  bound2.geometry = boundGeo.clone(); bound2.geometry.setDrawRange(perCircle, 0);
  group.add(bound2);

  // The seal: a single gold hairline at the seam.
  const seamP = new THREE.Vector3(Math.sin(seamA) * WALL_R, 0, Math.cos(seamA) * WALL_R);
  const sealMat = glowLine(C.gold, 3.5, 0);
  const seal = new THREE.LineSegments(segGeometry([seamP.x, 0, seamP.z, seamP.x, WALL_H, seamP.z]), sealMat);
  group.add(seal);
  const sealGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture(), color: C.gold, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  sealGlow.position.copy(seamP).setY(WALL_H / 2); sealGlow.scale.set(1.2, 4.2, 1); sealGlow.userData.noDepth = true;
  group.add(sealGlow);

  // The outside: the same gray monolith from beat 1, stopped dead at the wall.
  const rough = brushedRoughness(9); rough.repeat.set(1, 3);
  const intruder = new THREE.Mesh(new THREE.BoxGeometry(1.3, 5.2, 1.3).translate(0, 2.6, 0),
    new THREE.MeshStandardMaterial({ color: C.gray, metalness: 0.85, roughness: 0.5, roughnessMap: rough, envMapIntensity: 0.7, transparent: true, opacity: 0 }));
  const iDir = new THREE.Vector3(Math.sin(INTRUDER_AZ * DEG), 0, Math.cos(INTRUDER_AZ * DEG));
  intruder.lookAt(iDir.clone().multiplyScalar(-1));
  group.add(intruder);
  const contact = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture(), color: C.teal, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  contact.position.copy(iDir).multiplyScalar(WALL_R).setY(WALL_H * 0.5); contact.scale.set(2.2, 3.6, 1); contact.userData.noDepth = true;
  group.add(contact);

  // Light flowing freely between the instruments.
  const flows = [];
  const flowArr = [];
  for (let a = 0; a < 5; a++) for (const d of [1, 2]) {
    const b = (a + d) % 5;
    const p0 = instPos(a, 1.2), p2 = instPos(b, 1.2);
    const p1 = p0.clone().add(p2).multiplyScalar(0.5).setY(d === 1 ? 3.2 : 4.4);
    const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
    const pts = curve.getPoints(40);
    for (let i = 0; i < pts.length - 1; i++) flowArr.push(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
    flows.push(curve);
  }
  const flowMat = glowLine(C.teal, 1.2, 0);
  group.add(new THREE.LineSegments(segGeometry(flowArr), flowMat));
  const pulses = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({
    color: C.teal.clone().multiplyScalar(4), size: 0.32, map: softTexture(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  const pulseN = flows.length * 3;
  pulses.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pulseN * 3), 3));
  pulses.userData.noDepth = true;
  group.add(pulses);

  // Beat 5: the ring of light.
  const halo = new THREE.Mesh(new THREE.TorusGeometry(WALL_R, 0.05, 12, 256), emissiveMat(C.teal, 1.0));
  halo.rotation.x = Math.PI / 2; halo.position.y = 0.03;
  group.add(halo);
  const goldPin = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), emissiveMat(C.gold, 1.0));
  goldPin.position.copy(seamP).setY(0.05);
  group.add(goldPin);

  const S = { wall: 0, bound: 0, seal: 0, sealFlash: 0, intr: 0, intrOn: 0, contact: 0, flow: 0, end: 0, halo: 0 };

  function timeline(tl) {
    // Beat 3: each instrument assembles from light as the camera reaches it.
    inst.forEach((o, k) => tl.to(o, { a: 1, duration: 1.7, ease: 'power2.out' }, 16.7 + k * 1.95));
    // Beat 4: the structure, the boundary, the seal, the approach.
    tl.to(S, { wall: 1, duration: 2.4, ease: 'sine.inOut' }, 29.4);
    tl.to(S, { bound: 1, duration: 2.2, ease: 'power2.inOut' }, 31.1);
    tl.to(S, { seal: 1, duration: 0.5, ease: 'power2.out' }, 33.3);
    tl.fromTo(S, { sealFlash: 1 }, { sealFlash: 0, duration: 1.8, ease: 'power2.out', immediateRender: false }, 33.3);
    tl.to(S, { flow: 1, duration: 2.0, ease: 'sine.inOut' }, 33.6);
    tl.to(S, { intrOn: 1, duration: 0.8, ease: 'sine.out' }, 33.6);
    tl.to(S, { intr: 1, duration: 2.1, ease: 'none' }, 33.7);
    tl.fromTo(S, { contact: 1 }, { contact: 0, duration: 1.4, ease: 'power2.out', immediateRender: false }, 35.8);
    // Beat 5: everything recedes into the ring.
    tl.to(S, { end: 1, duration: 2.2, ease: 'power2.inOut' }, 40.0);
    tl.to(S, { halo: 1, duration: 2.2, ease: 'sine.inOut' }, 40.4);
  }

  const tmp = new THREE.Vector3();
  function update(t) {
    const vis = 1 - S.end;
    inst.forEach((o, k) => {
      o.I.reveal(o.a, vis);
      o.I.work(t, smooth(0.6, 1, o.a) * vis);
      o.pool.material.opacity = 0.16 * smooth(0, 1, o.a) * vis;
    });
    wall.visible = S.wall > 0.001 && vis > 0.01;
    wallMat.opacity = 0.55 * S.wall * vis;
    const bc = Math.round(perCircle * S.bound / 2) * 2;
    bound.geometry.setDrawRange(0, bc);
    bound2.geometry.setDrawRange(perCircle, bc);
    boundMat.opacity = 1 - 0.2 * S.end;
    // The top circle recedes in beat 5; only the ground ring stays.
    bound2.visible = vis > 0.02;
    sealMat.opacity = S.seal * vis;
    sealGlow.material.opacity = 0.9 * S.sealFlash;

    const ir = THREE.MathUtils.lerp(30, WALL_R + 0.85, S.intr);
    intruder.position.copy(iDir).multiplyScalar(ir);
    intruder.material.opacity = S.intrOn * vis;
    intruder.visible = S.intrOn * vis > 0.001;
    contact.material.opacity = 0.55 * S.contact * vis;

    flowMat.opacity = 0.22 * S.flow * vis;
    const pa = pulses.geometry.attributes.position;
    flows.forEach((c, i) => { for (let j = 0; j < 3; j++) {
      const ph = ((t * 0.28 + j / 3 + i * 0.13) % 1 + 1) % 1;
      c.getPoint(ph, tmp); pa.setXYZ(i * 3 + j, tmp.x, tmp.y, tmp.z);
    } });
    pa.needsUpdate = true;
    pulses.material.opacity = S.flow * vis;

    halo.material.opacity = S.halo;
    goldPin.material.opacity = S.seal * (0.35 + 0.65 * S.halo);
  }

  return { group, timeline, update, instruments: inst.map((o) => o.I) };
}

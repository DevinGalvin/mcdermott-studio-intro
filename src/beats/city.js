import * as THREE from 'three';
import { C, rng, brushedRoughness, glowLine, segGeometry, boxEdges, softTexture, fogLayers } from '../util.js';

// Beats 1–2. A grid of identical glass towers; the same gray monolith lowers into each.
// Then every tower dims except one, which lights from within.

const N = 11, GAP = 7, W = 3.4, H = 16;
const MONO_W = 1.7, MONO_H = 11, SEAT = H - MONO_H - 0.6, DROP = H + 24;
export const HERO = { i: 6, j: 4 };
const pos = (i) => (i - (N - 1) / 2) * GAP;
export const HERO_POS = new THREE.Vector3(pos(HERO.i), 0, pos(HERO.j));

export function buildCity() {
  const group = new THREE.Group();
  const r = rng(11);
  const cells = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    cells.push({ i, j, x: pos(i), z: pos(j), hero: i === HERO.i && j === HERO.j });
  }
  const others = cells.filter((c) => !c.hero);

  // Ground: near-black navy, faintly reflective.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({ color: '#01011c', roughness: 0.55, metalness: 0.4, envMapIntensity: 0.25 }));
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  // Open-topped glass shells so the monolith can lower inside.
  const shell = new THREE.BoxGeometry(W, H, W);
  shell.translate(0, H / 2, 0);
  const idx = shell.index.array, keep = [];
  for (const g of shell.groups) if (g.materialIndex !== 2) for (let k = g.start; k < g.start + g.count; k++) keep.push(idx[k]);
  shell.setIndex(keep); shell.clearGroups();
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#1a2266', roughness: 0.12, metalness: 0.0,
    transmission: 0.9, thickness: 0.4, ior: 1.45,
    clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 0.9,
    side: THREE.DoubleSide,
  });
  const towers = new THREE.InstancedMesh(shell, glass, others.length);
  const m4 = new THREE.Matrix4();
  others.forEach((c, k) => { m4.makeTranslation(c.x, 0, c.z); towers.setMatrixAt(k, m4); towers.setColorAt(k, C.white); });
  group.add(towers);

  // The hero tower is its own mesh so it can ignite.
  const heroGlass = glass.clone();
  heroGlass.emissive = C.teal.clone(); heroGlass.emissiveIntensity = 0;
  const hero = new THREE.Mesh(shell, heroGlass);
  hero.position.copy(HERO_POS);
  group.add(hero);

  // Cold hairlines: tower edges plus a few floor bands. Navy family, not teal.
  const edgeArr = [], bandArr = [], heroEdge = [];
  for (const c of cells) {
    boxEdges(c.hero ? heroEdge : edgeArr, c.x, 0, c.z, W, H, W);
    if (c.hero) continue;
    for (let y = 2; y < H; y += 2) boxEdges(bandArr, c.x, y, c.z, W, 0, W);
  }
  const edgeMat = glowLine(C.steel, 3.2, 0.9);
  const bandMat = glowLine(C.steel, 2.0, 0.35);
  const edges = new THREE.LineSegments(segGeometry(edgeArr), edgeMat);
  const bands = new THREE.LineSegments(segGeometry(bandArr), bandMat);
  const heroEdgeMat = glowLine(C.steel, 3.2, 0.9);
  const heroEdges = new THREE.LineSegments(segGeometry(heroEdge), heroEdgeMat);
  group.add(edges, bands, heroEdges);

  // Street lights: dim, cold, regular.
  const lamps = [];
  for (let a = 0; a < N + 1; a++) for (let b = 0; b < N * 4; b++) {
    const s = (a - N / 2) * GAP, u = (b / (N * 4) - 0.5) * N * GAP;
    lamps.push(s, 0.15, u, u, 0.15, s);
  }
  const lampGeo = new THREE.BufferGeometry();
  lampGeo.setAttribute('position', new THREE.Float32BufferAttribute(lamps, 3));
  const lampMat = new THREE.PointsMaterial({ color: C.steel.clone().multiplyScalar(2.5), size: 0.35, sizeAttenuation: true,
    map: softTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  group.add(new THREE.Points(lampGeo, lampMat));

  // The bought monolith: identical brushed gray slabs.
  const rough = brushedRoughness(5);
  rough.repeat.set(1, 4);
  const monoMat = new THREE.MeshStandardMaterial({ color: C.gray, metalness: 0.85, roughness: 0.5, roughnessMap: rough, envMapIntensity: 0.7 });
  const monoGeo = new THREE.BoxGeometry(MONO_W, MONO_H, MONO_W); monoGeo.translate(0, MONO_H / 2, 0);
  const monos = new THREE.InstancedMesh(monoGeo, monoMat, others.length);
  const drops = others.map((c) => ({ c, y: SEAT + DROP }));
  others.forEach((c, k) => monos.setColorAt(k, C.white));
  group.add(monos);

  // Beat 2: a teal lattice drawn floor by floor inside the hero.
  const lat = [], inset = 0.35, w = W - inset * 2, floors = 16, fh = H / floors;
  const floorEnds = [];
  for (let f = 0; f < floors; f++) {
    const y0 = f * fh, y1 = y0 + fh, hx = w / 2;
    const P = [[-hx, -hx], [hx, -hx], [hx, hx], [-hx, hx]];
    for (let k = 0; k < 4; k++) {
      const [ax, az] = P[k], [bx, bz] = P[(k + 1) % 4];
      lat.push(ax, y0, az, ax, y1, az);                 // post
      lat.push(ax, y0, az, bx, y1, bz);                 // brace
      lat.push(ax, y1, az, bx, y1, bz);                 // floor ring
      lat.push(ax * 0.35, y1, az * 0.35, bx * 0.35, y1, bz * 0.35); // inner ring
    }
    lat.push(0, y0, 0, 0, y1, 0);                       // core
    floorEnds.push(lat.length / 3);
  }
  const latGeo = segGeometry(lat);
  latGeo.setDrawRange(0, 0);
  const latMat = glowLine(C.teal, 2.4, 1);
  const lattice = new THREE.LineSegments(latGeo, latMat);
  lattice.position.copy(HERO_POS);
  group.add(lattice);

  const tealLight = new THREE.PointLight(C.teal, 0, 30, 1.6);
  tealLight.position.copy(HERO_POS).add(new THREE.Vector3(0, 4, 0));
  group.add(tealLight);

  // Teal spill on the ground around the hero.
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(26, 26),
    new THREE.MeshBasicMaterial({ map: softTexture(), color: C.teal, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending }));
  spill.rotation.x = -Math.PI / 2; spill.position.copy(HERO_POS).setY(0.05);
  spill.userData.noDepth = true;
  group.add(spill);

  // A single gold point of light rising through the core.
  const gold = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12),
    new THREE.MeshBasicMaterial({ color: C.gold.clone().multiplyScalar(6) }));
  const goldHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture(), color: C.gold, transparent: true,
    opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
  goldHalo.scale.setScalar(1.4); goldHalo.userData.noDepth = true;
  const goldPt = new THREE.Group(); goldPt.add(gold, goldHalo);
  const goldLight = new THREE.PointLight(C.gold, 0, 8, 2);
  goldPt.add(goldLight);
  goldPt.position.copy(HERO_POS).setY(0.3);
  goldPt.visible = false;
  group.add(goldPt);

  // Low navy haze between the towers.
  const haze = fogLayers({ count: 5, size: 160, y0: 1, y1: 9, color: C.navy.clone().multiplyScalar(1.6), opacity: 0.16, seed: 4 });
  group.add(haze);

  // State the timeline tweens.
  const S = { dim: 0, ignite: 0, floors: 0, goldY: 0.3, goldOn: 0 };

  function timeline(tl) {
    // Beat 1: row by row, the same slab lowers and locks. Mechanical, identical.
    drops.forEach((d) => {
      const at = 0.8 + d.c.j * 0.42 + d.c.i * 0.035;
      tl.to(d, { y: SEAT + 0.5, duration: 2.1, ease: 'sine.inOut' }, at);
      tl.to(d, { y: SEAT, duration: 0.28, ease: 'power3.in' }, at + 2.1);
    });
    // Beat 2: the city goes quiet; one tower lights from inside.
    tl.to(S, { dim: 1, duration: 2.6, ease: 'power2.inOut' }, 9.0);
    tl.to(S, { ignite: 1, duration: 3.0, ease: 'power2.inOut' }, 9.6);
    tl.to(S, { floors: floors, duration: 5.4, ease: 'sine.inOut' }, 10.0);
    tl.set(S, { goldOn: 1 }, 11.8);
    tl.fromTo(S, { goldY: 0.3 }, { goldY: H + 0.8, duration: 4.8, ease: 'sine.inOut', immediateRender: false }, 11.8);
  }

  const col = new THREE.Color();
  function update(t) {
    const lit = 1 - 0.84 * S.dim;
    col.setScalar(lit);
    for (let k = 0; k < others.length; k++) { towers.setColorAt(k, col); monos.setColorAt(k, col); }
    towers.instanceColor.needsUpdate = true; monos.instanceColor.needsUpdate = true;
    drops.forEach((d, k) => { m4.makeTranslation(d.c.x, d.y, d.c.z); monos.setMatrixAt(k, m4); });
    monos.instanceMatrix.needsUpdate = true;
    edgeMat.opacity = 0.9 * (1 - 0.8 * S.dim);
    bandMat.opacity = 0.35 * (1 - 0.85 * S.dim);
    lampMat.opacity = 1 - 0.7 * S.dim;
    heroEdgeMat.opacity = 0.9 * (1 - 0.7 * S.ignite);

    heroGlass.emissiveIntensity = 0.22 * S.ignite;
    tealLight.intensity = 60 * S.ignite;
    spill.material.opacity = 0.22 * S.ignite;
    const fi = Math.floor(S.floors), ff = S.floors - fi;
    const a = fi > 0 ? floorEnds[fi - 1] : 0;
    const b = fi < floors ? floorEnds[fi] : a;
    latGeo.setDrawRange(0, Math.round(a + (b - a) * ff));

    goldPt.visible = S.goldOn > 0;
    goldPt.position.y = S.goldY;
    goldLight.intensity = 6 * S.goldOn;
  }

  return { group, timeline, update };
}

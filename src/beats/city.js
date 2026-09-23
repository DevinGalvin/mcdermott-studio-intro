import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { C, brushedRoughness, contactTexture, softTexture } from '../util.js';

// Beats 1–2, product-render look. A grid of identical open glass vessels on a dark
// lacquer floor under one soft studio key. The same brushed-aluminium slab lowers into
// each. Then the key falls away, and one vessel lights from inside: frosted floor plates
// stack up through it and a gold point rises through its core.

const N = 11, GAP = 6.2, W = 3.4, H = 15, T = 0.22, BASE = 0.28;
const MONO_W = 1.9, MONO_H = 10.5, SEAT = BASE, DROP = 70;
export const HERO = { i: 6, j: 4 };
const pos = (i) => (i - (N - 1) / 2) * GAP;
export const HERO_POS = new THREE.Vector3(pos(HERO.i), 0, pos(HERO.j));
export const CITY_H = H;

const glassMat = () => new THREE.MeshPhysicalMaterial({
  color: '#ffffff', metalness: 0, roughness: 0.035,
  transmission: 1, thickness: T, ior: 1.5,
  attenuationColor: new THREE.Color('#3b3e4c'), attenuationDistance: 0.9,
  specularIntensity: 1, envMapIntensity: 1.0,
});

// One vessel = four walls + a base.
function vesselParts() {
  const r = 0.045;
  const wx = new RoundedBoxGeometry(W, H, T, 2, r); wx.translate(0, H / 2, 0);
  const wz = new RoundedBoxGeometry(T, H, W - 2 * T, 2, r); wz.translate(0, H / 2, 0);
  const base = new RoundedBoxGeometry(W, BASE, W, 2, r); base.translate(0, BASE / 2, 0);
  const off = W / 2 - T / 2;
  return {
    wx, wz, base,
    place: (x, z) => ({
      wx: [new THREE.Matrix4().makeTranslation(x, 0, z - off), new THREE.Matrix4().makeTranslation(x, 0, z + off)],
      wz: [new THREE.Matrix4().makeTranslation(x - off, 0, z), new THREE.Matrix4().makeTranslation(x + off, 0, z)],
      base: [new THREE.Matrix4().makeTranslation(x, 0, z)],
    }),
  };
}

export function buildCity(scene) {
  const group = new THREE.Group();
  const cells = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) cells.push({ i, j, x: pos(i), z: pos(j), hero: i === HERO.i && j === HERO.j });
  const others = cells.filter((c) => !c.hero);

  // Floor: black-navy lacquer. Receives the key's soft shadows.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), new THREE.MeshPhysicalMaterial({
    color: '#020320', roughness: 0.42, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.3, envMapIntensity: 0.3 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  group.add(floor);

  // Contact shadows ground every vessel.
  const cs = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: contactTexture(), color: 0x000000, transparent: true, opacity: 0.85, depthWrite: false }), cells.length);
  cells.forEach((c, k) => cs.setMatrixAt(k, new THREE.Matrix4().compose(new THREE.Vector3(c.x, 0.01, c.z), new THREE.Quaternion(), new THREE.Vector3(W * 1.9, 1, W * 1.9))));
  group.add(cs);

  // The vessels, instanced.
  const V = vesselParts();
  const glass = glassMat();
  const inst = (geo, n) => { const m = new THREE.InstancedMesh(geo, glass, n); m.receiveShadow = true; group.add(m); return m; };
  const iwx = inst(V.wx, others.length * 2), iwz = inst(V.wz, others.length * 2), ib = inst(V.base, others.length);
  others.forEach((c, k) => {
    const p = V.place(c.x, c.z);
    iwx.setMatrixAt(k * 2, p.wx[0]); iwx.setMatrixAt(k * 2 + 1, p.wx[1]);
    iwz.setMatrixAt(k * 2, p.wz[0]); iwz.setMatrixAt(k * 2 + 1, p.wz[1]);
    ib.setMatrixAt(k, p.base[0]);
  });

  // The hero vessel: same object, its own material so it can take the light.
  const heroGlass = glassMat();
  const hero = new THREE.Group();
  const hp = V.place(0, 0);
  for (const [geo, ms] of [[V.wx, hp.wx], [V.wz, hp.wz], [V.base, hp.base]]) for (const m of ms) {
    const mesh = new THREE.Mesh(geo, heroGlass); mesh.applyMatrix4(m); mesh.receiveShadow = true; hero.add(mesh);
  }
  hero.position.copy(HERO_POS);
  group.add(hero);

  // The bought tool: identical brushed-aluminium slabs.
  const rough = brushedRoughness(5); rough.rotation = Math.PI / 2; rough.repeat.set(3, 1);
  const monoMat = new THREE.MeshPhysicalMaterial({ color: '#3f4249', metalness: 0.9, roughness: 0.46, roughnessMap: rough,
    anisotropy: 0.6, anisotropyRotation: Math.PI / 2, envMapIntensity: 0.28 });
  const monoGeo = new RoundedBoxGeometry(MONO_W, MONO_H, MONO_W, 3, 0.08); monoGeo.translate(0, MONO_H / 2, 0);
  const monos = new THREE.InstancedMesh(monoGeo, monoMat, others.length);
  monos.castShadow = true; monos.receiveShadow = true;
  const drops = others.map((c) => ({ c, y: SEAT + DROP }));
  group.add(monos);

  // Key: one large soft cool light, high and to one side. Soft VSM shadows.
  const key = new THREE.DirectionalLight('#fff8f0', 1.7);
  key.position.set(-14, 90, 8); key.target.position.set(0, 0, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096);
  Object.assign(key.shadow.camera, { left: -50, right: 50, top: 50, bottom: -50, near: 10, far: 200 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03;
  group.add(key, key.target);
  const fill = new THREE.HemisphereLight('#0b0f3a', '#000008', 0.4);
  group.add(fill);

  // Beat 2 interior: frosted floor plates that stack floor by floor, a core, the light.
  const floors = 14, fh = (H - BASE - 0.6) / floors, inner = W - 2 * T - 0.18;
  const plateGeo = new RoundedBoxGeometry(inner, 0.07, inner, 2, 0.03);
  const plates = [];
  for (let f = 0; f < floors; f++) {
    const m = new THREE.MeshPhysicalMaterial({ color: '#d9fff8', roughness: 0.38, transmission: 0.75, thickness: 0.07,
      emissive: C.teal.clone(), emissiveIntensity: 0, transparent: true, opacity: 0 });
    const p = new THREE.Mesh(plateGeo, m);
    p.position.set(0, BASE + (f + 1) * fh, 0); p.visible = false;
    hero.add(p); plates.push(p);
  }
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 20).translate(0, 0.5, 0),
    new THREE.MeshBasicMaterial({ color: C.teal.clone().multiplyScalar(1.6) }));
  core.position.y = BASE; core.scale.y = 0.001; core.visible = false;
  hero.add(core);
  const tealLow = new THREE.PointLight(C.teal, 0, 5.5, 2); tealLow.position.set(0, 1.2, 0); hero.add(tealLow);
  const tealFront = new THREE.PointLight(C.teal, 0, 4.5, 2); hero.add(tealFront);
  // Teal spill on the floor, painted rather than lit, so neighbours don't catch hot specks.
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(22, 22).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({
    map: softTexture(), color: C.teal, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  spill.position.y = 0.03; spill.userData.noDepth = true; hero.add(spill);

  const gold = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), new THREE.MeshBasicMaterial({ color: C.gold.clone().multiplyScalar(5) }));
  const goldLight = new THREE.PointLight(C.gold, 0, 6, 2); gold.add(goldLight);
  gold.visible = false; hero.add(gold);

  const S = { key: 1, ignite: 0, floors: 0, goldY: BASE, goldOn: 0 };

  function timeline(tl) {
    // Beat 1: row by row, the same slab lowers and locks. Mechanical, identical.
    drops.forEach((d) => {
      const at = 0.6 + d.c.j * 0.44 + d.c.i * 0.03;
      tl.to(d, { y: SEAT + 0.35, duration: 2.3, ease: 'sine.inOut' }, at);
      tl.to(d, { y: SEAT, duration: 0.3, ease: 'power3.in' }, at + 2.3);
    });
    // Beat 2: the studio light falls away; one vessel lights from within.
    tl.to(S, { key: 0.06, duration: 3.0, ease: 'power2.inOut' }, 9.0);
    tl.to(S, { ignite: 1, duration: 3.2, ease: 'power2.inOut' }, 9.5);
    tl.to(S, { floors, duration: 5.6, ease: 'sine.inOut' }, 9.9);
    tl.set(S, { goldOn: 1 }, 11.6);
    tl.fromTo(S, { goldY: BASE + 0.2 }, { goldY: H + 0.6, duration: 5.0, ease: 'sine.inOut', immediateRender: false }, 11.6);
  }

  const m4 = new THREE.Matrix4();
  function update() {
    drops.forEach((d, k) => { m4.makeTranslation(d.c.x, d.y, d.c.z); monos.setMatrixAt(k, m4); });
    monos.instanceMatrix.needsUpdate = true;

    key.intensity = 1.7 * S.key;
    fill.intensity = 0.4 * S.key;
    scene.environmentIntensity = 0.12 + 0.88 * S.key;

    tealLow.intensity = 240 * S.ignite;
    spill.material.opacity = 0.16 * S.ignite;
    heroGlass.attenuationColor.set('#3b3e4c').lerp(C.teal, 0.35 * S.ignite);
    plates.forEach((p, f) => {
      const k = THREE.MathUtils.clamp(S.floors - f, 0, 1);
      p.visible = k > 0.001;
      p.material.opacity = k;
      p.material.emissiveIntensity = 0.9 + 2.2 * (1 - k) * (k > 0 ? 1 : 0); // arrives bright, settles
      p.scale.setScalar(0.94 + 0.06 * k);
    });
    const front = BASE + S.floors * fh;
    core.visible = S.floors > 0.01; core.scale.y = Math.max(0.001, front - BASE);
    tealFront.position.y = front + 0.4;
    tealFront.intensity = 110 * S.ignite * (S.floors < floors ? 1 : 0.6);
    gold.visible = S.goldOn > 0; gold.position.y = S.goldY;
    goldLight.intensity = 5 * S.goldOn;
  }

  return { group, timeline, update };
}

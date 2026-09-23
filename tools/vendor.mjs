// Copies the pinned three.js + GSAP ES modules into ./vendor so the film runs offline
// from a single folder (no CDN at pitch time).
import { cpSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
const nm = new URL('../node_modules/', import.meta.url).pathname;
const out = new URL('../vendor/', import.meta.url).pathname;
rmSync(out, { recursive: true, force: true });
mkdirSync(out + 'three/build', { recursive: true });
cpSync(nm + 'three/build/three.module.js', out + 'three/build/three.module.js');
for (const d of ['postprocessing', 'shaders', 'environments', 'geometries', 'lights']) {
  cpSync(nm + 'three/examples/jsm/' + d, out + 'three/addons/' + d, { recursive: true });
}
mkdirSync(out + 'gsap', { recursive: true });
for (const f of readdirSync(nm + 'gsap')) if (/^(index|gsap-core|CSSPlugin)\.js$/.test(f)) cpSync(nm + 'gsap/' + f, out + 'gsap/' + f);
console.log('vendored three + gsap into', out);

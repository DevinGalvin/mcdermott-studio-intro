// Builds the shareable web preview into out/web: the page plus only the modules it imports.
// The preview is brand-neutral: the firm name is replaced with a placeholder.
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
const root = new URL('..', import.meta.url).pathname;
const out = join(root, 'out/web');
rmSync(out, { recursive: true, force: true });

let html = readFileSync(join(root, 'index.html'), 'utf8')
  .replace(/<!doctype html>\s*<html[^>]*>\s*<head>/i, '')
  .replace(/<meta charset[^>]*>\s*<meta name="viewport"[^>]*>/i, '')
  .replace(/<\/head>\s*<body>/i, '').replace(/<\/body>\s*<\/html>\s*$/i, '')
  .replace('<title>McDermott Studio</title>', '<title>Studio Brand Film</title>')
  .replaceAll('McDermott Studio', 'Studio Name')
  .replace('html, body { margin: 0; height: 100%;', 'html, body { margin: 0; height: 100%; color-scheme: dark;');
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'index.html'), html.trim() + '\n');

// Walk the import graph from src/main.js, resolving the importmap by hand.
const map = { 'three': 'vendor/three/build/three.module.js', 'gsap': 'vendor/gsap/index.js' };
const resolve = (spec, from) => {
  if (map[spec]) return map[spec];
  if (spec.startsWith('three/addons/')) return 'vendor/three/addons/' + spec.slice(13);
  return normalize(join(dirname(from), spec));
};
const seen = new Set(), queue = ['src/main.js'];
while (queue.length) {
  const f = queue.pop(); if (seen.has(f)) continue; seen.add(f);
  const src = readFileSync(join(root, f), 'utf8');
  for (const m of src.matchAll(/(?:import|export)[^'"]*?from\s*['"]([^'"]+)['"]/g)) queue.push(resolve(m[1], f));
}
for (const f of seen) {
  mkdirSync(join(out, dirname(f)), { recursive: true });
  if (f.startsWith('src/')) writeFileSync(join(out, f), readFileSync(join(root, f), 'utf8').replaceAll('McDermott Studio', 'Studio Name'));
  else cpSync(join(root, f), join(out, f));
}
writeFileSync(join(out, 'files.json'), JSON.stringify([...seen].sort()));
console.log(seen.size, 'modules →', out);

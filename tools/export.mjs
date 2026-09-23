// Frame-by-frame export: every frame rendered deterministically in headless Chrome,
// captured to PNG, stitched with ffmpeg to H.264 1920x1080 @ 60fps with the sound layer.
//
//   npm run export                         full film → out/mcdermott-studio.mp4
//   npm run export -- --from 29 --to 40    a range (still 60fps)
//   npm run export -- --stills 5,12,26,36  just those seconds as PNGs, no video
//
// Env: CHROME_PATH to use a specific Chrome; FFMPEG to use a specific ffmpeg.
import puppeteer from 'puppeteer';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { serve } from './serve.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const root = new URL('..', import.meta.url).pathname;
const out = root + 'out/';
const stills = arg('stills', null)?.split(',').map(Number);
const port = 4546;
const srv = await serve(port);

const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || undefined,
  args: [...(process.getuid?.() === 0 ? ['--no-sandbox'] : []), '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--use-angle=default', '--enable-unsafe-swiftshader',
    '--autoplay-policy=no-user-gesture-required', '--hide-scrollbars', '--no-proxy-server'],
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
page.on('pageerror', (e) => console.error('[page]', e.message));
await page.goto(`http://127.0.0.1:${port}/?export`, { waitUntil: 'networkidle0' });
await page.waitForFunction('window.__film && window.__film.ready === true', { timeout: 60000 });
const { duration, fps } = await page.evaluate(() => ({ duration: __film.duration, fps: __film.fps }));

async function grab(t, file) {
  await page.evaluate((t) => __film.renderAt(t), t);
  await page.screenshot({ path: file, type: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080 } });
}

if (stills) {
  mkdirSync(out + 'stills', { recursive: true });
  for (const s of stills) { await grab(s, `${out}stills/t${s.toFixed(2).padStart(5, '0')}.png`); console.log('still', s); }
} else {
  const from = +arg('from', 0), to = +arg('to', duration);
  const dir = out + 'frames/';
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const n = Math.round((to - from) * fps), t0 = Date.now();
  for (let i = 0; i < n; i++) {
    await grab(from + i / fps, `${dir}${String(i).padStart(5, '0')}.png`);
    if (i % 60 === 0) process.stdout.write(`\rframe ${i}/${n}  ${((Date.now() - t0) / 1000 / (i + 1) * (n - i - 1)).toFixed(0)}s left   `);
  }
  console.log('\nrendering sound layer');
  const wav = await page.evaluate(() => __film.renderAudio());
  writeFileSync(out + 'sound.wav', Buffer.from(wav, 'base64'));
  const ff = process.env.FFMPEG || 'ffmpeg';
  const name = from === 0 && to === duration ? 'mcdermott-studio.mp4' : `mcdermott-studio_${from}-${to}.mp4`;
  const r = spawnSync(ff, ['-y', '-framerate', String(fps), '-i', dir + '%05d.png',
    '-ss', String(from), '-i', out + 'sound.wav',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '256k', '-shortest', out + name], { stdio: 'inherit' });
  if (r.status !== 0) { console.error('ffmpeg failed; frames are in', dir); process.exitCode = 1; }
  else console.log('wrote', out + name);
}
await browser.close();
srv.close();

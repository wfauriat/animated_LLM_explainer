// Sample the animation in one forward pass and build per-scene contact sheets.
// Far cheaper than snap.mjs for reviewing many frames, because the scenes are
// simulated only once and only sampled frames are drawn.
//
//   node tools/sweep.mjs                        -> every 2.5 s, whole project
//   node tools/sweep.mjs --every 1 --from 120 --to 160
//   node tools/sweep.mjs --scene scene9         -> one scene only (repeatable)
//   --scale 0.5     resolution of the frames (default 0.5)
//   --cols 4 --rows 4   contact sheet grid
//   --out <dir>     output directory (default output/sweep)
import {createServer} from 'vite';
import puppeteer from 'puppeteer';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = {every: 2.5, from: 0, to: Infinity, scale: 0.5, cols: 4, rows: 4, out: 'output/sweep'};
const scenes = [];
for (let i = 0; i < args.length; i++) {
  const key = args[i].replace(/^--/, '');
  if (key === 'scene') scenes.push(args[++i]);
  else if (key === 'out') opt.out = args[++i];
  else opt[key] = Number(args[++i]);
}

fs.rmSync(opt.out, {recursive: true, force: true});
fs.mkdirSync(opt.out, {recursive: true});

const server = await createServer({
  server: {port: 0, watch: {ignored: ['**/*']}},
  logLevel: 'error',
});
await server.listen();
const {port} = server.httpServer.address();
const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 0,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

try {
  const page = await browser.newPage();
  page.on('console', m => m.type() === 'error' && !m.text().includes('404') && console.log(`[page] ${m.text()}`));
  page.on('pageerror', e => console.log(`[page error] ${e.message}`));
  await page.goto(`http://localhost:${port}/tools/capture.html`);
  await page.waitForFunction('window.captureReady === true', {timeout: 60000});

  const duration = await page.evaluate(() => window.capture.duration());
  const table = await page.evaluate(() => window.capture.scenes());
  console.log(`Project duration: ${duration.toFixed(2)} s`);
  for (const s of table) {
    console.log(`  ${s.name.padEnd(10)} ${s.start.toFixed(2).padStart(7)} s  (${s.length.toFixed(2)} s)`);
  }

  const ranges = scenes.length
    ? table.filter(s => scenes.includes(s.name)).map(s => [s.start, s.start + s.length])
    : [[opt.from, Math.min(opt.to, duration)]];

  const frames = [];
  for (const [from, to] of ranges) {
    await page.evaluate((a, b, c, d) => window.capture.sweepStart(a, b, c, d), from, to, opt.every, opt.scale);
    for (;;) {
      const f = await page.evaluate(() => window.capture.sweepNext());
      if (!f) break;
      const file = path.join(opt.out, `${f.scene}_t${f.time.toFixed(2).padStart(7, '0')}.jpg`);
      fs.writeFileSync(file, Buffer.from(f.data.split(',')[1], 'base64'));
      frames.push({...f, data: null, file});
    }
  }
  console.log(`Wrote ${frames.length} frames to ${opt.out}`);

  // One or more sheets per scene.
  const perSheet = opt.cols * opt.rows;
  const byScene = new Map();
  for (const f of frames) byScene.set(f.scene, [...(byScene.get(f.scene) ?? []), f]);
  for (const [scene, list] of byScene) {
    for (let s = 0; s * perSheet < list.length; s++) {
      const part = list.slice(s * perSheet, (s + 1) * perSheet);
      const w = 480;
      const h = 270;
      const inputs = part.flatMap(f => ['-i', f.file]);
      const label = part
        .map((f, i) => `[${i}:v]scale=${w}:${h},drawtext=text='${f.time.toFixed(1)}s':x=6:y=6:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.6[v${i}]`)
        .join(';');
      const layout = part.map((_, i) => `${(i % opt.cols) * w}_${Math.floor(i / opt.cols) * h}`).join('|');
      const stack = part.length === 1
        ? '[v0]copy[out]'
        : `${part.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${part.length}:layout=${layout}:fill=gray[out]`;
      const sheet = path.join(opt.out, `sheet_${scene}_${s + 1}.jpg`);
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', `${label};${stack}`, '-map', '[out]', '-q:v', '3', sheet]);
      console.log(`Sheet: ${sheet}`);
    }
  }
} finally {
  await browser.close();
  await server.close();
}

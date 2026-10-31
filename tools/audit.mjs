// Checks the layout of the whole film, without drawing it: at regular intervals,
// lists the text outside the title-safe area and the texts overlapping.
//
//   node tools/audit.mjs [--every 0.25]
//
// A problem only counts if it lasts: text crosses the margins during camera
// moves, and that's fine.
import {createServer} from 'vite';
import puppeteer from 'puppeteer';

const args = process.argv.slice(2);
const every = Number(args[args.indexOf('--every') + 1] || 0.25) || 0.25;
const SAFE = {x: 864, y: 486};
const MIN_SECONDS = 0.75; // shorter than this: in motion, ignored
const MIN_OVERLAP = 6; // px, both ways

const server = await createServer({server: {port: 0, watch: {ignored: ['**/*']}}, logLevel: 'error'});
await server.listen();
const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 0,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

const outside = new Map();
const overlaps = new Map();
const note = (map, key, time, value) => {
  const entry = map.get(key) ?? {frames: 0, from: time, to: time, worst: 0};
  entry.frames++;
  entry.to = time;
  entry.worst = Math.max(entry.worst, value);
  map.set(key, entry);
};
const short = s => (s.length > 44 ? s.slice(0, 41) + '…' : s);

try {
  const page = await browser.newPage();
  page.on('pageerror', e => console.log(`[page error] ${e.message}`));
  await page.goto(`http://localhost:${server.httpServer.address().port}/tools/capture.html`);
  await page.waitForFunction('window.captureReady === true', {timeout: 60000});
  const duration = await page.evaluate(() => window.capture.duration());
  await page.evaluate((t, s) => window.capture.sweepStart(0, t, s, 0.25), duration, every);
  for (;;) {
    const f = await page.evaluate(() => window.capture.auditNext());
    if (!f) break;
    for (const b of f.boxes) {
      const over = Math.max(-SAFE.x - b.x0, b.x1 - SAFE.x, -SAFE.y - b.y0, b.y1 - SAFE.y);
      if (over > 1 && b.x1 > -960 && b.x0 < 960 && b.y1 > -540 && b.y0 < 540) {
        note(outside, `${f.scene} | ${short(b.text)}`, f.time, over);
      }
    }
    const inFrame = f.boxes.filter(b => b.x1 > -960 && b.x0 < 960 && b.y1 > -540 && b.y0 < 540);
    for (let i = 0; i < inFrame.length; i++) {
      for (let j = i + 1; j < inFrame.length; j++) {
        const [a, b] = [inFrame[i], inFrame[j]];
        const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
        const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
        if (w > MIN_OVERLAP && h > MIN_OVERLAP) {
          note(overlaps, `${f.scene} | ${short(a.text)}  ×  ${short(b.text)}`, f.time, Math.min(w, h));
        }
      }
    }
  }
} finally {
  await browser.close();
  await server.close();
}

const print = (title, map) => {
  const rows = [...map].filter(([, e]) => e.frames * every >= MIN_SECONDS).sort((a, b) => b[1].frames - a[1].frames);
  console.log(`\n${title}: ${rows.length}`);
  for (const [key, e] of rows) {
    console.log(`  ${(e.frames * every).toFixed(1).padStart(5)} s  ${e.worst.toFixed(0).padStart(4)} px  @${e.from.toFixed(1)}  ${key}`);
  }
};
print('Text outside the safe area', outside);
print('Overlapping text', overlaps);

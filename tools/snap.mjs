// Render still frames headlessly and assemble a contact sheet.
//
//   node tools/snap.mjs                 -> one frame per second over the whole project
//   node tools/snap.mjs --every 0.5     -> custom sampling step (seconds)
//   node tools/snap.mjs 1.5 4 9.2       -> specific timestamps (seconds)
//   --out <dir>                         -> output directory (default: output/snaps)
//   node tools/snap.mjs --video         -> render the full video to output/project.mp4
//
// Starts its own Vite server on a free port, so it works whether or not
// `npm start` is running.
import {createServer} from 'vite';
import puppeteer from 'puppeteer';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
let every = 1;
let outDir = 'output/snaps';
let video = false;
const times = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--every') every = Number(args[++i]);
  else if (args[i] === '--out') outDir = args[++i];
  else if (args[i] === '--video') video = true;
  else times.push(Number(args[i]));
}

if (!video) {
  fs.rmSync(outDir, {recursive: true, force: true});
  fs.mkdirSync(outDir, {recursive: true});
}

// No file watching: editing sources mid-render must not reload the page.
const server = await createServer({
  server: {port: 0, watch: {ignored: ['**/*']}},
  logLevel: 'error',
});
await server.listen();
const {port} = server.httpServer.address();

const browser = await puppeteer.launch({
  headless: true,
  // A full video render is a single page call that can take many minutes.
  protocolTimeout: 0,
  // --no-sandbox: Ubuntu's AppArmor blocks Chrome's user-namespace sandbox.
  // Acceptable here because the browser only ever loads our own localhost page.
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage();
  page.on('console', msg => {
    if (['error', 'warn'].includes(msg.type())) {
      console.log(`[page ${msg.type()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', err => console.log(`[page error] ${err.message}`));
  await page.goto(`http://localhost:${port}/tools/capture.html`);
  await page.waitForFunction('window.captureReady === true', {timeout: 60000});

  const duration = await page.evaluate(() => window.capture.duration());
  console.log(`Project duration: ${duration.toFixed(2)} s`);
  for (const s of await page.evaluate(() => window.capture.scenes())) {
    console.log(`  ${s.name.padEnd(10)} ${s.start.toFixed(2).padStart(7)} s  (${s.length.toFixed(2)} s)`);
  }

  if (video) {
    const result = await page.evaluate(() => window.capture.renderVideo());
    console.log(result === 0 ? 'Video written to output/project.mp4' : `Render failed (${result})`);
    process.exitCode = result === 0 ? 0 : 1;
  } else {
    await snapFrames(page, duration);
  }
} finally {
  await browser.close();
  await server.close();
}

async function snapFrames(page, duration) {
  if (times.length === 0) {
    for (let t = 0; t < duration; t += every) times.push(+t.toFixed(3));
    times.push(+(duration - 1 / 30).toFixed(3));
  }

  const files = [];
  for (const t of times) {
    const data = await page.evaluate(t => window.capture.renderAt(t), t);
    const file = path.join(outDir, `t${t.toFixed(2).padStart(6, '0')}.png`);
    fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
    files.push(file);
  }
  console.log(`Wrote ${files.length} frames to ${outDir}`);

  // Contact sheet: 4 columns, each frame labelled with its timestamp.
  const cols = 4;
  const rows = Math.ceil(files.length / cols);
  const inputs = files.flatMap(f => ['-i', f]);
  const labelled = files
    .map(
      (_, i) =>
        `[${i}:v]scale=480:-1,drawtext=text='${times[i].toFixed(2)}s':` +
        `x=8:y=8:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.6[v${i}]`,
    )
    .join(';');
  const layout = files
    .map((_, i) => `${(i % cols) * 480}_${Math.floor(i / cols) * 270}`)
    .join('|');
  const stack =
    files.length === 1
      ? `[v0]copy[out]`
      : `${files.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${files.length}:layout=${layout}:fill=gray[out]`;
  const sheet = path.join(outDir, 'contact_sheet.png');
  execFileSync(
    'ffmpeg',
    ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', `${labelled};${stack}`, '-map', '[out]', sheet],
  );
  console.log(`Contact sheet (${cols}x${rows}): ${sheet}`);
}

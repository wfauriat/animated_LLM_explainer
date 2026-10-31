// Fits the timeline to the voice-over script.
//
//   node tools/vofit.mjs            -> report only
//   node tools/vofit.mjs --write    -> also write the scenes' .meta files and
//                                      voiceover/timing.md, subtitles.srt
//
// Each `[marker] text` line of voiceover/script.md starts at that marker. The
// duration of a line is estimated from its words and punctuation; a marker that
// comes too early is pushed back until the previous line has finished, which
// also pushes back everything after it in the scene. The code's own timing is
// the minimum: a line can delay the picture, never hurry it.
//
// Once a real recording exists, drag the markers in the editor instead.
import {createServer} from 'vite';
import puppeteer from 'puppeteer';
import fs from 'node:fs';

const WRITE = process.argv.includes('--write');
const WORDS_PER_SECOND = 2.7; // about 160 words a minute, a usual pace for an explainer
const SENTENCE_PAUSE = 0.2;
const GAP = 0.25; // silence between two lines
const TAIL = 0.4; // silence after a scene's last line

function parseScript(text) {
  const scenes = new Map();
  let scene = null;
  for (const line of text.split('\n')) {
    const heading = line.match(/^## (\S+)/);
    const cue = line.match(/^\[([^\]]+)\] (.+)/);
    if (heading) scenes.set((scene = heading[1]), []);
    else if (cue && scene) scenes.get(scene).push({marker: cue[1], text: cue[2]});
  }
  return scenes;
}

// Spoken duration of a line, in seconds.
function spoken(text) {
  const words = text.split(/\s+/).filter(Boolean).length;
  const sentences = (text.match(/[.?!…:]+(\s|$)/g) ?? []).length;
  return words / WORDS_PER_SECOND + sentences * SENTENCE_PAUSE;
}

const script = parseScript(fs.readFileSync('voiceover/script.md', 'utf8'));

// Natural timing (the code alone) comes from capture.events(). The .meta files
// are left alone until the end: an open editor tab reacts to any change.
const metaOf = name => `src/scenes/${name}.meta`;

const server = await createServer({server: {port: 0, watch: {ignored: ['**/*']}}, logLevel: 'error'});
await server.listen();
const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 0,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
let natural;
try {
  const page = await browser.newPage();
  page.on('pageerror', e => console.log(`[page error] ${e.message}`));
  await page.goto(`http://localhost:${server.httpServer.address().port}/tools/capture.html`);
  await page.waitForFunction('window.captureReady === true', {timeout: 60000});
  await page.evaluate(() => window.capture.duration());
  natural = await page.evaluate(() => window.capture.events());
} finally {
  await browser.close();
  await server.close();
}

// --- Fit ------------------------------------------------------------------------
const report = [];
const subtitles = [];
let filmStart = 0;
let filmNatural = 0;
for (const scene of natural) {
  const cues = new Map((script.get(scene.name) ?? []).map(c => [c.marker, c.text]));
  for (const marker of cues.keys()) {
    if (!scene.events.some(e => e.name === marker)) console.log(`! ${scene.name}: no marker [${marker}]`);
  }
  let shift = 0;
  let voiceEnd = 0;
  const events = [];
  const rows = [];
  for (const e of scene.events) {
    const at = e.at + shift;
    const start = Math.max(at, voiceEnd > 0 ? voiceEnd + GAP : at);
    shift += start - at;
    events.push({name: e.name, targetTime: start});
    const text = cues.get(e.name);
    if (text) {
      const seconds = spoken(text);
      rows.push({marker: e.name, start, seconds, text, pushed: start - at});
      subtitles.push({from: filmStart + start, to: filmStart + start + seconds, text});
      voiceEnd = start + seconds;
    }
  }
  // Lines that run past the end of the scene hold on 'scene-end'.
  const lengthBefore = scene.length + shift;
  const end = scene.events.find(e => e.name === 'scene-end');
  let length = lengthBefore;
  if (voiceEnd + TAIL > lengthBefore) {
    if (end) {
      const hold = voiceEnd + TAIL - lengthBefore;
      events.find(e => e.name === 'scene-end').targetTime += hold;
      length += hold;
    } else if (cues.size) {
      console.log(`! ${scene.name}: the voice runs ${(voiceEnd - lengthBefore).toFixed(1)} s past the end, and there is no 'scene-end' marker`);
    }
  }
  report.push({name: scene.name, natural: scene.length, length, rows, events});
  filmStart += length;
  filmNatural += scene.length;
}

// --- Report -----------------------------------------------------------------------
const clock = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
const lines = ['| Scene | Without voice | With voice | Words |', '|---|---:|---:|---:|'];
let totalWords = 0;
for (const r of report) {
  const words = r.rows.reduce((a, c) => a + c.text.split(/\s+/).length, 0);
  totalWords += words;
  lines.push(`| ${r.name} | ${r.natural.toFixed(1)} s | ${r.length.toFixed(1)} s | ${words} |`);
}
lines.push(`| **Total** | **${clock(filmNatural)}** | **${clock(filmStart)}** | **${totalWords}** |`);
console.log(lines.join('\n'));
console.log('\nLongest silences inside a scene (next line, or scene end, far after the voice stops):');
for (const r of report) {
  r.rows.forEach((c, i) => {
    const next = r.rows[i + 1]?.start ?? r.length;
    const silence = next - (c.start + c.seconds);
    if (silence > 2.5) console.log(`  ${r.name.padEnd(8)} [${c.marker}] ${silence.toFixed(1)} s`);
  });
}

// --- Write ------------------------------------------------------------------------
if (WRITE) {
  for (const r of report) {
    const file = metaOf(r.name);
    const meta = JSON.parse(fs.readFileSync(file, 'utf8'));
    const timeEvents = r.events.map(e => ({name: e.name, targetTime: +e.targetTime.toFixed(3)}));
    if (JSON.stringify(timeEvents) === JSON.stringify(meta.timeEvents)) continue;
    meta.timeEvents = timeEvents;
    fs.writeFileSync(file, JSON.stringify(meta, null, 2) + '\n');
    console.log(`Updated ${file}`);
  }
  const srtTime = t => {
    const date = new Date(Math.round(t * 1000)).toISOString();
    return date.slice(11, 23).replace('.', ',');
  };
  fs.writeFileSync(
    'voiceover/subtitles.srt',
    subtitles.map((s, i) => `${i + 1}\n${srtTime(s.from)} --> ${srtTime(s.to)}\n${s.text}\n`).join('\n'),
  );
  const cueTable = report
    .filter(r => r.rows.length)
    .map(r => [`### ${r.name} (${r.length.toFixed(1)} s)`, '', '| Marker | At | Line | Picture delayed by |', '|---|---:|---:|---:|',
      ...r.rows.map(c => `| ${c.marker} | ${c.start.toFixed(1)} s | ${c.seconds.toFixed(1)} s | ${c.pushed > 0.05 ? c.pushed.toFixed(1) + ' s' : ''} |`), ''].join('\n'))
    .join('\n');
  fs.writeFileSync('voiceover/timing.md', `# Timing estimated from the script\n\nGenerated by \`tools/vofit.mjs\` (${WORDS_PER_SECOND} words/s plus pauses).\n\n${lines.join('\n')}\n\n${cueTable}`);
  console.log('\nWrote the scenes\' .meta files, voiceover/timing.md and voiceover/subtitles.srt');
}

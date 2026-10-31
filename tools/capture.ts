// Headless capture page: loaded by tools/snap.mjs through Puppeteer.
// Exposes window.capture.{duration, renderAt} to render arbitrary timestamps.
import project from '../src/project?project';
import {Node, Rect, Txt} from '@motion-canvas/2d';
import {Renderer, RendererResult} from '@motion-canvas/core';

const renderer = new Renderer(project);
const settings = {
  ...project.meta.getFullRenderingSettings(),
  name: project.name,
};

// Renderer keeps its playback manager private; we only read from it.
const playback = (renderer as any).playback;
const sweep = {settings, to: 0, step: 1, first: true};

// The renderer's time events don't keep track of the markers: note them as the
// scenes run, in order.
const markers = new Map<string, Map<string, {at: number; offset: number}>>();
for (const scene of playback.scenes.current) {
  const events = scene.timeEvents;
  const register = events.register.bind(events);
  const seen = new Map<string, {at: number; offset: number}>();
  markers.set(scene.name, seen);
  events.register = (name: string, initialTime: number) => {
    const offset = register(name, initialTime);
    // A marker stored earlier than the code reaches it just doesn't wait.
    seen.set(name, {at: initialTime, offset: Math.max(0, offset)});
    return offset;
  };
}

(window as any).capture = {
  fps: settings.fps,
  async duration(): Promise<number> {
    await renderer.renderFrame(settings, 0);
    await playback.recalculate();
    return playback.duration / settings.fps;
  },
  // Start time and length of each scene, in seconds (call after duration()).
  scenes(): {name: string; start: number; length: number}[] {
    return playback.scenes.current.map((s: any) => ({
      name: s.name,
      start: s.firstFrame / settings.fps,
      length: (s.lastFrame - s.firstFrame) / settings.fps,
    }));
  },
  // Each scene's markers and length, as the code alone would time them: the
  // delays stored in the .meta files are taken out (call after duration()).
  events(): {name: string; length: number; events: {name: string; at: number}[]}[] {
    return playback.scenes.current.map((s: any) => {
      let delay = 0;
      const events = [...markers.get(s.name)!].map(([name, {at, offset}]) => {
        const natural = at - delay;
        delay += offset;
        return {name, at: natural};
      });
      return {name: s.name, length: (s.lastFrame - s.firstFrame) / settings.fps - delay, events};
    });
  },
  async renderAt(time: number): Promise<string> {
    await renderer.renderFrame(settings, time);
    return renderer.stage.finalBuffer.toDataURL('image/png');
  },
  // One forward pass over [from, to] seconds, far cheaper than renderAt(): the
  // scenes are simulated once, and only sampled frames are drawn. Call
  // sweepStart() once, then sweepNext() until it returns null.
  async sweepStart(from: number, to: number, step: number, scale: number) {
    sweep.settings = {...settings, resolutionScale: scale};
    sweep.to = Math.round(to * settings.fps);
    sweep.step = Math.max(1, Math.round(step * settings.fps));
    renderer.stage.configure(sweep.settings);
    playback.fps = settings.fps;
    playback.state = 1; // PlaybackState.Rendering
    await (renderer as any).reloadScenes(sweep.settings);
    await playback.reset();
    await playback.seek(Math.round(from * settings.fps));
    sweep.first = true;
  },
  async sweepNext(): Promise<{time: number; scene: string; data: string} | null> {
    if (sweep.first) {
      sweep.first = false;
    } else {
      for (let i = 0; i < sweep.step; i++) {
        if (playback.finished || playback.frame >= sweep.to) return null;
        await playback.progress();
      }
    }
    if (playback.frame >= sweep.to) return null;
    await renderer.stage.render(playback.currentScene, playback.previousScene);
    return {
      time: playback.frame / settings.fps,
      scene: playback.currentScene.name,
      data: renderer.stage.finalBuffer.toDataURL('image/jpeg', 0.85),
    };
  },
  // Moves on by `step` seconds without drawing, then lists the text on screen:
  // what it says and its box in frame coordinates (origin at the center).
  async auditNext(): Promise<{time: number; scene: string; boxes: unknown[]} | null> {
    for (let i = 0; i < sweep.step; i++) {
      if (playback.finished || playback.frame >= sweep.to) return null;
      await playback.progress();
    }
    if (playback.frame >= sweep.to) return null;
    const scene = playback.currentScene;
    const view = scene.getView();
    const toView = view.worldToLocal();
    const boxes: unknown[] = [];
    // In paint order: an opaque full-frame cover hides all that came before it.
    type Box = {x0: number; x1: number; y0: number; y1: number};
    const boxOf = (node: Rect | Txt): Box => {
      const size = node.size();
      const toFrame = toView.multiply(node.localToWorld());
      const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) =>
        new DOMPoint((sx * size.x) / 2, (sy * size.y) / 2).matrixTransform(toFrame),
      );
      const xs = corners.map(p => p.x);
      const ys = corners.map(p => p.y);
      return {x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys)};
    };
    const walk = (node: Node, clip?: Box) => {
      if (node.absoluteOpacity() < 0.3) return;
      if (node instanceof Rect && node.clip()) clip = boxOf(node);
      if (node instanceof Rect && node.absoluteOpacity() > 0.8 && node.fill() && node.width() >= 1900 && node.height() >= 1000) {
        boxes.length = 0;
      }
      if (node instanceof Txt) {
        const text = node.text().trim();
        if (text) {
          const b = boxOf(node);
          const seen = clip ? {
            x0: Math.max(b.x0, clip.x0),
            x1: Math.min(b.x1, clip.x1),
            y0: Math.max(b.y0, clip.y0),
            y1: Math.min(b.y1, clip.y1),
          } : b;
          if (seen.x1 > seen.x0 && seen.y1 > seen.y0) boxes.push({text, ...seen});
        }
        return; // spans belong to this text
      }
      node.children().forEach(child => walk(child, clip));
    };
    walk(view);
    return {time: playback.frame / settings.fps, scene: scene.name, boxes};
  },
  // Full render through the FFmpeg exporter -> output/project.mp4
  async renderVideo(): Promise<RendererResult> {
    const finished = new Promise<RendererResult>(resolve =>
      renderer.onFinished.subscribe(resolve),
    );
    await renderer.render({
      ...settings,
      range: [0, Infinity],
      exporter: {
        name: '@motion-canvas/ffmpeg',
        options: {fastStart: true, includeAudio: false},
      },
    });
    return finished;
  },
};
(window as any).captureReady = true;

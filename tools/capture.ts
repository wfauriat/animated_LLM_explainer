// Headless capture page: loaded by tools/snap.mjs through Puppeteer.
// Exposes window.capture.{duration, renderAt} to render arbitrary timestamps.
import project from '../src/project?project';
import {Renderer, RendererResult} from '@motion-canvas/core';

const renderer = new Renderer(project);
const settings = {
  ...project.meta.getFullRenderingSettings(),
  name: project.name,
};

// Renderer keeps its playback manager private; we only read from it.
const playback = (renderer as any).playback;

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
  async renderAt(time: number): Promise<string> {
    await renderer.renderFrame(settings, time);
    return renderer.stage.finalBuffer.toDataURL('image/png');
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

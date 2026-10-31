// Scene 4c — Transformer layers. Depth planes of cogs appear around the
// token rows; a crank drives the machine: with each turn the rows move into
// the next column of cogs, which turns and nudges every dial. Cogs mesh with
// the dials above and below, so each layer links all the rows together.
import {makeScene2D} from '@motion-canvas/2d';
import {
  all,
  easeOutCubic,
  sequence,
  waitFor,
  waitUntil,
} from '@motion-canvas/core';
import {easeOutBack} from '../motion';
import {Backdrop} from '../components/Titles';
import {colors} from '../theme';
import {fastForward, layerStep} from '../scene4/Core';
import {MASTER} from '../scene4/layout';
import {createMachine} from '../scene4/Machine';

export default makeScene2D(function* (view) {
  view.fill(colors.machineBg);

  // Starts on 4b's last frame.
  const machine = createMachine('4c');
  const core = machine.core;
  view.add(<Backdrop />);
  view.add(machine.node);
  yield* waitFor(0.5);

  // --- The planes and columns of cogs -------------------------------------
  yield* waitUntil('core');
  yield* core.label.opacity(1, 0.6);
  yield* sequence(0.2, ...[...core.panels].reverse().map(p => p.opacity(1, 0.6)));
  yield* sequence(
    0.35,
    ...core.cogs.map(column =>
      sequence(0.015, ...column.map(cog => cog.scale(1, 0.4, easeOutBack))),
    ),
  );
  yield* core.more.opacity(1, 0.4);
  yield* waitFor(0.8);

  // --- The crank ----------------------------------------------------------
  yield* waitUntil('crank');
  core.crank.y(MASTER.y + 80);
  yield* all(
    core.drive.opacity(1, 0.5),
    core.crank.opacity(1, 0.5),
    core.crank.y(MASTER.y, 0.7, easeOutCubic),
  );
  yield* waitFor(0.8);

  // --- Turn by turn through the layers ------------------------------------
  yield* waitUntil('layer-1');
  yield* all(
    layerStep(core, 0, 0, 2.6),
    ...machine.guides.map(g => g.opacity(0.3, 1)),
    core.rowsEllipsis.opacity(0, 0.6),
  );
  yield* waitFor(0.6);

  yield* waitUntil('layer-2');
  yield* layerStep(core, 1, 1, 2.0);
  yield* waitFor(0.3);

  yield* waitUntil('layer-3');
  yield* layerStep(core, 2, 2, 1.6);

  yield* waitUntil('more-layers');
  yield* fastForward(core, 3, 1.6);

  yield* waitUntil('layer-n');
  yield* layerStep(core, 3, 4, 2.0);
  yield* waitFor(0.8);
  yield* waitUntil('scene-end');
});

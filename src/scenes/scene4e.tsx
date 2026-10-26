// Scene 4e — Power. The crank is dropped and a battery is plugged into the
// master gear: the machine now turns on its own, drawing power as it runs.
import {makeScene2D} from '@motion-canvas/2d';
import {
  all,
  createSignal,
  easeInCubic,
  easeOutCubic,
  linear,
  Vector2,
  waitFor,
  waitUntil,
} from '@motion-canvas/core';
import {createBattery} from '../components/Battery';
import {colors} from '../theme';
import {MASTER} from '../scene4/layout';
import {createMachine} from '../scene4/Machine';

const BATTERY_AT = new Vector2(600, 425);
const RUN = 6; // seconds of self-powered running

export default makeScene2D(function* (view) {
  view.fill(colors.machineBg);
  const clock = createSignal(0);

  // Starts on 4d's last frame.
  const machine = createMachine('4e');
  const {core, output} = machine;
  const battery = createBattery(clock, BATTERY_AT, MASTER.addX(40));
  battery.node.y(800);
  view.add([machine.node, battery.cable, battery.flow, battery.node]);

  yield clock(1000, 1000, linear);
  yield* waitFor(0.5);

  // --- Drop the crank -----------------------------------------------------
  yield* waitUntil('drop-crank');
  yield* all(
    core.crank.y(core.crank.y() + 420, 1.0, easeInCubic),
    core.crank.rotation(25, 1.0, easeInCubic),
    core.crank.opacity(0, 1.0, easeInCubic),
  );
  yield* waitFor(0.4);

  // --- Plug in the battery ------------------------------------------------
  yield* waitUntil('battery');
  yield* all(output.arrow.opacity(0, 0.6), output.arrowLabel.opacity(0, 0.6));
  yield* battery.node.y(BATTERY_AT.y, 1.0, easeOutCubic);
  yield* battery.cable.end(1, 0.6);
  yield* battery.flow.opacity(1, 0.5);

  // --- The machine runs by itself, draining the battery -------------------
  yield* waitUntil('powered');
  const running = core.rows.slice(0, -1); // the last row left for the output
  yield* all(
    core.crankAngle(core.crankAngle() + 360 * 4, RUN, linear),
    ...core.colAngle.map(a => a(a() + 240, RUN, linear)),
    ...running.flatMap(row =>
      row.dials.map(d => d.rim.rotation(d.rim.rotation() - 600, RUN, linear)),
    ),
    ...core.colGlow.map((g, l) =>
      g.opacity(0, l * 0.4).to(0.25, 0.5).to(0, 0.5).to(0, RUN - l * 0.4 - 1),
    ),
    battery.level(3.1, RUN, linear),
  );
  yield* waitFor(1);
});

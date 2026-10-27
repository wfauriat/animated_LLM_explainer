// Scene 5a — Autoregressive generation. The crank is dropped and a battery
// (the power supply) is plugged into the master gear. The machine shrinks to
// the bottom; above it, the sentence grows one token at a time, each new token
// coming out of the machine and each pass drawing a surge of power. At "<end>"
// the machine goes to standby, and the answer is folded into an envelope.
import {Circle, makeScene2D, Node, Rect, Txt} from '@motion-canvas/2d';
import {
  all,
  chain,
  createRef,
  createSignal,
  easeInCubic,
  easeInOutCubic,
  easeInOutSine,
  easeOutCubic,
  linear,
  loop,
  sequence,
  waitFor,
  waitUntil,
} from '@motion-canvas/core';
import {Battery, createBattery} from '../components/Battery';
import {positionIn} from '../layout';
import {colors, font} from '../theme';
import {Core} from '../scene4/Core';
import {
  FOLDED_SCALE,
  MASTER,
  PICKED,
  POWER_BATTERY,
  TOKENS,
} from '../scene4/layout';
import {createMachine} from '../scene4/Machine';
import {makeChip} from '../scene4/parts';
import {END_TOKEN, Envelope, ENVELOPE_H, ENVELOPE_W, GENERATED} from '../scene5/parts';

const RIG_SCALE = 0.6;
const BUBBLE_TOP = -470;
const chipStyle = {width: null as null, padding: [0, 16] as [number, number]};
const FLOW_IDLE = 0.5; // energy flow between passes (1 during a pass)

// One token's worth of work: the columns light up in turn, the cogs and the
// dials advance, and a surge of power flows in from the battery.
function* pulse(core: Core, battery: Battery, duration: number) {
  const running = core.rows.slice(0, -1); // the last row left for the output
  yield* all(
    core.crankAngle(core.crankAngle() + 120, duration, easeInOutSine),
    ...core.colAngle.map(a => a(a() + 30, duration, easeInOutSine)),
    ...running.flatMap(row =>
      row.dials.map(d => d.rim.rotation(d.rim.rotation() - 75, duration, easeInOutSine)),
    ),
    sequence(
      duration / 8,
      ...core.colGlow.map(g => g.opacity(0.35, duration / 8).to(0, duration / 4)),
    ),
    battery.flow.opacity(1, duration * 0.3).to(FLOW_IDLE, duration * 0.7),
  );
}

export default makeScene2D(function* (view) {
  view.fill(colors.machineBg);
  const clock = createSignal(0);

  // Starts on 4d's last frame: crank in hand, the N+1 arrow still showing.
  const machine = createMachine('5a');
  const {core, output} = machine;
  const battery = createBattery(clock, POWER_BATTERY, MASTER.addX(40));
  battery.node.y(800);

  const rig = createRef<Node>();
  const bubble = createRef<Rect>();
  const flyLayer = createRef<Node>();
  const standby = createRef<Node>();
  const standbyDot = createRef<Circle>();
  const envelope = Envelope();
  envelope.opacity(0);

  view.add(
    <>
      <Node ref={rig}>
        {machine.node}
        {battery.cable}
        {battery.flow}
        {battery.node}
      </Node>
      <Rect
        ref={bubble}
        layout
        wrap={'wrap'}
        alignItems={'center'}
        width={1640}
        gap={12}
        padding={[26, 30]}
        y={BUBBLE_TOP}
        offsetY={-1}
        radius={[30, 30, 8, 30]}
        fill={colors.appBg}
        stroke={colors.botBubble}
        lineWidth={3}
        opacity={0}
      />
      <Node ref={flyLayer} />
      <Node ref={standby} position={[560, 470]} opacity={0}>
        <Circle ref={standbyDot} x={-70} size={18} fill={colors.energy} />
        <Txt x={10} fontFamily={font} fontSize={28} fill={colors.label} text={'standby'} />
      </Node>
      {envelope}
    </>,
  );

  yield clock(1000, 1000, linear);
  yield* waitFor(0.5);

  // --- The crank is dropped, the battery takes over -----------------------
  yield* waitUntil('power');
  yield* all(
    core.crank.y(core.crank.y() + 420, 1.0, easeInCubic),
    core.crank.rotation(25, 1.0, easeInCubic),
    core.crank.opacity(0, 1.0, easeInCubic),
    output.arrow.opacity(0, 0.6),
    output.arrowLabel.opacity(0, 0.6),
    chain(waitFor(0.3), battery.node.y(POWER_BATTERY.y, 1.0, easeOutCubic)),
  );
  yield* battery.cable.end(1, 0.5);
  yield* battery.flow.opacity(FLOW_IDLE, 0.4);
  yield* waitFor(0.3);

  // --- The machine makes room for the text --------------------------------
  yield* waitUntil('shrink');
  yield* all(
    rig().scale(RIG_SCALE, 1.4, easeInOutCubic),
    rig().y(200, 1.4, easeInOutCubic),
  );

  // --- The sentence so far: the prompt (blue) and "coat" (green) ----------
  yield* waitUntil('sentence');
  const promptChips = TOKENS.map(t => makeChip(t, colors.token, {...chipStyle, opacity: 0}));
  promptChips.forEach(c => bubble().add(c));
  const first = makeChip(GENERATED[0], colors.botBubble, {...chipStyle, opacity: 0});
  bubble().add(first);
  yield* bubble().opacity(1, 0.4);
  yield* sequence(0.05, ...promptChips.map(c => c.opacity(1, 0.3)));
  yield* first.opacity(1, 0.4);
  yield* waitFor(1);

  // --- One token at a time, each produced by a full pass of the machine ---
  yield* waitUntil('generate');
  const spawn = () => positionIn(output.words[PICKED], flyLayer());
  function* generate(text: string, fill: string, textFill: string, duration: number) {
    const slot = makeChip(text, fill, {...chipStyle, textFill, opacity: 0});
    bubble().add(slot);
    const target = positionIn(slot, flyLayer());
    const fly = makeChip(text, fill, {...chipStyle, textFill});
    fly.position(spawn()).scale(RIG_SCALE * FOLDED_SCALE);
    flyLayer().add(fly);
    yield* all(
      pulse(core, battery, duration),
      chain(
        waitFor(duration * 0.45),
        all(
          fly.position(target, duration * 0.55, easeInOutCubic),
          fly.scale(1, duration * 0.55, easeInOutCubic),
        ),
      ),
    );
    slot.opacity(1);
    fly.remove();
  }
  for (let i = 1; i < GENERATED.length; i++) {
    yield* generate(GENERATED[i], colors.botBubble, colors.tokenText, i < 3 ? 1.1 : 0.45);
  }
  yield* generate(END_TOKEN, '#3a3f4a', colors.textLight, 0.8);

  // --- "<end>": the machine stops and waits for the next request ----------
  yield* waitUntil('standby');
  yield* all(battery.flow.opacity(0.2, 1.0), standby().opacity(1, 0.6));
  yield loop(() => chain(standbyDot().opacity(0.25, 0.6), standbyDot().opacity(1, 0.6)));
  yield* waitFor(1.5);

  // --- The answer is packed into an envelope ------------------------------
  yield* waitUntil('envelope');
  yield* all(...bubble().children().map(c => c.opacity(0, 0.4)));
  bubble().size(bubble().size());
  bubble().removeChildren();
  yield* all(
    bubble().width(ENVELOPE_W, 0.8, easeInOutCubic),
    bubble().height(ENVELOPE_H, 0.8, easeInOutCubic),
    bubble().y(-ENVELOPE_H / 2, 0.8, easeInOutCubic),
    bubble().radius(10, 0.8),
    bubble().fill(colors.botBubble, 0.8),
    rig().opacity(0, 0.8),
    standby().opacity(0, 0.6),
  );
  envelope.opacity(1);
  bubble().opacity(0);
  yield* waitFor(0.6);
});

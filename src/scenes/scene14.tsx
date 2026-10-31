// Scene 14 — Agents: from text to action. It is the same next-token guesser,
// but now a program runs what it writes and the result comes back into its
// context. So it can try, read what happened and correct, walking its way
// through a longer task (the test catches a mistake left in Scene 13's code).
// But each token is a likely guess, not a certainty: "almost right" is fine in
// a draft, risky in an action. So we limit what it can reach, and a human keeps
// the decisions that matter.
import {Circle, CubicBezier, Line, makeScene2D, Node, Rect, Txt} from '@motion-canvas/2d';
import {
  all,
  chain,
  createRef,
  createSignal,
  easeInCubic,
  easeInOutCubic,
  easeInOutSine,
  easeOutCubic,
  easeOutQuart,
  linear,
  sequence,
  Vector2,
  waitFor,
  waitUntil,
} from '@motion-canvas/core';
import {easeOutBack} from '../motion';
import {CodeLine, mono} from '../components/Code';
import {Cog} from '../components/Cog';
import {Backdrop, Caption, emphasis, SceneTitle, Takeaway} from '../components/Titles';
import {rise, settle} from '../motion';
import {colors, font, type, windowDots} from '../theme';
import {createRoulette} from '../scene4/Output';
import {SEND_FIXED, SEND_WRONG} from '../scene13/parts';

const amber = colors.energy;
const RED = colors.error;
const GREEN = colors.good;

// --- Layout ---------------------------------------------------------------------

const CTX = {x: -584, y: -20, w: 560, h: 760};
const CTX_TOP = CTX.y - CTX.h / 2;
const BLOCK_W = CTX.w - 36;
const BLOCK_H = 42;
const BLOCK_GAP = 8;
const MACHINE = new Vector2(-130, -110);
const COG_R = 92;
const TERM = {x: 470, y: -130, w: 780, h: 520};
const TERM_LEFT = TERM.x - TERM.w / 2 + 24;
const TERM_TOP = TERM.y - TERM.h / 2 + 62;
const TERM_PITCH = 30;
const TERM_ROWS = 14;
const TERM_SIZE = 20;
const FENCE = {x: 470, y: -130, w: 836, h: 590};
const FENCE_BOTTOM = FENCE.y + FENCE.h / 2;
const OUTSIDE_Y = 262;
const OUTSIDE: [string, number][] = [['your emails', 195], ['customers’ data', 470], ['the web', 745]];
const WHEEL = new Vector2(-130, 215);
const WHEEL_SCALE = 0.62;
const NEXT = [
  {word: 'pytest', p: 0.55},
  {word: 'git', p: 0.25},
  {word: 'rm', p: 0.11},
];
const PICKED = 2;

// The three hops of the loop.
const TO_MACHINE: Vector2[] = [
  new Vector2(CTX.x + CTX.w / 2 + 6, MACHINE.y),
  new Vector2(-300, MACHINE.y),
  new Vector2(-270, MACHINE.y),
  MACHINE.addX(-COG_R - 12),
];
const TO_TERMINAL: Vector2[] = [
  MACHINE.addX(COG_R + 12),
  new Vector2(-10, MACHINE.y),
  new Vector2(50, MACHINE.y),
  new Vector2(TERM.x - TERM.w / 2 - 8, MACHINE.y),
];
const TO_CONTEXT: Vector2[] = [
  new Vector2(TERM.x - 180, TERM.y + TERM.h / 2 + 6),
  new Vector2(TERM.x - 180, 290),
  new Vector2(-180, 300),
  new Vector2(CTX.x + CTX.w / 2 + 6, 210),
];
const TO_FENCE: Vector2[] = [
  new Vector2(TERM.x, TERM.y),
  new Vector2(TERM.x, TERM.y + 80),
  new Vector2(TERM.x, FENCE_BOTTOM - 80),
  new Vector2(TERM.x, FENCE_BOTTOM - 22),
];

function bezier([a, b, c, d]: Vector2[], t: number) {
  const u = 1 - t;
  return a.scale(u * u * u).add(b.scale(3 * u * u * t)).add(c.scale(3 * u * t * t)).add(d.scale(t * t * t));
}

const Arrow = ({points, color, ...props}: {points: Vector2[]; color: string} & Record<string, unknown>) => (
  <CubicBezier p0={points[0]} p1={points[1]} p2={points[2]} p3={points[3]} stroke={color} lineWidth={4} endArrow arrowSize={12} {...props} />
);

export default makeScene2D(function* (view) {
  view.fill(colors.machineBg);

  const title = createRef<Rect>();
  const context = createRef<Node>();
  const blocks = createRef<Node>();
  const machine = createRef<Node>();
  const cogAngle = createSignal(0);
  const terminal = createRef<Node>();
  const output = createRef<Node>();
  const toMachine = createRef<CubicBezier>();
  const toTerminal = createRef<CubicBezier>();
  const toContext = createRef<CubicBezier>();
  const packets = createRef<Node>();
  const small = {fontFamily: font, ...type.small, fontSize: 24, fill: colors.label};

  const captions = {
    same: createRef<Rect>(),
    runs: createRef<Rect>(),
    grounded: createRef<Rect>(),
    checks: createRef<Rect>(),
    steps: createRef<Rect>(),
    guess: createRef<Rect>(),
  };

  // Blocked command
  const wheelNode = createRef<Node>();
  const roulette = createRoulette(150, NEXT);
  const fence = createRef<Rect>();
  const fenceLabel = createRef<Txt>();
  const outside = createRef<Node>();
  const cross = createRef<Rect>();
  const dialog = createRef<Rect>();
  const deny = createRef<Rect>();
  const closing = createRef<Rect>();
  const fade = createRef<Rect>();

  view.add(
    <>
      <Backdrop />
      <SceneTitle ref={title} parts={[['Agents:', amber], ['from text to action']]} />

      {/* The context window: the conversation so far */}
      <Node ref={context} opacity={0}>
        <Txt {...small} {...type.label} x={CTX.x - CTX.w / 2} y={CTX_TOP - 26} offsetX={-1} text={'Context window'} />
        <Rect x={CTX.x} y={CTX.y} width={CTX.w} height={CTX.h} radius={20} fill={'#ffffff08'} stroke={colors.label} lineWidth={3} />
        <Node ref={blocks} />
      </Node>

      {/* The machine */}
      <Node ref={machine} opacity={0} position={MACHINE}>
        <Cog teeth={14} radius={COG_R} root={0.84} hole={0.24} fill={colors.cog} rotation={cogAngle} />
        <Txt {...small} y={COG_R + 34} text={'same next-token'} />
        <Txt {...small} y={COG_R + 66} text={'guesser'} />
      </Node>

      {/* The terminal: where text becomes action */}
      <Node ref={terminal} opacity={0}>
        <Rect x={TERM.x} y={TERM.y} width={TERM.w} height={TERM.h} radius={14} fill={colors.panel} stroke={colors.bezelEdge} lineWidth={3} />
        <Rect x={TERM.x} y={TERM.y - TERM.h / 2 + 22} width={TERM.w - 4} height={42} radius={[12, 12, 0, 0]} fill={colors.titleBar} />
        {windowDots.map((c, i) => (
          <Circle x={TERM.x - TERM.w / 2 + 28 + i * 24} y={TERM.y - TERM.h / 2 + 22} size={14} fill={c} />
        ))}
        <Txt x={TERM.x} y={TERM.y - TERM.h / 2 + 22} fontFamily={mono} fontSize={18} fill={colors.textMuted} text={'terminal'} />
        <Node ref={output} />
      </Node>

      {/* The loop */}
      <Arrow ref={toMachine} points={TO_MACHINE} color={colors.label} end={0} />
      <Arrow ref={toTerminal} points={TO_TERMINAL} color={colors.flowOut} end={0} />
      <Arrow ref={toContext} points={TO_CONTEXT} color={colors.flowIn} end={0} />

      {/* Reach */}
      <Rect ref={fence} x={FENCE.x} y={FENCE.y} width={FENCE.w} height={FENCE.h} radius={22} stroke={amber} lineWidth={4} lineDash={[16, 12]} end={0} />
      <Txt ref={fenceLabel} {...small} fontWeight={600} fill={amber} x={FENCE.x - FENCE.w / 2 + 26} y={FENCE_BOTTOM - 22} offsetX={-1} text={'workspace'} opacity={0} />
      <Node ref={outside} opacity={0}>
        {OUTSIDE.map(([label, x]) => (
          <Rect layout x={x} y={OUTSIDE_Y} padding={[12, 22]} radius={12} fill={colors.appBg} stroke={colors.steel} lineWidth={3}>
            <Txt fontFamily={font} fontSize={26} fill={colors.textLight} text={label} />
          </Rect>
        ))}
      </Node>
      <Node ref={wheelNode} position={WHEEL} scale={WHEEL_SCALE} opacity={0}>
        {roulette.node}
      </Node>
      <Node ref={packets} />
      <Rect ref={cross} x={TERM.x + 188} y={FENCE_BOTTOM - 22} width={56} height={56} radius={28} fill={RED} scale={0} layout justifyContent={'center'} alignItems={'center'}>
        <Txt fontFamily={font} fontSize={38} fontWeight={700} fill={colors.machineBg} text={'✕'} />
      </Rect>

      {/* A human decides */}
      <Rect
        ref={dialog}
        layout
        direction={'column'}
        alignItems={'center'}
        gap={16}
        x={TERM.x}
        y={TERM.y - 60}
        padding={[24, 36]}
        radius={16}
        fill={colors.appBg}
        stroke={amber}
        lineWidth={4}
        opacity={0}
        scale={0.8}
      >
        <Txt fontFamily={font} fontSize={30} fontWeight={600} fill={colors.textLight} text={'Allow this command?'} />
        <Txt fontFamily={mono} fontSize={22} fill={colors.textLight} text={'rm -rf ~/customers-data/'} />
        <Txt fontFamily={font} fontSize={24} fill={colors.error} text={'(deletes all customer data)'} />
        <Rect gap={20}>
          <Rect padding={[8, 34]} radius={10} fill={colors.inputField}>
            <Txt fontFamily={font} fontSize={26} fill={colors.textMuted} text={'Allow'} />
          </Rect>
          <Rect ref={deny} padding={[8, 34]} radius={10} fill={colors.inputField}>
            <Txt fontFamily={font} fontSize={26} fontWeight={600} fill={colors.textLight} text={'Deny'} />
          </Rect>
        </Rect>
      </Rect>

      {/* Captions */}
      <Caption ref={captions.same} parts={[['The machine still only writes text…']]} />
      <Caption ref={captions.runs} line={1} parts={[['…but now a program'], emphasis('runs that text,'), ['and the result comes back']]} />
      <Caption ref={captions.grounded} parts={[['Try, read the result, correct:'], emphasis('grounded in what actually happens')]} />
      <Caption ref={captions.checks} line={1} quiet parts={[['(checks raise confidence, they are not a guarantee)']]} />
      <Caption ref={captions.steps} parts={[['Step by step, it walks its way through'], emphasis('longer tasks')]} />
      <Caption ref={captions.guess} parts={[['Each next token is a'], emphasis('likely guess, not a certainty')]} />
      <Takeaway
        ref={closing}
        lines={[
          [['“Almost right” is fine in a'], ['draft,', colors.textLight, 800], ['risky in an'], emphasis('action', 800)],
          [['So: limit what it can reach (its “blast radius”), and keep a human in control']],
        ]}
      />
      <Rect ref={fade} width={1920} height={1080} fill={colors.machineBg} />
    </>,
  );

  // --- Helpers ---------------------------------------------------------------------

  // Text accumulating in the context window.
  let blockY = CTX_TOP + 16;
  function addBlock(lines: string[], fill: string, textFill: string, stroke?: string, family = mono) {
    const h = BLOCK_H + (lines.length - 1) * 32;
    const block = (
      <Rect
        layout
        direction={'column'}
        justifyContent={'center'}
        x={CTX.x}
        y={blockY + h / 2}
        width={BLOCK_W}
        height={h}
        padding={[0, 16]}
        radius={10}
        fill={fill}
        stroke={stroke}
        lineWidth={stroke ? 3 : 0}
        opacity={0}
      >
        {lines.map(text => <Txt fontFamily={family} fontSize={family === mono ? 19 : 24} fill={textFill} text={text} />)}
      </Rect>
    ) as Rect;
    blockY += h + BLOCK_GAP;
    blocks().add(block);
    return block;
  }
  const commandBlock = (text: string) => addBlock([text], colors.botBubble, colors.bubbleText);
  const resultBlock = (text: string, color: string) => addBlock([text], colors.panel, colors.textLight, color);

  // Terminal output, scrolling when full.
  const termLines: Node[] = [];
  function print(text: string, fill: string = colors.textLight) {
    if (termLines.length === TERM_ROWS) {
      termLines.shift()!.remove();
      termLines.forEach(l => l.y(l.y() - TERM_PITCH));
    }
    const line = (
      <CodeLine text={text} size={TERM_SIZE} fill={fill} x={TERM_LEFT} y={TERM_TOP + termLines.length * TERM_PITCH} />
    ) as Node;
    output().add(line);
    termLines.push(line);
  }

  // A little piece of text traveling along one of the loop's arrows.
  function* hop(text: string, fill: string, textFill: string, points: Vector2[], duration: number) {
    const t = createSignal(0);
    const packet = (
      <Rect layout padding={[6, 14]} radius={8} fill={fill} position={() => bezier(points, t())} opacity={0}>
        <Txt fontFamily={mono} fontSize={18} fill={textFill} text={text} />
      </Rect>
    ) as Rect;
    packets().add(packet);
    yield* all(t(1, duration, easeInOutCubic), packet.opacity(1, 0.12));
    return packet;
  }
  function* hopAway(text: string, fill: string, textFill: string, points: Vector2[], duration: number) {
    const packet = yield* hop(text, fill, textFill, points, duration);
    yield* packet.opacity(0, 0.1);
    packet.remove();
  }

  // One turn of the loop: the context feeds the machine, which writes a command;
  // a program runs it, and what it prints returns to the context.
  function* step(command: string, out: [string, string?][], result: [string, string] | null, pace = 1) {
    const written = commandBlock(command);
    yield* all(
      cogAngle(cogAngle() + 90, 0.7 * pace, easeInOutSine),
      chain(waitFor(0.35 * pace), written.opacity(1, 0.2)),
    );
    yield* hopAway(command, colors.botBubble, colors.bubbleText, TO_TERMINAL, 0.55 * pace);
    print(`$ ${command}`, colors.flowOut);
    yield* waitFor(0.35 * pace);
    for (const [text, fill] of out) {
      print(text, fill);
      yield* waitFor(0.14 * pace);
    }
    if (result) {
      yield* waitFor(0.3 * pace);
      const [text, color] = result;
      yield* hopAway(text, colors.panel, colors.textLight, TO_CONTEXT, 0.8 * pace);
      const back = resultBlock(text, color);
      yield* back.opacity(1, 0.2);
    }
  }

  // --- A task ----------------------------------------------------------------------
  yield* fade().opacity(0, 0.8);
  yield* waitFor(0.3);
  yield* waitUntil('task');
  const task = addBlock(['Set up the bike shop app.', 'Make sure the tests pass.'], colors.userBubble, colors.bubbleText, undefined, font);
  yield* all(context().opacity(1, 0.5), machine().opacity(1, 0.5), terminal().opacity(1, 0.5));
  yield* task.opacity(1, 0.3);
  yield* toMachine().end(1, 0.5, easeInOutCubic);
  yield* waitFor(1.2);

  // --- Text that gets executed --------------------------------------------------------
  yield* waitUntil('command');
  yield* all(rise(captions.same()), toTerminal().end(1, 0.6, easeInOutCubic));
  yield* waitFor(1);
  yield* all(rise(captions.runs()), toContext().end(1, 0.8, easeInOutCubic));
  yield* waitFor(0.8);

  // --- Grounding: try, read the result, correct ------------------------------------------
  yield* waitUntil('grounding');
  yield* step(
    'pytest',
    [
      ['tests/test_booking.py F'],
      ['AssertionError: reminder must go out before the booking', RED],
      ['1 failed', RED],
    ],
    ['1 failed: reminder must go out before…', RED],
  );
  yield* waitFor(1);
  yield* all(captions.same().opacity(0, 0.4), captions.runs().opacity(0, 0.4));
  yield* rise(captions.grounded());
  yield* step(
    'edit emails/reminder.py',
    [
      [`- ${SEND_WRONG.trim()}`, RED],
      [`+ ${SEND_FIXED.trim()}`, GREEN],
    ],
    null,
  );
  yield* waitFor(0.6);
  yield* step('pytest', [['tests/test_booking.py .'], ['1 passed', GREEN]], ['1 passed', GREEN]);
  yield* rise(captions.checks());
  yield* waitFor(1.2);

  // --- Longer tasks -----------------------------------------------------------------------
  yield* waitUntil('steps');
  yield* all(captions.grounded().opacity(0, 0.4), captions.checks().opacity(0, 0.4));
  yield* rise(captions.steps());
  yield* step('flask run --port 5000 &', [['Running on http://127.0.0.1:5000']], ['Running on http://127.0.0.1:5000', colors.label], 0.55);
  yield* step('curl -s localhost:5000/book | grep "<h1>"', [['<h1>Book a repair</h1>']], ['<h1>Book a repair</h1>', colors.label], 0.55);
  yield* step('git commit -am "Booking app"', [['[main 3f2a1c9] Booking app']], ['[main 3f2a1c9] Booking app', colors.label], 0.55);
  yield* waitFor(1);

  // --- A likely guess, not a certainty ---------------------------------------------------
  yield* waitUntil('stochastic');
  yield* all(
    captions.steps().opacity(0, 0.4),
    toContext().opacity(0, 0.5),
    wheelNode().opacity(1, 0.5),
    rise(captions.guess()),
  );
  yield* waitFor(0.5);
  yield* roulette.wheel.rotation(roulette.rotationFor(PICKED, 3), 3, easeOutQuart);
  yield* roulette.slices[PICKED].stroke(amber, 0.25);
  yield* waitFor(1);

  // --- So: limit what it can reach ---------------------------------------------------------
  yield* waitUntil('reach');
  yield* all(fence().end(1, 1.1, easeInOutCubic), fenceLabel().opacity(1, 0.6), outside().opacity(1, 0.6));
  yield* waitFor(0.6);
  const command = 'rm -rf ~/customers-data/';
  const written = commandBlock(command);
  yield* all(cogAngle(cogAngle() + 90, 0.7, easeInOutSine), chain(waitFor(0.35), written.opacity(1, 0.2)));
  yield* hopAway(command, colors.botBubble, colors.bubbleText, TO_TERMINAL, 0.55);
  print(`$ ${command}`, colors.flowOut);
  const stopped = yield* hop(command, colors.botBubble, colors.bubbleText, TO_FENCE, 0.6);
  yield* all(
    fence().stroke(RED, 0.12).to(amber, 0.5),
    cross().scale(1, 0.3, easeOutBack),
    stopped.y(stopped.y() - 24, 0.1, easeOutCubic).to(stopped.y(), 0.12, easeInCubic),
  );
  print('blocked: outside the workspace', RED);
  yield* waitFor(0.6);

  // --- A human decides ------------------------------------------------------------------------
  yield* waitUntil('human');
  yield* all(dialog().opacity(1, 0.3), dialog().scale(1, 0.45, easeOutBack));
  yield* waitFor(1);
  yield* all(deny().fill(RED, 0.2), deny().scale(0.92, 0.1).to(1, 0.15));
  yield* waitFor(0.5);
  yield* all(dialog().opacity(0, 0.3), stopped.opacity(0, 0.3));
  stopped.remove();
  print('denied by the user', RED);
  const denied = resultBlock('denied by the user', RED);
  yield* denied.opacity(1, 0.2);
  yield* waitFor(0.8);

  yield* waitUntil('control');
  yield* captions.guess().opacity(0, 0.4);
  yield* settle(closing());
  yield* waitFor(3);
  yield* waitUntil('scene-end');
});

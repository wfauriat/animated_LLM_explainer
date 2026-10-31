// Scene 6 — Attention and context flow. One machine, two sentences.
// Phase 1 ("He sat on the river bank"): in a layer, each word's dial is
// nudged by links from the words before it (never after), the link thickness
// showing how much each earlier word matters. Phase 2: the same machine is
// fed a side input ("He put money in the bank"). "bank" starts with the very
// same dial in both, but ends up pointing differently: context flowed in.
import {
  CubicBezier,
  makeScene2D,
  Node,
  Rect,
  Txt,
} from '@motion-canvas/2d';
import {
  all,
  createRef,
  createSignal,
  easeInOutCubic,
  easeOutCubic,
  fadeTransition,
  linear,
  range,
  sequence,
  SimpleSignal,
  ThreadGenerator,
  Vector2,
  waitFor,
  waitUntil,
} from '@motion-canvas/core';
import {easeOutBack} from '../motion';
import {Cog} from '../components/Cog';
import {Curve, FlowDots} from '../components/Flow';
import {Backdrop, emphasis, Takeaway} from '../components/Titles';
import {settle} from '../motion';
import {colors, font} from '../theme';
import {createDepthDots, createDial, Dial} from '../scene4/Compass';
import {embeddingAngle, FOLDED_SCALE} from '../scene4/layout';
import {makeChip, makeLabel} from '../scene4/parts';

// --- Data -----------------------------------------------------------------

type Sentence = {
  tokens: string[];
  ids: number[];
  // attention[i] = [earlier row, weight] links into row i (weights sum to 1)
  attention: [number, number][][];
  nudges: number[][]; // [layer][row] arrow change, degrees
  next: [string, string]; // N+1, N+2
  cue: string; // the word that gives "bank" its meaning here
};

const RIVER: Sentence = {
  tokens: ['He', 'sat', 'on', 'the', 'river', 'bank'],
  ids: [2993, 3332, 319, 9, 7296, 4440],
  attention: [
    [],
    [[0, 1]],
    [[1, 0.7], [0, 0.3]],
    [[2, 0.6], [1, 0.25], [0, 0.15]],
    [[3, 0.5], [2, 0.3], [1, 0.2]],
    [[4, 0.55], [1, 0.25], [3, 0.1], [2, 0.06], [0, 0.04]],
  ],
  nudges: [
    [0, 35, -25, 40, -30, 75],
    [10, -20, 30, -15, 25, 30],
  ],
  next: ['to', 'fish'],
  cue: 'river',
};

const MONEY: Sentence = {
  tokens: ['He', 'put', 'money', 'in', 'the', 'bank'],
  ids: [2993, 1234, 3218, 14, 9, 4440],
  attention: [
    [],
    [[0, 1]],
    [[1, 0.7], [0, 0.3]],
    [[2, 0.5], [1, 0.4], [0, 0.1]],
    [[3, 0.6], [2, 0.25], [1, 0.15]],
    [[2, 0.6], [1, 0.2], [3, 0.1], [4, 0.06], [0, 0.04]],
  ],
  nudges: [
    [0, -30, 45, -20, 35, -85],
    [10, 25, -30, 20, -15, -35],
  ],
  next: ['each', 'month'],
  cue: 'money',
};

const BANK = 5;

// --- Layout -----------------------------------------------------------------

const ROWS_Y = [-275, -165, -55, 55, 165, 275];
const IN_X = -560; // input column, next to the machine
const SIDE_IN_X = -760; // where the first sentence moves aside to
const SPINE_X = -450;
const ENTRY_X = -340;
const LAYERS_X = [-110, 130];
const OUT_X = [400, 640]; // output column next to the machine; aside
const NEXT_Y = [165, 275]; // N+1, N+2
const PARK_Y = -110; // where the final "bank" dials are compared
const DIAL = 64;
const DEPTH = new Vector2(-30, -25);
const COG_R = 29;
const COG_SLOTS = [-330, -220, -110, 0, 110, 220, 330];
const STAGE = {scale: 1.12, x: 30}; // the whole machine, enlarged to fill the frame
const angleOf = (id: number) => embeddingAngle(id, 0);

interface Row {
  x: SimpleSignal<number, void>;
  dial: Dial;
}

// Link from an earlier row j into row i, arching out on the left of the
// column: thicker and brighter when the earlier word matters more.
function attentionLink(x: number, j: number, i: number, w: number, clock: SimpleSignal<number, void>) {
  const edge = DIAL / 2 + 4;
  const bulge = 30 + 22 * (i - j);
  const p0 = new Vector2(x - edge, ROWS_Y[j]);
  const p3 = new Vector2(x - edge, ROWS_Y[i]);
  const curve: Curve = {p0, p1: p0.addX(-bulge), p2: p3.addX(-bulge), p3};
  const line = (
    <CubicBezier
      {...curve}
      stroke={colors.attention}
      lineWidth={2 + 10 * w}
      opacity={0.3 + 0.7 * w}
      endArrow
      arrowSize={8 + 8 * w}
      end={0}
    />
  ) as CubicBezier;
  const dots = (
    <FlowDots curve={curve} clock={clock} color={'#ffffff'} width={4 + 6 * w} spacing={36} speed={110} opacity={0} />
  ) as Node;
  return {line, dots, w};
}
type Link = ReturnType<typeof attentionLink>;

export default makeScene2D(function* (view) {
  view.fill(colors.machineBg);
  const clock = createSignal(0);

  // --- Build the machine ---------------------------------------------------
  const label = makeLabel('Attention');
  label.position([30, -456]).opacity(0);
  const inputs = [RIVER, MONEY].map(s =>
    s.tokens.map((t, i) =>
      makeChip(t, colors.token, {
        position: [IN_X, ROWS_Y[i]],
        scale: FOLDED_SCALE,
        opacity: 0,
      }),
    ),
  );
  const spine = createRef<Rect>();
  const panel = createRef<Rect>();
  const arcLayer = createRef<Node>();
  const colAngle = LAYERS_X.map(() => createSignal(0));
  const cogs = LAYERS_X.map((x, l) =>
    COG_SLOTS.map(
      (y, j) =>
        (
          <Cog
            position={[x, y]}
            teeth={13}
            radius={COG_R}
            root={1 - 6 / COG_R}
            hole={0.22}
            fill={colors.cog}
            rotation={() => colAngle[l]() + j * 9}
            scale={0}
          />
        ) as Node,
    ),
  );
  const rows: Row[] = RIVER.ids.map(id => ({
    x: createSignal(ENTRY_X),
    dial: createDial(DIAL, 1, angleOf(id)),
  }));
  const rowNodes = rows.map((row, i) => {
    const dots = createDepthDots(DIAL, DEPTH, 1);
    return (
      <Node position={() => new Vector2(row.x(), ROWS_Y[i])} opacity={0}>
        {dots}
        {row.dial.node}
      </Node>
    ) as Node;
  });
  const outLayer = createRef<Node>();
  const message = createRef<Rect>();

  view.add(
    <>
      <Backdrop />
      <Node scale={STAGE.scale} x={STAGE.x}>
        <Rect
          ref={panel}
          x={10}
          width={480}
          height={780}
          radius={18}
          fill={'#2fbf6a1c'}
          stroke={'#3ddc6a66'}
          lineWidth={3}
          opacity={0}
        />
        <Rect ref={spine} x={SPINE_X} width={44} height={680} radius={22} fill={colors.embedding} opacity={0}>
          <Txt rotation={-90} fontFamily={font} fontSize={22} fontWeight={600} fill={colors.tokenText} text={'Embedding'} />
        </Rect>
        {cogs.flat()}
        <Node ref={arcLayer} />
        {rowNodes}
        {inputs.flat()}
        <Node ref={outLayer} />
      </Node>
      {label}
      <Takeaway
        ref={message}
        x={570}
        y={-310}
        lines={[[emphasis('Same token, same start')], [['the context changes where it points']]]}
      />
    </>,
  );
  yield clock(1000, 1000, linear);
  yield* fadeTransition(0.8);

  // --- Helpers ---------------------------------------------------------------

  function addLinks(l: number, s: Sentence, i: number): Link[] {
    const links = s.attention[i].map(([j, w]) => attentionLink(LAYERS_X[l], j, i, w, clock));
    links.forEach(k => arcLayer().add([k.line, k.dots]));
    return links;
  }

  // Rows enter layer column l; its gear train turns.
  function* enterLayer(l: number, duration: number) {
    yield* all(
      ...rows.map(r => r.x(LAYERS_X[l], duration, easeInOutCubic)),
      colAngle[l](colAngle[l]() + 60, duration, easeInOutCubic),
    );
  }

  // Row i looks back at the earlier rows, then its arrow is nudged.
  function* attend(l: number, s: Sentence, i: number, pace: number, keep?: Link[]): ThreadGenerator {
    const links = addLinks(l, s, i);
    keep?.push(...links);
    const dial = rows[i].dial;
    yield* all(
      dial.node.scale(1.18, 0.3 * pace),
      ...links.map(k => k.line.end(1, 0.5 * pace, easeInOutCubic)),
    );
    yield* all(...links.map(k => k.dots.opacity(0.3 + 0.7 * k.w, 0.2)), waitFor(0.6 * pace));
    yield* all(
      dial.arrow.rotation(dial.arrow.rotation() + s.nudges[l][i], 0.5 * pace, easeOutBack),
      dial.rim.rotation(dial.rim.rotation() - 60, 0.5 * pace),
      ...links.map(k => k.dots.opacity(0, 0.4 * pace)),
      dial.node.scale(1, 0.4 * pace),
    );
    yield* all(...links.map(k => k.line.opacity(0.14, 0.3 * pace)));
  }

  // All rows at once (what really happens), quickly.
  function* attendAll(l: number, s: Sentence, rowsToDo: number[], duration: number) {
    const links = rowsToDo.flatMap(i => addLinks(l, s, i));
    yield* all(...links.map(k => k.line.end(1, duration * 0.4, easeInOutCubic)));
    yield* all(
      ...rowsToDo.map(i => rows[i].dial.arrow.rotation(rows[i].dial.arrow.rotation() + s.nudges[l][i], duration * 0.4, easeOutBack)),
      ...links.map(k => k.dots.opacity(0.2 + 0.6 * k.w, duration * 0.2)),
    );
    yield* all(...links.map(k => all(k.line.opacity(0, duration * 0.2), k.dots.opacity(0, duration * 0.2))));
    arcLayer().removeChildren();
  }

  function* clearLinks(duration: number) {
    yield* all(...arcLayer().children().map(c => c.opacity(0, duration)));
    arcLayer().removeChildren();
  }

  // N+1 then N+2 out of the "bank" row, in the output column next to the
  // machine. Returns the arrow from the machine and the chips group (which
  // can later be moved aside).
  function* predict(s: Sentence, out: {arrow?: CubicBezier; group?: Node}) {
    const x = OUT_X[0];
    const from = new Vector2(LAYERS_X[1] + DIAL / 2 + 6, ROWS_Y[BANK]);
    const chips = s.next.map((t, n) =>
      makeChip(t, colors.botBubble, {position: [x, NEXT_Y[n]], scale: 0, opacity: 0}),
    );
    const to = new Vector2(x - 56, NEXT_Y[0]);
    const arrow = (
      <CubicBezier
        p0={from}
        p1={from.addX(120)}
        p2={to.addX(-120)}
        p3={to}
        stroke={colors.flowOut}
        lineWidth={4}
        endArrow
        arrowSize={12}
        end={0}
      />
    ) as CubicBezier;
    const loopBack = (
      <CubicBezier
        p0={[x + 58, NEXT_Y[0]]}
        p1={[x + 100, NEXT_Y[0]]}
        p2={[x + 100, NEXT_Y[1]]}
        p3={[x + 58, NEXT_Y[1]]}
        stroke={colors.flowOut}
        lineWidth={3}
        endArrow
        arrowSize={10}
        end={0}
        opacity={0.8}
      />
    ) as CubicBezier;
    const group = (<Node>{[loopBack, ...chips]}</Node>) as Node;
    outLayer().add([arrow, group]);
    out.arrow = arrow;
    out.group = group;
    yield* arrow.end(1, 0.8, easeInOutCubic);
    yield* all(chips[0].opacity(1, 0.3), chips[0].scale(FOLDED_SCALE, 0.5, easeOutBack));
    yield* waitFor(0.4);
    yield* loopBack.end(1, 0.5, easeInOutCubic);
    yield* all(chips[1].opacity(1, 0.3), chips[1].scale(FOLDED_SCALE, 0.5, easeOutBack));
  }

  // A copy of the current "bank" dial, set aside above the output column.
  function* park(s: Sentence, out: {node?: Node}) {
    const bank = rows[BANK].dial;
    const copy = createDial(DIAL, 1, bank.arrow.rotation());
    const node = (
      <Node position={[LAYERS_X[1], ROWS_Y[BANK]]}>
        {copy.node}
        <Txt y={62} fontFamily={font} fontSize={22} fontWeight={600} fill={colors.attention} text={`bank (${s.cue})`} opacity={0} />
      </Node>
    ) as Node;
    outLayer().add(node);
    out.node = node;
    yield* all(
      node.position([OUT_X[0], PARK_Y], 1.0, easeInOutCubic),
      node.scale(1.5, 1.0, easeInOutCubic),
    );
    yield* node.children()[1].opacity(1, 0.4);
  }

  // --- Phase 1: one sentence, attention explained ----------------------------

  yield* waitFor(0.3);
  yield* waitUntil('sentence');
  yield* sequence(0.08, ...inputs[0].map(c => c.opacity(1, 0.3)));
  yield* all(spine().opacity(1, 0.5), panel().opacity(1, 0.5), label.opacity(1, 0.6));
  yield* sequence(0.08, ...rowNodes.map(n => n.opacity(1, 0.3)));
  yield* sequence(0.05, ...cogs.flat().map(c => c.scale(1, 0.35, easeOutBack)));
  yield* waitFor(0.6);

  yield* waitUntil('layer-1');
  yield* enterLayer(0, 1.2);
  yield* waitFor(0.4);

  yield* waitUntil('look-back');
  const triangle: Link[] = [];
  for (let i = 1; i < RIVER.tokens.length; i++) {
    yield* attend(0, RIVER, i, i < 3 ? 1.6 : i === BANK ? 2 : 0.9, triangle);
  }
  yield* waitFor(0.6);

  // The triangle of links: every word looks back, never ahead -- and in
  // reality all of them at the same time.
  yield* waitUntil('all-at-once');
  yield* all(...triangle.map(k => k.line.opacity(0.3 + 0.7 * k.w, 0.4).to(0.14, 0.8)));
  yield* waitFor(0.4);
  yield* clearLinks(0.5);

  yield* waitUntil('layer-2');
  yield* enterLayer(1, 1.0);
  yield* attendAll(1, RIVER, range(1, 6), 2.0);

  yield* waitUntil('predict-1');
  const first: {arrow?: CubicBezier; group?: Node} = {};
  yield* predict(RIVER, first);
  yield* waitFor(0.5);

  // --- Phase 2: same machine, a second sentence ------------------------------

  // The first sentence and its predictions move aside (left and right) and
  // dim; the second sentence takes its place next to the machine.
  yield* waitUntil('side-input');
  const riverBank: {node?: Node} = {};
  yield* park(RIVER, riverBank);
  const aside = OUT_X[1] - OUT_X[0];
  yield* all(
    first.arrow!.opacity(0, 0.5),
    ...[first.group!, riverBank.node!].map(n => all(n.x(n.x() + aside, 1.0, easeInOutCubic), n.opacity(0.35, 1.0))),
    ...inputs[0].map(c => all(c.x(SIDE_IN_X, 1.0, easeInOutCubic), c.opacity(0.35, 1.0))),
  );
  yield* sequence(0.08, ...inputs[1].map(c => c.opacity(1, 0.3)));
  // Back to the entrance with the new words' dials; "bank" starts exactly as
  // before, since it is the same token.
  yield* all(
    ...rows.map(r => r.x(ENTRY_X, 1.2, easeInOutCubic)),
    ...rows.map((r, i) => r.dial.arrow.rotation(angleOf(MONEY.ids[i]) + 360, 1.2, easeOutCubic)),
  );
  yield* rows[BANK].dial.node.scale(1.25, 0.3).to(1, 0.3);
  yield* waitFor(0.5);

  yield* waitUntil('layer-1b');
  yield* enterLayer(0, 1.0);
  yield* attendAll(0, MONEY, range(1, BANK), 1.6);
  yield* attend(0, MONEY, BANK, 1.4);
  yield* clearLinks(0.4);

  yield* waitUntil('layer-2b');
  yield* enterLayer(1, 1.0);
  yield* attendAll(1, MONEY, range(1, 6), 1.6);

  yield* waitUntil('predict-2');
  yield* predict(MONEY, {});
  yield* waitFor(0.5);

  // --- Same word, different directions: both "bank" dials side by side -----
  yield* waitUntil('compare');
  yield* park(MONEY, {});
  yield* all(riverBank.node!.opacity(1, 0.5), settle(message()));
  yield* waitFor(1.5);
  yield* waitUntil('scene-end');
});

// Scene 9 — How to build it: training. A diagonal split screen.
// Left, "Traditional software": a program as a sequence of steps, each one
// set by hand. Row by row (step 1, 2, 3, 4), a person turns one notch with a
// wrench; then the panel stops and dims.
// Right, "Machine learning": the last two layers' cogs (what gets tuned), and
// a column of dials (what merely carries the cogs' effect). The example's
// dials flow through both layers and the machine predicts "house"; the truth
// is "coat". The mismatch fills an error gauge, which sends a signal back:
// each notch turns as the signal reaches it (layer N, then layer N-1), by an
// amount that follows the error. The example runs again, the error shrinks,
// and after two rounds the prediction is right. The data sets the knobs.
import {Circle, CubicBezier, Line, makeScene2D, Node, Path, Rect, Txt} from '@motion-canvas/2d';
import {
  all,
  cancel,
  chain,
  createRef,
  createSignal,
  delay,
  easeInOutCubic,
  easeOutBack,
  linear,
  Vector2,
  waitFor,
  waitUntil,
} from '@motion-canvas/core';
import {createTunableCog, driveCogs, TunableCog, turnNotch} from '../components/Cog';
import {colors, font} from '../theme';
import {createDial} from '../scene4/Compass';
import {TOKENS} from '../scene4/layout';
import {makeChip} from '../scene4/parts';

// --- Split screen ---------------------------------------------------------------

const DIV_TOP_X = -250;
const DIV_BOTTOM_X = -430;
const ERROR = colors.error;
const GOOD = colors.good;

// --- Left: tuned by hand, step by step ----------------------------------------

const L_COLS = [-680, -570, -460];
const L_ROWS = [-250, -140, -30, 80]; // one row per step
const L_R = 44;
const STEP_X = -810;
const STEP_COLORS = ['#5b8ae0', '#3fb0a6', '#d9a441', '#a07ad6'];
const BODY_Y = 430; // torso center; head and shoulder follow its x (`stand`)
const HEAD = new Vector2(-10, -232);
const SHOULDER = new Vector2(80, -150); // right shoulder, clear of the head
const UPPER = 185; // arm segment lengths
const FORE = 185;
const WRENCH = 170; // from the cog's hub to the hand
// One notch per step, row by row: [column, row, notch change, where the
// person stands].
const VISITS: [number, number, number, number][] = [
  [0, 0, 60, -775], [1, 1, -55, -700], [2, 2, 65, -700], [2, 3, -50, -820],
];

// Open-end wrench head around the hub, its jaws opening away from the handle
// (handle along +x).
const JAW = 38;
const SLOT = 21;
const MOUTH = Math.sqrt(JAW * JAW - SLOT * SLOT);
const WRENCH_HEAD =
  `M ${-MOUTH} ${-SLOT} A ${JAW} ${JAW} 0 1 1 ${-MOUTH} ${SLOT} ` +
  `L 0 ${SLOT} A ${SLOT} ${SLOT} 0 0 0 0 ${-SLOT} Z`;

// Elbow position for a two-segment arm reaching from `shoulder` to `hand`,
// bent downward.
function elbow(shoulder: Vector2, hand: Vector2) {
  const v = hand.sub(shoulder);
  const d = Math.max(1, Math.min(v.magnitude, UPPER + FORE - 1));
  const cos = (UPPER * UPPER + d * d - FORE * FORE) / (2 * UPPER * d);
  const bend = Math.acos(Math.max(-1, Math.min(1, cos)));
  const base = Math.atan2(v.y, v.x);
  const [a, b] = [base + bend, base - bend].map(t =>
    shoulder.add(new Vector2(Math.cos(t), Math.sin(t)).scale(UPPER)),
  );
  return a.y > b.y ? a : b;
}

// --- Right: tuned by the data -------------------------------------------------

const X = {in: -170, n1: 30, n: 190, out: 350}; // input dials, layer N-1, layer N, output
const ROWS = [-240, -144, -48, 48, 144, 240]; // the dials, one per token row
const COG_ROWS = [-192, -96, 0, 96, 192]; // the cogs, between the rows
const R_R = 28;
const DIAL = 40;
const IN_ANGLES = ROWS.map((_, k) => (k * 71) % 360);
const PRED = new Vector2(550, -60);
const TRUTH = new Vector2(550, 100);
const BOX = {w: 180, h: 62};
const BRACKET_X = PRED.x + BOX.w / 2 + 30;
const BADGE = new Vector2(BRACKET_X, (PRED.y + TRUTH.y) / 2);
const GAUGE = new Vector2(770, BADGE.y);
const GAUGE_H = 160;
const GAUGE_W = 18;
const EXAMPLE_Y = -330;
const ERRORS: Record<string, number> = {house: 0.9, hat: 0.55, coat: 0.06};
// How each notch reacts to the error (scaled by the error's size).
const PULL = {
  n: [-65, 60, -55, 70, 60],
  n1: [70, 60, -65, 60, -55],
};

export default makeScene2D(function* (view) {
  view.fill(colors.machineBg);

  // --- Left panel -----------------------------------------------------------
  const left = createRef<Node>();
  const leftCogs: TunableCog[][] = L_COLS.map((x, i) =>
    L_ROWS.map((y, j) => {
      const c = createTunableCog(L_R, {position: [x, y]});
      c.knob(((i * 4 + j) * 67) % 150 - 75);
      return c;
    }),
  );
  const stepLabels = L_ROWS.map(() => createRef<Txt>());
  const stepArrows = L_ROWS.slice(1).map(() => createRef<Line>());
  const cogAt = (i: number, j: number) => new Vector2(L_COLS[i], L_ROWS[j]);
  const target = createSignal(cogAt(1, 2)); // the cog in hand
  const stand = createSignal(-700); // the person's x
  const body = () => new Vector2(stand(), BODY_Y);
  const shoulder = () => body().add(SHOULDER);
  const twist = createSignal(0);
  // The hand holds the wrench's handle; the wrench's jaws sit on the hub.
  const handleAngle = () => Math.atan2(shoulder().y - target().y, shoulder().x - target().x) * (180 / Math.PI) + twist();
  const hand = () => target().add(Vector2.fromDegrees(handleAngle()).scale(WRENCH));
  const rim = {stroke: colors.rimLight, lineWidth: 46, lineCap: 'round' as const, lineJoin: 'round' as const};
  const limb = {stroke: colors.silhouette, lineWidth: 34, lineCap: 'round' as const, lineJoin: 'round' as const};

  // --- Right panel ------------------------------------------------------------
  const head = createRef<Node>();
  const layers = createRef<Node>();
  const dialGroup = createRef<Node>();
  const output = createRef<Node>();
  const verdictGroup = createRef<Node>();
  const layerN1 = COG_ROWS.map(y => createTunableCog(R_R, {position: [X.n1, y]}));
  const layerN = COG_ROWS.map(y => createTunableCog(R_R, {position: [X.n, y]}));
  [...layerN1, ...layerN].forEach((c, k) => c.knob(((k * 53) % 140) - 70));
  const dials = ROWS.map((_, k) => createDial(DIAL, 1, IN_ANGLES[k]));
  const dialSlots = ROWS.map(() => createRef<Node>());
  const arrow = createRef<CubicBezier>();
  const predBox = createRef<Rect>();
  const prediction = createRef<Txt>();
  const badge = createRef<Circle>();
  const badgeMark = createRef<Txt>();
  const bracket = createRef<Line>();
  const link = createRef<Line>();
  const gauge = createRef<Node>();
  const gaugeFill = createRef<Rect>();
  const error = createSignal(0);
  const traces = createRef<Node>();
  const waves = createRef<Node>();
  const backprop = createRef<Node>();
  const smallTxt = {fontFamily: font, fontSize: 24, fill: colors.label};

  view.add(
    <>
      <Line
        points={[[-960, -540], [DIV_TOP_X, -540], [DIV_BOTTOM_X, 540], [-960, 540]]}
        closed
        fill={'#11141b'}
      />
      <Line points={[[DIV_TOP_X, -540], [DIV_BOTTOM_X, 540]]} stroke={colors.divider} lineWidth={6} />

      {/* Left: traditional software */}
      <Node ref={left} opacity={0}>
        <Txt x={-640} y={-455} fontFamily={font} fontSize={46} fontWeight={600} fill={colors.textLight} text={'Traditional software'} />
        <Txt x={-640} y={-405} fontFamily={font} fontSize={28} fontStyle={'italic'} fill={colors.textMuted} text={'specified by hand'} />
        {L_ROWS.map((y, j) => (
          <Txt ref={stepLabels[j]} x={STEP_X} y={y} fontFamily={font} fontSize={28} fontWeight={600} fill={STEP_COLORS[j]} text={`step ${j + 1}`} opacity={0} />
        ))}
        {stepArrows.map((ref, j) => (
          <Line ref={ref} points={[[STEP_X, L_ROWS[j] + 22], [STEP_X, L_ROWS[j + 1] - 22]]} stroke={colors.textMuted} lineWidth={2} endArrow arrowSize={8} opacity={0} />
        ))}
        {leftCogs.flat().map(c => c.node)}
        {/* The person, seen from behind (3/4), wrench in hand */}
        <Rect position={body} width={190} height={320} radius={[80, 80, 20, 20]} rotation={-8} fill={colors.silhouette} stroke={colors.rimLight} lineWidth={6} />
        <Circle position={() => body().add(HEAD)} size={108} fill={colors.silhouette} stroke={colors.rimLight} lineWidth={6} />
        <Line points={() => [shoulder(), elbow(shoulder(), hand()), hand()]} {...rim} />
        <Line points={() => [shoulder(), elbow(shoulder(), hand()), hand()]} {...limb} />
        <Node position={target} rotation={handleAngle}>
          <Rect x={(JAW - 6 + WRENCH + 12) / 2} width={WRENCH + 18 - JAW} height={18} radius={9} fill={colors.steel} />
          <Path data={WRENCH_HEAD} fill={colors.steel} stroke={colors.steelDark} lineWidth={2} />
        </Node>
        <Circle position={hand} size={40} fill={colors.silhouette} stroke={colors.rimLight} lineWidth={5} />
      </Node>

      {/* Right: machine learning */}
      <Node ref={head} opacity={0}>
        <Txt x={330} y={-455} fontFamily={font} fontSize={46} fontWeight={600} fill={colors.textLight} text={'Machine learning'} />
        <Txt x={330} y={-405} fontFamily={font} fontSize={28} fontStyle={'italic'} fill={colors.textMuted} text={'data is the code (the program)'} />
        <Rect layout alignItems={'center'} gap={12} x={330} y={EXAMPLE_Y} scale={0.6} opacity={0.6}>
          <Txt fontFamily={font} fontSize={40} fontWeight={600} fill={colors.label} text={'example:'} marginRight={10} />
          {TOKENS.map(t => makeChip(t, colors.token, {width: null, padding: [0, 20]}))}
          {makeChip('coat', colors.botBubble, {width: null, padding: [0, 20]})}
        </Rect>
      </Node>
      {/* The last two layers, scaled up to fill the panel */}
      <Node position={[-30, 40]} scale={1.2}>
        <Node ref={layers} opacity={0}>
          {layerN1.map(c => c.node)}
          {layerN.map(c => c.node)}
          <Txt {...smallTxt} x={X.n1} y={285} text={'layer N−1'} />
          <Txt {...smallTxt} x={X.n} y={285} text={'layer N'} />
        </Node>
        <Node ref={output} opacity={0}>
          <CubicBezier
            ref={arrow}
            p0={[X.out + DIAL / 2 + 8, 0]}
            p1={[X.out + 80, 0]}
            p2={[PRED.x - BOX.w / 2 - 60, PRED.y]}
            p3={[PRED.x - BOX.w / 2 - 6, PRED.y]}
            stroke={colors.flowOut}
            lineWidth={3}
            endArrow
            arrowSize={10}
            end={0}
          />
          <Txt {...smallTxt} position={PRED.addY(-BOX.h / 2 - 22)} text={'prediction'} />
          <Rect ref={predBox} position={PRED} width={BOX.w} height={BOX.h} radius={14} stroke={colors.botBubble} lineWidth={3} lineDash={[10, 8]}>
            <Txt ref={prediction} fontFamily={font} fontSize={34} fill={colors.tokenText} text={'house'} opacity={0} />
          </Rect>
        </Node>
        <Node ref={dialGroup} opacity={0}>
          {dials.map((d, k) => <Node ref={dialSlots[k]} position={[X.in, ROWS[k]]}>{d.node}</Node>)}
        </Node>
        <Node ref={verdictGroup} opacity={0}>
          <Txt {...smallTxt} position={TRUTH.addY(-BOX.h / 2 - 22)} text={'truth'} />
          <Rect position={TRUTH} width={BOX.w} height={BOX.h} radius={14} stroke={colors.botBubble} lineWidth={3}>
            <Txt fontFamily={font} fontSize={34} fill={colors.botBubble} text={'coat'} />
          </Rect>
          <Line
            ref={bracket}
            points={[
              [PRED.x + BOX.w / 2 + 6, PRED.y],
              [BRACKET_X, PRED.y],
              [BRACKET_X, TRUTH.y],
              [TRUTH.x + BOX.w / 2 + 6, TRUTH.y],
            ]}
            stroke={ERROR}
            lineWidth={4}
          />
          <Line ref={link} points={[BADGE.addX(30), GAUGE.addX(-GAUGE_W / 2 - 10)]} stroke={ERROR} lineWidth={3} endArrow arrowSize={9} />
          <Circle ref={badge} position={BADGE} size={52} fill={ERROR}>
            <Txt ref={badgeMark} fontFamily={font} fontSize={34} fontWeight={600} fill={'#ffffff'} text={'✗'} />
          </Circle>
          <Node ref={gauge} position={GAUGE}>
            <Txt {...smallTxt} y={-GAUGE_H / 2 - 24} text={'error'} />
            <Rect width={GAUGE_W} height={GAUGE_H} radius={GAUGE_W / 2} fill={'#1d222c'} stroke={colors.divider} lineWidth={2} />
            <Rect
              ref={gaugeFill}
              y={GAUGE_H / 2}
              offset={[0, 1]}
              width={GAUGE_W}
              height={() => GAUGE_H * error()}
              radius={GAUGE_W / 2}
              fill={ERROR}
            />
          </Node>
        </Node>
        <Node ref={traces} />
        <Node ref={waves} />
      </Node>
      <Node ref={backprop} opacity={0}>
        <Txt x={300} y={440} fontFamily={font} fontSize={32} fill={colors.textLight} text={'backpropagation: correcting the error, layer by layer'} />
        <Txt x={300} y={484} fontFamily={font} fontSize={24} fill={colors.textMuted} text={'(with automatic differentiation)'} />
      </Node>
    </>,
  );

  // Every cog turns at the speed its notch sets. The left panel's cogs stop
  // when it dims.
  const leftDrive = driveCogs(leftCogs.flat());
  yield leftDrive;
  yield driveCogs([...layerN1, ...layerN]);

  // --- Helpers -------------------------------------------------------------------

  // The dials flow through layer N-1 then layer N, meshing with each layer's
  // cogs: each dial's arrow is nudged by the notches of the cogs on either
  // side of it. Then on to the output, and the prediction.
  function* flow(pace: number) {
    const hop = (x: number, duration: number) =>
      all(
        ...dialSlots.map(s => s().x(x, duration, easeInOutCubic)),
        ...dials.map(d => d.rim.rotation(d.rim.rotation() + 120, duration, easeInOutCubic)),
      );
    const nudge = (cogs: TunableCog[], k: number) => ((cogs[k - 1]?.knob() ?? 0) + (cogs[k]?.knob() ?? 0)) * 0.7;
    for (const [x, cogs] of [[X.n1, layerN1], [X.n, layerN]] as const) {
      yield* hop(x, 0.7 * pace);
      yield* all(...dials.map((d, k) => d.arrow.rotation(d.arrow.rotation() + nudge(cogs, k), 0.4 * pace, easeOutBack)));
    }
    yield* hop(X.out, 0.6 * pace);
    yield* arrow().end(1, 0.4 * pace);
  }

  // The example enters again: the dials go back to the input, as they were.
  function* rerun() {
    yield* all(dialGroup().opacity(0, 0.2), arrow().opacity(0, 0.2));
    dialSlots.forEach(s => s().x(X.in));
    dials.forEach((d, k) => d.arrow.rotation(IN_ANGLES[k]));
    arrow().end(0).opacity(1);
    yield* dialGroup().opacity(1, 0.3);
  }

  // The error gauge sends a signal back. Its strength follows the error; each
  // notch turns as the signal reaches it (layer N first, then layer N-1), by
  // an amount that follows the error too.
  function* signalBack(pace: number) {
    const err = error();
    const front = createSignal(40);
    const fade = createSignal(0);
    const reach = 820;
    const travel = 2.4 * pace;
    const arcs = [0, 1, 2].map(
      i =>
        (
          <Circle
            position={GAUGE}
            size={() => Math.max(0, front() - i * 36) * 2}
            startAngle={145}
            endAngle={215}
            stroke={ERROR}
            lineWidth={2 + 7 * err}
            lineCap={'round'}
            opacity={() => fade() * (1 - i * 0.3)}
          />
        ) as Circle,
    );
    waves().add(arcs);
    const turns = [
      ...layerN.map((c, k) => [c, PULL.n[k]] as const),
      ...layerN1.map((c, k) => [c, PULL.n1[k]] as const),
    ].map(([c, pull]) => {
      const d = c.node.position().sub(GAUGE).magnitude - R_R;
      return delay(((d - 40) / (reach - 40)) * travel, turnNotch(c, pull * err, 0.7 * pace, traces()));
    });
    yield* all(
      gauge().scale(1.15, 0.15).to(1, 0.25),
      front(reach, travel, linear),
      chain(fade(1, 0.2), waitFor(travel - 0.5), fade(0, 0.3)),
      ...turns,
    );
    arcs.forEach(a => a.remove());
  }

  function* verdict(word: string, right: boolean) {
    const color = right ? GOOD : ERROR;
    yield* all(prediction().opacity(0, 0.15), badge().scale(0.6, 0.15));
    prediction().text(word);
    badgeMark().text(right ? '✓' : '✗');
    yield* all(
      prediction().opacity(1, 0.25),
      badge().fill(color, 0.25),
      badge().scale(1, 0.4, easeOutBack),
      bracket().stroke(color, 0.25),
      link().stroke(color, 0.25),
      error(ERRORS[word], 0.6, easeInOutCubic),
      gaugeFill().fill(color, 0.6),
    );
  }

  // One round of learning: the error tunes layer N then N-1, the example
  // runs again, and the new prediction is checked.
  function* round(word: string, right: boolean, pace: number) {
    yield* signalBack(pace);
    yield* rerun();
    yield* flow(pace);
    yield* verdict(word, right);
  }

  // --- Left: step by step, by hand ---------------------------------------------
  yield* waitFor(0.4);
  yield* waitUntil('by-hand');
  yield* left().opacity(1, 0.8);
  yield* waitFor(0.6);
  for (const [i, j, delta, x] of VISITS) {
    const cog = leftCogs[i][j];
    yield* all(
      stepLabels[j]().opacity(1, 0.4),
      ...(j > 0 ? [stepArrows[j - 1]().opacity(1, 0.4)] : []),
      ...leftCogs.map(col => col[j].body.fill(STEP_COLORS[j], 0.5)),
      target(cogAt(i, j), 0.8, easeInOutCubic),
      stand(x, 0.8, easeInOutCubic),
    );
    yield* all(twist(delta * 0.5, 0.9, easeInOutCubic), cog.knob(cog.knob() + delta, 0.9, easeInOutCubic));
    yield* twist(0, 0.3);
    yield* waitFor(0.4);
  }
  yield* waitFor(0.6);

  // --- Right: the last two layers, and an example ---------------------------------
  yield* waitUntil('learning');
  cancel(leftDrive);
  yield* all(left().opacity(0.4, 0.8), head().opacity(1, 0.8));
  yield* waitFor(0.4);
  yield* layers().opacity(1, 0.8);
  yield* waitFor(0.8);
  yield* all(dialGroup().opacity(1, 0.5), output().opacity(1, 0.5));
  yield* waitFor(0.6);

  yield* waitUntil('predict');
  yield* flow(1);
  yield* all(predBox().fill(colors.botBubble, 0.4), predBox().lineWidth(0, 0.4), prediction().opacity(1, 0.4));
  yield* waitFor(0.6);
  yield* verdictGroup().opacity(1, 0.6);
  yield* error(ERRORS.house, 0.8, easeInOutCubic);
  yield* waitFor(1);

  // --- Round 1: "house" is wrong; the error tunes the last layers ------------------
  yield* waitUntil('backprop');
  yield* backprop().opacity(1, 0.6);
  yield* round('hat', false, 1);
  yield* waitFor(1);

  // --- Round 2, faster: a smaller error, smaller turns, and "coat" is right ----------
  yield* waitUntil('round-2');
  yield* round('coat', true, 0.6);
  yield* waitFor(3);
});

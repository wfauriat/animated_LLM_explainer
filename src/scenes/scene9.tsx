// Scene 9 — How to build it: training. A diagonal split screen.
// Left, "Traditional software": a person tunes the cogs' notches by hand, one
// at a time. Right, "Machine learning": the machine predicted "house" for an
// example whose true next word is "coat". The error sends tuning signals
// back, to layer N then layer N-1 (backpropagation): the notches adjust
// themselves, the dials are nudged, and after two rounds the prediction is
// right. The data, not a person, sets the knobs.
import {Circle, CubicBezier, Line, makeScene2D, Node, Rect, Txt} from '@motion-canvas/2d';
import {
  all,
  createRef,
  createSignal,
  easeInOutCubic,
  easeOutBack,
  loop,
  sequence,
  Vector2,
  waitFor,
  waitUntil,
} from '@motion-canvas/core';
import {createTunableCog, driveCogs, TunableCog} from '../components/Cog';
import {colors, font} from '../theme';
import {createDial, Dial} from '../scene4/Compass';
import {TOKENS} from '../scene4/layout';
import {makeChip} from '../scene4/parts';

// --- Split screen ---------------------------------------------------------------

const DIV_TOP_X = -250;
const DIV_BOTTOM_X = -430;
const dividerX = (y: number) => DIV_TOP_X + ((DIV_BOTTOM_X - DIV_TOP_X) * (y + 540)) / 1080;
const ERROR = '#ff6b6b';
const GOOD = '#5fd47a';

// --- Left: tuned by hand ------------------------------------------------------

const L_COLS = [-700, -590, -480];
const L_ROWS = [-280, -170, -60, 50];
const L_R = 44;
const BODY = new Vector2(-845, 470); // torso center; head and shoulder follow
const HEAD = BODY.add([-10, -232]);
const SHOULDER = BODY.add([15, -170]);
const UPPER = 170; // arm segment lengths
const FORE = 170;
const WRENCH = 170; // from the cog's hub to the hand
// The cogs within comfortable reach, in the order they get tuned.
const VISITS: [number, number, number][] = [
  [1, 2, -60], [2, 3, 70], [0, 1, -45], [1, 3, 55], [2, 2, -70], [0, 2, 50],
]; // [column, row, notch change]

// Elbow position for a two-segment arm reaching from the shoulder to `hand`,
// bent downward.
function elbow(hand: Vector2) {
  const v = hand.sub(SHOULDER);
  const d = Math.max(1, Math.min(v.magnitude, UPPER + FORE - 1));
  const cos = (UPPER * UPPER + d * d - FORE * FORE) / (2 * UPPER * d);
  const bend = Math.acos(Math.max(-1, Math.min(1, cos)));
  const base = Math.atan2(v.y, v.x);
  const [a, b] = [base + bend, base - bend].map(t =>
    SHOULDER.add(new Vector2(Math.cos(t), Math.sin(t)).scale(UPPER)),
  );
  return a.y > b.y ? a : b;
}

// --- Right: tuned by the data -------------------------------------------------

const X = {n1: -40, mid: 80, n: 200, out: 320}; // layer N-1, dials, layer N, dials
const ROWS = [-190, -114, -38, 38, 114, 190];
const R_R = 30;
const DIAL = 44;
const PRED = new Vector2(540, -40);
const TRUTH = new Vector2(540, 120);
const BOX = {w: 180, h: 62};
const BRACKET_X = PRED.x + BOX.w / 2 + 40;
const BADGE = new Vector2(BRACKET_X, (PRED.y + TRUTH.y) / 2);
const EXAMPLE_Y = -330;

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
  const cogAt = (i: number, j: number) => new Vector2(L_COLS[i], L_ROWS[j]);
  const target = createSignal(cogAt(VISITS[0][0], VISITS[0][1])); // the cog in hand
  const twist = createSignal(0);
  // The hand holds the wrench's handle; the wrench's ring sits on the hub.
  const handleAngle = () => Math.atan2(SHOULDER.y - target().y, SHOULDER.x - target().x) * (180 / Math.PI) + twist();
  const hand = () => target().add(Vector2.fromDegrees(handleAngle()).scale(WRENCH));
  const rim = {stroke: colors.rimLight, lineWidth: 46, lineCap: 'round' as const, lineJoin: 'round' as const};
  const limb = {stroke: colors.silhouette, lineWidth: 34, lineCap: 'round' as const, lineJoin: 'round' as const};

  // --- Right panel ------------------------------------------------------------
  const right = createRef<Node>();
  const layerN1 = ROWS.map(y => createTunableCog(R_R, {position: [X.n1, y]}));
  const layerN = ROWS.map(y => createTunableCog(R_R, {position: [X.n, y]}));
  [...layerN1, ...layerN].forEach((c, k) => c.knob(((k * 53) % 140) - 70));
  const dialsMid: Dial[] = ROWS.map((_, k) => createDial(DIAL, 1, (k * 71) % 360));
  const dialsOut: Dial[] = ROWS.map((_, k) => createDial(DIAL, 1, (k * 97 + 40) % 360));
  const prediction = createRef<Txt>();
  const badge = createRef<Circle>();
  const badgeMark = createRef<Txt>();
  const bracket = createRef<Line>();
  const waves = createRef<Node>();
  const backprop = createRef<Node>();
  const example = createRef<Rect>();
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
        <Txt x={-640} y={-405} fontFamily={font} fontSize={28} fontStyle={'italic'} fill={colors.textMuted} text={'set by hand'} />
        {leftCogs.flat().map(c => c.node)}
        {/* The person, seen from behind (3/4), wrench in hand */}
        <Rect position={BODY} width={190} height={320} radius={[80, 80, 20, 20]} rotation={-8} fill={colors.silhouette} stroke={colors.rimLight} lineWidth={6} />
        <Circle position={HEAD} size={108} fill={colors.silhouette} stroke={colors.rimLight} lineWidth={6} />
        <Line points={() => [SHOULDER, elbow(hand()), hand()]} {...rim} />
        <Line points={() => [SHOULDER, elbow(hand()), hand()]} {...limb} />
        <Node position={target} rotation={handleAngle}>
          <Rect x={WRENCH / 2 + 10} width={WRENCH - 10} height={18} radius={9} fill={colors.steel} />
          <Circle size={56} stroke={colors.steel} lineWidth={11} />
        </Node>
        <Circle position={hand} size={40} fill={colors.silhouette} stroke={colors.rimLight} lineWidth={5} />
      </Node>

      {/* Right: machine learning */}
      <Node ref={right} opacity={0}>
        <Txt x={330} y={-455} fontFamily={font} fontSize={46} fontWeight={600} fill={colors.textLight} text={'Machine learning'} />
        <Txt x={330} y={-405} fontFamily={font} fontSize={28} fontStyle={'italic'} fill={colors.textMuted} text={'data is the code'} />
        <Rect ref={example} layout alignItems={'center'} gap={8} x={300} y={EXAMPLE_Y} scale={0.5}>
          <Txt fontFamily={font} fontSize={40} fontWeight={600} fill={colors.label} text={'example:'} marginRight={10} />
          {TOKENS.map(t => makeChip(t, colors.token, {width: null, padding: [0, 16]}))}
          {makeChip('coat', colors.botBubble, {width: null, padding: [0, 16]})}
        </Rect>
        {layerN1.map(c => c.node)}
        {dialsMid.map((d, k) => <Node position={[X.mid, ROWS[k]]}>{d.node}</Node>)}
        {layerN.map(c => c.node)}
        {dialsOut.map((d, k) => <Node position={[X.out, ROWS[k]]}>{d.node}</Node>)}
        <Txt {...smallTxt} x={X.n1} y={250} text={'layer N−1'} />
        <Txt {...smallTxt} x={X.n} y={250} text={'layer N'} />
        <CubicBezier
          p0={[X.out + DIAL / 2 + 8, 0]}
          p1={[X.out + 80, 0]}
          p2={[PRED.x - BOX.w / 2 - 70, PRED.y]}
          p3={[PRED.x - BOX.w / 2 - 6, PRED.y]}
          stroke={colors.flowOut}
          lineWidth={3}
          endArrow
          arrowSize={10}
        />
        <Txt {...smallTxt} position={PRED.addY(-BOX.h / 2 - 22)} text={'prediction'} />
        <Rect position={PRED} width={BOX.w} height={BOX.h} radius={14} fill={colors.botBubble}>
          <Txt ref={prediction} fontFamily={font} fontSize={34} fill={colors.tokenText} text={'house'} />
        </Rect>
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
        <Circle ref={badge} position={BADGE} size={52} fill={ERROR}>
          <Txt ref={badgeMark} fontFamily={font} fontSize={34} fontWeight={600} fill={'#ffffff'} text={'✗'} />
        </Circle>
        <Node ref={waves} />
        <Node ref={backprop} opacity={0}>
          <Txt x={160} y={330} fontFamily={font} fontSize={32} fill={colors.textLight} text={'backpropagation: correcting the error, layer by layer'} />
          <Txt x={160} y={374} fontFamily={font} fontSize={24} fill={colors.textMuted} text={'(automatic differentiation)'} />
        </Node>
      </Node>
    </>,
  );

  // Every cog turns at the speed its notch sets.
  yield driveCogs([...leftCogs.flat(), ...layerN1, ...layerN]);

  // --- Helpers -------------------------------------------------------------------

  // The person goes from cog to cog, turning each notch with the wrench.
  function* tuneByHand() {
    let k = 0;
    yield* loop(function* () {
      const [i, j, delta] = VISITS[k++ % VISITS.length];
      const cog = leftCogs[i][j];
      yield* target(cogAt(i, j), 0.8, easeInOutCubic);
      yield* all(twist(-30, 0.9, easeInOutCubic), cog.knob(cog.knob() + delta, 0.9, easeInOutCubic));
      yield* twist(0, 0.3);
      yield* waitFor(0.3);
    });
  }

  // A tuning signal: three arcs spreading left from `from` until `toX`.
  function* ripple(from: Vector2, toX: number, duration: number) {
    const reach = from.x - toX;
    const arcs = [0, 1, 2].map(
      () =>
        (
          <Circle position={from} size={20} startAngle={140} endAngle={220} stroke={ERROR} lineWidth={6} lineCap={'round'} opacity={0} />
        ) as Circle,
    );
    waves().add(arcs);
    yield* sequence(
      duration * 0.15,
      ...arcs.map(a =>
        all(
          a.size(reach * 2, duration * 0.7, easeInOutCubic),
          a.opacity(1, duration * 0.15).to(1, duration * 0.35).to(0, duration * 0.2),
        ),
      ),
    );
    arcs.forEach(a => a.remove());
  }

  // A layer adjusts its own notches, and the dials it drives are nudged.
  function* adjust(cogs: TunableCog[], dials: Dial[], deltas: number[], duration: number) {
    yield* all(
      ...cogs.map((c, k) => c.knob(Math.max(-90, Math.min(90, c.knob() + deltas[k])), duration, easeInOutCubic)),
      ...dials.map((d, k) => d.arrow.rotation(d.arrow.rotation() + deltas[k] * 0.4, duration, easeOutBack)),
    );
  }

  // The example runs through again: the columns light up left to right.
  function* forward(duration: number) {
    const columns = [layerN1.map(c => c.node), dialsMid.map(d => d.node), layerN.map(c => c.node), dialsOut.map(d => d.node)];
    yield* sequence(
      duration / 6,
      ...columns.map(col => all(...col.map(n => n.scale(1.15, duration / 6).to(1, duration / 4)))),
    );
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
    );
  }

  // One round of learning: from the error back to layer N, then N-1, then a
  // new prediction.
  function* round(word: string, right: boolean, pace: number, deltas: number[][]) {
    yield* ripple(new Vector2(PRED.x - BOX.w / 2 - 20, 0), X.n - R_R - 10, 1.2 * pace);
    yield* adjust(layerN, dialsOut, deltas[0], 0.8 * pace);
    yield* ripple(new Vector2(X.n - R_R - 10, 0), X.n1 - R_R - 10, 1.0 * pace);
    yield* adjust(layerN1, dialsMid, deltas[1], 0.8 * pace);
    yield* forward(0.9 * pace);
    yield* verdict(word, right);
  }

  // --- The two ways ----------------------------------------------------------------
  yield* waitFor(0.4);
  yield* waitUntil('by-hand');
  yield* left().opacity(1, 0.8);
  yield tuneByHand();
  yield* waitFor(3);

  yield* waitUntil('learning');
  yield* right().opacity(1, 0.8);
  yield* waitFor(2);

  // --- Round 1: "house" is wrong; correct the last layers -----------------------
  yield* waitUntil('backprop');
  yield* backprop().opacity(1, 0.6);
  yield* round('hat', false, 1, [
    [40, -35, 25, -50, 30, -20],
    [-30, 45, -20, 35, -40, 25],
  ]);
  yield* waitFor(1);

  // --- Round 2, faster: "coat" is right ---------------------------------------------
  yield* waitUntil('round-2');
  yield* round('coat', true, 0.6, [
    [-15, 20, -10, 25, -15, 10],
    [12, -18, 10, -15, 20, -10],
  ]);
  yield* waitFor(3);
});

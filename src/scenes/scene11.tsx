// Scene 11 — From cogs to numbers, on silicon.
// 11a: the machine of Scene 4 (token rows, dial stacks, columns of cogs). An
//   X-ray line sweeps across it: each dial becomes one number (a token's
//   stack, a vector), each layer's cogs become grids of numbers (matrices:
//   attention and feed-forward), each notch one cell.
// 11b: what a layer mostly does: multiply and add. A 4 x 4 weight matrix
//   times the vector of "It", one row at a time with real arithmetic, then
//   all rows at once.
// 11c: where it happens: the numbers machine above, a GPU below. For each
//   layer, its weights stream from memory into the cores, and the tensor (the
//   numbers being worked on) rolls over to new values.
// 11d: why it matters: the scale only works at the speed of silicon.
import {Circle, Line, makeScene2D, Node, Rect, Txt} from '@motion-canvas/2d';
import {
  all,
  chain,
  createRef,
  createSignal,
  easeInOutCubic,
  easeOutCubic,
  linear,
  makeRef,
  range,
  sequence,
  Vector2,
  waitFor,
  waitUntil,
} from '@motion-canvas/core';
import {createTunableCog, driveCogs} from '../components/Cog';
import {Words} from '../components/Words';
import {colors, font} from '../theme';
import {createCompassStack} from '../scene4/Compass';
import {embeddingAngle, IDS, TOKENS} from '../scene4/layout';
import {makeChip} from '../scene4/parts';

// --- Numbers and their colors ---------------------------------------------------

const NEG = '#5b8ae0';
const POS = '#e8955a';
const ZERO = '#343b49';
const amber = colors.energy;

function mix(a: string, b: string, t: number) {
  const ch = (h: string, i: number) => parseInt(h.slice(1 + 2 * i, 3 + 2 * i), 16);
  const c = (i: number) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * Math.min(1, t));
  return '#' + [0, 1, 2].map(i => c(i).toString(16).padStart(2, '0')).join('');
}
const heat = (v: number) => (v < 0 ? mix(ZERO, NEG, -v) : mix(ZERO, POS, v));
const round1 = (v: number) => Math.round(v * 10) / 10;
const fmt = (v: number, digits = 1) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(digits);
// Deterministic pseudo-random value in [-1, 1].
function rnd(a: number, b: number, c = 0) {
  const s = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

// --- 11a: the machine, as in Scene 4 ---------------------------------------------

const ROW_TOKENS = [0, 1, 8, 9]; // It, was, took, a
const ROWS_Y = [-220, -100, 100, 220];
const TOKEN_X = -830;
const EMBED_X = -730;
const VEC_X = -520; // the token vectors: dial stacks, then numbers
const DIMS = 4;
const LAYERS = [
  {x: -170, label: 'layer 1'},
  {x: 40, label: 'layer 2'},
  {x: 380, label: 'layer N'},
];
const MORE_X = 210;
const COG_Y = [-280, -160, 0, 160, 280];
const OUT_X = 690;
const TILE_N = 6;
const TILE_CELL = 24;
const TILE_Y = [-95, 95]; // attention, feed-forward
const TILE_COLORS = [colors.attention, colors.index];
// Each dial is one dimension; its number is the arrow's horizontal component.
const VECTORS = ROW_TOKENS.map(t => range(DIMS).map(k => round1(Math.cos((embeddingAngle(IDS[t], k) * Math.PI) / 180))));

// --- 11b: one matrix times one vector ---------------------------------------------

const W = [
  [0.5, -0.3, 0.8, 0.1],
  [-0.6, 0.2, 0.3, 0.7],
  [0.1, 0.9, -0.4, 0.2],
  [0.7, 0.4, 0.1, -0.5],
];
const X_VEC = VECTORS[0]; // the vector of "It"
const Y_VEC = W.map(row => row.reduce((s, w, j) => s + w * X_VEC[j], 0));
const W_X = (j: number) => -330 + j * 100;
const M_Y = (i: number) => -150 + i * 80;
const X_COL = 130;
const Y_COL = 350;

// --- 11c: the GPU -------------------------------------------------------------------

const MACHINE_TOP = {position: new Vector2(0, -300), scale: 0.55};
const BOARD = {x: 0, y: 178, w: 1000, h: 440};
const DIE = {x: 0, y: 112, w: 420, h: 220};
const MEM_X = 370;
const CORES = {cols: 20, rows: 10, pitch: 19, size: 14};
const TENSOR = {x: 40, y: 320, cols: 8, w: 62, h: 28};
const PASSES = [
  {x: LAYERS[0].x, text: 'layer 1'},
  {x: LAYERS[1].x, text: 'layer 2'},
  {x: MORE_X, text: 'layers 3 … N−1'},
  {x: LAYERS[2].x, text: 'layer N'},
];

export default makeScene2D(function* (view) {
  view.fill(colors.machineBg);
  const clock = createSignal(0);
  const small = {fontFamily: font, fontSize: 24, fill: colors.label};

  // --- The machine: shared parts, the cog side, the number side ------------------
  const machine = createRef<Node>();
  const scan = createSignal(-700);
  const scanLine = createRef<Node>();
  const captions = [createRef<Txt>(), createRef<Txt>()];
  const highlight = createRef<Rect>();

  const stacks = ROW_TOKENS.map(t =>
    createCompassStack({
      dims: DIMS,
      size: 54,
      depth: new Vector2(-20, -16),
      angles: range(DIMS).map(k => embeddingAngle(IDS[t], k)),
    }),
  );
  const cogs = LAYERS.map((l, li) =>
    COG_Y.map((y, j) => {
      const c = createTunableCog(34, {position: [l.x, y]});
      c.knob(rnd(li, j) * 80);
      return c;
    }),
  );
  const vectorRow = (vals: number[], props = {}) => (
    <Rect layout alignItems={'center'} gap={4} {...props}>
      <Txt fontFamily={font} fontSize={40} fill={colors.label} text={'['} />
      {vals.map(v => (
        <Txt width={64} textAlign={'center'} fontFamily={font} fontSize={28} fill={v < 0 ? NEG : POS} text={fmt(v)} />
      ))}
      <Txt fontFamily={font} fontSize={28} fill={colors.label} text={'…'} />
      <Txt fontFamily={font} fontSize={40} fill={colors.label} text={']'} />
    </Rect>
  );
  const tile = (seedA: number, seedB: number, border: string, n = TILE_N, cell = TILE_CELL) => (
    <Node>
      <Rect width={n * cell + 10} height={n * cell + 10} radius={6} stroke={border} lineWidth={3} fill={'#0f1218'} />
      {range(n * n).map(c => (
        <Rect
          x={((c % n) - (n - 1) / 2) * cell}
          y={(Math.floor(c / n) - (n - 1) / 2) * cell}
          width={cell - 3}
          height={cell - 3}
          radius={2}
          fill={heat(rnd(seedA, seedB, c))}
        />
      ))}
    </Node>
  );
  const swatch = (fill: string) => <Rect width={22} height={22} radius={4} fill={fill} />;

  const cogSide = (
    <Node>
      {stacks.map((s, r) => <Node position={[VEC_X, ROWS_Y[r]]}>{s.node}</Node>)}
      {cogs.flat().map(c => c.node)}
    </Node>
  );
  const numSide = (
    <Node>
      {VECTORS.map((v, r) => vectorRow(v, {x: VEC_X + 30, y: ROWS_Y[r]}))}
      {LAYERS.flatMap((l, li) => TILE_Y.map((y, t) => <Node position={[l.x, y]}>{tile(li, t, TILE_COLORS[t])}</Node>))}
      <Rect layout alignItems={'center'} gap={10} x={110} y={300}>
        {swatch(colors.attention)}
        <Txt {...small} text={'attention'} marginRight={20} />
        {swatch(colors.index)}
        <Txt {...small} text={'feed-forward network'} />
      </Rect>
    </Node>
  );

  view.add(
    <Node ref={machine} opacity={0}>
      {ROW_TOKENS.map((t, r) => makeChip(TOKENS[t], colors.token, {x: TOKEN_X, y: ROWS_Y[r], scale: 0.7}))}
      <Txt x={TOKEN_X} y={0} fontFamily={font} fontSize={36} fill={colors.label} text={'⋮'} />
      <Rect x={EMBED_X} y={0} width={36} height={560} radius={18} fill={colors.embedding} />
      <Txt x={EMBED_X} rotation={-90} fontFamily={font} fontSize={20} fontWeight={600} fill={colors.tokenText} text={'Embedding'} />
      {LAYERS.map(l => <Txt {...small} x={l.x} y={-345} text={l.label} />)}
      <Txt x={MORE_X} y={0} fontFamily={font} fontSize={44} fill={colors.label} text={'⋯'} />
      <Line points={[[LAYERS[2].x + 100, 0], [OUT_X - 75, 0]]} stroke={colors.flowOut} lineWidth={3} endArrow arrowSize={10} />
      {makeChip('coat', colors.botBubble, {x: OUT_X, y: 0, scale: 0.8})}
      {/* Left of the scan line: numbers. Right of it: cogs. */}
      <Rect clip x={() => (scan() - 960) / 2} width={() => scan() + 960} height={1080}>
        <Node x={() => -(scan() - 960) / 2}>{numSide}</Node>
      </Rect>
      <Rect clip x={() => (scan() + 960) / 2} width={() => 960 - scan()} height={1080}>
        <Node x={() => -(scan() + 960) / 2}>{cogSide}</Node>
      </Rect>
      <Node ref={scanLine} x={scan} opacity={0}>
        <Rect width={44} height={760} fill={colors.index} opacity={0.12} />
        <Rect width={5} height={760} fill={colors.index} />
      </Node>
      <Rect ref={highlight} y={-10} width={200} height={470} radius={16} stroke={amber} lineWidth={6} opacity={0} />
    </Node>,
  );
  view.add(
    <>
      <Txt ref={captions[0]} y={395} fontFamily={font} fontSize={32} fill={colors.textLight} opacity={0} text={'each dial → one number  ·  a token → a list of numbers (a vector)'} />
      <Txt ref={captions[1]} y={445} fontFamily={font} fontSize={32} fill={colors.textLight} opacity={0} text={'each notch → one number (a weight)  ·  a layer → grids of numbers (matrices)'} />
    </>,
  );

  // --- 11b: the matrix panel ----------------------------------------------------------
  const panel = createRef<Node>();
  const wCells = W.map(() => [] as Rect[]);
  const xCol = createRef<Node>();
  const yTexts = W.map(() => createRef<Txt>());
  const rowBoxes = W.map(() => createRef<Rect>());
  const equation = createRef<Txt>();
  const parallel = createRef<Txt>();
  const panelCaptions = [createRef<Txt>(), createRef<Txt>()];
  const column = (x: number, children: Node[] | Node, label: string) => (
    <Node>
      <Txt {...small} x={x} y={M_Y(0) - 75} text={label} />
      <Rect x={x} y={(M_Y(0) + M_Y(3)) / 2} width={110} height={340} radius={12} stroke={colors.label} lineWidth={2} />
      {children}
    </Node>
  );
  view.add(
    <Node ref={panel} opacity={0}>
      <Txt {...small} x={(W_X(0) + W_X(3)) / 2} y={M_Y(0) - 75} text={'weights of a layer (a matrix)'} />
      {W.flatMap((row, i) =>
        row.map((w, j) => (
          <Rect ref={makeRef(wCells[i], j)} x={W_X(j)} y={M_Y(i)} width={92} height={70} radius={8} fill={mix(ZERO, w < 0 ? NEG : POS, Math.abs(w) * 0.8)}>
            <Txt fontFamily={font} fontSize={32} fill={colors.textLight} text={fmt(w)} />
          </Rect>
        )),
      )}
      {W.map((_, i) => (
        <Rect ref={rowBoxes[i]} x={(W_X(0) + W_X(3)) / 2} y={M_Y(i)} width={412} height={80} radius={10} stroke={amber} lineWidth={4} opacity={0} />
      ))}
      <Txt x={(W_X(3) + X_COL) / 2 + 20} y={(M_Y(0) + M_Y(3)) / 2} fontFamily={font} fontSize={44} fill={colors.label} text={'×'} />
      <Node ref={xCol}>
        {column(
          X_COL,
          X_VEC.map((v, i) => <Txt x={X_COL} y={M_Y(i)} fontFamily={font} fontSize={32} fill={v < 0 ? NEG : POS} text={fmt(v)} />),
          'vector of “It”',
        )}
      </Node>
      <Txt x={(X_COL + Y_COL) / 2} y={(M_Y(0) + M_Y(3)) / 2} fontFamily={font} fontSize={44} fill={colors.label} text={'='} />
      {column(
        Y_COL,
        Y_VEC.map((v, i) => <Txt ref={yTexts[i]} x={Y_COL} y={M_Y(i)} fontFamily={font} fontSize={32} fontWeight={600} fill={amber} text={fmt(v, 2)} opacity={0} />),
        'result',
      )}
      <Txt ref={equation} y={210} fontFamily={font} fontSize={32} fill={colors.textLight} text={''} />
      <Txt ref={parallel} y={210} fontFamily={font} fontSize={32} fontWeight={600} fill={amber} text={'in parallel hardware: all the rows at the same time'} opacity={0} />
      <Txt ref={panelCaptions[0]} y={330} fontFamily={font} fontSize={34} fontWeight={600} fill={colors.textLight} opacity={0} text={'Inside a layer: mostly multiplications and additions (plus a few simple functions)'} />
      <Txt ref={panelCaptions[1]} y={385} fontFamily={font} fontSize={28} fill={colors.textMuted} opacity={0} text={'attention: the same kind of products, between the tokens’ vectors  ·  here 4 × 4, in large models thousands × thousands'} />
    </Node>,
  );

  // --- 11c: the GPU board -------------------------------------------------------------
  const gpu = createRef<Node>();
  const activity = createSignal(0);
  const tensorState = createSignal(0);
  const status = createRef<Txt>();
  const gpuCaptions = [createRef<Txt>(), createRef<Txt>()];
  const flying = createRef<Node>();
  const coreAt = (c: number) =>
    new Vector2(
      DIE.x + ((c % CORES.cols) - (CORES.cols - 1) / 2) * CORES.pitch,
      DIE.y + (Math.floor(c / CORES.cols) - (CORES.rows - 1) / 2) * CORES.pitch,
    );
  const segments: [Vector2, Vector2][] = [
    [new Vector2(-MEM_X + 65, DIE.y), new Vector2(-DIE.w / 2, DIE.y)],
    [new Vector2(MEM_X - 65, DIE.y), new Vector2(DIE.w / 2, DIE.y)],
    [new Vector2(-60, TENSOR.y - 2 * TENSOR.h), new Vector2(-60, DIE.y + DIE.h / 2)],
    [new Vector2(60, DIE.y + DIE.h / 2), new Vector2(60, TENSOR.y - 2 * TENSOR.h)],
  ];
  // Before the first layer, the tensor holds the token vectors shown above.
  const tensorValue = (r: number, c: number) => {
    const step = Math.floor(tensorState() * 8);
    return fmt(step === 0 && c < DIMS ? VECTORS[r][c] : rnd(r, c, step), 2);
  };
  const memory = (x: number) => (
    <Node x={x} y={DIE.y}>
      <Rect width={130} height={220} radius={8} fill={'#1b1f27'} stroke={colors.cabinetEdge} lineWidth={3} />
      {range(8).map(k => (
        <Rect y={-84 + k * 24} width={104} height={14} radius={3} fill={heat(rnd(x, k) * 0.7)} opacity={0.8} />
      ))}
      <Txt {...small} fontSize={22} y={140} text={'memory (weights)'} />
    </Node>
  );
  view.add(
    <Node ref={gpu} opacity={0}>
      <Rect x={BOARD.x} y={BOARD.y} width={BOARD.w} height={BOARD.h} radius={16} fill={'#13281d'} stroke={colors.pcbEdge} lineWidth={3} />
      <Txt x={BOARD.x - BOARD.w / 2 + 24} y={BOARD.y + BOARD.h / 2 - 32} offsetX={-1} fontFamily={font} fontSize={34} fontWeight={600} fill={colors.textLight} text={'GPU'} />
      {segments.map(([a, b]) => <Line points={[a, b]} stroke={'#b08d3a'} lineWidth={4} opacity={0.6} />)}
      {memory(-MEM_X)}
      {memory(MEM_X)}
      <Rect x={DIE.x} y={DIE.y} width={DIE.w} height={DIE.h} radius={8} fill={'#11151c'} stroke={colors.steel} lineWidth={3} />
      {range(CORES.cols * CORES.rows).map(c => (
        <Rect
          position={coreAt(c)}
          width={CORES.size}
          height={CORES.size}
          radius={2}
          fill={colors.ledOn}
          opacity={() => 0.12 + 0.88 * activity() * (Math.sin(clock() * (9 + (c % 7)) + c * 2.3) > 0.1 ? 1 : 0.25)}
        />
      ))}
      <Txt {...small} fontSize={22} x={DIE.x} y={DIE.y - DIE.h / 2 - 14} text={'thousands of cores'} />
      {/* Electrons along the traces, while the chip works */}
      {segments.flatMap(([a, b]) =>
        range(4).map(i => (
          <Circle
            size={8}
            fill={'#ffe08a'}
            opacity={activity}
            position={() => {
              const f = (clock() * 1.6 + i / 4) % 1;
              return a.add(b.sub(a).scale(f));
            }}
          />
        )),
      )}
      {/* The tensor: the numbers being worked on, one row per token */}
      <Txt x={TENSOR.x - (TENSOR.cols / 2) * TENSOR.w - 110} y={TENSOR.y} fontFamily={font} fontSize={26} fontWeight={600} fill={colors.textLight} text={'tensor'} />
      {ROW_TOKENS.map((t, r) => (
        <Txt
          x={TENSOR.x - (TENSOR.cols / 2) * TENSOR.w - 20}
          y={TENSOR.y + (r - 1.5) * TENSOR.h}
          offsetX={1}
          fontFamily={font}
          fontSize={18}
          fill={colors.token}
          text={TOKENS[t]}
        />
      ))}
      <Rect x={TENSOR.x} y={TENSOR.y} width={TENSOR.cols * TENSOR.w + 16} height={4 * TENSOR.h + 12} radius={8} fill={'#0f1218'} stroke={colors.label} lineWidth={2} />
      {range(4).flatMap(r =>
        range(TENSOR.cols).map(c => (
          <Txt
            x={TENSOR.x + (c - (TENSOR.cols - 1) / 2) * TENSOR.w}
            y={TENSOR.y + (r - 1.5) * TENSOR.h}
            fontFamily={font}
            fontSize={18}
            fill={colors.textLight}
            text={() => tensorValue(r, c)}
          />
        )),
      )}
      <Node ref={flying} />
      <Txt ref={status} y={-80} fontFamily={font} fontSize={32} fontWeight={600} fill={amber} text={''} />
      <Txt ref={gpuCaptions[0]} y={455} fontFamily={font} fontSize={32} fontWeight={600} fill={colors.textLight} opacity={0} text={'GPU: specific-purpose hardware, built for algebra'} />
      <Txt ref={gpuCaptions[1]} y={500} fontFamily={font} fontSize={28} fill={colors.textMuted} opacity={0} text={'thousands of cores, each doing billions of steps per second'} />
    </Node>,
  );

  // --- 11d: scale ------------------------------------------------------------------
  const veil = createRef<Rect>();
  const lines = range(8).map(() => createRef<Node>());
  view.add(
    <>
      <Rect ref={veil} width={1920} height={1080} fill={colors.machineBg} opacity={0} />
      <Node ref={lines[0]} opacity={0}>
        <Txt y={-400} fontFamily={font} fontSize={40} fontWeight={600} fill={colors.textLight} text={'One token through a 175-billion-weight model'} />
        <Txt y={-345} fontFamily={font} fontSize={30} fill={colors.textMuted} text={'≈ 175 billion multiply-adds'} />
      </Node>
      <Node ref={lines[1]} opacity={0}>
        <Words y={-265} fontSize={34} parts={[['by hand, one per second:'], ['≈ 5,500 years', amber, 600]]} />
      </Node>
      <Node ref={lines[2]} opacity={0}>
        <Words y={-205} fontSize={34} parts={[['a GPU (≈ 10¹⁵ operations per second):'], ['≈ ⅓ of a millisecond of compute', amber, 600]]} />
      </Node>
      <Node ref={lines[3]} opacity={0}>
        <Txt y={-80} fontFamily={font} fontSize={40} fontWeight={600} fill={colors.textLight} text={'Training'} />
        <Txt y={-25} fontFamily={font} fontSize={30} fill={colors.textMuted} text={'≈ 100,000 rounds of nudges, each nudging all 175 billion weights'} />
      </Node>
      <Node ref={lines[4]} opacity={0}>
        <Txt y={45} fontFamily={font} fontSize={34} fontWeight={600} fill={amber} text={'→ thousands of GPUs, running for weeks'} />
      </Node>
      <Node ref={lines[5]} opacity={0}>
        <Txt y={175} fontFamily={font} fontSize={30} fill={colors.textLight} text={'specific-purpose software orchestrates the operations (tensors, auto-diff)'} />
        <Txt y={220} fontFamily={font} fontSize={30} fill={colors.textLight} text={'on specific-purpose hardware (GPUs)'} />
      </Node>
      <Node ref={lines[6]} opacity={0}>
        <Txt y={350} fontFamily={font} fontSize={44} fontWeight={600} fill={colors.textLight} text={'Scale is only possible at lightning speed, on silicon'} />
      </Node>
    </>,
  );

  yield clock(1000, 1000, linear);
  yield driveCogs(cogs.flat());

  // --- Helpers -------------------------------------------------------------------------

  // One pass through a layer (or the fast-forward through many): the layer is
  // outlined above; below, its weights stream from memory into the cores and
  // the tensor rolls over to new values.
  function* pass(k: number, pace: number) {
    const p = PASSES[k];
    status().text(p.text);
    yield* all(highlight().x(p.x, 0.3 * pace, easeInOutCubic), highlight().opacity(1, 0.2));
    const tiles = [-1, 1].map(side => {
      const t = (<Node position={[side * MEM_X, DIE.y]} scale={0.5}>{tile(k, side, side < 0 ? colors.attention : colors.index, 4, 20)}</Node>) as Node;
      flying().add(t);
      return t;
    });
    yield* all(...tiles.map(t => all(t.position([0, DIE.y], 0.4 * pace, easeInOutCubic), t.opacity(0, 0.4 * pace, easeInOutCubic))));
    tiles.forEach(t => t.remove());
    yield* all(activity(1, 0.15), tensorState(tensorState() + 1, 0.7 * pace, linear));
    yield* activity(0, 0.2 * pace);
  }

  // --- 11a: the machine, then numbers ---------------------------------------------------
  yield* waitFor(0.3);
  yield* waitUntil('machine');
  yield* machine().opacity(1, 1);
  yield* waitFor(2);

  yield* waitUntil('x-ray');
  const scanTime = 5;
  const reach = (x: number) => ((x + 120 - -700) / (620 - -700)) * scanTime;
  yield* all(
    scanLine().opacity(1, 0.3),
    scan(620, scanTime, linear),
    chain(waitFor(reach(VEC_X)), captions[0]().opacity(1, 0.5)),
    chain(waitFor(reach(LAYERS[0].x)), captions[1]().opacity(1, 0.5)),
  );
  yield* scanLine().opacity(0, 0.3);
  scan(960);
  yield* waitFor(3.5);

  // --- 11b: multiply and add -----------------------------------------------------------
  yield* waitUntil('multiply');
  yield* all(machine().opacity(0, 0.6), ...captions.map(c => c().opacity(0, 0.4)), panel().opacity(1, 0.6));
  yield* waitFor(0.6);
  // Row 1, slowly: four products, then their sum.
  yield* rowBoxes[0]().opacity(1, 0.3);
  const terms = W[0].map((w, j) => `${w < 0 ? `(${fmt(w)})` : fmt(w)} × ${X_VEC[j] < 0 ? `(${fmt(X_VEC[j])})` : fmt(X_VEC[j])}`);
  for (let j = 0; j < 4; j++) {
    equation().text(terms.slice(0, j + 1).join(' + '));
    yield* all(wCells[0][j].scale(1.12, 0.2).to(1, 0.25));
  }
  equation().text(terms.join(' + ') + ` = ${fmt(Y_VEC[0], 2)}`);
  yield* yTexts[0]().opacity(1, 0.4);
  yield* waitFor(0.8);
  // The other rows, faster.
  for (let i = 1; i < 4; i++) {
    yield* all(rowBoxes[i - 1]().opacity(0, 0.15), rowBoxes[i]().opacity(1, 0.15));
    equation().text(
      W[i].map((w, j) => `${w < 0 ? `(${fmt(w)})` : fmt(w)} × ${X_VEC[j] < 0 ? `(${fmt(X_VEC[j])})` : fmt(X_VEC[j])}`).join(' + ') +
        ` = ${fmt(Y_VEC[i], 2)}`,
    );
    yield* yTexts[i]().opacity(1, 0.3);
    yield* waitFor(0.25);
  }
  // All rows at once.
  yield* all(rowBoxes[3]().opacity(0, 0.2), equation().opacity(0, 0.2), ...yTexts.map(t => t().opacity(0, 0.2)));
  yield* all(...rowBoxes.map(b => b().opacity(1, 0.3)), parallel().opacity(1, 0.3));
  yield* all(...yTexts.map(t => t().opacity(1, 0.3)));
  yield* waitFor(0.5);
  yield* sequence(0.6, ...panelCaptions.map(c => c().opacity(1, 0.5)));
  yield* waitFor(3.2);

  // --- 11c: on silicon --------------------------------------------------------------------
  yield* waitUntil('silicon');
  yield* panel().opacity(0, 0.5);
  yield* all(
    machine().opacity(1, 0.8),
    machine().position(MACHINE_TOP.position, 0.9, easeInOutCubic),
    machine().scale(MACHINE_TOP.scale, 0.9, easeInOutCubic),
    gpu().opacity(1, 0.9),
  );
  yield* sequence(0.5, ...gpuCaptions.map(c => c().opacity(1, 0.5)));
  yield* waitFor(1.6);

  yield* waitUntil('layers');
  yield* pass(0, 1.2);
  yield* pass(1, 1);
  // Many layers in a blur.
  status().text(PASSES[2].text);
  yield* all(highlight().x(PASSES[2].x, 0.25, easeInOutCubic), activity(1, 0.15));
  yield* tensorState(tensorState() + 6, 1.6, linear);
  yield* activity(0, 0.15);
  yield* pass(3, 0.7);
  yield* all(highlight().opacity(0, 0.3), status().opacity(0, 0.3));
  yield* waitFor(1.5);

  // --- 11d: why it matters ---------------------------------------------------------------
  yield* waitUntil('scale');
  yield* veil().opacity(0.985, 0.7);
  yield* lines[0]().opacity(1, 0.5);
  yield* waitFor(0.8);
  yield* lines[1]().opacity(1, 0.5);
  yield* waitFor(1);
  yield* lines[2]().opacity(1, 0.5);
  yield* waitFor(2.2);

  yield* waitUntil('training');
  yield* lines[3]().opacity(1, 0.5);
  yield* waitFor(1.2);
  yield* lines[4]().opacity(1, 0.5);
  yield* waitFor(2.2);

  yield* waitUntil('software');
  yield* lines[5]().opacity(1, 0.6);
  yield* waitFor(2.2);
  yield* lines[6]().opacity(1, 0.6);
  yield* waitFor(4);
});

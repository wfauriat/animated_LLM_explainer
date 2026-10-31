// Scene 11 — From cogs to numbers, on silicon.
// 11a: the machine of Scene 4 (token rows, dial stacks, columns of cogs). An
//   X-ray line sweeps across it: each dial becomes one number (a token's
//   stack, a vector), each layer's cogs become grids of numbers (matrices:
//   attention, then feed-forward), each notch one cell.
// 11c: where it happens: the numbers machine above, a GPU below. For each
//   layer, its weights are loaded from memory into the cores, and the tensor
//   (the numbers being worked on) rolls over to new values.
// 11d: why it matters: the scale only works at the speed of silicon.
import {Circle, Line, makeScene2D, Node, Rect, Txt} from '@motion-canvas/2d';
import {
  all,
  createRef,
  createSignal,
  easeInOutCubic,
  easeOutCubic,
  linear,
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
const TOKEN_X = -850;
const DICT_X = -760; // tokenization (dictionary lookup)
const EMBED_X = -690;
const VEC_X = -490; // the token vectors: dial stacks (front dial) ...
const VEC_LEFT = -640; // ... then rows of numbers, from here
const DIMS = 4;
const LAYERS = [
  {x: -200, label: 'layer 1'},
  {x: 70, label: 'layer 2'},
  {x: 430, label: 'layer N'},
];
const MORE_X = 250;
// Thin separators between layers (and around the "⋯").
const SEPARATORS_X = [-65, 205, 295];
const COG_Y = [-280, -160, 0, 160, 280];
const OUT_X = 720;
// Each layer: attention, then feed-forward, side by side.
const TILE_N = 6;
const TILE_CELL = 16;
const TILE_DX = [-64, 64];
const TILE_COLORS = [colors.attention, colors.index];
const TILE_HALF = (TILE_N * TILE_CELL + 10) / 2;
const SCAN_FROM = -660;
const SCAN_TO = 640;
// Each dial is one dimension; its number is the arrow's horizontal component.
const VECTORS = ROW_TOKENS.map(t => range(DIMS).map(k => round1(Math.cos((embeddingAngle(IDS[t], k) * Math.PI) / 180))));

// --- 11c: the GPU -------------------------------------------------------------------

const MACHINE_TOP = {position: new Vector2(0, -300), scale: 0.55};
const BOARD = {x: 0, y: 178, w: 1000, h: 440};
const DIE = {x: 0, y: 112, w: 420, h: 220};
const MEM_X = 370;
const CORES = {cols: 20, rows: 10, pitch: 19, size: 14};
const TENSOR = {x: 40, y: 320, cols: 8, w: 62, h: 28};

export default makeScene2D(function* (view) {
  view.fill(colors.machineBg);
  const clock = createSignal(0);
  const small = {fontFamily: font, fontSize: 24, fill: colors.label};

  // --- The machine: shared parts, the cog side, the number side ------------------
  const machine = createRef<Node>();
  const scan = createSignal(SCAN_FROM);
  const scanLine = createRef<Node>();
  const title = createRef<Node>();
  const captions = [createRef<Rect>(), createRef<Rect>()];
  const highlight = createRef<Rect>();
  const vecBoxes: Rect[] = [];
  const matBoxes: Rect[] = [];

  const stacks = ROW_TOKENS.map(t =>
    createCompassStack({
      dims: DIMS,
      size: 54,
      depth: new Vector2(-26, -21), // same dial/step ratio as Scene 4, so "⋰" shows
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
  // Like the dials: the first dimensions, "…", then the last one.
  const rows: Rect[] = [];
  const vectorRow = (vals: number[], props = {}) => {
    const num = (v: number) => (
      <Txt width={50} textAlign={'center'} fontFamily={font} fontSize={22} fill={v < 0 ? NEG : POS} text={fmt(v)} />
    );
    return (
      <Rect ref={r => r && rows.push(r)} layout alignItems={'center'} gap={4} offsetX={-1} {...props}>
        <Txt fontFamily={font} fontSize={32} fill={colors.label} text={'['} />
        {vals.slice(0, -1).map(num)}
        <Txt marginLeft={4} marginRight={4} fontFamily={font} fontSize={22} fill={colors.label} text={'…'} />
        {num(vals[vals.length - 1])}
        <Txt fontFamily={font} fontSize={32} fill={colors.label} text={']'} />
      </Rect>
    );
  };
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
      {VECTORS.map((v, r) => vectorRow(v, {x: VEC_LEFT, y: ROWS_Y[r]}))}
      {LAYERS.map((l, li) => (
        <Node x={l.x}>
          {TILE_DX.map((dx, t) => <Node x={dx}>{tile(li, t, TILE_COLORS[t])}</Node>)}
          {/* attention first, then feed-forward */}
          <Line
            points={[[TILE_DX[0] + TILE_HALF + 3, 0], [TILE_DX[1] - TILE_HALF - 3, 0]]}
            stroke={colors.label}
            lineWidth={3}
            endArrow
            arrowSize={7}
          />
        </Node>
      ))}
      {SEPARATORS_X.map(x => (
        <Line points={[[x, -85], [x, 85]]} stroke={colors.label} lineWidth={2} opacity={0.5} />
      ))}
      <Rect layout alignItems={'center'} gap={10} x={110} y={120}>
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
      <Rect x={DICT_X} y={0} width={36} height={560} radius={18} fill={colors.dictionary} />
      <Txt x={DICT_X} rotation={-90} fontFamily={font} fontSize={20} fontWeight={600} fill={colors.dictionaryText} text={'Tokenization'} />
      <Rect x={EMBED_X} y={0} width={36} height={560} radius={18} fill={colors.embedding} />
      <Txt x={EMBED_X} rotation={-90} fontFamily={font} fontSize={20} fontWeight={600} fill={colors.tokenText} text={'Embedding'} />
      {LAYERS.map(l => <Txt {...small} x={l.x} y={-345} text={l.label} />)}
      <Txt x={MORE_X} y={0} fontFamily={font} fontSize={44} fill={colors.label} text={'⋯'} />
      <Line points={[[LAYERS[2].x + 135, 0], [OUT_X - 75, 0]]} stroke={colors.flowOut} lineWidth={3} endArrow arrowSize={10} />
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
      {/* Flashed to match the captions: token vectors, then weight matrices */}
      {ROWS_Y.map((y, r) => (
        <Rect
          ref={b => b && vecBoxes.push(b)}
          x={() => VEC_LEFT + (rows[r]?.width() ?? 0) / 2}
          y={y}
          width={() => (rows[r]?.width() ?? 0) + 20}
          height={48}
          radius={10}
          stroke={colors.embedding}
          lineWidth={4}
          opacity={0}
        />
      ))}
      {LAYERS.map(l => (
        <Rect
          ref={b => b && matBoxes.push(b)}
          x={l.x}
          width={2 * (TILE_DX[1] + TILE_HALF) + 16}
          height={2 * TILE_HALF + 16}
          radius={10}
          stroke={amber}
          lineWidth={4}
          opacity={0}
        />
      ))}
      <Rect ref={highlight} width={2 * (TILE_DX[1] + TILE_HALF) + 30} height={2 * TILE_HALF + 34} radius={16} stroke={amber} lineWidth={6} opacity={0} />
    </Node>,
  );
  view.add(
    <>
      <Node ref={title} opacity={0}>
        <Words
          y={-450}
          fontSize={46}
          parts={[
            ['Modern language models are', colors.textLight, 700],
            ['electronic machines,', colors.index, 700],
            ['not mechanical ones', colors.textLight, 700],
          ]}
        />
      </Node>
      <Words
        ref={captions[0]}
        y={395}
        fontSize={36}
        opacity={0}
        parts={[['Instead of a set of dials, a'], ['vector', colors.textLight, 800], ['of numbers']]}
      />
      <Words
        ref={captions[1]}
        y={465}
        fontSize={36}
        opacity={0}
        parts={[['Instead of multiple gears (layers),'], ['matrices', colors.textLight, 800], ['of'], ['weights', colors.textLight, 800]]}
      />
    </>,
  );

  // --- 11c: the GPU board -------------------------------------------------------------
  const gpu = createRef<Node>();
  const loading = createSignal(0); // weights travelling from memory to the cores
  const activity = createSignal(0); // the cores computing
  const tensorState = createSignal(0);
  const status = createRef<Txt>();
  const gpuCaptions = [createRef<Txt>(), createRef<Txt>()];
  const flying = createRef<Node>();
  const coreAt = (c: number) =>
    new Vector2(
      DIE.x + ((c % CORES.cols) - (CORES.cols - 1) / 2) * CORES.pitch,
      DIE.y + (Math.floor(c / CORES.cols) - (CORES.rows - 1) / 2) * CORES.pitch,
    );
  // Memory -> cores (lit while loading), cores <-> tensor (lit while computing).
  const segments: [Vector2, Vector2, typeof loading][] = [
    [new Vector2(-MEM_X + 65, DIE.y), new Vector2(-DIE.w / 2, DIE.y), loading],
    [new Vector2(MEM_X - 65, DIE.y), new Vector2(DIE.w / 2, DIE.y), loading],
    [new Vector2(-60, TENSOR.y - 2 * TENSOR.h), new Vector2(-60, DIE.y + DIE.h / 2), activity],
    [new Vector2(60, DIE.y + DIE.h / 2), new Vector2(60, TENSOR.y - 2 * TENSOR.h), activity],
  ];
  // Columns: the first dimensions, "…", then the last one. Before the first
  // layer, the tensor holds the token vectors shown above (first 3 and last).
  const lastCol = TENSOR.cols - 1;
  const tensorValue = (r: number, c: number) => {
    if (c === lastCol - 1) return '…';
    const step = Math.floor(tensorState() * 8);
    if (step === 0 && c < DIMS - 1) return fmt(VECTORS[r][c], 2);
    if (step === 0 && c === lastCol) return fmt(VECTORS[r][DIMS - 1], 2);
    return fmt(rnd(r, c, step), 2);
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
      {segments.map(([a, b, lit]) => <Line points={[a, b]} stroke={'#b08d3a'} lineWidth={4} opacity={() => 0.6 + 0.4 * lit()} />)}
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
      {/* Electrons along the traces */}
      {segments.flatMap(([a, b, lit]) =>
        range(4).map(i => (
          <Circle
            size={8}
            fill={'#ffe08a'}
            opacity={lit}
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
  const header = (text: string, y: number) => (
    <Node y={y}>
      <Txt fontFamily={font} fontSize={50} fontWeight={700} fill={colors.index} text={text} />
      <Rect y={46} width={90} height={5} radius={3} fill={colors.index} />
    </Node>
  );
  const lines = range(6).map(() => createRef<Node>());
  const conclusion = createRef<Rect>();
  view.add(
    <>
      <Rect ref={veil} width={1920} height={1080} fill={colors.machineBg} opacity={0} />
      <Node ref={lines[0]} opacity={0}>
        {header('Inference / prediction', -440)}
        <Txt y={-345} fontFamily={font} fontSize={38} fontWeight={600} fill={colors.textLight} text={'One token through a 175-billion-weight model'} />
        <Txt y={-295} fontFamily={font} fontSize={30} fill={colors.textMuted} text={'≈ 175 billion multiply-adds'} />
      </Node>
      <Node ref={lines[1]} opacity={0}>
        <Words y={-225} fontSize={34} parts={[['by hand, one per second:'], ['≈ 5,500 years', amber, 600]]} />
      </Node>
      <Node ref={lines[2]} opacity={0}>
        <Words y={-170} fontSize={34} parts={[['a GPU (≈ 10¹⁵ operations per second):'], ['≈ ⅓ of a millisecond of compute', amber, 600]]} />
      </Node>
      <Node ref={lines[3]} opacity={0}>
        {header('Training', -50)}
        <Txt y={45} fontFamily={font} fontSize={34} fill={colors.textLight} text={'≈ 100,000 rounds of nudges, each nudging all 175 billion weights'} />
      </Node>
      <Node ref={lines[4]} opacity={0}>
        <Txt y={100} fontFamily={font} fontSize={34} fontWeight={600} fill={amber} text={'→ thousands of GPUs, running for weeks'} />
      </Node>
      <Rect
        ref={conclusion}
        layout
        direction={'column'}
        alignItems={'center'}
        gap={14}
        y={300}
        padding={[28, 48]}
        radius={18}
        fill={'#1a1608'}
        stroke={amber}
        lineWidth={4}
        opacity={0}
      >
        <Words
          fontSize={46}
          parts={[
            ['Scale is only possible at', colors.textLight, 700],
            ['lightning speed, on silicon', amber, 700],
          ]}
        />
        <Words
          fontSize={38}
          gap={10}
          parts={[
            ['(not mechanical gears:', colors.textLight, 600],
            ['yet still a machine', amber, 800],
            ['on silicon)', colors.textLight, 600],
          ]}
        />
      </Rect>
    </>,
  );

  yield clock(1000, 1000, linear);
  yield driveCogs(cogs.flat());

  // --- Helpers -------------------------------------------------------------------------

  // One pass through a layer: the layer is outlined above; below, its weights
  // are loaded from memory into the cores (one burst along the links), then
  // the cores compute and the tensor rolls over to new values.
  function* pass(l: number, pace: number) {
    status().text(LAYERS[l].label);
    yield* all(highlight().x(LAYERS[l].x, 0.3 * pace, easeInOutCubic), highlight().opacity(1, 0.2));
    const tiles = [-1, 1].map(side => {
      const t = (<Node position={[side * MEM_X, DIE.y]} scale={0.5}>{tile(l, side, side < 0 ? colors.attention : colors.index, 4, 20)}</Node>) as Node;
      flying().add(t);
      return t;
    });
    yield* all(
      loading(1, 0.1 * pace).to(0, 0.35 * pace),
      ...tiles.map(t => all(t.position([0, DIE.y], 0.4 * pace, easeInOutCubic), t.opacity(0, 0.4 * pace, easeInOutCubic))),
    );
    tiles.forEach(t => t.remove());
    yield* all(activity(1, 0.15), tensorState(tensorState() + 1, 0.7 * pace, linear));
    yield* activity(0, 0.2 * pace);
  }

  // Outlines `boxes` and tints the caption's emphasized words with the same
  // color, twice. The words keep the color afterwards.
  function* flash(boxes: Rect[], words: Txt[], color: string) {
    yield* all(...boxes.map(b => b.opacity(1, 0.25)), ...words.map(w => w.fill(color, 0.25)));
    yield* all(...boxes.map(b => b.opacity(0, 0.35)), ...words.map(w => w.fill(colors.textLight, 0.35)));
    yield* all(...boxes.map(b => b.opacity(1, 0.25)), ...words.map(w => w.fill(color, 0.25)));
    yield* all(...boxes.map(b => b.opacity(0, 0.35)));
  }

  // --- 11a: the machine, then numbers ---------------------------------------------------
  yield* waitFor(0.3);
  yield* waitUntil('machine');
  yield* machine().opacity(1, 1);
  yield* waitFor(1.5);

  yield* waitUntil('x-ray');
  yield* all(scanLine().opacity(1, 0.3), title().opacity(1, 0.6), scan(SCAN_TO, 4.5, linear));
  yield* scanLine().opacity(0, 0.3);
  scan(960);
  yield* waitFor(0.3);

  // Each caption with what it refers to.
  yield* waitUntil('vectors');
  const line1 = captions[0]().children() as Txt[];
  yield* all(captions[0]().opacity(1, 0.4), flash(vecBoxes, [line1[1]], colors.embedding));
  yield* waitFor(0.5);
  yield* waitUntil('matrices');
  const line2 = captions[1]().children() as Txt[];
  yield* all(captions[1]().opacity(1, 0.4), flash(matBoxes, [line2[1], line2[3]], amber));
  yield* waitFor(2);

  // --- 11c: on silicon --------------------------------------------------------------------
  yield* waitUntil('silicon');
  yield* all(
    title().opacity(0, 0.4),
    ...captions.map(c => c().opacity(0, 0.4)),
    machine().position(MACHINE_TOP.position, 0.9, easeInOutCubic),
    machine().scale(MACHINE_TOP.scale, 0.9, easeInOutCubic),
    gpu().opacity(1, 0.9),
  );
  yield* sequence(0.5, ...gpuCaptions.map(c => c().opacity(1, 0.5)));
  yield* waitFor(1.6);

  yield* waitUntil('layers');
  yield* pass(0, 1.2);
  yield* pass(1, 1);
  yield* pass(2, 0.8);
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

  yield* waitUntil('conclusion');
  conclusion().scale(0.9);
  yield* all(conclusion().opacity(1, 0.6), conclusion().scale(1, 0.7, easeOutCubic));
  yield* waitFor(4);
});

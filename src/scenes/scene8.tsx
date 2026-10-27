// Scene 8 — Scale. A single cog is an adjustable weight: its notch sets how
// fast it turns (its effect). The camera pulls back, "Powers of Ten" style:
// a dozen cogs each set differently, then GPT-2 small (12 transformer layers
// × 12 attention heads × 768 embedding dimensions: 124 million weights),
// growing through GPT-2 medium, large and XL to GPT-3 (175 billion), then
// today's largest models (hundreds of billions). The diversity of language
// takes billions of knobs.
import {Circle, CubicBezier, Line, makeScene2D, Node, Rect, Txt} from '@motion-canvas/2d';
import {
  all,
  createRef,
  createSignal,
  easeInOutCubic,
  easeInOutSine,
  easeOutBack,
  range,
  sequence,
  SimpleSignal,
  Vector2,
  waitFor,
  waitUntil,
} from '@motion-canvas/core';
import {Cog, cogTexture, createTunableCog, driveCogs, TunableCog} from '../components/Cog';
import {colors, font} from '../theme';
import {CHIP_W} from '../scene4/layout';
import {makeChip} from '../scene4/parts';

// --- Models: published sizes --------------------------------------------------

type Model = {name: string; year: string; layers: number; heads: number; dim: number; weights: number};
const MODELS: Model[] = [
  {name: 'GPT-2 small', year: '2019', layers: 12, heads: 12, dim: 768, weights: 124e6},
  {name: 'GPT-2 medium', year: '2019', layers: 24, heads: 16, dim: 1024, weights: 355e6},
  {name: 'GPT-2 large', year: '2019', layers: 36, heads: 20, dim: 1280, weights: 774e6},
  {name: 'GPT-2 XL', year: '2019', layers: 48, heads: 25, dim: 1600, weights: 1.558e9},
  {name: 'GPT-3', year: '2020', layers: 96, heads: 96, dim: 12288, weights: 175e9},
];
const GPT3 = MODELS[MODELS.length - 1];

// --- World geometry (camera-independent units) -------------------------------

const LX = 240; // layer spacing
const CY = 110; // cog spacing within a layer
const R = 48; // cog radius
const LAYERS_2 = 12; // GPT-2 small: transformer layers ...
const ROWS = 12; // ... and attention heads
const DEPTH = new Vector2(-30, -25); // one embedding dimension further back
const PLANES = 4; // planes drawn behind the front one ...
const FAR = 7; // ... plus a last one, standing for the 768th
const SLAB_T = 120; // slab thickness
const TODAY = 1.8; // today's largest, relative to GPT-3 (illustrative)
const layerX = (i: number) => (i - (LAYERS_2 - 1) / 2) * LX;
const rowY = (j: number) => (j - (ROWS - 1) / 2) * CY;
const FOCUS = {layer: 6, row: 5};
const CLOSE_UP = [5, 6, 7]; // the layers ...
const CLOSE_ROWS = [4, 5, 6, 7]; // ... and rows of the first dozen cogs
const knobOf = (k: number) => ((k * 73) % 181) - 90; // varied notch settings
const FAR_D = DEPTH.scale(FAR);

// The machine's size for a model: one slab per layer, taller with more heads,
// deeper with a wider embedding (compressed, or GPT-3 would not fit).
const tallOf = (heads: number) => (heads / 12) ** 0.85;
const deepOf = (dim: number) => (dim / 768) ** 0.65;
const X0 = layerX(0) - SLAB_T / 2; // left edge of the first slab
const xEnd = (layers: number) => layerX(layers - 1) + SLAB_T / 2;
const heightOf = (heads: number) => ROWS * CY * tallOf(heads);
const depthOf = (dim: number) => FAR_D.scale(deepOf(dim));

// --- Camera -------------------------------------------------------------------

type Shot = {scale: number; position: Vector2};
const STAGE_CENTER = new Vector2(170, -110); // leaves room for labels and counter

// Fit a world box [min, max] within width × height pixels around `center`.
function fit(min: Vector2, max: Vector2, width: number, height = Infinity, center = new Vector2(0, -60)): Shot {
  const scale = Math.min(width / (max.x - min.x), height / (max.y - min.y));
  return {scale, position: center.sub(min.add(max).scale(scale / 2))};
}
// Put world point `at` on screen point `on`.
function aim(at: Vector2, on: Vector2, scale: number): Shot {
  return {scale, position: on.sub(at.scale(scale))};
}
const toScreen = (s: Shot, p: Vector2) => s.position.add(p.scale(s.scale));
// Frame the whole machine of a model.
function shotOf(m: Model): Shot {
  const h = heightOf(m.heads);
  const d = depthOf(m.dim);
  return fit(new Vector2(X0 + d.x, -h / 2 + d.y), new Vector2(xEnd(m.layers), h / 2), 1400, 620, STAGE_CENTER);
}

const FOCUS_AT = new Vector2(layerX(FOCUS.layer), rowY(FOCUS.row));
const FOCUS_ON = new Vector2(0, 60);
const SHOT_COG = aim(FOCUS_AT, FOCUS_ON, 2.4);
const SHOT_DOZEN = aim(new Vector2(layerX(6), 0), new Vector2(0, -40), 1.4);
const SHOT_GPT2 = fit(
  new Vector2(layerX(0) - R + FAR_D.x, rowY(0) - R + FAR_D.y),
  new Vector2(layerX(LAYERS_2 - 1) + R, rowY(ROWS - 1) + R),
  1400,
  620,
  STAGE_CENTER,
);
const H3 = heightOf(GPT3.heads);
const D3 = depthOf(GPT3.dim);
const X3 = xEnd(GPT3.layers);
const XT = X0 + (X3 - X0) * TODAY;
const HT = H3 * TODAY;
const DT = D3.scale(TODAY);
const SHOT_TODAY = fit(new Vector2(X0 + DT.x, -HT / 2 + DT.y), new Vector2(XT, HT / 2), 1500);

// --- Attention at the GPT-2 stage: "bank" looks back (as in Scene 6) ---------

const SENTENCE = ['He', 'put', 'money', 'in', 'the', 'bank'];
const CURRENT = SENTENCE.length - 1;
const TOKENS_X = -700;
const TOKENS_Y = -300; // first row; one row per word, as in Scenes 4 and 6
const TOKEN_STEP = 90;
const TOKEN_SCALE = 0.6;
// A few heads' worth of attention patterns over the earlier words.
const PATTERNS = [
  [0.04, 0.2, 0.6, 0.1, 0.06],
  [0.5, 0.1, 0.1, 0.05, 0.25],
  [0.05, 0.45, 0.15, 0.3, 0.05],
];

// --- Slabs: whole layers, once there are too many cogs to draw ----------------

const SLAB = {front: '#173b2a', cog: '#2f6e4c', top: '#2a6b48', side: '#10291c', edge: '#3ddc6a55'};

type Size = {
  on: SimpleSignal<number, void>; // slabs shown at all (vs. cogs)
  layers: SimpleSignal<number, void>;
  heads: SimpleSignal<number, void>;
  dim: SimpleSignal<number, void>;
};

function slab(i: number, size: Size, texture: ReturnType<typeof cogTexture>) {
  const x = layerX(i);
  const h = () => heightOf(size.heads());
  const d = () => depthOf(size.dim());
  const tl = () => new Vector2(x - SLAB_T / 2, -h() / 2);
  const tr = () => new Vector2(x + SLAB_T / 2, -h() / 2);
  const bl = () => new Vector2(x - SLAB_T / 2, h() / 2);
  return (
    <Node opacity={() => size.on() * Math.min(1, Math.max(0, size.layers() - i))}>
      <Line
        points={() => [tl(), bl(), bl().add(d()), tl().add(d())]}
        closed
        fill={SLAB.side}
        stroke={SLAB.edge}
        lineWidth={8}
      />
      <Line
        points={() => [tl(), tr(), tr().add(d()), tl().add(d())]}
        closed
        fill={SLAB.top}
        stroke={SLAB.edge}
        lineWidth={8}
      />
      <Rect x={x} width={SLAB_T} height={h} fill={texture} stroke={SLAB.edge} lineWidth={8} />
    </Node>
  ) as Node;
}

// Dashed outline of a box (front face, top and left side), for sizes we can
// only give as a magnitude.
function outline(x0: number, x1: number, h: number, d: Vector2) {
  const tl = new Vector2(x0, -h / 2);
  const tr = new Vector2(x1, -h / 2);
  const bl = new Vector2(x0, h / 2);
  const br = new Vector2(x1, h / 2);
  const style = {stroke: colors.label, lineWidth: 40, lineDash: [500, 300], end: 0};
  return [
    <Line {...style} points={[bl, br, tr, tl, bl]} />,
    <Line {...style} points={[tl, tl.add(d), tr.add(d), tr]} />,
    <Line {...style} points={[bl, bl.add(d), tl.add(d)]} />,
  ] as Line[];
}

const fmt = (log: number) => Math.round(10 ** log).toLocaleString('en-US');

export default makeScene2D(function* (view) {
  view.fill(colors.machineBg);

  // --- Cogs: a front plane of adjustable weights, planes of depth behind ------
  const front: TunableCog[][] = range(LAYERS_2).map(i =>
    range(ROWS).map(j =>
      createTunableCog(R, {position: [layerX(i), rowY(j)], scale: 0}),
    ),
  );
  const focus = front[FOCUS.layer][FOCUS.row];
  focus.node.scale(1).opacity(0);
  const dozen = CLOSE_UP.flatMap(i => CLOSE_ROWS.map(j => front[i][j])).filter(c => c !== focus);
  const rest = front.flat().filter(c => c !== focus && !dozen.includes(c));
  rest.forEach((c, k) => c.knob(knobOf(k + 20)));

  const planeDepths = [...range(1, PLANES + 1), FAR];
  const planes = planeDepths
    .slice()
    .reverse()
    .map(k => (
      <Node position={DEPTH.scale(k)} opacity={0}>
        {range(LAYERS_2).flatMap(i =>
          range(ROWS).map(j => (
            <Cog position={[layerX(i), rowY(j)]} teeth={14} radius={R} root={0.84} hole={0.3} fill={'#3a4252'} />
          )),
        )}
      </Node>
    ) as Node);
  const planeOpacity = (k: number) => (k === FAR ? 0.25 : 0.75 - 0.12 * k);

  // --- Slabs, sized by the current model; today's largest as an outline -----
  const size: Size = {
    on: createSignal(0),
    layers: createSignal(MODELS[0].layers),
    heads: createSignal(MODELS[0].heads),
    dim: createSignal(MODELS[0].dim),
  };
  const texture = cogTexture(CY, SLAB.cog, SLAB.front);
  const slabs = range(GPT3.layers).map(i => slab(i, size, texture));
  const today = outline(X0, XT, HT, DT);
  const gpt3Tag = createRef<Txt>();

  const world = createRef<Node>();
  view.add(
    <Node ref={world} scale={SHOT_COG.scale} position={SHOT_COG.position}>
      {today}
      {slabs.slice().reverse()}
      {planes}
      {front.flat().map(c => c.node)}
      <Txt
        ref={gpt3Tag}
        position={[(X0 + X3) / 2, -H3 / 2 + D3.y - 900]}
        fontFamily={font}
        fontSize={900}
        fontWeight={600}
        fill={colors.textLight}
        text={'GPT-3'}
        opacity={0}
      />
    </Node>,
  );

  // --- Close-up: the notch sets the speed ----------------------------------------
  const closeUp = createRef<Node>();
  const arcR = R * SHOT_COG.scale * 1.38;
  const ticks = () => Math.max(1, Math.min(3, Math.round(2 + focus.knob() / 90)));

  // --- Axes: labels that follow the machine as it grows ----------------------
  const axes = createRef<Node>();
  const headsLabel = createRef<Txt>();
  const onScreen = (p: Vector2) => world().position().add(p.scale(world().scale().x));
  const h = () => heightOf(size.heads());
  const d = () => depthOf(size.dim());
  const axisTxt = {fontFamily: font, fontSize: 28, fontWeight: 600, fill: colors.label};
  const n = (s: SimpleSignal<number, void>) => Math.round(s()).toLocaleString('en-US');

  // --- GPT-2 stage only: depth steps and the attention example --------------
  const gpt2 = createRef<Node>();
  const at = (p: Vector2) => toScreen(SHOT_GPT2, p);
  const topCog = new Vector2(layerX(0), rowY(0));
  const depthAt = (k: number) => at(topCog.add(DEPTH.scale(k)).add([-R - 6, -R - 8]));
  const depthTxt = {fontFamily: font, fontSize: 20, fontWeight: 600, fill: colors.embedding, offsetX: 1};
  const tokenY = (k: number) => TOKENS_Y + k * TOKEN_STEP;
  const tokens = SENTENCE.map((t, k) =>
    makeChip(t, colors.token, {
      position: [TOKENS_X, tokenY(k)],
      scale: TOKEN_SCALE,
      lineWidth: k === CURRENT ? 5 : 0,
      stroke: colors.attention,
    }),
  );
  const arcLayer = createRef<Node>();

  // Links from each earlier word into "bank", arching out on the left of the
  // column (as in Scene 6): thicker and brighter when the word matters more.
  function attentionArcs(weights: number[]) {
    const edge = TOKENS_X - (CHIP_W * TOKEN_SCALE) / 2 - 4;
    return weights.map((w, j) => {
      const bulge = 30 + 22 * (CURRENT - j);
      const p0 = new Vector2(edge, tokenY(j));
      const p3 = new Vector2(edge, tokenY(CURRENT));
      return (
        <CubicBezier
          p0={p0}
          p1={p0.addX(-bulge)}
          p2={p3.addX(-bulge)}
          p3={p3}
          stroke={colors.attention}
          lineWidth={2 + 10 * w}
          opacity={0.3 + 0.7 * w}
          endArrow
          arrowSize={8 + 8 * w}
          end={0}
        />
      ) as CubicBezier;
    });
  }

  // --- Counter (bottom right) ----------------------------------------------------
  const counter = createRef<Node>();
  const count = createSignal(Math.log10(12));
  const model = createRef<Txt>();
  const year = createRef<Txt>();
  const magnitude = createRef<Txt>();
  const number = createRef<Txt>();

  const summary = createRef<Rect>();

  view.add(
    <>
      <Node ref={closeUp} opacity={0}>
        <Circle
          position={FOCUS_ON}
          size={arcR * 2}
          startAngle={-150}
          endAngle={-30}
          stroke={colors.label}
          lineWidth={6}
          lineCap={'round'}
          endArrow
          arrowSize={18}
        />
        {range(3).map(k => (
          <Line
            position={FOCUS_ON}
            rotation={() => (k - (ticks() - 1) / 2) * 20} // centered on the top
            points={[[0, -arcR + 15], [0, -arcR - 15]]}
            stroke={colors.textLight}
            lineWidth={6}
            lineCap={'round'}
            opacity={() => (k < ticks() ? 1 : 0)}
          />
        ))}
        <Txt
          position={FOCUS_ON.addY(-arcR - 80)}
          fontFamily={font}
          fontSize={52}
          fontWeight={600}
          fill={colors.textLight}
          text={'adjustable weight (effect)'}
          opacity={0}
        />
      </Node>
      <Node ref={gpt2} opacity={0}>
        {[1, 2, 3, 4].map(k => <Txt {...depthTxt} position={depthAt(k - 1)} text={`${k}`} />)}
        <Txt {...depthTxt} position={depthAt(5)} text={'⋰'} />
        <Node ref={arcLayer} />
        {tokens}
      </Node>
      <Node ref={axes} opacity={0}>
        <Txt
          ref={headsLabel}
          {...axisTxt}
          rotation={-90}
          position={() => onScreen(new Vector2(X0 + d().x, d().y / 2)).addX(-30)}
          text={() => `${n(size.heads)} attention heads`}
        />
        <Txt
          {...axisTxt}
          position={() => onScreen(new Vector2((X0 + xEnd(size.layers())) / 2 + d().x / 2, -h() / 2 + d().y)).addY(-34)}
          text={() => `${n(size.layers)} transformer layers`}
        />
        <Txt
          {...axisTxt}
          offsetX={-1}
          position={() => onScreen(new Vector2(X0 + d().x, -h() / 2 + d().y)).add([-10, -24])}
          fill={colors.embedding}
          text={() => `embedding dimension ${n(size.dim)}`}
        />
      </Node>
      <Node ref={counter} position={[880, 400]} opacity={0}>
        <Txt ref={number} offsetX={1} fontFamily={font} fontSize={68} fontWeight={600} fill={colors.textLight} text={() => fmt(count())} />
        <Txt ref={magnitude} offsetX={1} fontFamily={font} fontSize={68} fontWeight={600} fill={colors.textLight} text={'hundreds of billions'} opacity={0} />
        <Rect layout offset={[1, 0]} y={62} alignItems={'end'} gap={14}>
          <Txt fontFamily={font} fontSize={32} fill={colors.label} text={'weights'} />
          <Txt ref={model} fontFamily={font} fontSize={32} fontWeight={600} fill={colors.textLight} text={''} />
          <Txt ref={year} fontFamily={font} fontSize={22} fill={colors.textMuted} text={''} marginBottom={3} />
        </Rect>
      </Node>
      <Rect
        ref={summary}
        layout
        y={420}
        padding={[22, 40]}
        radius={20}
        fill={colors.appBg}
        stroke={colors.label}
        lineWidth={2}
        opacity={0}
      >
        <Txt fontFamily={font} fontSize={40} fill={colors.textLight}>
          {'diversity of grammar, syntax, knowledge, situations, context, …  ⇒  '}
          <Txt fontWeight={600} fill={colors.index}>billions of knobs</Txt>
        </Txt>
      </Rect>
    </>,
  );

  function* shot(s: Shot, duration: number, ease = easeInOutCubic) {
    yield* all(
      world().scale(s.scale, duration, ease),
      world().position(s.position, duration, ease),
    );
  }
  function* tag(name: string, when: string) {
    yield* all(model().opacity(0, 0.15), year().opacity(0, 0.15));
    model().text(name);
    year().text(when);
    yield* all(model().opacity(1, 0.2), year().opacity(1, 0.2));
  }
  // One head's look back: the links flash in with the heads' label, hold,
  // and fade.
  function* flash(weights: number[]) {
    const arcs = attentionArcs(weights);
    arcLayer().add(arcs);
    yield* all(
      ...arcs.map(a => a.end(1, 0.4, easeInOutCubic)),
      headsLabel().fill(colors.attention, 0.3),
    );
    yield* waitFor(0.5);
    yield* all(
      ...arcs.map(a => a.opacity(0, 0.3)),
      headsLabel().fill(colors.label, 0.3),
    );
    arcLayer().removeChildren();
  }
  // Grow the machine to model m: every dimension and the counter together.
  function* growTo(m: Model, duration: number) {
    yield* all(
      shot(shotOf(m), duration, easeInOutSine),
      size.layers(m.layers, duration, easeInOutSine),
      size.heads(m.heads, duration, easeInOutSine),
      size.dim(m.dim, duration, easeInOutSine),
      count(Math.log10(m.weights), duration, easeInOutSine),
      tag(m.name, m.year),
    );
  }

  // Every cog turns at the speed its notch sets, all scene long.
  yield driveCogs(front.flat());

  // --- One cog: an adjustable weight -------------------------------------------
  yield* all(focus.node.opacity(1, 0.8), closeUp().opacity(1, 0.8));
  yield* waitFor(1.2);

  yield* waitUntil('tune');
  const label = closeUp().children()[closeUp().children().length - 1];
  yield* all(label.opacity(1, 0.8), focus.knob(-90, 1.0, easeInOutCubic));
  yield* waitFor(1.8);
  yield* focus.knob(90, 1.2, easeInOutCubic);
  yield* waitFor(1.8);
  yield* focus.knob(0, 0.8, easeInOutCubic);
  yield* waitFor(0.8);

  // --- A dozen cogs, each set differently ----------------------------------------
  yield* waitUntil('dozen');
  yield* all(closeUp().opacity(0, 0.5), shot(SHOT_DOZEN, 1.4));
  yield* all(
    sequence(0.06, ...dozen.map(c => c.node.scale(1, 0.4, easeOutBack))),
    counter().opacity(1, 0.6),
  );
  yield* all(...[focus, ...dozen].map((c, k) => c.knob(knobOf(k + 3), 0.8, easeInOutCubic)));
  yield* waitFor(2);

  // --- GPT-2 small: 12 layers × 12 heads × 768 dimensions ---------------------
  yield* waitUntil('gpt2');
  yield* all(
    shot(SHOT_GPT2, 2.2),
    sequence(0.004, ...rest.map(c => c.node.scale(1, 0.4, easeOutBack))),
  );
  yield* all(
    sequence(0.25, ...planes.slice().reverse().map((p, k) => p.opacity(planeOpacity(planeDepths[k]), 0.5))),
    gpt2().opacity(1, 1.0),
    axes().opacity(1, 1.0),
    count(Math.log10(MODELS[0].weights), 2.4, easeInOutCubic),
    tag(MODELS[0].name, MODELS[0].year),
  );
  yield* waitFor(1);

  // "bank" looks back at the earlier words, a little differently in each head.
  yield* waitUntil('attention');
  for (const weights of PATTERNS) yield* flash(weights);
  yield* waitFor(1);

  // --- Bigger and bigger: GPT-2 medium, large, XL, then GPT-3 ----------------
  yield* waitUntil('gpt3');
  const cogsAndPlanes = [...front.flat().map(c => c.node), ...planes];
  yield* all(
    gpt2().opacity(0, 0.6),
    ...cogsAndPlanes.map(c => c.opacity(0, 0.8)),
    size.on(1, 0.8),
  );
  for (const m of MODELS.slice(1, -1)) {
    yield* growTo(m, 1.3);
    yield* waitFor(0.4); // a beat on each, so it registers
  }
  yield* growTo(GPT3, 2.2);
  yield* waitFor(2);

  // --- Today's largest: hundreds of billions -----------------------------------
  yield* waitUntil('today');
  yield* all(
    axes().opacity(0, 0.5),
    shot(SHOT_TODAY, 2.2),
    gpt3Tag().opacity(1, 1.0),
    ...today.map(l => l.end(1, 2.2, easeInOutCubic)),
    number().opacity(0, 0.5),
    magnitude().opacity(1, 0.8),
    tag("today's largest models", ''),
  );
  yield* waitFor(2);

  // --- Why so many? -----------------------------------------------------------
  yield* waitUntil('why');
  yield* all(counter().opacity(0, 0.6), summary().opacity(1, 0.8));
  yield* waitFor(4);

  // Clear the stage for Scene 9.
  yield* all(...view.children().map(c => c.opacity(0, 0.8)));
});

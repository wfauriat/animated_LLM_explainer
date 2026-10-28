// Scene 4b — Embedding. One index ("rain", 6290) goes through the embedding
// block and comes out as a set of directions: a stack of compass dials, one
// per dimension, receding in depth (the first 3, "⋰" = many more, then the
// last one). The block then folds,
// and the representative rows get their compass stacks at the core entrance.
import {CubicBezier, makeScene2D, Node, Rect, Txt} from '@motion-canvas/2d';
import {
  all,
  createRef,
  easeInCubic,
  easeInOutCubic,
  easeOutCubic,
  range,
  sequence,
  Vector2,
  waitFor,
  waitUntil,
} from '@motion-canvas/core';
import {colors, font} from '../theme';
import {createCompassStack, dialIn, popStack} from '../scene4/Compass';
import {
  CHIP_W,
  CORE_ELLIPSIS_Y,
  CORE_IN_X,
  CORE_ROWS,
  DEPTH,
  DIAL,
  DIMS,
  EMBED_X,
  embeddingAngle,
  FOLDED_SCALE,
  IDS,
  INDEX_X,
  rowY,
  SPINE_H,
  SPINE_Y,
} from '../scene4/layout';
import {createFoldedInput, makeChip, makeLabel} from '../scene4/parts';

const CLOSE_UP_TOKEN = 2; // "rain"
const SLAB = {x: -80, w: 130, h: 560};
const BIG_DIAL = 150;
const BIG_DEPTH = new Vector2(-70, -58);

const anglesOf = (id: number) => range(DIMS).map(k => embeddingAngle(id, k));

export default makeScene2D(function* (view) {
  view.fill(colors.machineBg);

  // Starts on 4a's last frame.
  const input = createFoldedInput();
  const label = makeLabel('Embedding');
  label.position([0, -470]).opacity(0);
  const slab = createRef<Rect>();
  const id = IDS[CLOSE_UP_TOKEN];
  const copy = makeChip(String(id), colors.index);
  copy.opacity(0);
  const big = createCompassStack({dims: DIMS, size: BIG_DIAL, depth: BIG_DEPTH});
  big.node.position([SLAB.x, 0]).opacity(0).scale(0.3);
  const guides = createRef<Node>();
  const stacks = CORE_ROWS.map(() =>
    createCompassStack({dims: DIMS, size: DIAL, depth: DEPTH}),
  );
  stacks.forEach((s, i) => s.node.position([CORE_IN_X, CORE_ROWS[i].y]).opacity(0));
  const ellipsis = createRef<Txt>();
  const spineLabel = createRef<Txt>();

  view.add(
    <>
      {input.node}
      {copy}
      {big.node}
      <Rect
        ref={slab}
        x={SLAB.x}
        width={SLAB.w}
        height={SLAB.h}
        radius={40}
        fill={colors.embedding}
        opacity={0}
        scale={0.9}
      />
      <Txt
        ref={spineLabel}
        position={[EMBED_X, SPINE_Y]}
        rotation={-90}
        fontFamily={font}
        fontSize={22}
        fontWeight={600}
        fill={colors.tokenText}
        text={'Embedding'}
        opacity={0}
      />
      <Node ref={guides} />
      {stacks.map(s => s.node)}
      <Txt
        ref={ellipsis}
        position={[CORE_IN_X, CORE_ELLIPSIS_Y]}
        fontFamily={font}
        fontSize={44}
        fill={colors.label}
        text={'⋮'}
        opacity={0}
      />
      {label}
    </>,
  );

  // --- The embedding block ------------------------------------------------
  yield* waitFor(0.5);
  yield* waitUntil('embedding');
  yield* all(
    label.opacity(1, 0.6),
    slab().opacity(1, 0.5),
    slab().scale(1, 0.6, easeOutCubic),
  );

  // --- One index goes in, a set of directions comes out -------------------
  yield* waitUntil('close-up');
  const src = input.indexChips[CLOSE_UP_TOKEN];
  copy.position(src.position()).scale(FOLDED_SCALE).opacity(1);
  yield* src.lineWidth(4, 0.3);
  yield* all(
    copy.position([-430, 0], 1.0, easeInOutCubic),
    copy.scale(1.3, 1.0, easeInOutCubic),
    src.lineWidth(0, 0.6),
  );
  yield* waitFor(0.4);
  yield* all(
    copy.x(SLAB.x, 0.7, easeInCubic),
    copy.scale(0.8, 0.7, easeInCubic),
  );
  copy.opacity(0);
  yield* all(
    big.node.opacity(1, 0.4),
    big.node.position([430, 140], 1.0, easeOutCubic),
    big.node.scale(1, 1.0, easeOutCubic),
  );
  yield* dialIn(big, anglesOf(id), 1.4, 0.3, 2);
  yield* waitFor(2.5);

  // --- Fold the block; every row gets its own stack -----------------------
  yield* waitUntil('fold');
  yield* all(big.node.opacity(0, 0.6), big.node.scale(0.6, 0.6));
  const fold = 1.4;
  yield* all(
    slab().position([EMBED_X, SPINE_Y], fold, easeInOutCubic),
    slab().width(44, fold, easeInOutCubic),
    slab().height(SPINE_H, fold, easeInOutCubic),
    slab().radius(22, fold, easeInOutCubic),
    label.opacity(0, fold * 0.5),
    spineLabel().opacity(1, fold),
  );

  yield* waitUntil('rows');
  const represented = new Set(CORE_ROWS.map(r => r.token));
  // Rows not drawn in the core are summarized by "⋮".
  yield* all(
    ...input.indexChips
      .filter((_, i) => !represented.has(i))
      .map(c => c.opacity(0.45, 0.6)),
  );
  yield* sequence(
    0.45,
    ...CORE_ROWS.map(({token, y}, i) => {
      const from = new Vector2(INDEX_X + (CHIP_W * FOLDED_SCALE) / 2 + 4, rowY(token));
      const to = new Vector2(CORE_IN_X - DIAL / 2 - 8, y);
      const guide = createRef<CubicBezier>();
      guides().add(
        <CubicBezier
          ref={guide}
          p0={from}
          p1={from.addX(90)}
          p2={to.addX(-90)}
          p3={to}
          stroke={colors.embedding}
          lineWidth={3}
          opacity={0.7}
          end={0}
        />,
      );
      return all(
        input.indexChips[token].lineWidth(3, 0.2).to(0, 0.6),
        guide().end(1, 0.6, easeInOutCubic),
        sequence(0.4, popStack(stacks[i]), dialIn(stacks[i], anglesOf(IDS[token]), 0.8, 0.08)),
      );
    }),
  );
  yield* ellipsis().opacity(1, 0.5);
  yield* waitFor(2);
});

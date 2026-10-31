// Output side of the machine: un-embedding + softmax (scores against every
// token's embedding, turned into probabilities), the Top-5 candidate indices,
// the dictionary read backwards (index -> word), the "generative" roulette that
// picks one, and the N+1 loop that appends it to the input.
import {Circle, CubicBezier, Line, Node, Rect, Txt} from '@motion-canvas/2d';
import {createRef, Vector2} from '@motion-canvas/core';
import {colors, font} from '../theme';
import {
  CHIP_W,
  FOLDED_SCALE,
  GEN_LABEL_X,
  LABEL_SCALE,
  N1_X,
  N1_Y,
  OUT_ELLIPSIS_Y,
  OUT_LABEL_Y,
  OUT_ROWS_Y,
  PICKED,
  QUESTION_ROW,
  rowY,
  UNEMBED_H,
  UNEMBED_X,
  UNEMBED_Y,
  SPINE_H,
  SPINE_Y,
  TOKENS_X,
  TOP5,
  TOP5_X,
  LOOKUP_X,
  WORDS_X,
} from './layout';
import {makeChip, makeLabel} from './parts';

const HALF_CHIP = (CHIP_W * FOLDED_SCALE) / 2;
const CANDIDATE_OPACITY = 0.55;

export interface Top5Entry {
  chip: Rect;
  pct: Txt;
  bar: Rect;
}

export interface Output {
  node: Node;
  unembed: Rect;
  unembedLabel: Txt;
  label: Txt; // "Top-5"
  entries: Top5Entry[];
  more: Txt;
  lookup: Rect;
  lookupLabel: Txt;
  guides: CubicBezier[];
  words: Rect[];
  genLabel: Txt; // "Generative"
  arrow: Line; // N+1 loop
  arrowLabel: Txt;
  appended: Rect; // the picked word, once in the input column
}

// `done`: true = final state (word picked and appended), false = all hidden.
export function createOutput(done: boolean): Output {
  const show = done ? 1 : 0;
  const unembed = (
    <Rect
      x={UNEMBED_X}
      y={UNEMBED_Y}
      width={44}
      height={done ? UNEMBED_H : 0}
      radius={22}
      fill={colors.embedding}
    />
  ) as Rect;
  const unembedLabel = (
    <Txt
      x={UNEMBED_X}
      y={UNEMBED_Y}
      rotation={-90}
      fontFamily={font}
      fontSize={22}
      fontWeight={600}
      fill={colors.tokenText}
      text={'Un-embedding + softmax'}
      opacity={show}
    />
  ) as Txt;
  const label = makeLabel('Top-5');
  label.position([TOP5_X + 30, OUT_LABEL_Y]).scale(LABEL_SCALE).opacity(show);
  const entries = TOP5.map(({id, p}, i) => {
    const y = OUT_ROWS_Y[i];
    return {
      chip: makeChip(String(id), colors.index, {
        position: [TOP5_X, y],
        scale: FOLDED_SCALE,
        opacity: show,
      }),
      pct: (
        <Txt
          x={TOP5_X + HALF_CHIP + 10}
          y={y}
          offsetX={-1}
          fontFamily={font}
          fontSize={26}
          fontWeight={600}
          fill={colors.textLight}
          text={`${Math.round(p * 100)}%`}
          opacity={show}
        />
      ) as Txt,
      bar: (
        <Rect
          x={TOP5_X - HALF_CHIP}
          y={y + 30}
          offsetX={-1}
          width={done ? (2 * HALF_CHIP * p) / TOP5[0].p : 0}
          height={6}
          radius={3}
          fill={colors.index}
        />
      ) as Rect,
    };
  });
  const more = (
    <Txt x={TOP5_X} y={OUT_ELLIPSIS_Y} fontFamily={font} fontSize={36} fill={colors.label} text={'⋮'} opacity={show} />
  ) as Txt;

  const lookup = (
    <Rect
      x={LOOKUP_X}
      y={SPINE_Y}
      width={30}
      height={done ? SPINE_H : 0}
      radius={15}
      fill={colors.dictionary}
      stroke={'#b9a56e'}
      lineWidth={4}
      opacity={show} // its outline would show at height 0
    />
  ) as Rect;
  const lookupLabel = (
    <Txt
      x={LOOKUP_X}
      y={SPINE_Y}
      rotation={-90}
      fontFamily={font}
      fontSize={22}
      fontWeight={600}
      fill={colors.dictionaryText}
      text={'Dictionary (inverse lookup)'}
      opacity={show}
    />
  ) as Txt;

  const guides = OUT_ROWS_Y.map(y => {
    const from = new Vector2(TOP5_X + HALF_CHIP + 72, y);
    const to = new Vector2(WORDS_X - HALF_CHIP - 6, y);
    return (
      <CubicBezier
        p0={from}
        p1={from.addX(50)}
        p2={to.addX(-50)}
        p3={to}
        stroke={colors.dictionary}
        lineWidth={3}
        opacity={0.7}
        end={show}
      />
    ) as CubicBezier;
  });
  const words = TOP5.map(({word}, i) =>
    makeChip(word, colors.botBubble, {
      position: [WORDS_X, OUT_ROWS_Y[i]],
      scale: FOLDED_SCALE,
      opacity: done ? (i === PICKED ? 1 : CANDIDATE_OPACITY) : 0,
    }),
  );
  const genLabel = makeLabel('Generative pick');
  genLabel.position([GEN_LABEL_X, OUT_LABEL_Y]).scale(LABEL_SCALE).opacity(show);

  // N+1: from the picked word, down the right edge, along the bottom, and up
  // into the "?" slot of the input column.
  const pickedY = OUT_ROWS_Y[PICKED];
  const slot = rowY(QUESTION_ROW);
  const arrow = (
    <Line
      points={[
        [WORDS_X + HALF_CHIP + 6, pickedY],
        [N1_X, pickedY],
        [N1_X, N1_Y],
        [TOKENS_X, N1_Y],
        [TOKENS_X, slot + 30],
      ]}
      radius={40}
      stroke={colors.flowOut}
      lineWidth={4}
      endArrow
      arrowSize={14}
      end={show}
    />
  ) as Line;
  const arrowLabel = (
    <Txt
      x={0}
      y={N1_Y - 26}
      fontFamily={font}
      fontSize={30}
      fontWeight={600}
      fill={colors.flowOut}
      text={'N+1'}
      opacity={show}
    />
  ) as Txt;
  const appended = makeChip(TOP5[PICKED].word, colors.botBubble, {
    position: [TOKENS_X, slot],
    scale: FOLDED_SCALE,
    opacity: show,
  });

  const node = (
    <Node>
      {unembed}
      {unembedLabel}
      {guides}
      {lookup}
      {lookupLabel}
      {entries.flatMap(e => [e.bar, e.chip, e.pct])}
      {more}
      {words}
      {arrow}
      {arrowLabel}
      {appended}
      {label}
      {genLabel}
    </Node>
  ) as Node;
  return {
    node,
    unembed,
    unembedLabel,
    label,
    entries,
    more,
    lookup,
    lookupLabel,
    guides,
    words,
    genLabel,
    arrow,
    arrowLabel,
    appended,
  };
}

// ---------------------------------------------------------------------------
// Roulette: slices sized by probability; "…" is everything outside the Top-5.

const SLICE_FILLS = ['#a8e6b0', '#d3f2cf', '#8fd49a', '#c2ecc5', '#b5e8bb'];

export interface Roulette {
  node: Node;
  wheel: Node;
  slices: Circle[];
  /** Wheel rotation that brings slice `i` under the pointer (plus turns). */
  rotationFor(i: number, turns: number): number;
}

// `entries` default to Scene 4's Top-5; what's left of the wheel is a "…" slice.
export function createRoulette(
  radius: number,
  entries: {word: string; p: number}[] = TOP5,
): Roulette {
  const others = 1 - entries.reduce((a, t) => a + t.p, 0);
  const parts = [...entries.map(t => ({label: t.word, p: t.p})), {label: '…', p: others}];
  const wheel = createRef<Node>();
  const slices: Circle[] = [];
  let start = -90; // first slice starts under the pointer (top)
  const centers: number[] = [];

  const node = (
    <Node>
      <Node ref={wheel}>
        {parts.map(({label, p}, i) => {
          const sweep = 360 * p;
          const mid = start + sweep / 2;
          centers.push(mid);
          const slice = (
            <Circle
              size={radius * 2}
              startAngle={start}
              endAngle={start + sweep}
              closed
              fill={i < entries.length ? SLICE_FILLS[i] : '#3a3f4a'}
              stroke={colors.machineBg}
              lineWidth={5}
            />
          ) as Circle;
          slices.push(slice);
          start += sweep;
          const at = Vector2.fromDegrees(mid).scale(radius * 0.66);
          return (
            <Node>
              {slice}
              <Txt
                position={at}
                rotation={mid + 90}
                fontFamily={font}
                fontSize={i < entries.length ? 34 : 40}
                fontWeight={600}
                fill={i < entries.length ? colors.tokenText : colors.textLight}
                text={label}
              />
            </Node>
          );
        })}
      </Node>
      <Circle size={radius * 0.18} fill={colors.steel} stroke={colors.steelDark} lineWidth={4} />
      <Line
        points={[
          [-22, -radius - 34],
          [22, -radius - 34],
          [0, -radius + 8],
        ]}
        closed
        fill={colors.textLight}
        stroke={colors.machineBg}
        lineWidth={3}
      />
    </Node>
  ) as Node;

  return {
    node,
    wheel: wheel(),
    slices,
    rotationFor(i, turns) {
      // the pointer is at -90 degrees
      const r = (((-90 - centers[i]) % 360) + 360) % 360;
      return r + 360 * turns;
    },
  };
}

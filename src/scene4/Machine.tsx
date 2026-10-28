// The whole Scene 4 machine, rebuilt in the state a given sub-scene starts
// from (4c, 4d or 5a), so each sub-scene continues frame-exactly.
import {CubicBezier, Node, Rect, Txt} from '@motion-canvas/2d';
import {Vector2} from '@motion-canvas/core';
import {colors, font} from '../theme';
import {Core, createCore, setCoreState} from './Core';
import {
  CHIP_W,
  CORE_IN_X,
  CORE_ROWS,
  DIAL,
  EMBED_X,
  FOLDED_SCALE,
  INDEX_X,
  LAYER_X,
  rowY,
  UNEMBED_X,
  SPINE_H,
  SPINE_Y,
  STEPS,
} from './layout';
import {createOutput, Output} from './Output';
import {createFoldedInput, FoldedInput} from './parts';

export type Stage = '4c' | '4d' | '5a';

export interface Machine {
  node: Node;
  input: FoldedInput;
  guides: CubicBezier[]; // index -> core entrance (from 4b)
  core: Core;
  output: Output;
}

// Index chip -> compass stack at the core entrance, through the embedding.
function embeddingGuides() {
  return CORE_ROWS.map(({token, y}) => {
    const from = new Vector2(INDEX_X + (CHIP_W * FOLDED_SCALE) / 2 + 4, rowY(token));
    const to = new Vector2(CORE_IN_X - DIAL / 2 - 8, y);
    return (
      <CubicBezier
        p0={from}
        p1={from.addX(90)}
        p2={to.addX(-90)}
        p3={to}
        stroke={colors.embedding}
        lineWidth={3}
        opacity={0.7}
      />
    ) as CubicBezier;
  });
}

export function createMachine(stage: Stage): Machine {
  const input = createFoldedInput();
  const represented = new Set(CORE_ROWS.map(r => r.token));
  input.indexChips.forEach((c, i) => c.opacity(represented.has(i) ? 1 : 0.45));

  const guides = embeddingGuides();
  const core = createCore();
  const output = createOutput(stage === '5a');

  if (stage === '4c') {
    // Only the stacks at the entrance exist yet.
    core.panels.forEach(p => p.opacity(0));
    core.cogs.flat().forEach(c => c.scale(0));
    [core.more, core.label, core.drive, core.crank].forEach(n => n.opacity(0));
  } else {
    setCoreState(core, STEPS, LAYER_X[LAYER_X.length - 1]);
    core.rowsEllipsis.opacity(0);
    guides.forEach(g => g.opacity(0.3));
  }
  if (stage === '5a') {
    // The last row has gone through un-embedding + softmax to become the Top-5.
    const last = core.rows[core.rows.length - 1];
    last.x(UNEMBED_X);
    last.dials.forEach(d => d.node.opacity(0));
    last.dots.opacity(0);
    input.question.opacity(0);
  }

  const node = (
    <Node>
      {input.node}
      <Rect
        x={EMBED_X}
        y={SPINE_Y}
        width={44}
        height={SPINE_H}
        radius={22}
        fill={colors.embedding}
      />
      <Txt
        x={EMBED_X}
        y={SPINE_Y}
        rotation={-90}
        fontFamily={font}
        fontSize={22}
        fontWeight={600}
        fill={colors.tokenText}
        text={'Embedding'}
      />
      {guides}
      {core.node}
      {output.node}
    </Node>
  ) as Node;

  return {node, input, guides, core, output};
}

// A token's embedding drawn as "compass" dials receding in depth: one dial per
// dimension, then "⋰" for the many dimensions not drawn. Each dial has a
// toothed rim, so it can mesh with the cogs of the transformer core.
import {brightness, Circle, Line, Node} from '@motion-canvas/2d';
import {
  all,
  createRef,
  easeOutCubic,
  range,
  sequence,
  Vector2,
} from '@motion-canvas/core';
import {Cog} from '../components/Cog';
import {colors} from '../theme';

export interface Dial {
  node: Node;
  rim: Node; // toothed rim, turned by the cogs
  arrow: Node; // rotation = direction of this dimension
}

// `shade` < 1 darkens the dial (further back in depth). Opaque on purpose, so
// arrows behind never show through.
export function createDial(size: number, shade = 1, angle = 0): Dial {
  const node = createRef<Node>();
  const rim = createRef<Node>();
  const arrow = createRef<Node>();
  const r = size / 2;
  <Node ref={node} filters={shade < 1 ? [brightness(shade)] : []}>
    <Node ref={rim}>
      <Cog teeth={12} radius={r} root={0.84} hole={0} />
    </Node>
    <Circle size={size * 0.72} fill={colors.dialFace} />
    <Node ref={arrow} rotation={angle}>
      <Line
        points={[
          [0, 0],
          [r * 0.66, 0],
        ]}
        stroke={colors.steelDark}
        lineWidth={size * 0.06}
        endArrow
        arrowSize={size * 0.15}
      />
    </Node>
    <Circle size={size * 0.1} fill={colors.steelDark} />
  </Node>;
  return {node: node(), rim: rim(), arrow: arrow()};
}

// "⋰" continuing the stack beyond the last drawn dimension.
export function createDepthDots(size: number, depth: Vector2, dims: number) {
  return (
    <Node>
      {range(3).map(j => (
        <Circle position={depth.scale(dims + j * 0.35)} size={size * 0.09} fill={colors.label} />
      ))}
    </Node>
  ) as Node;
}

// Shade of the dial at depth k (0 = front).
export const depthShade = (k: number) => 1 - k * 0.16;

export interface CompassStack {
  node: Node;
  dials: Dial[]; // front first
  arrows: Node[]; // front first
  ellipsis: Node;
}

export function createCompassStack({
  dims,
  size,
  depth,
  angles,
}: {
  dims: number;
  size: number;
  depth: Vector2;
  angles?: number[]; // initial arrow directions, default 0
}): CompassStack {
  const ellipsis = createDepthDots(size, depth, dims);
  const dials = range(dims).map(k => createDial(size, depthShade(k), angles?.[k] ?? 0));
  dials.forEach((d, k) => d.node.position(depth.scale(k)));
  const node = (
    <Node>
      {ellipsis}
      {/* back to front, so nearer dials cover farther ones */}
      {[...dials].reverse().map(d => d.node)}
    </Node>
  ) as Node;
  return {node, dials, arrows: dials.map(d => d.arrow), ellipsis};
}

// Spin every dial to its target direction, back dims first, like setting a
// combination lock. `turns` extra full turns make the motion readable.
export function* dialIn(
  stack: CompassStack,
  angles: number[],
  duration = 1.2,
  stagger = 0.15,
  turns = 1,
) {
  yield* sequence(
    stagger,
    ...stack.arrows
      .map((arrow, k) =>
        arrow.rotation(angles[k] + 360 * turns, duration, easeOutCubic),
      )
      .reverse(),
  );
}

export function* popStack(stack: CompassStack, duration = 0.4) {
  stack.node.opacity(0).scale(0.6);
  yield* all(
    stack.node.opacity(1, duration),
    stack.node.scale(1, duration, easeOutCubic),
  );
}

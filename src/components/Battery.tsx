// Upright battery feeding the server through a short power cable.
import {Line, Node, Rect} from '@motion-canvas/2d';
import {
  createRef,
  createSignal,
  range,
  SimpleSignal,
  Vector2,
} from '@motion-canvas/core';
import {Clock, Curve, FlowDots} from './Flow';
import {colors} from '../theme';

const BODY_W = 110;
const BODY_H = 170;

export interface Battery {
  node: Node; // battery body, slides in
  cable: Line;
  flow: Node;
  level: SimpleSignal<number, void>; // charge, in bars (0-4)
}

// `at`: battery center; `to`: where the cable plugs into the machine.
export function createBattery(clock: Clock, at: Vector2, to: Vector2): Battery {
  const node = createRef<Node>();
  const cable = createRef<Line>();
  const flow = createRef<Node>();
  const level = createSignal(4);
  const top = at.addY(-BODY_H / 2 - 14);
  const path: Curve = {
    p0: top,
    p1: top.lerp(to, 1 / 3),
    p2: top.lerp(to, 2 / 3),
    p3: to,
  };

  <Node ref={node} position={at}>
    <Rect y={-BODY_H / 2 - 7} width={44} height={14} radius={[5, 5, 0, 0]} fill={colors.battery} />
    <Rect width={BODY_W} height={BODY_H} radius={14} fill={'#14161b'} stroke={colors.battery} lineWidth={7}>
      {range(4).map(i => (
        <Rect
          y={54 - i * 36}
          width={78}
          height={28}
          radius={4}
          fill={colors.energy}
          opacity={() =>
            Math.min(1, Math.max(0.12, level() - i)) *
            (0.55 + 0.45 * Math.max(0, Math.sin(clock() * 3 - i * 0.8)))
          }
        />
      ))}
      <Line
        points={[[8, -42], [-24, 6], [-2, 6], [-10, 42], [24, -8], [2, -8]]}
        closed
        fill={'#fff6d8'}
        stroke={'#14161b'}
        lineWidth={4}
      />
    </Rect>
  </Node>;

  return {
    node: node(),
    cable: (
      <Line ref={cable} points={[top, to]} stroke={colors.cable} lineWidth={10} lineCap={'round'} end={0} />
    ) as Line,
    flow: (
      <Node ref={flow} opacity={0}>
        <FlowDots curve={path} clock={clock} color={colors.energy} spacing={34} speed={60} width={12} />
      </Node>
    ) as Node,
    level,
  };
}

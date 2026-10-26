import {CubicBezier, CubicBezierProps} from '@motion-canvas/2d';
import {
  PossibleVector2,
  SignalValue,
  SimpleSignal,
  Vector2,
} from '@motion-canvas/core';

export type Clock = SimpleSignal<number, void>;

export interface Curve {
  p0: SignalValue<PossibleVector2>;
  p1: SignalValue<PossibleVector2>;
  p2: SignalValue<PossibleVector2>;
  p3: SignalValue<PossibleVector2>;
}

// Smooth curve from `from` into `port`, arriving along `normal` (pointing
// outward from the port).
export function curveTo(
  from: () => Vector2,
  port: Vector2,
  normal: Vector2,
  reach = 130,
): Curve {
  const p2 = port.add(normal.scale(reach));
  return {
    p0: from,
    p1: () => from().add(p2.sub(from()).scale(0.4)),
    p2,
    p3: port,
  };
}

// Glowing dots travelling along a curve, driven by the scene clock.
// dir = 1 travels p0 -> p3, dir = -1 travels p3 -> p0.
export function FlowDots({
  curve,
  clock,
  color,
  dir = 1,
  spacing = 70,
  speed = 90,
  phase = 0,
  width = 10,
  ...rest
}: {
  curve: Curve;
  clock: Clock;
  color: string;
  dir?: number;
  spacing?: number;
  speed?: number;
  phase?: number;
  width?: number;
} & Omit<CubicBezierProps, 'p0' | 'p1' | 'p2' | 'p3'>) {
  return (
    <CubicBezier
      {...curve}
      stroke={color}
      lineWidth={width}
      lineCap={'round'}
      lineDash={[0.5, spacing]}
      lineDashOffset={() => -dir * (clock() * speed + phase)}
      shadowColor={color}
      shadowBlur={width * 1.5}
      {...rest}
    />
  );
}

// Gear outline with trapezoidal teeth (port of scratch/wheel.py), centered
// on the origin.
import {Circle, Line, Node, NodeProps, Path, PathProps, Pattern} from '@motion-canvas/2d';
import {
  all,
  chain,
  createRef,
  createSignal,
  delay,
  easeInOutCubic,
  linear,
  range,
  SimpleSignal,
  ThreadGenerator,
  useTime,
  Vector2,
  waitFor,
} from '@motion-canvas/core';
import {colors} from '../theme';

export function cogPath(
  teeth: number,
  rOuter: number,
  rRoot: number,
  rHole: number,
  tipFrac = 0.3,
  baseFrac = 0.5,
) {
  const pitch = (2 * Math.PI) / teeth;
  const pt = (r: number, a: number) =>
    `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;

  const d: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const a0 = i * pitch;
    const p1 = pt(rRoot, a0 - (baseFrac * pitch) / 2);
    d.push(i === 0 ? `M ${p1}` : `A ${rRoot} ${rRoot} 0 0 1 ${p1}`);
    d.push(`L ${pt(rOuter, a0 - (tipFrac * pitch) / 2)}`);
    d.push(`L ${pt(rOuter, a0 + (tipFrac * pitch) / 2)}`);
    d.push(`L ${pt(rRoot, a0 + (baseFrac * pitch) / 2)}`);
  }
  d.push(`A ${rRoot} ${rRoot} 0 0 1 ${pt(rRoot, -(baseFrac * pitch) / 2)} Z`);
  // Central hole, wound the other way so the nonzero fill rule cuts it out.
  if (rHole > 0) {
    d.push(
      `M ${-rHole} 0 a ${rHole} ${rHole} 0 1 0 ${2 * rHole} 0 ` +
        `a ${rHole} ${rHole} 0 1 0 ${-2 * rHole} 0 Z`,
    );
  }
  return d.join(' ');
}

export function Cog({
  teeth = 9,
  radius = 100,
  root = 0.8,
  hole = 0.25,
  ...props
}: {
  teeth?: number;
  radius?: number;
  root?: number; // root radius as a fraction of `radius`
  hole?: number; // hole radius as a fraction of `radius`
} & Omit<PathProps, 'data'>) {
  return (
    <Path
      data={cogPath(teeth, radius, radius * root, radius * hole)}
      fill={colors.steel}
      stroke={colors.steelDark}
      lineWidth={Math.max(1.5, radius * 0.03)}
      lineJoin={'round'}
      {...props}
    />
  );
}

// An adjustable weight: a cog turning around a fixed hub whose notch is a
// control knob. The notch sets how fast the cog turns (its effect): pointing
// left = slow, up = medium, right = fast.
export interface TunableCog {
  node: Node;
  body: Path; // the toothed wheel (its fill can be changed)
  radius: number;
  spin: SimpleSignal<number, void>; // the teeth turning
  knob: SimpleSignal<number, void>; // the notch, -90 (left) to 90 (right)
}

export const TUNABLE_FILL = colors.cog;

// Turning speed (degrees per second) for a notch setting.
export const cogSpeed = (knob: number) => 40 * (2 + knob / 90);

export function createTunableCog(radius: number, props: NodeProps = {}): TunableCog {
  const spin = createSignal(0);
  const knob = createSignal(0);
  const hub = radius * 0.46;
  const body = createRef<Path>();
  const node = (
    <Node {...props}>
      <Cog ref={body} teeth={14} radius={radius} root={0.84} hole={0} fill={TUNABLE_FILL} rotation={spin} />
      {range(5).map(i => (
        <Line
          rotation={-90 + i * 45}
          points={[[0, -hub - radius * 0.07], [0, -hub - radius * 0.17]]}
          stroke={colors.steelDark}
          lineWidth={radius * 0.045}
          lineCap={'round'}
        />
      ))}
      <Circle size={hub * 2} fill={colors.steelDark} stroke={colors.steel} lineWidth={radius * 0.03} />
      <Line
        rotation={knob}
        points={[[0, -hub * 0.15], [0, -hub * 0.82]]}
        stroke={colors.dialFace}
        lineWidth={radius * 0.1}
        lineCap={'round'}
      />
    </Node>
  ) as Node;
  return {node, body: body(), radius, spin, knob};
}

// Turns a cog's notch by `delta` (clamped to -90..90), with a trace around the
// cog showing which way and how far. `layer` holds the trace and must share
// the cog's coordinate space.
export function* turnNotch(cog: TunableCog, delta: number, duration: number, layer: Node, color = colors.error) {
  const from = cog.knob();
  const to = Math.max(-90, Math.min(90, from + delta));
  const trace = (
    <Circle
      position={cog.node.position()}
      size={(cog.radius + 12) * 2}
      startAngle={from - 90}
      endAngle={() => cog.knob() - 90}
      counterclockwise={to < from}
      stroke={color}
      lineWidth={5}
      lineCap={'round'}
      endArrow
      arrowSize={11}
      opacity={0}
    />
  ) as Circle;
  layer.add(trace);
  yield* all(
    trace.opacity(1, 0.15),
    cog.knob(to, duration, easeInOutCubic),
    cog.node.scale(1.15, duration / 2).to(1, duration / 2),
  );
  yield* trace.opacity(0, 0.3);
  trace.remove();
}

// A correction signal: three arcs spread from `from` across the cogs, and each
// notch turns (by its delta) as the wavefront reaches it. `waves` and `traces`
// share the cogs' coordinate space.
export function* correctionWave({
  waves,
  traces,
  from,
  arc,
  reach,
  travel,
  width,
  turns,
  turnTime,
  spacing = 36,
  start = 30,
}: {
  waves: Node;
  traces: Node;
  from: Vector2;
  arc: [number, number]; // start and end angle
  reach: number; // radius at which the wave ends
  travel: number; // seconds
  width: number;
  turns: [TunableCog, number][];
  turnTime: number;
  spacing?: number;
  start?: number;
}) {
  const front = createSignal(start);
  const fade = createSignal(0);
  const arcs = range(3).map(
    i =>
      (
        <Circle
          position={from}
          size={() => Math.max(0, front() - i * spacing) * 2}
          startAngle={arc[0]}
          endAngle={arc[1]}
          stroke={colors.error}
          lineWidth={width}
          lineCap={'round'}
          opacity={() => fade() * (1 - i * 0.3)}
        />
      ) as Circle,
  );
  waves.add(arcs);
  const reached = (cog: TunableCog) => {
    const d = cog.node.position().sub(from).magnitude - cog.radius;
    return (Math.max(0, d - start) / (reach - start)) * travel;
  };
  yield* all(
    front(reach, travel, linear),
    chain(fade(1, 0.15), waitFor(Math.max(0, travel - 0.4)), fade(0, 0.25)),
    ...turns.map(([cog, delta]) => delay(reached(cog), turnNotch(cog, delta, turnTime, traces))),
  );
  arcs.forEach(a => a.remove());
}

// Keeps the cogs turning, each at the speed its notch sets (run in the
// background).
export function* driveCogs(cogs: TunableCog[]): ThreadGenerator {
  let last = useTime();
  while (true) {
    yield;
    const now = useTime();
    for (const c of cogs) c.spin(c.spin() + cogSpeed(c.knob()) * (now - last));
    last = now;
  }
}

// Repeating cog texture (one cog per `cell` square), for surfaces holding
// far too many cogs to draw one by one. A pattern tiles from the shape's center,
// so the cog is drawn on the tile's corners: the shape gets a whole cog there.
export function cogTexture(cell: number, fill: string, background: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = cell;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, cell, cell);
  ctx.fillStyle = fill;
  const r = cell * 0.4;
  const cog = new Path2D(cogPath(12, r, r * 0.82, r * 0.3));
  for (const [x, y] of [[0, 0], [cell, 0], [0, cell], [cell, cell]]) {
    ctx.setTransform(1, 0, 0, 1, x, y);
    ctx.fill(cog, 'evenodd');
  }
  return new Pattern({image: canvas, repetition: 'repeat'});
}

// The "all-powerful, benevolent" server: a cabinet whose front cover carries
// a friendly LED face. Scene 3 unscrews the cover to show it is only LEDs and
// wires, and reveals the (still unlabelled) layers inside.
import {
  Circle,
  Gradient,
  Line,
  Node,
  Rect,
} from '@motion-canvas/2d';
import {
  all,
  chain,
  createRef,
  createRefArray,
  loop,
  range,
  sequence,
  ThreadGenerator,
  Vector2,
  waitFor,
} from '@motion-canvas/core';
import {Cog} from './Cog';
import {Clock} from './Flow';
import {colors} from '../theme';

export const SERVER_W = 400;
export const SERVER_H = 640;
export const COVER_W = 330;
export const COVER_H = 520;
export const COVER_Y = 20;

// Cable ports on the cabinet edges, in server-local units, with the
// outward direction a wire leaves them.
const L = new Vector2(-1, 0);
const R = new Vector2(1, 0);
const T = new Vector2(0, -1);
const B = new Vector2(0, 1);
export const PORTS = {
  L0: {pos: new Vector2(-200, -180), normal: L},
  L1: {pos: new Vector2(-200, -60), normal: L},
  L2: {pos: new Vector2(-200, 60), normal: L},
  L3: {pos: new Vector2(-200, 180), normal: L},
  R0: {pos: new Vector2(200, -180), normal: R},
  R1: {pos: new Vector2(200, -60), normal: R},
  R2: {pos: new Vector2(200, 60), normal: R},
  R3: {pos: new Vector2(200, 180), normal: R},
  T0: {pos: new Vector2(-90, -320), normal: T},
  T1: {pos: new Vector2(90, -320), normal: T},
  B0: {pos: new Vector2(-160, 320), normal: B},
  B1: {pos: new Vector2(160, 320), normal: B},
  POWER: {pos: new Vector2(0, 320), normal: B},
};
export type PortName = keyof typeof PORTS;

// ---------------------------------------------------------------------------
// LED dot-matrix face (14 x 12)

const FACE_COLS = 14;
const FACE_ROWS = 12;
const LED_PITCH = 20;
const FACE_Y = -80; // relative to the cover center

const EYES = ['...##....##...', '..####..####..', '...##....##...'];
const EYES_CLOSED = ['..............', '..####..####..', '..............'];
const SMILE_MOUTH = ['.#..........#.', '..#........#..', '...##....##...', '.....####.....'];
const TALK_MOUTH = ['..............', '....######....', '...#......#...', '....######....'];
const BLANK = '..............';

function face(eyes: string[], mouth: string[]) {
  return [BLANK, BLANK, ...eyes, BLANK, BLANK, ...mouth, BLANK];
}
export const FACE = {
  smile: face(EYES, SMILE_MOUTH),
  blink: face(EYES_CLOSED, SMILE_MOUTH),
  talk: face(EYES, TALK_MOUTH),
  off: range(FACE_ROWS).map(() => BLANK),
};
export type FaceBitmap = string[];

function ledPos(row: number, col: number) {
  return new Vector2(
    (col - (FACE_COLS - 1) / 2) * LED_PITCH,
    FACE_Y + (row - (FACE_ROWS - 1) / 2) * LED_PITCH,
  );
}

const LED_GRID = range(FACE_ROWS).flatMap(row =>
  range(FACE_COLS).map(col => ({row, col, pos: ledPos(row, col)})),
);

export interface LedFace {
  node: Node;
  set(bitmap: FaceBitmap): void;
  show(bitmap: FaceBitmap, duration?: number, stagger?: number): ThreadGenerator;
}

function createLedFace(): LedFace {
  const lit = createRefArray<Circle>();
  const node = (
    <Node>
      {LED_GRID.map(({pos}) => (
        <Circle position={pos} size={12} fill={colors.ledOff} />
      ))}
      {LED_GRID.map(({pos}) => (
        <Circle
          ref={lit}
          position={pos}
          size={12}
          fill={colors.ledOn}
          shadowColor={colors.ledOn}
          shadowBlur={14}
          opacity={0}
        />
      ))}
    </Node>
  ) as Node;

  const isOn = (bitmap: FaceBitmap, row: number, col: number) =>
    bitmap[row][col] === '#';

  return {
    node,
    set(bitmap) {
      LED_GRID.forEach(({row, col}, i) => lit[i].opacity(isOn(bitmap, row, col) ? 1 : 0));
    },
    *show(bitmap, duration = 0.08, stagger = 0) {
      // Group the LEDs that change by column, so `stagger` sweeps left to right.
      const columns = range(FACE_COLS).map(col =>
        LED_GRID.flatMap(({row, col: c}, i) => {
          const target = isOn(bitmap, row, c) ? 1 : 0;
          return c === col && lit[i].opacity() !== target
            ? [lit[i].opacity(target, duration)]
            : [];
        }),
      );
      yield* sequence(stagger, ...columns.map(tasks => all(...tasks)));
    },
  };
}

// Blinks now and then and "talks" in short bursts.
export function* faceIdle(face: LedFace) {
  yield* loop(() =>
    chain(
      waitFor(1.6),
      face.show(FACE.blink, 0.06),
      waitFor(0.1),
      face.show(FACE.smile, 0.06),
      waitFor(1.0),
      ...range(3).flatMap(() => [
        face.show(FACE.talk, 0.08),
        waitFor(0.14),
        face.show(FACE.smile, 0.08),
        waitFor(0.14),
      ]),
    ),
  );
}

// Flickers and dies, like a display losing power.
export function* faceFlickerOff(face: LedFace) {
  yield* face.show(FACE.off, 0.04);
  yield* waitFor(0.08);
  yield* face.show(FACE.smile, 0.04);
  yield* waitFor(0.12);
  yield* face.show(FACE.off, 0.04);
  yield* waitFor(0.06);
  yield* face.show(FACE.smile, 0.04);
  yield* waitFor(0.05);
  yield* face.show(FACE.off, 0.3);
}

// ---------------------------------------------------------------------------
// Back of the cover: a circuit board with the LEDs' legs and a bundle of wires.

const WIRE_COLORS = ['#e05b5b', '#e8c547', '#5b9be0', '#e6e6e6', '#d97ad9'];

function CoverBack() {
  // The face is symmetric, so the mirrored back uses the same positions.
  const lit = LED_GRID.filter(({row, col}) => FACE.smile[row][col] === '#').sort(
    (a, b) => a.pos.x - b.pos.x,
  );
  const connectorY = 190;
  return (
    <Node>
      {LED_GRID.map(({pos}) => (
        <Circle position={pos} size={9} fill={'#0f2a1b'} stroke={'#3c7a57'} lineWidth={1.5} />
      ))}
      {lit.map(({pos}, i) => {
        const x = -70 + (140 * i) / (lit.length - 1);
        return (
          <Line
            points={[pos, [pos.x, pos.y + 14], [x, 120 + (i % 4) * 8], [x, connectorY - 18]]}
            stroke={WIRE_COLORS[i % WIRE_COLORS.length]}
            lineWidth={3}
            radius={10}
            opacity={0.9}
          />
        );
      })}
      {lit.map(({pos}) => (
        <Rect position={pos} width={14} height={9} radius={2} fill={'#c8d1c4'} />
      ))}
      <Rect y={connectorY} width={170} height={36} radius={4} fill={'#101215'} />
      <Rect y={connectorY + 40} width={130} height={46} fill={'#8d939c'} opacity={0.8} />
    </Node>
  );
}

// ---------------------------------------------------------------------------
// Interior: a glimpse of the machinery explored in Scene 4 (meshed cogs).

const INTERIOR_COLS = [-85, 0, 85];
const INTERIOR_ROWS = [-190, -95, 0, 95, 190];

function Interior({clock}: {clock: Clock}) {
  // Neighbours in a row turn in opposite directions; with 9 teeth a tooth of
  // one cog faces a gap of the next at rotation 0, so they stay meshed.
  return (
    <Node>
      {INTERIOR_ROWS.flatMap((y, r) =>
        INTERIOR_COLS.map((x, c) => (
          <Cog
            x={x}
            y={y}
            radius={46}
            opacity={0.85}
            rotation={() => (c % 2 ? -1 : 1) * (clock() * 30 + r * 7)}
          />
        )),
      )}
    </Node>
  );
}

// ---------------------------------------------------------------------------

function Screw() {
  return (
    <Circle size={24} fill={colors.screw} stroke={colors.screwEdge} lineWidth={2}>
      <Line points={[[-7, 0], [7, 0]]} stroke={colors.screwEdge} lineWidth={3} />
    </Circle>
  );
}

export interface Server {
  node: Node;
  face: LedFace;
  screws: Node[];
  coverMover: Node;
  coverFlip: Node;
  coverFront: Rect;
  coverBack: Rect;
  interior: Node;
}

export function createServer(clock: Clock): Server {
  const node = createRef<Node>();
  const screws = createRefArray<Node>();
  const coverMover = createRef<Node>();
  const coverFlip = createRef<Node>();
  const coverFront = createRef<Rect>();
  const coverBack = createRef<Rect>();
  const interior = createRef<Node>();
  const face = createLedFace();

  const halo = new Gradient({
    type: 'radial',
    fromRadius: 0,
    toRadius: 700,
    stops: [
      {offset: 0, color: colors.halo + '55'},
      {offset: 1, color: colors.halo + '00'},
    ],
  });
  const coverRect = {
    width: COVER_W,
    height: COVER_H,
    radius: 12,
    shadowColor: '#000000c0',
    shadowBlur: 0,
  };
  const status = [0.7, 1.3, 2.1, 0.9, 1.7];

  <Node ref={node}>
    <Circle size={1400} fill={halo} opacity={() => 0.75 + 0.25 * Math.sin(clock() * 1.6)} />
    {Object.values(PORTS).map(({pos, normal}) => (
      <Rect
        position={pos.sub(normal.scale(4))}
        width={normal.x ? 18 : 30}
        height={normal.x ? 30 : 18}
        radius={3}
        fill={'#4a5060'}
      />
    ))}
    <Rect x={-120} y={SERVER_H / 2 + 10} width={70} height={24} radius={4} fill={colors.cabinetEdge} />
    <Rect x={120} y={SERVER_H / 2 + 10} width={70} height={24} radius={4} fill={colors.cabinetEdge} />
    <Rect
      width={SERVER_W}
      height={SERVER_H}
      radius={26}
      fill={colors.cabinet}
      stroke={colors.cabinetEdge}
      lineWidth={4}
    />
    {status.map((f, i) => (
      <Circle
        x={-150 + i * 22}
        y={-282}
        size={10}
        fill={i % 2 ? colors.energy : colors.online}
        opacity={() => (Math.sin(clock() * f * 3 + i) > 0.2 ? 1 : 0.25)}
      />
    ))}
    {range(4).map(i => (
      <Rect x={100 + i * 22} y={-282} width={8} height={30} radius={4} fill={colors.cabinetEdge} />
    ))}
    <Rect y={COVER_Y} width={COVER_W} height={COVER_H} radius={12} fill={colors.cavity}>
      <Node ref={interior}>
        <Interior clock={clock} />
      </Node>
    </Rect>
    <Node ref={coverMover} y={COVER_Y}>
      <Node ref={coverFlip}>
        <Rect ref={coverFront} {...coverRect} fill={colors.cover} stroke={colors.coverEdge} lineWidth={3}>
          {face.node}
        </Rect>
        <Rect ref={coverBack} {...coverRect} fill={colors.pcb} stroke={colors.pcbEdge} lineWidth={3} opacity={0}>
          <CoverBack />
        </Rect>
      </Node>
    </Node>
    {[-1, 1].flatMap(sy =>
      [-1, 1].map(sx => (
        <Node ref={screws} x={sx * (COVER_W / 2 - 24)} y={COVER_Y + sy * (COVER_H / 2 - 24)}>
          <Screw />
        </Node>
      )),
    )}
  </Node>;

  return {
    node: node(),
    face,
    screws: [...screws],
    coverMover: coverMover(),
    coverFlip: coverFlip(),
    coverFront: coverFront(),
    coverBack: coverBack(),
    interior: interior(),
  };
}

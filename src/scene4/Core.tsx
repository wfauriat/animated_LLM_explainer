// The transformer core: depth planes (one per dimension drawn) carrying
// columns of cogs (one per layer). Each crank turn advances the token rows
// into the next column, whose gear train turns and nudges their dials.
import {brightness, Line, Node, Rect, Txt} from '@motion-canvas/2d';
import {
  all,
  chain,
  createSignal,
  easeInOutCubic,
  easeInOutSine,
  SimpleSignal,
  ThreadGenerator,
  Vector2,
} from '@motion-canvas/core';
import {easeOutBack} from '../motion';
import {Cog} from '../components/Cog';
import {colors, font} from '../theme';
import {createDepthDots, createDial, depthShade, Dial} from './Compass';
import {createCrank} from './Crank';
import {
  COG_SLOTS,
  CORE_ELLIPSIS_Y,
  CORE_IN_X,
  CORE_LABEL,
  CORE_ROWS,
  coreAngle,
  DEPTH,
  DEPTH_DOTS_AT,
  depthSlot,
  DIAL,
  DIMS,
  LABEL_SCALE,
  LAYER_X,
  MASTER,
  MORE,
  nudge,
  PLANE,
} from './layout';
import {makeLabel} from './parts';

type Signal = SimpleSignal<number, void>;

export interface CoreRow {
  x: Signal; // x of the front dial
  y: number;
  dials: Dial[]; // front first
  dots: Node;
}

export interface Core {
  node: Node;
  planes: Node[]; // front first
  panels: Rect[]; // front first
  cogs: Node[][]; // [layer] -> cogs of that column on every plane
  colAngle: Signal[]; // rotation of each column's gear train
  colGlow: Rect[];
  rows: CoreRow[];
  rowsEllipsis: Txt; // "⋮" between the drawn rows
  more: Txt; // "⋯" many more layers
  label: Txt;
  drive: Node; // master gear + drive rod
  crankAngle: Signal;
  crank: Node;
}

const TOOTH_PITCH = 13.6; // same tooth size as the dial rims
const PANEL_FILL = '#2fbf6a1c';
const PANEL_STROKE = '#3ddc6a66';
const COG_FILL = colors.cog; // darker than the dials, which carry the meaning
// Cogs on planes further back fade out, so the front plane reads clearly.
const COG_OPACITY = [1, 0.5, 0.32, 0.2];

export function createCore(): Core {
  const colAngle = LAYER_X.map(() => createSignal(0));
  const crankAngle = createSignal(0);
  const rows: CoreRow[] = CORE_ROWS.map(({y}) => ({
    x: createSignal(CORE_IN_X),
    y,
    dials: [] as Dial[],
    dots: null as unknown as Node,
  }));
  const cogs: Node[][] = LAYER_X.map((): Node[] => []);
  const planes: Node[] = [];
  const panels: Rect[] = [];
  const colGlow: Rect[] = [];
  const node = (<Node />) as Node;

  // Back to front, so nearer planes cover farther ones.
  for (let k = DIMS - 1; k >= 0; k--) {
    const off = DEPTH.scale(depthSlot(k));
    const plane = (<Node filters={k ? [brightness(depthShade(k))] : []} />) as Node;
    if (k === DIMS - 2) {
      // "⋰" in the gap before the last plane (the dimensions not drawn),
      // behind this plane's dials.
      rows.forEach(row => {
        row.dots = createDepthDots(DIAL, DEPTH, DEPTH_DOTS_AT);
        row.dots.position(() => new Vector2(row.x(), row.y));
        plane.add(row.dots);
      });
    }
    panels[k] = (
      <Rect
        position={off.add([PLANE.x, PLANE.y])}
        width={PLANE.w}
        height={PLANE.h}
        radius={18}
        fill={PANEL_FILL}
        stroke={PANEL_STROKE}
        lineWidth={3}
      />
    ) as Rect;
    plane.add(panels[k]);
    if (k === 0) {
      LAYER_X.forEach(x => {
        const glow = (
          <Rect x={x} y={PLANE.y} width={170} height={PLANE.h - 30} radius={24} fill={colors.halo} opacity={0} />
        ) as Rect;
        colGlow.push(glow);
        plane.add(glow);
      });
    }
    LAYER_X.forEach((x, l) =>
      COG_SLOTS.forEach(({y, r}, j) => {
        const cog = (
          <Cog
            position={off.add([x, y])}
            teeth={Math.round((2 * Math.PI * r) / TOOTH_PITCH)}
            radius={r}
            root={1 - 6 / r}
            hole={0.22}
            fill={COG_FILL}
            opacity={COG_OPACITY[k]}
            rotation={() => colAngle[l]() + j * 7}
          />
        ) as Node;
        cogs[l].push(cog);
        plane.add(cog);
      }),
    );
    rows.forEach((row, r) => {
      const dial = createDial(DIAL, 1, coreAngle(r, k, 0));
      dial.node.position(() => new Vector2(row.x() + off.x, row.y + off.y));
      row.dials[k] = dial;
      plane.add(dial.node);
    });
    node.add(plane);
    planes[k] = plane;
  }

  const rowsEllipsis = (
    <Txt
      position={() => new Vector2(rows[0].x(), CORE_ELLIPSIS_Y)}
      fontFamily={font}
      fontSize={44}
      fill={colors.label}
      text={'⋮'}
    />
  ) as Txt;
  const more = (
    <Txt position={MORE} fontFamily={font} fontSize={96} fontWeight={600} fill={colors.textLight} text={'⋯'} />
  ) as Txt;
  const label = makeLabel('Transformer layers');
  label.position(CORE_LABEL).scale(LABEL_SCALE);

  // Drive rod along the bottom of the front plane, ending on the master gear.
  const drive = (
    <Node>
      <Line
        points={[
          [LAYER_X[0], MASTER.y + 3],
          [MASTER.x, MASTER.y + 3],
        ]}
        stroke={colors.steel}
        lineWidth={7}
        lineDash={[14, 10]}
        lineDashOffset={() => -crankAngle() * 0.25}
      />
      <Cog
        position={MASTER}
        teeth={14}
        radius={42}
        hole={0.25}
        fill={'#15171c'}
        stroke={colors.steel}
        rotation={crankAngle}
      />
    </Node>
  ) as Node;
  const crank = createCrank(crankAngle);
  crank.position(MASTER).scale(0.5);

  node.add([rowsEllipsis, more, drive, crank, label]);
  return {
    node,
    planes: [...planes],
    panels: [...panels],
    cogs,
    colAngle,
    colGlow,
    rows,
    rowsEllipsis,
    more,
    label,
    drive,
    crankAngle,
    crank,
  };
}

// Puts the core in the state reached after `steps` layer steps (for scenes
// that start part-way through).
export function setCoreState(core: Core, steps: number, x: number) {
  core.rows.forEach((row, r) => {
    row.x(x);
    row.dials.forEach((d, k) => d.arrow.rotation(coreAngle(r, k, steps)));
  });
  // Steps 0-2 turn columns 0-2, step 3 is the fast-forward, step 4 column 3.
  LAYER_X.forEach((_, l) => {
    const turned = l < 3 ? steps > l : steps >= 5;
    core.colAngle[l](turned ? 60 : 0);
  });
}

// One turn of the crank: the rows move into column `l`, then that column's
// gear train turns, spinning the dial rims and nudging every arrow.
export function* layerStep(
  core: Core,
  l: number,
  step: number,
  duration: number,
): ThreadGenerator {
  const move = duration * 0.45;
  const turn = duration * 0.55;
  yield* all(
    core.crankAngle(core.crankAngle() + 360, duration, easeInOutSine),
    chain(
      all(...core.rows.map(row => row.x(LAYER_X[l], move, easeInOutCubic))),
      all(
        core.colAngle[l](core.colAngle[l]() + 60, turn, easeInOutCubic),
        core.colGlow[l].opacity(0.3, turn / 2).to(0, turn / 2),
        ...core.rows.flatMap((row, r) =>
          row.dials.map((d, k) =>
            all(
              d.rim.rotation(d.rim.rotation() - 150, turn, easeInOutCubic),
              d.arrow.rotation(d.arrow.rotation() + nudge(r, k, step), turn, easeOutBack),
            ),
          ),
        ),
      ),
    ),
  );
}

// The "⋯" stretch: the crank spins fast, the rows slide through the many
// unseen layers and their arrows keep being nudged.
export function* fastForward(core: Core, step: number, duration: number) {
  yield* all(
    core.crankAngle(core.crankAngle() + 360 * 3, duration, easeInOutSine),
    core.more.scale(1.3, duration / 2).to(1, duration / 2),
    ...core.rows.map(row => row.x(MORE.x, duration, easeInOutCubic)),
    ...core.rows.flatMap((row, r) =>
      row.dials.map((d, k) =>
        all(
          d.rim.rotation(d.rim.rotation() - 300, duration, easeInOutSine),
          d.arrow.rotation(d.arrow.rotation() + nudge(r, k, step), duration, easeInOutSine),
        ),
      ),
    ),
  );
}

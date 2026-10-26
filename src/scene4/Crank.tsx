// Isometric crank handle (port of scratch/handle.py) that actually turns:
// the arm and grip rotate around the shaft axis, re-projected every frame.
// The node's origin is the engine end of the shaft (plug it on a gear).
import {Line, Node} from '@motion-canvas/2d';
import {SimpleSignal, Vector2} from '@motion-canvas/core';
import {colors} from '../theme';

type P3 = [number, number, number];

const C30 = Math.cos(Math.PI / 6);
// 3D (x, y, z) -> 2D isometric; z is up, the viewer sits at (+x, +y, +z).
const iso = ([x, y, z]: P3) => new Vector2((x - y) * C30, (x + y) * 0.5 - z);
const depth = ([x, y, z]: P3) => x + y + z; // larger = closer to the viewer

const STEEL = [colors.steelDark, '#8d98a8', '#d9dfe8'];
const WOOD = ['#4a2a14', '#a8693a', '#e3ab74'];

export function createCrank(
  angle: SimpleSignal<number, void>,
  {shaft = 220, arm = 110, grip = 130, shaftW = 16, armW = 16, gripW = 30} = {},
) {
  // Rotation around the shaft (x) axis.
  const rot = (y: number, z: number): [number, number] => {
    const a = (angle() * Math.PI) / 180;
    return [y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
  };
  const A: P3 = [-shaft, 0, 0];
  const B: P3 = [0, 0, 0];
  const C = (): P3 => [0, ...rot(0, arm)];
  const along = (p: P3, dx: number): P3 => [p[0] + dx, p[1], p[2]];

  const segments: [() => P3, () => P3, number, string[]][] = [
    [() => A, () => B, shaftW, STEEL], // shaft
    [() => B, C, armW, STEEL], // arm
    [C, () => along(C(), grip), gripW, WOOD], // wooden grip
    // cross pin near the engine end
    [() => [A[0] + 25, ...rot(-28, 0)], () => [A[0] + 25, ...rot(28, 0)], shaftW * 0.7, STEEL],
    // metal collars at both ends of the grip
    [() => along(C(), 4), () => along(C(), 16), gripW + 8, STEEL],
    [() => along(C(), grip - 16), () => along(C(), grip - 4), gripW + 8, STEEL],
  ];

  const origin = iso(A);
  const at = (p: P3) => iso(p).sub(origin);
  return (
    <Node>
      {segments.map(([p0, p1, w, [dark, mid, light]]) => {
        const k = w * 0.18; // highlight offset (light from top-left)
        const mid3 = (): P3 => {
          const a = p0();
          const b = p1();
          return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
        };
        return (
          <Node zIndex={() => depth(mid3())}>
            {(
              [
                [w + 5, dark, 0, 1],
                [w, mid, 0, 1],
                [w * 0.3, light, -k, 0.75],
              ] as const
            ).map(([width, color, d, opacity]) => (
              <Line
                points={() => [at(p0()).add([d, d]), at(p1()).add([d, d])]}
                stroke={color}
                lineWidth={width}
                lineCap={'round'}
                opacity={opacity}
              />
            ))}
          </Node>
        );
      })}
    </Node>
  ) as Node;
}

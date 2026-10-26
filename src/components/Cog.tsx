// Gear outline with trapezoidal teeth (port of scratch/wheel.py), centered
// on the origin.
import {Path, PathProps} from '@motion-canvas/2d';
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

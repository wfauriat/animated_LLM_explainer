import {ComponentChildren, Node, Rect} from '@motion-canvas/2d';
import {Reference} from '@motion-canvas/core';
import {colors} from '../theme';

// Screen geometry in world units; the screen is centered on the origin.
export const SCREEN_W = 1600;
export const SCREEN_H = 900;
export const BEZEL = 36;

const NECK_H = 130;
const BASE_H = 28;
// y of the desk surface (where the stand's base rests)
export const DESK_TOP = SCREEN_H / 2 + BEZEL + NECK_H + BASE_H;

export function Monitor({
  screen,
  children,
}: {
  screen?: Reference<Rect>;
  children?: ComponentChildren;
}) {
  return (
    <Node>
      <Rect
        y={SCREEN_H / 2 + BEZEL + NECK_H / 2}
        width={150}
        height={NECK_H}
        fill={colors.stand}
      />
      <Rect
        y={DESK_TOP - BASE_H / 2}
        width={520}
        height={BASE_H}
        radius={[14, 14, 4, 4]}
        fill={colors.bezel}
      />
      <Rect
        width={SCREEN_W + 2 * BEZEL}
        height={SCREEN_H + 2 * BEZEL}
        radius={28}
        fill={colors.bezel}
        stroke={colors.bezelEdge}
        lineWidth={3}
        shadowColor={colors.screenGlow}
        shadowBlur={220}
      />
      <Rect
        ref={screen}
        width={SCREEN_W}
        height={SCREEN_H}
        radius={6}
        fill={colors.appBg}
        layout
        clip
      >
        {children}
      </Rect>
    </Node>
  );
}

// A plain desk surface with a keyboard, seen from the user's side.
export function Desk() {
  return (
    <Node>
      <Rect
        y={DESK_TOP + 1000}
        width={8000}
        height={2000}
        fill={colors.desk}
      />
      <Rect y={DESK_TOP + 3} width={8000} height={6} fill={colors.deskEdge} />
      <Rect
        y={DESK_TOP + 170}
        width={980}
        height={70}
        radius={12}
        fill={colors.keyboard}
        stroke={colors.deskEdge}
        lineWidth={3}
      />
      <Rect
        x={720}
        y={DESK_TOP + 170}
        width={70}
        height={100}
        radius={35}
        fill={colors.keyboard}
        stroke={colors.deskEdge}
        lineWidth={3}
      />
    </Node>
  );
}

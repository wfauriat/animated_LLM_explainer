// The card opening each part of the film: a short pause between ideas, on the
// machine's colors, with two dim cogs turning behind the text.
import {Line, Node, Rect, Txt, View2D} from '@motion-canvas/2d';
import {
  all,
  createRef,
  createSignal,
  easeInOutCubic,
  linear,
  waitFor,
  waitUntil,
} from '@motion-canvas/core';
import {rise} from '../motion';
import {colors, font, safe, type} from '../theme';
import {Cog} from './Cog';
import {Backdrop} from './Titles';

export const FILM_TITLE = 'Inside a language model';

const TEXT_X = -safe.x + 60;
const DIM_COG = '#151b27';

// Two meshed cogs, on the right of the frame.
export function CogMotif({angle}: {angle: () => number}) {
  const big = {teeth: 36, radius: 470};
  const small = {teeth: 16, radius: 209};
  return (
    <Node x={600} y={70}>
      <Cog {...big} root={0.9} hole={0.2} fill={DIM_COG} stroke={DIM_COG} rotation={angle} />
      <Cog
        {...small}
        root={0.78}
        hole={0.24}
        fill={DIM_COG}
        stroke={DIM_COG}
        position={[-455, -415]}
        rotation={() => -angle() * (big.teeth / small.teeth) + 5}
      />
    </Node>
  );
}

export function* chapterCard(
  view: View2D,
  {part, title, subtitle}: {part: number; title: string; subtitle: string},
) {
  view.fill(colors.machineBg);
  const angle = createSignal(0);
  const backdrop = createRef<Rect>();
  const motif = createRef<Node>();
  const film = createRef<Txt>();
  const overline = createRef<Txt>();
  const heading = createRef<Txt>();
  const rule = createRef<Line>();
  const sub = createRef<Txt>();

  view.add(
    <>
      <Backdrop ref={backdrop} opacity={0} />
      <Node ref={motif} opacity={0}>
        <CogMotif angle={angle} />
      </Node>
      <Txt ref={film} x={TEXT_X} y={-205} offsetX={-1} fontFamily={font} fontSize={28} fontWeight={500} fill={colors.textMuted} text={FILM_TITLE} opacity={0} />
      <Txt
        ref={overline}
        x={TEXT_X}
        y={-135}
        offsetX={-1}
        fontFamily={font}
        fontSize={48}
        fontWeight={700}
        fill={colors.energy}
        text={`Part ${part}`}
        opacity={0}
      />
      <Txt ref={heading} x={TEXT_X} y={-35} offsetX={-1} fontFamily={font} {...type.display} fill={colors.textLight} text={title} opacity={0} />
      <Line ref={rule} points={[[TEXT_X, 45], [TEXT_X + 140, 45]]} stroke={colors.energy} lineWidth={5} lineCap={'round'} end={0} />
      <Txt ref={sub} x={TEXT_X} y={100} offsetX={-1} fontFamily={font} fontSize={34} fill={colors.textMuted} text={subtitle} opacity={0} />
    </>,
  );

  yield angle(40, 40, linear);
  yield* all(backdrop().opacity(1, 0.6), motif().opacity(1, 0.8));
  yield* waitUntil('card');
  yield* all(rise(film()), rise(overline()), rise(heading()), rule().end(1, 0.7, easeInOutCubic));
  yield* rise(sub());
  yield* waitFor(2.6);
  yield* waitUntil('card-end');
  yield* all(...view.children().map(c => c.opacity(0, 0.6)));
}

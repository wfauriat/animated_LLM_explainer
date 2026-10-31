// The film's recurring text elements, so that they look and sit the same in
// every scene: a scene title, caption lines under the action, an amber takeaway
// box, and the backdrop behind them.
import {Gradient, Rect, RectProps} from '@motion-canvas/2d';
import {CAPTION_Y, colors, TAKEAWAY_Y, TITLE_Y, type} from '../theme';
import {WordPart, Words} from './Words';

const amber = colors.energy;

// Subtle glow behind the action, so that the frame is not a flat color.
export function Backdrop(props: RectProps) {
  return (
    <Rect
      width={1920}
      height={1080}
      fill={
        new Gradient({
          type: 'radial',
          fromRadius: 0,
          toRadius: 1120,
          stops: [
            {offset: 0, color: colors.backdropGlow},
            {offset: 1, color: colors.machineBg},
          ],
        })
      }
      {...props}
    />
  );
}

// A word part emphasized in the film's accent color.
export const emphasis = (text: string, weight = 700): WordPart => [text, amber, weight];

export function SceneTitle({parts, ...props}: {parts: WordPart[]} & Omit<RectProps, 'gap'>) {
  return (
    <Words
      y={TITLE_Y}
      {...type.title}
      gap={13}
      parts={parts.map(([text, fill, weight = type.title.fontWeight, italic]) => [text, fill, weight, italic])}
      {...props}
    />
  );
}

// `line` 0 or 1: the upper or lower caption slot. `quiet` is the muted, smaller
// aside that goes under a caption.
export function Caption({parts, line = 0, quiet = false, ...props}: {parts: WordPart[]; line?: number; quiet?: boolean} & Omit<RectProps, 'gap'>) {
  return (
    <Words
      y={CAPTION_Y[line]}
      fontSize={quiet ? 28 : type.caption.fontSize}
      gap={quiet ? 8 : 10}
      opacity={0}
      parts={quiet ? parts.map(([text, fill = colors.textMuted, weight = 400]) => [text, fill, weight]) : parts}
      {...props}
    />
  );
}

// The one idea to keep from a scene. Each line is a row of word parts.
export function Takeaway({lines, ...props}: {lines: WordPart[][]} & RectProps) {
  return (
    <Rect
      layout
      direction={'column'}
      alignItems={'center'}
      gap={10}
      y={TAKEAWAY_Y}
      padding={[20, 44]}
      radius={18}
      fill={colors.takeawayBg}
      stroke={amber}
      lineWidth={3}
      opacity={0}
      {...props}
    >
      {lines.map((parts, i) => (
        <Words fontSize={i === 0 ? 38 : 32} gap={10} parts={parts.map(([t, f, w = i === 0 ? 700 : 500, it]) => [t, f, w, it])} />
      ))}
    </Rect>
  );
}

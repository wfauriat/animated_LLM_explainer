// A line of words in one layout row, some highlighted: each part is
// [text, fill?, fontWeight?, italic?].
import {Rect, RectProps, Txt} from '@motion-canvas/2d';
import {colors, font} from '../theme';

export type WordPart = [string, string?, number?, boolean?];

export function Words({parts, gap = 12, ...props}: {parts: WordPart[]; gap?: number} & RectProps) {
  return (
    <Rect layout alignItems={'baseline'} gap={gap} {...props}>
      {parts.map(([text, fill = colors.textLight, weight = 500, italic = false]) => (
        <Txt
          fontFamily={font}
          fontSize={props.fontSize ?? 36}
          fontWeight={weight}
          fontStyle={italic ? 'italic' : 'normal'}
          fill={fill}
          text={text}
        />
      ))}
    </Rect>
  );
}

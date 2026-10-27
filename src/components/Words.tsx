// A line of words in one layout row, some highlighted: each part is
// [text, fill?, fontWeight?].
import {Rect, RectProps, Txt} from '@motion-canvas/2d';
import {colors, font} from '../theme';

export function Words({parts, gap = 12, ...props}: {parts: [string, string?, number?][]; gap?: number} & RectProps) {
  return (
    <Rect layout alignItems={'baseline'} gap={gap} {...props}>
      {parts.map(([text, fill = colors.textLight, weight = 500]) => (
        <Txt fontFamily={font} fontSize={props.fontSize ?? 36} fontWeight={weight} fill={fill} text={text} />
      ))}
    </Rect>
  );
}

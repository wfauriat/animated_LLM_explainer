// Scene 5 content: the generated continuation and the response "envelope".
import {Line, Node, Rect} from '@motion-canvas/2d';
import {colors} from '../theme';

export const PROMPT_TEXT = 'It was raining outside so he took a';
// Continuation, one token at a time ("coat" was generated in Scene 4).
export const GENERATED = [
  'coat', 'and', 'an', 'umb', 'rella', 'and', 'walked', 'to', 'school',
  'at', 'a', 'rapid', 'pace', '.',
];
export const END_TOKEN = '<end>';
export const COMPLETION_TEXT = 'coat and an umbrella and walked to school at a rapid pace.';

export const ENVELOPE_W = 150;
export const ENVELOPE_H = 96;

// A response packet, drawn as a closed envelope in the assistant's color.
export function Envelope() {
  return (
    <Node>
      <Rect
        width={ENVELOPE_W}
        height={ENVELOPE_H}
        radius={10}
        fill={colors.botBubble}
        stroke={colors.bubbleText}
        lineWidth={4}
      />
      <Line
        points={[
          [-ENVELOPE_W / 2 + 6, -ENVELOPE_H / 2 + 6],
          [0, 8],
          [ENVELOPE_W / 2 - 6, -ENVELOPE_H / 2 + 6],
        ]}
        stroke={colors.bubbleText}
        lineWidth={4}
        lineJoin={'round'}
      />
    </Node>
  ) as Node;
}

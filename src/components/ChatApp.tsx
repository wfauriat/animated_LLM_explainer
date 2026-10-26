import {Circle, Line, Node, Rect, Txt, TxtProps} from '@motion-canvas/2d';
import {
  all,
  cancel,
  chain,
  createRef,
  createRefArray,
  easeOutBack,
  linear,
  loop,
  range,
  Reference,
  sequence,
  ThreadGenerator,
  waitFor,
} from '@motion-canvas/core';
import {colors, font} from '../theme';

const BUBBLE_MAX_W = 940;

export const bubbleText: TxtProps = {
  fontFamily: font,
  fontSize: 30,
  lineHeight: 42,
  fill: colors.bubbleText,
  textWrap: true,
};

export interface ChatRefs {
  messages: Reference<Rect>;
  typed: Reference<Txt>;
  placeholder: Reference<Txt>;
  caret: Reference<Rect>;
  send: Reference<Circle>;
}

export function createChatRefs(): ChatRefs {
  return {
    messages: createRef<Rect>(),
    typed: createRef<Txt>(),
    placeholder: createRef<Txt>(),
    caret: createRef<Rect>(),
    send: createRef<Circle>(),
  };
}

// Small round face used as the assistant's avatar: it seeds the
// "friendly persona" that later scenes unmask.
function BotAvatar() {
  return (
    <Circle size={54} fill={colors.botAvatar}>
      <Circle layout={false} x={-9} y={-6} size={8} fill={colors.bubbleText} />
      <Circle layout={false} x={9} y={-6} size={8} fill={colors.bubbleText} />
      <Circle
        layout={false}
        y={1}
        size={26}
        startAngle={25}
        endAngle={155}
        stroke={colors.bubbleText}
        lineWidth={3}
        lineCap={'round'}
      />
    </Circle>
  );
}

// Full chat window, sized to fill its (layout) parent: the monitor screen.
export function ChatApp({refs}: {refs: ChatRefs}) {
  const label = {fontFamily: font, fill: colors.textLight};
  return (
    <Rect layout direction={'column'} width={'100%'} height={'100%'}>
      <Rect
        height={44}
        fill={colors.titleBar}
        alignItems={'center'}
        padding={[0, 20]}
        gap={10}
      >
        <Circle size={14} fill={'#ff5f57'} />
        <Circle size={14} fill={'#febc2e'} />
        <Circle size={14} fill={'#28c840'} />
        <Txt
          {...label}
          grow={1}
          fontSize={20}
          fill={colors.textMuted}
          textAlign={'center'}
          marginRight={68}
        >
          Chat
        </Txt>
      </Rect>

      <Rect
        height={84}
        fill={colors.appHeader}
        alignItems={'center'}
        padding={[0, 36]}
        gap={18}
      >
        <BotAvatar />
        <Rect direction={'column'} gap={4}>
          <Txt {...label} fontSize={26} fontWeight={600}>
            Assistant
          </Txt>
          <Rect alignItems={'center'} gap={8}>
            <Circle size={10} fill={colors.online} />
            <Txt {...label} fontSize={18} fill={colors.textMuted}>
              online
            </Txt>
          </Rect>
        </Rect>
      </Rect>

      <Rect
        ref={refs.messages}
        grow={1}
        direction={'column'}
        padding={[30, 44]}
        gap={22}
      />

      <Rect
        height={88}
        fill={colors.appHeader}
        alignItems={'center'}
        padding={[0, 30]}
        gap={18}
      >
        <Rect
          grow={1}
          height={54}
          radius={27}
          fill={colors.inputField}
          alignItems={'center'}
          padding={[0, 26]}
          gap={2}
        >
          <Txt ref={refs.typed} {...label} fontSize={26} text={''} />
          <Rect ref={refs.caret} width={3} height={30} fill={colors.textLight} />
          <Txt
            ref={refs.placeholder}
            {...label}
            fontSize={26}
            fill={colors.textMuted}
            marginLeft={6}
            text={'Type a message…'}
          />
        </Rect>
        <Circle ref={refs.send} size={54} fill={colors.sendButton}>
          <Line
            layout={false}
            points={[
              [-9, -11],
              [13, 0],
              [-9, 11],
            ]}
            closed
            fill={colors.textLight}
          />
        </Circle>
      </Rect>
    </Rect>
  );
}

// A message row with its bubble (hidden until popped).
// `content` is either a plain string or custom bubble children.
export function makeBubble(
  side: 'user' | 'bot',
  content: string | Node | Node[],
  width?: number,
) {
  const bubble = createRef<Rect>();
  const row = (
    <Rect width={'100%'} justifyContent={side === 'user' ? 'start' : 'end'}>
      <Rect
        ref={bubble}
        direction={'column'}
        gap={10}
        padding={[18, 28]}
        maxWidth={BUBBLE_MAX_W}
        width={width}
        radius={side === 'user' ? [28, 28, 28, 8] : [28, 28, 8, 28]}
        fill={side === 'user' ? colors.userBubble : colors.botBubble}
        opacity={0}
        scale={0.7}
      >
        {typeof content === 'string' ? (
          <Txt {...bubbleText}>{content}</Txt>
        ) : (
          content
        )}
      </Rect>
    </Rect>
  ) as Rect;
  return {row, bubble: bubble()};
}

export function* popIn(node: Node) {
  yield* all(node.opacity(1, 0.25), node.scale(1, 0.45, easeOutBack));
}

export function* popOut(node: Node) {
  yield* all(node.opacity(0, 0.15), node.scale(0.8, 0.15));
}

export function* blinkCaret(refs: ChatRefs) {
  yield* loop(() =>
    chain(waitFor(0.5), refs.caret().opacity(0, 0), waitFor(0.5), refs.caret().opacity(1, 0)),
  );
}

// The user types into the input field, presses send, the bubble pops in.
export function* userSends(refs: ChatRefs, text: string) {
  refs.placeholder().text('');
  yield* refs.typed().text(text, text.length / 24, linear);
  yield* waitFor(0.35);
  yield* refs.send().scale(0.85, 0.08).to(1, 0.12);
  const {row, bubble} = makeBubble('user', text);
  refs.typed().text('');
  refs.placeholder().text('Type a message…');
  refs.messages().add(row);
  yield* popIn(bubble);
}

// "…" typing indicator on the assistant side (hidden until popped);
// `pulse()` animates the dots forever, run it in the background.
export function makeTyping() {
  const dots = createRefArray<Circle>();
  const {row, bubble} = makeBubble(
    'bot',
    <Rect gap={10} padding={[10, 2]}>
      {range(3).map(() => (
        <Circle ref={dots} size={14} fill={colors.typingDot} opacity={0.35} />
      ))}
    </Rect>,
  );
  const pulse = () =>
    loop(() =>
      sequence(
        0.15,
        ...dots.map(d => chain(d.opacity(1, 0.25), d.opacity(0.35, 0.25))),
      ),
    );
  return {row, bubble, pulse};
}

// Typing indicator shown for `duration` seconds.
export function* botTyping(
  refs: ChatRefs,
  duration: number,
): ThreadGenerator {
  const typing = makeTyping();
  refs.messages().add(typing.row);
  yield* popIn(typing.bubble);
  const pulse = yield typing.pulse();
  yield* waitFor(duration);
  cancel(pulse);
  yield* popOut(typing.bubble);
  typing.row.remove();
}

export function* botReplies(
  refs: ChatRefs,
  content: string | Node | Node[],
  width?: number,
) {
  const {row, bubble} = makeBubble('bot', content, width);
  refs.messages().add(row);
  yield* popIn(bubble);
}

// Scene 15 — Coda (provisional ending). Back to the very first exchange. Same
// question, but this time the answer is the honest one, written token by token
// now that we know how; and the friendly avatar has turned into a cog. Then the
// film's title.
import {makeScene2D, Node, Rect, Txt} from '@motion-canvas/2d';
import {
  all,
  createRef,
  createSignal,
  fadeTransition,
  linear,
  waitFor,
  waitUntil,
} from '@motion-canvas/core';
import {
  blinkCaret,
  bubbleText,
  ChatApp,
  createChatRefs,
  makeBubble,
  popIn,
  userSends,
} from '../components/ChatApp';
import {CogMotif, FILM_TITLE} from '../components/ChapterCard';
import {USER_1} from '../components/Conversation';
import {Desk, Monitor} from '../components/Monitor';
import {Backdrop} from '../components/Titles';
import {CHAT_ZOOM} from '../layout';
import {rise} from '../motion';
import {colors, font, safe, type} from '../theme';

const ANSWER = [
  'A machine that guesses the next token, tuned on a mountain of human text.',
  'Often very good at it, and sometimes wrong. Please check my work.',
];
const REPLY_W = 860;
const TOKEN_TIME = 0.11;

export default makeScene2D(function* (view) {
  view.fill(colors.room);
  const chat = createChatRefs();
  const world = createRef<Node>();
  const fade = createRef<Rect>();
  const end = createRef<Node>();
  const heading = createRef<Txt>();
  const angle = createSignal(0);

  view.add(
    <>
      <Node ref={world} scale={CHAT_ZOOM}>
        <Desk />
        <Monitor>
          <ChatApp refs={chat} />
        </Monitor>
      </Node>
      <Rect ref={fade} width={'100%'} height={'100%'} fill={'#000'} opacity={0} />
      <Node ref={end} opacity={0}>
        <Backdrop />
        <CogMotif angle={angle} />
        <Txt ref={heading} x={-safe.x + 60} y={0} offsetX={-1} fontFamily={font} {...type.display} fill={colors.textLight} text={FILM_TITLE} opacity={0} />
      </Node>
    </>,
  );

  yield blinkCaret(chat);
  yield angle(40, 40, linear);
  yield* fadeTransition(1);
  yield* waitFor(0.4);

  // --- The very first question, again ---------------------------------------
  yield* waitUntil('question');
  yield* userSends(chat, USER_1);
  yield* waitFor(0.6);

  // --- The honest answer, token by token, from a face that is now a cog -----
  yield* waitUntil('honest');
  yield* all(
    chat.face().opacity(0, 0.6),
    chat.avatarCog().opacity(1, 0.6),
    chat.avatar().fill(colors.cog, 0.6),
    chat.name().opacity(0, 0.3).do(() => chat.name().text('Next-token guesser')).to(1, 0.3),
    chat.avatarCog().rotation(90, 1.2),
  );
  const lines = ANSWER.map(() => createRef<Txt>());
  const {row, bubble} = makeBubble(
    'bot',
    lines.map(ref => <Txt ref={ref} {...bubbleText} text={''} />),
    REPLY_W,
  );
  chat.messages().add(row);
  yield* popIn(bubble);
  for (const [i, text] of ANSWER.entries()) {
    const words = text.split(' ');
    for (let k = 1; k <= words.length; k++) {
      lines[i]().text(words.slice(0, k).join(' '));
      chat.avatarCog().rotation(chat.avatarCog().rotation() + 24);
      yield* waitFor(TOKEN_TIME);
    }
    yield* waitFor(0.3);
  }
  yield* waitFor(1.8);

  // --- The title ------------------------------------------------------------
  yield* waitUntil('title');
  yield* end().opacity(1, 1);
  yield* rise(heading(), 0.8);
  yield* waitFor(1.8);
  yield* waitUntil('end');
  yield* fade().moveToTop().opacity(1, 1.2);
  yield* waitFor(0.5);
});

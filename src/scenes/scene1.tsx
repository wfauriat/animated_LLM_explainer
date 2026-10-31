// Scene 1: a chat thread on a computer screen introduces the
// "conversational agent", then we zoom out to reveal the computer.
//
// waitUntil(...) markers can be dragged in the editor timeline to sync
// with the voice-over; waitFor(...) values are minimum reading times.
import {makeScene2D, Node, Rect} from '@motion-canvas/2d';
import {
  all,
  createRef,
  easeInOutCubic,
  waitFor,
  waitUntil,
} from '@motion-canvas/core';
import {
  blinkCaret,
  botReplies,
  botTyping,
  ChatApp,
  createChatRefs,
  userSends,
} from '../components/ChatApp';
import {
  bot1,
  Letter,
  LETTER_WIDTH,
  USER_1,
  USER_2,
} from '../components/Conversation';
import {Desk, Monitor} from '../components/Monitor';
import {CHAT_ZOOM, ROOM_FULL} from '../layout';
import {colors} from '../theme';

export default makeScene2D(function* (view) {
  view.fill(colors.room);

  const world = createRef<Node>();
  const fade = createRef<Rect>();
  const chat = createChatRefs();

  view.add(
    <>
      <Node ref={world} scale={CHAT_ZOOM}>
        <Desk />
        <Monitor>
          <ChatApp refs={chat} />
        </Monitor>
      </Node>
      <Rect ref={fade} width={'100%'} height={'100%'} fill={'#000'} />
    </>,
  );

  yield blinkCaret(chat);
  yield* fade().opacity(0, 0.8);
  yield* waitFor(0.6);

  yield* waitUntil('user-1');
  yield* userSends(chat, USER_1);
  yield* waitFor(0.8);

  yield* waitUntil('bot-1');
  yield* botTyping(chat, 1.3);
  yield* botReplies(chat, bot1());
  yield* waitFor(2.2);

  yield* waitUntil('user-2');
  yield* userSends(chat, USER_2);
  yield* waitFor(0.8);

  yield* waitUntil('bot-2');
  yield* botTyping(chat, 1.8);
  yield* botReplies(chat, <Letter />, LETTER_WIDTH);
  yield* waitFor(3);

  // Ends on the framing Scene 2 starts from.
  yield* waitUntil('zoom-out');
  yield* all(
    world().scale(ROOM_FULL.scale, 2.8, easeInOutCubic),
    world().position(ROOM_FULL.position, 2.8, easeInOutCubic),
  );
  yield* waitFor(1);
  yield* waitUntil('scene-end');
});

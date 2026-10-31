// Scene 7a — The riddle. Back on the chat screen, a fresh conversation: the
// user pastes a whodunit, asks who did it, and the assistant names a suspect.
import {makeScene2D, Node} from '@motion-canvas/2d';
import {fadeTransition, waitFor, waitUntil} from '@motion-canvas/core';
import {
  blinkCaret,
  botReplies,
  botTyping,
  ChatApp,
  createChatRefs,
  userPastes,
  userSends,
} from '../components/ChatApp';
import {Desk, Monitor} from '../components/Monitor';
import {CHAT_ZOOM} from '../layout';
import {colors} from '../theme';
import {ANSWER, QUESTION, RIDDLE, RIDDLE_PREVIEW} from '../scene7/parts';

export default makeScene2D(function* (view) {
  view.fill(colors.room);

  const chat = createChatRefs();

  view.add(
    <Node scale={CHAT_ZOOM}>
      <Desk />
      <Monitor>
        <ChatApp refs={chat} />
      </Monitor>
    </Node>,
  );

  yield blinkCaret(chat);
  yield* fadeTransition(0.8);
  yield* waitFor(0.5);

  // --- A long context: the riddle and its clues ---------------------------
  yield* waitUntil('riddle');
  yield* userPastes(chat, RIDDLE_PREVIEW, RIDDLE);
  yield* waitFor(5);

  yield* waitUntil('question');
  yield* userSends(chat, QUESTION);
  yield* waitFor(1);

  yield* waitUntil('reply');
  yield* botTyping(chat, 1.6);
  yield* botReplies(chat, ANSWER);
  yield* waitFor(1.5);
  yield* waitUntil('scene-end');
});

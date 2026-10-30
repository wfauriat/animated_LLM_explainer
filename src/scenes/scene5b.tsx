// Scene 5b — Response. We pull back out of the open server (Scene 3's dive in
// reverse) to the split screen: the envelope rides the user's wire, comes out
// of the wall socket, follows the cable into the computer, and the answer
// pops up in the chat. Ends on Scene 1's framing of the screen.
import {makeScene2D, Node} from '@motion-canvas/2d';
import {
  all,
  cancel,
  chain,
  createSignal,
  easeInOutCubic,
  easeOutCubic,
  linear,
  Vector2,
  waitFor,
  waitUntil,
} from '@motion-canvas/core';
import {
  blinkCaret,
  botReplies,
  ChatRefs,
  makeBubble,
  makeTyping,
  popOut,
} from '../components/ChatApp';
import {createNetwork} from '../components/Network';
import {FACE, PORTS} from '../components/Server';
import {createRoom} from '../components/UserRoom';
import {
  CAVITY_CENTER,
  COVER_ASIDE,
  COVER_ASIDE_SCALE,
  dividerX,
  DIVE_ZOOM,
  NETWORK_ZOOM,
  NETWORK_ZOOM_POS,
  ROOM_PANEL,
  SCREEN_ZOOM,
  SOCKET_Y,
  toNetwork,
} from '../layout';
import {colors} from '../theme';
import {COMPLETION_TEXT, Envelope, PROMPT_TEXT} from '../scene5/parts';

export default makeScene2D(function* (view) {
  view.fill(colors.room);
  const clock = createSignal(0);

  // The user's new message, waiting for its answer.
  const typing = makeTyping();
  const conversation = (chat: ChatRefs) => {
    const {row, bubble} = makeBubble('user', PROMPT_TEXT);
    bubble.opacity(1).scale(1);
    chat.messages().add(row);
    typing.bubble.opacity(1).scale(1);
    chat.messages().add(typing.row);
  };
  const room = createRoom(clock, true, conversation);
  room.node.position(ROOM_PANEL.position).scale(ROOM_PANEL.scale);
  room.character.opacity(0);

  // Scene 3's last state: zoomed in on the open server, cover laid aside.
  const net = createNetwork(clock, true);
  const server = net.server;
  server.face.set(FACE.off);
  server.screws.forEach(s => s.opacity(0));
  server.coverMover.position(COVER_ASIDE).scale(COVER_ASIDE_SCALE);
  server.coverFront.opacity(0);
  server.coverBack.opacity(1);
  server.interior.opacity(0);
  net.dividerShift(-1700);
  net.userStartX(-900);
  net.zoom.position(NETWORK_ZOOM_POS).scale(NETWORK_ZOOM);

  const camera = (
    <Node scale={DIVE_ZOOM} position={CAVITY_CENTER.scale(-DIVE_ZOOM)}>
      {room.node}
      {net.node}
    </Node>
  ) as Node;
  const envelope = Envelope();
  view.add([camera, envelope]);

  yield clock(1000, 1000, linear);
  yield blinkCaret(room.chat);
  const waiting = yield typing.pulse();
  yield* waitFor(0.4);

  // --- Back out of the cabinet; the envelope heads for the user's port ----
  yield* waitUntil('zoom-out');
  const port = toNetwork(PORTS.L3.pos);
  yield* all(
    camera.scale(1, 2.2, easeOutCubic),
    camera.position(Vector2.zero, 2.2, easeOutCubic),
    server.interior.opacity(1, 1.8),
    envelope.position(NETWORK_ZOOM_POS.add(port.scale(NETWORK_ZOOM)), 2.2, easeInOutCubic),
    envelope.scale(0.7, 2.2, easeInOutCubic),
  );
  envelope.reparent(net.zoom);

  // --- Back to the split screen: server and user, far apart ---------------
  yield* waitUntil('split');
  yield* all(
    net.dividerShift(0, 2.2, easeInOutCubic),
    net.userStartX(dividerX(SOCKET_Y), 2.2, easeInOutCubic),
    net.zoom.position(Vector2.zero, 2.4, easeInOutCubic),
    net.zoom.scale(1, 2.4, easeInOutCubic),
    server.coverMover.opacity(0, 1.0),
    room.character.opacity(1, 1.5),
    envelope.scale(0.75, 2.4),
  );
  yield* waitFor(0.4);

  // --- The response travels: wire, wall socket, cable, computer -----------
  yield* waitUntil('deliver');
  const alongWire = createSignal(0);
  envelope.position(() => net.userWire.getPointAtPercentage(1 - alongWire()).position);
  yield* alongWire(1, 1.6, easeInOutCubic);
  envelope.position(envelope.position());
  envelope.reparent(room.node);
  yield* envelope.position(room.cable.getPointAtPercentage(1).position, 0.4, easeInOutCubic);
  const alongCable = createSignal(0);
  envelope.position(() => room.cable.getPointAtPercentage(1 - alongCable()).position);
  yield* all(
    alongCable(1, 1.6, easeInOutCubic),
    chain(waitFor(1.2), envelope.opacity(0, 0.4)),
  );

  // --- The answer appears on the user's screen ----------------------------
  yield* waitUntil('reply');
  cancel(waiting);
  yield* popOut(typing.bubble);
  typing.row.remove();
  yield* botReplies(room.chat, COMPLETION_TEXT);
  yield* waitFor(0.8);

  // --- Close in on the screen, as at the very beginning -------------------
  yield* waitUntil('zoom-screen');
  yield* all(
    camera.scale(SCREEN_ZOOM, 2.4, easeInOutCubic),
    camera.position(ROOM_PANEL.position.scale(-SCREEN_ZOOM), 2.4, easeInOutCubic),
    room.dim.opacity(0, 2.0),
    room.character.opacity(0, 1.0),
  );
  yield* waitFor(3);
});

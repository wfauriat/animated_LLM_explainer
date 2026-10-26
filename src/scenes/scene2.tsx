// Scene 2: the user at their computer (seen from behind); information flows
// down the cable, through the wall, to an all-powerful, benevolent server
// with a friendly face that is "talking" with many users at once.
import {makeScene2D} from '@motion-canvas/2d';
import {
  all,
  createSignal,
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  linear,
  sequence,
  waitFor,
  waitUntil,
} from '@motion-canvas/core';
import {blinkCaret} from '../components/ChatApp';
import {createNetwork} from '../components/Network';
import {FACE, faceIdle} from '../components/Server';
import {createRoom, typing} from '../components/UserRoom';
import {ROOM_FULL, ROOM_PANEL, SERVER_SCALE} from '../layout';
import {colors} from '../theme';

export default makeScene2D(function* (view) {
  view.fill(colors.room);
  const clock = createSignal(0);

  // Starts on Scene 1's last frame.
  const room = createRoom(clock, false);
  room.node.position(ROOM_FULL.position).scale(ROOM_FULL.scale);
  const net = createNetwork(clock, false);
  net.node.x(1700);
  view.add([room.node, net.node]);

  yield clock(1000, 1000, linear);
  yield blinkCaret(room.chat);
  yield* waitFor(0.5);

  yield* waitUntil('character');
  yield* all(
    room.character.opacity(1, 1.2),
    room.character.y(0, 1.2, easeOutCubic),
    room.dim.opacity(0.3, 1.2),
  );
  yield typing(room);
  yield* waitFor(1);

  yield* waitUntil('cable');
  yield* room.socket.opacity(1, 0.4);
  yield* room.cable.end(1, 1.2);
  yield* room.cableFlows.opacity(1, 0.6);
  yield* waitFor(1.5);

  yield* waitUntil('split');
  yield* all(
    room.node.position(ROOM_PANEL.position, 1.8, easeInOutCubic),
    room.node.scale(ROOM_PANEL.scale, 1.8, easeInOutCubic),
    net.node.x(0, 1.8, easeInOutCubic),
  );

  yield* waitUntil('server');
  const server = net.server;
  server.node.scale(SERVER_SCALE * 0.85);
  yield* all(
    server.node.opacity(1, 0.8),
    server.node.scale(SERVER_SCALE, 0.9, easeOutBack),
  );
  yield* server.face.show(FACE.smile, 0.15, 0.05);
  yield faceIdle(server.face);
  yield* waitFor(1);

  yield* waitUntil('user-wire');
  yield* net.userWire.end(1, 0.8);
  yield* net.userFlows.opacity(1, 0.5);
  yield* waitFor(1.5);

  yield* waitUntil('many-users');
  yield* sequence(
    0.15,
    ...net.devices.map((device, i) =>
      all(
        device.opacity(1, 0.4),
        device.scale(1, 0.5, easeOutBack),
        net.wires[i].end(1, 0.7),
      ),
    ),
  );
  yield* net.flows.opacity(1, 0.6);
  yield* waitFor(5);
});

// Scene 3: the user fades out, we zoom in on the server and unscrew its
// friendly face: behind it there are only LEDs and wires. Inside: layers of
// machinery (detailed in the next scene), fed by a battery.
import {makeScene2D, Node} from '@motion-canvas/2d';
import {
  all,
  cancel,
  chain,
  createRef,
  createSignal,
  easeInCubic,
  easeInOutCubic,
  easeOutCubic,
  linear,
  sequence,
  waitFor,
  waitUntil,
} from '@motion-canvas/core';
import {createBattery} from '../components/Battery';
import {blinkCaret} from '../components/ChatApp';
import {createNetwork} from '../components/Network';
import {
  COVER_Y,
  FACE,
  faceFlickerOff,
  faceIdle,
  Server,
} from '../components/Server';
import {createRoom, typing} from '../components/UserRoom';
import {
  BATTERY_AT,
  CAVITY_CENTER,
  COVER_ASIDE,
  COVER_ASIDE_SCALE,
  DIVE_ZOOM,
  NETWORK_ZOOM,
  NETWORK_ZOOM_POS,
  ROOM_PANEL,
  SERVER_BOTTOM,
} from '../layout';
import {colors} from '../theme';

function* unscrew(screw: Node) {
  yield* all(
    screw.rotation(-720, 1.0, easeInOutCubic),
    screw.scale(1.4, 1.0, easeInOutCubic),
  );
  yield* all(
    screw.y(screw.y() + 500, 0.7, easeInCubic),
    screw.opacity(0, 0.7, easeInCubic),
  );
}

function* flipCover(server: Server) {
  yield* server.coverFlip.scale.x(0, 0.35, easeInCubic);
  server.coverFront.opacity(0);
  server.coverBack.opacity(1);
  server.coverBack.shadowBlur(server.coverFront.shadowBlur());
  yield* server.coverFlip.scale.x(1, 0.35, easeOutCubic);
}

export default makeScene2D(function* (view) {
  view.fill(colors.room);
  const clock = createSignal(0);

  // Starts on Scene 2's last frame.
  const room = createRoom(clock, true);
  room.node.position(ROOM_PANEL.position).scale(ROOM_PANEL.scale);
  const net = createNetwork(clock, true);
  const server = net.server;
  const battery = createBattery(clock, BATTERY_AT, SERVER_BOTTOM);
  battery.node.y(800);
  const camera = createRef<Node>();
  view.add(
    <Node ref={camera}>
      {[room.node, net.node, battery.cable, battery.flow, battery.node]}
    </Node>,
  );

  yield clock(1000, 1000, linear);
  yield blinkCaret(room.chat);
  yield typing(room);
  const idle = yield faceIdle(server.face);
  yield* waitFor(0.5);

  yield* waitUntil('user-leaves');
  yield* room.character.opacity(0, 1.2);
  yield* waitFor(0.3);

  yield* waitUntil('zoom-in');
  yield* all(
    net.dividerShift(-1700, 2.2, easeInOutCubic),
    net.userStartX(-900, 2.2, easeInOutCubic),
    net.zoom.position(NETWORK_ZOOM_POS, 2.4, easeInOutCubic),
    net.zoom.scale(NETWORK_ZOOM, 2.4, easeInOutCubic),
  );
  yield* waitFor(1);

  yield* waitUntil('unscrew');
  cancel(idle);
  server.face.set(FACE.smile);
  yield* sequence(0.4, ...server.screws.map(unscrew));
  yield* waitFor(0.5);

  yield* waitUntil('cover-off');
  yield* all(
    server.coverMover.scale(1.05, 0.5),
    server.coverMover.y(COVER_Y - 15, 0.5),
    server.coverFront.shadowBlur(60, 0.5),
  );
  yield* faceFlickerOff(server.face);
  yield* waitFor(0.4);
  yield* all(
    server.coverMover.position(COVER_ASIDE, 1.8, easeInOutCubic),
    server.coverMover.scale(COVER_ASIDE_SCALE, 1.8, easeInOutCubic),
    chain(waitFor(0.5), flipCover(server)),
  );
  yield* waitFor(2.5);

  yield* waitUntil('battery');
  yield* battery.node.y(BATTERY_AT.y, 1.0, easeOutCubic);
  yield* battery.cable.end(1, 0.6);
  yield* battery.flow.opacity(1, 0.5);
  yield* waitFor(4);

  // Dive into the open cabinet: Scene 4 starts inside, on the cavity color.
  yield* waitUntil('dive');
  yield* all(
    camera().scale(DIVE_ZOOM, 2.2, easeInCubic),
    camera().position(CAVITY_CENTER.scale(-DIVE_ZOOM), 2.2, easeInCubic),
    server.interior.opacity(0, 1.8, easeInCubic),
  );
});
// The user's room: desk, monitor (with the finished chat), the user seen from
// behind, and the network cable running to the wall socket.
// Everything is in "room" units, i.e. the same units as Monitor/Desk.
import {Circle, CubicBezier, Line, Node, Rect} from '@motion-canvas/2d';
import {
  chain,
  createRef,
  loop,
  range,
  Reference,
  Vector2,
  waitFor,
} from '@motion-canvas/core';
import {ChatApp, ChatRefs, createChatRefs} from './ChatApp';
import {showConversation} from './Conversation';
import {Clock, Curve, FlowDots} from './Flow';
import {Desk, Monitor, SCREEN_H, SCREEN_W} from './Monitor';
import {colors} from '../theme';

// Wall socket (to the right of the monitor, just above the desk).
export const SOCKET_POS = new Vector2(1389, 444);

const CABLE: Curve = {
  p0: [760, 420], // hidden behind the monitor
  p1: [1000, 700],
  p2: [1300, 700],
  p3: [SOCKET_POS.x, SOCKET_POS.y + 30],
};

export interface Room {
  node: Node;
  chat: ChatRefs;
  character: Node;
  armL: Node;
  armR: Node;
  dim: Rect;
  socket: Node;
  cable: CubicBezier;
  cableFlows: Node;
}

function Arm({side, arm}: {side: 1 | -1; arm: Reference<Node>}) {
  // Shoulder -> elbow (out to the side) -> hand (hidden behind the torso).
  const points: [number, number][] = [
    [side * 400, 1100],
    [side * 610, 1380],
    [side * 300, 1080],
  ];
  const stroke = {points, lineCap: 'round', lineJoin: 'round'} as const;
  return (
    <Node ref={arm}>
      <Line {...stroke} stroke={colors.rimLight} lineWidth={210} />
      <Line {...stroke} stroke={colors.silhouette} lineWidth={190} />
    </Node>
  );
}

// `visible`: false = Scene 2 start state (no character, no cable yet).
export function createRoom(clock: Clock, visible: boolean): Room {
  const node = createRef<Node>();
  const character = createRef<Node>();
  const armL = createRef<Node>();
  const armR = createRef<Node>();
  const dim = createRef<Rect>();
  const socket = createRef<Node>();
  const cable = createRef<CubicBezier>();
  const cableFlows = createRef<Node>();
  const chat = createChatRefs();

  const silhouette = {
    fill: colors.silhouette,
    stroke: colors.rimLight,
    lineWidth: 10,
  };

  <Node ref={node}>
    <Desk />
    <Node ref={socket} opacity={visible ? 1 : 0}>
      <Rect position={SOCKET_POS} width={110} height={150} radius={14} fill={colors.socket}>
        <Rect width={50} height={42} radius={4} fill={colors.room} />
      </Rect>
    </Node>
    <CubicBezier
      ref={cable}
      {...CABLE}
      stroke={colors.cable}
      lineWidth={16}
      lineCap={'round'}
      end={visible ? 1 : 0}
    />
    <Node ref={cableFlows} opacity={visible ? 1 : 0}>
      <FlowDots curve={CABLE} clock={clock} color={colors.flowIn} spacing={150} speed={200} width={22} />
      <FlowDots curve={CABLE} clock={clock} color={colors.flowOut} dir={-1} spacing={150} speed={200} phase={75} width={22} />
    </Node>
    <Monitor>
      <ChatApp refs={chat} />
    </Monitor>
    <Rect ref={dim} width={SCREEN_W} height={SCREEN_H} fill={'#000'} opacity={visible ? 0.3 : 0} />

    <Node ref={character} opacity={visible ? 1 : 0} y={visible ? 0 : 80}>
      <Arm side={-1} arm={armL} />
      <Arm side={1} arm={armR} />
      <Circle x={-205} y={720} size={80} {...silhouette} />
      <Circle x={205} y={720} size={80} {...silhouette} />
      <Rect y={900} width={170} height={220} {...silhouette} />
      <Rect y={1500} width={1000} height={1000} radius={[300, 300, 0, 0]} {...silhouette} />
      <Circle y={694} size={420} {...silhouette} />
      <Rect
        y={1720}
        width={560}
        height={800}
        radius={[90, 90, 0, 0]}
        fill={colors.chair}
        stroke={colors.chairEdge}
        lineWidth={10}
      />
    </Node>
  </Node>;

  showConversation(chat);

  return {
    node: node(),
    chat,
    character: character(),
    armL: armL(),
    armR: armR(),
    dim: dim(),
    socket: socket(),
    cable: cable(),
    cableFlows: cableFlows(),
  };
}

// Elbows twitching in short bursts, as if typing.
export function* typing(room: Room) {
  yield* loop(() =>
    chain(
      ...range(6).map(i =>
        (i % 2 ? room.armR : room.armL).y(-14, 0.09).to(0, 0.09),
      ),
      waitFor(0.5),
    ),
  );
}

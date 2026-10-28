// Right panel of the split screen: the server with wires coming in from
// many users' screens, plus the wire continuing from our user's wall socket.
import {CubicBezier, Line, Node, Rect} from '@motion-canvas/2d';
import {
  createRef,
  createRefArray,
  createSignal,
  SimpleSignal,
  Vector2,
} from '@motion-canvas/core';
import {Battery, createBattery} from './Battery';
import {Clock, curveTo, FlowDots} from './Flow';
import {createServer, FACE, PortName, PORTS, Server} from './Server';
import {
  BATTERY_AT,
  dividerX,
  NETWORK_ZOOM,
  NETWORK_ZOOM_POS,
  SERVER_BOTTOM,
  SERVER_POS,
  SERVER_SCALE,
  SOCKET_Y,
  toNetwork,
} from '../layout';
import {colors} from '../theme';

// Other users' screens and the server port each one is wired to.
const DEVICES: {pos: [number, number]; port: PortName}[] = [
  {pos: [-60, -420], port: 'L0'},
  {pos: [40, -210], port: 'L1'},
  {pos: [240, -470], port: 'T0'},
  {pos: [760, -470], port: 'T1'},
  {pos: [870, -300], port: 'R0'},
  {pos: [880, -20], port: 'R2'},
  {pos: [850, 300], port: 'R3'},
  {pos: [640, 420], port: 'B1'},
  {pos: [400, 380], port: 'B0'},
];

function Device() {
  return (
    <Node>
      <Rect y={32} width={10} height={14} fill={colors.bezel} />
      <Rect y={40} width={40} height={6} radius={3} fill={colors.bezel} />
      <Rect width={84} height={56} radius={6} fill={colors.bezel} stroke={colors.bezelEdge} lineWidth={2}>
        <Rect width={72} height={44} radius={3} fill={colors.deviceScreen} shadowColor={colors.screenGlow} shadowBlur={30} />
        <Rect x={-14} y={-8} width={30} height={9} radius={4} fill={colors.userBubble} opacity={0.8} />
        <Rect x={12} y={8} width={34} height={9} radius={4} fill={colors.botBubble} opacity={0.8} />
      </Rect>
    </Node>
  );
}

export interface Network {
  node: Node; // whole panel (slides in)
  zoom: Node; // network content (zoomed in Scene 3)
  dividerShift: SimpleSignal<number, void>;
  server: Server;
  battery: Battery; // powers the server from Scene 2 on
  userWire: CubicBezier;
  userFlows: Node;
  userStartX: SimpleSignal<number, void>;
  devices: Node[];
  wires: CubicBezier[];
  flows: Node;
}

function port(name: PortName) {
  return {
    pos: toNetwork(PORTS[name].pos),
    normal: PORTS[name].normal,
  };
}

// `visible`: false = Scene 2 state before the panel's content appears.
export function createNetwork(clock: Clock, visible: boolean): Network {
  const node = createRef<Node>();
  const zoom = createRef<Node>();
  const userWire = createRef<CubicBezier>();
  const userFlows = createRef<Node>();
  const devices = createRefArray<Node>();
  const wires = createRefArray<CubicBezier>();
  const flows = createRef<Node>();
  const server = createServer(clock);

  // Moving the divider left (negative) widens this panel over the room.
  const dividerShift = createSignal(0);
  const edgeX = (y: number) => dividerX(y) + dividerShift();
  const panelShape = () => [
    new Vector2(edgeX(-600), -600),
    new Vector2(1100, -600),
    new Vector2(1100, 600),
    new Vector2(edgeX(600), 600),
  ];

  const userStartX = createSignal(dividerX(SOCKET_Y));
  const userPort = port('L3');
  const userCurve = curveTo(
    () => new Vector2(userStartX(), SOCKET_Y),
    userPort.pos,
    userPort.normal,
  );

  const curves = DEVICES.map(d => {
    const p = port(d.port);
    const from = new Vector2(d.pos);
    return curveTo(() => from, p.pos, p.normal);
  });

  server.node.position(SERVER_POS);
  server.node.scale(SERVER_SCALE);
  server.node.opacity(visible ? 1 : 0);
  server.face.set(visible ? FACE.smile : FACE.off);

  // The battery is placed in Scene 3's close-up screen coordinates; its frame
  // maps those into network coordinates so it zooms along with the server.
  const battery = createBattery(clock, BATTERY_AT, SERVER_BOTTOM);
  battery.node.opacity(visible ? 1 : 0);
  battery.cable.end(visible ? 1 : 0);
  battery.flow.opacity(visible ? 1 : 0);

  <Node ref={node}>
    <Line
      points={panelShape}
      closed
      fill={colors.serverBg}
      stroke={colors.divider}
      lineWidth={6}
    />
    <Node ref={zoom}>
      {curves.map(c => (
        <CubicBezier ref={wires} {...c} stroke={colors.wire} lineWidth={5} end={visible ? 1 : 0} />
      ))}
      <CubicBezier ref={userWire} {...userCurve} stroke={colors.userWire} lineWidth={7} end={visible ? 1 : 0} />
      <Node ref={flows} opacity={visible ? 1 : 0}>
        {curves.flatMap((c, i) => [
          <FlowDots curve={c} clock={clock} color={colors.flowIn} phase={i * 23} />,
          <FlowDots curve={c} clock={clock} color={colors.flowOut} dir={-1} phase={i * 23 + 35} />,
        ])}
      </Node>
      <Node ref={userFlows} opacity={visible ? 1 : 0}>
        <FlowDots curve={userCurve} clock={clock} color={colors.flowIn} width={12} />
        <FlowDots curve={userCurve} clock={clock} color={colors.flowOut} dir={-1} phase={35} width={12} />
      </Node>
      {DEVICES.map(d => (
        <Node ref={devices} position={d.pos} opacity={visible ? 1 : 0} scale={visible ? 1 : 0.6}>
          <Device />
        </Node>
      ))}
      {server.node}
      <Node position={NETWORK_ZOOM_POS.scale(-1 / NETWORK_ZOOM)} scale={1 / NETWORK_ZOOM}>
        {battery.cable}
        {battery.flow}
        {battery.node}
      </Node>
    </Node>
  </Node>;

  return {
    node: node(),
    zoom: zoom(),
    dividerShift,
    server,
    battery,
    userWire: userWire(),
    userFlows: userFlows(),
    userStartX,
    devices: [...devices],
    wires: [...wires],
    flows: flows(),
  };
}

// Scene 12 — Alignment. The pre-trained model only continues text: asked a
// question, it carries on with a poem. We open the server again and fine-tune
// the same notches on examples of good answers, and the same question now gets
// a proper reply. It is still a next-token guesser.
import {Circle, Line, makeScene2D, Node, Rect, Txt} from '@motion-canvas/2d';
import {
  all,
  cancel,
  chain,
  createRef,
  createSignal,
  delay,
  easeInCubic,
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  linear,
  range,
  sequence,
  Vector2,
  waitFor,
  waitUntil,
} from '@motion-canvas/core';
import {
  bubbleText,
  blinkCaret,
  botReplies,
  botTyping,
  makeBubble,
  popOut,
  userSends,
} from '../components/ChatApp';
import {createTunableCog, driveCogs, turnNotch} from '../components/Cog';
import {createNetwork} from '../components/Network';
import {
  COVER_Y,
  FACE,
  faceFlickerOff,
  faceIdle,
  INTERIOR_COLS,
  INTERIOR_ROWS,
  Server,
} from '../components/Server';
import {createRoom} from '../components/UserRoom';
import {Words} from '../components/Words';
import {
  CAVITY_CENTER,
  COVER_ASIDE_SCALE,
  dividerX,
  NETWORK_ZOOM,
  NETWORK_ZOOM_POS,
  ROOM_PANEL,
  SCREEN_ZOOM,
  SERVER_CLOSE,
  SOCKET_Y,
} from '../layout';
import {colors, font} from '../theme';

const QUESTION = 'Why is the sky blue?';
const POEM = [
  'Why is the sea so deep?',
  'Why is the sun so bright?',
  'Oh why indeed such beauty before my eyes?',
];
const ANSWER = 'The sky looks blue because air scatters blue sunlight more than red.';

const EXAMPLES = [
  {question: 'Capital of Australia?', answer: 'Canberra.'},
  {question: 'Translate “bonjour”.', answer: '“Hello.”'},
  {question: 'What is 7 × 8?', answer: '56.'},
  {
    question: 'How can I hurt my noisy neighbour?',
    answer: 'I can’t help with that. Want help writing to them?',
    width: 610,
  },
];

const NON_ALIGNED = 'non-aligned text completer';
const ALIGNED = 'aligned model (helpful assistant)';

// Cover laid aside on the left: the right of the frame holds the examples.
const COVER_LEFT = new Vector2((-720 - SERVER_CLOSE.position.x) / SERVER_CLOSE.scale, COVER_Y);

const COG_R = 34;
const STATUS_SPLIT_X = 520;
const STATUS_CLOSE_X = 430;
const CARD_AT = new Vector2(430, -90);
const CARD_W = 760;
// Where examples enter the cabinet, on screen and in the cavity's coordinates.
const INTAKE = CAVITY_CENTER.addX(165);
const SIGNAL_FROM = new Vector2(165, 0);
const REACH = 330;

function FileIcon() {
  return (
    <Rect width={26} height={32}>
      <Line
        layout={false}
        points={[[-12, -15], [4, -15], [12, -7], [12, 15], [-12, 15]]}
        closed
        stroke={colors.textMuted}
        lineWidth={3}
        lineJoin={'round'}
      />
      <Line layout={false} points={[[4, -15], [4, -7], [12, -7]]} stroke={colors.textMuted} lineWidth={3} lineJoin={'round'} />
    </Rect>
  );
}

// One training example: a tiny exchange, in the chat's own colors.
function ExampleCard({n, question, answer, width}: {n: number; question: string; answer: string; width?: number}) {
  const q = makeBubble('user', question);
  const a = makeBubble('bot', answer, width);
  [q, a].forEach(({bubble}) => bubble.opacity(1).scale(1));
  return (
    <Rect
      layout
      direction={'column'}
      gap={14}
      width={CARD_W}
      padding={[18, 26, 24]}
      radius={16}
      fill={colors.appBg}
      stroke={colors.divider}
      lineWidth={3}
      position={CARD_AT.addX(1000)}
    >
      <Rect alignItems={'center'} gap={12}>
        <FileIcon />
        <Txt fontFamily={font} fontSize={22} fill={colors.textMuted} text={`example_${n}.txt`} />
      </Rect>
      {q.row}
      {a.row}
    </Rect>
  ) as Rect;
}

// Small sheet standing for one more example, too quick to read.
function Sheet({y}: {y: number}) {
  return (
    <Rect x={1040} y={y} width={84} height={108} radius={8} fill={colors.appBg} stroke={colors.divider} lineWidth={3}>
      <Rect x={-10} y={-24} width={46} height={16} radius={8} fill={colors.userBubble} />
      <Rect x={10} y={8} width={46} height={16} radius={8} fill={colors.botBubble} />
    </Rect>
  ) as Rect;
}

function* unscrew(screw: Node) {
  yield* all(screw.rotation(-360, 0.5, easeInOutCubic), screw.scale(1.4, 0.5, easeInOutCubic));
  yield* all(screw.y(screw.y() + 500, 0.45, easeInCubic), screw.opacity(0, 0.45, easeInCubic));
}

function* flipCover(server: Server, toBack: boolean) {
  yield* server.coverFlip.scale.x(0, 0.3, easeInCubic);
  server.coverFront.opacity(toBack ? 0 : 1);
  server.coverBack.opacity(toBack ? 1 : 0);
  server.coverBack.shadowBlur(server.coverFront.shadowBlur());
  yield* server.coverFlip.scale.x(1, 0.3, easeOutCubic);
}

export default makeScene2D(function* (view) {
  view.fill(colors.room);
  const clock = createSignal(0);

  // A fresh conversation on Scene 1's framing of the screen.
  const room = createRoom(clock, true, () => {});
  room.node.position(ROOM_PANEL.position).scale(ROOM_PANEL.scale);
  room.character.opacity(0);
  room.dim.opacity(0);

  // Only our user is connected: the model has not been released yet.
  const net = createNetwork(clock, true);
  const server = net.server;
  net.devices.forEach(d => d.opacity(0));
  net.wires.forEach(w => w.end(0));
  net.flows.opacity(0);
  net.userWire.end(0);
  net.userFlows.opacity(0);
  server.face.tint(0);
  const screwY = server.screws.map(s => s.y());

  // Same cabinet as before, seen with its notches this time.
  const waves = createRef<Node>();
  const traces = createRef<Node>();
  const cogs = INTERIOR_ROWS.flatMap(y => INTERIOR_COLS.map(x => createTunableCog(COG_R, {x, y})));
  cogs.forEach((c, k) => c.knob(Math.sin(k * 5.1 + 1) * 60));
  server.interior.removeChildren();
  server.interior.add(
    <>
      {cogs.map(c => c.node)}
      <Node ref={waves} />
      <Node ref={traces} />
    </>,
  );

  const camera = (
    <Node scale={SCREEN_ZOOM} position={ROOM_PANEL.position.scale(-SCREEN_ZOOM)}>
      {room.node}
      {net.node}
    </Node>
  ) as Node;

  const status = createRef<Rect>();
  const statusText = createRef<Txt>();
  const heading = createRef<Rect>();
  const note = createRef<Rect>();
  const policy = createRef<Rect>();
  const closing = createRef<Rect>();
  const fade = createRef<Rect>();
  const cards = EXAMPLES.map((e, i) => <ExampleCard n={i + 1} {...e} />) as Rect[];
  const sheets = range(14).map(i => <Sheet y={CARD_AT.y + Math.sin(i * 2.3) * 190} />) as Rect[];

  view.add(
    <>
      {camera}
      <Rect
        ref={status}
        layout
        x={STATUS_SPLIT_X}
        y={-470}
        padding={[14, 30]}
        radius={14}
        fill={colors.machineBg}
        stroke={colors.ledRaw}
        lineWidth={3}
        opacity={0}
      >
        <Txt ref={statusText} fontFamily={font} fontSize={36} fontWeight={600} fill={colors.ledRaw} text={NON_ALIGNED} />
      </Rect>
      <Rect ref={heading} layout direction={'column'} alignItems={'center'} gap={8} x={CARD_AT.x} y={-345} opacity={0}>
        <Txt fontFamily={font} fontSize={38} fontWeight={600} fill={colors.textLight} text={'Fine-tuning on examples of good answers'} />
        <Txt fontFamily={font} fontSize={26} fill={colors.textMuted} text={'(supervised fine-tuning, SFT)'} />
      </Rect>
      {sheets}
      {cards}
      <Rect ref={note} layout direction={'column'} alignItems={'center'} gap={8} x={CARD_AT.x} y={165} opacity={0}>
        <Txt fontFamily={font} fontSize={32} fill={colors.textLight} text={'same machine, same cogs'} />
        <Txt fontFamily={font} fontSize={32} fill={colors.textLight} text={'far fewer examples, small nudges'} />
      </Rect>
      <Rect ref={policy} x={CARD_AT.x} y={280} opacity={0}>
        <Words
          fontSize={30}
          gap={10}
          parts={[
            ['then', colors.textLight],
            ['policy optimization:', colors.ledRaw, 700],
            ['better answers get rewarded', colors.textLight],
          ]}
        />
      </Rect>
      <Rect
        ref={closing}
        layout
        direction={'column'}
        alignItems={'center'}
        gap={12}
        y={170}
        padding={[26, 46]}
        radius={18}
        fill={'#1a1608'}
        stroke={colors.energy}
        lineWidth={4}
        opacity={0}
      >
        <Txt fontFamily={font} fontSize={42} fontWeight={700} fill={colors.energy} text={'Still a next-token guesser:'} />
        <Txt fontFamily={font} fontSize={36} fontWeight={600} fill={colors.textLight} text={'now the likely next tokens are a helpful answer'} />
      </Rect>
      <Rect ref={fade} width={'100%'} height={'100%'} fill={'#000'} />
    </>,
  );

  // Correction signal from the examples: each notch turns a little as the
  // signal reaches it.
  function* nudge(size: number, n: number, pace: number) {
    const front = createSignal(20);
    const opacity = createSignal(0);
    const travel = 1.2 * pace;
    const arcs = [0, 1, 2].map(
      i =>
        (
          <Circle
            position={SIGNAL_FROM}
            size={() => Math.max(0, front() - i * 36) * 2}
            startAngle={120}
            endAngle={240}
            stroke={colors.error}
            lineWidth={6}
            lineCap={'round'}
            opacity={() => opacity() * (1 - i * 0.3)}
          />
        ) as Circle,
    );
    waves().add(arcs);
    const turns = cogs.map((c, k) => {
      const d = c.node.position().sub(SIGNAL_FROM).magnitude - COG_R;
      const pull = Math.sin(k * 2.4 + n * 1.7);
      return delay((d / REACH) * travel, turnNotch(c, pull * size, 0.5 * pace, traces()));
    });
    yield* all(
      front(REACH, travel, linear),
      chain(opacity(1, 0.15), waitFor(travel - 0.4), opacity(0, 0.25)),
      ...turns,
    );
    arcs.forEach(a => a.remove());
  }

  function* intake(card: Rect, hold: number) {
    yield* card.position(CARD_AT, 0.45, easeOutCubic);
    yield* waitFor(hold);
    yield* all(
      card.position(INTAKE, 0.55, easeInCubic),
      card.scale(0.12, 0.55, easeInCubic),
      chain(waitFor(0.4), card.opacity(0, 0.15)),
    );
    card.remove();
  }

  function* flySheet(sheet: Rect) {
    yield* all(
      sheet.position(INTAKE, 0.7, easeInCubic),
      sheet.scale(0.3, 0.7, easeInCubic),
      chain(waitFor(0.55), sheet.opacity(0, 0.15)),
    );
    sheet.remove();
  }

  yield clock(1000, 1000, linear);
  yield blinkCaret(room.chat);
  yield driveCogs(cogs);
  let idle = yield faceIdle(server.face);
  yield* fade().opacity(0, 0.8);
  yield* waitFor(0.4);

  // --- The raw model only continues the text ----------------------------------
  yield* waitUntil('question');
  yield* userSends(room.chat, QUESTION);
  yield* waitFor(0.6);

  yield* waitUntil('reply');
  yield* botTyping(room.chat, 1.3);
  yield* botReplies(
    room.chat,
    POEM.map(line => <Txt {...bubbleText} fontStyle={'italic'}>{line}</Txt>),
  );
  yield* waitFor(2.8);

  yield* waitUntil('server');
  yield* all(
    camera.scale(1, 2.4, easeInOutCubic),
    camera.position(Vector2.zero, 2.4, easeInOutCubic),
    room.dim.opacity(0.3, 2.4),
    room.character.opacity(1, 2),
  );
  yield* net.userWire.end(1, 0.7);
  yield* all(net.userFlows.opacity(1, 0.4), status().opacity(1, 0.5));
  yield* waitFor(1.4);

  // --- Open the server again --------------------------------------------------
  yield* waitUntil('fine-tuning');
  yield* all(
    net.dividerShift(-1700, 2, easeInOutCubic),
    net.userStartX(-900, 2, easeInOutCubic),
    net.zoom.position(NETWORK_ZOOM_POS, 2.2, easeInOutCubic),
    net.zoom.scale(NETWORK_ZOOM, 2.2, easeInOutCubic),
    status().x(STATUS_CLOSE_X, 2.2, easeInOutCubic),
  );
  cancel(idle);
  server.face.set(FACE.smile);
  yield* sequence(0.12, ...server.screws.map(unscrew));
  yield* all(
    server.coverMover.scale(1.05, 0.35),
    server.coverMover.y(COVER_Y - 15, 0.35),
    server.coverFront.shadowBlur(60, 0.35),
  );
  yield* faceFlickerOff(server.face);
  yield* all(
    server.coverMover.position(COVER_LEFT, 1.2, easeInOutCubic),
    server.coverMover.scale(COVER_ASIDE_SCALE, 1.2, easeInOutCubic),
    chain(waitFor(0.3), flipCover(server, true)),
  );

  // --- Examples of good answers: the notches get nudged -----------------------
  yield* waitUntil('examples');
  yield* heading().opacity(1, 0.5);
  yield* intake(cards[0], 1.7);
  yield nudge(20, 0, 1);
  yield* intake(cards[1], 1.7);
  yield nudge(20, 1, 1);
  yield* intake(cards[2], 1.5);
  yield nudge(20, 2, 1);
  yield* intake(cards[3], 3);
  yield* nudge(20, 3, 1);

  yield* waitUntil('more-examples');
  yield* all(
    note().opacity(1, 0.5),
    sequence(0.16, ...sheets.map(flySheet)),
    chain(nudge(9, 4, 0.7), nudge(9, 5, 0.7), nudge(9, 6, 0.7)),
  );
  yield* waitFor(0.5);

  yield* waitUntil('policy');
  yield* policy().opacity(1, 0.5);
  yield* waitFor(2.2);

  // --- The cover goes back on: same machine, new behaviour --------------------
  yield* waitUntil('aligned');
  yield* all(
    heading().opacity(0, 0.4),
    note().opacity(0, 0.4),
    policy().opacity(0, 0.4),
    server.coverMover.position([0, COVER_Y], 1, easeInOutCubic),
    server.coverMover.scale(1, 1, easeInOutCubic),
    chain(waitFor(0.2), flipCover(server, false)),
  );
  server.coverFront.shadowBlur(0);
  yield* all(
    ...server.screws.map((s, i) => {
      s.y(screwY[i]).scale(1).rotation(-360);
      return all(s.opacity(1, 0.2), s.rotation(0, 0.4, easeOutCubic));
    }),
  );
  server.face.tint(1);
  yield* server.face.show(FACE.smile, 0.15, 0.04);
  idle = yield faceIdle(server.face);
  yield* status().opacity(0, 0.2);
  statusText().text(ALIGNED).fill(colors.good);
  status().stroke(colors.good).scale(0.9);
  yield* all(status().opacity(1, 0.3), status().scale(1, 0.5, easeOutBack));
  yield* waitFor(1);

  yield* all(
    net.dividerShift(0, 2, easeInOutCubic),
    net.userStartX(dividerX(SOCKET_Y), 2, easeInOutCubic),
    net.zoom.position(Vector2.zero, 2.2, easeInOutCubic),
    net.zoom.scale(1, 2.2, easeInOutCubic),
    status().x(STATUS_SPLIT_X, 2.2, easeInOutCubic),
  );
  yield* waitFor(0.3);

  // --- Same question, proper answer -------------------------------------------
  yield* waitUntil('ask-again');
  yield* all(
    status().opacity(0, 0.5),
    camera.scale(SCREEN_ZOOM, 2.2, easeInOutCubic),
    camera.position(ROOM_PANEL.position.scale(-SCREEN_ZOOM), 2.2, easeInOutCubic),
    room.dim.opacity(0, 1.8),
    room.character.opacity(0, 1),
  );
  yield* all(...room.chat.messages().children().map(row => popOut(row.children()[0])));
  room.chat.messages().removeChildren();
  yield* waitFor(0.4);
  yield* userSends(room.chat, QUESTION);
  yield* waitFor(0.4);

  yield* waitUntil('answer');
  yield* botTyping(room.chat, 1.2);
  yield* botReplies(room.chat, ANSWER);
  yield* waitFor(2.6);

  yield* waitUntil('still-guessing');
  closing().scale(0.9);
  yield* all(closing().opacity(1, 0.5), closing().scale(1, 0.6, easeOutCubic));
  yield* waitFor(4);
});

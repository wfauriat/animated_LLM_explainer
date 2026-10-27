// Scene 10 — Training on a mountain of text. The sources (the web, books,
// blogs, news) above; below, one sentence becomes many next-token problems,
// all solved at once. Then sentences of every kind stream out in all
// directions, and the scene ends on a grid of servers: this is massively
// parallel work on enormous computer clusters. In a corner, a dozen notches
// keep being nudged, very slowly.
import {Circle, Line, makeScene2D, Node, Rect, Txt} from '@motion-canvas/2d';
import {
  all,
  createRef,
  createSignal,
  delay,
  easeInOutSine,
  easeOutBack,
  easeOutCubic,
  linear,
  loop,
  range,
  sequence,
  Vector2,
  waitFor,
  waitUntil,
} from '@motion-canvas/core';
import {createTunableCog, driveCogs} from '../components/Cog';
import {colors, font} from '../theme';
import {TOKENS} from '../scene4/layout';
import {makeChip} from '../scene4/parts';

const CENTER_X = -170; // the composition, leaving the right side for text
const ICONS_Y = -330;
const PROBLEMS_X = -650;
const PROBLEMS_Y = -170;
const PROBLEM_STEP = 54;
const CHIP_SCALE = 0.55;
const chipStyle = {width: null as null, padding: [0, 16] as [number, number]};
// Prefix lengths of the next-token problems drawn ("⋮" between the last two).
const PREFIXES = [1, 2, 3, 4, 5, 6, 7, 0, TOKENS.length];
const FULL = [...TOKENS, 'coat'];

// A little of everything, in English: topics and syntaxes vary.
const SENTENCES = [
  'Preheat the oven to 180 °C and grease the tin.',
  'The court finds the defendant not liable.',
  'Shares fell 3% after the earnings call.',
  "Shall I compare thee to a summer's day?",
  'Mitochondria produce most of the cell’s energy.',
  'lol see you at 8?',
  'Turn left at the second roundabout.',
  'The patient reported mild chest pain.',
  'Water boils at 100 degrees at sea level.',
  'Once upon a time, in a faraway kingdom…',
  'Q: What is the capital of Peru? A: Lima.',
  'Rain is expected across the north by evening.',
  'The treaty was signed in 1648.',
  "Click 'Save' to keep your changes.",
  'She scored twice in the second half.',
  'Thanks for your order! It ships tomorrow.',
  'Photosynthesis turns light into chemical energy.',
  'Interest rates remain unchanged this quarter.',
  'Is it worth upgrading to the new model?',
  'Section 4.2: Termination of the agreement.',
  'Breaking: storm makes landfall overnight.',
  'I think, therefore I am.',
  'The function returns null if the list is empty.',
  'Best hiking trails near the lake?',
  'Add two eggs, one at a time, beating well.',
  'Dear Sir or Madam, I am writing to complain…',
  'The vote passed by a narrow margin.',
  'Wash at 30 °C. Do not tumble dry.',
  'Our galaxy holds some 100 billion stars.',
  'Can you recommend a good book on history?',
  'The train to Leeds is delayed by ten minutes.',
  'He took a coat and an umbrella.',
];

// --- Source icons -------------------------------------------------------------

function WebIcon() {
  const pages: [number, number][] = [[-50, -30], [0, -50], [50, -25], [-35, 35], [40, 40]];
  const links = [[0, 1], [1, 2], [0, 3], [3, 4], [2, 4], [1, 4]];
  return (
    <Node>
      {links.map(([a, b]) => (
        <Line points={[pages[a], pages[b]]} stroke={colors.index} lineWidth={3} opacity={0.7} />
      ))}
      {pages.map(p => (
        <Rect position={p} width={30} height={38} radius={4} fill={colors.dialFace}>
          <Rect y={-8} width={18} height={4} fill={colors.label} />
          <Rect y={2} width={18} height={3} fill={colors.label} opacity={0.6} />
          <Rect y={10} width={14} height={3} fill={colors.label} opacity={0.6} />
        </Rect>
      ))}
    </Node>
  );
}

function BooksIcon() {
  const books: [number, number, string][] = [[34, 0, '#c9875b'], [10, -3, '#7fa3d6'], [-14, 4, '#d3b45c']];
  return (
    <Node>
      {books.map(([y, x, c], k) => (
        <Rect x={x} y={y - k * 0} width={120} height={26} radius={4} fill={c}>
          <Rect x={-44} width={6} height={26} fill={'#00000033'} />
        </Rect>
      ))}
      <Rect x={20} y={-40} width={26} height={70} radius={4} rotation={12} fill={'#9ec98f'} />
      <Rect x={-24} y={-38} width={24} height={64} radius={4} fill={'#c48fb8'} />
    </Node>
  );
}

function BlogIcon() {
  return (
    <Node>
      <Rect y={-12} width={110} height={72} radius={6} fill={colors.steelDark} stroke={colors.label} lineWidth={4}>
        <Rect y={-20} width={70} height={8} radius={4} fill={colors.botBubble} />
        <Rect y={-4} width={78} height={4} fill={colors.label} />
        <Rect y={6} width={78} height={4} fill={colors.label} />
        <Rect y={16} width={52} height={4} x={-13} fill={colors.label} />
      </Rect>
      <Line points={[[-70, 34], [70, 34], [58, 24], [-58, 24]]} closed fill={colors.label} />
    </Node>
  );
}

function NewsIcon() {
  return (
    <Node>
      <Rect width={110} height={84} radius={4} fill={colors.dialFace}>
        <Rect y={-28} width={90} height={10} fill={colors.tokenText} />
        {range(3).map(k => <Rect x={-24} y={-8 + k * 10} width={40} height={4} fill={colors.label} />)}
        {range(3).map(k => <Rect x={24} y={-8 + k * 10} width={40} height={4} fill={colors.label} />)}
        <Rect x={-24} y={24} width={40} height={4} fill={colors.label} />
      </Rect>
      <Line points={[[55, 30], [55, 42], [43, 42]]} closed fill={colors.label} />
    </Node>
  );
}

// --- A server rack, LEDs blinking ------------------------------------------------

function Rack({x, y, clock, seed}: {x: number; y: number; clock: () => number; seed: number}) {
  return (
    <Rect x={x} y={y} width={74} height={150} radius={6} fill={colors.cabinet} stroke={colors.cabinetEdge} lineWidth={3}>
      {range(6).map(k => (
        <Rect y={-55 + k * 22} width={58} height={16} radius={3} fill={'#1b1f27'}>
          <Circle
            x={20}
            size={6}
            fill={(seed + k) % 3 ? colors.ledOn : colors.energy}
            opacity={() => (Math.sin(clock() * (3 + ((seed * 7 + k) % 5)) + seed + k * 1.7) > 0.3 ? 1 : 0.2)}
          />
        </Rect>
      ))}
    </Rect>
  );
}

export default makeScene2D(function* (view) {
  view.fill(colors.machineBg);
  const clock = createSignal(0);

  // --- Sources ---------------------------------------------------------------
  const sources = [
    {icon: <WebIcon />, label: 'the web'},
    {icon: <BooksIcon />, label: 'books'},
    {icon: <BlogIcon />, label: 'blogs'},
    {icon: <NewsIcon />, label: 'news'},
  ].map(({icon, label}, k) => (
    <Node position={[CENTER_X + (k - 1.5) * 260, ICONS_Y]} scale={0}>
      {icon}
      <Txt y={90} fontFamily={font} fontSize={26} fill={colors.label} text={label} />
    </Node>
  ) as Node);

  // --- Next-token problems: blue prompt, a slot for the token to predict -----
  const slots: Rect[] = [];
  const problems = PREFIXES.map((n, k) => {
    const y = PROBLEMS_Y + k * PROBLEM_STEP;
    if (n === 0) {
      return (<Txt x={PROBLEMS_X + 30} y={y} fontFamily={font} fontSize={30} fill={colors.label} text={'⋮'} opacity={0} />) as Txt;
    }
    const slot = makeChip('?', '#00000000', {
      ...chipStyle,
      stroke: colors.token,
      lineWidth: 3,
      lineDash: [10, 8],
      textFill: colors.token,
    });
    slots.push(slot);
    return (
      <Rect layout alignItems={'center'} gap={8} x={PROBLEMS_X} y={y} offsetX={-1} scale={CHIP_SCALE} opacity={0}>
        {FULL.slice(0, n).map(t => makeChip(t, colors.token, chipStyle))}
        {slot}
      </Rect>
    ) as Rect;
  });
  const answers = PREFIXES.filter(n => n > 0).map(n => FULL[n]);

  const side = createRef<Node>();
  const burst = createRef<Node>();
  const cluster = createRef<Node>();
  const main = createRef<Node>();

  // A dozen notches, nudged very slowly, in a corner.
  const corner = range(12).map(k =>
    createTunableCog(20, {position: [640 + (k % 4) * 56, 340 + Math.floor(k / 4) * 56]}),
  );
  corner.forEach((c, k) => c.knob(((k * 61) % 140) - 70));

  view.add(
    <>
      <Node ref={main}>
        {sources}
        {problems}
        <Node ref={side} opacity={0}>
          <Txt x={700} y={-90} width={420} textWrap textAlign={'center'} fontFamily={font} fontSize={38} fontWeight={600} fill={colors.textLight}>
            Parallel training on a gigantic amount of text and contexts
          </Txt>
          <Txt x={700} y={40} width={420} textWrap textAlign={'center'} fontFamily={font} fontSize={28} fill={colors.textMuted}>
            (trillions of token-prediction problems)
          </Txt>
        </Node>
      </Node>
      {corner.map(c => c.node)}
      <Node ref={burst} />
      <Node ref={cluster} opacity={0}>
        {range(16).map(k => (
          <Rack x={CENTER_X + ((k % 8) - 3.5) * 96} y={-110 + Math.floor(k / 8) * 175} clock={clock} seed={k} />
        ))}
        <Txt x={CENTER_X} y={240} fontFamily={font} fontSize={40} fontWeight={600} fill={colors.textLight} text={'These tasks can be massively parallelised on enormous computer clusters'} width={1200} textWrap textAlign={'center'} />
      </Node>
    </>,
  );

  yield clock(1000, 1000, linear);
  yield driveCogs(corner);
  // Very slow nudges, one notch after another.
  yield loop(function* () {
    const c = corner[Math.floor((clock() * 7) % 12)];
    yield* c.knob(Math.max(-90, Math.min(90, c.knob() + (clock() % 2 > 1 ? 18 : -18))), 1.2, easeInOutSine);
  });

  // A sentence flies out from the center, toward one of 8 directions.
  function* fly(text: string, k: number, duration: number) {
    const angle = k * 45 + ((k * 53) % 40) - 20;
    const from = new Vector2(CENTER_X, 0);
    const to = from.add(Vector2.fromDegrees(angle).scale(1150));
    const t = (
      <Txt position={from} fontFamily={font} fontSize={24 + ((k * 7) % 12)} fill={colors.token} text={text} scale={0.5} opacity={0} />
    ) as Txt;
    burst().add(t);
    yield* all(
      t.position(to, duration, easeOutCubic),
      t.scale(1.25, duration),
      t.opacity(1, duration * 0.2).to(1, duration * 0.5).to(0, duration * 0.3),
    );
    t.remove();
  }

  // --- Where the text comes from ------------------------------------------------
  yield* waitFor(0.4);
  yield* waitUntil('sources');
  yield* sequence(0.2, ...sources.map(s => s.scale(1, 0.5, easeOutBack)));
  yield* waitFor(0.8);

  // --- One sentence, many next-token problems -------------------------------------
  yield* waitUntil('problems');
  yield* sequence(0.18, ...problems.map(p => p.opacity(1, 0.3)));
  yield* waitFor(0.8);

  // All solved at the same time: the slots fill with the true next tokens.
  yield* waitUntil('parallel');
  yield* all(
    ...slots.map((s, k) => {
      const txt = s.childAs<Txt>(0);
      txt.text(answers[k]);
      return all(
        s.fill(colors.botBubble, 0.5),
        s.lineWidth(0, 0.5),
        txt.fill(colors.tokenText, 0.5),
      );
    }),
  );
  yield* waitFor(0.6);
  yield* side().opacity(1, 0.8);
  yield* waitFor(2.5);

  // --- A flood of text, of every kind ----------------------------------------
  yield* waitUntil('flood');
  yield* main().opacity(0.15, 0.6);
  // Each sentence goes out three times, in different directions, faster and
  // faster: start times bunch up toward the end.
  const flights = [...SENTENCES, ...SENTENCES, ...SENTENCES];
  const start = (k: number) => 6.5 * (1 - Math.pow(1 - k / flights.length, 2));
  yield* all(...flights.map((s, k) => delay(start(k), fly(s, k, 1.6))));

  // --- On enormous computer clusters --------------------------------------------
  yield* waitUntil('clusters');
  yield* all(main().opacity(0, 0.6), cluster().opacity(1, 0.8));
  yield* waitFor(4);
});

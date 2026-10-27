// Scene 10 — Self-supervised learning on a mountain of text. The sources (the
// web, books, blogs, news, code) on top; below, a burst of sentences of every
// kind: all the available text. Then that text becomes next-token problems,
// each with its masked truth, next to the machine's cogs and, on the right,
// the servers that train it. The machine predicts (wrong answers in red,
// right ones in green), a correction signal reaches the cogs and their
// notches turn; twice. Fewer predictions are wrong each time: 6, 4, then 1
// of 9. The screen then dims: this is "Pre-Training" (the P in GPT), and
// what gets tuned is the stack of transformer layers (the T) and the
// embedding table, in proportions compared for GPT-2 small and GPT-3.
import {Circle, CubicBezier, Line, makeScene2D, Node, Rect, RectProps, Txt} from '@motion-canvas/2d';
import {
  all,
  chain,
  createRef,
  createSignal,
  delay,
  easeOutBack,
  easeOutCubic,
  linear,
  range,
  sequence,
  Vector2,
  waitFor,
  waitUntil,
} from '@motion-canvas/core';
import {createTunableCog, driveCogs, turnNotch} from '../components/Cog';
import {colors, font} from '../theme';
import {TOKENS} from '../scene4/layout';
import {makeChip} from '../scene4/parts';
import {positionIn} from '../layout';

const HEADER_Y = -480;
const SECTION_X = -800; // left edge of the section headings
const SOURCES_TITLE_Y = -390;
const ICONS_X = -200;
const ICONS_Y = -300;
const ICON_STEP = 220;
const ICON_SCALE = 0.8;
const PROBLEMS_TITLE_Y = -150;
const PROBLEMS_Y = -55;
const PROBLEM_STEP = 50;
const CHIP_SCALE = 0.62;
const SLOT_W = 130; // prediction and truth chips, in chip units
const TRUTH_X = -95; // the truths, in one column right of the longest problem
const chipStyle = {width: null as null, padding: [0, 16] as [number, number]};
// Prefix lengths of the next-token problems drawn ("⋮" between the last two).
const PREFIXES = [1, 2, 3, 4, 5, 6, 7, 8, 0, TOKENS.length];
const FULL = [...TOKENS, 'coat'];
const TRUTHS = PREFIXES.filter(n => n > 0).map(n => FULL[n]);
// The machine's predictions, round after round: 6, then 4, then 1 wrong. The
// first two are corrected; the scene ends on the third.
const ROUNDS = [
  ['was', 'a', 'ing', '.', 'side', 'and', 'I', 'was', 'house'],
  ['was', 'rain', 'ing', 'out', 'side', ',', 'it', 'stayed', 'hat'],
  ['was', 'rain', 'ing', 'out', 'side', 'and', 'he', 'took', 'coat'],
];
// The burst stays in the lower region, below the sources.
const BURST = new Vector2(0, 170);
const BURST_TOP = -195;
const BURST_COLORS = [colors.token, colors.botBubble, colors.dictionary, colors.embedding, colors.index, colors.attention];
const CLUSTER = new Vector2(725, -190); // the server racks, on the right
const RACK_SCALE = 0.75;
const RACK_STEP = {x: 120, y: 187}; // in rack units
const RACKS_LEFT = CLUSTER.x - (1.5 * RACK_STEP.x + 37) * RACK_SCALE - 14;
// Distributed training: each group of problems (first and last row) goes to
// one row of servers.
const GROUPS = [[0, 2], [3, 5], [6, 7]];
const BRACKET_X = TRUTH_X + (SLOT_W * CHIP_SCALE) / 2 + 24;
const CORNER = new Vector2(630, 290); // the dozen notches, bottom right
const CORNER_STEP = 92;
const CORNER_R = 36;
// The correction signal: from the problems toward the notches.
const SIGNAL_FROM = new Vector2(-20, 150);
const SIGNAL_ANGLE = 17;
// Which way each notch is pulled (scaled by the number of wrong predictions).
const PULL = [1, 1, -1, 1, -1, 1, -1, 1, 1, -1, 1, -1];

// What gets tuned: share of the parameters (attention, feed-forward networks,
// embedding table). Within a layer, attention is ~1/3 (4·d²) and the
// feed-forward network ~2/3 (8·d²). GPT-2 small: layers 85.1 M, embeddings
// (tokens + positions) 39.4 M of 124.4 M. GPT-3: layers 174.0 B, embeddings
// 0.64 B of 175 B.
const SHARES = [
  {model: 'GPT-2 small (124 M)', y: 120, parts: [0.228, 0.455, 0.316], layers: '68%', embedding: '32%'},
  {model: 'GPT-3 (175 B)', y: 220, parts: [0.332, 0.664, 0.004], layers: '99.6%', embedding: '0.4%'},
];
const PART_COLORS = [colors.attention, colors.index, colors.embedding];
const BAR_X = -260;
const BAR_W = 1000;
const BAR_H = 60;
const LEGEND_X = -700;

// A line of words, some highlighted.
function Words({parts, gap = 12, ...props}: {parts: [string, string?, number?][]; gap?: number} & RectProps) {
  return (
    <Rect layout alignItems={'baseline'} gap={gap} {...props}>
      {parts.map(([text, fill = colors.textLight, weight = 500]) => (
        <Txt fontFamily={font} fontSize={props.fontSize ?? 36} fontWeight={weight} fill={fill} text={text} />
      ))}
    </Rect>
  );
}

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
      {books.map(([y, x, c]) => (
        <Rect x={x} y={y} width={120} height={26} radius={4} fill={c}>
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

// An editor window: "</>" and indented, colored lines of code.
function CodeIcon() {
  const lines: [number, number, number, string][] = [
    [-46, 0, 56, colors.attention],
    [-34, 14, 64, colors.dictionary],
    [-34, 28, 40, colors.botBubble],
    [-46, 42, 30, colors.attention],
  ];
  return (
    <Node>
      <Rect y={-2} width={124} height={100} radius={6} fill={colors.steelDark} stroke={colors.label} lineWidth={4}>
        <Txt x={-26} y={-28} fontFamily={'monospace'} fontSize={24} fontWeight={700} fill={colors.index} text={'</>'} />
        {lines.map(([x, y, w, c]) => (
          <Rect x={x} y={y - 6} offsetX={-1} width={w} height={5} radius={2} fill={c} />
        ))}
      </Rect>
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
  const heading = {fontFamily: font, fontSize: 30, fontWeight: 600, fill: colors.textLight, offsetX: -1};

  // --- Sources ---------------------------------------------------------------
  const sources = [
    {icon: <WebIcon />, label: 'the web'},
    {icon: <BooksIcon />, label: 'books'},
    {icon: <BlogIcon />, label: 'blogs'},
    {icon: <NewsIcon />, label: 'news'},
    {icon: <CodeIcon />, label: 'code'},
  ].map(({icon, label}, k) => (
    <Node position={[ICONS_X + (k - 2) * ICON_STEP, ICONS_Y]} scale={0}>
      {icon}
      <Txt y={92} fontFamily={font} fontSize={30} fill={colors.label} text={label} />
    </Node>
  ) as Node);

  // --- Next-token problems: blue prompt, a slot for the prediction, and the
  // masked truth ----------------------------------------------------------------
  const slots: Rect[] = [];
  const truths: Rect[] = [];
  const problems = PREFIXES.map((n, k) => {
    const y = PROBLEMS_Y + k * PROBLEM_STEP;
    if (n === 0) {
      return (<Txt x={SECTION_X + 30} y={y} fontFamily={font} fontSize={30} fill={colors.label} text={'⋮'} opacity={0} />) as Txt;
    }
    const slot = makeChip('?', '#00000000', {
      width: SLOT_W,
      stroke: colors.botBubble,
      lineWidth: 3,
      lineDash: [10, 8],
      textFill: colors.botBubble,
    });
    const truth = makeChip(FULL[n], '#00000000', {
      width: SLOT_W,
      stroke: colors.botBubble,
      lineWidth: 3,
      textFill: colors.botBubble,
      position: [TRUTH_X, y],
      scale: CHIP_SCALE,
    });
    slots.push(slot);
    truths.push(truth);
    return (
      <Node opacity={0}>
        <Rect layout alignItems={'center'} gap={8} x={SECTION_X} y={y} offsetX={-1} scale={CHIP_SCALE}>
          {FULL.slice(0, n).map(t => makeChip(t, colors.token, chipStyle))}
          {slot}
        </Rect>
        {truth}
      </Node>
    ) as Node;
  });

  const header = createRef<Txt>();
  const predLabel = createRef<Txt>();
  const truthLabel = createRef<Txt>();
  const sourcesTitle = createRef<Txt>();
  const problemsTitle = createRef<Txt>();
  const burst = createRef<Node>();
  const cluster = createRef<Node>();
  const cornerGroup = createRef<Node>();
  const traces = createRef<Node>();
  const brackets = GROUPS.map(() => createRef<Line>());
  const veil = createRef<Rect>();
  const pretraining = [createRef<Rect>(), createRef<Rect>()];
  const tunedTitle = createRef<Txt>();
  const legend = [createRef<Node>(), createRef<Node>(), createRef<Node>()];
  const bars = SHARES.map(() => ({node: createRef<Node>(), grow: createSignal(0), labels: createRef<Node>()}));
  const note = createRef<Txt>();
  const amber = colors.energy;
  const swatch = (fill: string) => <Rect width={28} height={28} radius={5} fill={fill} />;
  const links = GROUPS.map(() => createRef<CubicBezier>());
  const waves = createRef<Node>();

  // A dozen notches: the machine being trained.
  const corner = range(12).map(k =>
    createTunableCog(CORNER_R, {position: CORNER.add([(k % 4) * CORNER_STEP, Math.floor(k / 4) * CORNER_STEP])}),
  );
  corner.forEach((c, k) => c.knob(((k * 61) % 140) - 70));

  view.add(
    <>
      <Node>
        <Txt ref={header} y={HEADER_Y} fontFamily={font} fontSize={44} fontWeight={600} fill={colors.textLight} text={'"Self-supervised" learning: on gigantic amounts of texts / contexts'} opacity={0} />
        <Txt ref={sourcesTitle} x={SECTION_X} y={SOURCES_TITLE_Y} {...heading} text={'Sources'} opacity={0} />
        {sources}
      </Node>
      <Txt ref={problemsTitle} x={SECTION_X} y={PROBLEMS_TITLE_Y} {...heading} text={'Tons of prediction problems (highly parallelizable)'} opacity={0} />
      {problems}
      {/* Column labels over the first problem (placed once laid out) */}
      <Txt ref={predLabel} offsetX={1} fontFamily={font} fontSize={22} fill={colors.label} text={'prediction'} opacity={() => problems[0].opacity()} />
      <Txt ref={truthLabel} fontFamily={font} fontSize={22} fill={colors.label} text={'truth (masked)'} opacity={() => problems[0].opacity()} />
      <Node ref={cornerGroup} opacity={0}>{corner.map(c => c.node)}</Node>
      {GROUPS.map(([a, b], r) => {
        const top = PROBLEMS_Y + a * PROBLEM_STEP - 17;
        const bottom = PROBLEMS_Y + b * PROBLEM_STEP + 17;
        const mid = (top + bottom) / 2;
        const rackY = CLUSTER.y + (r - 1) * RACK_STEP.y * RACK_SCALE;
        return (
          <Node>
            <Line
              ref={brackets[r]}
              points={[[BRACKET_X - 10, top], [BRACKET_X, top], [BRACKET_X, bottom], [BRACKET_X - 10, bottom]]}
              stroke={colors.label}
              lineWidth={3}
              end={0}
            />
            <CubicBezier
              ref={links[r]}
              p0={[BRACKET_X, mid]}
              p1={[BRACKET_X + 220, mid]}
              p2={[RACKS_LEFT - 220, rackY]}
              p3={[RACKS_LEFT, rackY]}
              stroke={colors.index}
              lineWidth={2}
              lineDash={[8, 8]}
              opacity={0.6}
              end={0}
            />
          </Node>
        );
      })}
      <Node ref={traces} />
      <Node ref={waves} />
      <Node ref={cluster} opacity={0}>
        <Node position={CLUSTER} scale={RACK_SCALE}>
          {range(12).map(k => (
            <Rack x={((k % 4) - 1.5) * RACK_STEP.x} y={(Math.floor(k / 4) - 1) * RACK_STEP.y} clock={clock} seed={k} />
          ))}
        </Node>
        <Txt x={CLUSTER.x} y={110} fontFamily={font} fontSize={30} fontWeight={600} fill={colors.textLight} text={'Distributed training on enormous clusters (trillions of tokens)'} width={360} textWrap textAlign={'center'} />
      </Node>
      <Rect clip y={(BURST_TOP + 540) / 2} width={1920} height={540 - BURST_TOP}>
        <Node ref={burst} y={-(BURST_TOP + 540) / 2} />
      </Rect>

      {/* The closing: Pre-Training, and what gets tuned */}
      <Rect ref={veil} width={1920} height={1080} fill={colors.machineBg} opacity={0} />
      <Words ref={pretraining[0]} y={-410} fontSize={58} gap={18} opacity={0} parts={[['This process is'], ['“Pre-Training”', amber, 700]]} />
      <Words ref={pretraining[1]} y={-335} fontSize={36} gap={10} opacity={0} parts={[['(the', colors.textMuted], ['P', amber, 700], ['in GPT)', colors.textMuted]]} />
      <Txt ref={tunedTitle} x={LEGEND_X} offsetX={-1} y={-215} fontFamily={font} fontSize={42} fontWeight={600} fill={colors.textLight} text={'What gets “tuned”:'} opacity={0} />
      <Node ref={legend[0]} opacity={0}>
        <Words x={LEGEND_X + 40} offsetX={-1} y={-145} fontSize={36} gap={10} parts={[['the stack of transformer layers'], ['(the', colors.textMuted], ['T', amber, 700], ['in GPT)', colors.textMuted]]} />
      </Node>
      <Node ref={legend[1]} opacity={0}>
        <Rect layout alignItems={'center'} gap={14} x={LEGEND_X + 80} offsetX={-1} y={-85}>
          {swatch(colors.attention)}
          <Txt fontFamily={font} fontSize={32} fill={colors.textLight} text={'attention heads'} />
          <Txt fontFamily={font} fontSize={32} fill={colors.textMuted} text={'+'} marginLeft={6} marginRight={6} />
          {swatch(colors.index)}
          <Txt fontFamily={font} fontSize={32} fill={colors.textLight} text={'feed-forward networks'} />
        </Rect>
      </Node>
      <Node ref={legend[2]} opacity={0}>
        <Rect layout alignItems={'center'} gap={14} x={LEGEND_X + 40} offsetX={-1} y={-15}>
          <Txt fontFamily={font} fontSize={36} fill={colors.textMuted} text={'+'} marginRight={4} />
          {swatch(colors.embedding)}
          <Txt fontFamily={font} fontSize={36} fill={colors.textLight} text={'the embedding table'} />
        </Rect>
      </Node>
      {SHARES.map((b, i) => {
        const cum = (j: number) => b.parts.slice(0, j).reduce((a, x) => a + x, 0);
        const grow = bars[i].grow;
        return (
          <Node ref={bars[i].node} opacity={0}>
            <Txt x={BAR_X - 24} offsetX={1} y={b.y} fontFamily={font} fontSize={32} fontWeight={600} fill={colors.textLight} text={b.model} />
            {b.parts.map((f, j) => (
              <Rect
                x={() => BAR_X + BAR_W * cum(j) * grow()}
                offsetX={-1}
                y={b.y}
                width={() => Math.max(5, BAR_W * f) * grow()}
                height={BAR_H}
                fill={PART_COLORS[j]}
              />
            ))}
            <Node ref={bars[i].labels} opacity={0}>
              <Txt x={BAR_X + (BAR_W * (b.parts[0] + b.parts[1])) / 2} y={b.y} fontFamily={font} fontSize={32} fontWeight={700} fill={colors.tokenText} text={b.layers} />
              {b.parts[2] > 0.1 ? (
                <Txt x={BAR_X + BAR_W * (1 - b.parts[2] / 2)} y={b.y} fontFamily={font} fontSize={32} fontWeight={700} fill={colors.tokenText} text={b.embedding} />
              ) : (
                <Txt x={BAR_X + BAR_W + 16} offsetX={-1} y={b.y} fontFamily={font} fontSize={32} fontWeight={700} fill={colors.embedding} text={b.embedding} />
              )}
            </Node>
          </Node>
        );
      })}
      <Txt ref={note} y={320} fontFamily={font} fontSize={28} fontStyle={'italic'} fill={colors.textMuted} text={'share of the parameters: as models grow, the layers take almost all of it'} opacity={0} />
    </>,
  );

  // "prediction" ends over the slot's right edge; "truth (masked)" heads the
  // truth column.
  const half = (SLOT_W * CHIP_SCALE) / 2;
  predLabel().position(positionIn(slots[0], view).add([half, -38]));
  truthLabel().position(positionIn(truths[0], view).addY(-38));

  yield clock(1000, 1000, linear);
  yield driveCogs(corner);

  // A sentence flies out from the center, toward one of 8 directions,
  // slowing down while still on screen so it can be read. It is anchored on
  // its outer end, so it trails back toward the center rather than off screen.
  function* fly(text: string, k: number, duration: number) {
    const angle = k * 45 + ((k * 53) % 40) - 20;
    const dir = Vector2.fromDegrees(angle);
    const reach = 1 + ((k * 37) % 160) / 600;
    const to = BURST.add([dir.x * 520 * reach, dir.y * 330 * reach]);
    const t = (
      <Txt
        position={BURST}
        offsetX={dir.x * 0.8}
        fontFamily={font}
        fontSize={34 + ((k * 7) % 12)}
        fontWeight={500}
        fill={BURST_COLORS[k % BURST_COLORS.length]}
        text={text}
        scale={0.4}
        opacity={0}
      />
    ) as Txt;
    burst().add(t);
    yield* all(
      t.position(to, duration, easeOutCubic),
      t.scale(1.1, duration, easeOutCubic),
      t.opacity(1, duration * 0.15).to(1, duration * 0.55).to(0, duration * 0.3),
    );
    t.remove();
  }

  // All predictions at once: each slot shows the machine's guess, bordered
  // green when it matches the truth, red when it doesn't.
  function* predict(words: string[]) {
    const label = (s: Rect) => s.childAs<Txt>(0);
    yield* all(...slots.map(s => label(s).opacity(0, 0.15)));
    slots.forEach((s, k) => {
      label(s).text(words[k]).fill(colors.tokenText);
      s.lineDash([]);
    });
    yield* all(
      ...slots.map((s, k) =>
        all(
          s.fill(colors.botBubble, 0.4),
          s.stroke(words[k] === TRUTHS[k] ? colors.good : colors.error, 0.4),
          s.lineWidth(7, 0.4),
          label(s).opacity(1, 0.4),
        ),
      ),
    );
  }

  // The wrong predictions flash and a correction signal goes out to the
  // notches: each turns as the signal reaches it, by an amount that follows
  // the number of wrong predictions.
  function* correct(words: string[], pace: number) {
    const wrong = slots.filter((_, k) => words[k] !== TRUTHS[k]);
    yield* all(...wrong.map(s => s.scale(1.12, 0.15).to(1, 0.25)));
    const front = createSignal(30);
    const fade = createSignal(0);
    const reach = 1040;
    const travel = 2.2 * pace;
    const arcs = [0, 1, 2].map(
      i =>
        (
          <Circle
            position={SIGNAL_FROM}
            size={() => Math.max(0, front() - i * 40) * 2}
            startAngle={SIGNAL_ANGLE - 14}
            endAngle={SIGNAL_ANGLE + 14}
            stroke={colors.error}
            lineWidth={2 + wrong.length * 1.2}
            lineCap={'round'}
            opacity={() => fade() * (1 - i * 0.3)}
          />
        ) as Circle,
    );
    waves().add(arcs);
    const turns = corner.map((c, k) => {
      const d = c.node.position().sub(SIGNAL_FROM).magnitude - CORNER_R;
      return delay(((d - 30) / (reach - 30)) * travel, turnNotch(c, PULL[k] * 45 * (wrong.length / 6), 0.7 * pace, traces()));
    });
    yield* all(front(reach, travel, linear), chain(fade(1, 0.2), waitFor(travel - 0.5), fade(0, 0.3)), ...turns);
    arcs.forEach(a => a.remove());
  }

  // --- Where the text comes from ------------------------------------------------
  yield* waitFor(0.4);
  yield* waitUntil('sources');
  yield* all(
    header().opacity(1, 0.6),
    sourcesTitle().opacity(1, 0.6),
    sequence(0.2, ...sources.map(s => s.scale(ICON_SCALE, 0.5, easeOutBack))),
  );
  yield* waitFor(1);

  // --- All the available text: a flood of every kind ------------------------------
  yield* waitUntil('flood');
  // Each sentence goes out twice, in different directions, a little faster
  // as it goes: start times bunch up toward the end.
  const flights = [...SENTENCES, ...SENTENCES];
  const start = (k: number) => 9 * (1 - Math.pow(1 - k / flights.length, 1.6));
  yield* all(...flights.map((s, k) => delay(start(k), fly(s, k, 2.6))));

  // --- That text, cut into next-token problems, and the machine ------------------
  yield* waitUntil('problems');
  yield* problemsTitle().opacity(1, 0.6);
  yield* sequence(0.15, ...problems.map(p => p.opacity(1, 0.3)));
  yield* cornerGroup().opacity(1, 0.6);

  // --- Trained on enormous clusters ---------------------------------------------
  yield* waitUntil('clusters');
  yield* cluster().opacity(1, 0.8);
  yield* sequence(0.4, ...GROUPS.map((_, r) => chain(brackets[r]().end(1, 0.4), links[r]().end(1, 0.7))));
  yield* waitFor(1);

  // --- Learning: predict and correct, twice; then predict again -------------------
  const marks = ['round-1', 'round-2', 'round-3'];
  const paces = [1, 0.8];
  for (const [r, words] of ROUNDS.entries()) {
    yield* waitUntil(marks[r]);
    yield* predict(words);
    if (r === ROUNDS.length - 1) break;
    yield* waitFor(0.8 * paces[r]);
    yield* correct(words, paces[r]);
    yield* waitFor(0.6);
  }
  yield* waitFor(1.5);

  // --- This process is Pre-Training ------------------------------------------------
  yield* waitUntil('pretraining');
  yield* all(veil().opacity(0.985, 0.8), pretraining[0]().opacity(1, 0.8));
  yield* pretraining[1]().opacity(1, 0.5);
  yield* waitFor(2);

  // --- What gets tuned -------------------------------------------------------------
  yield* waitUntil('tuned');
  yield* tunedTitle().opacity(1, 0.5);
  yield* sequence(0.5, ...legend.map(l => l().opacity(1, 0.5)));
  yield* waitFor(0.6);
  for (const b of bars) {
    yield* b.node().opacity(1, 0.3);
    yield* b.grow(1, 1, easeOutCubic);
    yield* b.labels().opacity(1, 0.4);
    yield* waitFor(0.4);
  }
  yield* note().opacity(1, 0.6);
  yield* waitFor(5);
});

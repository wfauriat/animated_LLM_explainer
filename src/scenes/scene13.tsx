// Scene 13 — Why do language models *seem* so good? (a proposed interpretation)
// One request, a whole app scaffold back: a large, structured answer adapted to
// that request, in almost no time. Why: thousands of people have solved almost
// the same problems (the stacks behind each file), and billions of knobs were
// tuned on all of it. But nothing is guaranteed: one line calls a library that
// does not exist, where examples are thin. The user reports it and the file is
// fixed: a very good first draft, to check and refine.
import {Circle, CubicBezier, Line, makeScene2D, Node, Rect, Txt} from '@motion-canvas/2d';
import {
  all,
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
  SimpleSignal,
  Vector2,
  waitFor,
  waitUntil,
} from '@motion-canvas/core';
import {codeWidth, CodeLine, mono} from '../components/Code';
import {createTunableCog, driveCogs, turnNotch} from '../components/Cog';
import {popIn} from '../components/ChatApp';
import {Words} from '../components/Words';
import {positionIn} from '../layout';
import {colors, font} from '../theme';
import {FILES, IMPORT_FIXED, IMPORT_WRONG, REMINDER} from '../scene13/parts';

const amber = colors.energy;
const amberOff = '#f2c14e00';

// --- Layout ---------------------------------------------------------------------

const TITLE_TOP = {y: -488, scale: 0.62};
const LEFT_X = -630; // the request and the person
const EDITOR = {x: 300, y: -40, w: 1180, h: 740};
const EDITOR_TOP = EDITOR.y - EDITOR.h / 2;
const SIDEBAR_W = 340;
// The file tree: inside the editor, then on its own at the left of the frame.
const TREE_IN_EDITOR = -272;
const TREE_ALONE = -900;
const TREE_TOP = -300;
const TREE_PITCH = 58;
const TREE_SIZE = 20;
const ROOT = 'bike-shop/';
const rowY = (i: number) => TREE_TOP + i * TREE_PITCH;
// The code pane, right of the sidebar.
const PANE = {x: 470, y: -10, w: 840, h: 680};
const CODE_X = PANE.x - PANE.w / 2 + 24;
const CODE_TOP = PANE.y - PANE.h / 2 + 18;
const CODE_PITCH = 24;
const CODE_SIZE = 18;
// The file up close (limits).
const CLOSE_PITCH = 38;
const CLOSE_SIZE = 24;
const closeY = (line: number) => CODE_TOP + 30 + line * CLOSE_PITCH;
const FLAGGED = 1; // the import line of REMINDER
const CAPTION_X = EDITOR.x;
const CAPTIONS_Y = [405, 465];

// Stacks of people's work, one per file.
const STACK_X = -540;
const STACK_STEP = 15;
const SHEET = {w: 40, h: 50};
const THIN = FILES.findIndex(f => f.path === 'emails/reminder.py');
const AVATARS = [colors.userBubble, colors.botBubble, colors.energy, colors.embedding, colors.index, colors.attention];

// The knobs.
const GRID = new Vector2(650, -60);
const GRID_COLS = 5;
const GRID_ROWS = 6;
const GRID_PITCH = 74;
const GRID_R = 30;
const SIGNAL_FROM = new Vector2(-(GRID_COLS / 2) * GRID_PITCH - 40, 0);
const REACH = 470;

const jitter = (a: number, b: number) => Math.sin(a * 12.99 + b * 78.23) * 0.5 + Math.cos(a * 4.1 - b * 7.7) * 0.5;

// One sheet of someone's work: a page and its author. `shown` reveals the stack
// sheet by sheet.
function Sheet({i, row, shown}: {i: number; row: number; shown: SimpleSignal<number>}) {
  return (
    <Rect
      x={STACK_X + i * STACK_STEP}
      y={rowY(row + 1) + 3 * jitter(i, row)}
      rotation={4 * jitter(row, i)}
      width={SHEET.w}
      height={SHEET.h}
      radius={5}
      fill={colors.appBg}
      stroke={colors.divider}
      lineWidth={2}
      opacity={() => Math.max(0, Math.min(1, shown() - i))}
    >
      <Circle x={-12} y={-13} size={11} fill={AVATARS[(i * 5 + row * 3) % AVATARS.length]} />
      <Rect x={-9} y={3} width={14} height={3} radius={1} fill={colors.textMuted} />
      <Rect x={-9} y={12} width={14} height={3} radius={1} fill={colors.textMuted} />
    </Rect>
  );
}

export default makeScene2D(function* (view) {
  view.fill(colors.machineBg);
  const clock = createSignal(0);

  // --- Title ------------------------------------------------------------------
  const title = createRef<Rect>();

  // --- The request ------------------------------------------------------------
  const request = createRef<Rect>();
  const reqText = {fontFamily: font, fontSize: 30, fill: colors.bubbleText};
  const phrases: Rect[] = [];
  const phrase = (text: string) => (
    <Rect ref={r => r && phrases.push(r)} layout padding={[1, 7]} radius={7} fill={amberOff}>
      <Txt {...reqText} fontWeight={600} text={text} />
    </Rect>
  );

  // --- The person, doing the same work by hand --------------------------------
  const person = createRef<Node>();
  const handLines = createSignal(0);
  const BODY_Y = 262;
  const elbows = (side: number) => () => {
    const lift = 4 * Math.sin(clock() * (17 + side * 3) + side) * (handLines() > 0 ? 1 : 0);
    return [
      [LEFT_X + side * 72, BODY_Y - 22],
      [LEFT_X + side * 112, BODY_Y + 62 + lift],
      [LEFT_X + side * 48, BODY_Y + 8 - lift],
    ] as [number, number][];
  };
  const arm = (side: number) => (
    <>
      <Line points={elbows(side)} stroke={colors.rimLight} lineWidth={32} lineCap={'round'} lineJoin={'round'} />
      <Line points={elbows(side)} stroke={colors.silhouette} lineWidth={22} lineCap={'round'} lineJoin={'round'} />
    </>
  );

  // --- The editor --------------------------------------------------------------
  const editor = createRef<Node>();
  const pane = createRef<Node>();
  const paneTitle = createRef<Txt>();
  const tree = createRef<Node>();
  const treeX = createSignal(TREE_IN_EDITOR);
  const rows = [ROOT, ...FILES.map(f => f.path)];
  const rowRefs = rows.map(() => createRef<Txt>());
  const rowMarks = rows.map(() => createRef<Rect>());
  const fileLines = FILES.map(f =>
    f.code.map((text, l) => (
      <CodeLine text={text} size={CODE_SIZE} x={CODE_X} y={CODE_TOP + 30 + l * CODE_PITCH} opacity={0} />
    ) as Node),
  );
  const newRow = createRef<Txt>();

  // --- Stacks, knobs ---------------------------------------------------------------
  const stacks = createRef<Node>();
  const shown = FILES.map(() => createSignal(0));
  const flying = createRef<Node>();
  const grid = createRef<Node>();
  const knobsLabel = createRef<Rect>();
  const waves = createRef<Node>();
  const traces = createRef<Node>();
  const cogs = range(GRID_COLS * GRID_ROWS).map(k =>
    createTunableCog(GRID_R, {
      x: ((k % GRID_COLS) - (GRID_COLS - 1) / 2) * GRID_PITCH,
      y: (Math.floor(k / GRID_COLS) - (GRID_ROWS - 1) / 2) * GRID_PITCH,
    }),
  );
  cogs.forEach((c, k) => c.knob(Math.sin(k * 3.7 + 1) * 70));

  // --- The file up close ------------------------------------------------------------
  const close = createRef<Node>();
  const closeLines = REMINDER.map((text, l) => (
    <CodeLine text={text} size={CLOSE_SIZE} x={CODE_X} y={closeY(l)} opacity={l === FLAGGED ? 0 : 1} />
  ) as Node);
  const wrong = createRef<Node>();
  const fixed = createRef<Node>();
  const flag = createRef<Rect>();
  const flagNote = createRef<Rect>();
  const thinNote = createRef<Txt>();
  const lineW = (text: string) => codeWidth(text.length, CLOSE_SIZE) + 20;

  // --- Captions --------------------------------------------------------------------
  const adapted = createRef<Rect>();
  const expert = createRef<Rect>();
  const others = createRef<Rect>();
  const knobs = createRef<Rect>();
  const limits = createRef<Rect>();
  const followUp = createRef<Rect>();
  const closing = createRef<Rect>();
  const fade = createRef<Rect>();
  const links = createRef<Node>();

  view.add(
    <>
      {/* The person, at the left */}
      <Node ref={person} opacity={0}>
        <Rect x={LEFT_X} y={80} width={400} height={230} radius={12} fill={colors.appBg} stroke={colors.bezelEdge} lineWidth={8} />
        {range(5).map(i => (
          <Rect
            x={LEFT_X - 170}
            y={10 + i * 34}
            offsetX={-1}
            height={12}
            radius={6}
            fill={colors.textMuted}
            width={() => [240, 300, 190, 270, 220][i] * Math.max(0, Math.min(1, handLines() - i))}
          />
        ))}
        {arm(-1)}
        {arm(1)}
        <Rect x={LEFT_X} y={BODY_Y + 88} width={170} height={236} radius={[76, 76, 20, 20]} fill={colors.silhouette} stroke={colors.rimLight} lineWidth={5} />
        <Circle x={LEFT_X} y={BODY_Y - 62} size={96} fill={colors.silhouette} stroke={colors.rimLight} lineWidth={5} />
      </Node>

      {/* The editor: frame, sidebar, title bar */}
      <Node ref={editor} opacity={0}>
        <Rect x={EDITOR.x} y={EDITOR.y} width={EDITOR.w} height={EDITOR.h} radius={14} fill={colors.appBg} stroke={colors.bezelEdge} lineWidth={3} />
        <Rect x={EDITOR.x - EDITOR.w / 2 + SIDEBAR_W / 2} y={EDITOR.y + 22} width={SIDEBAR_W} height={EDITOR.h - 46} fill={colors.appHeader} />
        <Rect x={EDITOR.x} y={EDITOR_TOP + 22} width={EDITOR.w - 4} height={42} radius={[12, 12, 0, 0]} fill={colors.titleBar} />
        {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => (
          <Circle x={EDITOR.x - EDITOR.w / 2 + 28 + i * 24} y={EDITOR_TOP + 22} size={14} fill={c} />
        ))}
      </Node>

      {/* Stacks of people's work, behind the code */}
      <Node ref={stacks}>
        {FILES.flatMap((f, r) => range(f.examples).map(i => <Sheet i={i} row={r} shown={shown[r]} />))}
      </Node>

      {/* The code pane (title, then one set of lines per file) */}
      <Node ref={pane} opacity={0}>
        <Rect x={PANE.x} y={PANE.y} width={PANE.w} height={PANE.h} fill={colors.appBg} />
        <Txt ref={paneTitle} x={CODE_X} y={CODE_TOP} offsetX={-1} fontFamily={mono} fontSize={18} fill={colors.textMuted} text={''} />
        {fileLines.flat()}
      </Node>

      {/* The same pane up close, on one file */}
      <Node ref={close} opacity={0}>
        <Rect x={PANE.x} y={PANE.y} width={PANE.w} height={PANE.h} radius={14} fill={colors.appBg} stroke={colors.bezelEdge} lineWidth={3} />
        <Txt x={CODE_X} y={CODE_TOP} offsetX={-1} fontFamily={mono} fontSize={18} fill={colors.textMuted} text={'emails/reminder.py'} />
        {closeLines}
        <CodeLine ref={wrong} text={IMPORT_WRONG} size={CLOSE_SIZE} x={CODE_X} y={closeY(FLAGGED)} />
        <CodeLine ref={fixed} text={IMPORT_FIXED} size={CLOSE_SIZE} x={CODE_X} y={closeY(FLAGGED)} opacity={0} />
        <Rect
          ref={flag}
          x={CODE_X + lineW(IMPORT_WRONG) / 2 - 10}
          y={closeY(FLAGGED)}
          width={lineW(IMPORT_WRONG)}
          height={CLOSE_PITCH + 4}
          radius={8}
          stroke={amber}
          lineWidth={4}
          opacity={0}
        />
        <Rect
          ref={flagNote}
          layout
          direction={'column'}
          alignItems={'center'}
          x={PANE.x + PANE.w / 2 - 100}
          y={closeY(FLAGGED) - 8}
          padding={[6, 12]}
          radius={10}
          fill={'#1a1608'}
          stroke={amber}
          lineWidth={3}
          opacity={0}
        >
          <Txt fontFamily={font} fontSize={22} fontWeight={600} fill={amber} text={'this library'} />
          <Txt fontFamily={font} fontSize={22} fontWeight={600} fill={amber} text={'does not exist'} />
        </Rect>
      </Node>

      {/* The file tree: part of the editor, then on its own */}
      <Node ref={tree}>
        {rows.map((text, i) => (
          <Node x={treeX} y={rowY(i)}>
            <Rect
              ref={rowMarks[i]}
              x={codeWidth(text.length, TREE_SIZE) / 2}
              width={codeWidth(text.length, TREE_SIZE) + 22}
              height={38}
              radius={8}
              stroke={amber}
              lineWidth={3}
              opacity={0}
            />
            <Txt ref={rowRefs[i]} offsetX={-1} fontFamily={mono} fontSize={TREE_SIZE} fill={i === 0 ? colors.textLight : colors.label} text={text} opacity={0} />
          </Node>
        ))}
        <Txt ref={newRow} x={treeX} y={rowY(rows.length)} offsetX={-1} fontFamily={mono} fontSize={TREE_SIZE} fill={colors.good} text={'emails/mailer.py'} opacity={0} />
      </Node>
      <Txt
        ref={thinNote}
        x={STACK_X + (FILES[THIN].examples + 1) * STACK_STEP + 10}
        y={rowY(THIN + 1)}
        offsetX={-1}
        fontFamily={font}
        fontSize={24}
        fontWeight={600}
        fill={amber}
        text={'few examples'}
        opacity={0}
      />

      {/* The request */}
      <Rect
        ref={request}
        layout
        direction={'column'}
        gap={8}
        x={LEFT_X}
        y={-235}
        padding={[20, 26]}
        radius={[28, 28, 28, 8]}
        fill={colors.userBubble}
        opacity={0}
        scale={0.7}
      >
        <Rect alignItems={'center'} gap={8}>
          <Txt {...reqText} text={'Set up a web app for my'} />
        </Rect>
        <Rect alignItems={'center'} gap={8}>
          {phrase('bike repair shop:')}
          <Txt {...reqText} text={'customers'} />
        </Rect>
        <Rect alignItems={'center'} gap={8}>
          {phrase('book a time')}
          <Txt {...reqText} text={'online and get a'} />
        </Rect>
        <Rect alignItems={'center'} gap={8}>
          {phrase('reminder email.')}
        </Rect>
      </Rect>
      <Node ref={links} />

      {/* The knobs */}
      <Node ref={grid} position={GRID} opacity={0}>
        {cogs.map(c => c.node)}
        <Node ref={waves} />
        <Node ref={traces} />
      </Node>
      <Rect ref={knobsLabel} layout x={GRID.x} y={GRID.y - 275} opacity={0}>
        <Txt fontFamily={font} fontSize={40} fontWeight={700} fill={amber} text={'billions of knobs'} />
      </Rect>
      <Node ref={flying} />

      {/* Follow-up */}
      <Rect
        ref={followUp}
        layout
        direction={'column'}
        gap={4}
        x={-270}
        y={closeY(FLAGGED)}
        padding={[16, 24]}
        radius={[24, 24, 8, 24]}
        fill={colors.userBubble}
        opacity={0}
        scale={0.7}
      >
        <Txt {...reqText} fontSize={26} text={'It crashes: that library'} />
        <Txt {...reqText} fontSize={26} text={'does not exist.'} />
      </Rect>

      {/* Captions */}
      <Words ref={adapted} x={CAPTION_X} y={CAPTIONS_Y[0]} fontSize={36} gap={10} opacity={0} parts={[['From an intent to an answer'], ['adapted to the need,', amber, 700], ['in almost no time']]} />
      <Words ref={expert} x={CAPTION_X} y={CAPTIONS_Y[1]} fontSize={30} gap={8} opacity={0} parts={[['A trained expert may do better in places, but rarely this fast', colors.textMuted]]} />
      <Words ref={others} x={0} y={CAPTIONS_Y[0] + 25} fontSize={36} gap={10} opacity={0} parts={[['Thousands of people have solved'], ['almost the same problems:', amber, 700], ['it integrates their work']]} />
      <Words ref={knobs} x={0} y={CAPTIONS_Y[0] + 25} fontSize={36} gap={10} opacity={0} parts={[['Tuned step by step, until it guesses well in'], ['an enormous number of contexts', amber, 700]]} />
      <Words ref={limits} x={0} y={CAPTIONS_Y[0] + 25} fontSize={40} gap={12} opacity={0} parts={[['Likely right,'], ['never guaranteed', amber, 700]]} />
      <Rect
        ref={closing}
        layout
        direction={'column'}
        alignItems={'center'}
        gap={8}
        y={445}
        padding={[18, 40]}
        radius={18}
        fill={'#1a1608'}
        stroke={amber}
        lineWidth={4}
        opacity={0}
      >
        <Txt fontFamily={font} fontSize={34} fontWeight={600} fill={colors.textLight} text={'Often a very good first draft: to check, adjust and refine'} />
        <Words
          fontSize={38}
          gap={10}
          parts={[
            ['An efficient', colors.textLight, 600],
            ['jumpstarter', amber, 800],
            ['and', colors.textLight, 600],
            ['knowledge gatherer', amber, 800],
          ]}
        />
      </Rect>

      <Rect ref={title} layout direction={'column'} alignItems={'center'} gap={10} y={0}>
        <Rect alignItems={'baseline'} gap={18}>
          <Txt fontFamily={font} fontSize={64} fontWeight={700} fill={colors.textLight} text={'Why do language models'} />
          <Txt fontFamily={font} fontSize={64} fontWeight={700} fontStyle={'italic'} fill={amber} text={'seem'} />
          <Txt fontFamily={font} fontSize={64} fontWeight={700} fill={colors.textLight} text={'so good?'} />
        </Rect>
        <Txt fontFamily={font} fontSize={34} fill={colors.textMuted} text={'(a proposed interpretation)'} />
      </Rect>
      <Rect ref={fade} width={1920} height={1080} fill={'#000'} />
    </>,
  );

  yield clock(1000, 1000, linear);
  yield driveCogs(cogs);

  // --- Helpers ---------------------------------------------------------------------

  // Writes the scaffold, file by file, in the order of FILES.
  function* write(lineTime: number) {
    for (let f = 0; f < FILES.length; f++) {
      const row = rowRefs[f + 1]();
      paneTitle().text(FILES[f].path);
      row.opacity(1).fill(colors.textLight);
      if (f > 0) fileLines[f - 1].forEach(l => l.opacity(0));
      yield* sequence(lineTime, ...fileLines[f].map(l => l.opacity(1, 0.04)));
      yield* waitFor(0.3);
      row.fill(colors.label);
    }
  }

  // A link from a phrase of the request to the file that answers it.
  function adaptLink(phraseRect: Rect, row: number) {
    const bubbleRight = LEFT_X + request().width() / 2;
    const p0 = new Vector2(bubbleRight + 4, positionIn(phraseRect, links()).y);
    const p3 = new Vector2(TREE_IN_EDITOR - 16, rowY(row));
    const bend = (p3.x - p0.x) * 0.55;
    const line = (
      <CubicBezier p0={p0} p1={p0.addX(bend)} p2={p3.addX(-bend)} p3={p3} stroke={amber} lineWidth={4} endArrow arrowSize={12} end={0} />
    ) as CubicBezier;
    links().add(line);
    return line;
  }

  // Sheets leave the stacks for the knobs.
  function* flySheet(k: number) {
    const r = k % FILES.length;
    const i = Math.floor(Math.abs(jitter(k, 3)) * FILES[r].examples);
    const sheet = (
      <Rect
        x={STACK_X + i * STACK_STEP}
        y={rowY(r + 1)}
        width={SHEET.w}
        height={SHEET.h}
        radius={5}
        fill={colors.appBg}
        stroke={colors.divider}
        lineWidth={2}
      />
    ) as Rect;
    flying().add(sheet);
    const to = GRID.add(SIGNAL_FROM).addY(jitter(k, 9) * 150);
    yield* all(
      sheet.position(to, 0.8, easeInCubic),
      sheet.scale(0.5, 0.8, easeInCubic),
      chain(waitFor(0.65), sheet.opacity(0, 0.15)),
    );
    sheet.remove();
  }

  // A wave of small corrections across the knobs (as in Scenes 9, 10, 12).
  function* nudge(size: number, n: number) {
    const front = createSignal(20);
    const opacity = createSignal(0);
    const travel = 0.9;
    const arcs = [0, 1, 2].map(
      i =>
        (
          <Circle
            position={SIGNAL_FROM}
            size={() => Math.max(0, front() - i * 36) * 2}
            startAngle={-60}
            endAngle={60}
            stroke={colors.error}
            lineWidth={5}
            lineCap={'round'}
            opacity={() => opacity() * (1 - i * 0.3)}
          />
        ) as Circle,
    );
    waves().add(arcs);
    const turns = cogs.map((c, k) => {
      const d = c.node.position().sub(SIGNAL_FROM).magnitude;
      return delay((d / REACH) * travel, turnNotch(c, Math.sin(k * 2.4 + n * 1.7) * size, 0.4, traces()));
    });
    yield* all(front(REACH, travel, linear), chain(opacity(1, 0.15), waitFor(travel - 0.35), opacity(0, 0.2)), ...turns);
    arcs.forEach(a => a.remove());
  }

  // --- The question ---------------------------------------------------------------
  yield* fade().opacity(0, 0.7);
  yield* waitFor(0.6);

  // --- One request ... --------------------------------------------------------------
  yield* waitUntil('request');
  yield* all(title().y(TITLE_TOP.y, 0.8, easeInOutCubic), title().scale(TITLE_TOP.scale, 0.8, easeInOutCubic));
  yield* popIn(request());
  yield* waitFor(2.6);

  // --- ... a whole scaffold, in a moment --------------------------------------------
  yield* waitUntil('scaffold');
  yield* all(
    editor().opacity(1, 0.4),
    pane().opacity(1, 0.4),
    person().opacity(1, 0.4),
    rowRefs[0]().opacity(1, 0.4),
  );
  yield handLines(3, 14, linear);
  yield* write(0.045);
  yield* waitFor(0.5);

  // --- Adapted to the request -------------------------------------------------------
  yield* waitUntil('adapted');
  const targets: [number, number][] = [[0, 0], [1, 5], [2, 6]]; // phrase, tree row
  yield* adapted().opacity(1, 0.5);
  yield* sequence(
    0.7,
    ...targets.map(([p, r]) =>
      all(
        phrases[p].fill(amber, 0.3),
        adaptLink(phrases[p], r).end(1, 0.6, easeInOutCubic),
        chain(waitFor(0.4), rowMarks[r]().opacity(1, 0.3)),
      ),
    ),
  );
  yield* waitFor(2);

  // --- Hard to match, not magic -----------------------------------------------------
  yield* waitUntil('expert');
  yield* all(
    ...links().children().map(l => l.opacity(0, 0.4)),
    ...rowMarks.map(m => m().opacity(0, 0.4)),
    ...phrases.map(p => p.fill(amberOff, 0.4)),
    expert().opacity(1, 0.5),
  );
  links().removeChildren();
  yield* waitFor(3);

  // --- Why: other people's work -------------------------------------------------------
  yield* waitUntil('others-work');
  yield* all(
    request().opacity(0, 0.5),
    person().opacity(0, 0.5),
    adapted().opacity(0, 0.5),
    expert().opacity(0, 0.5),
    editor().opacity(0, 0.6),
    pane().opacity(0, 0.6),
  );
  yield* all(
    treeX(TREE_ALONE, 0.9, easeInOutCubic),
    ...rowRefs.map((r, i) => (i === 0 ? r().opacity(0, 0.4) : r().fill(colors.textLight, 0.4))),
  );
  yield* all(
    others().opacity(1, 0.5),
    ...shown.map((s, r) => s(FILES[r].examples, 2.2, easeOutCubic)),
  );
  yield* waitFor(3);

  // --- Why: the scale of the machine ------------------------------------------------
  yield* waitUntil('scale');
  yield* all(
    others().opacity(0, 0.4),
    grid().opacity(1, 0.6),
    knobsLabel().opacity(1, 0.6),
    knobs().opacity(1, 0.6),
  );
  yield* all(
    sequence(0.09, ...range(40).map(flySheet)),
    delay(0.8, chain(nudge(26, 0), nudge(18, 1), nudge(12, 2), nudge(8, 3))),
  );
  yield* waitFor(0.8);

  // --- But: no guarantee -------------------------------------------------------------
  yield* waitUntil('limits');
  yield* all(
    grid().opacity(0, 0.5),
    knobsLabel().opacity(0, 0.5),
    knobs().opacity(0, 0.5),
    stacks().opacity(0.3, 0.6),
  );
  yield* close().opacity(1, 0.5);
  yield* waitFor(0.8);
  yield* all(flag().opacity(1, 0.4), flagNote().opacity(1, 0.4), limits().opacity(1, 0.5));
  yield* waitFor(1);
  yield* all(thinNote().opacity(1, 0.4), rowMarks[THIN + 1]().opacity(1, 0.4));
  yield* waitFor(3);

  // --- Check, follow up, refine -------------------------------------------------------
  yield* waitUntil('follow-up');
  yield* all(
    stacks().opacity(0, 0.5),
    thinNote().opacity(0, 0.4),
    limits().opacity(0, 0.4),
    rowMarks[THIN + 1]().opacity(0, 0.4),
  );
  yield* popIn(followUp());
  yield* waitFor(1.4);
  yield* all(wrong().opacity(0, 0.3), flagNote().opacity(0, 0.3));
  yield* all(
    fixed().opacity(1, 0.3),
    flag().stroke(colors.good, 0.3),
    flag().width(lineW(IMPORT_FIXED), 0.3),
    flag().x(CODE_X + lineW(IMPORT_FIXED) / 2 - 10, 0.3),
    newRow().opacity(1, 0.3),
  );
  yield* waitFor(1.5);

  yield* waitUntil('jumpstart');
  closing().scale(0.9);
  yield* all(closing().opacity(1, 0.5), closing().scale(1, 0.6, easeOutBack));
  yield* waitFor(4.5);

  // Clear the stage for Scene 14.
  yield* all(...view.children().filter(c => c !== fade()).map(c => c.opacity(0, 0.8)));
});

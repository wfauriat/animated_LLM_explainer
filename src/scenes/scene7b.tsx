// Scene 7b — Long-range attention in the context window. The chat dissolves
// into the whole conversation as one ribbon of tokens. The machine (a cog)
// regenerates the answer; when it must guess the suspect's name, it looks
// back at every token, mostly at the clues scattered far back in the text,
// then guesses. Guessing well takes context, clues and facts: "as if"
// reasoning.
import {CubicBezier, makeScene2D, Node, Rect, Txt} from '@motion-canvas/2d';
import {
  all,
  chain,
  createRef,
  createSignal,
  easeInOutCubic,
  easeInOutSine,
  easeOutBack,
  linear,
  sequence,
  Vector2,
  waitFor,
  waitUntil,
} from '@motion-canvas/core';
import {ChatApp, createChatRefs} from '../components/ChatApp';
import {Cog} from '../components/Cog';
import {Curve, FlowDots} from '../components/Flow';
import {Desk, Monitor} from '../components/Monitor';
import {CHAT_ZOOM, positionIn} from '../layout';
import {colors, font} from '../theme';
import {CHIP_H} from '../scene4/layout';
import {makeChip, makeLabel} from '../scene4/parts';
import {ANSWER, QUESTION, RIDDLE, showRiddle, tokenize} from '../scene7/parts';

// --- Data -------------------------------------------------------------------

const PROMPT = [...tokenize(RIDDLE), ...tokenize(QUESTION)];
const REPLY = tokenize(ANSWER); // The murderer is most likely | Colonel Mustard .
const KEY = REPLY.indexOf('Colonel'); // the token that needs the clues

// How much the guess of "Colonel" looks back at each prompt word:
// [word, occurrence, weight]. Everything else gets BACKGROUND (illustrative).
const CLUES: [string, number, number][] = [
  ['dry', 1, 1],
  ['rain', 1, 0.7],
  ['shoes', 1, 0.55],
  ['garden', 1, 0.45],
  ['Colonel', 2, 0.45],
  ['murderer', 1, 0.4],
  ['Colonel', 1, 0.35],
  ['together', 1, 0.35],
  ['kitchen', 1, 0.3],
  ['maid', 1, 0.3],
  ['dead', 1, 0.25],
];
const BACKGROUND = 0.04;
const STRONG = 0.2; // links above this weight get arrows and flowing dots

const TOP5: [string, number][] = [
  ['Colonel', 0.68],
  ['Professor', 0.12],
  ['Mrs', 0.09],
  ['Miss', 0.06],
  ['maid', 0.02],
];

function promptWeights() {
  const w = PROMPT.map(() => BACKGROUND);
  for (const [word, nth, weight] of CLUES) {
    let seen = 0;
    const i = PROMPT.findIndex(t => t === word && ++seen === nth);
    w[i] = weight;
  }
  return w;
}

// --- Layout -----------------------------------------------------------------

const RIBBON_SCALE = 0.8;
const RIBBON_W = 1720; // on screen
const RIBBON_TOP = -440;
const FRAME_PAD = 28;
const TIP = new Vector2(-330, 250); // the machine, below the ribbon
const COG_R = 62;
const LINK_END = TIP.addY(-COG_R - 12);
const TOP5_POS = new Vector2(-200, 150); // top-left of the Top-5 list
const TOP5_SCALE = 0.7;
const BAR_W = 520;
const CAPTION_Y = 445;
const chipStyle = {width: null as null, padding: [0, 16] as [number, number]};

export default makeScene2D(function* (view) {
  view.fill(colors.machineBg);
  const clock = createSignal(0);

  // --- Starts on 7a's last frame: the finished exchange on the chat screen ----
  const chat = createChatRefs();
  const world = createRef<Node>();
  view.add(
    <Node ref={world} scale={CHAT_ZOOM}>
      <Desk />
      <Monitor>
        <ChatApp refs={chat} />
      </Monitor>
    </Node>,
  );
  showRiddle(chat);

  // --- The context window: every token of the conversation, in one ribbon ----
  const frame = createRef<Rect>();
  const frameLabel = createRef<Txt>();
  const linkLayer = createRef<Node>();
  const ribbon = createRef<Rect>();
  const cog = createRef<Node>();
  const cogAngle = createSignal(0);
  const flyLayer = createRef<Node>();
  const top5 = createRef<Rect>();
  const caption = createRef<Node>();

  const promptChips = PROMPT.map(t => makeChip(t, colors.token, {...chipStyle, opacity: 0}));
  const replyChips: Rect[] = [];
  const top5Chips = TOP5.map(([word]) =>
    makeChip(word, colors.botBubble, {width: 230, opacity: 1}),
  );
  const top5Bars = TOP5.map(() => createRef<Rect>());
  const heading = makeLabel('A good next-token guesser');
  heading.position(TOP5_POS.addY(-42)).offset([-1, 0]).opacity(0);

  view.insert(
    <>
      <Rect
        ref={frame}
        x={0}
        y={RIBBON_TOP - FRAME_PAD}
        offsetY={-1}
        width={RIBBON_W + 2 * FRAME_PAD}
        height={() => ribbon().height() * RIBBON_SCALE + 2 * FRAME_PAD}
        radius={24}
        fill={'#ffffff08'}
        stroke={colors.label}
        lineWidth={3}
        end={0}
      />
      <Txt
        ref={frameLabel}
        x={-RIBBON_W / 2 - FRAME_PAD}
        y={RIBBON_TOP - FRAME_PAD - 34}
        offsetX={-1}
        fontFamily={font}
        fontSize={32}
        fontWeight={600}
        fill={colors.label}
        text={'Context window'}
        opacity={0}
      />
      <Node ref={linkLayer} />
      <Rect
        ref={ribbon}
        layout
        wrap={'wrap'}
        alignItems={'center'}
        columnGap={12}
        rowGap={16}
        width={RIBBON_W / RIBBON_SCALE}
        y={RIBBON_TOP}
        offsetY={-1}
        scale={RIBBON_SCALE}
      >
        {promptChips}
      </Rect>
      <Node ref={cog} position={TIP} scale={0}>
        <Cog teeth={14} radius={COG_R} root={0.84} hole={0.24} fill={'#5a6476'} rotation={cogAngle} />
      </Node>
      <Rect
        ref={top5}
        layout
        direction={'column'}
        gap={14}
        position={TOP5_POS}
        offset={[-1, -1]}
        scale={TOP5_SCALE}
        opacity={0}
      >
        {TOP5.map(([, p], i) => (
          <Rect alignItems={'center'} gap={20}>
            {top5Chips[i]}
            <Rect ref={top5Bars[i]} width={0} height={18} radius={9} fill={colors.index} />
            <Txt fontFamily={font} fontSize={34} fontWeight={600} fill={colors.textLight} text={`${Math.round(p * 100)}%`} />
          </Rect>
        ))}
      </Rect>
      {heading}
      <Node ref={flyLayer} />
      <Node ref={caption} y={CAPTION_Y}>
        <Txt fontFamily={font} fontSize={40} fill={colors.textLight} opacity={0}>
          {'Guessing correctly means looking at context, clues and facts… '}
          <Txt fontStyle={'italic'} fontWeight={600} fill={colors.attention}>
            as if reasoning
          </Txt>
        </Txt>
        <Txt y={56} fontFamily={font} fontSize={30} fill={colors.textMuted} opacity={0}>
          (and answering properly implies correct grammar, syntax, …)
        </Txt>
      </Node>
    </>,
  );
  yield clock(1000, 1000, linear);
  yield* waitFor(0.5);

  // --- Helpers ---------------------------------------------------------------

  // The machine produces one answer token, which joins the ribbon.
  function* produce(text: string, duration: number, from = TIP, fromScale = 0) {
    const slot = makeChip(text, colors.botBubble, {...chipStyle, opacity: 0});
    ribbon().add(slot);
    replyChips.push(slot);
    const fly = makeChip(text, colors.botBubble, {...chipStyle});
    fly.position(from).scale(fromScale);
    flyLayer().add(fly);
    yield* all(
      cogAngle(cogAngle() + 60, duration, easeInOutSine),
      chain(
        fly.scale(RIBBON_SCALE, duration * 0.3),
        fly.position(positionIn(slot, flyLayer()), duration * 0.7, easeInOutCubic),
      ),
    );
    slot.opacity(1);
    fly.remove();
  }

  // Link from a ribbon chip down into the machine; weight sets its strength.
  function link(chip: Rect, w: number) {
    const p0 = positionIn(chip, linkLayer()).addY((CHIP_H * RIBBON_SCALE) / 2 + 2);
    const curve: Curve = {p0, p1: p0.addY(110), p2: LINK_END.addY(-170), p3: LINK_END};
    const strong = w > STRONG;
    const line = (
      <CubicBezier
        {...curve}
        stroke={colors.attention}
        lineWidth={1.5 + 12 * w}
        opacity={0.25 + 0.75 * w}
        endArrow={strong}
        arrowSize={8 + 8 * w}
        end={0}
      />
    ) as CubicBezier;
    const dots = strong ? (
      <FlowDots curve={curve} clock={clock} color={'#ffffff'} width={4 + 6 * w} spacing={40} speed={120} opacity={0} />
    ) as Node : null;
    linkLayer().add(dots ? [line, dots] : line);
    return {line, dots, w, chip};
  }

  // --- The chat becomes the context window -----------------------------------
  yield* waitUntil('context');
  yield* all(
    world().scale(CHAT_ZOOM * 1.15, 1.0, easeInOutCubic),
    world().opacity(0, 1.0),
  );
  world().remove();
  yield* all(frame().end(1, 1.0, easeInOutCubic), frameLabel().opacity(1, 0.6));
  yield* sequence(0.012, ...promptChips.map(c => c.opacity(1, 0.25)));
  yield* waitFor(0.8);

  // --- The machine writes the answer, one token at a time ---------------------
  yield* waitUntil('generate');
  yield* cog().scale(1, 0.5, easeOutBack);
  for (let i = 0; i < KEY; i++) yield* produce(REPLY[i], 0.6);
  yield* waitFor(0.4);

  // --- To guess the name, it looks back over the whole context --------------
  yield* waitUntil('look-back');
  const weights = [...promptWeights(), ...replyChips.map(() => BACKGROUND)];
  const links = [...promptChips, ...replyChips].map((c, i) => link(c, weights[i]));
  const faint = links.filter(k => !k.dots);
  const strong = links.filter(k => k.dots);
  yield* all(
    ...faint.map(k => k.line.end(1, 0.9, easeInOutCubic)),
    cogAngle(cogAngle() + 30, 0.9, easeInOutSine),
  );
  yield* waitFor(0.3);
  yield* all(
    ...strong.map(k => k.line.end(1, 0.9, easeInOutCubic)),
    ...strong.map(k => k.chip.stroke(colors.attention).lineWidth(6, 0.5)),
    ...faint.map(k => k.chip.opacity(0.45, 0.6)),
    cogAngle(cogAngle() + 30, 0.9, easeInOutSine),
  );
  yield* all(...strong.map(k => k.dots!.opacity(0.3 + 0.7 * k.w, 0.3)));
  yield* waitFor(2.5);

  // --- ... and makes its guess ------------------------------------------------
  yield* waitUntil('guess');
  yield* all(
    ...links.map(k => k.line.opacity(0.12, 0.6)),
    ...strong.map(k => k.dots!.opacity(0.15, 0.6)),
    top5().opacity(1, 0.5),
    heading.opacity(1, 0.5),
    ...top5Bars.map((b, i) => b().width(BAR_W * TOP5[i][1], 0.8, easeInOutCubic)),
  );
  yield* waitFor(2);

  // --- "Colonel" is picked, then the name is finished -----------------------
  yield* waitUntil('pick');
  yield* all(
    top5Chips[0].lineWidth(5, 0.3),
    ...top5Chips.slice(1).map(c => c.opacity(0.4, 0.3)),
  );
  yield* waitFor(0.4);
  const picked = positionIn(top5Chips[0], flyLayer());
  yield* all(
    produce(REPLY[KEY], 1.0, picked, TOP5_SCALE),
    ...linkLayer().children().map(c => c.opacity(0, 0.8)),
    ...promptChips.map(c => all(c.opacity(1, 0.8), c.lineWidth(0, 0.8))),
    ...replyChips.map(c => c.opacity(1, 0.8)),
  );
  linkLayer().removeChildren();
  yield* all(top5().opacity(0, 0.5), heading.opacity(0, 0.5));
  for (let i = KEY + 1; i < REPLY.length; i++) yield* produce(REPLY[i], 0.6);
  yield* waitFor(0.6);

  // --- What it takes to guess well -------------------------------------------
  yield* waitUntil('as-if');
  const [line1, line2] = caption().children();
  yield* line1.opacity(1, 0.8);
  yield* waitFor(1.2);
  yield* line2.opacity(1, 0.8);
  yield* waitFor(4);
});

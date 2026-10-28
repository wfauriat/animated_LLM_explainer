// Scene 4d — From directions to the next word. Only the last row's dials
// matter for what comes next: through the softmax layer they turn into the
// Top-5 candidate indices with their probabilities; un-embedding maps them back to words; a "generative"
// roulette picks one (not always the top one); N+1 appends it to the input.
import {makeScene2D, Node, Rect, Txt} from '@motion-canvas/2d';
import {
  all,
  chain,
  createRef,
  createSignal,
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  easeOutQuart,
  sequence,
  Vector2,
  waitFor,
  waitUntil,
} from '@motion-canvas/core';
import {colors, font} from '../theme';
import {
  CHIP_W,
  FOLDED_SCALE,
  LABEL_SCALE,
  OUT_LABEL_Y,
  OUT_ROWS_Y,
  PICKED,
  QUESTION_ROW,
  rowY,
  SOFTMAX_H,
  SOFTMAX_X,
  SPINE_H,
  TOKENS_X,
  TOP5,
  TOP5_X,
  WORDS_X,
} from '../scene4/layout';
import {createMachine} from '../scene4/Machine';
import {createRoulette} from '../scene4/Output';
import {makeChip} from '../scene4/parts';

const WHEEL_R = 270;
const TITLE_FONT = 72;
const CANDIDATE_OPACITY = 0.55;

export default makeScene2D(function* (view) {
  view.fill(colors.machineBg);

  // Starts on 4c's last frame.
  const machine = createMachine('4d');
  const {core, output, input} = machine;
  const roulette = createRoulette(WHEEL_R);
  const overlay = createRef<Rect>();
  const wheel = createRef<Node>();
  const title = createRef<Txt>();
  const subtitle = createRef<Txt>();

  view.add(
    <>
      {machine.node}
      <Rect ref={overlay} width={'100%'} height={'100%'} fill={colors.machineBg} opacity={0} />
      <Node ref={wheel} y={40} opacity={0} scale={0.8}>
        {roulette.node}
      </Node>
      <Txt
        ref={title}
        y={-430}
        fontFamily={font}
        fontSize={TITLE_FONT}
        fontWeight={600}
        fill={colors.botBubble}
        text={'Generative pick'}
        opacity={0}
      />
      <Txt
        ref={subtitle}
        y={-355}
        fontFamily={font}
        fontSize={30}
        fill={colors.textLight}
        text={'the G in GPT: it picks a likely next word, not always the most likely one'}
        opacity={0}
      />
    </>,
  );
  yield* waitFor(0.5);

  // --- Softmax: a thin layer at the core's exit ---------------------------
  yield* waitUntil('softmax');
  yield* all(
    output.softmax.height(SOFTMAX_H, 0.7, easeInOutCubic),
    output.softmaxLabel.opacity(1, 0.7),
  );
  yield* waitFor(0.3);

  // --- The last row leaves the core and goes through the softmax ----------
  yield* waitUntil('last-row');
  const last = core.rows[core.rows.length - 1];
  yield* all(
    last.x(SOFTMAX_X, 1.2, easeInOutCubic),
    chain(
      waitFor(0.6),
      all(...last.dials.map(d => d.node.opacity(0, 0.6)), last.dots.opacity(0, 0.6)),
    ),
  );

  // --- ... and comes out as the Top-5 -------------------------------------
  yield* waitUntil('top5');
  const origin = new Vector2(SOFTMAX_X + 20, last.y);
  output.entries.forEach(e => e.chip.position(origin).scale(0.3).opacity(0));
  yield* all(
    output.label.opacity(1, 0.5),
    output.softmax.width(48, 0.25).to(40, 0.35),
    sequence(
      0.12,
      ...output.entries.map((e, i) =>
        all(
          e.chip.opacity(1, 0.3),
          e.chip.position([TOP5_X, OUT_ROWS_Y[i]], 0.7, easeOutCubic),
          e.chip.scale(FOLDED_SCALE, 0.7, easeOutCubic),
        ),
      ),
    ),
  );
  yield* sequence(
    0.1,
    ...output.entries.map((e, i) =>
      all(
        e.pct.opacity(1, 0.3),
        e.bar.width((CHIP_W * FOLDED_SCALE * TOP5[i].p) / TOP5[0].p, 0.5, easeOutCubic),
      ),
    ),
  );
  yield* output.more.opacity(1, 0.3);
  yield* waitFor(1.5);

  // --- Un-embedding: indices back to words --------------------------------
  yield* waitUntil('unembed');
  yield* all(
    output.spine.height(SPINE_H, 0.8, easeInOutCubic),
    output.spineLabel.opacity(1, 0.8),
  );
  yield* sequence(
    0.2,
    ...output.guides.map((g, i) =>
      chain(
        g.end(1, 0.5, easeInOutCubic),
        all(
          output.words[i].opacity(1, 0.3),
          output.words[i].scale(FOLDED_SCALE * 1.15, 0.15).to(FOLDED_SCALE, 0.2),
        ),
      ),
    ),
  );
  yield* waitFor(1.5);

  // --- Generative: a weighted draw, not always the top choice -------------
  yield* waitUntil('generative');
  yield* all(
    overlay().opacity(0.88, 0.6),
    wheel().opacity(1, 0.6),
    wheel().scale(1, 0.7, easeOutBack),
    title().opacity(1, 0.6),
    subtitle().opacity(1, 0.6),
  );
  yield* waitFor(0.8);
  yield* waitUntil('spin');
  yield* roulette.wheel.rotation(roulette.rotationFor(PICKED, 4), 4.5, easeOutQuart);
  const slice = roulette.slices[PICKED];
  slice.parent()?.moveToTop(); // so its highlight is not hidden by neighbours
  yield* all(
    slice.stroke(colors.textLight, 0.3),
    slice.lineWidth(8, 0.3),
    slice.scale(1.06, 0.3).to(1, 0.3),
  );
  yield* waitFor(1.5);

  // --- Back to the machine: the title becomes the "Generative" label ------
  yield* waitUntil('pick');
  yield* all(
    overlay().opacity(0, 0.8),
    wheel().opacity(0, 0.6),
    wheel().scale(0.6, 0.8),
    subtitle().opacity(0, 0.4),
    title().position([WORDS_X, OUT_LABEL_Y], 1.0, easeInOutCubic),
    title().scale((40 * LABEL_SCALE) / TITLE_FONT, 1.0, easeInOutCubic),
    title().fill(colors.label, 1.0),
  );
  output.genLabel.opacity(1);
  title().opacity(0);
  yield* all(
    ...output.words.map((w, i) =>
      i === PICKED
        ? w.scale(FOLDED_SCALE * 1.15, 0.25).to(FOLDED_SCALE, 0.25)
        : w.opacity(CANDIDATE_OPACITY, 0.5),
    ),
  );
  yield* waitFor(0.8);

  // --- N+1: the picked word is appended to the input ----------------------
  yield* waitUntil('n+1');
  yield* all(
    output.arrow.end(1, 1.6, easeInOutCubic),
    output.arrowLabel.opacity(1, 1.0),
  );
  const traveler = makeChip(TOP5[PICKED].word, colors.botBubble, {scale: FOLDED_SCALE});
  const progress = createSignal(0);
  traveler.position(() => output.arrow.getPointAtPercentage(progress()).position);
  view.add(traveler);
  yield* progress(1, 2.4, easeInOutCubic);
  traveler.position(traveler.position());
  yield* all(
    traveler.position([TOKENS_X, rowY(QUESTION_ROW)], 0.5, easeOutCubic),
    input.question.opacity(0, 0.4),
  );
  output.appended.opacity(1);
  traveler.remove();
  yield* output.appended.scale(FOLDED_SCALE * 1.15, 0.2).to(FOLDED_SCALE, 0.3);
  yield* waitFor(2);
});

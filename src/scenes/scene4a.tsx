// Scene 4a — Tokenization. The user's sentence breaks into token chips
// ("rain|ing", "out|side"); each token is looked up in the dictionary to get
// its index number. The stage then folds into the left of the machine.
import {CubicBezier, makeScene2D, Node, Rect} from '@motion-canvas/2d';
import {
  all,
  createRef,
  easeInOutCubic,
  easeOutCubic,
  sequence,
  Vector2,
  waitFor,
  waitUntil,
} from '@motion-canvas/core';
import {easeOutBack} from '../motion';
import {Backdrop} from '../components/Titles';
import {colors} from '../theme';
import {
  CHIP_W,
  DICT_X,
  FOLDED_SCALE,
  IDS,
  INDEX_X,
  LABEL_SCALE,
  LABEL_Y,
  MACHINE_FIT,
  MACHINE_Y,
  P_INDEX_X,
  P_TOKENS_X,
  pRowY,
  QUESTION_ROW,
  rowY,
  SPINE_Y,
  STARTS_WORD,
  TOKENS,
  TOKENS_X,
} from '../scene4/layout';
import {
  createDictionary,
  makeChip,
  makeLabel,
  makeQuestionChip,
} from '../scene4/parts';

const SPACE = 11; // word spacing in the sentence (px at chip font size)
const PAD = 36; // horizontal padding added when words become chips
const GAP = 16; // gap between chips in the split row
const SENTENCE_SCALE = 1.3; // sentence and split row are shown larger

// x centers for a row of items of the given widths and gaps, centered on 0.
function rowCenters(widths: number[], gaps: number[]) {
  const total = widths.reduce((a, w) => a + w, 0) + gaps.reduce((a, g) => a + g, 0);
  let x = -total / 2;
  return widths.map((w, i) => {
    x += (i > 0 ? gaps[i - 1] : 0) + w / 2;
    const center = x;
    x += w / 2;
    return center;
  });
}

export default makeScene2D(function* (view) {
  view.fill(colors.machineBg);

  const label = makeLabel('Tokenization');
  label.position([0, -456]).opacity(0);
  const dict = createDictionary();
  dict.node.opacity(0).scale(0.9);
  const bubble = createRef<Rect>();
  const chips = TOKENS.map(t =>
    makeChip(t, colors.token + '00', {width: null, padding: 0}),
  );
  const question = makeQuestionChip();
  question.opacity(0);
  const indexLayer = createRef<Node>();
  const backdrop = createRef<Rect>();
  const stage = createRef<Node>();

  view.add(
    <>
      <Backdrop ref={backdrop} opacity={0} />
      <Node ref={stage}>
      <Rect ref={bubble} height={84} radius={[30, 30, 30, 8]} fill={colors.token} opacity={0} scale={0.8 * SENTENCE_SCALE} />
      {dict.node}
      {chips}
      {question}
      <Node ref={indexLayer} />
      {label}
      </Node>
    </>,
  );

  // Sentence layout: measure the words, then glue sub-word tokens together.
  const textW = chips.map(c => c.width());
  chips.forEach((c, i) => c.width(textW[i]).opacity(0));
  const sentenceX = rowCenters(textW, STARTS_WORD.slice(1).map(s => (s ? SPACE : 0)));
  chips.forEach((c, i) => c.position([sentenceX[i] * SENTENCE_SCALE, 0]).scale(SENTENCE_SCALE));
  const sentenceW = textW.reduce((a, w) => a + w, 0) + SPACE * 7;
  bubble().width(sentenceW + 64);

  // --- The user's message ------------------------------------------------
  yield backdrop().opacity(1, 1);
  yield* waitFor(0.4);
  yield* waitUntil('sentence');
  yield* all(
    bubble().opacity(1, 0.3),
    bubble().scale(SENTENCE_SCALE, 0.5, easeOutBack),
    ...chips.map(c => c.opacity(1, 0.3)),
  );
  yield* waitFor(0.8);

  // --- It breaks into tokens ---------------------------------------------
  yield* waitUntil('split');
  yield* label.opacity(1, 0.6);
  const chipW = textW.map(w => w + PAD);
  const splitX = rowCenters([...chipW, CHIP_W], chipW.map(() => GAP));
  yield* all(
    bubble().opacity(0, 0.6),
    ...chips.map((c, i) =>
      all(
        c.fill(colors.token, 0.6),
        c.width(chipW[i], 0.8, easeInOutCubic),
        c.x(splitX[i] * SENTENCE_SCALE, 0.8, easeInOutCubic),
      ),
    ),
  );
  question.position([splitX[QUESTION_ROW] * SENTENCE_SCALE, 0]).scale(0.6);
  yield* all(question.opacity(1, 0.3), question.scale(SENTENCE_SCALE, 0.4, easeOutBack));
  yield* waitFor(0.8);

  // --- Tokens line up in a column; the dictionary opens -------------------
  yield* waitUntil('column');
  yield* sequence(
    0.04,
    ...[...chips, question].map((c, i) =>
      all(
        c.position([P_TOKENS_X, pRowY(i)], 1.1, easeInOutCubic),
        c.width(CHIP_W, 1.1, easeInOutCubic),
        c.scale(1, 1.1, easeInOutCubic),
      ),
    ),
  );
  yield* all(dict.node.opacity(1, 0.5), dict.node.scale(1, 0.6, easeOutCubic));
  yield* waitFor(0.8);

  // --- Look up each token's index ----------------------------------------
  yield* waitUntil('lookup');
  const band = dict.band;
  const indexChips: Rect[] = [];
  function* lookup(i: number, pace: number) {
    const chip = chips[i];
    const probe = createRef<CubicBezier>();
    const from = new Vector2(P_TOKENS_X + CHIP_W / 2 + 8, pRowY(i));
    const to = band.addX(-170);
    indexLayer().add(
      <CubicBezier
        ref={probe}
        p0={from}
        p1={from.addX(120)}
        p2={to.addX(-120)}
        p3={to}
        stroke={colors.token}
        lineWidth={3}
        end={0}
      />,
    );
    yield* all(
      chip.lineWidth(4, 0.2 * pace),
      chip.scale(1.08, 0.2 * pace),
      probe().end(1, 0.4 * pace),
    );
    yield* dict.scrollTo(IDS[i], 0.8 * pace);
    yield* dict.flash(0.3 * pace);
    const idx = makeChip(String(IDS[i]), colors.index);
    idx.position(band).scale(0.6).opacity(0);
    indexLayer().add(idx);
    indexChips.push(idx);
    yield* all(
      idx.opacity(1, 0.15 * pace),
      idx.position([P_INDEX_X, pRowY(i)], 0.6 * pace, easeInOutCubic),
      idx.scale(1, 0.6 * pace, easeInOutCubic),
      chip.lineWidth(0, 0.4 * pace),
      chip.scale(1, 0.4 * pace),
      probe().opacity(0, 0.4 * pace),
    );
    probe().remove();
  }
  for (let i = 0; i < TOKENS.length; i++) {
    yield* lookup(i, i < 2 ? 0.9 : 0.3);
    if (i < 2) yield* waitFor(0.2);
  }
  yield* waitFor(0.8);

  // --- Fold into the left of the machine ---------------------------------
  yield* waitUntil('fold');
  const fold = 1.6;
  yield* all(
    stage().scale(MACHINE_FIT, fold, easeInOutCubic),
    stage().y(MACHINE_Y, fold, easeInOutCubic),
    label.position([DICT_X, LABEL_Y], fold, easeInOutCubic),
    label.scale(LABEL_SCALE, fold, easeInOutCubic),
    dict.fold([DICT_X, SPINE_Y], fold),
    ...[...chips, question].map((c, i) =>
      all(
        c.position([TOKENS_X, rowY(i)], fold, easeInOutCubic),
        c.scale(FOLDED_SCALE, fold, easeInOutCubic),
      ),
    ),
    ...indexChips.map((c, i) =>
      all(
        c.position([INDEX_X, rowY(i)], fold, easeInOutCubic),
        c.scale(FOLDED_SCALE, fold, easeInOutCubic),
      ),
    ),
  );
  yield* waitFor(0.5);
  yield* waitUntil('scene-end');
});

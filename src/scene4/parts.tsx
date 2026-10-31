// Building blocks of the Scene 4 machine: chips, stage labels, dictionary,
// and the folded input stage shared by every sub-scene after 4a.
import {Node, Rect, RectProps, Txt} from '@motion-canvas/2d';
import {
  all,
  createRef,
  easeInOutCubic,
  PossibleVector2,
  ThreadGenerator,
  Vector2,
} from '@motion-canvas/core';
import {colors, font} from '../theme';
import {
  CHIP_FONT,
  CHIP_H,
  CHIP_W,
  DICT_X,
  DICTIONARY,
  FOLDED_SCALE,
  IDS,
  INDEX_X,
  LABEL_SCALE,
  LABEL_Y,
  QUESTION_ROW,
  rowY,
  SPINE_H,
  SPINE_Y,
  TOKENS,
  TOKENS_X,
} from './layout';

// ---------------------------------------------------------------------------
// Chips

export function makeChip(
  text: string,
  fill: string,
  {
    width = CHIP_W,
    textFill = colors.tokenText,
    ...props
  }: {width?: number | null; textFill?: string} & Omit<RectProps, 'width'> = {},
) {
  return (
    <Rect
      layout
      justifyContent={'center'}
      alignItems={'center'}
      height={CHIP_H}
      {...(width === null ? {} : {width})}
      radius={14}
      fill={fill}
      stroke={colors.textLight}
      lineWidth={0}
      {...props}
    >
      <Txt fontFamily={font} fontSize={CHIP_FONT} fill={textFill} text={text} />
    </Rect>
  ) as Rect;
}

// Dashed empty slot for the token the machine will predict.
export function makeQuestionChip() {
  return (
    <Rect
      layout
      justifyContent={'center'}
      alignItems={'center'}
      width={CHIP_W}
      height={CHIP_H}
      radius={14}
      stroke={colors.token}
      lineWidth={3}
      lineDash={[10, 8]}
    >
      <Txt fontFamily={font} fontSize={CHIP_FONT} fill={colors.token} text={'?'} />
    </Rect>
  ) as Rect;
}

export function makeLabel(text: string) {
  return (
    <Txt fontFamily={font} fontSize={40} fontWeight={600} fill={colors.label} text={text} />
  ) as Txt;
}

// ---------------------------------------------------------------------------
// Dictionary: a "book" whose list scrolls behind a fixed reading band.

const ENTRY_H = 48;
const PANEL_W = 340;
const PANEL_H = 780;
const WINDOW_W = 300;
const WINDOW_H = 620;
const WINDOW_Y = 40;

type DictRow = {word: string; id: number} | null; // null = "⋮" gap

const DICT_ROWS: DictRow[] = DICTIONARY.flatMap(([word, id], i) => {
  const gap = i > 0 && DICTIONARY[i - 1][1] !== id - 1;
  return gap ? [null, {word, id}] : [{word, id}];
});
const rowOf = (id: number) => DICT_ROWS.findIndex(r => r?.id === id);

export interface Dictionary {
  node: Node;
  /** Reading band center, relative to the dictionary node. */
  band: Vector2;
  scrollTo(id: number, duration: number): ThreadGenerator;
  flash(duration: number): ThreadGenerator;
  fold(to: PossibleVector2, duration: number): ThreadGenerator;
  setFolded(at: PossibleVector2): void;
}

export function createDictionary(): Dictionary {
  const node = createRef<Node>();
  const panel = createRef<Rect>();
  const content = createRef<Node>();
  const list = createRef<Node>();
  const band = createRef<Rect>();
  const spineLabel = createRef<Txt>();
  const text = {fontFamily: font, fontSize: 30, fill: colors.dictionaryText};

  <Node ref={node}>
    <Rect
      ref={panel}
      width={PANEL_W}
      height={PANEL_H}
      radius={20}
      fill={colors.dictionary}
      stroke={'#b9a56e'}
      lineWidth={4}
    />
    <Node ref={content}>
      <Txt {...text} y={-PANEL_H / 2 + 44} fontSize={34} fontWeight={600} text={'Dictionary'} />
      <Txt {...text} y={-PANEL_H / 2 + 84} fontSize={22} text={'about 50,000 tokens'} />
      <Rect y={WINDOW_Y} width={WINDOW_W} height={WINDOW_H} clip>
        <Rect
          ref={band}
          width={WINDOW_W}
          height={ENTRY_H}
          radius={8}
          fill={'#ffffff70'}
          stroke={colors.flowIn}
          lineWidth={0}
        />
        <Node ref={list} y={-rowOf(13) * ENTRY_H}>
          {DICT_ROWS.map((row, k) =>
            row ? (
              <Node y={k * ENTRY_H}>
                <Txt {...text} x={-120} offsetX={-1} text={row.word} />
                <Txt {...text} x={120} offsetX={1} fontWeight={600} text={String(row.id)} />
              </Node>
            ) : (
              <Node y={k * ENTRY_H}>
                <Txt {...text} x={-90} text={'⋮'} />
                <Txt {...text} x={90} text={'⋮'} />
              </Node>
            ),
          )}
        </Node>
      </Rect>
    </Node>
    <Txt
      ref={spineLabel}
      {...text}
      fontSize={22}
      fontWeight={600}
      rotation={-90}
      text={'Dictionary'}
      opacity={0}
    />
  </Node>;

  return {
    node: node(),
    band: new Vector2(0, WINDOW_Y),
    scrollTo(id, duration) {
      return list().y(-rowOf(id) * ENTRY_H, duration, easeInOutCubic);
    },
    *flash(duration) {
      yield* band().lineWidth(5, duration / 2).to(0, duration / 2);
    },
    *fold(to, duration) {
      yield* content().opacity(0, duration * 0.3);
      yield* all(
        panel().width(30, duration * 0.7, easeInOutCubic),
        panel().height(SPINE_H, duration * 0.7, easeInOutCubic),
        node().position(to, duration * 0.7, easeInOutCubic),
        spineLabel().opacity(1, duration * 0.7),
      );
    },
    setFolded(at) {
      content().opacity(0);
      panel().width(30).height(SPINE_H);
      node().position(at);
      spineLabel().opacity(1);
    },
  };
}

// ---------------------------------------------------------------------------
// Tokenization stage, folded into its overview slot (end state of 4a).

export interface FoldedInput {
  node: Node;
  tokenChips: Rect[];
  question: Rect;
  indexChips: Rect[];
  dictionary: Dictionary;
  label: Txt;
}

export function createFoldedInput(): FoldedInput {
  const dictionary = createDictionary();
  dictionary.setFolded([DICT_X, SPINE_Y]);
  const folded = (x: number, row: number) => ({
    position: [x, rowY(row)] as [number, number],
    scale: FOLDED_SCALE,
  });
  const tokenChips = TOKENS.map((t, i) => makeChip(t, colors.token, folded(TOKENS_X, i)));
  const question = makeQuestionChip();
  question.position([TOKENS_X, rowY(QUESTION_ROW)]).scale(FOLDED_SCALE);
  const indexChips = IDS.map((id, i) => makeChip(String(id), colors.index, folded(INDEX_X, i)));
  const label = makeLabel('Tokenization');
  label.position([DICT_X, LABEL_Y]).scale(LABEL_SCALE);

  const node = (
    <Node>
      {dictionary.node}
      {tokenChips}
      {question}
      {indexChips}
      {label}
    </Node>
  ) as Node;
  return {node, tokenChips, question, indexChips, dictionary, label};
}

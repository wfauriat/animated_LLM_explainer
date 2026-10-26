// Scene 4 data and layout. The machine reads left to right:
// tokens | dictionary | indices | embedding | transformer core | output.
// Each stage is first presented large and centered ("presentation" layout),
// then folds into its slot of the final overview ("folded" layout).
import {Vector2} from '@motion-canvas/core';

// "It was raining outside so he took a ??"
export const TOKENS = ['It', 'was', 'rain', 'ing', 'out', 'side', 'so', 'he', 'took', 'a'];
export const IDS = [1026, 19, 6290, 278, 503, 1745, 82, 31, 1038, 13];
// false = glued to the previous token in the original text ("rain|ing").
export const STARTS_WORD = [true, true, true, false, true, false, true, true, true, true];
export const QUESTION_ROW = TOKENS.length; // the "?" slot to be predicted

// Dictionary entries sorted by index (no special tokens). Includes the
// candidate words used again by the un-embedding stage.
export const DICTIONARY: [string, number][] = [
  ['.', 7], [',', 8], ['the', 9], ['of', 10], ['and', 11], ['to', 12],
  ['a', 13], ['in', 14], ['is', 15], ['that', 16], ['it', 17], ['for', 18],
  ['was', 19], ['he', 31], ['so', 82], ['ing', 278], ['out', 503],
  ['It', 1026], ['took', 1038], ['side', 1745], ['bus', 4310],
  ['rain', 6290], ['hat', 7185], ['coat', 8924], ['umb', 18420],
];

// ---------------------------------------------------------------------------
// Presentation layout (tokenization explained in the middle of the frame)

export const P_ROW_PITCH = 76;
export const pRowY = (row: number) => -380 + row * P_ROW_PITCH;
export const P_TOKENS_X = -430;
export const P_INDEX_X = 430;
export const CHIP_W = 150;
export const CHIP_H = 58;
export const CHIP_FONT = 36;

// ---------------------------------------------------------------------------
// Folded (overview) layout

export const FOLDED_SCALE = 0.7;
export const ROW_PITCH = 62;
export const rowY = (row: number) => -300 + row * ROW_PITCH;
export const TOKENS_X = -850;
export const DICT_X = -765;
export const INDEX_X = -680;
export const EMBED_X = -580;
export const SPINE_H = 680;
export const SPINE_Y = rowY(5);
export const LABEL_Y = -420;
export const LABEL_SCALE = 0.75;

// ---------------------------------------------------------------------------
// Embedding vectors ("compass" stacks) and the rows of the core

export const DIMS = 4; // dimensions drawn along the depth axis
export const DIAL = 64; // dial diameter in the overview
export const DEPTH = new Vector2(-30, -25); // offset per dimension (towards the back)
export const CORE_IN_X = -420; // front dial of each stack when entering the core

// Representative token rows that flow through the core.
export const CORE_ROWS = [
  {token: 0, y: -250},
  {token: 1, y: -100},
  {token: 8, y: 80},
  {token: 9, y: 230},
];
export const CORE_ELLIPSIS_Y = -10;

// Deterministic "embedding" direction (degrees) of a token for dimension k.
export function embeddingAngle(id: number, k: number) {
  return (id * 7919 + (k + 1) * 104729) % 360;
}

// ---------------------------------------------------------------------------
// Transformer core: one depth plane per dimension, one column of cogs per
// layer. Cogs sit between the rows and mesh with the dials above and below,
// so every column is a single gear train linking all the token rows.

export const LAYER_X = [-290, -100, 90, 300]; // the last one is "layer N"
export const MORE = new Vector2(195, 305); // "⋯" (many more layers) between layer 3 and N
export const COG_SLOTS = [
  {y: -325, r: 46},
  {y: -175, r: 46},
  {y: -10, r: 61},
  {y: 155, r: 46},
  {y: 305, r: 46},
];
export const PLANE = {x: -30, y: -10, w: 860, h: 790};
export const MASTER = new Vector2(380, 372); // master gear driven by the crank
export const CORE_LABEL = new Vector2(-37, -505);

// How much layer `step` nudges dimension k of core row r (degrees).
// Steps 0-2 = layers 1-3, step 3 = the "⋯" fast-forward, step 4 = layer N.
export function nudge(r: number, k: number, step: number) {
  return ((r * 37 + k * 61 + step * 89) % 130) - 65;
}
export const STEPS = 5;
export function coreAngle(r: number, k: number, steps: number) {
  let a = embeddingAngle(IDS[CORE_ROWS[r].token], k);
  for (let s = 0; s < steps; s++) a += nudge(r, k, s);
  return a;
}

// ---------------------------------------------------------------------------
// Output: Top-5 -> Un-embedding -> words, then the N+1 loop back to the input.

export const TOP5 = [
  {id: 7185, p: 0.32, word: 'hat'},
  {id: 8924, p: 0.21, word: 'coat'},
  {id: 4310, p: 0.16, word: 'bus'},
  {id: 18420, p: 0.12, word: 'umb'},
  {id: 6290, p: 0.07, word: 'rain'},
];
export const PICKED = 1; // "coat": not the top choice
export const OUT_ROWS_Y = [-220, -120, -20, 80, 180];
export const OUT_ELLIPSIS_Y = 250;
export const OUT_EXIT_X = 450; // where the last row's stack leaves the core
export const TOP5_X = 520;
export const UNEMBED_X = 690;
export const WORDS_X = 840;
export const OUT_LABEL_Y = -300;
export const N1_X = 925; // N+1 loop: down the right edge ...
export const N1_Y = 505; // ... and back along the bottom

// Battery plugged into the master gear (end of Scene 4, start of Scene 5).
export const POWER_BATTERY = new Vector2(600, 425);

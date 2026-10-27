// Scene 7 content: a whodunit riddle whose answer can only be guessed from
// clues spread across the whole context.
import {ChatRefs, makeBubble} from '../components/ChatApp';

export const RIDDLE =
  'A riddle. Four guests at the manor: Colonel Mustard, Mrs Peacock, ' +
  'Professor Plum and Miss Scarlet. At 9 pm, a loud noise upstairs: the host ' +
  'is found dead. Mrs Peacock and Miss Scarlet were drinking tea together in ' +
  'the living room. Professor Plum was cooking in the kitchen with the maid. ' +
  'The Colonel says he was walking in the garden, in the pouring rain, yet ' +
  'his shoes were perfectly dry.';
// What the one-line input field shows of the pasted riddle.
export const RIDDLE_PREVIEW =
  'A riddle. Four guests at the manor: Colonel Mustard, Mrs Peacock, Professor Plum…';
export const QUESTION = 'Who is the murderer?';
export const ANSWER = 'The murderer is most likely Colonel Mustard.';

// Rough tokenization: words and punctuation marks.
export function tokenize(text: string): string[] {
  return text.match(/[\w']+|[^\s\w]/g) ?? [];
}

// Adds the whole finished exchange at once.
export function showRiddle(refs: ChatRefs) {
  const rows = [
    makeBubble('user', RIDDLE),
    makeBubble('user', QUESTION),
    makeBubble('bot', ANSWER),
  ];
  for (const {row, bubble} of rows) {
    bubble.opacity(1);
    bubble.scale(1);
    refs.messages().add(row);
  }
}

// Part 1 of the film: The machine.
import {makeScene2D} from '@motion-canvas/2d';
import {chapterCard} from '../components/ChapterCard';

export default makeScene2D(function* (view) {
  yield* chapterCard(view, {part: 1, title: 'The machine', subtitle: 'How it writes, one token at a time'});
});

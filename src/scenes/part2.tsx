// Part 2 of the film: Building it.
import {makeScene2D} from '@motion-canvas/2d';
import {chapterCard} from '../components/ChapterCard';

export default makeScene2D(function* (view) {
  yield* chapterCard(view, {part: 2, title: 'Building it', subtitle: 'Billions of knobs, tuned on a mountain of text'});
});

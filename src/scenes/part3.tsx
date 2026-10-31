// Part 3 of the film: From machine to assistant.
import {makeScene2D} from '@motion-canvas/2d';
import {chapterCard} from '../components/ChapterCard';

export default makeScene2D(function* (view) {
  yield* chapterCard(view, {part: 3, title: 'From machine to assistant', subtitle: 'What it is good at, and what to watch out for'});
});

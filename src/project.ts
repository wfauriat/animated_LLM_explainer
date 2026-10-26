import {makeProject} from '@motion-canvas/core';
import '@fontsource/inter/400.css';
import '@fontsource/inter/400-italic.css';
import '@fontsource/inter/600.css';

import scene1 from './scenes/scene1?scene';
import scene2 from './scenes/scene2?scene';
import scene3 from './scenes/scene3?scene';

// Make sure the font is ready before any text gets measured.
await Promise.all(
  ['400 30px Inter', 'italic 400 30px Inter', '600 30px Inter'].map(f =>
    document.fonts.load(f),
  ),
);

export default makeProject({
  scenes: [scene1, scene2, scene3],
});

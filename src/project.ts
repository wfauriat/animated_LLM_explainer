import {makeProject} from '@motion-canvas/core';
import '@fontsource/inter/400.css';
import '@fontsource/inter/400-italic.css';
import '@fontsource/inter/600.css';

import scene1 from './scenes/scene1?scene';
import scene2 from './scenes/scene2?scene';
import scene3 from './scenes/scene3?scene';
import scene4a from './scenes/scene4a?scene';
import scene4b from './scenes/scene4b?scene';
import scene4c from './scenes/scene4c?scene';
import scene4d from './scenes/scene4d?scene';
import scene5a from './scenes/scene5a?scene';
import scene5b from './scenes/scene5b?scene';
import scene6 from './scenes/scene6?scene';
import scene7a from './scenes/scene7a?scene';
import scene7b from './scenes/scene7b?scene';
import scene8 from './scenes/scene8?scene';
import scene9 from './scenes/scene9?scene';
import scene10 from './scenes/scene10?scene';
import scene11 from './scenes/scene11?scene';
import scene12 from './scenes/scene12?scene';

// Make sure the font is ready before any text gets measured.
await Promise.all(
  ['400 30px Inter', 'italic 400 30px Inter', '600 30px Inter'].map(f =>
    document.fonts.load(f),
  ),
);

export default makeProject({
  scenes: [scene1, scene2, scene3, scene4a, scene4b, scene4c, scene4d, scene5a, scene5b, scene6, scene7a, scene7b, scene8, scene9, scene10, scene11, scene12],
});

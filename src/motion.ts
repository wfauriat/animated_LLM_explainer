// Shared motion language: one way to pop, one way for text to arrive.
import {Node} from '@motion-canvas/2d';
import {all, easeOutCubic, map} from '@motion-canvas/core';

// A pop that settles with a hint of overshoot. The stock easeOutBack bounces
// too much for the film's tone.
export function easeOutBack(value: number, from = 0, to = 1) {
  const overshoot = 0.9;
  const t = value - 1;
  return map(from, to, 1 + (overshoot + 1) * t * t * t + overshoot * t * t);
}

// Text arrives: it fades in while settling up into place.
export function* rise(node: Node, duration = 0.6, distance = 16) {
  const y = node.y();
  node.y(y + distance);
  yield* all(node.opacity(1, duration * 0.8), node.y(y, duration, easeOutCubic));
}

// A box arrives: it fades in while settling to full size.
export function* settle(node: Node, duration = 0.6) {
  node.scale(0.94);
  yield* all(node.opacity(1, duration * 0.8), node.scale(1, duration, easeOutBack));
}

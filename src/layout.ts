// Frame-level placements shared across scenes (frame is 1920x1080, origin at center).
import {Node} from '@motion-canvas/2d';
import {Vector2} from '@motion-canvas/core';
import {COVER_Y, SERVER_H} from './components/Server';

// Where `node` sits in the coordinates of `space` (e.g. a layer of flying
// chips). absolutePosition() alone is in canvas pixels, origin top-left.
export function positionIn(node: Node, space: Node) {
  return node.absolutePosition().transformAsPoint(space.worldToLocal());
}

// Scene 1's opening shot: tight on the chat screen (also Scene 7).
export const CHAT_ZOOM = 1.08;

// The room (monitor + desk + character) as seen at the end of Scene 1 ...
export const ROOM_FULL = {position: new Vector2(0, -60), scale: 0.42};
// ... and once it has shrunk into the bottom-left panel of the split screen.
export const ROOM_PANEL = {position: new Vector2(-540, -130), scale: 0.36};

// Slanted divider of the split screen: x at the top and bottom edges.
// The left panel is wider at the bottom, the right one wider at the top.
export const DIVIDER_TOP_X = -300;
export const DIVIDER_BOTTOM_X = 420;
export function dividerX(y: number) {
  return DIVIDER_TOP_X + ((DIVIDER_BOTTOM_X - DIVIDER_TOP_X) * (y + 540)) / 1080;
}

// Server inside the right panel ("network" coordinates == frame coordinates
// until Scene 3 zooms in).
export const SERVER_POS = new Vector2(520, -170);
export const SERVER_SCALE = 0.72;
export function toNetwork(serverLocal: Vector2) {
  return SERVER_POS.add(serverLocal.scale(SERVER_SCALE));
}

// Where the room's wall socket ends up on screen once in the panel; the
// user's wire continues from the divider at that height.
export const SOCKET_Y = 30;

// Scene 3 close-up: where the server sits on screen once zoomed in.
export const SERVER_CLOSE = {position: new Vector2(-240, -90), scale: 1.05};
export const NETWORK_ZOOM = SERVER_CLOSE.scale / SERVER_SCALE;
export const NETWORK_ZOOM_POS = SERVER_CLOSE.position.sub(
  SERVER_POS.scale(NETWORK_ZOOM),
);

// Where Scene 3 lays the removed cover, in server-local units (screen x = 580,
// clear of the user screens on the server's right).
export const COVER_ASIDE = new Vector2(
  (580 - SERVER_CLOSE.position.x) / SERVER_CLOSE.scale,
  COVER_Y,
);
export const COVER_ASIDE_SCALE = 1 / SERVER_CLOSE.scale;

// Battery below the zoomed-in server (close-up screen coordinates).
export const SERVER_BOTTOM = SERVER_CLOSE.position.addY((SERVER_H / 2) * SERVER_CLOSE.scale);
export const BATTERY_AT = new Vector2(SERVER_CLOSE.position.x, 432);

// Dive into the open cabinet (end of Scene 3, reversed in Scene 5): the cavity
// is blown up until it fills the frame.
export const CAVITY_CENTER = SERVER_CLOSE.position.addY(COVER_Y * SERVER_CLOSE.scale);
export const DIVE_ZOOM = 6;

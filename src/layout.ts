// Frame-level placements shared across scenes (frame is 1920x1080, origin at center).
import {Vector2} from '@motion-canvas/core';

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

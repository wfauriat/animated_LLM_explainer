# Session log — 2026-10-25

Animated LLM explainer, built with Motion Canvas. This covers setting up the tools and the first drafts of Scenes 1–3.

---

## 1. Kickoff

**Request:** read `project_intent.md` and `scene_timeline_v0.md`, set up the tools, discuss the storyboard, then start making the animation. Ask for a go before writing a lot of code for a scene.

**My comments on the storyboard:**
- The story arc works: a familiar chat, then a server with a human face, then we open the box and show the face is fake.
- Suggestions for Scene 1:
  - stream the bot's replies word by word
  - a "…" typing indicator before each reply
  - the chat shrinks into the Scene 2 screen, for continuity
  - shorten the letter with placeholder lines

**Questions I asked:** visual style, voice-over, format, framing of the chat window, and whether to stream replies word by word.

## 2. Tool setup

- Set up the project by hand, because `npm init @motion-canvas` is interactive.
  - `@motion-canvas/{core,2d,ui,vite-plugin,ffmpeg}` 3.17.2
  - TypeScript 5
  - **Vite 5**: the plugin requires Vite 4.x or 5.x.
- **Problem:** `motionCanvas is not a function` when Vite started.
  - **Cause:** with `"type": "module"`, the default import of the CommonJS plugin doesn't unwrap.
  - **Fix:** removed `"type": "module"` from `package.json`, matching the official template.
- The dev server runs at `npm start` → http://localhost:9000.
- `npm audit` reports 6 issues. They're only in the local dev-server tools, so they don't matter here.

## 3. User decisions (round 1)

- Install Puppeteer, so I can render frames and look at them myself.
- Start with simple shapes; draft basic SVGs if useful.
- There will be a voice-over, but the plan is still rough. Build progressively.
- **Put the chat app inside a computer frame, then zoom out of it to lead into Scene 2.**
- **No word-by-word streaming for now.** The user will describe the one-word-at-a-time mechanics in a later scene.

## 4. Headless preview and render tools

- Installed Puppeteer, which downloads a headless Chrome.
- **Problem:** Chrome crashed with "No usable sandbox!"
  - **Cause:** Ubuntu's AppArmor blocks Chrome's sandbox.
  - **Fix:** run with `--no-sandbox`. This is safe here because the browser only loads our own localhost page.
- `tools/capture.html` and `tools/capture.ts` are a page served by Vite that loads the project and exposes `renderAt(t)`, `duration()` and `renderVideo()`.
- **Problem:** the project duration read as 0.
  - **Fix:** call `playback.recalculate()` after the first frame.
- `tools/snap.mjs` saves PNG frames plus a labelled contact sheet (built with ffmpeg) to `output/snaps/`. With `--video` it renders the full MP4 to `output/project.mp4`.
- Added the scripts `npm run snap` and `npm run video`.
- Bundled the **Inter** font with `@fontsource/inter`. `project.ts` waits for it to load before any text is measured.

## 5. Scene 1: chat on a computer screen

- Dark-theme chat app inside a monitor, framed tightly at the start. User bubbles are light blue, assistant bubbles light green.
- What happens:
  1. Fade in.
  2. The user's message is typed into the input field, then sent.
  3. A "…" typing indicator.
  4. The bot's bubble pops in.
  5. The same again for the letter request; the letter shows placeholder lines for its body.
  6. Zoom out to the monitor on a desk in a dark room.
- **Liberties I took, which the user approved for v1:**
  - typing in the input field
  - typing indicator
  - smiley-face assistant avatar, which foreshadows the server's face
  - small wording fixes ("conversational agent", "about the noise level", "Regards,")
- **Problem:** `\n` inside a wrapped `Txt` is ignored, and `textWrap: 'pre'` turns wrapping off.
  - **Fix:** use two `Txt` children inside one bubble.
- Voice-over markers you can drag in the editor: `user-1`, `bot-1`, `user-2`, `bot-2`, `zoom-out`.
- Length: about 25 s.

## 6. User decision (round 2)

- "Good start; the liberties are fine for v1. Keep going on Scenes 2 and 3."

## 7. Scenes 2 and 3

Code is split into shared pieces so that each scene starts on exactly the previous scene's last frame:

| File | Role |
|---|---|
| `src/theme.ts` | Palette: blue = user/questions, green = assistant/answers, amber = energy |
| `src/layout.ts` | Room framing, slanted divider, server position, Scene 3 close-up |
| `src/components/Conversation.tsx` | Scene 1 conversation, also shown pre-filled in later scenes |
| `src/components/Flow.tsx` | Glowing dots that move along curves, driven by a per-scene clock |
| `src/components/UserRoom.tsx` | Desk, monitor, chat, character from behind, wall socket, cable |
| `src/components/Server.tsx` | Cabinet, 14×12 LED face, screws, cover with a circuit-board back, inner modules |
| `src/components/Network.tsx` | Right panel: background, other users' screens, wires, server |
| `src/components/Battery.tsx` | Upright battery with power cable and energy flow |

**Scene 2, about 22 s**
1. Starts on Scene 1's last frame.
2. The character fades in and types (elbows twitch); the screen dims.
3. A wall socket appears and the cable draws to it. Blue dots flow out, green dots flow back.
4. The **slanted split**: the room shrinks into the lower-left panel and the server panel slides in from the right.
5. The server's LED face lights up column by column, then idles (blinks and "talks").
6. The user's wire continues across the divider to the server. Then 9 other users' screens appear, each wired to it.
7. Markers: `character`, `cable`, `split`, `server`, `user-wire`, `many-users`.

**Scene 3, about 21 s**
1. The character fades out.
2. The server panel wipes over the room and the camera zooms in on the server.
3. 4 screws unscrew and fall away.
4. The cover lifts, its LEDs flicker and die, and it slides aside while flipping over. The back shows LEDs, colourful wires and a connector.
5. The inside is revealed: 6 unlabelled modules with data rising from blue to green. **This is a placeholder for Scene 4.**
6. A battery rises at the bottom, with amber energy flowing into the server.
7. Markers: `user-leaves`, `zoom-in`, `unscrew`, `cover-off`, `battery`.

**Fixes after checking frames:**
- Garbled code in the face initialisation.
- Device icons scaled around the frame origin instead of their own centre.
- The removed cover hid user screens, so it moved to screen x = 580.
- The battery touched the bottom edge, so it moved to y = 432.
- Checked by comparing frames that blue dots move toward the server and green dots move away.

## 8. Final render

- **Problem:** the first full render failed after about 30 s of video. Puppeteer gives up on a single browser call after 3 minutes, and the failure was hidden because the output was piped through `grep`.
  - **Fix:** `protocolTimeout: 0` in `tools/snap.mjs`, and a re-render.
- **Output:** `output/project.mp4`, 68 s, 1920×1080, 60 fps. Checked by pulling a frame from the file.

---

## Current state

- **Commands**
  - `npm start`: open the editor
  - `npm run snap [-- t1 t2 …]`: save still frames and a contact sheet
  - `npm run video`: render the full MP4, about 5 min
- **Scene list:** `src/project.ts` lists `scene1`, `scene2` and `scene3`.
- **Default fps:** 60 (Motion Canvas default). It can be changed to 30.

## Open items and questions for the next round

- **Split screen:** slanted divider (current), or separate rectangular panels?
- **Battery timing:** it currently appears last in Scene 3. The storyboard suggests it's there throughout, so it could appear right after the zoom.
- **Other users' screens around the server:** keep or remove?
- **Character:** a basic silhouette for now; it could be refined, or replaced with an SVG you provide.
- **Pacing:** overall pacing, and how much the bubbles bounce when they pop in.
- **Scene cuts:** the flowing dots jump slightly at each cut, because each scene restarts its own clock.
- **Scene 4:** waiting for your visual. The inside of the server (stacked modules, blue in and green out) is ready to be zoomed into.

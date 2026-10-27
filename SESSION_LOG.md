# Session log — 2026-10-25 / 2026-10-26

Animated LLM explainer, built with Motion Canvas.
- **Day 1** (sections 1–8): setting up the tools and the first drafts of Scenes 1–3.
- **Day 2** (sections 9–16): Scenes 4 to 6.

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

# Day 2 — 2026-10-26

## 9. Scene 4 brief and decisions

The user committed Scenes 1–3 and added Scene 4 directions to `scene_timeline_v0.md`, with a layout sketch (`scratch/scene4_lay1.svg`) and a cog and a crank drawn in Python (`scratch/wheel.py`, `scratch/handle.py`). I rendered the SVG with Inkscape to read it.

User decisions:
- **Colours:** adapt the SVG's colours to the dark theme. Input tokens are blue (the user's colour), the generated token is green (the assistant's colour), indices are cyan, the dictionary is amber and embedding/un-embedding are lavender.
- **Camera:** no zoom in and out for the core. Each stage is presented centred, then folds to the left.
- **Depth:** 4 dimensions in depth, plus "⋰".
- **Rows:** 4 core rows (It, was, ⋮, took, a); 10 would be too crowded.
- **Dictionary:** no special tokens (`<sep>`, `<cls>`).
- **Attention hint:** yes, as cogs meshing vertically between rows.
- **Picking "coat" (21%) over "hat" (32%):** deliberate. Show it as **Generative** sampling, with a roulette, and put the word "Generative" on screen.
- **Labels:** keep them for each stage.
- **Structure:** sub-scenes, in order.

## 10. Scene 4: the machine, in 5 sub-scenes

| Sub-scene | Content | Voice-over markers |
|---|---|---|
| 4a Tokenization (about 25 s) | The sentence bubble splits into token chips ("rain\|ing", "out\|side") plus a dashed "?" slot. The dictionary's list scrolls to each token's reading band and its index flies out. The stage then folds to the left, and the dictionary becomes a thin spine. | `split`, `column`, `lookup`, `fold` |
| 4b Embedding (about 17 s) | Close-up: 6290 ("rain") goes into the Embedding block and comes out as 4 dials stacked in depth, which spin to their directions. The block folds into a spine. The 4 rows get dial stacks at the core entrance. | `embedding`, `close-up`, `fold`, `rows` |
| 4c Transformer layers (about 19 s) | 4 depth planes; columns of cogs that mesh with the dials above and below them, so each layer is one gear train linking all rows. The isometric crank (port of `handle.py`, re-projected every frame) turns once per layer: 3 layers, a fast-forward through "⋯", then layer N. | `core`, `crank`, `layer-1`, `layer-2`, `layer-3`, `more-layers`, `layer-n` |
| 4d Output (about 20 s) | The last row becomes the Top-5 (indices with % and bars), then Un-embedding turns them into words. A "Generative" roulette lands on "coat". The N+1 arrow carries "coat" into the "?" slot. | `last-row`, `top5`, `unembed`, `generative`, `spin`, `pick`, `n+1` |
| 4e Power (about 9 s) | The crank drops. The Scene 3 battery plugs into the master gear, and the machine runs on its own while the battery drains. | `drop-crank`, `battery`, `powered` |

**Changes to Scene 3:**
- The placeholder modules inside the server are replaced by meshed cogs turning.
- A new `dive` marker zooms into the cavity, so Scene 4 starts on the same dark colour.

**New code:**
- `src/components/Cog.tsx`: port of `wheel.py`.
- `src/scene4/`:
  - `layout.ts`: data and positions
  - `parts.tsx`: chips, labels, dictionary, folded input
  - `Compass.tsx`: dials
  - `Crank.tsx`
  - `Core.tsx`
  - `Output.tsx`: Top-5, un-embedding, roulette, N+1
  - `Machine.tsx`: rebuilds the machine at the state each sub-scene starts from

**Readability fixes after checking frames:**
- **Stage labels:** "Tokenization Embedding" read as one phrase, so Embedding became a vertical label on its spine.
- **Dials:**
  - The back dials were translucent, so they're now darkened with a brightness filter instead.
  - The arrows were lengthened.
  - The "⋰" dots no longer hide behind the back dial.
- **Core** (it was too cluttered at first):
  - bigger dials and smaller, darker cogs;
  - cogs on the back planes fade progressively;
  - the planes moved clear of the Embedding spine;
  - the "⋯" moved to the bottom row, and the rows' "⋮" fades as the rows enter the core.
- **Output:** the winning slice is brought to the front so its highlight shows, and the battery moved up off the bottom edge.

## 11. Scenes 5 and 6: brief and decisions

User decisions:
1. **Scene 5 bubble:** blue prompt tokens plus green generated tokens, in one bubble.
2. **Tokenization:** "umbrella" becomes "umb|rella".
3. **Request vs response:** the response trip only.
4. **Final screen:** the user's prompt, then the assistant's completion.
5. **Wording:** "He put money in the bank" (past tense).
6. **The cue for "bank":** it attends mostly to "river".
7. **Scene 6 layout:** one machine. The first sentence is run and attention is explained fully. Then the same machine runs a **side input** to the left of the input, with a **side output** to the right of the output.
8. **Scene 6 layers:** keep it light (1 layer for the rule, 2 for the comparison).

## 12. Scene 5: generation and response

| Sub-scene | Content | Voice-over markers |
|---|---|---|
| 5a Generation (about 17 s) | The Scene 4 machine shrinks to the bottom. A bubble at the top grows token by token: "coat and an umb rella and walked to school at a rapid pace . `<end>`". Each token is one pass of the machine (the columns glow, the cogs advance) and the chip flies up into the bubble. At `<end>` the machine goes to standby (pulsing amber light, low energy flow), and the bubble folds into a green envelope. | `shrink`, `sentence`, `generate`, `standby`, `envelope` |
| 5b Response (about 15 s) | Scene 3's dive in reverse: out of the cabinet, back to the Scene 2 split screen. The envelope rides the user's wire, comes out of the wall socket and follows the cable into the computer. The typing indicator gives way to the completion bubble, and the camera ends on Scene 1's exact opening framing of the screen. | `zoom-out`, `split`, `deliver`, `reply`, `zoom-screen` |

**Refactors:**
- `makeTyping()` in `ChatApp.tsx` (typing indicator plus a background pulse).
- `createRoom()` takes a custom conversation.
- `makeChip()` takes a text colour.
- Scene 3's dive, cover and battery constants moved to `src/layout.ts`.
- The Scene 4 battery position became `POWER_BATTERY`.
- Shared content is in `src/scene5/parts.tsx`.

## 13. Scene 6: attention (one scene, about 49 s)

- **Mechanism:** the input tokens only, an Embedding spine, front dials only (plus "⋰"), and 2 layer columns of cogs. When a row is processed, **magenta links arch back from the earlier words** into its dial. Their thickness, brightness and flow dots show the weight. The dial's arrow is then nudged. Links never point forward.
- **Phase 1:** "He sat on the river bank".
  1. Rows 1 to 5 are processed one by one in layer 1, building the triangle; for "bank", the "river" link is the thickest.
  2. The whole triangle flashes at once ("in reality all at the same time").
  3. Layer 2 runs all rows at once.
  4. N+1 "to", then N+2 "fish".
- **Phase 2:** the side input "He put money in the bank" appears on the left and the first sentence dims.
  1. The rows go back to the entrance with the new dials. "bank" starts identical (same token) and gets a pulse.
  2. Layer 1: the other rows at once, then "bank" in detail, with "money" the thickest link.
  3. Layer 2 runs.
  4. The side output on the right shows "each", then "month".
- **Ending:** copies of the two final "bank" dials, captioned "bank (river)" and "bank (money)", sit side by side above the outputs, pointing in different directions.
- **Markers:** `sentence`, `layer-1`, `look-back`, `all-at-once`, `layer-2`, `predict-1`, `side-input`, `layer-1b`, `layer-2b`, `predict-2`, `compare`.
- **Fixes after checking frames:**
  - The whole stage is enlarged 1.12× to fill the frame.
  - The output columns are wider apart, so the captions no longer overlap.
  - The second prediction arrow dips under the first column.
  - The flow dots are weighted like their links.

## 14. Tools

- **Problem:** a full render failed with "Execution context was destroyed". Source edits during the render made Vite's file watcher reload the page.
  - **Fix:** the render server in `tools/snap.mjs` no longer watches files (`server.watch.ignored: ['**/*']`), so editing while rendering is now safe.
- `output/project.mp4` on disk is a **broken partial** (120 s) from that failed render. It needs a re-render (see the end of this log).

## 15. Current state

- **Scenes** (in `src/project.ts`): `scene1`, `scene2`, `scene3`, `scene4a`–`scene4e`, `scene5a`, `scene5b`, `scene6`.
- **Total length:** about 251 s (4 min 11 s).
- **Default fps:** 60 (Motion Canvas default). It can be changed to 30.
- **Commands:**
  - `npm start`: open the editor
  - `npm run snap [-- t1 t2 …]`: save still frames and a contact sheet
  - `npm run video`: render the full MP4
- **Verification:** every scene was checked with stills and contact sheets. The full video has not been rendered since Scene 4c (the user will render it).

## 16. Open items and questions for the next round

Carried over from day 1:
- Slanted divider vs separate panels.
- When the battery appears in Scene 3.
- Keep the other users' screens or not.
- Refine the character.
- Overall pacing and how bouncy the pop-ins are.
- Small jumps in the flowing dots at scene cuts.

New:
- **Scene 4:**
  - The arrow nudges are made up.
  - The dial rims' teeth only roughly mesh with the cogs.
  - The 3 other rows stay visible in layer N while "a" exits.
  - The roulette briefly covers the machine.
- **Scene 5:**
  - Is the prompt-plus-completion exchange on the final screen clear enough?
  - Scene 5b cuts from Scene 1's screen framing straight to Scene 6's dark machine. A fade could be added.
- **Scene 6:**
  - The weights and nudges are illustrative.
  - Only front dials are shown (one dimension plus "⋰"), to keep it light.
  - The side input is placed left of the main input, as requested, so it reads right to left.

---

# Day 3 — 2026-10-27

## 17. Scene 4e merged into Scene 5a

- **User decision:** Scene 4e was a full sequence where little happens. Autoregressive generation, with power pumping in and cogs turning, makes the same point.
- **Change:**
  - `scene4e` is deleted, and Scene 4d cuts straight to Scene 5a.
  - Scene 5a opens on Scene 4d's last frame. The crank drops, the N+1 arrow fades, and the battery rises and plugs into the master gear (about 2.5 s, new marker `power`). Then the existing `shrink` and generation follow.
  - Each token pass also sends a surge of energy through the battery cable and advances the rows' dials.
  - The `Stage` in `Machine.tsx` is renamed from `'4e'` to `'5a'`.
- **The battery never drains:** it represents the power supply (in practice the grid), not a charge that runs down.
- **Tools:** `npm run snap` now prints each scene's start time and length.
- **Total length:** 241.9 s (4 min 2 s).

## 18. Scene 7: brief and decisions

The user added Scene 7 to the timeline: emerging "as if" reasoning, long-range attention in the context window, the term "good next-token guesser", and a Cluedo-style riddle in the chat.

User decisions:
- **Riddle:** my rewrite, in which the clues rule out every suspect but one (the Colonel claims he walked in the rain, yet his shoes are dry). Cluedo names kept.
- **Reply:** only the guess, "The murderer is most likely Colonel Mustard.", with no reason given.
- **Kept simple:** one burst of attention links, not a two-step "clues combine" version. The example is an illustration, not an exact model.
- **No Scene 7c:** the closing message goes at the bottom of Scene 7b instead.

## 19. Scene 7: the riddle and long-range attention

| Sub-scene | Content | Voice-over markers |
|---|---|---|
| 7a Riddle (about 16.5 s) | Scene 1's screen framing with a fresh conversation, fading in from black. The riddle is pasted in one go (the input field shows a preview cut short). "Who is the murderer?" is typed as its own message. The typing indicator shows, then the reply. | `riddle`, `question`, `reply` |
| 7b Context window (about 27 s) | The chat fades and the whole conversation becomes a ribbon of token chips inside a "Context window" frame. A cog (the machine) below it produces "The murderer is most likely" token by token. For "Colonel", faint magenta links reach back to every token, then the clue tokens' links thicken and glow ("dry" strongest, then rain, shoes, garden, Colonel, murderer, together, kitchen, maid, dead). A Top-5 appears, headed "A good next-token guesser": Colonel 68%, Professor, Mrs, Miss, maid. "Colonel" is picked, then "Mustard" and "." follow. The caption: "Guessing correctly means looking at context, clues and facts… *as if reasoning*", and below it "(and answering properly implies correct grammar, syntax, …)". | `context`, `generate`, `look-back`, `guess`, `pick`, `as-if` |

**New and changed code:**
- `src/scene7/parts.tsx`: riddle text, a simple tokenizer (words and punctuation), and the finished exchange.
- `userPastes()` in `ChatApp.tsx`.
- `CHAT_ZOOM` moved to `src/layout.ts`.

**Bug fix: `positionIn(node, space)` in `src/layout.ts`.**
- **Problem:** `absolutePosition()` is in canvas pixels (origin at the top-left), not centred scene coordinates.
- **Effect:** Scene 7b's links fanned in from off-screen. The same bug was also in Scene 5a, where the flying tokens started beside the machine instead of at the picked word, and flew toward the wrong spot.
- **Fix:** both scenes now use `positionIn()`.

**Length:** 285.4 s (4 min 45 s).

---

## How to render the full video

Close any `npm start` editor tab first (not required, but it frees the CPU). Then, from the project folder:

```bash
npm run video
```

This writes `output/project.mp4` (1920×1080, 60 fps, about 4 min 11 s). At the current length it takes roughly 15–20 minutes.

Alternatively, run `npm start`, open http://localhost:9000, go to Video Settings → Rendering, choose **Video (FFmpeg)** as the exporter, and click **Render**.

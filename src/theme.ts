// Shared palette and typography for every scene.
export const colors = {
  room: '#121318',
  desk: '#1b1c22',
  deskEdge: '#26282f',
  keyboard: '#24262d',

  bezel: '#2a2d35',
  bezelEdge: '#3a3e48',
  stand: '#1f2128',
  screenGlow: '#5b8cff40',

  titleBar: '#15171c',
  appHeader: '#1a1c22',
  appBg: '#20232b',
  inputField: '#2a2e38',
  sendButton: '#4a8df0',

  userBubble: '#cfe5ff',
  botBubble: '#d3f2cf',
  bubbleText: '#16202b',
  typingDot: '#5e8a5c',

  textLight: '#e6e8ee',
  textMuted: '#868c98',
  online: '#5fd47a',
  botAvatar: '#7fdc8e',

  // Character seen from behind, lit by the screen
  silhouette: '#0c0d11',
  rimLight: '#34466b',
  chair: '#18191f',
  chairEdge: '#2a2d36',
  socket: '#4b4f5a',
  cable: '#454a57',

  // Information flows: same hues as the chat bubbles
  flowIn: '#7fb8ff', // user -> server (questions)
  flowOut: '#7fe08f', // server -> user (answers)
  energy: '#f2c14e',

  // Server panel
  serverBg: '#0d1220',
  divider: '#3a4866',
  wire: '#2f3646',
  userWire: '#4a5a78',
  deviceScreen: '#22324f',
  cabinet: '#2a2e37',
  cabinetEdge: '#3e4452',
  cover: '#15181f',
  coverEdge: '#3a404d',
  cavity: '#0b0e14', // same as machineBg: Scene 3 dives into it
  ledOn: '#8dffa6',
  ledRaw: '#ffb454', // Scene 12: the model before fine-tuning
  ledOff: '#1a2e21',
  halo: '#3ddc6a',
  screw: '#a3a9b5',
  screwEdge: '#5c6370',
  pcb: '#1d4a33',
  pcbEdge: '#2e6b4b',
  battery: '#d6dbe4',

  // Scene 4: inside the machine
  machineBg: '#0b0e14',
  token: '#cfe5ff', // input tokens = user's bubble color
  tokenText: '#16202b',
  index: '#8fd8e8',
  dictionary: '#e9d9a6',
  dictionaryText: '#2a2416',
  embedding: '#c4b0f0',
  steel: '#8a94a6',
  steelDark: '#2b3240',
  dialFace: '#eef1f6',
  label: '#9aa3b2',
  attention: '#e58cf2', // Scene 6: links from earlier words
  error: '#ff6b6b', // wrong predictions, correction signals
  good: '#5fd47a', // right predictions

  cog: '#5a6476', // the cogs of the machine, darker than the dials
  panel: '#0f1218', // terminals, tiles and other insets on the machine background
  takeawayBg: '#1a1608', // inside of the amber takeaway boxes
  backdropGlow: '#121723', // center of the backdrop, fading out to machineBg
};

// The three dots of a window's title bar.
export const windowDots = ['#ff5f57', '#febc2e', '#28c840'];

export const font = 'Inter';

// One type scale for the whole film (px on the 1920x1080 frame). Nothing meant
// to be read goes below `small`; code and tensors may, as they read as texture.
export const type = {
  display: {fontSize: 72, fontWeight: 700}, // chapter cards
  title: {fontSize: 44, fontWeight: 700}, // the title of a scene
  heading: {fontSize: 34, fontWeight: 600}, // panels, sections
  caption: {fontSize: 34, fontWeight: 500}, // lines under the action
  body: {fontSize: 30, fontWeight: 400},
  label: {fontSize: 26, fontWeight: 600}, // stages, axes, annotations
  small: {fontSize: 22, fontWeight: 500},
};

// Title-safe area: nothing that must be read sits outside it (5% of the frame).
export const safe = {x: 864, y: 486};

// Where the recurring text elements sit.
export const TITLE_Y = -456;
export const CAPTION_Y = [404, 456];
export const TAKEAWAY_Y = 424;

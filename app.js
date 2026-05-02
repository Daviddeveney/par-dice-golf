import DiceBox from "./vendor/dice-box/dice-box.es.js";
import { createTutorialModule } from "./tutorial.js";

const DEFAULT_TOTAL_HOLES = 18;
const DEFAULT_HOLE_PAR = 3;
const COURSE_PAR_BLOCK = [3, 3, 3, 3, 4, 4, 4, 5, 5];
const MAX_ROLLS = 3;
const PAR_FIVE_EXTRA_ROLLS = 1;
const ROOM_CODE_LENGTH = 5;
const ROOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DICE_BOX_ASSET_PATH = "/vendor/dice-box/assets/";
const ENABLE_DICE_BOX_ROLLS = false;
const PERSISTED_STATE_VERSION = 3;
const LOCAL_STORAGE_STATE_KEY = "par-game-state-v3";
const LOCAL_STORAGE_CLIENT_KEY = "par-client-session-id";
const ROLL_ANIMATION_TOTAL_MS = 1120;
const ROLL_STAGGER_MAX_MS = 180;
const ROLL_FACE_FRAME_MS = 74;
const SETTLE_ANIMATION_MS = 430;
const MAX_CHAT_MESSAGES = 80;
const MAX_CHAT_MESSAGE_LENGTH = 240;
const DEFAULT_AVATAR_PATHS = Array.from(
  { length: 8 },
  (_, index) => `/assets/avatars/golfer-${index + 1}.png`,
);
const DICE_SPRITE_PATHS = {
  1: "/assets/dice/par-die-1.png",
  2: "/assets/dice/par-die-2.png",
  3: "/assets/dice/par-die-3.png",
  4: "/assets/dice/par-die-4.png",
  5: "/assets/dice/par-die-5.png",
  6: "/assets/dice/par-die-6.png",
};
const CHAT_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});
const DICE_BOX_ROLL_TREATMENTS = {
  3: {
    layerScale: 1,
    lift: "0%",
    brightness: 1.03,
    boxScale: 4.85,
    throwForce: 3.45,
    spinForce: 4.7,
    gravity: 1.22,
  },
  4: {
    layerScale: 1,
    lift: "0%",
    brightness: 1.025,
    boxScale: 4.65,
    throwForce: 3.35,
    spinForce: 4.55,
    gravity: 1.22,
  },
  5: {
    layerScale: 1,
    lift: "0%",
    brightness: 1.02,
    boxScale: 4.45,
    throwForce: 3.2,
    spinForce: 4.35,
    gravity: 1.22,
  },
};

function canUseDiceBoxRolls() {
  if (!ENABLE_DICE_BOX_ROLLS) {
    return false;
  }

  if (typeof window === "undefined") {
    return false;
  }

  if (typeof window.WebGLRenderingContext === "undefined") {
    return false;
  }

  if (typeof state !== "undefined" && state.network?.mode !== "local") {
    return false;
  }

  return true;
}

const PIP_PATTERNS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const DIE_FACE_LAYOUT = [
  { position: "front", value: 1 },
  { position: "back", value: 6 },
  { position: "right", value: 2 },
  { position: "left", value: 5 },
  { position: "top", value: 3 },
  { position: "bottom", value: 4 },
];

const DIE_FACE_ROTATIONS = {
  1: { x: 0, y: 0, z: 0 },
  2: { x: 0, y: -90, z: 0 },
  3: { x: -90, y: 0, z: 0 },
  4: { x: 90, y: 0, z: 0 },
  5: { x: 0, y: 90, z: 0 },
  6: { x: 0, y: 180, z: 0 },
};

function generateClientSessionId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `par-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const INITIAL_CLIENT_SESSION_ID = generateClientSessionId();
let clientSessionSeed = INITIAL_CLIENT_SESSION_ID;

const state = {
  totalHoles: DEFAULT_TOTAL_HOLES,
  maxPlayers: 2,
  currentHole: 1,
  activePlayerIndex: 0,
  players: createLocalPlayers(1),
  dice: [],
  holds: [],
  rollNumber: 0,
  bonusRolls: 0,
  rollToken: 0,
  isRolling: false,
  isSettling: false,
  isDiceBoxRoll: false,
  isFinalizingRoll: false,
  roundComplete: false,
  scorecard: [],
  network: {
    mode: "local",
    peer: null,
    hostConn: null,
    connections: {},
    roomCode: "",
    gameStarted: false,
    localPeerId: "local-1",
    chatMessages: [],
    clientSessionId: INITIAL_CLIENT_SESSION_ID,
    pendingJoinCode: "",
    inviterName: "",
    pendingShareAction: "",
  },
  ui: {
    invitePanelOpen: false,
    managePanelOpen: false,
    tutorialOpen: false,
    instructionsOpen: false,
    autoJoinInvitePending: false,
    pendingLocalName: null,
    roomScreen: "start",
    resultBannerMessage: "",
    resultBannerTone: "",
  },
};

let rollAnimationTimeout = null;
let rollFaceAnimationInterval = null;
let rollFaceAnimationFrame = 0;
let settleAnimationTimeout = null;
let activeRollStartFaces = [];
let activeRollFrameFaces = [];
let diceBox = null;
let diceBoxInitPromise = null;
let diceBoxRolls = [];
let activeDiceBoxRollToken = 0;

const elements = {
  pageShell: document.querySelector(".page-shell"),
  playNavButton: document.getElementById("play-nav-button"),
  leaderboardButton: document.getElementById("leaderboard-button"),
  brandPhaseChip: document.getElementById("brand-phase-chip"),
  headerPlayerAvatar: document.getElementById("header-player-avatar"),
  headerPlayerName: document.getElementById("header-player-name"),
  headerPlayerMeta: document.getElementById("header-player-meta"),
  liveRoomName: document.getElementById("live-room-name"),
  liveRoomMode: document.getElementById("live-room-mode"),
  liveRoomStatus: document.getElementById("live-room-status"),
  liveRoomCode: document.getElementById("live-room-code"),
  roomSummaryButton: document.getElementById("room-summary-button"),
  clubPlayerCount: document.getElementById("club-player-count"),
  playerSummaryList: document.getElementById("player-summary-list"),
  roomOverlay: document.getElementById("room-overlay"),
  setupOverlay: document.getElementById("setup-overlay"),
  tutorialOverlay: document.getElementById("tutorial-overlay"),
  instructionsOverlay: document.getElementById("instructions-overlay"),
  controlPanel: document.querySelector(".control-panel"),
  roomHub: document.querySelector(".room-hub"),
  rosterPanel: document.querySelector(".roster-panel"),
  diceFocusStack: document.querySelector(".dice-focus-stack"),
  teeSheetPanel: document.querySelector(".tee-sheet-panel"),
  invitePanelButton: document.getElementById("invite-panel-button"),
  managePanelButton: document.getElementById("manage-panel-button"),
  tutorialButton: document.getElementById("tutorial-button"),
  instructionsButton: document.getElementById("instructions-button"),
  startTutorialButton: document.getElementById("start-tutorial-button"),
  roomOverlayTitle: document.getElementById("room-overlay-title"),
  roomHubTitle: document.getElementById("room-hub-title"),
  roomHubNote: document.getElementById("room-hub-note"),
  roomStartPanel: document.getElementById("room-start-panel"),
  roomJoinPanel: document.getElementById("room-join-panel"),
  roomHostPanel: document.getElementById("room-host-panel"),
  roomJoinedPanel: document.getElementById("room-joined-panel"),
  openJoinButton: document.getElementById("open-join-button"),
  backToRoomStartButton: document.getElementById("back-to-room-start-button"),
  roomCodeCard: document.querySelector(".room-code-card"),
  shareBar: document.querySelector(".share-bar"),
  shareLinkCard: document.querySelector(".share-link-card"),
  roundSelector: document.getElementById("round-selector"),
  playerCountSelector: document.getElementById("player-count-selector"),
  createRoomButton: document.getElementById("create-room-button"),
  startRoomGameButton: document.getElementById("start-room-game-button"),
  playerNameStartInput: document.getElementById("player-name-start"),
  playerNameJoinOverlayInput: document.getElementById(
    "player-name-join-overlay",
  ),
  roomCodeDisplay: document.getElementById("room-code-display"),
  joinedRoomCodeDisplay: document.getElementById("joined-room-code-display"),
  copyRoomCodeButton: document.getElementById("copy-room-code-button"),
  joinCodeInput: document.getElementById("join-code"),
  joinRoomButton: document.getElementById("join-room-button"),
  leaveRoomButton: document.getElementById("leave-room-button"),
  leaveRoomJoinedButton: document.getElementById("leave-room-joined-button"),
  networkNote: document.getElementById("network-note"),
  gameLinkDisplay: document.getElementById("game-link-display"),
  copyLinkButton: document.getElementById("copy-link-button"),
  shareLinkButton: document.getElementById("share-link-button"),
  shareNote: document.getElementById("share-note"),
  roomLobbyStatus: document.getElementById("room-lobby-status"),
  joinedRoomNote: document.getElementById("joined-room-note"),
  setupCourseName: document.getElementById("setup-course-name"),
  setupCourseMode: document.getElementById("setup-course-mode"),
  setupCoursePlayers: document.getElementById("setup-course-players"),
  setupCourseNote: document.getElementById("setup-course-note"),
  matchLineup: document.getElementById("match-lineup"),
  matchDetail: document.getElementById("match-detail"),
  matchSeat: document.getElementById("match-seat"),
  matchTurnPill: document.getElementById("match-turn-pill"),
  playerNames: document.getElementById("player-names"),
  diceBoard: document.getElementById("dice-board"),
  diceBoxStage: document.getElementById("dice-box-stage"),
  diceGrid: document.getElementById("dice-grid"),
  scorePreviewHeading: document.getElementById("score-preview-heading"),
  scorePreviewValue: document.getElementById("score-preview-value"),
  scorePreviewLabel: document.getElementById("score-preview-label"),
  holeCounter: document.getElementById("hole-counter"),
  parCounter: document.getElementById("par-counter"),
  diceCountLabel: document.querySelector(
    ".stage-status-bar .stage-stat:nth-of-type(3) .status-label",
  ),
  diceCountCounter: document.getElementById("dice-count-counter"),
  currentPlayerLabel: document.getElementById("current-player-label"),
  rollCounter: document.getElementById("roll-counter"),
  diceOwnerLabel: document.getElementById("dice-owner-label"),
  diceOwnerDetail: document.getElementById("dice-owner-detail"),
  diceHoldHint: document.getElementById("dice-hold-hint"),
  resultBanner: document.getElementById("result-banner"),
  pregameInvitePanel: document.getElementById("pregame-invite-panel"),
  pregameInviteTitle: document.getElementById("pregame-invite-title"),
  pregameInviteNote: document.getElementById("pregame-invite-note"),
  pregameInviteLink: document.getElementById("pregame-invite-link"),
  pregameInviteCode: document.getElementById("pregame-invite-code"),
  pregameInviteButton: document.getElementById("pregame-invite-button"),
  teeSheetHead: document.getElementById("tee-sheet-head"),
  teeSheetBody: document.getElementById("tee-sheet-body"),
  teeSheetFoot: document.getElementById("tee-sheet-foot"),
  scoreTotal: document.getElementById("score-total"),
  rollButton: document.getElementById("roll-button"),
  scoreButton: document.getElementById("score-button"),
  newHoleButton: document.getElementById("new-hole-button"),
  resetRoundButton: document.getElementById("reset-round-button"),
  tutorialStepCard: document.getElementById("tutorial-step-card"),
  tutorialProgressList: document.getElementById("tutorial-progress-list"),
  tutorialStepCounter: document.getElementById("tutorial-step-counter"),
  tutorialProgressFill: document.getElementById("tutorial-progress-fill"),
  tutorialPrevButton: document.getElementById("tutorial-prev-button"),
  tutorialNextButton: document.getElementById("tutorial-next-button"),
  tutorialRestartButton: document.getElementById("tutorial-restart-button"),
  tutorialStatusBadge: document.getElementById("tutorial-status-badge"),
  roomChatPanel: document.getElementById("room-chat-panel"),
  roomChatStatus: document.getElementById("room-chat-status"),
  roomChatLog: document.getElementById("room-chat-log"),
  roomChatForm: document.getElementById("room-chat-form"),
  roomChatInput: document.getElementById("room-chat-input"),
  roomChatSend: document.getElementById("room-chat-send"),
  roomChatOverlayPanel: document.getElementById("room-chat-overlay-panel"),
  roomChatOverlayStatus: document.getElementById("room-chat-overlay-status"),
  roomChatOverlayLog: document.getElementById("room-chat-overlay-log"),
  roomChatOverlayForm: document.getElementById("room-chat-overlay-form"),
  roomChatOverlayInput: document.getElementById("room-chat-overlay-input"),
  roomChatOverlaySend: document.getElementById("room-chat-overlay-send"),
  liveRoundTitle: document.getElementById("live-round-title"),
  liveRoundBadge: document.getElementById("live-round-badge"),
  liveRoundNote: document.getElementById("live-round-note"),
  liveRoundButton: document.getElementById("live-round-button"),
  roundRecapPanel: document.getElementById("round-recap-panel"),
  roundRecapNote: document.getElementById("round-recap-note"),
  roundRecapBadge: document.getElementById("round-recap-badge"),
  roundRecapList: document.getElementById("round-recap-list"),
  roundRecapWinner: document.getElementById("round-recap-winner"),
  roundRecapHighlight: document.getElementById("round-recap-highlight"),
  playAgainButton: document.getElementById("play-again-button"),
  recapSetupButton: document.getElementById("recap-setup-button"),
};

let overlayFocusReturnTarget = null;

const tutorialModule = createTutorialModule({
  root: elements.tutorialOverlay,
  stepCard: elements.tutorialStepCard,
  progressList: elements.tutorialProgressList,
  stepCounter: elements.tutorialStepCounter,
  progressFill: elements.tutorialProgressFill,
  prevButton: elements.tutorialPrevButton,
  nextButton: elements.tutorialNextButton,
  restartButton: elements.tutorialRestartButton,
  statusBadge: elements.tutorialStatusBadge,
  onRequestClose: () => {
    closeOverlay("tutorial");
  },
});

function createLocalPlayers(count, existingNames = []) {
  const players = [];

  for (let index = 0; index < count; index += 1) {
    players.push({
      id: `local-${index + 1}`,
      name: makeUniqueName(
        existingNames[index] || `Player ${index + 1}`,
        players,
      ),
      sessionId: index === 0 ? clientSessionSeed : `local-session-${index + 1}`,
      connected: true,
    });
  }

  return players;
}

function createOpenSeatCard(seatNumber) {
  const card = document.createElement("div");
  card.className = "player-card is-open-seat";
  card.innerHTML = `
    <div class="player-card-head">
      <div class="player-card-identity-stack">
        <span class="player-avatar player-avatar--md player-avatar--seat" aria-hidden="true">
          <span class="player-avatar-monogram">${seatNumber}</span>
        </span>
        <div class="player-card-identity-copy">
          <strong>Open Seat</strong>
          <span>Invite someone with the room code or link.</span>
        </div>
      </div>
      <span class="player-tag">Seat ${seatNumber}</span>
    </div>
    <div class="player-card-meta">
      <span class="player-total-chip">Waiting</span>
    </div>
  `;
  return card;
}

function createScorecard(totalHoles, playerCount) {
  const pars = getCoursePars(totalHoles);

  return Array.from({ length: totalHoles }, (_, index) => ({
    holeNumber: index + 1,
    par: pars[index] ?? DEFAULT_HOLE_PAR,
    scores: Array.from({ length: playerCount }, () => null),
  }));
}

function shuffleList(values) {
  const next = [...values];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

function getCoursePars(totalHoles) {
  const pars = [];

  while (pars.length < totalHoles) {
    pars.push(...shuffleList(COURSE_PAR_BLOCK));
  }

  return pars.slice(0, totalHoles);
}

function sanitizeName(value, fallback = "Player") {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed || fallback;
}

function readLocalStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function writeLocalStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.warn(error);
  }
}

function initializeClientSessionId() {
  const storedClientSessionId = readLocalStorage(LOCAL_STORAGE_CLIENT_KEY);

  if (storedClientSessionId) {
    state.network.clientSessionId = storedClientSessionId;
  } else {
    writeLocalStorage(LOCAL_STORAGE_CLIENT_KEY, state.network.clientSessionId);
  }

  clientSessionSeed = state.network.clientSessionId;

  if (state.players[0]) {
    state.players[0].sessionId = state.network.clientSessionId;
    state.players[0].connected = true;
  }
}

function normalizePlayers(players = state.players) {
  return players.map((player, index) => {
    const isPrimaryLocalPlayer =
      index === 0 &&
      (isLocalMode() ||
        isHostMode() ||
        player.sessionId === state.network.clientSessionId);

    return {
      ...player,
      sessionId:
        player.sessionId ||
        (isPrimaryLocalPlayer
          ? state.network.clientSessionId
          : `remote-seat-${index + 1}`),
      connected: player.connected !== false,
    };
  });
}

function getConnectedPlayerCount() {
  return state.players.filter((player) => player.connected !== false).length;
}

function cleanRoomCode(value) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, ROOM_CODE_LENGTH);
}

function getPeerIdFromCode(code) {
  return `par-${code.toLowerCase()}`;
}

function generateRoomCode() {
  return Array.from({ length: ROOM_CODE_LENGTH }, () => {
    const index = Math.floor(Math.random() * ROOM_CHARS.length);
    return ROOM_CHARS[index];
  }).join("");
}

function supportsOnlineRooms() {
  return typeof window.Peer !== "undefined";
}

function isLocalMode() {
  return state.network.mode === "local";
}

function isHostMode() {
  return state.network.mode === "hosting";
}

function isClientMode() {
  return state.network.mode === "joined";
}

function isConnectingMode() {
  return state.network.mode === "connecting";
}

function hasPostedScores() {
  return state.scorecard.some((hole) =>
    hole.scores.some((score) => score !== null),
  );
}

function hasRoundActivity() {
  return (
    state.rollNumber > 0 ||
    state.isRolling ||
    state.isSettling ||
    state.isFinalizingRoll ||
    state.currentHole > 1 ||
    hasPostedScores()
  );
}

function isRoomLobbyMode() {
  return (isHostMode() || isClientMode()) && !state.network.gameStarted;
}

function isLobbyReadyToStart() {
  return isHostMode() && getConnectedPlayerCount() >= 2;
}

function getLobbyWaitingCount() {
  return Math.max(0, 2 - getConnectedPlayerCount());
}

function getLobbyActionLabel() {
  if (isHostMode()) {
    return isLobbyReadyToStart() ? "Start when ready" : "Waiting for players";
  }

  return "Waiting for host";
}

function getLobbyControlLabel() {
  if (isHostMode()) {
    return isLobbyReadyToStart()
      ? "Start Game in Lobby"
      : "Waiting for Players";
  }

  return "Waiting for Host Start";
}

function getSurfaceMode() {
  if (
    state.network.pendingJoinCode &&
    (isLocalMode() || isConnectingMode())
  ) {
    return "join";
  }

  if (isConnectingMode()) {
    return "connecting";
  }

  if (isClientMode()) {
    return "joined";
  }

  if (isHostMode()) {
    return "host";
  }

  return "local";
}

function getRoomOverlayMode() {
  if (isHostMode()) {
    return "host";
  }

  if (isClientMode()) {
    return "joined";
  }

  if (isConnectingMode()) {
    return state.network.pendingJoinCode ? "join" : "host";
  }

  if (state.network.pendingJoinCode || state.ui.roomScreen === "join") {
    return "join";
  }

  return "start";
}

function getPagePhase() {
  if (state.network.pendingJoinCode) {
    return "join";
  }

  if (getSurfaceMode() === "join") {
    return "join";
  }

  if (isConnectingMode()) {
    return "lobby";
  }

  if (isRoomLobbyMode()) {
    return "lobby";
  }

  if (state.roundComplete) {
    return "complete";
  }

  if (isHostMode() || isClientMode()) {
    return "play";
  }

  if (isLocalMode()) {
    return "play";
  }

  return hasRoundActivity() ? "play" : "lobby";
}

function shouldForceRoomOverlay(phase) {
  return phase === "join" || isRoomLobbyMode();
}

function shouldShowRoomOverlay(phase) {
  return shouldForceRoomOverlay(phase) || state.ui.invitePanelOpen;
}

function shouldShowSetupOverlay(phase) {
  return phase !== "join" && state.ui.managePanelOpen;
}

function shouldShowTutorialOverlay() {
  return state.ui.tutorialOpen;
}

function shouldShowInstructionsOverlay() {
  return state.ui.instructionsOpen;
}

function getCurrentPlayer() {
  return state.players[state.activePlayerIndex];
}

function getCurrentHoleRecord() {
  return state.scorecard[state.currentHole - 1];
}

function getHolePar(hole = getCurrentHoleRecord()) {
  return hole?.par ?? DEFAULT_HOLE_PAR;
}

function getCourseName() {
  return state.totalHoles === 18 ? "Pinehurst Championship" : "Pinehurst Classic";
}

function getDiceCountForPar(par = DEFAULT_HOLE_PAR) {
  return Math.max(3, Math.min(5, Number(par) || DEFAULT_HOLE_PAR));
}

function getCurrentDiceCount() {
  return getDiceCountForPar(getHolePar());
}

function getPlayerTotal(playerIndex) {
  return state.scorecard.reduce(
    (total, hole) => total + (hole.scores[playerIndex] ?? 0),
    0,
  );
}

function getPlayerParTotal(playerIndex) {
  return state.scorecard.reduce((total, hole) => {
    if (hole.scores[playerIndex] == null) {
      return total;
    }

    return total + (Number(hole.par) || DEFAULT_HOLE_PAR);
  }, 0);
}

function getPlayerToPar(playerIndex) {
  return getPlayerTotal(playerIndex) - getPlayerParTotal(playerIndex);
}

function formatToPar(value) {
  if (value === 0) {
    return "E";
  }

  return value > 0 ? `+${value}` : `${value}`;
}

function getPlayerScoreSummary(playerIndex) {
  return `${getPlayerTotal(playerIndex)} (${formatToPar(
    getPlayerToPar(playerIndex),
  )})`;
}

function getOverallLeaderText() {
  return state.players
    .map((player, index) => `${player.name} ${getPlayerScoreSummary(index)}`)
    .join(" · ");
}

function getHeaderTotalText() {
  if (state.players.length === 1) {
    return `Total ${getPlayerScoreSummary(0)}`;
  }

  return state.players
    .map((_, index) => `P${index + 1} ${getPlayerScoreSummary(index)}`)
    .join(" · ");
}

function hashString(value = "") {
  let hash = 0;

  for (const char of String(value)) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0;
  }

  return Math.abs(hash);
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getPlayerLabel(player, preferYou = false) {
  if (preferYou && !isLocalMode() && player.id === state.network.localPeerId) {
    return "You";
  }

  return player.name;
}

function getPlayerInitials(playerOrName) {
  const rawName =
    typeof playerOrName === "string"
      ? playerOrName
      : playerOrName?.name || "Player";
  const parts = sanitizeName(rawName, "Player").split(" ").filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return initials.toUpperCase() || "P";
}

function getPlayerAvatarIndex(playerOrName) {
  const seed =
    typeof playerOrName === "string"
      ? playerOrName
      : playerOrName?.sessionId || playerOrName?.id || playerOrName?.name || "par";

  return hashString(seed) % DEFAULT_AVATAR_PATHS.length;
}

function getPlayerAvatarSrc(playerOrName) {
  return DEFAULT_AVATAR_PATHS[getPlayerAvatarIndex(playerOrName)];
}

function getPlayerAvatarMarkup(playerOrName, size = "md") {
  const name =
    typeof playerOrName === "string" ? playerOrName : playerOrName?.name || "Player";
  const initials = getPlayerInitials(name);
  const src = getPlayerAvatarSrc(playerOrName);

  return `
    <span class="player-avatar player-avatar--${size}" aria-hidden="true">
      <span class="player-avatar-monogram">${escapeHtml(initials)}</span>
      <img src="${escapeHtml(src)}" alt="" loading="eager" onerror="this.style.display='none'" />
    </span>
  `;
}

function getPlayerStandings() {
  return state.players
    .map((player, index) => ({
      player,
      index,
      total: getPlayerTotal(index),
      toPar: getPlayerToPar(index),
      summary: getPlayerScoreSummary(index),
    }))
    .sort((left, right) => {
      if (left.total !== right.total) {
        return left.total - right.total;
      }

      return left.player.name.localeCompare(right.player.name);
    });
}

function getRoundHighlight() {
  let bestResult = null;

  state.scorecard.forEach((hole) => {
    hole.scores.forEach((score, playerIndex) => {
      if (score == null) {
        return;
      }

      if (
        !bestResult ||
        score < bestResult.score ||
        (score === bestResult.score && hole.holeNumber < bestResult.holeNumber)
      ) {
        bestResult = {
          score,
          holeNumber: hole.holeNumber,
          player: state.players[playerIndex],
        };
      }
    });
  });

  if (!bestResult) {
    return "Final totals are in.";
  }

  if (bestResult.score === 1) {
    return `${bestResult.player.name} fired a hole in one on hole ${bestResult.holeNumber}.`;
  }

  if (bestResult.score === 2) {
    return `${bestResult.player.name} posted a birdie-level 2 on hole ${bestResult.holeNumber}.`;
  }

  return `${bestResult.player.name} posted the best hole of the round with ${bestResult.score} on hole ${bestResult.holeNumber}.`;
}

function getPlayerLead(player, preferYou = false) {
  const label = getPlayerLabel(player, preferYou);
  return label === "You" ? "You're" : `${label} is`;
}

function getPlayerPossessive(player, preferYou = false) {
  const label = getPlayerLabel(player, preferYou);
  return label === "You" ? "Your" : `${label}'s`;
}

function getPlayerAction(player, singular, plural, preferYou = false) {
  const label = getPlayerLabel(player, preferYou);
  return `${label} ${label === "You" ? plural : singular}`;
}

function getLocalPlayerRecord() {
  return (
    state.players.find(
      (player) => player.sessionId === state.network.clientSessionId,
    ) || state.players[0]
  );
}

function getChatMessageId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `chat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeChatText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CHAT_MESSAGE_LENGTH);
}

function normalizeChatMessages(messages = []) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .map((message, index) => {
      const text = sanitizeChatText(message?.text);

      if (!text) {
        return null;
      }

      return {
        id: message?.id || `restored-chat-${index + 1}`,
        sessionId: message?.sessionId || "",
        playerId: message?.playerId || "",
        name: sanitizeName(message?.name || "Player"),
        text,
        sentAt: Number(message?.sentAt) || Date.now(),
      };
    })
    .filter(Boolean)
    .slice(-MAX_CHAT_MESSAGES);
}

function formatChatTimestamp(timestamp) {
  try {
    return CHAT_TIME_FORMATTER.format(new Date(timestamp));
  } catch (error) {
    return "";
  }
}

function shouldShowRoomChat() {
  return !isLocalMode() && Boolean(state.network.roomCode);
}

function canSendRoomChat() {
  return shouldShowRoomChat() && !isConnectingMode();
}

function getRoomChatPlaceholder() {
  if (!shouldShowRoomChat()) {
    return "Open a room to use chat.";
  }

  if (isConnectingMode()) {
    return "Connecting to room chat...";
  }

  if (isRoomLobbyMode()) {
    return "Talk while everyone gets ready";
  }

  return "Talk through the round";
}

function getRoomChatStatusText() {
  if (!shouldShowRoomChat()) {
    return "Online room only";
  }

  if (isConnectingMode()) {
    return "Connecting";
  }

  if (!state.network.chatMessages.length) {
    return "No messages yet";
  }

  return `${state.network.chatMessages.length} message${
    state.network.chatMessages.length === 1 ? "" : "s"
  }`;
}

function appendChatMessage({
  sessionId = "",
  playerId = "",
  name = "Player",
  text = "",
  sentAt = Date.now(),
} = {}) {
  const nextText = sanitizeChatText(text);

  if (!nextText) {
    return false;
  }

  state.network.chatMessages = normalizeChatMessages([
    ...state.network.chatMessages,
    {
      id: getChatMessageId(),
      sessionId,
      playerId,
      name,
      text: nextText,
      sentAt,
    },
  ]);

  return true;
}

function clearRoomChatDrafts() {
  if (elements.roomChatInput) {
    elements.roomChatInput.value = "";
  }

  if (elements.roomChatOverlayInput) {
    elements.roomChatOverlayInput.value = "";
  }
}

function makeUniqueName(value, existingPlayers = [], excludeId = null) {
  const baseName = sanitizeName(value, `Player ${existingPlayers.length + 1}`);
  const takenNames = new Set(
    existingPlayers
      .filter((player) => player && player.id !== excludeId)
      .map((player) => player.name.trim().toLowerCase()),
  );

  if (!takenNames.has(baseName.toLowerCase())) {
    return baseName;
  }

  let suffix = 2;
  let candidate = `${baseName} ${suffix}`;

  while (takenNames.has(candidate.toLowerCase())) {
    suffix += 1;
    candidate = `${baseName} ${suffix}`;
  }

  return candidate;
}

function getLocalDisplayName() {
  if (isLocalMode()) {
    return state.players[0]?.name || "Player 1";
  }

  return getLocalPlayerRecord()?.name || "Player 1";
}

function restoreLocalState(message) {
  const localName = getLocalDisplayName();

  if (state.network.hostConn) {
    try {
      state.network.hostConn.close();
    } catch (error) {
      console.warn(error);
    }
  }

  Object.values(state.network.connections).forEach((conn) => {
    try {
      conn.close();
    } catch (error) {
      console.warn(error);
    }
  });

  if (state.network.peer) {
    try {
      state.network.peer.destroy();
    } catch (error) {
      console.warn(error);
    }
  }

  state.network.mode = "local";
  state.network.peer = null;
  state.network.hostConn = null;
  state.network.connections = {};
  state.network.roomCode = "";
  state.network.gameStarted = false;
  state.network.localPeerId = "local-1";
  state.network.chatMessages = [];
  state.network.pendingJoinCode = "";
  state.network.inviterName = "";
  state.network.pendingShareAction = "";
  state.ui.invitePanelOpen = false;
  state.ui.managePanelOpen = false;
  state.ui.tutorialOpen = false;
  state.ui.autoJoinInvitePending = false;
  state.ui.pendingLocalName = null;
  state.ui.roomScreen = "start";
  elements.joinCodeInput.value = "";
  clearRoomChatDrafts();
  state.players = createLocalPlayers(1, [localName]);
  startRound(
    message || "Back to solo play. Open a room when you want company.",
  );
}

function getInviteLink() {
  const inviteUrl = new URL(
    `${window.location.origin}${window.location.pathname}`,
  );

  if (state.network.roomCode) {
    inviteUrl.searchParams.set("join", state.network.roomCode);
  } else {
    inviteUrl.searchParams.set("holes", String(state.totalHoles));
    inviteUrl.searchParams.set("players", String(state.maxPlayers));
  }

  inviteUrl.searchParams.set("from", getLocalDisplayName());
  return inviteUrl.toString();
}

function getMatchLineupText() {
  if (isConnectingMode()) {
    return state.network.pendingJoinCode ? "Joining room" : "Opening room";
  }

  if (!state.players.length) {
    return "Waiting for players";
  }

  if (state.players.length === 1) {
    return isHostMode()
      ? `${getPlayerLabel(state.players[0], true)} hosting`
      : getPlayerLabel(state.players[0], true);
  }

  return state.players.map((player) => getPlayerLabel(player, true)).join(", ");
}

function getMatchSeatText() {
  if (isLocalMode()) {
    return `${state.maxPlayers} seats in the room`;
  }

  return `${getConnectedPlayerCount()}/${state.maxPlayers} players joined`;
}

function getMatchDetailText() {
  if (isConnectingMode()) {
    return state.network.pendingJoinCode
      ? `Connecting to room ${state.network.pendingJoinCode}.`
      : "Opening your room.";
  }

  if (state.roundComplete) {
    return `Round finished. ${getOverallLeaderText()}.`;
  }

  if (isRoomLobbyMode()) {
    if (isHostMode()) {
      return isLobbyReadyToStart()
        ? `${getConnectedPlayerCount()} players are in the lobby. Start whenever everyone is ready.`
        : `Room ${state.network.roomCode} is open. Waiting for more players to join.`;
    }

    const hostName = state.players[0]?.name || "the host";
    return `Waiting for ${hostName} to start the round.`;
  }

  if (isClientMode()) {
    return `Room ${state.network.roomCode} live. Hole ${state.currentHole} of ${state.totalHoles}.`;
  }

  return `Solo table open for hole ${state.currentHole} of ${state.totalHoles}. Open a room whenever you want others to join.`;
}

function getTurnPillText() {
  if (state.roundComplete) {
    return "Round complete";
  }

  if (isRoomLobbyMode()) {
    return getLobbyActionLabel();
  }

  const currentPlayer = getCurrentPlayer();

  if (!currentPlayer) {
    return "Waiting for players";
  }

  return `${getPlayerLabel(currentPlayer, true)} on the dice`;
}

function canUseNativeShare() {
  return typeof navigator.share === "function";
}

function updateShareControls() {
  const link = getInviteLink();
  const label = state.network.roomCode
    ? "Invite link is ready to send."
    : `Setup link keeps this ${state.totalHoles}-hole round ready to open.`;

  elements.gameLinkDisplay.href = link;
  elements.gameLinkDisplay.textContent = link;
  elements.shareLinkButton.disabled =
    !canUseNativeShare() || !Boolean(state.network.roomCode);
  elements.shareLinkButton.textContent = canUseNativeShare()
    ? "Share Link"
    : "Share Unavailable";
  elements.copyLinkButton.disabled = !Boolean(state.network.roomCode);
  elements.copyLinkButton.textContent = "Copy Invite Link";
  elements.shareNote.textContent = label;
}

function getPlayHeaderChipText(phase, surfaceMode) {
  if (phase === "join") {
    return "Join Game";
  }

  if (phase === "complete") {
    return "Round Complete";
  }

  if (phase === "play") {
    return "Live Play";
  }

  if (surfaceMode === "host" || surfaceMode === "joined") {
    return "Room Lobby";
  }

  return "Lobby + Live Play";
}

function renderPageHierarchy() {
  const phase = getPagePhase();
  const surfaceMode = getSurfaceMode();
  const showRoomOverlay = shouldShowRoomOverlay(phase);
  const showSetupOverlay = shouldShowSetupOverlay(phase);
  const showTutorialOverlay = shouldShowTutorialOverlay();
  const showInstructionsOverlay = shouldShowInstructionsOverlay();
  const showUtilityButtons = !shouldForceRoomOverlay(phase);
  const roomOverlayMode = getRoomOverlayMode();
  const showRosterPanel = showRoomOverlay && (isHostMode() || isClientMode());
  const roomOverlayLocked = shouldForceRoomOverlay(phase);

  elements.pageShell.dataset.phase = phase;
  elements.pageShell.dataset.surface = surfaceMode;
  elements.pageShell.dataset.networkMode = state.network.mode;
  elements.pageShell.dataset.roomOverlay = showRoomOverlay ? "open" : "closed";
  elements.pageShell.dataset.setupOverlay = showSetupOverlay
    ? "open"
    : "closed";
  elements.controlPanel.hidden = !showSetupOverlay || isClientMode();
  elements.roomHub.hidden = !showRoomOverlay;
  elements.rosterPanel.hidden = !showRoomOverlay;
  elements.roomOverlay.hidden = !showRoomOverlay;
  elements.roomOverlay.dataset.locked = String(roomOverlayLocked);
  elements.setupOverlay.hidden = !showSetupOverlay || isClientMode();
  elements.tutorialOverlay.hidden = !showTutorialOverlay;
  elements.instructionsOverlay.hidden = !showInstructionsOverlay;
  elements.roomOverlay.setAttribute("aria-hidden", String(!showRoomOverlay));
  elements.setupOverlay.setAttribute("aria-hidden", String(!showSetupOverlay));
  elements.tutorialOverlay.setAttribute(
    "aria-hidden",
    String(!showTutorialOverlay),
  );
  elements.instructionsOverlay.setAttribute(
    "aria-hidden",
    String(!showInstructionsOverlay),
  );
  document.body.classList.toggle(
    "overlay-open",
    showRoomOverlay ||
      showSetupOverlay ||
      showTutorialOverlay ||
      showInstructionsOverlay,
  );
  elements.playNavButton.classList.toggle(
    "is-active",
    !showRoomOverlay && !showSetupOverlay && !showTutorialOverlay && !showInstructionsOverlay,
  );
  elements.invitePanelButton.hidden = !showUtilityButtons;
  elements.managePanelButton.hidden = !showUtilityButtons || isClientMode();
  elements.tutorialButton.hidden = false;
  elements.instructionsButton.hidden = false;
  elements.invitePanelButton.textContent = "Rooms";
  elements.managePanelButton.textContent = "Setup";
  elements.tutorialButton.textContent = "How To Play";
  elements.instructionsButton.textContent = "Rules";
  elements.invitePanelButton.classList.toggle("is-active", showRoomOverlay);
  elements.managePanelButton.classList.toggle("is-active", showSetupOverlay);
  elements.tutorialButton.classList.toggle(
    "is-active",
    showTutorialOverlay || showInstructionsOverlay,
  );
  elements.leaderboardButton.classList.toggle("is-active", phase === "complete");
  elements.instructionsButton.classList.toggle(
    "is-active",
    showInstructionsOverlay,
  );
  elements.invitePanelButton.setAttribute(
    "aria-expanded",
    String(showRoomOverlay),
  );
  elements.managePanelButton.setAttribute(
    "aria-expanded",
    String(showSetupOverlay),
  );
  elements.tutorialButton.setAttribute(
    "aria-expanded",
    String(showTutorialOverlay),
  );
  elements.instructionsButton.setAttribute(
    "aria-expanded",
    String(showInstructionsOverlay),
  );
  elements.rosterPanel.hidden = !showRosterPanel;
  elements.roomStartPanel.hidden = roomOverlayMode !== "start";
  elements.roomJoinPanel.hidden = roomOverlayMode !== "join";
  elements.roomHostPanel.hidden = roomOverlayMode !== "host";
  elements.roomJoinedPanel.hidden = roomOverlayMode !== "joined";
  elements.brandPhaseChip.textContent = getPlayHeaderChipText(
    phase,
    surfaceMode,
  );
}

function rememberOverlayFocusTarget() {
  if (document.activeElement instanceof HTMLElement) {
    overlayFocusReturnTarget = document.activeElement;
    return;
  }

  overlayFocusReturnTarget = null;
}

function blurActiveElementInside(...containers) {
  if (!(document.activeElement instanceof HTMLElement)) {
    return;
  }

  const activeElement = document.activeElement;

  if (containers.some((container) => container?.contains(activeElement))) {
    activeElement.blur();
  }
}

function canFocusElement(element) {
  if (!(element instanceof HTMLElement) || !document.contains(element)) {
    return false;
  }

  if (element.closest("[hidden]") || element.closest('[aria-hidden="true"]')) {
    return false;
  }

  if (
    element.hasAttribute("disabled") ||
    element.getAttribute("aria-disabled") === "true"
  ) {
    return false;
  }

  return true;
}

function focusElementSoon(element) {
  if (!canFocusElement(element)) {
    return;
  }

  window.requestAnimationFrame(() => {
    if (!canFocusElement(element)) {
      return;
    }

    element.focus({ preventScroll: true });
  });
}

function focusOverlayEntry(kind) {
  if (kind === "tutorial") {
    focusElementSoon(elements.tutorialRestartButton || elements.tutorialNextButton);
    return;
  }

  if (kind === "instructions") {
    focusElementSoon(elements.startTutorialButton || elements.instructionsButton);
  }
}

function restoreOverlayFocus(kind) {
  const fallback =
    kind === "tutorial"
      ? elements.tutorialButton
      : kind === "instructions"
        ? elements.instructionsButton
        : null;
  const target = canFocusElement(overlayFocusReturnTarget)
    ? overlayFocusReturnTarget
    : fallback;

  overlayFocusReturnTarget = null;
  focusElementSoon(target);
}

function setResultBanner(message, tone = "") {
  state.ui.resultBannerMessage = message;
  state.ui.resultBannerTone = tone;
  elements.resultBanner.textContent = message;
  elements.resultBanner.classList.remove("good", "warn");

  if (tone) {
    elements.resultBanner.classList.add(tone);
  }
}

function renderResultBanner() {
  elements.resultBanner.textContent = state.ui.resultBannerMessage;
  elements.resultBanner.classList.remove("good", "warn");

  if (state.ui.resultBannerTone) {
    elements.resultBanner.classList.add(state.ui.resultBannerTone);
  }
}

function getCurrentRollIndexes() {
  if (state.rollNumber === 0 || !state.dice.length) {
    return Array.from({ length: getCurrentDiceCount() }, (_, index) => index);
  }

  state.holds = normalizeHolds();
  return state.holds.reduce((indexes, isHeld, index) => {
    if (!isHeld) {
      indexes.push(index);
    }

    return indexes;
  }, []);
}

function getSnapshotDiceCount(snapshot) {
  return (
    snapshot.scorecard?.[snapshot.currentHole - 1]?.par ||
    snapshot.dice.length ||
    snapshot.holds.length ||
    DEFAULT_HOLE_PAR
  );
}

function getDiceBoxRollTreatment(slotCount = getCurrentDiceCount()) {
  const baseTreatment =
    DICE_BOX_ROLL_TREATMENTS[slotCount] ||
    DICE_BOX_ROLL_TREATMENTS[DEFAULT_HOLE_PAR];

  if (window.matchMedia("(max-width: 720px)").matches) {
    return {
      ...baseTreatment,
      layerScale: 1,
      lift: "0%",
      brightness: Math.min(baseTreatment.brightness, 1.01),
      boxScale: Math.max(4.1, baseTreatment.boxScale - 0.2),
      throwForce: Math.max(2.95, baseTreatment.throwForce - 0.25),
      spinForce: Math.max(4, baseTreatment.spinForce - 0.35),
      gravity: baseTreatment.gravity + 0.08,
    };
  }

  return baseTreatment;
}

function shouldShowDiceBoxDisplay(slotCount = getCurrentDiceCount()) {
  if (!canUseDiceBoxRolls() || !diceBox || slotCount <= 0) {
    return false;
  }

  return (
    state.isRolling &&
    state.isDiceBoxRoll &&
    diceBoxRolls.length === slotCount &&
    diceBoxRolls.every(Boolean) &&
    !isRoomLobbyMode()
  );
}

async function ensureDiceBox() {
  if (diceBox) {
    return diceBox;
  }

  if (diceBoxInitPromise) {
    return diceBoxInitPromise;
  }

  if (!elements.diceBoxStage || !canUseDiceBoxRolls()) {
    return null;
  }

  diceBoxInitPromise = (async () => {
    const instance = new DiceBox({
      container: "#dice-box-stage",
      assetPath: DICE_BOX_ASSET_PATH,
      theme: "default",
      themeColor: "#f2e4be",
      scale: 4.4,
      gravity: 1.2,
      mass: 1.15,
      throwForce: 3.8,
      spinForce: 4.8,
      lightIntensity: 1.15,
      shadowTransparency: 0.78,
      delay: 18,
    });

    await instance.init();
    instance.hide("dice-box-layer--hidden");
    diceBox = instance;
    return instance;
  })().catch((error) => {
    console.error("Unable to initialize dice-box.", error);
    diceBoxInitPromise = null;
    return null;
  });

  return diceBoxInitPromise;
}

function showDiceBoxLayer(
  slotCount = getCurrentDiceCount(),
  { rolling = false } = {},
) {
  if (!elements.diceBoard || !elements.diceBoxStage || !canUseDiceBoxRolls()) {
    return;
  }

  elements.diceBoard.classList.add("has-dice-box-display");

  if (rolling) {
    const treatment = getDiceBoxRollTreatment(slotCount);
    elements.diceBoard.style.setProperty(
      "--dice-box-roll-zoom",
      String(treatment.layerScale),
    );
    elements.diceBoard.style.setProperty(
      "--dice-box-roll-lift",
      treatment.lift,
    );
    elements.diceBoard.style.setProperty(
      "--dice-box-roll-brightness",
      String(treatment.brightness),
    );
    elements.diceBoard.classList.add("is-dice-box-active");
  } else {
    elements.diceBoard.classList.remove("is-dice-box-active");
    elements.diceBoard.style.removeProperty("--dice-box-roll-zoom");
    elements.diceBoard.style.removeProperty("--dice-box-roll-lift");
    elements.diceBoard.style.removeProperty("--dice-box-roll-brightness");
  }

  elements.diceBoxStage.setAttribute("aria-hidden", "false");
  if (diceBox) {
    diceBox.show();
  }
}

async function applyDiceBoxRollConfig(
  instance,
  slotCount = getCurrentDiceCount(),
) {
  if (!instance) {
    return;
  }

  const treatment = getDiceBoxRollTreatment(slotCount);
  await instance.updateConfig({
    scale: treatment.boxScale,
    throwForce: treatment.throwForce,
    spinForce: treatment.spinForce,
    gravity: treatment.gravity,
    lightIntensity: 1.15,
    shadowTransparency: 0.78,
  });
}

function hideDiceBoxLayer() {
  if (!elements.diceBoard || !elements.diceBoxStage) {
    return;
  }

  elements.diceBoard.classList.remove("has-dice-box-display");
  elements.diceBoard.classList.remove("is-dice-box-active");
  elements.diceBoard.style.removeProperty("--dice-box-roll-zoom");
  elements.diceBoard.style.removeProperty("--dice-box-roll-lift");
  elements.diceBoard.style.removeProperty("--dice-box-roll-brightness");
  elements.diceBoxStage.setAttribute("aria-hidden", "true");
  if (diceBox) {
    diceBox.hide("dice-box-layer--hidden");
  }
}

function clearDiceBoxState() {
  if (diceBox) {
    diceBox.clear();
  }

  diceBoxRolls = [];
  activeDiceBoxRollToken = 0;
  hideDiceBoxLayer();
}

function mergeDiceBoxRollResults(results, rerollIndexes, fallbackCount) {
  const slotCount = fallbackCount || getCurrentDiceCount();
  const baseDice =
    state.dice.length === slotCount
      ? [...state.dice]
      : Array.from({ length: slotCount }, () => null);
  const mergedDice = [...baseDice];
  const mergedRolls =
    diceBoxRolls.length === slotCount
      ? [...diceBoxRolls]
      : Array.from({ length: slotCount }, () => null);

  rerollIndexes.forEach((slotIndex, resultIndex) => {
    const roll = results[resultIndex];
    if (!roll) {
      return;
    }

    mergedDice[slotIndex] = roll.value;
    mergedRolls[slotIndex] = roll;
  });

  return {
    dice: mergedDice.map((value) => value ?? randomDie()),
    rolls: mergedRolls,
  };
}

async function runDiceBoxRoll(rerollIndexes, slotCount) {
  if (!canUseDiceBoxRolls()) {
    return null;
  }

  const instance = await ensureDiceBox();

  if (!instance) {
    return null;
  }

  const totalDice = slotCount || getCurrentDiceCount();
  const shouldStartFresh =
    !diceBoxRolls.length ||
    diceBoxRolls.length !== totalDice ||
    rerollIndexes.length === totalDice;

  await applyDiceBoxRollConfig(instance, totalDice);
  showDiceBoxLayer(totalDice, { rolling: true });

  if (shouldStartFresh) {
    instance.clear();
    const results = await instance.roll(`${totalDice}d6`, {
      newStartPoint: true,
    });
    return {
      indexes: Array.from({ length: totalDice }, (_, index) => index),
      results,
    };
  }

  const rerollDice = rerollIndexes
    .map((index) => diceBoxRolls[index])
    .filter(Boolean);

  if (rerollDice.length !== rerollIndexes.length) {
    instance.clear();
    const results = await instance.roll(`${totalDice}d6`, {
      newStartPoint: true,
    });
    return {
      indexes: Array.from({ length: totalDice }, (_, index) => index),
      results,
    };
  }

  const results = await instance.reroll(rerollDice, {
    remove: true,
    newStartPoint: true,
  });

  return {
    indexes: rerollIndexes,
    results,
  };
}

async function playObservedDiceBoxRoll(snapshot) {
  if (!canUseDiceBoxRolls()) {
    return;
  }

  const activePlayer = snapshot.players?.[snapshot.activePlayerIndex];
  if (!activePlayer) {
    return;
  }

  const rollToken = snapshot.rollToken || 0;
  if (!snapshot.isDiceBoxRoll || !snapshot.isRolling || !rollToken) {
    return;
  }

  if (rollToken === activeDiceBoxRollToken) {
    return;
  }

  activeDiceBoxRollToken = rollToken;

  try {
    const slotCount = getSnapshotDiceCount(snapshot);
    const rerollIndexes =
      snapshot.rollNumber <= 1
        ? Array.from({ length: slotCount }, (_, index) => index)
        : normalizeHolds(snapshot.holds, slotCount).reduce(
            (indexes, isHeld, index) => {
              if (!isHeld) {
                indexes.push(index);
              }

              return indexes;
            },
            [],
          );

    const rollData = await runDiceBoxRoll(rerollIndexes, slotCount);
    if (!rollData) {
      return;
    }

    const merged = mergeDiceBoxRollResults(
      rollData.results,
      rollData.indexes,
      slotCount,
    );
    diceBoxRolls = merged.rolls;
  } catch (error) {
    console.error("Unable to animate observed roll with dice-box.", error);
    hideDiceBoxLayer();
  }
}

function randomDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function rollDice(count) {
  return Array.from({ length: count }, randomDie);
}

function normalizeHolds(
  holds = state.holds,
  diceLength = state.dice.length || getCurrentDiceCount(),
) {
  return Array.from({ length: diceLength }, (_, index) =>
    Boolean(holds[index]),
  );
}

function rollWithHolds() {
  if (!state.dice.length) {
    return rollDice(getCurrentDiceCount());
  }

  state.holds = normalizeHolds();
  return state.dice.map((value, index) =>
    state.holds[index] ? value : randomDie(),
  );
}

function clearRollFaceTimer() {
  if (rollFaceAnimationInterval) {
    window.clearInterval(rollFaceAnimationInterval);
    rollFaceAnimationInterval = null;
  }

  rollFaceAnimationFrame = 0;
}

function clearRollTimers() {
  if (rollAnimationTimeout) {
    window.clearTimeout(rollAnimationTimeout);
    rollAnimationTimeout = null;
  }

  if (settleAnimationTimeout) {
    window.clearTimeout(settleAnimationTimeout);
    settleAnimationTimeout = null;
  }

  clearRollFaceTimer();
}

function resetTurnState() {
  clearRollTimers();
  activeRollStartFaces = [];
  activeRollFrameFaces = [];
  clearDiceBoxState();
  state.dice = [];
  state.holds = normalizeHolds([], 0);
  state.rollNumber = 0;
  state.bonusRolls = 0;
  state.rollToken = 0;
  state.isRolling = false;
  state.isSettling = false;
  state.isDiceBoxRoll = false;
  state.isFinalizingRoll = false;
}

function getBaseRollLimit(par = getHolePar()) {
  return MAX_ROLLS + (Number(par) === 5 ? PAR_FIVE_EXTRA_ROLLS : 0);
}

function getRollLimit(par = getHolePar()) {
  return getBaseRollLimit(par) + state.bonusRolls;
}

function hasRollsRemaining() {
  return state.rollNumber < getRollLimit();
}

function hasDiceAvailableToRoll() {
  if (state.rollNumber === 0 || !state.dice.length) {
    return true;
  }

  return state.holds.some((isHeld) => !isHeld);
}

function getHeldValues() {
  return state.dice.filter((_, index) => state.holds[index]);
}

function isStraight(values) {
  if (values.length < 3) {
    return false;
  }

  const sortedValues = [...values].sort((left, right) => left - right);

  for (let index = 1; index < sortedValues.length; index += 1) {
    if (sortedValues[index] !== sortedValues[index - 1] + 1) {
      return false;
    }
  }

  return true;
}

function getMatchTargetSize(values) {
  if (values.length <= 3) {
    return 2;
  }

  if (values.length === 4) {
    return 3;
  }

  if (values.length === 5) {
    return 3;
  }

  return Math.max(2, values.length - 1);
}

function getMatchLabel(count) {
  if (count === 2) {
    return "Pair";
  }

  if (count === 3) {
    return "Triples";
  }

  if (count === 4) {
    return "Quad";
  }

  return `${count}-match`;
}

function getMatchTargetText(count) {
  if (count === 2) {
    return "pair";
  }

  if (count === 3) {
    return "3 of a kind";
  }

  if (count === 4) {
    return "4 of a kind";
  }

  return `${count} matching dice`;
}

function getAllOfKindScore(values, rollNumber) {
  if (!values.length || !values.every((value) => value === values[0])) {
    return null;
  }

  if (rollNumber === 1) {
    return {
      score: 1,
      label: "Hole in one",
      detail: `${values.length} of a kind on roll one scores 1.`,
      kind: "ace",
    };
  }

  return {
    score: 2,
    label: "Birdie",
    detail: `${values.length} of a kind after roll one scores 2.`,
    kind: "birdie",
  };
}

function getHoleInOneLabel(values) {
  if (values.length === 4) {
    return "Hole in One • Albatross";
  }

  if (values.length === 5) {
    return "Hole in One • Condor";
  }

  return "Hole in One";
}

function getDiceTotal(values = []) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function getMatchedSetScore(values) {
  if (values.length < 2) {
    return null;
  }

  const counts = values.reduce((map, value) => {
    map[value] = (map[value] || 0) + 1;
    return map;
  }, {});

  const entries = Object.entries(counts);
  const targetMatchCount = getMatchTargetSize(values);

  const candidates = entries
    .filter(([, count]) => count >= targetMatchCount)
    .map(([rawValue, count]) => {
      const matchValue = Number(rawValue);
      const unmatchedValues = values.filter((value) => value !== matchValue);

      return {
        matchCount: count,
        matchValue,
        unmatchedValues,
        score: getDiceTotal(unmatchedValues),
      };
    })
    .sort((left, right) => {
      if (left.score !== right.score) {
        return left.score - right.score;
      }

      if (left.matchCount !== right.matchCount) {
        return right.matchCount - left.matchCount;
      }

      return right.matchValue - left.matchValue;
    });

  if (!candidates.length) {
    return null;
  }

  const bestMatch = candidates[0];
  const matchLabel = getMatchLabel(bestMatch.matchCount);
  const unmatchedText =
    bestMatch.unmatchedValues.length > 0
      ? bestMatch.unmatchedValues.join(" + ")
      : "nothing left";

  return {
    score: bestMatch.score,
    label: "Match bank",
    detail: `${matchLabel} of ${bestMatch.matchValue}s keeps the match out of the score. ${unmatchedText} scores ${bestMatch.score}.`,
    kind: "match",
  };
}

function getStandardHoleOutcome(values, rollNumber) {
  return getAllOfKindScore(values, rollNumber) || getMatchedSetScore(values);
}

function getFallbackOutcome(values) {
  if (values.length === 3) {
    const lowestDie = Math.min(...values);
    const recoveryScore = lowestDie + 3;

    return {
      score: recoveryScore,
      label: "Par 3 recovery",
      detail: `No pair is showing, so the lowest die ${lowestDie} plus 3 scores ${recoveryScore}.`,
      kind: "miss",
    };
  }

  if (values.length === 4) {
    const lowestDie = Math.min(...values);
    const recoveryScore = lowestDie + 4;

    return {
      score: recoveryScore,
      label: "Par 4 recovery",
      detail: `No 3 of a kind is showing, so the lowest die ${lowestDie} plus 4 scores ${recoveryScore}.`,
      kind: "miss",
    };
  }

  const total = getDiceTotal(values);
  return {
    score: total,
    label: "No match yet",
    detail: `No match is out of the score yet, so all dice count for ${total}.`,
    kind: "miss",
  };
}

function getTakeableOutcome(values, rollNumber) {
  const outcome =
    getStandardHoleOutcome(values, rollNumber) || getFallbackOutcome(values)

  if (rollNumber === 1 && outcome.score === 1) {
    return {
      ...outcome,
      kind: "ace",
      label: getHoleInOneLabel(values),
    };
  }

  return outcome;
}

function getCurrentOutcome() {
  if (state.rollNumber === 0) {
    return null;
  }

  return getTakeableOutcome(state.dice, state.rollNumber);
}

function canScoreCurrentHole() {
  return (
    !state.roundComplete &&
    state.rollNumber > 0 &&
    !state.isRolling &&
    !state.isSettling &&
    !state.isFinalizingRoll
  );
}

function canToggleCurrentDiceHolds() {
  return (
    canScoreCurrentHole() &&
    canControlFromThisDevice()
  );
}

function canControlFromThisDevice() {
  if (isRoomLobbyMode()) {
    return false;
  }

  if (isLocalMode()) {
    return true;
  }

  return getCurrentPlayer()?.id === state.network.localPeerId;
}

function createPlaceholderDie() {
  const placeholder = document.createElement("div");
  placeholder.className = "die die-placeholder";
  placeholder.setAttribute("aria-hidden", "true");
  const shell = document.createElement("span");
  shell.className = "die-placeholder-shell";
  placeholder.appendChild(shell);
  return placeholder;
}

function getDieRotation(value) {
  return DIE_FACE_ROTATIONS[value] || DIE_FACE_ROTATIONS[1];
}

function createDieFace(position, value) {
  const face = document.createElement("span");
  face.className = `die-face die-face--${position}`;
  face.setAttribute("aria-hidden", "true");

  for (let pipIndex = 0; pipIndex < 9; pipIndex += 1) {
    const pip = document.createElement("span");
    pip.className = "pip";
    pip.classList.toggle("active", PIP_PATTERNS[value].includes(pipIndex));
    face.appendChild(pip);
  }

  return face;
}

function getDieSpritePath(value) {
  return DICE_SPRITE_PATHS[value] || DICE_SPRITE_PATHS[1];
}

function preloadDieSprites() {
  if (typeof Image === "undefined") {
    return;
  }

  Object.values(DICE_SPRITE_PATHS).forEach((path) => {
    const image = new Image();
    image.src = path;
  });
}

function updateDieSprite(cube, value) {
  const normalizedValue = Number(value) || 1;
  const image = cube.querySelector(".die-sprite");
  const resultFace = cube.querySelector(".die-result-face");

  cube.dataset.face = String(normalizedValue);

  if (image) {
    image.src = getDieSpritePath(normalizedValue);
  }

  if (resultFace) {
    resultFace.dataset.value = String(normalizedValue);
    resultFace.replaceChildren(
      ...Array.from({ length: 9 }, (_, pipIndex) => {
        const pip = document.createElement("span");
        pip.className = "pip";
        pip.classList.toggle(
          "active",
          PIP_PATTERNS[normalizedValue].includes(pipIndex),
        );
        return pip;
      }),
    );
  }
}

function getDieSpriteDisplayValue(die, value) {
  const dieIndex = Number(die.dataset.index);

  if (state.isRolling && !state.holds[dieIndex]) {
    return (
      activeRollFrameFaces[dieIndex] ??
      activeRollStartFaces[dieIndex] ??
      value
    );
  }

  return value;
}

function getRollingFaceForFrame(index, finalValue, frame) {
  const previousFace =
    activeRollFrameFaces[index] ?? activeRollStartFaces[index] ?? finalValue;
  const seed =
    state.rollToken * 43 +
    state.currentHole * 19 +
    (state.activePlayerIndex + 1) * 11 +
    (index + 1) * 17 +
    frame * 23;
  let nextFace = (seed % 6) + 1;

  if (nextFace === previousFace) {
    nextFace = (nextFace % 6) + 1;
  }

  if (frame > 10 && nextFace === finalValue) {
    nextFace = ((nextFace + index + 1) % 6) + 1;
  }

  return nextFace;
}

function paintRollingSpriteFaces(finalDice) {
  if (!elements.diceGrid || !state.isRolling) {
    return;
  }

  const holds = normalizeHolds();
  activeRollFrameFaces = finalDice.map((finalValue, index) => {
    if (holds[index]) {
      return finalValue;
    }

    return getRollingFaceForFrame(index, finalValue, rollFaceAnimationFrame);
  });

  Array.from(elements.diceGrid.children).forEach((die, index) => {
    if (holds[index]) {
      return;
    }

    const cube = die.querySelector(".die-cube");
    if (cube) {
      updateDieSprite(cube, activeRollFrameFaces[index] ?? finalDice[index]);
    }
  });
}

function startRollFaceAnimation(finalDice) {
  clearRollFaceTimer();
  activeRollFrameFaces = activeRollStartFaces.length
    ? [...activeRollStartFaces]
    : finalDice.map(() => randomDie());
  paintRollingSpriteFaces(finalDice);

  rollFaceAnimationInterval = window.setInterval(() => {
    if (!state.isRolling) {
      clearRollFaceTimer();
      return;
    }

    rollFaceAnimationFrame += 1;
    paintRollingSpriteFaces(finalDice);
  }, ROLL_FACE_FRAME_MS);
}

function createDieCube(value = 1) {
  const cube = document.createElement("span");
  const image = document.createElement("img");
  const resultFace = createDieFace("display", value);

  cube.className = "die-cube die-sprite-shell";
  cube.setAttribute("aria-hidden", "true");
  image.className = "die-sprite";
  image.alt = "";
  image.decoding = "async";
  image.draggable = false;
  resultFace.classList.add("die-result-face");
  cube.appendChild(image);
  cube.appendChild(resultFace);
  updateDieSprite(cube, value);

  return cube;
}

function ensureDieCube(die, value) {
  let cube = die.querySelector(".die-cube");
  const displayValue = getDieSpriteDisplayValue(die, value);

  if (!cube || !cube.classList.contains("die-sprite-shell")) {
    die.innerHTML = "";
    cube = createDieCube(displayValue);
    die.appendChild(cube);
  }

  cube.dataset.finalFace = String(value);
  updateDieSprite(cube, displayValue);

  return cube;
}

function ensureDieChrome(die, value, canToggleHold) {
  const dieIndex = Number(die.dataset.index);
  const isHeld = state.holds[dieIndex];
  let badge = die.querySelector(".die-state-badge");
  let valueChip = die.querySelector(".die-value-chip");
  let hint = die.querySelector(".die-hint");

  if (!badge) {
    badge = document.createElement("span");
    badge.className = "die-state-badge";
    die.appendChild(badge);
  }

  if (!valueChip) {
    valueChip = document.createElement("span");
    valueChip.className = "die-value-chip";
    die.appendChild(valueChip);
  }

  if (!hint) {
    hint = document.createElement("span");
    hint.className = "die-hint";
    die.appendChild(hint);
  }

  valueChip.textContent = String(value);

  if (isHeld) {
    badge.textContent = "Held";
    badge.hidden = false;
    hint.hidden = false;
    hint.textContent = canToggleHold ? "Tap to release" : "Held for score";
    return;
  }

  badge.hidden = true;
  if (state.rollNumber === 0) {
    hint.hidden = true;
    hint.textContent = "";
    return;
  }

  hint.hidden = false;
  hint.textContent = canToggleHold ? "Tap to hold" : "Locked in";
}

function getDieMotionProfile(index, value) {
  const seed =
    state.currentHole * 41 +
    (state.activePlayerIndex + 1) * 29 +
    state.rollNumber * 17 +
    (index + 1) * 13;
  const direction = seed % 2 === 0 ? 1 : -1;
  const startFace =
    state.isRolling || state.isSettling
      ? (activeRollStartFaces[index] ?? value)
      : value;
  const startRotation = getDieRotation(startFace);
  const endRotation = getDieRotation(value);
  const spinTurnsX = 720 + (seed % 3) * 180;
  const spinTurnsY = 900 + ((seed + 2) % 4) * 180;
  const spinTurnsZ = direction * (150 + (seed % 4) * 40);

  return {
    direction,
    lift: 40 + (seed % 4) * 11,
    driftX: direction * (18 + (seed % 5) * 7),
    driftY: 9 + (seed % 3) * 5,
    blur: 0.9 + ((seed * 7) % 5) * 0.2,
    squash: 0.9 + (seed % 3) * 0.026,
    stretch: 1.08 + (seed % 4) * 0.024,
    shadowScale: 1.04 + (seed % 4) * 0.1,
    shadowDrift: direction * (12 + (seed % 3) * 5),
    settleTiltX: direction * (7 + (seed % 3) * 2),
    settleTiltY: direction * -(5 + (seed % 4)),
    settleTiltZ: direction * (4 + (seed % 3)),
    cubeFromX: startRotation.x,
    cubeFromY: startRotation.y,
    cubeFromZ: startRotation.z,
    cubeToX: endRotation.x,
    cubeToY: endRotation.y,
    cubeToZ: endRotation.z,
    cubeSpinX: spinTurnsX,
    cubeSpinY: spinTurnsY,
    cubeSpinZ: spinTurnsZ,
    cubeSettleX: direction * (8 + (seed % 4) * 2),
    cubeSettleY: direction * -(6 + (seed % 3) * 2),
    cubeSettleZ: direction * (4 + (seed % 3) * 2),
    stagger: `${Math.min(ROLL_STAGGER_MAX_MS, index * 34 + (seed % 3) * 16)}ms`,
  };
}

function applyDieMotionStyles(die, index, value) {
  const motion = getDieMotionProfile(index, value);
  const formatPx = (amount) => `${amount.toFixed(2)}px`;
  const formatDeg = (amount) => `${amount.toFixed(2)}deg`;
  const dieTransform = (x, y, scaleX, scaleY) =>
    `translate3d(${formatPx(x)}, ${formatPx(y)}, 0) scale3d(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)}, 1)`;
  const cubeTransform = (x, y, z) =>
    `rotateX(var(--cube-camera-x, -18deg)) rotateY(var(--cube-camera-y, 22deg)) rotateZ(var(--cube-camera-z, -8deg)) rotateX(${formatDeg(x)}) rotateY(${formatDeg(y)}) rotateZ(${formatDeg(z)})`;
  const shadowTransform = (x, scale) =>
    `translateX(${formatPx(x)}) scale(${scale.toFixed(3)})`;
  const blurFilter = (amount, saturation) =>
    `blur(${formatPx(amount)}) saturate(${saturation.toFixed(3)})`;

  const step1Transform = dieTransform(
    motion.driftX * 0.12,
    motion.lift * -0.22,
    1.012,
    0.988,
  );
  const step2Transform = dieTransform(
    motion.driftX * 0.48,
    motion.lift * -0.5,
    1.018,
    0.982,
  );
  const step3Transform = dieTransform(
    motion.driftX * -0.14,
    motion.lift * -0.08,
    0.994,
    1.008,
  );
  const step4Transform = dieTransform(
    motion.driftX * 0.05,
    motion.driftY + 4,
    1.008,
    0.992,
  );

  const cubeRollStep1 = cubeTransform(
    motion.cubeFromX + motion.cubeSpinX * 0.22,
    motion.cubeFromY + motion.cubeSpinY * 0.18,
    motion.cubeFromZ + motion.cubeSpinZ * 0.16,
  );
  const cubeRollStep2 = cubeTransform(
    motion.cubeToX + motion.cubeSpinX * 0.86,
    motion.cubeToY + motion.cubeSpinY * 0.8,
    motion.cubeToZ + motion.cubeSpinZ * 0.72,
  );
  const cubeRollStep3 = cubeTransform(
    motion.cubeToX + motion.cubeSpinX * 0.18,
    motion.cubeToY + motion.cubeSpinY * 0.16,
    motion.cubeToZ + motion.cubeSpinZ * 0.12,
  );
  const cubeSettleStart = cubeTransform(
    motion.cubeToX + motion.cubeSettleX,
    motion.cubeToY + motion.cubeSettleY,
    motion.cubeToZ + motion.cubeSettleZ,
  );
  const cubeSettleStep1 = cubeTransform(
    motion.cubeToX + motion.cubeSettleX * -0.42,
    motion.cubeToY + motion.cubeSettleY * -0.36,
    motion.cubeToZ + motion.cubeSettleZ * -0.3,
  );
  const cubeSettleStep2 = cubeTransform(
    motion.cubeToX + motion.cubeSettleX * 0.16,
    motion.cubeToY + motion.cubeSettleY * 0.14,
    motion.cubeToZ + motion.cubeSettleZ * 0.12,
  );
  const spriteTransform = (
    x,
    y,
    rotateX,
    rotateY,
    rotateZ,
    scaleX,
    scaleY,
  ) =>
    `translate3d(${formatPx(x)}, ${formatPx(y)}, 0) rotateX(${formatDeg(rotateX)}) rotateY(${formatDeg(rotateY)}) rotateZ(${formatDeg(rotateZ)}) scale3d(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)}, 1)`;
  const spriteRollStep1 = spriteTransform(
    motion.driftX * 0.2,
    motion.lift * -0.42,
    motion.direction * 8,
    motion.direction * -10,
    motion.direction * 22,
    1.05,
    0.96,
  );
  const spriteRollStep2 = spriteTransform(
    motion.driftX * 0.72,
    motion.lift * -1.08,
    motion.direction * -12,
    motion.direction * 14,
    motion.direction * -48,
    0.95,
    1.08,
  );
  const spriteRollStep3 = spriteTransform(
    motion.driftX * -0.36,
    motion.lift * -0.58,
    motion.direction * 10,
    motion.direction * -12,
    motion.direction * 76,
    1.04,
    0.98,
  );
  const spriteRollStep4 = spriteTransform(
    motion.driftX * 0.18,
    motion.driftY + 10,
    motion.direction * -6,
    motion.direction * 8,
    motion.direction * -18,
    motion.squash,
    motion.stretch,
  );
  const spriteSettleStart = spriteTransform(
    motion.driftX * 0.08,
    7,
    motion.settleTiltX,
    motion.settleTiltY,
    motion.settleTiltZ,
    1.08,
    0.9,
  );
  const spriteSettleStep1 = spriteTransform(
    motion.driftX * -0.04,
    -6,
    motion.settleTiltX * -0.42,
    motion.settleTiltY * -0.36,
    motion.settleTiltZ * -0.32,
    0.97,
    1.04,
  );
  const spriteSettleStep2 = spriteTransform(
    motion.driftX * 0.02,
    2,
    motion.settleTiltX * 0.16,
    motion.settleTiltY * 0.14,
    motion.settleTiltZ * 0.12,
    1.01,
    0.99,
  );

  die.style.setProperty("--roll-duration", `${ROLL_ANIMATION_TOTAL_MS}ms`);
  die.style.setProperty(
    "--settle-duration",
    `${Math.max(240, SETTLE_ANIMATION_MS - 30 + index * 28)}ms`,
  );
  die.style.setProperty("--roll-stagger", motion.stagger);
  die.style.setProperty("--roll-lift", formatPx(motion.lift));
  die.style.setProperty("--roll-drift-x", formatPx(motion.driftX));
  die.style.setProperty("--roll-drift-y", formatPx(motion.driftY));
  die.style.setProperty("--roll-blur", formatPx(motion.blur));
  die.style.setProperty("--roll-squash", motion.squash.toFixed(3));
  die.style.setProperty("--roll-stretch", motion.stretch.toFixed(3));
  die.style.setProperty("--roll-shadow-scale", motion.shadowScale.toFixed(3));
  die.style.setProperty("--roll-shadow-drift", formatPx(motion.shadowDrift));
  die.style.setProperty("--settle-tilt-x", formatDeg(motion.settleTiltX));
  die.style.setProperty("--settle-tilt-y", formatDeg(motion.settleTiltY));
  die.style.setProperty("--settle-tilt-z", formatDeg(motion.settleTiltZ));
  die.style.setProperty("--cube-from-x", formatDeg(motion.cubeFromX));
  die.style.setProperty("--cube-from-y", formatDeg(motion.cubeFromY));
  die.style.setProperty("--cube-from-z", formatDeg(motion.cubeFromZ));
  die.style.setProperty("--cube-to-x", formatDeg(motion.cubeToX));
  die.style.setProperty("--cube-to-y", formatDeg(motion.cubeToY));
  die.style.setProperty("--cube-to-z", formatDeg(motion.cubeToZ));
  die.style.setProperty("--cube-spin-x", formatDeg(motion.cubeSpinX));
  die.style.setProperty("--cube-spin-y", formatDeg(motion.cubeSpinY));
  die.style.setProperty("--cube-spin-z", formatDeg(motion.cubeSpinZ));
  die.style.setProperty("--cube-settle-x", formatDeg(motion.cubeSettleX));
  die.style.setProperty("--cube-settle-y", formatDeg(motion.cubeSettleY));
  die.style.setProperty("--cube-settle-z", formatDeg(motion.cubeSettleZ));
  die.style.setProperty("--die-roll-step-1-transform", step1Transform);
  die.style.setProperty("--die-roll-step-2-transform", step2Transform);
  die.style.setProperty("--die-roll-step-3-transform", step3Transform);
  die.style.setProperty("--die-roll-step-4-transform", step4Transform);
  die.style.setProperty(
    "--die-roll-step-1-filter",
    blurFilter(motion.blur * 0.18, 1.02),
  );
  die.style.setProperty(
    "--die-roll-step-2-filter",
    blurFilter(motion.blur * 0.45, 1.08),
  );
  die.style.setProperty(
    "--die-roll-step-3-filter",
    blurFilter(motion.blur * 0.24, 1.04),
  );
  die.style.setProperty(
    "--die-roll-step-4-filter",
    blurFilter(motion.blur * 0.12, 1.01),
  );
  die.style.setProperty(
    "--die-shadow-step-1-transform",
    shadowTransform(
      motion.shadowDrift * 0.65,
      Math.max(1.01, motion.shadowScale),
    ),
  );
  die.style.setProperty(
    "--die-shadow-step-2-transform",
    shadowTransform(motion.shadowDrift * -0.18, 0.9),
  );
  die.style.setProperty(
    "--die-shadow-step-3-transform",
    shadowTransform(motion.shadowDrift * 0.08, 0.98),
  );
  die.style.setProperty(
    "--die-cube-roll-from",
    cubeTransform(motion.cubeFromX, motion.cubeFromY, motion.cubeFromZ),
  );
  die.style.setProperty("--die-cube-roll-step-1", cubeRollStep1);
  die.style.setProperty("--die-cube-roll-step-2", cubeRollStep2);
  die.style.setProperty("--die-cube-roll-step-3", cubeRollStep3);
  die.style.setProperty(
    "--die-cube-roll-to",
    cubeTransform(motion.cubeToX, motion.cubeToY, motion.cubeToZ),
  );
  die.style.setProperty("--die-cube-settle-from", cubeSettleStart);
  die.style.setProperty("--die-cube-settle-step-1", cubeSettleStep1);
  die.style.setProperty("--die-cube-settle-step-2", cubeSettleStep2);
  die.style.setProperty(
    "--die-cube-settle-to",
    cubeTransform(motion.cubeToX, motion.cubeToY, motion.cubeToZ),
  );
  die.style.setProperty("--sprite-roll-step-1", spriteRollStep1);
  die.style.setProperty("--sprite-roll-step-2", spriteRollStep2);
  die.style.setProperty("--sprite-roll-step-3", spriteRollStep3);
  die.style.setProperty("--sprite-roll-step-4", spriteRollStep4);
  die.style.setProperty("--sprite-settle-start", spriteSettleStart);
  die.style.setProperty("--sprite-settle-step-1", spriteSettleStep1);
  die.style.setProperty("--sprite-settle-step-2", spriteSettleStep2);
  die.style.setProperty(
    "--die-shadow-settle-from",
    shadowTransform(motion.shadowDrift * 0.12, 1.04),
  );
  die.style.setProperty(
    "--die-shadow-settle-step-1",
    shadowTransform(motion.shadowDrift * -0.08, 0.88),
  );
  die.style.setProperty(
    "--die-shadow-settle-step-2",
    shadowTransform(motion.shadowDrift * 0.04, 0.94),
  );
}

function syncDieElement(die, value, index) {
  const canToggleHold = canToggleCurrentDiceHolds();

  const useDiceBoxProxy = shouldShowDiceBoxDisplay(state.dice.length);

  die.classList.add("die", "die-button");
  die.type = "button";
  die.dataset.index = String(index);
  die.dataset.face = String(value);
  die.disabled = !canToggleHold;
  die.setAttribute(
    "aria-label",
    useDiceBoxProxy
      ? `Hold selector for die showing ${value}. ${state.holds[index] ? "Held. Click to release it." : "Click to hold it."}`
      : (state.isRolling || state.isSettling) && !state.holds[index]
        ? state.isRolling
          ? "Die rolling now."
          : `Die settling now. Final face ${value}.`
        : `Die showing ${value}. ${state.holds[index] ? "Held. Click to release it." : "Click to hold it."}`,
  );
  die.setAttribute("aria-pressed", state.holds[index] ? "true" : "false");
  applyDieMotionStyles(die, index, value);
  die.classList.toggle("held", state.holds[index]);
  die.classList.toggle("is-rolling", state.isRolling && !state.holds[index]);
  die.classList.toggle("is-settling", state.isSettling && !state.holds[index]);
  die.classList.toggle(
    "is-hidden-for-roll",
    canUseDiceBoxRolls() &&
      state.isDiceBoxRoll &&
      state.isRolling &&
      !state.holds[index],
  );
  die.classList.toggle("is-dice-box-proxy", useDiceBoxProxy);
  if (useDiceBoxProxy) {
    die.querySelector(".die-cube")?.remove();
  } else {
    ensureDieCube(die, value);
  }
  ensureDieChrome(die, value, canToggleHold);
}

function createDieElement(value, index) {
  const die = document.createElement("button");
  syncDieElement(die, value, index);
  return die;
}

function renderDice() {
  const diceToRender = state.dice.length
    ? state.dice
    : Array.from({ length: getCurrentDiceCount() }, () => null);
  const diceCount = diceToRender.length;
  const heldCount = normalizeHolds().filter(Boolean).length;

  const showDiceBoxDisplay = shouldShowDiceBoxDisplay(diceCount);

  const needsRebuild =
    elements.diceGrid.children.length !== diceCount ||
    diceToRender.some((value, index) => {
      const child = elements.diceGrid.children[index];
      const isPlaceholder = child?.classList.contains("die-placeholder");
      return (value === null) !== isPlaceholder;
    });

  elements.diceGrid.dataset.diceCount = String(diceCount);
  elements.diceGrid.dataset.heldCount = String(heldCount);
  elements.diceBoard.dataset.diceCount = String(diceCount);
  elements.diceBoard.dataset.heldCount = String(heldCount);
  elements.diceBoard.classList.toggle("has-held-dice", heldCount > 0);

  if (needsRebuild) {
    elements.diceGrid.innerHTML = "";

    diceToRender.forEach((value, index) => {
      elements.diceGrid.appendChild(
        value === null
          ? createPlaceholderDie()
          : createDieElement(value, index),
      );
    });
  } else {
    diceToRender.forEach((value, index) => {
      if (value === null) {
        return;
      }

      syncDieElement(elements.diceGrid.children[index], value, index);
    });
  }

  elements.diceGrid.classList.toggle("is-rolling", state.isRolling);
  elements.diceGrid.classList.toggle("is-settling", state.isSettling);
  elements.diceGrid.classList.toggle(
    "is-dice-box-active",
    canUseDiceBoxRolls() && state.isDiceBoxRoll && state.isRolling,
  );
  elements.diceGrid.classList.toggle("is-dice-box-display", showDiceBoxDisplay);
  elements.diceBoard.classList.toggle("is-pre-roll", state.rollNumber === 0);
  elements.diceBoard.classList.toggle(
    "is-score-ready",
    !state.isRolling &&
      !state.isSettling &&
      !state.isFinalizingRoll &&
      canScoreCurrentHole(),
  );

  if (showDiceBoxDisplay) {
    showDiceBoxLayer(diceCount, {
      rolling: Boolean(state.isDiceBoxRoll) && state.isRolling,
    });
  } else if (!state.isRolling) {
    hideDiceBoxLayer();
  }
}

function renderDiceMeta() {
  const currentPlayer = getCurrentPlayer();

  if (!currentPlayer) {
    elements.diceOwnerLabel.textContent = "Waiting for players";
    elements.diceOwnerDetail.textContent = `Roll 0 of ${getRollLimit()}`;
    return;
  }

  const label = canControlFromThisDevice()
    ? `${getPlayerLabel(currentPlayer, true)} rolling now`
    : `Watching ${getPlayerPossessive(currentPlayer, true)} dice`;
  const currentPar = getHolePar();
  const diceCount = getCurrentDiceCount();

  elements.diceOwnerLabel.textContent = label;
  elements.diceOwnerDetail.textContent = `Par ${currentPar} · ${diceCount} dice · Roll ${state.rollNumber} of ${getRollLimit()}`;
}

function renderHeaderProfile() {
  const localPlayer =
    getLocalPlayerRecord() ||
    state.players.find((player) => player.id === state.network.localPeerId) ||
    state.players[0];
  const roleLabel = isLocalMode()
    ? "Solo play"
    : isHostMode()
      ? "Host"
      : isClientMode()
        ? "Guest"
        : "Joining";

  elements.headerPlayerAvatar.innerHTML = localPlayer
    ? getPlayerAvatarMarkup(localPlayer, "sm")
    : "";
  elements.headerPlayerName.textContent = localPlayer?.name || "Player 1";
  elements.headerPlayerMeta.textContent = `${roleLabel} • ${getPlayerScoreSummary(
    Math.max(0, state.players.findIndex((player) => player.id === localPlayer?.id)),
  )}`;
}

function renderLiveRoomSummary() {
  const isLiveRoom = !isLocalMode();
  const roomModeLabel = isLocalMode()
    ? "Solo Play"
    : isRoomLobbyMode()
      ? isHostMode()
        ? "Host Lobby"
        : "Waiting Room"
      : state.roundComplete
        ? "Round Complete"
        : "Live Room";
  const roomTitle = isLiveRoom ? "Fairway Lounge" : "Solo Lounge";
  const roomStatus = isLiveRoom
    ? getNetworkNote()
    : state.ui.resultBannerMessage || "Left the room. Solo play is ready.";

  elements.liveRoomName.textContent = roomTitle;
  elements.liveRoomMode.textContent = roomModeLabel;
  elements.liveRoomStatus.textContent = roomStatus;
  elements.liveRoomCode.textContent = state.network.roomCode || "—";
  elements.roomSummaryButton.textContent = isLocalMode()
    ? "Play Online"
    : isHostMode()
      ? "Invite Friends"
      : "Room Details";
  elements.clubPlayerCount.textContent = isLiveRoom
    ? `${getConnectedPlayerCount()} / ${state.maxPlayers}`
    : `${state.players.length} player${state.players.length === 1 ? "" : "s"}`;
}

function renderLiveRoundCard() {
  const badge = isLocalMode()
    ? "Solo"
    : isRoomLobbyMode()
      ? "Lobby"
      : state.roundComplete
        ? "Final"
        : "Live";
  const title = isLocalMode()
    ? "Solo Lounge"
    : state.network.roomCode
      ? `Room ${state.network.roomCode}`
      : "Fairway Lounge";
  const note = isLocalMode()
    ? `1 player • ${state.totalHoles === 18 ? "Full 18" : "Front 9"}`
    : `${getConnectedPlayerCount()} player${getConnectedPlayerCount() === 1 ? "" : "s"} • ${
        state.totalHoles === 18 ? "Full 18" : "Front 9"
      }`;

  elements.liveRoundTitle.textContent = title;
  elements.liveRoundBadge.textContent = badge;
  elements.liveRoundNote.textContent = note;
  elements.liveRoundButton.textContent = isLocalMode()
    ? "Open Rooms"
    : isRoomLobbyMode()
      ? "Open Lobby"
      : "Room Details";
}

function renderPlayerSummary() {
  elements.playerSummaryList.innerHTML = "";

  state.players.forEach((player, index) => {
    const row = document.createElement("article");
    const isActive =
      !state.roundComplete &&
      !isRoomLobbyMode() &&
      index === state.activePlayerIndex;
    const isLocalPlayer = player.id === state.network.localPeerId;
    const scoreText = `Total ${getPlayerScoreSummary(index)}`;
    const stateText = !player.connected
      ? "Reconnecting"
      : isRoomLobbyMode()
        ? isLocalPlayer && isHostMode()
          ? "Host"
          : "Ready"
        : isActive
          ? "Up now"
          : "In round";

    row.className = `player-summary-row${isActive ? " is-active" : ""}`;
    row.innerHTML = `
      ${getPlayerAvatarMarkup(player, "sm")}
      <div class="player-summary-copy">
        <strong>${escapeHtml(getPlayerLabel(player, true))}</strong>
        <span>${escapeHtml(stateText)}</span>
      </div>
      <span class="player-summary-score">${escapeHtml(scoreText)}</span>
    `;
    elements.playerSummaryList.appendChild(row);
  });

  for (
    let seatIndex = state.players.length + 1;
    seatIndex <= state.maxPlayers;
    seatIndex += 1
  ) {
    const seat = document.createElement("article");
    seat.className = "player-summary-row is-seat";
    seat.innerHTML = `
      <span class="player-avatar player-avatar--sm player-avatar--seat" aria-hidden="true">
        <span class="player-avatar-monogram">${seatIndex}</span>
      </span>
      <div class="player-summary-copy">
        <strong>Open Seat</strong>
        <span>Waiting for player</span>
      </div>
      <span class="player-summary-score">Seat ${seatIndex}</span>
    `;
    elements.playerSummaryList.appendChild(seat);
  }
}

function renderRoundRecap() {
  elements.roundRecapPanel.hidden = !state.roundComplete;

  if (!state.roundComplete) {
    elements.playAgainButton.disabled = false;
    elements.recapSetupButton.disabled = false;
    return;
  }

  const standings = getPlayerStandings();
  const winner = standings[0];
  const isRoomResult = !isLocalMode();

  elements.roundRecapNote.textContent = isRoomResult
    ? `Room ${state.network.roomCode || "PAR"} is in the books. Final totals are locked in.`
    : "Here is how the round finished. Lowest total wins the card.";
  elements.roundRecapBadge.textContent = isRoomResult ? "Final Room Card" : "Solo Result";
  elements.roundRecapHighlight.textContent = getRoundHighlight();
  elements.playAgainButton.disabled = isClientMode();
  elements.recapSetupButton.disabled = isClientMode();

  if (winner) {
    elements.roundRecapWinner.innerHTML = `
      ${getPlayerAvatarMarkup(winner.player, "lg")}
      <div class="recap-winner-copy">
        <strong>${escapeHtml(winner.player.name)}</strong>
        <span>${escapeHtml(winner.summary)}</span>
      </div>
    `;
  } else {
    elements.roundRecapWinner.innerHTML = "";
  }

  elements.roundRecapList.innerHTML = standings
    .map((entry, index) => {
      return `
        <article class="round-recap-row${index === 0 ? " is-winner" : ""}">
          <span class="round-recap-rank">${index + 1}</span>
          <div class="round-recap-player">
            ${getPlayerAvatarMarkup(entry.player, "sm")}
            <div class="round-recap-player-copy">
              <strong>${escapeHtml(entry.player.name)}</strong>
              <span>${escapeHtml(index === 0 ? "Clubhouse leader" : "Finished round")}</span>
            </div>
          </div>
          <span class="round-recap-score">${escapeHtml(entry.summary)}</span>
        </article>
      `;
    })
    .join("");
}

function renderPlayerArea() {
  const activeNameInput =
    document.activeElement instanceof HTMLInputElement &&
    document.activeElement.classList.contains("player-name-edit-input")
      ? {
          id: document.activeElement.id,
          start: document.activeElement.selectionStart,
          end: document.activeElement.selectionEnd,
        }
      : null;

  elements.playerNames.innerHTML = "";

  if (getPagePhase() === "join") {
    const player = state.players[0] || { name: "Player 1" };
    const field = document.createElement("div");
    field.className = "name-field";

    const label = document.createElement("label");
    label.htmlFor = "player-name-join";
    label.textContent = "Your Name";

    const input = document.createElement("input");
    input.id = "player-name-join";
    input.type = "text";
    input.maxLength = 18;
    input.value = player.name;
    input.dataset.playerName = "0";

    field.append(label, input);
    elements.playerNames.appendChild(field);
    return;
  }

  if (isLocalMode()) {
    const player = state.players[0] || { name: "Player 1" };
    const field = document.createElement("div");
    field.className = "name-field";

    const label = document.createElement("label");
    label.htmlFor = "player-name-local";
    label.textContent = "Your Name";

    const input = document.createElement("input");
    input.id = "player-name-local";
    input.type = "text";
    input.maxLength = 18;
    input.value = player.name;
    input.dataset.playerName = "0";

    field.append(label, input);
    elements.playerNames.appendChild(field);

    for (let seatIndex = 2; seatIndex <= state.maxPlayers; seatIndex += 1) {
      elements.playerNames.appendChild(createOpenSeatCard(seatIndex));
    }

    return;
  }

  state.players.forEach((player, index) => {
    const card = document.createElement("div");
    const isLobby = isRoomLobbyMode();
    const isActive = !isLobby && index === state.activePlayerIndex;
    const isLocalPlayer = player.id === state.network.localPeerId;
    const isConnected = player.connected !== false;
    const canEditLobbyName = isLobby && isLocalPlayer;
    const classes = ["player-card"];
    const playerTag = isLocalPlayer ? "You" : index === 0 ? "Host" : "Guest";
    const liveOutcome =
      isActive && state.rollNumber > 0 && !state.isRolling && !state.isSettling
        ? getCurrentOutcome()
        : null;
    const liveScoreChip = isActive
      ? `<span class="player-total-chip player-live-chip${liveOutcome ? " is-live" : ""}">${
          liveOutcome ? `Live ${liveOutcome.score}` : "Live —"
        }</span>`
      : "";

    if (isActive) {
      classes.push("is-active");
    }

    if (isLocalPlayer) {
      classes.push("is-local");
    }

    const playerIdentityMarkup = canEditLobbyName
      ? `
        <div class="player-card-identity-stack">
          ${getPlayerAvatarMarkup(player)}
          <label class="player-name-edit" for="player-name-room-${index}">
            <span class="player-name-edit-label">${isHostMode() ? "Host Name" : "Your Name"}</span>
            <input
              id="player-name-room-${index}"
              class="player-name-edit-input"
              type="text"
              maxlength="18"
              value="${escapeHtml(player.name)}"
              data-player-name="${index}"
              autocomplete="off"
              spellcheck="false"
            />
          </label>
        </div>
      `
      : `
        <div class="player-card-identity-stack">
          ${getPlayerAvatarMarkup(player)}
          <div class="player-card-identity-copy">
            <strong>${escapeHtml(player.name)}</strong>
            <span>${isLocalPlayer ? "Local player" : playerTag}</span>
          </div>
        </div>
      `;

    card.className = classes.join(" ");
    card.innerHTML = `
      <div class="player-card-head">
        <div class="player-card-identity${canEditLobbyName ? " player-card-identity--editable" : ""}">
          ${playerIdentityMarkup}
        </div>
        <span class="player-tag">${playerTag}</span>
      </div>
      <span>${
        !isConnected
          ? "Reconnecting"
          : isLobby
            ? isLocalPlayer && isHostMode()
              ? "Hosting the room"
              : "In the lobby"
            : isActive
              ? "Rolling now"
              : "Waiting for the turn"
      }</span>
      <div class="player-card-meta">
        <span class="player-total-chip">Total ${getPlayerScoreSummary(index)}</span>
        ${liveScoreChip}
      </div>
    `;

    elements.playerNames.appendChild(card);
  });

  for (
    let seatIndex = state.players.length + 1;
    seatIndex <= state.maxPlayers;
    seatIndex += 1
  ) {
    elements.playerNames.appendChild(createOpenSeatCard(seatIndex));
  }

  if (activeNameInput) {
    const restoredInput = document.getElementById(activeNameInput.id);

    if (restoredInput instanceof HTMLInputElement) {
      restoredInput.focus({ preventScroll: true });

      if (
        typeof activeNameInput.start === "number" &&
        typeof activeNameInput.end === "number"
      ) {
        restoredInput.setSelectionRange(
          activeNameInput.start,
          activeNameInput.end,
        );
      }
    }
  }
}

function renderMatchBanner() {
  elements.matchLineup.textContent = getMatchLineupText();
  elements.matchDetail.textContent = getMatchDetailText();
  elements.matchSeat.textContent = getMatchSeatText();
  elements.matchTurnPill.textContent = getTurnPillText();
}

function renderScorecard() {
  elements.teeSheetHead.innerHTML = "";
  elements.teeSheetBody.innerHTML = "";
  elements.teeSheetFoot.innerHTML = "";
  elements.scoreTotal.textContent = getHeaderTotalText();
  elements.scoreTotal.setAttribute(
    "aria-label",
    `Totals. ${getOverallLeaderText()}.`,
  );
  const scorecardPlayerCount = state.players.length;

  if (elements.teeSheetPanel) {
    elements.teeSheetPanel.dataset.playerCount = String(scorecardPlayerCount);
    elements.teeSheetPanel.style.setProperty(
      "--scorecard-min-width",
      `${Math.max(320, 116 + scorecardPlayerCount * 96)}px`,
    );
  }

  const headRow = document.createElement("tr");
  headRow.innerHTML = `
    <th>Hole</th>
    <th>Par</th>
    ${state.players.map((player) => `<th>${escapeHtml(player.name)}</th>`).join("")}
  `;
  elements.teeSheetHead.appendChild(headRow);

  const liveOutcome =
    state.isRolling || state.isSettling ? null : getCurrentOutcome();

  state.scorecard.forEach((hole) => {
    const row = document.createElement("tr");
    const isCurrentHole =
      !state.roundComplete && hole.holeNumber === state.currentHole;

    if (isCurrentHole) {
      row.classList.add("is-current");
    }

    if (hole.scores.some((score) => score !== null)) {
      row.classList.add("is-complete");
    }

    const scoreCells = state.players
      .map((player, playerIndex) => {
        const postedScore = hole.scores[playerIndex];
        const isActiveCell =
          isCurrentHole &&
          playerIndex === state.activePlayerIndex &&
          player.id === getCurrentPlayer()?.id;
        const previewScore =
          isActiveCell && liveOutcome ? liveOutcome.score : null;
        const value = postedScore ?? previewScore ?? "—";
        const classes = ["score-cell", "player-cell"];

        if (isActiveCell) {
          classes.push("is-active");
        }

        if (previewScore !== null && postedScore === null) {
          classes.push("is-live");
        }

        if (previewScore !== null && postedScore === null) {
          return `<td class="${classes.join(" ")}"><span class="live-score-stack"><small>Live</small><strong>${value}</strong></span></td>`;
        }

        return `<td class="${classes.join(" ")}">${value}</td>`;
      })
      .join("");

    row.innerHTML = `
      <td>${hole.holeNumber}</td>
      <td>${hole.par}</td>
      ${scoreCells}
    `;

    elements.teeSheetBody.appendChild(row);
  });

  const footRow = document.createElement("tr");
  footRow.innerHTML = `
    <td class="total-label">Total</td>
    <td></td>
    ${state.players.map((_, index) => `<td>${getPlayerScoreSummary(index)}</td>`).join("")}
  `;
  elements.teeSheetFoot.appendChild(footRow);
}

function renderChatLog(logElement) {
  if (!logElement) {
    return;
  }

  const shouldStickToBottom =
    logElement.dataset.hasMessages !== "true" ||
    logElement.scrollHeight - logElement.scrollTop - logElement.clientHeight < 48;

  if (!state.network.chatMessages.length) {
    logElement.innerHTML = `
      <div class="room-chat-empty">
        ${
          isRoomLobbyMode()
            ? "Room chat is open. Say hello before the first tee shot."
            : "Room chat is ready when someone wants to talk through the hole."
        }
      </div>
    `;
    logElement.dataset.hasMessages = "false";
  } else {
    logElement.innerHTML = state.network.chatMessages
      .map((message) => {
        const isOwnMessage =
          message.sessionId &&
          message.sessionId === state.network.clientSessionId;

        return `
          <article class="room-chat-message${isOwnMessage ? " is-own" : ""}">
            <div class="room-chat-message-shell">
              ${getPlayerAvatarMarkup(message.name, "sm")}
              <div class="room-chat-message-body">
                <div class="room-chat-message-meta">
                  <strong>${escapeHtml(isOwnMessage ? "You" : message.name)}</strong>
                  <span>${escapeHtml(formatChatTimestamp(message.sentAt))}</span>
                </div>
                <p>${escapeHtml(message.text)}</p>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
    logElement.dataset.hasMessages = "true";
  }

  if (shouldStickToBottom) {
    logElement.scrollTop = logElement.scrollHeight;
  }
}

function renderRoomChat() {
  const showChat = shouldShowRoomChat();
  const canSend = canSendRoomChat();
  const statusText = getRoomChatStatusText();
  const placeholder = getRoomChatPlaceholder();

  elements.roomChatPanel.hidden = !showChat;
  elements.roomChatOverlayPanel.hidden = !showChat;
  elements.roomChatStatus.textContent = statusText;
  elements.roomChatOverlayStatus.textContent = statusText;
  elements.roomChatInput.placeholder = placeholder;
  elements.roomChatOverlayInput.placeholder = placeholder;
  elements.roomChatInput.disabled = !canSend;
  elements.roomChatOverlayInput.disabled = !canSend;
  elements.roomChatSend.disabled = !canSend;
  elements.roomChatOverlaySend.disabled = !canSend;

  renderChatLog(elements.roomChatLog);
  renderChatLog(elements.roomChatOverlayLog);
}

function getNetworkNote() {
  if (!supportsOnlineRooms()) {
    return "Online room codes are unavailable in this browser right now. You can still play solo on this device.";
  }

  const roomMode = getRoomOverlayMode();

  if (isConnectingMode()) {
    return state.network.pendingJoinCode
      ? `Joining room ${state.network.pendingJoinCode}...`
      : "Creating your room...";
  }

  if (roomMode === "host") {
    return state.network.gameStarted
      ? `Room ${state.network.roomCode} is in progress. New players will need the next room.`
      : `Room ${state.network.roomCode} is live. Share it, then start when everyone is in.`;
  }

  if (roomMode === "joined") {
    return state.network.gameStarted
      ? `You are in room ${state.network.roomCode}. Stay tuned for your turn.`
      : `You are in room ${state.network.roomCode}. Waiting for the host to start.`;
  }

  if (roomMode === "join") {
    return state.network.inviterName
      ? `${state.network.inviterName} invited you. Enter your name and join room ${state.network.pendingJoinCode || cleanRoomCode(elements.joinCodeInput.value)}.`
      : "Enter your name and room code to join the room.";
  }

  return "Create a room for friends or join with a code.";
}

function isOverlayNameDraftInput(input) {
  return (
    input instanceof HTMLInputElement &&
    [
      "player-name-start",
      "player-name-join-overlay",
      "player-name-local",
      "player-name-join",
    ].includes(input.id)
  );
}

function commitPendingLocalName() {
  const player = state.players[0];

  if (!player) {
    state.ui.pendingLocalName = null;
    return;
  }

  const activeInput = isOverlayNameDraftInput(document.activeElement)
    ? document.activeElement
    : null;
  const draftValue = activeInput?.value ?? state.ui.pendingLocalName;

  if (draftValue == null) {
    return;
  }

  player.name = sanitizeName(draftValue, player.name || "Player 1");
  state.ui.pendingLocalName = null;
}

function renderRoomControls() {
  const roomLabel = state.network.roomCode || "-----";
  const joinCode = cleanRoomCode(elements.joinCodeInput.value);
  const hasRoomCode = Boolean(state.network.roomCode);
  const roomMode = getRoomOverlayMode();
  const localName =
    state.ui.pendingLocalName ?? state.players[0]?.name ?? "Player 1";
  const connectedPlayerCount = getConnectedPlayerCount();
  const overlayTitles = {
    start: "Play Online",
    join: "Join Room",
    host: "Invite Players",
    joined: "Room Status",
  };
  const hubTitles = {
    start: "Host or join a room",
    join: "Join a live room",
    host: hasRoomCode ? `Room ${roomLabel} is live` : "Room is live",
    joined: hasRoomCode ? `You're in room ${roomLabel}` : "You're in the room",
  };
  const hubNotes = {
    start: "Bring everyone into one live round with a simple clubhouse code.",
    join: "Step into the lobby before the host starts the round.",
    host: "Share the code or link, then tee it up when everyone arrives.",
    joined: "Stay here for the room status until the host starts the game.",
  };
  const canStartHostedGame =
    isHostMode() &&
    !state.network.gameStarted &&
    isLobbyReadyToStart() &&
    !isConnectingMode();
  const lobbyStatus = state.network.gameStarted
    ? "Game is underway in this room."
    : isLobbyReadyToStart()
      ? `${connectedPlayerCount} players are here. Start whenever the room feels ready.`
      : `Waiting for ${getLobbyWaitingCount()} more player${connectedPlayerCount === 1 ? "" : "s"} to get this round going.`;

  elements.roomOverlayTitle.textContent = overlayTitles[roomMode];
  elements.roomHubTitle.textContent = hubTitles[roomMode];
  elements.roomHubNote.textContent = hubNotes[roomMode];
  if (document.activeElement !== elements.playerNameStartInput) {
    elements.playerNameStartInput.value = localName;
  }
  if (document.activeElement !== elements.playerNameJoinOverlayInput) {
    elements.playerNameJoinOverlayInput.value = localName;
  }
  elements.roomCodeDisplay.textContent = roomLabel;
  elements.joinedRoomCodeDisplay.textContent = roomLabel;
  elements.networkNote.textContent = getNetworkNote();
  elements.shareBar.hidden = !hasRoomCode || roomMode !== "host";
  elements.shareNote.hidden = !hasRoomCode || roomMode !== "host";
  elements.createRoomButton.textContent = isConnectingMode()
    ? "Creating Room..."
    : "Host Room";
  elements.createRoomButton.disabled =
    isConnectingMode() || !supportsOnlineRooms() || !isLocalMode();
  elements.openJoinButton.disabled = isConnectingMode() || !isLocalMode();
  elements.copyRoomCodeButton.disabled = !hasRoomCode || isConnectingMode();
  elements.copyRoomCodeButton.textContent = "Copy Code";
  elements.joinRoomButton.disabled =
    isConnectingMode() || !isLocalMode() || !joinCode || !supportsOnlineRooms();
  elements.joinRoomButton.textContent = isConnectingMode()
    ? "Joining..."
    : "Join Room";
  elements.joinCodeInput.disabled = !isLocalMode() || isConnectingMode();
  elements.joinCodeInput.value = joinCode || state.network.pendingJoinCode;
  elements.backToRoomStartButton.disabled = isConnectingMode();
  elements.leaveRoomButton.hidden = !hasRoomCode;
  elements.leaveRoomJoinedButton.hidden = !hasRoomCode;
  elements.leaveRoomButton.disabled = isConnectingMode();
  elements.leaveRoomJoinedButton.disabled = isConnectingMode();
  elements.startRoomGameButton.hidden = roomMode !== "host";
  elements.startRoomGameButton.disabled = !canStartHostedGame;
  elements.startRoomGameButton.textContent = state.network.gameStarted
    ? "Game In Progress"
    : "Start Game";
  elements.copyLinkButton.classList.toggle(
    "primary-button",
    roomMode === "host" && !canStartHostedGame,
  );
  elements.copyLinkButton.classList.toggle(
    "secondary-button",
    roomMode !== "host" || canStartHostedGame,
  );
  elements.startRoomGameButton.classList.toggle(
    "primary-button",
    canStartHostedGame,
  );
  elements.startRoomGameButton.classList.toggle(
    "secondary-button",
    !canStartHostedGame,
  );
  elements.roomLobbyStatus.textContent = hasRoomCode
    ? lobbyStatus
    : "Create a room to open the lobby.";
  elements.joinedRoomNote.textContent = hasRoomCode
    ? state.network.gameStarted
      ? `Room ${roomLabel} is live. Keep this open to track the room.`
      : `You are in room ${roomLabel}. Waiting for the host to start.`
    : "You are in the room. Stay here to see the live room status.";

  elements.roundSelector.querySelectorAll("[data-round]").forEach((button) => {
    button.classList.toggle(
      "active",
      Number(button.dataset.round) === state.totalHoles,
    );
    button.disabled = isClientMode();
  });

  elements.playerCountSelector
    .querySelectorAll("[data-players]")
    .forEach((button) => {
      button.classList.toggle(
        "active",
        Number(button.dataset.players) === state.maxPlayers,
      );
      button.disabled = !isLocalMode();
    });
}

function getSetupRoundLabel() {
  return state.totalHoles === 18 ? "Full 18" : "Front 9";
}

function getSetupPlayersLabel() {
  return `${state.maxPlayers} player${state.maxPlayers === 1 ? "" : "s"}`;
}

function getSetupPreviewNote() {
  const lengthNote =
    state.totalHoles === 18
      ? "A full championship card for longer room sessions."
      : "A quick front-nine card that gets everyone rolling fast.";
  const roomNote = isLocalMode()
    ? `Configured for solo play, with room for up to ${state.maxPlayers} live seat${state.maxPlayers === 1 ? "" : "s"} when you open a room.`
    : `This room is currently tuned for ${getSetupPlayersLabel()} across ${getSetupRoundLabel().toLowerCase()}.`;

  return `${lengthNote} ${roomNote}`;
}

function renderSetupPreview() {
  if (!elements.setupCourseName) {
    return;
  }

  elements.setupCourseName.textContent = getCourseName();
  elements.setupCourseMode.textContent = getSetupRoundLabel();
  elements.setupCoursePlayers.textContent = getSetupPlayersLabel();
  elements.setupCourseNote.textContent = getSetupPreviewNote();
}

function renderScorePreview() {
  const currentPlayer = getCurrentPlayer();
  const currentPlayerName = currentPlayer
    ? getPlayerLabel(currentPlayer, true)
    : "Current player";
  const previewHeading =
    currentPlayerName === "You"
      ? "Your Live Score"
      : `${currentPlayerName} Live Score`;
  const previewSubject =
    currentPlayerName === "You" ? "You" : currentPlayerName;
  const previewLead =
    currentPlayerName === "You" ? "You are" : `${currentPlayerName} is`;
  const noScoreLead =
    currentPlayerName === "You" ? "You have" : `${currentPlayerName} has`;
  const pagePhase = getPagePhase();

  if (state.roundComplete) {
    elements.scorePreviewHeading.textContent = "Round Complete";
    elements.scorePreviewValue.textContent = "Done";
    elements.scorePreviewLabel.textContent = `Final totals: ${getOverallLeaderText()}.`;
    return;
  }

  elements.scorePreviewHeading.textContent = previewHeading;

  if (pagePhase === "join") {
    elements.scorePreviewValue.textContent = "—";
    elements.scorePreviewLabel.textContent =
      "Join the room to sync your live score and active turn.";
    return;
  }

  if (isRoomLobbyMode()) {
    elements.scorePreviewValue.textContent = "—";
    elements.scorePreviewLabel.textContent = isHostMode()
      ? isLobbyReadyToStart()
        ? "Players are in the lobby. Start the game when everyone is ready."
        : "Open lobby. Waiting for more players before the host can start."
      : "You are in the lobby. Waiting for the host to start the game.";
    return;
  }

  if (state.rollNumber === 0) {
    elements.scorePreviewValue.textContent = "—";
    elements.scorePreviewLabel.textContent = `Roll the ${getCurrentDiceCount()} dice to reveal this ${getHolePar()}-par hole.`;
    return;
  }

  if (state.isRolling || state.isSettling) {
    elements.scorePreviewValue.textContent = "...";
    elements.scorePreviewLabel.textContent = state.isRolling
      ? `${previewLead} rolling now. Score updates when the dice settle.`
      : `${previewSubject} landed the dice. Score is locking in now.`;
    return;
  }

  const outcome = getCurrentOutcome();
  elements.scorePreviewValue.textContent = `${outcome.score}`;
  elements.scorePreviewLabel.textContent = `${outcome.label}: ${outcome.detail}`;
}

function renderStatus() {
  const pagePhase = getPagePhase();
  const isLobby = isRoomLobbyMode();

  elements.holeCounter.textContent = `${state.currentHole}`;
  elements.parCounter.textContent = `${getHolePar()}`;
  if (elements.diceCountLabel) {
    elements.diceCountLabel.textContent = "Dice";
  }
  const diceCountTarget =
    elements.diceCountCounter ||
    document.querySelector(".stage-status-bar .stage-stat:nth-of-type(3) strong");

  if (diceCountTarget) {
    diceCountTarget.textContent = `${getCurrentDiceCount()} dice`;
  }
  elements.currentPlayerLabel.textContent = getPlayerLabel(
    getCurrentPlayer(),
    true,
  );
  elements.rollCounter.textContent = `${state.rollNumber} / ${getRollLimit()}`;
  const heldCount = state.holds.filter(Boolean).length;
  elements.diceHoldHint.textContent =
    state.isRolling || state.isSettling
      ? "Dice are rolling"
      : state.rollNumber === 0
        ? "Roll dice to start the hole"
        : heldCount > 0
          ? hasRollsRemaining()
            ? `${heldCount} held · roll again or bank the score`
            : `${heldCount} held · adjust holds or bank the score`
          : hasRollsRemaining()
            ? "Tap dice to hold, roll again, or bank the score"
            : "No rolls left · bank this score";

  const canControl = canControlFromThisDevice();

  elements.rollButton.disabled =
    state.roundComplete ||
    pagePhase === "join" ||
    isLobby ||
    state.isRolling ||
    state.isSettling ||
    state.isFinalizingRoll ||
    !hasRollsRemaining() ||
    !hasDiceAvailableToRoll() ||
    !canControl;
  elements.scoreButton.disabled =
    pagePhase === "join" || isLobby || !canScoreCurrentHole() || !canControl;
  elements.newHoleButton.disabled =
    state.roundComplete ||
    pagePhase === "join" ||
    isLobby ||
    state.rollNumber === 0 ||
    state.isRolling ||
    state.isSettling ||
    state.isFinalizingRoll ||
    !canControl;

  if (state.roundComplete) {
    elements.scoreButton.textContent = "Round Complete";
  } else if (pagePhase === "join") {
    elements.scoreButton.textContent = "Join Room First";
  } else if (isLobby) {
    elements.scoreButton.textContent = getLobbyControlLabel();
  } else if (state.isFinalizingRoll) {
    elements.scoreButton.textContent = "Posting Final Roll";
  } else if (state.isSettling) {
    elements.scoreButton.textContent = "Dice Settling...";
  } else if (state.isRolling) {
    elements.scoreButton.textContent = "Dice Rolling...";
  } else if (!canControl) {
    elements.scoreButton.textContent = `Waiting on ${getPlayerLabel(getCurrentPlayer(), true)}`;
  } else if (state.rollNumber > 0) {
    elements.scoreButton.textContent = `Bank Score ${getCurrentOutcome().score}`;
  } else {
    elements.scoreButton.textContent = "Roll First";
  }

  const scoreReady =
    !state.roundComplete &&
    pagePhase !== "join" &&
    !isLobby &&
    !state.isRolling &&
    !state.isSettling &&
    !state.isFinalizingRoll &&
    canControl &&
    canScoreCurrentHole();

  elements.scoreButton.classList.toggle("is-score-ready", scoreReady);

  if (pagePhase === "join") {
    elements.rollButton.textContent = "Join to Play";
    return;
  }

  if (isLobby) {
    elements.rollButton.textContent = getLobbyControlLabel();
    return;
  }

  if (state.isRolling) {
    elements.rollButton.textContent = "Dice Rolling...";
    return;
  }

  if (state.isSettling) {
    elements.rollButton.textContent = "Dice Settling...";
    return;
  }

  if (!hasRollsRemaining() && state.rollNumber > 0) {
    elements.rollButton.textContent = "Bank Score to Continue";
    return;
  }

  elements.rollButton.textContent = state.rollNumber > 0 ? "Roll Again" : "Roll Dice";
}

function shouldShowPregameInvitePanel() {
  return false;
}

function renderPregameInvite() {
  const show = shouldShowPregameInvitePanel();
  elements.pregameInvitePanel.hidden = !show;

  if (!show) {
    return;
  }

  const hasRoomCode = Boolean(state.network.roomCode);
  const link = getInviteLink();

  elements.pregameInviteLink.hidden = !hasRoomCode;
  elements.pregameInviteCode.hidden = !hasRoomCode;
  elements.pregameInviteCode.textContent = hasRoomCode
    ? `Room ${state.network.roomCode}`
    : "Room -----";

  if (hasRoomCode) {
    elements.pregameInviteLink.href = link;
    elements.pregameInviteLink.textContent = link;
  } else {
    elements.pregameInviteLink.removeAttribute("href");
    elements.pregameInviteLink.textContent = "";
  }

  if (isConnectingMode()) {
    elements.pregameInviteTitle.textContent = "Creating Your Room";
    elements.pregameInviteNote.textContent =
      "Hang tight. We are getting an invite link ready before the first roll.";
    elements.pregameInviteButton.textContent = "Creating Invite...";
    elements.pregameInviteButton.disabled = true;
    return;
  }

  if (hasRoomCode) {
    elements.pregameInviteTitle.textContent = "Invite Link Ready";
    elements.pregameInviteNote.textContent =
      "Copy the link below and send it to a friend before you tee off.";
    elements.pregameInviteButton.textContent = "Copy Invite Link";
    elements.pregameInviteButton.disabled = false;
    return;
  }

  elements.pregameInviteTitle.textContent = "Invite a Friend";
  elements.pregameInviteNote.textContent =
    "Create a room and copy a join link before the first roll.";
  elements.pregameInviteButton.textContent = "Invite Friend";
  elements.pregameInviteButton.disabled = false;
}

function serializeState() {
  return {
    totalHoles: state.totalHoles,
    maxPlayers: state.maxPlayers,
    currentHole: state.currentHole,
    activePlayerIndex: state.activePlayerIndex,
    players: normalizePlayers().map((player) => ({ ...player })),
    dice: [...state.dice],
    holds: [...state.holds],
    rollNumber: state.rollNumber,
    bonusRolls: state.bonusRolls,
    rollToken: state.rollToken,
    isRolling: state.isRolling,
    isSettling: state.isSettling,
    isDiceBoxRoll: state.isDiceBoxRoll,
    isFinalizingRoll: state.isFinalizingRoll,
    roundComplete: state.roundComplete,
    scorecard: state.scorecard.map((hole) => ({
      holeNumber: hole.holeNumber,
      par: hole.par,
      scores: [...hole.scores],
    })),
    chatMessages: state.network.chatMessages.map((message) => ({ ...message })),
    roomCode: state.network.roomCode,
    gameStarted: state.network.gameStarted,
    resultBannerMessage: state.ui.resultBannerMessage,
    resultBannerTone: state.ui.resultBannerTone,
  };
}

function serializePersistedState() {
  return {
    version: PERSISTED_STATE_VERSION,
    savedAt: Date.now(),
    totalHoles: state.totalHoles,
    maxPlayers: state.maxPlayers,
    currentHole: state.currentHole,
    activePlayerIndex: state.activePlayerIndex,
    players: normalizePlayers().map((player) => ({
      id: player.id,
      name: player.name,
      sessionId: player.sessionId,
      connected: player.connected !== false,
    })),
    dice: [...state.dice],
    holds: [...state.holds],
    rollNumber: state.rollNumber,
    bonusRolls: state.bonusRolls,
    roundComplete: state.roundComplete,
    scorecard: state.scorecard.map((hole) => ({
      holeNumber: hole.holeNumber,
      par: hole.par,
      scores: [...hole.scores],
    })),
    network: {
      mode: state.network.mode,
      roomCode: state.network.roomCode,
      gameStarted: state.network.gameStarted,
      chatMessages: state.network.chatMessages.map((message) => ({ ...message })),
      pendingJoinCode: state.network.pendingJoinCode,
      inviterName: state.network.inviterName,
      clientSessionId: state.network.clientSessionId,
    },
    ui: {
      pendingLocalName: state.ui.pendingLocalName,
    },
    resultBannerMessage: state.ui.resultBannerMessage,
    resultBannerTone: state.ui.resultBannerTone,
  };
}

function persistState() {
  if (typeof window === "undefined") {
    return;
  }

  const snapshot = serializePersistedState();
  writeLocalStorage(LOCAL_STORAGE_STATE_KEY, JSON.stringify(snapshot));
}

function isPristineLocalRoundSnapshot(snapshot) {
  if (!snapshot || snapshot.network?.mode !== "local") {
    return false;
  }

  const hasPostedScores = Array.isArray(snapshot.scorecard)
    ? snapshot.scorecard.some(
        (hole) =>
          Array.isArray(hole?.scores) &&
          hole.scores.some((score) => score != null),
      )
    : false;

  return (
    Number(snapshot.currentHole || 1) === 1 &&
    Number(snapshot.rollNumber || 0) === 0 &&
    !snapshot.roundComplete &&
    (!Array.isArray(snapshot.dice) || snapshot.dice.length === 0) &&
    !snapshot.network?.roomCode &&
    !snapshot.network?.pendingJoinCode &&
    !snapshot.network?.gameStarted &&
    !hasPostedScores
  );
}

function hydratePersistedState() {
  const rawState = readLocalStorage(LOCAL_STORAGE_STATE_KEY);

  if (!rawState) {
    return false;
  }

  let parsedState = null;

  try {
    parsedState = JSON.parse(rawState);
  } catch (error) {
    console.warn(error);
    return false;
  }

  if (!parsedState || parsedState.version !== PERSISTED_STATE_VERSION) {
    return false;
  }

  if (state.network.pendingJoinCode || state.ui.autoJoinInvitePending) {
    const storedLocalPlayer = parsedState.players?.[0];

    if (
      storedLocalPlayer?.name &&
      state.players[0] &&
      state.players[0].name === "Player 1"
    ) {
      state.players[0].name = storedLocalPlayer.name;
    }

    return false;
  }

  if (
    Number(parsedState.totalHoles) !== DEFAULT_TOTAL_HOLES &&
    isPristineLocalRoundSnapshot(parsedState)
  ) {
    const storedLocalPlayer = parsedState.players?.[0];

    if (
      storedLocalPlayer?.name &&
      state.players[0] &&
      state.players[0].name === "Player 1"
    ) {
      state.players[0].name = storedLocalPlayer.name;
    }

    return false;
  }

  state.totalHoles =
    parsedState.totalHoles === 9 || parsedState.totalHoles === 18
      ? parsedState.totalHoles
      : state.totalHoles;
  state.maxPlayers = [2, 3, 4].includes(parsedState.maxPlayers)
    ? parsedState.maxPlayers
    : state.maxPlayers;
  state.network.mode = ["local", "hosting", "joined"].includes(
    parsedState.network?.mode,
  )
    ? parsedState.network.mode
    : "local";
  state.network.clientSessionId =
    parsedState.network?.clientSessionId || state.network.clientSessionId;
  clientSessionSeed = state.network.clientSessionId;
  state.currentHole = Math.max(1, Number(parsedState.currentHole) || 1);
  state.activePlayerIndex = Math.max(
    0,
    Number(parsedState.activePlayerIndex) || 0,
  );
  state.players = normalizePlayers(
    Array.isArray(parsedState.players) && parsedState.players.length
      ? parsedState.players.map((player, index) => ({
          id: player.id || `restored-${index + 1}`,
          name: sanitizeName(player.name || `Player ${index + 1}`),
          sessionId:
            player.sessionId ||
            (index === 0 ? state.network.clientSessionId : undefined),
          connected: player.connected !== false,
        }))
      : createLocalPlayers(1),
  );
  state.dice = Array.isArray(parsedState.dice)
    ? parsedState.dice.map((value) => Number(value) || 1)
    : [];
  state.holds = Array.isArray(parsedState.holds) ? [...parsedState.holds] : [];
  state.rollNumber = Math.max(0, Number(parsedState.rollNumber) || 0);
  state.bonusRolls = Math.max(0, Number(parsedState.bonusRolls) || 0);
  state.rollToken = 0;
  state.isRolling = false;
  state.isSettling = false;
  state.isDiceBoxRoll = false;
  state.isFinalizingRoll = false;
  state.roundComplete = Boolean(parsedState.roundComplete);
  state.scorecard =
    Array.isArray(parsedState.scorecard) && parsedState.scorecard.length
      ? parsedState.scorecard.map((hole, index) => ({
          holeNumber: Number(hole.holeNumber) || index + 1,
          par: Number(hole.par) || DEFAULT_HOLE_PAR,
          scores: Array.isArray(hole.scores)
            ? hole.scores.map((score) =>
                score == null ? null : Number(score) || 0,
              )
            : Array.from({ length: state.players.length }, () => null),
        }))
      : createScorecard(state.totalHoles, state.players.length);
  state.network.roomCode = cleanRoomCode(parsedState.network?.roomCode || "");
  state.network.gameStarted = Boolean(parsedState.network?.gameStarted);
  state.network.chatMessages = normalizeChatMessages(
    parsedState.network?.chatMessages,
  );
  state.network.pendingJoinCode = cleanRoomCode(
    parsedState.network?.pendingJoinCode || "",
  );
  state.network.inviterName = parsedState.network?.inviterName || "";
  state.network.peer = null;
  state.network.hostConn = null;
  state.network.connections = {};
  state.network.localPeerId = isLocalMode() ? "local-1" : "";
  state.network.pendingShareAction = "";
  state.ui.pendingLocalName = parsedState.ui?.pendingLocalName || null;
  state.ui.roomScreen = state.network.pendingJoinCode ? "join" : "start";
  state.ui.invitePanelOpen = false;
  state.ui.managePanelOpen = false;
  state.ui.tutorialOpen = false;
  state.ui.instructionsOpen = false;
  state.ui.resultBannerMessage = parsedState.resultBannerMessage || "";
  state.ui.resultBannerTone = parsedState.resultBannerTone || "";

  if (isHostMode() && state.players[0]) {
    state.players[0].connected = true;
  }

  state.activePlayerIndex = Math.min(
    state.activePlayerIndex,
    Math.max(0, state.players.length - 1),
  );
  state.currentHole = Math.min(
    state.currentHole,
    Math.max(1, state.scorecard.length || state.totalHoles),
  );
  state.holds = normalizeHolds(
    state.holds,
    state.dice.length || getCurrentDiceCount(),
  );

  return true;
}

function broadcastSnapshot() {
  if (!isHostMode()) {
    return;
  }

  Object.values(state.network.connections).forEach((conn) => {
    sendSnapshotToConnection(conn);
  });
}

function sendSnapshotToConnection(conn) {
  if (!conn?.open) {
    return;
  }

  conn.send({
    type: "snapshot",
    snapshot: serializeState(),
  });
}

function getActiveLobbyNameDraft() {
  if (!(document.activeElement instanceof HTMLInputElement)) {
    return null;
  }

  if (!document.activeElement.classList.contains("player-name-edit-input")) {
    return null;
  }

  const index = Number(document.activeElement.dataset.playerName);
  const player = state.players[index];

  if (
    !player ||
    player.id !== state.network.localPeerId ||
    !isRoomLobbyMode()
  ) {
    return null;
  }

  return {
    index,
    playerId: player.id,
    value: document.activeElement.value,
  };
}

function applySnapshot(snapshot) {
  const previousRollToken = state.rollToken;
  const previousGameStarted = state.network.gameStarted;
  const previousDice = [...state.dice];
  const diceCount = getSnapshotDiceCount(snapshot);
  const activeLobbyNameDraft = getActiveLobbyNameDraft();
  const nextPlayers = snapshot.players.map((player) => ({
    ...player,
    sessionId: player.sessionId || undefined,
    connected: player.connected !== false,
  }));

  if (activeLobbyNameDraft) {
    const draftPlayer = nextPlayers[activeLobbyNameDraft.index];

    if (draftPlayer && draftPlayer.id === activeLobbyNameDraft.playerId) {
      draftPlayer.name = sanitizeName(
        activeLobbyNameDraft.value,
        draftPlayer.name || "Player",
      );
    }
  }

  state.totalHoles = snapshot.totalHoles;
  state.maxPlayers = snapshot.maxPlayers;
  state.currentHole = snapshot.currentHole;
  state.activePlayerIndex = snapshot.activePlayerIndex;
  state.players = normalizePlayers(nextPlayers);
  state.dice = [...snapshot.dice];
  state.holds = normalizeHolds(snapshot.holds, diceCount);
  state.rollNumber = snapshot.rollNumber;
  state.bonusRolls = snapshot.bonusRolls || 0;
  state.rollToken = snapshot.rollToken || 0;
  state.isRolling = Boolean(snapshot.isRolling);
  state.isSettling = Boolean(snapshot.isSettling);
  state.isDiceBoxRoll = Boolean(snapshot.isDiceBoxRoll) && canUseDiceBoxRolls();
  state.isFinalizingRoll = Boolean(snapshot.isFinalizingRoll);
  state.roundComplete = snapshot.roundComplete;
  state.scorecard = snapshot.scorecard.map((hole) => ({
    holeNumber: hole.holeNumber,
    par: hole.par,
    scores: [...hole.scores],
  }));
  state.network.roomCode = snapshot.roomCode;
  state.network.gameStarted = Boolean(snapshot.gameStarted);
  state.network.chatMessages = normalizeChatMessages(snapshot.chatMessages);
  state.ui.resultBannerMessage = snapshot.resultBannerMessage || "";
  state.ui.resultBannerTone = snapshot.resultBannerTone || "";

  const isNewObservedRoll =
    state.isRolling &&
    state.rollToken &&
    state.rollToken !== previousRollToken &&
    !state.isDiceBoxRoll;

  if (isNewObservedRoll) {
    activeRollStartFaces =
      previousDice.length === diceCount
        ? previousDice
        : Array.from({ length: diceCount }, (_, index) => {
            const seed = state.rollToken * 17 + (index + 1) * 13;
            return ((seed % 6) + 6) % 6 + 1;
          });
    activeRollFrameFaces = [...activeRollStartFaces];
    startRollFaceAnimation(state.dice);
  }

  if (previousGameStarted !== state.network.gameStarted) {
    state.ui.invitePanelOpen = !state.network.gameStarted;
    state.ui.roomScreen = "joined";
  }

  if (!state.isRolling && !state.isSettling) {
    activeRollStartFaces = [];
    activeRollFrameFaces = [];
    clearRollFaceTimer();
  }

  if (!state.isRolling) {
    activeDiceBoxRollToken = 0;
    hideDiceBoxLayer();
  } else if (
    state.isDiceBoxRoll &&
    state.rollToken &&
    state.rollToken !== previousRollToken
  ) {
    void playObservedDiceBoxRoll(snapshot);
  }
}

function render() {
  state.players = normalizePlayers();
  renderPageHierarchy();
  tutorialModule.render();
  renderResultBanner();
  renderHeaderProfile();
  renderLiveRoomSummary();
  renderLiveRoundCard();
  renderPlayerSummary();
  renderRoomControls();
  renderSetupPreview();
  renderMatchBanner();
  renderPlayerArea();
  renderScorecard();
  renderRoomChat();
  renderDice();
  renderDiceMeta();
  renderPregameInvite();
  renderScorePreview();
  renderStatus();
  renderRoundRecap();
  updateShareControls();

  if (isHostMode()) {
    broadcastSnapshot();
  }

  persistState();
}

function resetRoundState() {
  state.currentHole = 1;
  state.activePlayerIndex = 0;
  state.roundComplete = false;
  state.scorecard = createScorecard(state.totalHoles, state.players.length);
  resetTurnState();
}

function prepareTurn(message, tone = "") {
  resetTurnState();
  setResultBanner(message, tone);
  render();
}

function enterRoomLobby(message) {
  resetRoundState();
  state.network.gameStarted = false;
  state.ui.invitePanelOpen = true;
  state.ui.roomScreen = isHostMode() ? "host" : "joined";
  setResultBanner(
    message ||
      `Room ${state.network.roomCode} is open. Waiting in the lobby for players to join.`,
  );
  render();
}

function startRound(message) {
  resetRoundState();

  if (!isLocalMode()) {
    state.network.gameStarted = true;
    state.ui.invitePanelOpen = false;
    state.ui.roomScreen = isHostMode() ? "host" : "joined";
  }

  setResultBanner(
    message ||
      `${getPlayerAction(getCurrentPlayer(), "opens", "open")} hole 1. Roll when ready.`,
  );
  render();
}

function advanceTurn(outcome, { diceValues = [] } = {}) {
  clearRollTimers();
  state.isRolling = false;
  state.isSettling = false;
  state.isFinalizingRoll = false;
  const playerName = getPlayerLabel(getCurrentPlayer());
  const hole = getCurrentHoleRecord();
  const scoredWithText = diceValues.length
    ? ` with ${diceValues.join(", ")}`
    : "";

  hole.scores[state.activePlayerIndex] = outcome.score;

  if (state.activePlayerIndex < state.players.length - 1) {
    state.activePlayerIndex += 1;
    prepareTurn(
      `${playerName} posted ${outcome.score}${scoredWithText} on hole ${state.currentHole}. ${getPlayerLead(getCurrentPlayer())} up next.`,
      outcome.kind === "miss" ? "warn" : "good",
    );
    return;
  }

  if (state.currentHole < state.totalHoles) {
    state.currentHole += 1;
    state.activePlayerIndex = 0;
    prepareTurn(
      `Hole ${state.currentHole - 1} is in the books. ${playerName} closed it with ${outcome.score}${scoredWithText}. ${getPlayerAction(getCurrentPlayer(), "tees off", "tee off")} on hole ${state.currentHole}.`,
      outcome.kind === "miss" ? "warn" : "good",
    );
    return;
  }

  state.roundComplete = true;
  resetTurnState();
  setResultBanner(
    `${playerName} closed the round with ${outcome.score}${scoredWithText}. Final totals: ${getOverallLeaderText()}.`,
    outcome.kind === "miss" ? "warn" : "good",
  );
  render();
}

function resolvePostRollBanner(rollNumber) {
  const earnedStraightBonus = isStraight(state.dice);

  if (earnedStraightBonus) {
    state.bonusRolls += 1;
  }

  const rollLimit = getRollLimit();
  const playerName = getPlayerLabel(getCurrentPlayer());

  if (rollNumber >= rollLimit) {
    const finalOutcome = getTakeableOutcome(state.dice, state.rollNumber);
    setResultBanner(
      `${playerName} finished roll ${rollNumber} with ${state.dice.join(", ")}. Final score is ${finalOutcome.score}. Bank Score ${finalOutcome.score} to post it.`,
      finalOutcome.kind === "miss" ? "warn" : "good",
    );
    render();
    return;
  }

  const outcome = getTakeableOutcome(state.dice, state.rollNumber);

  if (outcome.kind !== "miss") {
    setResultBanner(
      earnedStraightBonus
        ? `${playerName} rolled a straight with ${state.dice.join(", ")} and earned a free roll. Current score showing is ${outcome.score}. Bank it now or use roll ${state.rollNumber + 1} of ${rollLimit} to chase better.`
        : `${playerName} is showing ${outcome.score} with ${state.dice.join(", ")}. Bank it now or use roll ${state.rollNumber + 1} to chase better.`,
      "good",
    );
  } else {
    setResultBanner(
      earnedStraightBonus
        ? `${playerName} rolled a straight with ${state.dice.join(", ")} and earned a free roll. ${outcome.detail} Use roll ${state.rollNumber + 1} of ${rollLimit} if you want another shot.`
        : `${playerName} rolled ${state.dice.join(", ")}. ${outcome.detail}`,
      earnedStraightBonus ? "good" : "",
    );
  }

  render();
}

function settleRoll(finalDice, rollNumber) {
  clearRollTimers();
  state.dice = [...finalDice];
  state.holds = normalizeHolds();
  state.isRolling = false;
  state.isSettling = true;
  state.isDiceBoxRoll = false;
  render();

  settleAnimationTimeout = window.setTimeout(() => {
    settleAnimationTimeout = null;
    state.isSettling = false;
    activeRollStartFaces = [];
    activeRollFrameFaces = [];
    resolvePostRollBanner(rollNumber);
  }, SETTLE_ANIMATION_MS);
}

function startRollAnimation(finalDice, rollNumber) {
  clearRollTimers();
  state.isRolling = true;
  state.isSettling = false;
  state.isDiceBoxRoll = false;
  state.isFinalizingRoll = false;
  state.holds = normalizeHolds();
  activeRollStartFaces = state.dice.length
    ? [...state.dice]
    : finalDice.map(() => randomDie());
  state.dice = [...finalDice];
  render();
  startRollFaceAnimation(finalDice);

  rollAnimationTimeout = window.setTimeout(() => {
    rollAnimationTimeout = null;
    settleRoll(finalDice, rollNumber);
  }, ROLL_ANIMATION_TOTAL_MS + ROLL_STAGGER_MAX_MS);
}

function finalizePostRollState(rollNumber) {
  resolvePostRollBanner(rollNumber);
}

async function performRoll() {
  if (
    isRoomLobbyMode() ||
    state.roundComplete ||
    state.isRolling ||
    state.isSettling ||
    state.isFinalizingRoll ||
    !hasRollsRemaining() ||
    !hasDiceAvailableToRoll()
  ) {
    return;
  }

  const nextRollNumber = state.rollNumber + 1;
  const rerollIndexes = getCurrentRollIndexes();
  const shouldUseDiceBoxRoll = canUseDiceBoxRolls();
  state.rollNumber = nextRollNumber;
  state.rollToken += 1;
  state.holds = normalizeHolds();
  state.isRolling = true;
  state.isSettling = false;
  state.isFinalizingRoll = false;
  state.isDiceBoxRoll = shouldUseDiceBoxRoll;
  activeDiceBoxRollToken = shouldUseDiceBoxRoll ? state.rollToken : 0;
  render();

  let rollData = null;
  if (shouldUseDiceBoxRoll) {
    try {
      rollData = await runDiceBoxRoll(rerollIndexes, getCurrentDiceCount());
    } catch (error) {
      console.error("dice-box roll failed, using fallback animation.", error);
      rollData = null;
    }
  }

  if (!rollData) {
    const finalDice = rollWithHolds();
    startRollAnimation(finalDice, nextRollNumber);
    return;
  }

  const merged = mergeDiceBoxRollResults(
    rollData.results,
    rollData.indexes,
    getCurrentDiceCount(),
  );
  diceBoxRolls = merged.rolls;
  state.dice = [...merged.dice];
  state.holds = normalizeHolds();
  state.isRolling = false;
  state.isSettling = false;
  state.isDiceBoxRoll = false;
  finalizePostRollState(nextRollNumber);
}

function performScore() {
  if (isRoomLobbyMode() || !canScoreCurrentHole()) {
    return;
  }

  advanceTurn(getCurrentOutcome(), { diceValues: [...state.dice] });
}

function performRestartTurn() {
  if (
    isRoomLobbyMode() ||
    state.roundComplete ||
    state.rollNumber === 0 ||
    state.isRolling ||
    state.isSettling ||
    state.isFinalizingRoll
  ) {
    return;
  }

  prepareTurn(
    `${getPlayerPossessive(getCurrentPlayer())} turn on hole ${state.currentHole} restarted.`,
  );
}

function performToggleHold(index) {
  if (
    isRoomLobbyMode() ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= getCurrentDiceCount() ||
    state.rollNumber === 0 ||
    state.roundComplete ||
    state.isRolling ||
    state.isSettling ||
    state.isFinalizingRoll ||
    !canToggleCurrentDiceHolds()
  ) {
    return;
  }

  state.holds = normalizeHolds();
  state.holds[index] = !state.holds[index];
  render();
}

function handleRemoteAction(peerId, action, payload = {}) {
  if (!isHostMode()) {
    return;
  }

  if (getCurrentPlayer()?.id !== peerId) {
    sendSnapshotToConnection(state.network.connections[peerId]);
    return;
  }

  switch (action) {
    case "roll":
      performRoll();
      break;
    case "score":
      performScore();
      break;
    case "restart-turn":
      performRestartTurn();
      break;
    case "toggle-hold":
      if (typeof payload.index === "number") {
        performToggleHold(payload.index);
      }
      break;
    default:
      break;
  }
}

function sendToHost(message) {
  if (!isClientMode() || !state.network.hostConn?.open) {
    return;
  }

  state.network.hostConn.send(message);
}

function sendActionToHost(action, payload = {}) {
  sendToHost({
    type: "action",
    action,
    payload,
  });
}

function sendRenameToHost(name) {
  sendToHost({
    type: "rename",
    name,
  });
}

function sendRenamePreviewToHost(name) {
  sendToHost({
    type: "rename-preview",
    name,
  });
}

function sendChatToHost(text) {
  sendToHost({
    type: "chat",
    text,
  });
}

function handleRoomChatSubmit(input) {
  const text = sanitizeChatText(input?.value);

  if (!text || !canSendRoomChat()) {
    return;
  }

  if (isClientMode()) {
    sendChatToHost(text);
    clearRoomChatDrafts();
    return;
  }

  if (!isHostMode()) {
    return;
  }

  const localPlayer = getLocalPlayerRecord();

  if (
    !appendChatMessage({
      sessionId: localPlayer?.sessionId || state.network.clientSessionId,
      playerId: localPlayer?.id || state.network.localPeerId,
      name: localPlayer?.name || "Host",
      text,
    })
  ) {
    return;
  }

  clearRoomChatDrafts();
  render();
}

function dispatchTurnAction(action, performLocalAction, payload = {}) {
  if (!canControlFromThisDevice()) {
    return;
  }

  if (isClientMode()) {
    sendActionToHost(action, payload);
    return;
  }

  performLocalAction();
}

function handleRollRequest() {
  dispatchTurnAction("roll", performRoll);
}

function handleScoreRequest() {
  dispatchTurnAction("score", performScore);
}

function handleRestartTurnRequest() {
  dispatchTurnAction("restart-turn", performRestartTurn);
}

function handleDieToggleRequest(index) {
  dispatchTurnAction("toggle-hold", () => performToggleHold(index), { index });
}

function handleIncomingConnection(conn) {
  conn.on("data", (data) => {
    if (!data || typeof data !== "object") {
      return;
    }

    if (data.type === "join") {
      const joiningSessionId =
        data.sessionId || `guest-session-${state.players.length + 1}`;
      const reconnectingPlayerIndex = state.players.findIndex(
        (player) => player.sessionId === joiningSessionId,
      );
      const reconnectingPlayer =
        reconnectingPlayerIndex >= 0
          ? state.players[reconnectingPlayerIndex]
          : null;

      if (state.network.gameStarted && reconnectingPlayerIndex === -1) {
        conn.send({
          type: "error",
          message: `Room ${state.network.roomCode} is already in progress. Ask the host to open a new lobby after this round.`,
        });
        conn.close();
        return;
      }

      if (
        reconnectingPlayerIndex === -1 &&
        getConnectedPlayerCount() >= state.maxPlayers
      ) {
        conn.send({
          type: "error",
          message: `Room ${state.network.roomCode} is full.`,
        });
        conn.close();
        return;
      }

      state.network.connections[conn.peer] = conn;

      if (reconnectingPlayer) {
        const previousPeerId = reconnectingPlayer.id;
        const existingConnection = state.network.connections[previousPeerId];

        if (existingConnection && existingConnection !== conn) {
          try {
            existingConnection.close();
          } catch (error) {
            console.warn(error);
          }
        }

        delete state.network.connections[previousPeerId];
        reconnectingPlayer.id = conn.peer;
        const requestedName = sanitizeName(
          data.name || reconnectingPlayer.name,
          reconnectingPlayer.name || "Player",
        );
        reconnectingPlayer.name =
          requestedName.toLowerCase() === reconnectingPlayer.name.toLowerCase()
            ? reconnectingPlayer.name
            : makeUniqueName(requestedName, state.players, previousPeerId);
        reconnectingPlayer.sessionId = joiningSessionId;
        reconnectingPlayer.connected = true;

        setResultBanner(
          state.network.gameStarted
            ? `${reconnectingPlayer.name} rejoined room ${state.network.roomCode}.`
            : `${reconnectingPlayer.name} rejoined the lobby in room ${state.network.roomCode}.`,
          "good",
        );
        render();
        return;
      }

      const joiningName = makeUniqueName(
        data.name || `Player ${state.players.length + 1}`,
        state.players,
      );
      state.players.push({
        id: conn.peer,
        name: joiningName,
        sessionId: joiningSessionId,
        connected: true,
      });

      enterRoomLobby(
        `${joiningName} joined room ${state.network.roomCode}. ${getConnectedPlayerCount()}/${state.maxPlayers} players are now in the lobby.`,
      );
      return;
    }

    if (data.type === "rename") {
      if (state.network.gameStarted) {
        return;
      }

      const playerIndex = state.players.findIndex(
        (player) => player.id === conn.peer,
      );

      if (playerIndex === -1) {
        return;
      }

      const nextName = makeUniqueName(
        data.name || state.players[playerIndex].name,
        state.players,
        conn.peer,
      );

      if (state.players[playerIndex].name === nextName) {
        return;
      }

      state.players[playerIndex].name = nextName;
      render();
      return;
    }

    if (data.type === "rename-preview") {
      if (state.network.gameStarted) {
        return;
      }

      const playerIndex = state.players.findIndex(
        (player) => player.id === conn.peer,
      );

      if (playerIndex === -1) {
        return;
      }

      const previewName = sanitizeName(
        data.name,
        state.players[playerIndex].name || `Player ${playerIndex + 1}`,
      );

      if (state.players[playerIndex].name === previewName) {
        return;
      }

      state.players[playerIndex].name = previewName;
      render();
      return;
    }

    if (data.type === "chat") {
      const player = state.players.find((entry) => entry.id === conn.peer);

      if (!player) {
        return;
      }

      if (
        !appendChatMessage({
          sessionId: player.sessionId,
          playerId: player.id,
          name: player.name,
          text: data.text,
        })
      ) {
        return;
      }

      render();
      return;
    }

    if (data.type === "action") {
      handleRemoteAction(conn.peer, data.action, data.payload);
    }
  });

  conn.on("close", () => {
    if (!isHostMode()) {
      return;
    }

    delete state.network.connections[conn.peer];

    const leavingPlayerIndex = state.players.findIndex(
      (player) => player.id === conn.peer,
    );
    const leavingPlayer = state.players.find(
      (player) => player.id === conn.peer,
    );

    if (!leavingPlayer) {
      render();
      return;
    }

    if (!state.network.gameStarted) {
      state.players = state.players.filter((player) => player.id !== conn.peer);
      state.scorecard = state.scorecard.map((hole) => ({
        ...hole,
        scores: hole.scores.filter((_, index) => index !== leavingPlayerIndex),
      }));
      enterRoomLobby(
        `${leavingPlayer.name} left room ${state.network.roomCode}. Back in the lobby for the remaining players.`,
      );
      return;
    }

    state.players[leavingPlayerIndex].connected = false;
    setResultBanner(
      leavingPlayerIndex === state.activePlayerIndex
        ? `${leavingPlayer.name} disconnected from room ${state.network.roomCode}. The turn is waiting for them to reconnect.`
        : `${leavingPlayer.name} disconnected from room ${state.network.roomCode}. ${getPlayerAction(getCurrentPlayer(), "is still up", "are still up")} on hole ${state.currentHole}.`,
      "warn",
    );
    render();
  });
}

function openHostRoom(roomCode, { resume = false, attempt = 0 } = {}) {
  if (!resume) {
    commitPendingLocalName();
  }

  const nextRoomCode = roomCode || generateRoomCode();
  const peer = new window.Peer(getPeerIdFromCode(nextRoomCode));
  let opened = false;

  state.network.mode = "connecting";
  if (!resume) {
    state.network.gameStarted = false;
    state.network.chatMessages = [];
  }
  state.network.hostConn = null;
  state.network.pendingJoinCode = "";
  state.ui.roomScreen = "host";
  render();

  peer.on("open", (peerId) => {
    opened = true;
    state.network.peer = peer;
    state.network.mode = "hosting";
    state.network.roomCode = nextRoomCode;
    state.network.localPeerId = peerId;
    state.network.connections = {};

    peer.on("connection", handleIncomingConnection);

    if (resume) {
      state.players = normalizePlayers(state.players).map((player, index) => ({
        ...player,
        id:
          player.sessionId === state.network.clientSessionId || index === 0
            ? peerId
            : player.id,
        connected:
          player.sessionId === state.network.clientSessionId || index === 0,
      }));
      setResultBanner(
        state.network.gameStarted
          ? `Room ${nextRoomCode} reopened. Waiting for players to reconnect.`
          : `Room ${nextRoomCode} restored. Share it again or wait for players to reconnect.`,
        "good",
      );
      render();
    } else {
      state.players = [
        {
          id: peerId,
          name: makeUniqueName(state.players[0]?.name || "Host"),
          sessionId: state.network.clientSessionId,
          connected: true,
        },
      ];
      state.network.chatMessages = [];
      enterRoomLobby(
        `Room ${nextRoomCode} is live. Share the code, then start the game when everyone is ready.`,
      );
    }

    flushPendingShareAction();
  });

  peer.on("error", (error) => {
    if (!opened && error.type === "unavailable-id" && attempt < 5) {
      try {
        peer.destroy();
      } catch (destroyError) {
        console.warn(destroyError);
      }

      openHostRoom(resume ? nextRoomCode : null, {
        resume,
        attempt: attempt + 1,
      });
      return;
    }

    restoreLocalState("Room creation failed. Back to solo play.");
  });
}

function createHostRoom(attempt = 0) {
  openHostRoom(null, { resume: false, attempt });
}

async function copyTextWithFeedback(
  text,
  successMessage,
  fallbackMessage,
  target = "network",
) {
  try {
    await navigator.clipboard.writeText(text);

    if (target === "share") {
      elements.shareNote.textContent = successMessage;
      if (!elements.pregameInvitePanel.hidden) {
        elements.pregameInviteNote.textContent = successMessage;
      }
    } else {
      elements.networkNote.textContent = successMessage;
    }
  } catch (error) {
    if (target === "share") {
      elements.shareNote.textContent = fallbackMessage;
      if (!elements.pregameInvitePanel.hidden) {
        elements.pregameInviteNote.textContent = fallbackMessage;
      }
    } else {
      elements.networkNote.textContent = fallbackMessage;
    }
  }
}

async function runRoomShareAction(action) {
  if (action === "copy-code") {
    await copyTextWithFeedback(
      state.network.roomCode,
      `Room ${state.network.roomCode} copied. Send it and they can join right away.`,
      `Room ${state.network.roomCode} is live. Copy it manually if your browser blocks clipboard access.`,
    );
    return;
  }

  if (action === "copy-link") {
    const link = getInviteLink();
    await copyTextWithFeedback(
      link,
      state.network.roomCode
        ? `Room link copied. Send it out and players will land with code ${state.network.roomCode} ready.`
        : "Game link copied. Send it to someone to jump in fast.",
      "Your browser blocked clipboard access. Use the visible link above to copy manually.",
      "share",
    );
    return;
  }

  if (action === "native-share" && canUseNativeShare()) {
    try {
      await navigator.share({
        title: "PAR Dice Golf",
        text: state.network.roomCode
          ? `Join my PAR room with code ${state.network.roomCode}.`
          : `Jump into this ${state.totalHoles}-hole PAR setup.`,
        url: getInviteLink(),
      });

      elements.shareNote.textContent = state.network.roomCode
        ? `Share sheet opened for room ${state.network.roomCode}.`
        : "Share sheet opened for your game link.";
    } catch (error) {
      if (error?.name !== "AbortError") {
        elements.shareNote.textContent =
          "Unable to open the share sheet here. Use Copy Link instead.";
      }
    }
  }
}

function queueRoomShareAction(action) {
  state.network.pendingShareAction = action;
  createHostRoom();
}

function flushPendingShareAction() {
  const action = state.network.pendingShareAction;

  if (!action || !state.network.roomCode) {
    return;
  }

  state.network.pendingShareAction = "";
  void runRoomShareAction(action);
}

function queueRoomShareActionIfNeeded(action) {
  if (!state.network.roomCode && isLocalMode() && supportsOnlineRooms()) {
    queueRoomShareAction(action);
    return true;
  }

  return false;
}

function connectToRoom(code) {
  if (!supportsOnlineRooms()) {
    render();
    return;
  }

  commitPendingLocalName();

  const joinCode = cleanRoomCode(code);

  if (!joinCode) {
    render();
    return;
  }

  const peer = new window.Peer();
  state.network.mode = "connecting";
  state.network.gameStarted = false;
  state.network.chatMessages = [];
  state.network.pendingJoinCode = joinCode;
  state.ui.roomScreen = "join";
  render();

  peer.on("open", (peerId) => {
    const conn = peer.connect(getPeerIdFromCode(joinCode), { reliable: true });

    state.network.peer = peer;
    state.network.hostConn = conn;
    state.network.localPeerId = peerId;

    conn.on("open", () => {
      state.network.mode = "joined";
      state.network.roomCode = joinCode;
      state.network.pendingJoinCode = "";
      state.network.gameStarted = false;
      state.ui.roomScreen = "joined";
      conn.send({
        type: "join",
        name: sanitizeName(getLocalPlayerRecord()?.name || "Player 1"),
        sessionId: state.network.clientSessionId,
      });
      render();
    });

    conn.on("data", (data) => {
      if (!data || typeof data !== "object") {
        return;
      }

      if (data.type === "snapshot") {
        applySnapshot(data.snapshot);
        render();
      }

      if (data.type === "error") {
        restoreLocalState(data.message || "Unable to join that room.");
      }
    });

    conn.on("close", () => {
      restoreLocalState("The host disconnected. Back to solo play.");
    });

    conn.on("error", () => {
      restoreLocalState("The room connection failed. Back to solo play.");
    });
  });

  peer.on("error", () => {
    restoreLocalState("Unable to connect to that room. Back to solo play.");
  });
}

function handleRoomButton() {
  if (!supportsOnlineRooms() || !isLocalMode()) {
    render();
    return;
  }

  createHostRoom();
}

function handleStartHostedGame() {
  if (
    !isHostMode() ||
    state.network.gameStarted ||
    getConnectedPlayerCount() < 2 ||
    isConnectingMode()
  ) {
    render();
    return;
  }

  startRound(
    `${getConnectedPlayerCount()} players are locked in. ${getPlayerAction(getCurrentPlayer(), "opens", "open")} hole 1.`,
  );
}

function handleJoinRoom() {
  if (!isLocalMode()) {
    return;
  }

  const code = cleanRoomCode(
    elements.joinCodeInput.value || state.network.pendingJoinCode,
  );

  if (!code) {
    return;
  }

  connectToRoom(code);
}

async function handleCopyRoomCode() {
  if (!state.network.roomCode) {
    queueRoomShareActionIfNeeded("copy-code");
    return;
  }

  await runRoomShareAction("copy-code");
}

async function handleCopyGameLink() {
  if (queueRoomShareActionIfNeeded("copy-link")) {
    return;
  }

  await runRoomShareAction("copy-link");
}

async function handlePregameInviteAction() {
  if (!supportsOnlineRooms() || isClientMode() || hasRoundActivity()) {
    return;
  }

  if (queueRoomShareActionIfNeeded("copy-link")) {
    return;
  }

  if (state.network.roomCode) {
    await runRoomShareAction("copy-link");
  }
}

async function handleShareLink() {
  if (!canUseNativeShare()) {
    return;
  }

  if (queueRoomShareActionIfNeeded("native-share")) {
    return;
  }

  await runRoomShareAction("native-share");
}

function focusPrimarySurface() {
  state.ui.invitePanelOpen = false;
  state.ui.managePanelOpen = false;
  state.ui.tutorialOpen = false;
  state.ui.instructionsOpen = false;
  render();
  elements.diceFocusStack?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function focusLeaderboard() {
  elements.teeSheetPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openRoomSurface() {
  if (shouldForceRoomOverlay(getPagePhase())) {
    render();
    return;
  }

  state.ui.invitePanelOpen = true;
  state.ui.managePanelOpen = false;
  state.ui.tutorialOpen = false;
  state.ui.instructionsOpen = false;
  state.ui.roomScreen = isHostMode()
    ? "host"
    : isClientMode()
      ? "joined"
      : state.network.pendingJoinCode || getPagePhase() === "join"
        ? "join"
        : "start";
  render();
}

function handleInvitePanelToggle() {
  if (shouldForceRoomOverlay(getPagePhase())) {
    return;
  }

  state.ui.invitePanelOpen = !state.ui.invitePanelOpen;

  if (state.ui.invitePanelOpen) {
    state.ui.managePanelOpen = false;
    state.ui.roomScreen =
      state.network.pendingJoinCode || getPagePhase() === "join"
        ? "join"
        : "start";
  }

  render();
}

function handleManagePanelToggle() {
  if (shouldForceRoomOverlay(getPagePhase()) || isClientMode()) {
    return;
  }

  state.ui.managePanelOpen = !state.ui.managePanelOpen;

  if (state.ui.managePanelOpen) {
    state.ui.invitePanelOpen = false;
  }

  render();
}

function openTutorial({ reset = false } = {}) {
  if (reset) {
    tutorialModule.reset();
  }

  rememberOverlayFocusTarget();
  blurActiveElementInside(
    elements.instructionsOverlay,
    elements.setupOverlay,
    elements.roomOverlay,
    elements.tutorialOverlay,
  );
  state.ui.tutorialOpen = true;
  state.ui.invitePanelOpen = false;
  state.ui.managePanelOpen = false;
  state.ui.instructionsOpen = false;
  render();
  focusOverlayEntry("tutorial");
}

function handleTutorialToggle() {
  if (state.ui.tutorialOpen) {
    closeOverlay("tutorial");
    return;
  }

  openTutorial();
}

function handleInstructionsToggle() {
  const shouldOpen = !state.ui.instructionsOpen;

  if (shouldOpen) {
    rememberOverlayFocusTarget();
    blurActiveElementInside(
      elements.tutorialOverlay,
      elements.setupOverlay,
      elements.roomOverlay,
      elements.instructionsOverlay,
    );
    state.ui.instructionsOpen = true;
    state.ui.invitePanelOpen = false;
    state.ui.managePanelOpen = false;
    state.ui.tutorialOpen = false;
    render();
    focusOverlayEntry("instructions");
    return;
  }

  overlayFocusReturnTarget = null;
  state.ui.instructionsOpen = false;
  render();
}

function closeOverlay(kind) {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  if (kind === "room" && !shouldForceRoomOverlay(getPagePhase())) {
    state.ui.invitePanelOpen = false;
    if (isLocalMode() && !state.network.pendingJoinCode) {
      state.ui.roomScreen = "start";
    }
  }

  if (kind === "setup") {
    state.ui.managePanelOpen = false;
  }

  if (kind === "tutorial") {
    state.ui.tutorialOpen = false;
  }

  if (kind === "instructions") {
    state.ui.instructionsOpen = false;
  }

  render();

  if (kind === "tutorial" || kind === "instructions") {
    restoreOverlayFocus(kind);
  }
}

function handleOpenJoinPanel() {
  state.ui.roomScreen = "join";
  state.ui.invitePanelOpen = true;
  render();
}

function handleBackToRoomStart() {
  state.network.pendingJoinCode = "";
  state.ui.roomScreen = "start";
  state.ui.invitePanelOpen = true;
  elements.joinCodeInput.value = "";
  render();
}

function handleLeaveRoom() {
  restoreLocalState("Left the room. Solo play is ready.");
}

function handleRoundChange(event) {
  if (isClientMode()) {
    return;
  }

  const button = event.target.closest("[data-round]");

  if (!button) {
    return;
  }

  state.totalHoles = Number(button.dataset.round);
  if (isHostMode() && !state.network.gameStarted) {
    enterRoomLobby(
      `Lobby updated to ${state.totalHoles} holes. Start the game when everyone is ready.`,
    );
    return;
  }

  startRound();
}

function handlePlayerCountChange(event) {
  if (!isLocalMode()) {
    return;
  }

  const button = event.target.closest("[data-players]");

  if (!button) {
    return;
  }

  state.maxPlayers = Number(button.dataset.players);
  if (isHostMode() && !state.network.gameStarted) {
    enterRoomLobby(
      `Lobby updated to ${state.maxPlayers} seats. Waiting for players to join.`,
    );
    return;
  }

  startRound();
}

function applyPlayerNameChange(input, { commit = false } = {}) {
  const index = Number(input.dataset.playerName);
  const player = state.players[index];

  if (!player) {
    return;
  }

  if (isClientMode()) {
    if (!isRoomLobbyMode() || player.id !== state.network.localPeerId) {
      return;
    }

    if (!commit) {
      player.name = sanitizeName(input.value, player.name || "Player");
      render();
      sendRenamePreviewToHost(player.name);
      return;
    }

    player.name = sanitizeName(input.value, player.name || "Player");
    input.value = player.name;
    render();
    sendRenameToHost(player.name);
    return;
  }

  const canEditLocalName =
    isLocalMode() || (isHostMode() && player.id === state.network.localPeerId);

  if (!canEditLocalName) {
    return;
  }

  if (!commit && isOverlayNameDraftInput(input)) {
    state.ui.pendingLocalName = input.value;
    return;
  }

  if (commit && isOverlayNameDraftInput(input)) {
    state.ui.pendingLocalName = null;
    state.players[index].name = sanitizeName(
      input.value,
      state.players[index].name || `Player ${index + 1}`,
    );
    input.value = state.players[index].name;
    render();
    return;
  }

  if (!commit && input.classList.contains("player-name-edit-input")) {
    player.name = sanitizeName(input.value, player.name || "Player");
    render();
    return;
  }

  state.players[index].name = makeUniqueName(
    input.value,
    state.players,
    state.players[index].id,
  );
  input.value = state.players[index].name;
  render();
}

function handlePlayerNameInput(event) {
  const input = event.target.closest("[data-player-name]");

  if (!input) {
    return;
  }

  applyPlayerNameChange(input, { commit: false });
}

function handlePlayerNameCommit(event) {
  const input = event.target.closest("[data-player-name]");

  if (!input) {
    return;
  }

  applyPlayerNameChange(input, { commit: true });
}

function applyInviteParams() {
  const params = new URLSearchParams(window.location.search);
  const joinCode = cleanRoomCode(params.get("join") || "");
  const holes = Number(params.get("holes"));
  const players = Number(params.get("players"));
  const from = params.get("from");

  if (holes === 9 || holes === 18) {
    state.totalHoles = holes;
  }

  if ([2, 3, 4].includes(players)) {
    state.maxPlayers = players;
    state.players = createLocalPlayers(1, [
      state.players[0]?.name || "Player 1",
    ]);
  }

  if (from) {
    state.network.inviterName = from;
  }

  if (joinCode) {
    const currentName = state.players[0]?.name || "Player 1";
    const shouldUseJoinerName = currentName === "Player 1";

    if (shouldUseJoinerName) {
      state.players = createLocalPlayers(1, [from ? "Guest" : "Player 2"]);
    }

    state.network.pendingJoinCode = joinCode;
    state.ui.autoJoinInvitePending = true;
    state.ui.roomScreen = "join";
    elements.joinCodeInput.value = joinCode;
  }
}

function maybeAutoJoinInvite() {
  const joinCode = cleanRoomCode(state.network.pendingJoinCode);

  if (
    !state.ui.autoJoinInvitePending ||
    !joinCode ||
    !isLocalMode() ||
    !supportsOnlineRooms()
  ) {
    return;
  }

  state.ui.autoJoinInvitePending = false;
  connectToRoom(joinCode);
}

function maybeResumePersistedSession() {
  if (state.ui.autoJoinInvitePending) {
    maybeAutoJoinInvite();
    return true;
  }

  if (!supportsOnlineRooms()) {
    return false;
  }

  if (isHostMode() && state.network.roomCode) {
    openHostRoom(state.network.roomCode, { resume: true });
    return true;
  }

  if (isClientMode() && state.network.roomCode) {
    connectToRoom(state.network.roomCode);
    return true;
  }

  return false;
}

function bootApp() {
  initializeClientSessionId();
  preloadDieSprites();
  applyInviteParams();

  const restoredFromLocalStorage = hydratePersistedState();

  if (!restoredFromLocalStorage) {
    startRound();
  }

  if (!maybeResumePersistedSession()) {
    render();
  }
}

elements.rollButton.addEventListener("click", handleRollRequest);
elements.scoreButton.addEventListener("click", handleScoreRequest);
elements.newHoleButton.addEventListener("click", handleRestartTurnRequest);
elements.resetRoundButton.addEventListener("click", () => {
  if (isClientMode()) {
    return;
  }

  if (isHostMode() && !state.network.gameStarted) {
    enterRoomLobby(
      `Lobby reset for room ${state.network.roomCode}. Waiting for players and the host start.`,
    );
    return;
  }

  startRound();
});
elements.playAgainButton.addEventListener("click", () => {
  if (isClientMode()) {
    return;
  }

  startRound();
});
elements.recapSetupButton.addEventListener("click", () => {
  if (isClientMode()) {
    return;
  }

  state.ui.managePanelOpen = true;
  render();
});
elements.roundSelector.addEventListener("click", handleRoundChange);
elements.playerCountSelector.addEventListener("click", handlePlayerCountChange);
elements.playNavButton.addEventListener("click", focusPrimarySurface);
elements.invitePanelButton.addEventListener("click", handleInvitePanelToggle);
elements.leaderboardButton.addEventListener("click", focusLeaderboard);
elements.managePanelButton.addEventListener("click", handleManagePanelToggle);
elements.tutorialButton.addEventListener("click", handleTutorialToggle);
elements.instructionsButton.addEventListener("click", handleInstructionsToggle);
elements.roomSummaryButton.addEventListener("click", openRoomSurface);
elements.liveRoundButton.addEventListener("click", openRoomSurface);
elements.startTutorialButton.addEventListener("click", () => {
  openTutorial({ reset: true });
});
elements.roomChatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  handleRoomChatSubmit(elements.roomChatInput);
});
elements.roomChatOverlayForm.addEventListener("submit", (event) => {
  event.preventDefault();
  handleRoomChatSubmit(elements.roomChatOverlayInput);
});
elements.openJoinButton.addEventListener("click", handleOpenJoinPanel);
elements.backToRoomStartButton.addEventListener("click", handleBackToRoomStart);
elements.createRoomButton.addEventListener("click", handleRoomButton);
elements.startRoomGameButton.addEventListener("click", handleStartHostedGame);
elements.copyRoomCodeButton.addEventListener("click", handleCopyRoomCode);
elements.copyLinkButton.addEventListener("click", handleCopyGameLink);
elements.pregameInviteButton.addEventListener(
  "click",
  handlePregameInviteAction,
);
elements.shareLinkButton.addEventListener("click", handleShareLink);
elements.joinRoomButton.addEventListener("click", handleJoinRoom);
elements.leaveRoomButton.addEventListener("click", handleLeaveRoom);
elements.leaveRoomJoinedButton.addEventListener("click", handleLeaveRoom);
elements.joinCodeInput.addEventListener("input", () => {
  elements.joinCodeInput.value = cleanRoomCode(elements.joinCodeInput.value);
  renderRoomControls();
});
elements.joinCodeInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  handleJoinRoom();
});
elements.roomOverlay.addEventListener("input", handlePlayerNameInput);
elements.roomOverlay.addEventListener("change", handlePlayerNameCommit);
elements.roomOverlay.addEventListener("keydown", (event) => {
  const input = event.target.closest(".player-name-edit-input");

  if (!input || event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  input.blur();
});
elements.diceGrid.addEventListener("click", (event) => {
  const dieButton = event.target.closest("[data-index]");

  if (!dieButton) {
    return;
  }

  handleDieToggleRequest(Number(dieButton.dataset.index));
});
document.querySelectorAll("[data-close-overlay]").forEach((button) => {
  button.addEventListener("click", () => {
    closeOverlay(button.dataset.closeOverlay);
  });
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  if (state.ui.tutorialOpen) {
    closeOverlay("tutorial");
    return;
  }

  if (state.ui.instructionsOpen) {
    closeOverlay("instructions");
    return;
  }

  if (state.ui.managePanelOpen) {
    closeOverlay("setup");
    return;
  }

  if (state.ui.invitePanelOpen && !shouldForceRoomOverlay(getPagePhase())) {
    closeOverlay("room");
  }
});

bootApp();

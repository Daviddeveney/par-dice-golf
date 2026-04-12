const HOLE_PAR = 3;
const DICE_COUNT = 3;
const MAX_ROLLS = 3;
const ROOM_CODE_LENGTH = 5;
const ROOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROLL_ANIMATION_STEP_MS = 90;
const ROLL_ANIMATION_TOTAL_MS = 720;
const FINAL_ROLL_REVEAL_MS = 900;

const PIP_PATTERNS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const state = {
  totalHoles: 9,
  maxPlayers: 2,
  currentHole: 1,
  activePlayerIndex: 0,
  players: createLocalPlayers(2),
  dice: [],
  holds: Array.from({ length: DICE_COUNT }, () => false),
  rollNumber: 0,
  isRolling: false,
  isFinalizingRoll: false,
  roundComplete: false,
  scorecard: [],
  network: {
    mode: "local",
    peer: null,
    hostConn: null,
    connections: {},
    roomCode: "",
    localPeerId: "local-1",
    pendingJoinCode: "",
    inviterName: "",
  },
};

let rollAnimationInterval = null;
let rollAnimationTimeout = null;
let finalRollTimeout = null;

const elements = {
  roundSelector: document.getElementById("round-selector"),
  playerCountSelector: document.getElementById("player-count-selector"),
  createRoomButton: document.getElementById("create-room-button"),
  roomCodeDisplay: document.getElementById("room-code-display"),
  copyRoomCodeButton: document.getElementById("copy-room-code-button"),
  joinCodeInput: document.getElementById("join-code"),
  joinRoomButton: document.getElementById("join-room-button"),
  networkNote: document.getElementById("network-note"),
  gameLinkDisplay: document.getElementById("game-link-display"),
  copyLinkButton: document.getElementById("copy-link-button"),
  shareLinkButton: document.getElementById("share-link-button"),
  shareNote: document.getElementById("share-note"),
  matchLineup: document.getElementById("match-lineup"),
  matchDetail: document.getElementById("match-detail"),
  matchSeat: document.getElementById("match-seat"),
  matchTurnPill: document.getElementById("match-turn-pill"),
  playerNames: document.getElementById("player-names"),
  diceGrid: document.getElementById("dice-grid"),
  holdCaption: document.getElementById("hold-caption"),
  scorePreviewHeading: document.getElementById("score-preview-heading"),
  scorePreviewValue: document.getElementById("score-preview-value"),
  scorePreviewLabel: document.getElementById("score-preview-label"),
  holeCounter: document.getElementById("hole-counter"),
  currentPlayerLabel: document.getElementById("current-player-label"),
  rollCounter: document.getElementById("roll-counter"),
  diceOwnerLabel: document.getElementById("dice-owner-label"),
  diceOwnerDetail: document.getElementById("dice-owner-detail"),
  diceSummary: document.getElementById("dice-summary"),
  resultBanner: document.getElementById("result-banner"),
  teeSheetHead: document.getElementById("tee-sheet-head"),
  teeSheetBody: document.getElementById("tee-sheet-body"),
  teeSheetFoot: document.getElementById("tee-sheet-foot"),
  scoreTotal: document.getElementById("score-total"),
  rollButton: document.getElementById("roll-button"),
  scoreButton: document.getElementById("score-button"),
  newHoleButton: document.getElementById("new-hole-button"),
  resetRoundButton: document.getElementById("reset-round-button"),
};

function createLocalPlayers(count, existingNames = []) {
  const players = [];

  for (let index = 0; index < count; index += 1) {
    players.push({
      id: `local-${index + 1}`,
      name: makeUniqueName(existingNames[index] || `Player ${index + 1}`, players),
    });
  }

  return players;
}

function createScorecard(totalHoles, playerCount) {
  return Array.from({ length: totalHoles }, (_, index) => ({
    holeNumber: index + 1,
    par: HOLE_PAR,
    scores: Array.from({ length: playerCount }, () => null),
  }));
}

function sanitizeName(value, fallback = "Player") {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed || fallback;
}

function cleanRoomCode(value) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, ROOM_CODE_LENGTH);
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

function getCurrentPlayer() {
  return state.players[state.activePlayerIndex];
}

function getCurrentHoleRecord() {
  return state.scorecard[state.currentHole - 1];
}

function getPlayerTotal(playerIndex) {
  return state.scorecard.reduce((total, hole) => total + (hole.scores[playerIndex] ?? 0), 0);
}

function getOverallLeaderText() {
  return state.players
    .map((player, index) => `${player.name} ${getPlayerTotal(index)}`)
    .join(" · ");
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

  return state.players.find((player) => player.id === state.network.localPeerId)?.name || "Player 1";
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
  state.network.localPeerId = "local-1";

  const localNames = Array.from({ length: state.maxPlayers }, (_, index) =>
    index === 0 ? localName : `Player ${index + 1}`,
  );

  state.players = createLocalPlayers(state.maxPlayers, localNames);
  startRound(message || "Back to local pass-and-play.");
}

function getInviteLink() {
  const inviteUrl = new URL(`${window.location.origin}${window.location.pathname}`);

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
    return isHostMode() ? `${getPlayerLabel(state.players[0], true)} hosting` : getPlayerLabel(state.players[0], true);
  }

  return state.players.map((player) => getPlayerLabel(player, true)).join(" vs ");
}

function getMatchSeatText() {
  if (isLocalMode()) {
    return `${state.players.length} players on this device`;
  }

  const localPlayer = state.players.find((player) => player.id === state.network.localPeerId);
  return localPlayer ? `You are ${localPlayer.name}` : "Connected to the room";
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

  if (isHostMode() && state.players.length === 1) {
    return `Room ${state.network.roomCode} is live. Waiting for other players to join the tee sheet.`;
  }

  if (isClientMode()) {
    return `Live room ${state.network.roomCode}. Hole ${state.currentHole} of ${state.totalHoles}.`;
  }

  return `Pass-and-play rotation on one device for hole ${state.currentHole} of ${state.totalHoles}.`;
}

function getTurnPillText() {
  if (state.roundComplete) {
    return "Round complete";
  }

  if (isHostMode() && state.players.length === 1) {
    return "Waiting for opponents";
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
    ? `Room link includes code ${state.network.roomCode}.`
    : `Setup link keeps this ${state.totalHoles}-hole game ready to open.`;

  elements.gameLinkDisplay.href = link;
  elements.gameLinkDisplay.textContent = link;
  elements.shareLinkButton.disabled = !canUseNativeShare();
  elements.shareLinkButton.textContent = canUseNativeShare() ? "Share Link" : "Share Unavailable";
  elements.copyLinkButton.textContent = state.network.roomCode ? "Copy Room Link" : "Copy Game Link";
  elements.shareNote.textContent = label;
}

function setResultBanner(message, tone = "") {
  elements.resultBanner.textContent = message;
  elements.resultBanner.classList.remove("good", "warn");

  if (tone) {
    elements.resultBanner.classList.add(tone);
  }
}

function randomDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function rollDice(count) {
  return Array.from({ length: count }, randomDie);
}

function normalizeHolds(holds = state.holds, diceLength = state.dice.length || DICE_COUNT) {
  return Array.from({ length: DICE_COUNT }, (_, index) => Boolean(holds[index]) && index < diceLength);
}

function rollWithHolds() {
  if (!state.dice.length) {
    return rollDice(DICE_COUNT);
  }

  state.holds = normalizeHolds();
  return state.dice.map((value, index) => (state.holds[index] ? value : randomDie()));
}

function clearRollTimers() {
  if (rollAnimationInterval) {
    window.clearInterval(rollAnimationInterval);
    rollAnimationInterval = null;
  }

  if (rollAnimationTimeout) {
    window.clearTimeout(rollAnimationTimeout);
    rollAnimationTimeout = null;
  }

  if (finalRollTimeout) {
    window.clearTimeout(finalRollTimeout);
    finalRollTimeout = null;
  }
}

function resetTurnState() {
  clearRollTimers();
  state.dice = [];
  state.holds = normalizeHolds([], 0);
  state.rollNumber = 0;
  state.isRolling = false;
  state.isFinalizingRoll = false;
}

function hasRollsRemaining() {
  return state.rollNumber < MAX_ROLLS;
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

function getThreeOfKindScore(values, rollNumber) {
  if (values.length !== 3 || !values.every((value) => value === values[0])) {
    return null;
  }

  if (rollNumber === 1) {
    return {
      score: 1,
      label: "Hole in one",
      detail: "Three of a kind on roll one scores 1.",
      kind: "ace",
    };
  }

  return {
    score: 2,
    label: "Birdie",
    detail: "Three of a kind after roll one scores 2.",
    kind: "birdie",
  };
}

function getPairScore(values) {
  if (values.length !== 3) {
    return null;
  }

  const counts = values.reduce((map, value) => {
    map[value] = (map[value] || 0) + 1;
    return map;
  }, {});

  const entries = Object.entries(counts);
  const pairEntry = entries.find(([, count]) => count === 2);
  const oddEntry = entries.find(([, count]) => count === 1);

  if (!pairEntry || !oddEntry) {
    return null;
  }

  return {
    score: Number(oddEntry[0]),
    label: "Playable finish",
    detail: `Pair of ${pairEntry[0]}s with ${oddEntry[0]} as the scoring die.`,
    kind: "pair",
  };
}

function getStandardPar3Outcome(values, rollNumber) {
  return getThreeOfKindScore(values, rollNumber) || getPairScore(values);
}

function getFallbackOutcome() {
  return {
    score: 6,
    label: "Take 6",
    detail: "No pair yet. Bank 6 now or keep rolling for something lower.",
    kind: "miss",
  };
}

function getTakeableOutcome(values, rollNumber) {
  return getStandardPar3Outcome(values, rollNumber) || getFallbackOutcome();
}

function getCurrentOutcome() {
  if (state.rollNumber === 0) {
    return null;
  }

  return getTakeableOutcome(state.dice, state.rollNumber);
}

function canScoreCurrentHole() {
  return !state.roundComplete && state.rollNumber > 0 && !state.isRolling && !state.isFinalizingRoll;
}

function canControlFromThisDevice() {
  if (isLocalMode()) {
    return true;
  }

  return getCurrentPlayer()?.id === state.network.localPeerId;
}

function createPlaceholderDie() {
  const placeholder = document.createElement("div");
  placeholder.className = "die die-placeholder";
  placeholder.setAttribute("aria-hidden", "true");
  return placeholder;
}

function syncDieElement(die, value, index) {
  const canToggleHold =
    state.rollNumber > 0 &&
    hasRollsRemaining() &&
    !state.roundComplete &&
    !state.isRolling &&
    !state.isFinalizingRoll &&
    canControlFromThisDevice();

  die.className = "die die-button";
  die.type = "button";
  die.dataset.index = String(index);
  die.disabled = !canToggleHold;
  die.setAttribute(
    "aria-label",
    state.isRolling && !state.holds[index]
      ? `Die showing ${value}. Rolling now.`
      : `Die showing ${value}. ${state.holds[index] ? "Held. Click to release it." : "Click to hold it."}`,
  );
  die.setAttribute("aria-pressed", state.holds[index] ? "true" : "false");
  die.style.setProperty("--roll-delay", `${index * 55}ms`);

  if (state.holds[index]) {
    die.classList.add("held");
  }

  if (state.isRolling && !state.holds[index]) {
    die.classList.add("is-rolling");
  }

  if (die.childElementCount !== 9) {
    die.innerHTML = "";

    for (let pipIndex = 0; pipIndex < 9; pipIndex += 1) {
      const pip = document.createElement("span");
      pip.className = "pip";
      die.appendChild(pip);
    }
  }

  Array.from(die.children).forEach((pip, pipIndex) => {
    pip.classList.toggle("active", PIP_PATTERNS[value].includes(pipIndex));
  });
}

function createDieElement(value, index) {
  const die = document.createElement("button");
  syncDieElement(die, value, index);
  return die;
}

function renderDice() {
  const diceToRender = state.dice.length
    ? state.dice
    : Array.from({ length: DICE_COUNT }, () => null);

  const needsRebuild =
    elements.diceGrid.children.length !== diceToRender.length ||
    diceToRender.some((value, index) => {
      const child = elements.diceGrid.children[index];
      const isPlaceholder = child?.classList.contains("die-placeholder");
      return (value === null) !== isPlaceholder;
    });

  if (needsRebuild) {
    elements.diceGrid.innerHTML = "";

    diceToRender.forEach((value, index) => {
      elements.diceGrid.appendChild(value === null ? createPlaceholderDie() : createDieElement(value, index));
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
}

function renderDiceMeta() {
  const currentPlayer = getCurrentPlayer();

  if (!currentPlayer) {
    elements.diceOwnerLabel.textContent = "Waiting for players";
    elements.diceOwnerDetail.textContent = "Roll 0 of 3";
    elements.diceSummary.textContent = "No active turn yet.";
    return;
  }

  const label = canControlFromThisDevice()
    ? `${getPlayerLabel(currentPlayer, true)} rolling now`
    : `Watching ${getPlayerPossessive(currentPlayer, true)} dice`;

  elements.diceOwnerLabel.textContent = label;
  elements.diceOwnerDetail.textContent = `Roll ${state.rollNumber} of ${MAX_ROLLS}`;

  if (state.rollNumber === 0 || !state.dice.length) {
    elements.diceSummary.textContent = canControlFromThisDevice()
      ? "Roll to put your dice on the table."
      : `Waiting for ${getPlayerLabel(currentPlayer, true)} to roll.`;
    return;
  }

  const heldValues = getHeldValues();
  const rolledValues = state.dice.join(" • ");
  const heldText = heldValues.length ? ` Held: ${heldValues.join(" • ")}.` : "";
  const liveOutcome = getCurrentOutcome();
  const scoreText = liveOutcome && !state.isRolling ? ` Live score: ${liveOutcome.score}.` : "";
  const actionWord = state.isRolling ? "is rolling" : "rolled";

  elements.diceSummary.textContent = `${getPlayerLabel(currentPlayer, true)} ${actionWord} ${rolledValues}.${heldText}${scoreText}`;
}

function renderPlayerArea() {
  elements.playerNames.innerHTML = "";

  if (isLocalMode()) {
    state.players.forEach((player, index) => {
      const field = document.createElement("div");
      field.className = "name-field";

      const label = document.createElement("label");
      label.htmlFor = `player-name-${index}`;
      label.textContent = `Player ${index + 1}`;

      const input = document.createElement("input");
      input.id = `player-name-${index}`;
      input.type = "text";
      input.maxLength = 18;
      input.value = player.name;
      input.dataset.playerName = String(index);

      field.append(label, input);
      elements.playerNames.appendChild(field);
    });

    return;
  }

  state.players.forEach((player, index) => {
    const card = document.createElement("div");
    const isActive = index === state.activePlayerIndex;
    const isLocalPlayer = player.id === state.network.localPeerId;
    const classes = ["player-card"];
    const playerTag = isLocalPlayer ? "You" : index === 0 ? "Host" : "Remote";
    const liveOutcome = isActive && state.rollNumber > 0 && !state.isRolling ? getCurrentOutcome() : null;
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

    card.className = classes.join(" ");
    card.innerHTML = `
      <div class="player-card-head">
        <strong>${escapeHtml(player.name)}</strong>
        <span class="player-tag">${playerTag}</span>
      </div>
      <span>${isActive ? "On the dice" : "Waiting on the tee sheet"}</span>
      <div class="player-card-meta">
        <span class="player-total-chip">Total ${getPlayerTotal(index)}</span>
        ${liveScoreChip}
      </div>
    `;

    elements.playerNames.appendChild(card);
  });
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
  elements.scoreTotal.textContent = `Totals · ${getOverallLeaderText()}`;

  const headRow = document.createElement("tr");
  headRow.innerHTML = `
    <th>Hole</th>
    <th>Par</th>
    ${state.players.map((player) => `<th>${escapeHtml(player.name)}</th>`).join("")}
  `;
  elements.teeSheetHead.appendChild(headRow);

  const liveOutcome = state.isRolling ? null : getCurrentOutcome();

  state.scorecard.forEach((hole) => {
    const row = document.createElement("tr");
    const isCurrentHole = !state.roundComplete && hole.holeNumber === state.currentHole;

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
          isCurrentHole && playerIndex === state.activePlayerIndex && player.id === getCurrentPlayer()?.id;
        const previewScore = isActiveCell && liveOutcome ? liveOutcome.score : null;
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
    ${state.players.map((_, index) => `<td>${getPlayerTotal(index)}</td>`).join("")}
  `;
  elements.teeSheetFoot.appendChild(footRow);
}

function getNetworkNote() {
  if (!supportsOnlineRooms()) {
    return "Online room codes are unavailable in this browser right now. Local pass-and-play still works.";
  }

  if (isConnectingMode()) {
    return state.network.pendingJoinCode
      ? `Connecting to room ${state.network.pendingJoinCode}...`
      : "Opening a room...";
  }

  if (isHostMode()) {
    return `Room ${state.network.roomCode} is live. ${state.players.length}/${state.maxPlayers} players connected.`;
  }

  if (isClientMode()) {
    return `Connected to room ${state.network.roomCode}. ${getPlayerLead(getCurrentPlayer(), true)} on the dice.`;
  }

  if (state.network.pendingJoinCode) {
    return state.network.inviterName
      ? `${state.network.inviterName} sent room ${state.network.pendingJoinCode}. Enter your name and tap Join.`
      : `Room ${state.network.pendingJoinCode} is ready. Enter your name and tap Join.`;
  }

  return "Play local pass-and-play or create a room code for remote players.";
}

function renderRoomControls() {
  const roomLabel = state.network.roomCode || "Local";
  const joinCode = cleanRoomCode(elements.joinCodeInput.value);
  const hasRoomCode = Boolean(state.network.roomCode);

  elements.roomCodeDisplay.textContent = roomLabel;
  elements.networkNote.textContent = getNetworkNote();
  elements.createRoomButton.textContent = isLocalMode() ? "Auto-Gen Code" : "Leave Room";
  elements.copyRoomCodeButton.disabled = !hasRoomCode;
  elements.copyRoomCodeButton.textContent = hasRoomCode ? "Copy Code" : "No Code Yet";
  elements.joinRoomButton.disabled = isConnectingMode() || !isLocalMode() || !joinCode || !supportsOnlineRooms();
  elements.joinCodeInput.disabled = !isLocalMode() || isConnectingMode();
  elements.joinCodeInput.value = joinCode || state.network.pendingJoinCode;
  elements.createRoomButton.disabled = isConnectingMode() || !supportsOnlineRooms();

  elements.roundSelector.querySelectorAll("[data-round]").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.round) === state.totalHoles);
    button.disabled = isClientMode();
  });

  elements.playerCountSelector.querySelectorAll("[data-players]").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.players) === state.maxPlayers);
    button.disabled = !isLocalMode();
  });
}

function renderHoldCaption() {
  if (state.roundComplete) {
    elements.holdCaption.textContent = "The round is complete. Start a new round to play again.";
    return;
  }

  if (!canControlFromThisDevice()) {
    elements.holdCaption.textContent = `${getPlayerLead(getCurrentPlayer(), true)} up. This screen is synced live while you wait.`;
    return;
  }

  if (state.isRolling) {
    elements.holdCaption.textContent = "Dice are rolling. Holds unlock again once they settle.";
    return;
  }

  if (state.isFinalizingRoll) {
    elements.holdCaption.textContent = "Final roll is posted. The hole will advance in a moment.";
    return;
  }

  if (state.rollNumber === 0) {
    elements.holdCaption.textContent = `${getPlayerLead(getCurrentPlayer(), true)} up. Roll once, then tap any die you want to hold.`;
    return;
  }

  const heldValues = getHeldValues();

  if (!heldValues.length) {
    elements.holdCaption.textContent = "No dice held. Tap what you want to keep, then reroll the rest.";
    return;
  }

  if (!hasDiceAvailableToRoll()) {
    elements.holdCaption.textContent = `Held: ${heldValues.join(", ")}. Release at least one die to use your next roll.`;
    return;
  }

  elements.holdCaption.textContent = `Held: ${heldValues.join(", ")}. Tap a held die to release it, or roll again.`;
}

function renderScorePreview() {
  const currentPlayer = getCurrentPlayer();
  const currentPlayerName = currentPlayer ? getPlayerLabel(currentPlayer, true) : "Current player";
  const previewHeading = currentPlayerName === "You" ? "Your Live Score" : `${currentPlayerName} Live Score`;
  const previewLead = currentPlayerName === "You" ? "You are" : `${currentPlayerName} is`;
  const noScoreLead = currentPlayerName === "You" ? "You have" : `${currentPlayerName} has`;

  if (state.roundComplete) {
    elements.scorePreviewHeading.textContent = "Round Complete";
    elements.scorePreviewValue.textContent = "Done";
    elements.scorePreviewLabel.textContent = `Final totals: ${getOverallLeaderText()}.`;
    return;
  }

  elements.scorePreviewHeading.textContent = previewHeading;

  if (state.rollNumber === 0) {
    elements.scorePreviewValue.textContent = "—";
    elements.scorePreviewLabel.textContent = `${noScoreLead} not posted a live score yet.`;
    return;
  }

  if (state.isRolling) {
    elements.scorePreviewValue.textContent = "...";
    elements.scorePreviewLabel.textContent = `${previewLead} rolling now. Score updates when the dice settle.`;
    return;
  }

  const outcome = getCurrentOutcome();
  elements.scorePreviewValue.textContent = `${outcome.score}`;
  elements.scorePreviewLabel.textContent = `${previewLead} currently scoring ${outcome.score}. ${outcome.label}: ${outcome.detail}`;
}

function renderStatus() {
  elements.holeCounter.textContent = `${state.currentHole} / ${state.totalHoles}`;
  elements.currentPlayerLabel.textContent = getPlayerLabel(getCurrentPlayer(), true);
  elements.rollCounter.textContent = `${state.rollNumber} / ${MAX_ROLLS}`;

  const canControl = canControlFromThisDevice();

  elements.rollButton.disabled =
    state.roundComplete ||
    state.isRolling ||
    state.isFinalizingRoll ||
    !hasRollsRemaining() ||
    !hasDiceAvailableToRoll() ||
    !canControl;
  elements.scoreButton.disabled = !canScoreCurrentHole() || !canControl;
  elements.newHoleButton.disabled =
    state.roundComplete || state.rollNumber === 0 || state.isRolling || state.isFinalizingRoll || !canControl;

  if (state.roundComplete) {
    elements.scoreButton.textContent = "Round Complete";
  } else if (state.isFinalizingRoll) {
    elements.scoreButton.textContent = "Posting Final Roll";
  } else if (state.isRolling) {
    elements.scoreButton.textContent = "Dice Rolling...";
  } else if (!canControl) {
    elements.scoreButton.textContent = `Waiting on ${getPlayerLabel(getCurrentPlayer(), true)}`;
  } else if (state.rollNumber > 0) {
    elements.scoreButton.textContent = `Take Score ${getCurrentOutcome().score}`;
  } else {
    elements.scoreButton.textContent = "Score This Hole";
  }
}

function serializeState() {
  return {
    totalHoles: state.totalHoles,
    maxPlayers: state.maxPlayers,
    currentHole: state.currentHole,
    activePlayerIndex: state.activePlayerIndex,
    players: state.players.map((player) => ({ ...player })),
    dice: [...state.dice],
    holds: [...state.holds],
    rollNumber: state.rollNumber,
    isRolling: state.isRolling,
    isFinalizingRoll: state.isFinalizingRoll,
    roundComplete: state.roundComplete,
    scorecard: state.scorecard.map((hole) => ({
      holeNumber: hole.holeNumber,
      par: hole.par,
      scores: [...hole.scores],
    })),
    roomCode: state.network.roomCode,
  };
}

function broadcastSnapshot() {
  if (!isHostMode()) {
    return;
  }

  const packet = {
    type: "snapshot",
    snapshot: serializeState(),
  };

  Object.values(state.network.connections).forEach((conn) => {
    if (conn.open) {
      conn.send(packet);
    }
  });
}

function applySnapshot(snapshot) {
  state.totalHoles = snapshot.totalHoles;
  state.maxPlayers = snapshot.maxPlayers;
  state.currentHole = snapshot.currentHole;
  state.activePlayerIndex = snapshot.activePlayerIndex;
  state.players = snapshot.players.map((player) => ({ ...player }));
  state.dice = [...snapshot.dice];
  state.holds = normalizeHolds(snapshot.holds, snapshot.dice.length);
  state.rollNumber = snapshot.rollNumber;
  state.isRolling = Boolean(snapshot.isRolling);
  state.isFinalizingRoll = Boolean(snapshot.isFinalizingRoll);
  state.roundComplete = snapshot.roundComplete;
  state.scorecard = snapshot.scorecard.map((hole) => ({
    holeNumber: hole.holeNumber,
    par: hole.par,
    scores: [...hole.scores],
  }));
  state.network.roomCode = snapshot.roomCode;
}

function render() {
  renderRoomControls();
  renderMatchBanner();
  renderPlayerArea();
  renderScorecard();
  renderDice();
  renderDiceMeta();
  renderHoldCaption();
  renderScorePreview();
  renderStatus();
  updateShareControls();

  if (isHostMode()) {
    broadcastSnapshot();
  }
}

function prepareTurn(message, tone = "") {
  resetTurnState();
  setResultBanner(message, tone);
  render();
}

function startRound(message) {
  state.currentHole = 1;
  state.activePlayerIndex = 0;
  state.roundComplete = false;
  state.scorecard = createScorecard(state.totalHoles, state.players.length);
  prepareTurn(message || `${getPlayerAction(getCurrentPlayer(), "opens", "open", true)} hole 1. Roll when ready.`);
}

function advanceTurn(outcome, { auto = false, diceValues = [] } = {}) {
  clearRollTimers();
  state.isRolling = false;
  state.isFinalizingRoll = false;
  const playerName = getPlayerLabel(getCurrentPlayer(), true);
  const hole = getCurrentHoleRecord();
  const scoredWithText = diceValues.length ? ` with ${diceValues.join(", ")}` : "";

  hole.scores[state.activePlayerIndex] = outcome.score;

  if (state.activePlayerIndex < state.players.length - 1) {
    state.activePlayerIndex += 1;
    prepareTurn(
      `${playerName} posted ${outcome.score}${scoredWithText} on hole ${state.currentHole}. ${getPlayerLead(getCurrentPlayer(), true)} up next.`,
      outcome.kind === "miss" ? "warn" : "good",
    );
    return;
  }

  if (state.currentHole < state.totalHoles) {
    state.currentHole += 1;
    state.activePlayerIndex = 0;
    prepareTurn(
      `Hole ${state.currentHole - 1} is in the books. ${playerName} closed it with ${outcome.score}${scoredWithText}${auto ? " on the final roll" : ""}. ${getPlayerAction(getCurrentPlayer(), "tees off", "tee off", true)} on hole ${state.currentHole}.`,
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

function buildRollingDice(finalDice) {
  return finalDice.map((value, index) => (state.holds[index] ? value : randomDie()));
}

function settleRoll(finalDice, rollNumber) {
  clearRollTimers();
  state.dice = [...finalDice];
  state.holds = normalizeHolds();
  state.isRolling = false;

  if (rollNumber === MAX_ROLLS) {
    const finalOutcome = getTakeableOutcome(state.dice, state.rollNumber);
    const playerName = getPlayerLabel(getCurrentPlayer(), true);

    state.isFinalizingRoll = true;
    setResultBanner(
      `${playerName} finished roll ${rollNumber} with ${state.dice.join(", ")}. Final score showing ${finalOutcome.score}.`,
      finalOutcome.kind === "miss" ? "warn" : "good",
    );
    render();

    finalRollTimeout = window.setTimeout(() => {
      finalRollTimeout = null;
      advanceTurn(finalOutcome, {
        auto: true,
        diceValues: [...state.dice],
      });
    }, FINAL_ROLL_REVEAL_MS);
    return;
  }

  const outcome = getStandardPar3Outcome(state.dice, state.rollNumber);
  const playerName = getPlayerLabel(getCurrentPlayer(), true);

  if (outcome) {
    setResultBanner(
      `${playerName} is showing ${outcome.score} with ${state.dice.join(", ")}. Bank it now or use roll ${state.rollNumber + 1} to chase better.`,
      "good",
    );
  } else {
    setResultBanner(
      `${playerName} rolled ${state.dice.join(", ")}. The takeable score is 6 right now, or you can keep rolling for something lower.`,
    );
  }

  render();
}

function startRollAnimation(finalDice, rollNumber) {
  clearRollTimers();
  state.isRolling = true;
  state.isFinalizingRoll = false;
  state.holds = normalizeHolds();
  state.dice = buildRollingDice(finalDice);
  render();

  rollAnimationInterval = window.setInterval(() => {
    state.dice = buildRollingDice(finalDice);
    render();
  }, ROLL_ANIMATION_STEP_MS);

  rollAnimationTimeout = window.setTimeout(() => {
    rollAnimationTimeout = null;
    settleRoll(finalDice, rollNumber);
  }, ROLL_ANIMATION_TOTAL_MS);
}

function performRoll() {
  if (state.roundComplete || state.isRolling || state.isFinalizingRoll || !hasRollsRemaining() || !hasDiceAvailableToRoll()) {
    return;
  }

  const nextRollNumber = state.rollNumber + 1;
  const finalDice = rollWithHolds();
  state.rollNumber = nextRollNumber;
  state.holds = normalizeHolds();
  startRollAnimation(finalDice, nextRollNumber);
}

function performScore() {
  if (!canScoreCurrentHole()) {
    return;
  }

  advanceTurn(getCurrentOutcome(), { diceValues: [...state.dice] });
}

function performRestartTurn() {
  if (state.roundComplete || state.rollNumber === 0 || state.isRolling || state.isFinalizingRoll) {
    return;
  }

  prepareTurn(`${getPlayerPossessive(getCurrentPlayer(), true)} turn on hole ${state.currentHole} restarted.`);
}

function performToggleHold(index) {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= DICE_COUNT ||
    state.rollNumber === 0 ||
    state.roundComplete ||
    state.isRolling ||
    state.isFinalizingRoll ||
    !hasRollsRemaining()
  ) {
    return;
  }

  state.holds = normalizeHolds();
  state.holds[index] = !state.holds[index];
  render();
}

function handleRemoteAction(peerId, action, payload = {}) {
  if (!isHostMode() || getCurrentPlayer()?.id !== peerId) {
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

function sendActionToHost(action, payload = {}) {
  if (!isClientMode() || !state.network.hostConn?.open) {
    return;
  }

  state.network.hostConn.send({
    type: "action",
    action,
    payload,
  });
}

function handleRollRequest() {
  if (!canControlFromThisDevice()) {
    return;
  }

  if (isClientMode()) {
    sendActionToHost("roll");
    return;
  }

  performRoll();
}

function handleScoreRequest() {
  if (!canControlFromThisDevice()) {
    return;
  }

  if (isClientMode()) {
    sendActionToHost("score");
    return;
  }

  performScore();
}

function handleRestartTurnRequest() {
  if (!canControlFromThisDevice()) {
    return;
  }

  if (isClientMode()) {
    sendActionToHost("restart-turn");
    return;
  }

  performRestartTurn();
}

function handleDieToggleRequest(index) {
  if (!canControlFromThisDevice()) {
    return;
  }

  if (isClientMode()) {
    sendActionToHost("toggle-hold", { index });
    return;
  }

  performToggleHold(index);
}

function handleIncomingConnection(conn) {
  conn.on("data", (data) => {
    if (!data || typeof data !== "object") {
      return;
    }

    if (data.type === "join") {
      if (state.players.length >= state.maxPlayers) {
        conn.send({ type: "error", message: `Room ${state.network.roomCode} is full.` });
        conn.close();
        return;
      }

      const joiningName = makeUniqueName(data.name || `Player ${state.players.length + 1}`, state.players);
      state.network.connections[conn.peer] = conn;
      state.players.push({
        id: conn.peer,
        name: joiningName,
      });

      startRound(`${joiningName} joined room ${state.network.roomCode}. Round reset for ${state.players.length} players.`);
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

    const leavingPlayer = state.players.find((player) => player.id === conn.peer);

    if (!leavingPlayer) {
      render();
      return;
    }

    state.players = state.players.filter((player) => player.id !== conn.peer);
    startRound(`${leavingPlayer.name} left room ${state.network.roomCode}. Round reset for the remaining players.`);
  });
}

function createHostRoom(attempt = 0) {
  const roomCode = generateRoomCode();
  const peer = new window.Peer(getPeerIdFromCode(roomCode));
  let opened = false;

  state.network.mode = "connecting";
  state.network.pendingJoinCode = "";
  render();

  peer.on("open", (peerId) => {
    opened = true;
    state.network.peer = peer;
    state.network.mode = "hosting";
    state.network.roomCode = roomCode;
    state.network.localPeerId = peerId;
    state.network.connections = {};
    state.players = [
      {
        id: peerId,
        name: makeUniqueName(state.players[0]?.name || "Host"),
      },
    ];

    peer.on("connection", handleIncomingConnection);
    startRound(`Room ${roomCode} is live. Share the code so other players can join.`);
  });

  peer.on("error", (error) => {
    if (!opened && error.type === "unavailable-id" && attempt < 5) {
      try {
        peer.destroy();
      } catch (destroyError) {
        console.warn(destroyError);
      }

      createHostRoom(attempt + 1);
      return;
    }

    restoreLocalState("Room creation failed. Back to local pass-and-play.");
  });
}

function connectToRoom(code) {
  if (!supportsOnlineRooms()) {
    render();
    return;
  }

  const joinCode = cleanRoomCode(code);

  if (!joinCode) {
    render();
    return;
  }

  const peer = new window.Peer();
  state.network.mode = "connecting";
  state.network.pendingJoinCode = joinCode;
  render();

  peer.on("open", (peerId) => {
    const conn = peer.connect(getPeerIdFromCode(joinCode), { reliable: true });

    state.network.peer = peer;
    state.network.hostConn = conn;
    state.network.localPeerId = peerId;

    conn.on("open", () => {
      state.network.mode = "joined";
      state.network.roomCode = joinCode;
      conn.send({
        type: "join",
        name: sanitizeName(state.players[0]?.name || "Player 1"),
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
      restoreLocalState("The host disconnected. Back to local pass-and-play.");
    });

    conn.on("error", () => {
      restoreLocalState("The room connection failed. Back to local pass-and-play.");
    });
  });

  peer.on("error", () => {
    restoreLocalState("Unable to connect to that room. Back to local pass-and-play.");
  });
}

function handleRoomButton() {
  if (!supportsOnlineRooms()) {
    render();
    return;
  }

  if (isLocalMode()) {
    createHostRoom();
    return;
  }

  restoreLocalState("Left the room. Local pass-and-play is ready.");
}

function handleJoinRoom() {
  if (!isLocalMode()) {
    return;
  }

  const code = cleanRoomCode(elements.joinCodeInput.value || state.network.pendingJoinCode);

  if (!code) {
    return;
  }

  connectToRoom(code);
}

async function handleCopyRoomCode() {
  if (!state.network.roomCode) {
    return;
  }

  try {
    await navigator.clipboard.writeText(state.network.roomCode);
    elements.networkNote.textContent = `Room ${state.network.roomCode} copied. Share it so someone can join.`;
  } catch (error) {
    elements.networkNote.textContent = `Room ${state.network.roomCode} is live. Copy it manually if your browser blocks clipboard access.`;
  }
}

async function handleCopyGameLink() {
  const link = getInviteLink();

  try {
    await navigator.clipboard.writeText(link);
    elements.shareNote.textContent = state.network.roomCode
      ? `Room link copied. Send it out with code ${state.network.roomCode}.`
      : "Game link copied. Send it to someone to jump in fast.";
  } catch (error) {
    elements.shareNote.textContent = "Your browser blocked clipboard access. Use the visible link above to copy manually.";
  }
}

async function handleShareLink() {
  if (!canUseNativeShare()) {
    return;
  }

  try {
    await navigator.share({
      title: "PAR Dice Golf",
      text: state.network.roomCode
        ? `Join my PAR room with code ${state.network.roomCode}.`
        : `Jump into this ${state.totalHoles}-hole PAR setup.`,
      url: getInviteLink(),
    });

    elements.shareNote.textContent = "Share sheet opened for your game link.";
  } catch (error) {
    if (error?.name !== "AbortError") {
      elements.shareNote.textContent = "Unable to open the share sheet here. Use Copy Link instead.";
    }
  }
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

  const existingNames = state.players.map((player) => player.name);
  state.players = createLocalPlayers(state.maxPlayers, existingNames);
  startRound();
}

function handlePlayerNameInput(event) {
  if (!isLocalMode()) {
    return;
  }

  const input = event.target.closest("[data-player-name]");

  if (!input) {
    return;
  }

  const index = Number(input.dataset.playerName);
  state.players[index].name = makeUniqueName(input.value, state.players, state.players[index].id);
  input.value = state.players[index].name;
  renderScorecard();
  renderMatchBanner();
  renderDiceMeta();
  renderStatus();
  updateShareControls();
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
    state.players = createLocalPlayers(players);
  }

  if (from && state.players[0]) {
    state.network.inviterName = from;
    state.players[0].name = "You";
  }

  if (joinCode) {
    state.network.pendingJoinCode = joinCode;
    elements.joinCodeInput.value = joinCode;
  }
}

elements.rollButton.addEventListener("click", handleRollRequest);
elements.scoreButton.addEventListener("click", handleScoreRequest);
elements.newHoleButton.addEventListener("click", handleRestartTurnRequest);
elements.resetRoundButton.addEventListener("click", () => {
  if (isClientMode()) {
    return;
  }

  startRound();
});
elements.roundSelector.addEventListener("click", handleRoundChange);
elements.playerCountSelector.addEventListener("click", handlePlayerCountChange);
elements.createRoomButton.addEventListener("click", handleRoomButton);
elements.copyRoomCodeButton.addEventListener("click", handleCopyRoomCode);
elements.copyLinkButton.addEventListener("click", handleCopyGameLink);
elements.shareLinkButton.addEventListener("click", handleShareLink);
elements.joinRoomButton.addEventListener("click", handleJoinRoom);
elements.joinCodeInput.addEventListener("input", () => {
  elements.joinCodeInput.value = cleanRoomCode(elements.joinCodeInput.value);
  renderRoomControls();
});
elements.playerNames.addEventListener("input", handlePlayerNameInput);
elements.diceGrid.addEventListener("click", (event) => {
  const dieButton = event.target.closest("[data-index]");

  if (!dieButton) {
    return;
  }

  handleDieToggleRequest(Number(dieButton.dataset.index));
});

applyInviteParams();
startRound();

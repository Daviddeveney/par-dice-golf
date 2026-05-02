const PIP_PATTERNS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const TUTORIAL_COMPLETION_KEY = "par-tutorial-complete-v1";

const TUTORIAL_STEPS = [
  {
    id: "core-rule",
    eyebrow: "Step 1",
    title: "The match scores 0",
    body: "Every hole has a match target. Make the match, and those dice stop scoring. Only the leftover dice count.",
    visual: {
      eyebrow: "Core rule",
      title: "Make the match, score the leftover die",
      meta: ["Par 4 example", "Trips made", "Scores 2"],
      dice: [5, 5, 5, 2],
      roles: ["match", "match", "match", "score"],
      note: "The three 5s are the match, so they score 0. The leftover 2 is the hole score.",
    },
    support: {
      title: "Remember these targets",
      points: [
        "Par 3: make a pair",
        "Par 4: make 3 of a kind",
        "Par 5: make at least 3 matching dice",
      ],
    },
    coach: "If you remember match dice vs. leftover dice, the rest of the game gets much easier.",
  },
  {
    id: "par3",
    eyebrow: "Step 2",
    title: "Par 3 wants a pair",
    body: "On a Par 3, make a pair. The third die is the score. If you miss, score 3 plus the lowest die.",
    visual: {
      eyebrow: "Par 3",
      title: "Pair made",
      meta: ["Par 3", "Pair made", "Scores 4"],
      dice: [3, 3, 4],
      roles: ["match", "match", "score"],
      note: "The pair is the match, so the leftover 4 is the score.",
    },
    challenge: {
      type: "choose-option",
      prompt: "What does this Par 3 score?",
      instructions: "Pick the score that counts.",
      options: [
        { value: "4", label: "4", detail: "Only the leftover die scores" },
        { value: "6", label: "6", detail: "Add the pair together" },
        { value: "10", label: "10", detail: "Add all three dice" },
      ],
      correctValue: "4",
      success: "Correct. The pair scores 0, so the leftover 4 is the hole score.",
      error: "Not quite. On a made Par 3, only the leftover die counts.",
    },
  },
  {
    id: "par4",
    eyebrow: "Step 3",
    title: "Par 4 wants 3 of a kind",
    body: "On a Par 4, make 3 of a kind. The fourth die is the score. If you miss, score 4 plus the lowest die.",
    visual: {
      eyebrow: "Par 4",
      title: "Trips made",
      meta: ["Par 4", "Roll 2 of 3", "Scores 2"],
      dice: [6, 6, 6, 2],
      roles: ["match", "match", "match", "score"],
      note: "The three 6s are the match. The leftover 2 is the score.",
    },
    challenge: {
      type: "pick-dice",
      prompt: "Which dice are the match?",
      instructions: "Select the three matching dice.",
      correctDice: [0, 1, 2],
      success: "Yes. Those three 6s are the match, so the 2 is the only die still scoring.",
      error: "Almost. On a Par 4, the three matching dice are the match.",
    },
  },
  {
    id: "par5",
    eyebrow: "Step 4",
    title: "Par 5 wants 3 or more matches",
    body: "On a Par 5, make at least 3 matching dice. The other 2 dice are the score. Par 5 starts with 4 rolls.",
    visual: {
      eyebrow: "Par 5",
      title: "Three-match made",
      meta: ["Par 5", "Made hand", "Scores 2"],
      dice: [2, 2, 2, 1, 1],
      roles: ["match", "match", "match", "score", "score"],
      note: "The three 2s score 0. The two 1s are left, so this hand scores 2.",
    },
    challenge: {
      type: "choose-option",
      prompt: "What does this Par 5 score?",
      instructions: "Add only the two leftover dice.",
      options: [
        { value: "1", label: "1", detail: "Use only one leftover die" },
        { value: "2", label: "2", detail: "1 + 1" },
        { value: "8", label: "8", detail: "Count the match dice too" },
      ],
      correctValue: "2",
      success: "Correct. The match scores 0, and the two leftover 1s add up to 2.",
      error: "Not quite. On a made Par 5, only the two leftover dice count.",
    },
  },
  {
    id: "extras",
    eyebrow: "Step 5",
    title: "Know the bonus and miss rules",
    body: "A straight gives you 1 bonus roll. Misses use recovery on Par 3 and Par 4, but Par 5 misses count all 5 dice.",
    visual: {
      eyebrow: "Extra roll",
      title: "Straight = bonus roll",
      meta: ["2, 3, 4, 5, 6", "Straight made", "+1 roll"],
      dice: [2, 3, 4, 5, 6],
      roles: ["straight", "straight", "straight", "straight", "straight"],
      note: "A straight does not score by itself. It gives you one extra roll on the same hole.",
      aside: "Any score of 1 on roll 1 is a hole in one.",
    },
    challenge: {
      type: "choose-option",
      prompt: "What does a straight give you?",
      instructions: "Pick the rule that is true.",
      options: [
        { value: "nothing", label: "Nothing", detail: "No extra reward" },
        { value: "bonus-roll", label: "1 bonus roll", detail: "Keep playing this hole" },
        { value: "birdie", label: "Birdie", detail: "Straight scores 2" },
      ],
      correctValue: "bonus-roll",
      success: "Correct. A straight gives you 1 bonus roll.",
      error: "Not quite. Straights do not score by themselves. They give you 1 bonus roll.",
    },
  },
  {
    id: "bank",
    eyebrow: "Step 6",
    title: "Bank when you like the score",
    body: "You do not have to use every roll. If a good score is showing, you can take it right away.",
    visual: {
      eyebrow: "Decision",
      title: "A score is already showing",
      meta: ["Par 4", "Roll 2 of 3", "Score showing: 2"],
      dice: [4, 4, 4, 2],
      roles: ["match", "match", "match", "score"],
      note: "This hand is already scoring 2, so you can bank it now instead of risking a worse reroll.",
    },
    challenge: {
      type: "choose-option",
      prompt: "What can you do next?",
      instructions: "Pick the true rule.",
      options: [
        { value: "bank", label: "Take Score 2", detail: "Bank the score now" },
        { value: "must-roll", label: "Roll again", detail: "You must use every roll" },
        { value: "straight-only", label: "Wait for a straight", detail: "You can only bank after a bonus roll" },
      ],
      correctValue: "bank",
      success: "Exactly. If you like the score showing, you can bank it.",
      error: "Not quite. You can bank a score after any roll.",
    },
  },
  {
    id: "finish",
    kind: "summary",
    eyebrow: "Step 7",
    title: "You are ready",
    body: "That is the whole game: make the match, protect the leftovers, use bonus rolls well, and bank a score you trust.",
    summary: {
      title: "Keep these rules in your head",
      points: [
        "Par 3: pair. Par 4: 3 of a kind. Par 5: at least 3 matching dice.",
        "Match dice score 0. Only leftover dice count.",
        "Par 3 miss = 3 + lowest die. Par 4 miss = 4 + lowest die. Par 5 miss = all 5 dice.",
        "Straight = 1 bonus roll.",
        "Any score of 1 on roll 1 is a hole in one.",
      ],
    },
    support: {
      title: "Simple beginner plan",
      points: [
        "Keep the match when you have it.",
        "Keep low leftover dice when they help your score.",
        "Bank a good number instead of forcing a bad reroll.",
      ],
    },
    coach: "Use the rules page when you want the full reference. This walkthrough is just the fast version.",
  },
];

function readCompletionFlag() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(TUTORIAL_COMPLETION_KEY) === "true";
  } catch (error) {
    console.warn(error);
    return false;
  }
}

function writeCompletionFlag(value) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(TUTORIAL_COMPLETION_KEY, value ? "true" : "false");
  } catch (error) {
    console.warn(error);
  }
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeIndexes(values = []) {
  return [...values].sort((left, right) => left - right);
}

function areSameIndexes(left = [], right = []) {
  const normalizedLeft = normalizeIndexes(left);
  const normalizedRight = normalizeIndexes(right);

  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }

  return normalizedLeft.every((value, index) => value === normalizedRight[index]);
}

function renderDiePips(value) {
  const activePips = PIP_PATTERNS[value] || [];

  return Array.from({ length: 9 }, (_, index) => {
    const isActive = activePips.includes(index);
    return `<span class="tutorial-pip${isActive ? " is-active" : ""}"></span>`;
  }).join("");
}

function getRoleLabel(role) {
  if (role === "match") {
    return "Match";
  }

  if (role === "score") {
    return "Scoring";
  }

  if (role === "straight") {
    return "Straight";
  }

  return "";
}

export function createTutorialModule({
  root,
  stepCard,
  progressList,
  stepCounter,
  progressFill,
  prevButton,
  nextButton,
  restartButton,
  statusBadge,
  onRequestClose,
}) {
  if (
    !root ||
    !stepCard ||
    !progressList ||
    !stepCounter ||
    !progressFill ||
    !prevButton ||
    !nextButton ||
    !restartButton
  ) {
    return {
      render() {},
      reset() {},
    };
  }

  const tutorialState = {
    currentStepIndex: 0,
    furthestStepIndex: 1,
    solvedSteps: new Set([TUTORIAL_STEPS[0].id]),
    selectedDice: [],
    selectedOption: "",
    feedback: null,
    completed: readCompletionFlag(),
  };

  function getStep(index = tutorialState.currentStepIndex) {
    return TUTORIAL_STEPS[index];
  }

  function isSolved(index = tutorialState.currentStepIndex) {
    return tutorialState.solvedSteps.has(getStep(index).id);
  }

  function clearInteractionState() {
    tutorialState.selectedDice = [];
    tutorialState.selectedOption = "";
    tutorialState.feedback = null;
  }

  function unlockNextStep(index = tutorialState.currentStepIndex) {
    tutorialState.furthestStepIndex = Math.max(
      tutorialState.furthestStepIndex,
      Math.min(TUTORIAL_STEPS.length - 1, index + 1),
    );
  }

  function markSolved(index = tutorialState.currentStepIndex, message = "", tone = "good") {
    tutorialState.solvedSteps.add(getStep(index).id);
    unlockNextStep(index);
    tutorialState.feedback = message ? { tone, message } : null;
  }

  function goToStep(index) {
    const clampedIndex = Math.max(0, Math.min(index, TUTORIAL_STEPS.length - 1));
    tutorialState.currentStepIndex = clampedIndex;
    clearInteractionState();

    if (!getStep(clampedIndex).challenge) {
      markSolved(clampedIndex);
      tutorialState.feedback = null;
    }

    render();
  }

  function reset({ preserveCompletion = true } = {}) {
    tutorialState.currentStepIndex = 0;
    tutorialState.furthestStepIndex = 1;
    tutorialState.solvedSteps = new Set([TUTORIAL_STEPS[0].id]);
    tutorialState.selectedDice = [];
    tutorialState.selectedOption = "";
    tutorialState.feedback = null;

    if (!preserveCompletion) {
      tutorialState.completed = false;
      writeCompletionFlag(false);
    }

    render();
  }

  function completeTutorial() {
    tutorialState.completed = true;
    writeCompletionFlag(true);
  }

  function handleDiceToggle(index) {
    const step = getStep();

    if (step.challenge?.type !== "pick-dice" || isSolved()) {
      return;
    }

    const nextSelection = tutorialState.selectedDice.includes(index)
      ? tutorialState.selectedDice.filter((value) => value !== index)
      : [...tutorialState.selectedDice, index];
    const maxSelections = step.challenge.correctDice.length;

    tutorialState.selectedDice = nextSelection.slice(0, maxSelections);
    tutorialState.feedback = null;
    render();
  }

  function checkDiceSelection() {
    const step = getStep();

    if (step.challenge?.type !== "pick-dice" || isSolved()) {
      return;
    }

    if (areSameIndexes(tutorialState.selectedDice, step.challenge.correctDice)) {
      markSolved(tutorialState.currentStepIndex, step.challenge.success);
      render();
      return;
    }

    tutorialState.feedback = {
      tone: "warn",
      message: step.challenge.error,
    };
    render();
  }

  function chooseOption(value) {
    const step = getStep();

    if (step.challenge?.type !== "choose-option" || isSolved()) {
      return;
    }

    tutorialState.selectedOption = value;

    if (value === step.challenge.correctValue) {
      markSolved(tutorialState.currentStepIndex, step.challenge.success);
      render();
      return;
    }

    tutorialState.feedback = {
      tone: "warn",
      message: step.challenge.error,
    };
    render();
  }

  function handleNext() {
    const isLastStep = tutorialState.currentStepIndex === TUTORIAL_STEPS.length - 1;

    if (isLastStep) {
      completeTutorial();
      reset({ preserveCompletion: true });
      onRequestClose?.();
      return;
    }

    goToStep(tutorialState.currentStepIndex + 1);
  }

  function handleProgressJump(index) {
    if (index > tutorialState.furthestStepIndex) {
      return;
    }

    goToStep(index);
  }

  function renderProgress() {
    progressList.innerHTML = TUTORIAL_STEPS.map((step, index) => {
      const isCurrent = index === tutorialState.currentStepIndex;
      const isComplete = tutorialState.solvedSteps.has(step.id);
      const isUnlocked = index <= tutorialState.furthestStepIndex;

      return `
        <li>
          <button
            class="tutorial-progress-step${isCurrent ? " is-current" : ""}${isComplete ? " is-complete" : ""}"
            type="button"
            data-tutorial-progress="${index}"
            ${isUnlocked ? "" : "disabled"}
          >
            <span class="tutorial-progress-index">${index + 1}</span>
            <span class="tutorial-progress-copy">
              <strong>${escapeHtml(step.title)}</strong>
              <span>${escapeHtml(step.kind === "summary" ? "Wrap-up" : step.eyebrow)}</span>
            </span>
          </button>
        </li>
      `;
    }).join("");
  }

  function renderDice(step, solved) {
    const isPickStep = step.challenge?.type === "pick-dice";

    return `
      <div class="tutorial-dice-row" role="group" aria-label="${escapeHtml(step.visual.title)}">
        ${step.visual.dice
          .map((value, index) => {
            const role = step.visual.roles?.[index] || "";
            const showRole = !isPickStep || solved;
            const isSelected = tutorialState.selectedDice.includes(index);
            const classes = [
              "tutorial-die",
              showRole && role ? `is-${role}` : "",
              isSelected ? "is-selected" : "",
              isPickStep && !solved ? "is-interactive" : "",
            ]
              .filter(Boolean)
              .join(" ");
            const roleLabel = showRole && role ? getRoleLabel(role) : "Pick me";

            return `
              <button
                class="${classes}"
                type="button"
                ${isPickStep ? `data-tutorial-die="${index}"` : "disabled"}
                aria-pressed="${isSelected ? "true" : "false"}"
                aria-label="Die showing ${value}${showRole && role ? `. ${roleLabel}.` : "."}"
              >
                <span class="tutorial-die-face" aria-hidden="true">
                  ${renderDiePips(value)}
                </span>
                <span class="tutorial-die-caption">${escapeHtml(roleLabel)}</span>
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderLessonCard(step, solved) {
    return `
      <article class="tutorial-lesson-card">
        <p class="tutorial-card-eyebrow">${escapeHtml(step.visual.eyebrow)}</p>
        <h3>${escapeHtml(step.visual.title)}</h3>
        <div class="tutorial-tag-row">
          ${step.visual.meta
            .map((item) => `<span class="tutorial-tag">${escapeHtml(item)}</span>`)
            .join("")}
        </div>
        ${renderDice(step, solved)}
        <p class="tutorial-lesson-note">${escapeHtml(step.visual.note)}</p>
        ${
          step.visual.aside
            ? `<div class="tutorial-side-note">${escapeHtml(step.visual.aside)}</div>`
            : ""
        }
      </article>
    `;
  }

  function renderChallengeCard(step, solved) {
    const feedback = tutorialState.feedback;

    if (!step.challenge) {
      return `
        <article class="tutorial-check-card">
          <p class="tutorial-card-eyebrow">${escapeHtml(step.support.title)}</p>
          <ul class="tutorial-summary-list">
            ${step.support.points
              .map((point) => `<li>${escapeHtml(point)}</li>`)
              .join("")}
          </ul>
        </article>
      `;
    }

    if (step.challenge.type === "pick-dice") {
      return `
        <article class="tutorial-check-card">
          <p class="tutorial-card-eyebrow">Quick check</p>
          <h3>${escapeHtml(step.challenge.prompt)}</h3>
          <p>${escapeHtml(step.challenge.instructions)}</p>
          <div class="tutorial-check-actions">
            <span class="tutorial-selection-count">
              ${tutorialState.selectedDice.length}/${step.challenge.correctDice.length} selected
            </span>
            <button
              class="ghost-button tutorial-check-button"
              type="button"
              data-tutorial-action="check-dice"
              ${tutorialState.selectedDice.length !== step.challenge.correctDice.length ? "disabled" : ""}
            >
              Check selection
            </button>
          </div>
          ${
            feedback
              ? `<div class="tutorial-feedback is-${feedback.tone}" role="status" aria-live="polite">${escapeHtml(
                  feedback.message,
                )}</div>`
              : `<div class="tutorial-feedback tutorial-feedback--placeholder" aria-hidden="true">Pick the dice that make the match.</div>`
          }
          ${
            solved
              ? `<div class="tutorial-success-chip">Step complete</div>`
              : ""
          }
        </article>
      `;
    }

    return `
      <article class="tutorial-check-card">
        <p class="tutorial-card-eyebrow">Quick check</p>
        <h3>${escapeHtml(step.challenge.prompt)}</h3>
        <p>${escapeHtml(step.challenge.instructions)}</p>
        <div class="tutorial-choice-grid">
          ${step.challenge.options
            .map((option) => {
              const isSelected = tutorialState.selectedOption === option.value;
              const isCorrect = solved && option.value === step.challenge.correctValue;
              const isWrong =
                tutorialState.feedback?.tone === "warn" && isSelected;
              return `
                <button
                  class="tutorial-choice${isSelected ? " is-selected" : ""}${isCorrect ? " is-correct" : ""}${isWrong ? " is-wrong" : ""}"
                  type="button"
                  data-tutorial-option="${escapeHtml(option.value)}"
                  ${solved ? "disabled" : ""}
                >
                  <strong>${escapeHtml(option.label)}</strong>
                  <span>${escapeHtml(option.detail)}</span>
                </button>
              `;
            })
            .join("")}
        </div>
        ${
          feedback
            ? `<div class="tutorial-feedback is-${feedback.tone}" role="status" aria-live="polite">${escapeHtml(
                feedback.message,
              )}</div>`
            : `<div class="tutorial-feedback tutorial-feedback--placeholder" aria-hidden="true">Choose the best answer to unlock the next step.</div>`
        }
      </article>
    `;
  }

  function renderSummaryCard(step) {
    return `
      <article class="tutorial-summary-card">
        <p class="tutorial-card-eyebrow">${escapeHtml(step.summary.title)}</p>
        <ul class="tutorial-summary-list">
          ${step.summary.points
            .map((point) => `<li>${escapeHtml(point)}</li>`)
            .join("")}
        </ul>
      </article>
    `;
  }

  function renderReadyCard(step) {
    return `
      <article class="tutorial-check-card tutorial-check-card--ready">
        <p class="tutorial-card-eyebrow">${escapeHtml(step.support.title)}</p>
        <ul class="tutorial-summary-list">
          ${step.support.points
            .map((point) => `<li>${escapeHtml(point)}</li>`)
            .join("")}
        </ul>
        <div class="tutorial-feedback is-good" role="status" aria-live="polite">
          Tutorial complete. Use the full rules any time you want the reference version.
        </div>
      </article>
    `;
  }

  function renderStepCard() {
    const step = getStep();
    const solved = isSolved();

    if (step.kind === "summary") {
      return `
        <article class="tutorial-step-card">
          <div class="tutorial-step-head">
            <div>
              <p class="section-label">${escapeHtml(step.eyebrow)}</p>
              <h3>${escapeHtml(step.title)}</h3>
            </div>
            <span class="tutorial-step-chip">Finish</span>
          </div>
          <p class="tutorial-step-lead">${escapeHtml(step.body)}</p>
          <div class="tutorial-board tutorial-board--summary">
            ${renderSummaryCard(step)}
            ${renderReadyCard(step)}
          </div>
          <div class="tutorial-coach">${escapeHtml(step.coach)}</div>
        </article>
      `;
    }

    return `
      <article class="tutorial-step-card">
        <div class="tutorial-step-head">
          <div>
            <p class="section-label">${escapeHtml(step.eyebrow)}</p>
            <h3>${escapeHtml(step.title)}</h3>
          </div>
          <span class="tutorial-step-chip">${tutorialState.currentStepIndex + 1}/${TUTORIAL_STEPS.length}</span>
        </div>
        <p class="tutorial-step-lead">${escapeHtml(step.body)}</p>
        <div class="tutorial-board">
          ${renderLessonCard(step, solved)}
          ${renderChallengeCard(step, solved)}
        </div>
        ${
          step.coach
            ? `<div class="tutorial-coach">${escapeHtml(step.coach)}</div>`
            : ""
        }
      </article>
    `;
  }

  function render() {
    const currentStep = getStep();
    const solved = isSolved();
    const progressRatio =
      ((tutorialState.currentStepIndex + 1) / TUTORIAL_STEPS.length) * 100;

    stepCounter.textContent = `Step ${tutorialState.currentStepIndex + 1} of ${TUTORIAL_STEPS.length}`;
    progressFill.style.width = `${progressRatio}%`;
    prevButton.disabled = tutorialState.currentStepIndex === 0;
    nextButton.disabled = Boolean(currentStep.challenge) && !solved;
    nextButton.textContent =
      tutorialState.currentStepIndex === TUTORIAL_STEPS.length - 1
        ? "Start Playing"
        : solved
          ? "Continue"
          : "Solve to Continue";

    if (statusBadge) {
      statusBadge.textContent = tutorialState.completed
        ? "Completed"
        : "Quick tutorial";
    }

    renderProgress();
    stepCard.innerHTML = renderStepCard();
  }

  root.addEventListener("click", (event) => {
    const progressButton = event.target.closest("[data-tutorial-progress]");
    const dieButton = event.target.closest("[data-tutorial-die]");
    const optionButton = event.target.closest("[data-tutorial-option]");
    const actionButton = event.target.closest("[data-tutorial-action]");

    if (progressButton) {
      handleProgressJump(Number(progressButton.dataset.tutorialProgress));
      return;
    }

    if (dieButton) {
      handleDiceToggle(Number(dieButton.dataset.tutorialDie));
      return;
    }

    if (optionButton) {
      chooseOption(optionButton.dataset.tutorialOption);
      return;
    }

    if (actionButton?.dataset.tutorialAction === "check-dice") {
      checkDiceSelection();
    }
  });

  prevButton.addEventListener("click", () => {
    goToStep(tutorialState.currentStepIndex - 1);
  });

  nextButton.addEventListener("click", () => {
    if (nextButton.disabled) {
      return;
    }

    handleNext();
  });

  restartButton.addEventListener("click", () => {
    reset({ preserveCompletion: true });
  });

  render();

  return {
    render,
    reset,
  };
}

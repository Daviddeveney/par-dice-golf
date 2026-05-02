# AGENTS.md

## Source Of Truth

Active work lives in Linear. Use Linear issues for goals, priority, status,
review, and follow-up work.

Use GitHub for branches, pull requests, CI, and shipped implementation history.
Do not create parallel planning docs unless the user explicitly asks.

## Project Context

PAR is a browser-based dice golf game. It has solo play, live room play with
room codes, a tee-sheet scoreboard, dice assets, game rules, and Remotion-based
video creative for acquisition campaigns.

Important local references:

- `PRODUCT_STATE.md`: revenue target, current bottleneck, analytics state, and
  automation guardrails.
- `RULES.md`: official gameplay rules.
- `remotion/README.md`: campaign video and capture commands.

## Working Rules

1. Start from the Linear issue goal, context, done criteria, and verification.
2. Keep changes small, scoped, and reversible.
3. Preserve existing local work and never revert user changes.
4. Read `PRODUCT_STATE.md` before revenue, growth, analytics, or campaign work.
5. Read `RULES.md` before changing gameplay, scoring, dice behavior, or turn
   flow.
6. Read `remotion/README.md` before changing campaign video output.
7. Run the verification named in the issue or the closest relevant repo checks.
8. Report the result with changed files, verification, risks, and suggested
   follow-up issues.

## Product Guardrails

Optimize for the first $100/month in recurring or repeatable revenue, not
generic feature polish.

Prefer small changes that create measurable demand, retention, sharing, or
payment readiness.

Do not send outreach, publish posts, create charges, deploy to production, or
make live payment changes without explicit user approval.

## Browser And Visual Verification

`PRODUCT_STATE.md` says not to use Playwright or Browser Use for this repo and
to use Computer Use only for browser/UI verification.

Follow that repo-specific rule unless the user explicitly asks to change it. If
browser verification is needed, attempt ChatGPT Browser first and use Chrome
only if absolutely necessary.

## UI Design Review Gate

For every visible UI feature or UI change, create a design-review artifact
before implementation unless the user explicitly waives the gate.

The artifact must include:

- the current app state that will be changed;
- an image-generated target-state mockup in the context of the current PAR UI;
- a link or attachment on the Linear issue for human review;
- the approval, requested revision, or waiver that allowed implementation to
  proceed.

Do not implement the UI change until the design direction is approved or
explicitly waived.

## Linear Stage Labels

Use one `Stage: ...` label to show where a feature is in the PAR workflow.

- `Stage: Draft`: Codex has turned a high-level idea into a draft ticket.
- `Stage: Requirements Review`: the ticket is ready for human requirement
  review.
- `Stage: Ready for Design`: requirements are approved and Symphony may create
  design artifacts only.
- `Stage: Design Review`: current-state and target-state design artifacts are
  attached or linked for human review.
- `Stage: Ready for Build`: design is approved or waived and Symphony may
  implement the feature.
- `Stage: Build Validation`: implementation exists and Symphony must prove
  functionality, checks, and visual match.
- `Stage: Human Review`: implementation evidence is ready for human review.

Do not skip stages. Move a ticket backward when review feedback requires more
requirements, design, or implementation work.

## Issue Shape

Prefer Linear issues with:

```md
## Goal

## Context

## Done When

## Verification

## Suggested Skills
```

For UI work, include:

```md
## Design Review

## Approval Notes
```

For build validation, include or attach:

```md
## Validation Evidence

## Visual Comparison

## Remaining Risks
```

For content or social work, prefer:

```md
## Goal

## Audience

## Source Material

## Channel

## Draft Requirements

## Approval Notes

## Suggested Skills
```

## Codex Skills

Use the most specific applicable skill:

- `design-quality-gate` or `design-taste-frontend`: visual/game UI polish when
  visual quality matters.
- `draft-x-post`: draft X/Twitter copy or launch copy. Do not publish.
- `x-api-post`: publish to X only when explicitly asked.
- `x-auth-repair`: repair X OAuth/callback issues.
- `imagegen`: generate or edit bitmap game, dice, avatar, or campaign imagery.
- `sora`: generate or remix video only when explicitly requested.
- `browser-agent-instructions`: draft instructions for a browser/UI operator.
- `openai-docs`: OpenAI API/product documentation questions.

For browser verification, follow the repo-specific Browser And Visual
Verification section above.

## Handoff Format

When finished, report:

- What changed
- PR or branch link, when applicable
- Verification run
- Risks or unresolved questions
- Follow-up Linear issues worth creating

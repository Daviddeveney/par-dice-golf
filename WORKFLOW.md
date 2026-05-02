---
tracker:
  kind: linear
  project_slug: "par-aa8e5dd2df2c"
  active_states:
    - Ready for Design
    - Ready for Work
  terminal_states:
    - Done
    - Deployed
    - Closed
    - Cancelled
    - Canceled
    - Duplicate
polling:
  interval_ms: 30000
workspace:
  root: ~/.symphony/workspaces/par
hooks:
  after_create: |
    git clone --depth 1 https://github.com/Daviddeveney/par-dice-golf.git .
agent:
  max_concurrent_agents: 1
  max_turns: 1
codex:
  command: codex app-server
  approval_policy: never
  thread_sandbox: workspace-write
  turn_timeout_ms: 180000
  stall_timeout_ms: 60000
---

You are working on a Linear issue for the PAR golf game repo.

Issue:

- Identifier: `{{ issue.identifier }}`
- Title: `{{ issue.title }}`
- Current status: `{{ issue.state }}`
- Labels: `{{ issue.labels }}`
- URL: `{{ issue.url }}`

Description:

{% if issue.description %}
{{ issue.description }}
{% else %}
No description provided.
{% endif %}

## Operating Rules

1. Work only inside the isolated workspace created for this issue.
2. Use the issue context already provided in this prompt. Do not call Linear just to reread the same issue.
3. If you use `linear_graphql`, keep it to one issue by ID or identifier. Never run broad project/workspace queries.
4. Do not publish, deploy, create charges, change payment configuration, send outreach, or make customer-facing communications without explicit user approval.
5. Finish quickly with either artifacts/evidence or a blocker comment. Do not continue exploring after the stage skill's done criteria are met or blocked.
6. Do not read `WORKFLOW.md` from the cloned issue workspace; it may be stale.
   Use this Symphony prompt and the selected skill as the workflow source of
   truth.
7. Do not call `update_plan` in Symphony runs. Produce artifacts first.

## Preauthorized Design Artifact Uploads

For PAR issues in the `Ready for Design` Linear status, generated non-sensitive
design review artifacts under `.design/{{ issue.identifier }}/` are approved to
be uploaded back to the same Linear issue without per-run human confirmation.
Use `Ready for Design` as the single Symphony pickup queue for both first-pass
design work and follow-up refinement passes after human feedback.

This approval is intentionally narrow:

- allowed: generated PNG/Markdown/HTML design artifacts for the current issue;
- allowed destination: only this issue, `{{ issue.identifier }}`;
- not allowed: source files outside `.design/`, secrets, credentials, API keys,
  customer data, production exports, personal files, or artifacts for another
  issue;
- if an artifact may contain sensitive or unrelated data, stop and report a
  blocker instead of uploading it.

The host daemon may post the standard design-review comment and attach generated
visual artifacts so Linear stores them as reviewable ticket evidence. It should
upload original PNGs when the configured Linear credential has file-upload
scope; otherwise it should post the local artifact paths while preserving the
original PNGs in the issue workspace.

## Symphony Feedback Marker

Use the `Agent: Symphony` label to mark tickets that belong to the local
Symphony workflow. This is a Linear label, not a real mentionable Linear agent.

For design revisions, the reviewer should leave a normal Linear comment
containing `#symphony`, then move the issue back to `Ready for Design` so the
local daemon can pick up the next refinement pass. Example:

```md
#symphony Design feedback:
- Move the replay action lower in the result banner.
- Make it less prominent than the final score.
```

When the issue is moved back into an active workflow state, Symphony fetches
tagged comments from the same issue and writes them to
`.design/{{ issue.identifier }}/symphony-feedback.md` for the next pass. Only
comments newer than the last posted artifact set should be treated as new
feedback. Do not use `@codex` for this feedback loop because it may trigger the
installed Codex Linear app instead of the local Symphony daemon.

## Stage Rules

Use the issue's Linear status as the workflow gate. `Stage: ...` labels are
only human-readable compatibility markers and must not override the current
Linear status.

- `Ready for Design` status:
  this is the active Symphony design/refinement pickup state. Use
  `$par-design-artifacts` only. Your first
  shell command must be:

  ```bash
  /Users/daviddeveney/.codex/skills/par-design-artifacts/scripts/run_design_pass.sh "{{ issue.identifier }}" "{{ issue.title }}" "{{ issue.url }}"
  ```

  After that, run `git status --short`, report the artifact paths, and stop.
  Do not implement, manually refine, manually comment, or load other skills.
  The helper fetches any fresh `#symphony` feedback comments into
  `.design/{{ issue.identifier }}/symphony-feedback.md`.
  The helper must use the issue's `UI Scenario` contract plus the repo-local
  `.symphony/ui-scenarios.yaml` adapter to capture the current PAR UI and create
  a target-state visual artifact. If the adapter, scenario, app launch, fixture,
  screenshot, or target visual cannot be produced, it must post a blocker and
  move the issue back to `Requirements Review` instead of moving to
  `Design Review`.
  The helper writes a pending Linear action file. The local Symphony daemon
  posts the comment and moves the issue to Linear `Design Review` outside the
  Codex sandbox so this daemon does not repeatedly pick up the same issue.
  If tagged `#symphony` feedback exists, treat the run as a refinement
  iteration and incorporate that feedback into the next artifact set.
- `Ready for Work` status:
  this is the active Symphony implementation pickup state. Use
  `$par-build-validation` only. Implement only from approved design evidence or
  an explicit waiver, then move the issue to `Work Review` when validation
  evidence is ready.
- Any other status: stop immediately with a short final message.
  This pilot workflow intentionally handles only `Ready for Design` and
  `Ready for Work` pickup states.

If the status is missing or ambiguous, stop and ask for clarification.

## Handoff

Finish with:

- issue key
- workspace path
- branch or PR link, when applicable
- changed files
- verification run
- risks or unresolved questions
- recommended follow-up Linear issues

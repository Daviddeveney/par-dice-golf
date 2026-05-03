# PAR Codex Automation Workflow

This repo is operated by Linear plus Codex Automations.

## Source Of Truth

- Linear is the source of truth for feature intent, status, review, and
  feedback.
- GitHub is the source of truth for code history and shipped implementation.
- `codex-workflows/` is the repo-local playbook for app scenarios, safe
  personas, design capture, and validation.

## Linear Stages

Use the issue's Linear status as the workflow gate. `Stage: ...` labels are
human-readable compatibility markers and should match the current status.

1. `Backlog`
2. `Requirements Review`
3. `Ready for Design`
4. `Design Review`
5. `Ready for Work`
6. `Work Review`
7. `Ready for Marketing`
8. `Marketing Review`
9. `Ready for Deployment`
10. `Deployed`

## Automation Pickup

Codex Automations may pick up tickets that are:

- in project `PAR`;
- labeled `Agent: Codex`;
- in `Ready for Design` or `Ready for Work`;
- not blocked or canceled.

Automation should process at most one issue per run.

## Ready For Design

For visible UI work, Codex should:

1. Read the Linear issue.
2. Confirm the issue has a concrete `UI Scenario` with a scenario ID.
3. Use `codex-workflows/ui-scenarios.yaml` to reach the real app state.
4. Run:

   ```bash
   /Users/daviddeveney/.codex/skills/par-design-artifacts/scripts/run_design_pass.sh "<ISSUE-KEY>" "<ISSUE-TITLE>" "<ISSUE-URL>"
   ```

5. Comment the generated design evidence back to the same Linear issue.
6. Move the issue to `Design Review` when `current-state.png` and
   `target-state.png` exist.
7. Move the issue back to `Requirements Review` with a blocker if the scenario,
   app launch, screenshot capture, or target visual fails.

Design artifacts are written under `.design/<ISSUE-KEY>/` in the automation
workspace. Only generated non-sensitive artifacts for the current issue may be
posted back to Linear.

## Design Feedback

For another design iteration, leave a Linear comment containing `#codex-design`
and move the issue back to `Ready for Design`.

Codex should treat only fresh `#codex-design` comments as revision feedback for
the next pass.

## Ready For Work

For implementation, Codex should:

1. Confirm a design artifact is approved or explicitly waived.
2. Use `$par-build-validation`.
3. Make the smallest complete change.
4. Validate behavior and visual match against the approved design.
5. Comment implementation evidence back to Linear.
6. Move the issue to `Work Review` only when validation passes.

## Human Approval Required

Always require explicit user approval before:

- deploying to production;
- publishing social posts;
- sending customer-facing communications;
- changing payment configuration;
- creating charges;
- deleting production data;
- making irreversible third-party app changes.

## Playbook Files

- `codex-workflows/project.yaml`: project identity, Linear team/project, and
  default workflow states.
- `codex-workflows/personas.yaml`: safe persona IDs only, never credentials.
- `codex-workflows/ui-scenarios.yaml`: launch/setup/assert/capture steps for
  UI states.

## Handoff

Every automation run should report:

- issue key;
- workspace path;
- changed files or generated artifact files;
- verification run;
- resulting Linear status;
- risks or blocker reason.

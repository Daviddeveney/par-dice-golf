---
tracker:
  kind: linear
  project_slug: "par-aa8e5dd2df2c"
  active_states:
    - Todo
    - In Progress
  terminal_states:
    - Done
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
  thread_sandbox: workspace-write
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
2. Read `AGENTS.md` before changing anything.
3. Read `PRODUCT_STATE.md` before revenue, growth, analytics, or campaign work.
4. Read `RULES.md` before gameplay, scoring, dice, or turn-flow work.
5. Read `remotion/README.md` before Remotion or campaign-video work.
6. Keep the change as small as possible.
7. Run the verification named in the issue or the closest safe repo check.
8. Do not publish, deploy, create charges, change payment configuration, send outreach, or make customer-facing communications without explicit user approval.
9. For the first Symphony smoke test, prefer docs-only work and do not use browser automation.
10. For docs-only Symphony smoke tests, report that both `AGENTS.md` and `WORKFLOW.md` were read from the isolated workspace.

## Skill Routing

Use the most specific applicable skill:

- visual/game UI polish -> `design-quality-gate` or `design-taste-frontend`
- content/social draft -> `draft-x-post`
- explicit X publish request -> `x-api-post`
- X auth repair -> `x-auth-repair`
- generated bitmap assets -> `imagegen`
- explicit video generation/remix -> `sora`
- browser-operator prompt -> `browser-agent-instructions`
- OpenAI docs/API guidance -> `openai-docs`

## Handoff

Finish with:

- issue key
- workspace path
- branch or PR link, when applicable
- changed files
- verification run
- risks or unresolved questions
- recommended follow-up Linear issues

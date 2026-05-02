# PAR Remotion Workspace

This folder holds programmatic video creative for PAR acquisition campaigns,
especially X posts.

## License posture

Remotion is free for individuals, nonprofits, and for-profit organizations with
up to 3 employees. We do not need a Remotion Pro account for the current PAR
setup. Revisit licensing if PAR becomes a 4+ person company/team or starts using
Remotion as part of a larger commercial video automation operation.

## Commands

Install dependencies:

```bash
npm install
```

Open Remotion Studio:

```bash
npm run remotion:studio
```

Render the first X hook video:

```bash
npm run remotion:render:x-hook
```

Render the current game demo video:

```bash
npm run remotion:render:game-demo
```

Capture and render an actual played turn:

```bash
npm run capture:played-turn
npm run remotion:render:played-turn
```

Render a still preview:

```bash
npm run remotion:still:x-hook
```

Generated files go in `remotion/out/` and are ignored by git.

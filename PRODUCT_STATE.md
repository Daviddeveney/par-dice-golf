# PAR Product State

## Revenue Target

- Goal: $100/month in recurring or repeatable revenue.
- Primary near-term metric: qualified player interest that can convert into the first $100/month.
- Current stage: Pre-revenue / pre-capture validation.

## Product

- Name: PAR
- Category: browser-based dice golf game
- Core promise: a fast, social golf game played with dice, live rooms, and a tee-sheet scoreboard.
- Core audience hypothesis: casual game players, golf groups, party-game players, and friend groups who want a lightweight competitive game they can play from a link.

## Current Revenue Hypothesis

The first $100/month should come from the smallest paid or revenue-adjacent path that players understand quickly.

Candidate paths:

- Premium private rooms or tournament rooms.
- Season leaderboard or club pass.
- Paid host tools for recurring groups.
- Sponsor/ad-supported free play.
- Mobile launch or competitive mode waitlist that validates willingness to pay before payment integration.

## Current Bottleneck

PAR has a polished playable surface, rules, tutorial, solo play, rooms, scorecard flow, and GA4 page-view analytics, but no obvious capture, pricing, payment, or first-dollar path.

## Analytics

- Google account: playpardice@gmail.com
- Google Cloud project: david-gws-cli-20260311
- GA4 account/property: PAR Dice Golf
- Web stream: PAR Dice Golf
- Web stream URL: https://par-dice-golf.vercel.app/
- Measurement ID: G-6XXS8BYNY9
- Instrumentation status: base Google tag is installed in index.html.

## Next Revenue Move

Add or validate one lightweight conversion surface:

- a waitlist or interest CTA for competitive rooms, leaderboards, tournaments, or mobile launch;
- a pricing/offer test for a small premium feature;
- or a measurable share/invite loop that can generate repeat players.

## Automation Guardrails

- Optimize for reaching $100/month, not generic feature polish.
- Prefer small changes that create measurable demand, retention, sharing, or payment readiness.
- Use Computer Use only for browser/UI verification.
- Do not use Playwright or Browser Use.
- When Computer Use needs a browser, attempt ChatGPT Browser first and use Chrome only if absolutely necessary.
- Preserve existing local work and never revert user changes.
- Do not send outreach, publish posts, create charges, or make live payment changes without explicit user approval.

## Recursive Handoff

- Last completed move: added GA4 web stream and installed the base Google tag.
- Last evidence: GA4 stream was created for https://par-dice-golf.vercel.app/ with measurement ID G-6XXS8BYNY9.
- Next automation candidate: PAR Monetization Path Checker.
- Next human decision: choose the preferred first $100/month path from the candidate revenue paths.

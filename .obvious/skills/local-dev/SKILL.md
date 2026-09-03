---
name: local-dev
description: Durable LOCAL-DEV onboarding record for wiinci/rhythm-and-scale (VS Code extension, Node 20, npm, no services)
---

# Local Dev — Rhythm & Scale

Recorded 2026-09-03 from a successful onboarding run. Follow this to get a working dev stack in minutes.

## Setup

```bash
# If node_modules arrived root-owned (pre-built sandbox), fix ownership first:
sudo chown -R user:user node_modules 2>/dev/null || true
npm ci
```

No services, databases, ports, or env vars are required — this is a VS Code extension whose logic is pure CommonJS.

## Verify (expected results)

| Check | Command | Expected |
|---|---|---|
| Lint | `npm run lint` | 0 errors, 0 warnings |
| Tests | `npm test` | 33/33 pass, 11 suites (~1s) |
| Node | `node --version` | v20.x |

## Exercise the primary flows headlessly

`extension.js` / `src/preview.js` import `vscode` and cannot run outside an extension host, but the entire logic path of both commands is reachable in plain Node:

```js
const {computeScale} = require('./src/compute')
const {formatOutput, FORMAT_LANGUAGES} = require('./src/format')
const {generatePreviewHTML} = require('./src/webview')

const params = {scale: 1.25, baseFontSize: 16, lineHeight: 1.5, rhythm: 4}
const items = computeScale(params)                       // Generate command core
const css = formatOutput(items, {scaleName: 'Major third', scaleValue: 1.25, ...params, format: 'css'})
const html = generatePreviewHTML(params)                 // Live Preview panel
```

Sanity anchors: `items.length === 8`; h1 = 61px / 68px at 1.25/16/1.5/4; every `lineHeight >= fontSize` and `lineHeight % rhythm === 0` across all 16 ratios in `src/scales.js`.

Full F5 run (UI): open repo in VS Code → `F5` → Command Palette → "Rhythm & Scale: Generate" / "Open Live Preview".

## Gotchas

- `npm ci` on a root-owned `node_modules` fails with `EACCES rmdir node_modules/.bin` — chown first (see Setup).
- Ignore the stray untracked `bun.lock`; the repo lockfile is `package-lock.json`.
- README's `oxfmt`/`oxlint` rows are aspirational — not installed, not in devDependencies.
- No CI exists; lint + tests here are the only automated gates.

## Sandbox snapshot

Template `d7w4kptatfcsshcnlbgi:default` (2026-09-03T15:29:56.547Z) has deps pre-installed with user-owned `node_modules` — `npm test` / `npm run lint` should work immediately after boot.

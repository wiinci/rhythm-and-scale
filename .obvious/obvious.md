# Rhythm & Scale — Agent Guide

VS Code extension that generates a modular typographic scale with line-heights snapped to a vertical rhythm baseline grid. Pure JavaScript (CommonJS, ES2022) — no build step, no bundler, no external services, no ports.

## Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js 20 (ES2022 CommonJS; `engines.vscode ^1.75.0`) |
| Package manager | npm (lockfile: `package-lock.json`) |
| Extension host | VS Code API ^1.75.0 — `extension.js` is the `main` entry |
| Lint | ESLint 8 (`.eslintrc.json`) |
| Tests | Node built-in runner — `node --test test/*.test.js` (33 tests / 11 suites) |
| CI | None (no `.github/` directory) |

## Commands

```bash
npm ci          # clean install from package-lock.json
npm test        # 33 unit tests via node:test — no VS Code host needed
npm run lint    # eslint .
```

Run the extension interactively: open the repo in VS Code, press `F5` ("Run Extension" config in `.vscode/launch.json`), then Command Palette → **Rhythm & Scale: Generate** or **Rhythm & Scale: Open Live Preview**.

README mentions `oxfmt` / `oxlint` — neither is in devDependencies nor installed; `npm run lint` (ESLint) is the working lint path.

## Codebase Map

See `codebase-map.md`. Key split: `src/compute.js`, `src/format.js`, `src/scales.js`, `src/webview.js` are pure (no `vscode` import) and run headlessly in plain Node; `extension.js` and `src/preview.js` import `vscode` and only run inside an extension host.

## Local Verification Summary

Verified 2026-09-03 (Node v20.20.2, npm 10.8.2):

- `npm ci` — clean install OK (after one-time `sudo chown -R user:user node_modules`; pre-built sandbox ships root-owned `node_modules`)
- `npm run lint` — 0 errors, 0 warnings
- `npm test` — 33/33 pass, 0 fail
- Primary user flow exercised headlessly (replicates both commands without a VS Code host):
  - **Generate**: `computeScale({scale:1.25, baseFontSize:16, lineHeight:1.5, rhythm:4})` → 8 steps, h1 = 61px / 68px (×1.1) — matches README math tables
  - All 6 formatters (`css`, `css-fluid`, `tailwind`, `tokens`, `css-rhythm`, `css-rhythm-trim`) produce output with correct `FORMAT_LANGUAGES` mapping
  - Invariant (line-height ≥ font-size AND multiple of rhythm) holds across all 16 scale ratios × 8 steps at rhythm=8
  - **Live Preview**: `generatePreviewHTML({...})` → 16,984-char interactive HTML (range sliders + sample text)

## Environment & Gotchas

- No ports, servers, databases, or required env vars.
- `node_modules` may arrive root-owned in a fresh sandbox — `sudo chown -R user:user node_modules` first, or `npm ci` fails with `EACCES rmdir node_modules/.bin`.
- A stray untracked `bun.lock` may exist from sandbox pre-build — the repo lockfile is `package-lock.json`; do not commit `bun.lock`.
- The "Extension Tests" launch config points at `test/suite/index`, which does not exist — tests are pure-Node unit tests only.

## Sandbox Snapshot

- Snapshot/template ID: `d7w4kptatfcsshcnlbgi:default` — baked 2026-09-03T15:29:56.547Z from live session `i1yncwbihkb330toukylc`
- State baked in: deps installed via `npm ci` (user-owned `node_modules`), lint clean, 33/33 tests green.

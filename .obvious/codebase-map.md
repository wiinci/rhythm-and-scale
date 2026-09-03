# Codebase Map — wiinci/rhythm-and-scale

Folder-level overview (depth cap 2). ~1,450 lines of JS across 8 files. Single VS Code extension, no sub-apps.

| Path | Purpose | Notes |
|---|---|---|
| `extension.js` | Entry point (`main`). Registers both commands. Generate flow: QuickPick format → QuickPick scale ratio → 3× InputBox (base size, line-height, rhythm) → `computeScale` → `formatOutput` → open text document | imports `vscode` (host only) |
| `src/compute.js` | Pure math: `computeScale`, `smartLineHeight`, `pxToRem`, `fluidClamp`. Rhythm snapping guard: `max(ceil-snapped, first rhythm multiple ≥ font size)` | headless-safe |
| `src/scales.js` | Data only: 16 scale ratios (Minor second 1.0667 → Major twelfth 3.0) + 8 step definitions (small→h1, exponents −1…6) | headless-safe |
| `src/format.js` | 6 formatters (`formatCSS`, `formatCSSFluid`, `formatTailwind`, `formatTokens`, `formatCSSRhythm`, `formatCSSRhythmTrim`) + `formatOutput` router + `FORMAT_LANGUAGES` | headless-safe |
| `src/webview.js` | `generatePreviewHTML` — full HTML/CSS/JS template for the live preview panel; client-side recompute on slider input, `postMessage` copy | headless-safe |
| `src/preview.js` | WebView panel lifecycle + clipboard messaging | imports `vscode` |
| `test/compute.test.js` | node:test suites: scale math, interpolation, snapping invariant across ratios | 207 lines |
| `test/format.test.js` | node:test suites: all formatters + router + languages | 169 lines |
| `.vscode/` | `launch.json` (F5 "Run Extension" + "Extension Tests"), `extensions.json` | "Extension Tests" target `test/suite/index` does not exist |
| `.eslintrc.json` | ESLint 8 env commonjs/es2022/node, correctness rules only | |
| `jsconfig.json` | checkJs, CommonJS, ES2022 | |
| `package.json` | `main: ./extension.js`; scripts `lint`, `test`; devDeps: eslint, @types/vscode | no build/publish script |

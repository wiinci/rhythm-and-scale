# Rhythm & Scale

A VS Code extension that generates a **modular typographic scale** with line-heights snapped to a **vertical rhythm** baseline grid — and includes smart line-height interpolation that tightens headings automatically.

Based on Tim Brown's [More Meaningful Typography](https://alistapart.com/article/more-meaningful-typography/) and the concept of [vertical rhythm](https://medium.com/built-to-adapt/8-point-grid-vertical-rhythm-90d05ad95032).

## Features

- **🎨 Live Preview Panel** — a quiet, model-driven instrument: sticky toolbar, mono annotations, and the rhythm grid drawn behind the type
- **16 modular scale ratios** — Minor Second (1.067) through Major Twelfth (3.0)
- **Smart line-heights** — headings get tighter leading automatically; body text stays generous
- **Rhythm-snapped line-heights** — always snaps UP to the next grid multiple (never below font size)
- **6 output formats:**
  - CSS Custom Properties (`rem`)
  - CSS Fluid Type (`clamp()` + `vw`)
  - Tailwind CSS theme config
  - W3C Design Tokens (JSON)
  - CSS Rhythm tokens (`lh` + `rlh`)
  - CSS Rhythm + Trim (`text-box` progressive enhancement)
- **Input validation** — prompts reject non-numeric and out-of-range values
- **Copy or open from the preview** — one Copy… / Open… pair picks any of the six formats from the same picker the Generate command uses

---

## Usage

### Option 1: Live Preview (Recommended)

1. Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Type **"Rhythm & Scale: Open Live Preview"**
3. Adjust the scale preset, base size (4–40px), line-height, and rhythm (4–20px) in the sticky toolbar — every value also has an editable readout, and the panel remembers your settings across sessions
4. Toggle **Grid** to draw the rhythm-unit grid behind the specimen text; with it on, every line box lands on a gridline
5. Use **Copy…** or **Open…** to export: the picker lists all six output formats, and Open… writes the result to a new editor in that format's language

### Option 2: Generate and Export

1. Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Type **"Rhythm & Scale: Generate"**
3. Choose an output format → select a scale ratio → enter parameters
4. A new document opens with your generated output

---

## How It Works

### Workflow

```mermaid
flowchart TD
    A[User opens Command Palette] --> B{Which command?}
    B -->|"Open Live Preview"| C[WebView Panel]
    B -->|"Generate"| D[QuickPick: format]

    C --> E[Adjust toolbar controls]
    E --> F[Host validates the patch and renders the model]
    F --> G[Copy… / Open… → format picker]

    D --> H[QuickPick: scale ratio]
    H --> I[InputBox: base font size]
    I --> J[InputBox: line-height]
    J --> K[InputBox: rhythm]
    K --> L[computeScale]
    L --> M[Format output]
    M --> N[Open new text document]
```

### Architecture

```mermaid
graph LR
    subgraph "VS Code Host"
        EXT[extension.js] --> PREVIEW[src/preview.js]
        EXT --> COMPUTE[src/compute.js]
        EXT --> FORMAT[src/format.js]
        PREVIEW --> MODEL[src/preview-model.js]
        COMPUTE --> SCALES[src/scales.js]
        FORMAT --> COMPUTE
    end

    subgraph "WebView Panel"
        WEBVIEW[src/webview.js] --> RENDER[render(model) — no client math]
        RENDER -->|"postMessage: input / copy / open"| PREVIEW
        PREVIEW -->|"render message with model"| WEBVIEW
    end
```

### File Map

| File | Responsibility |
|------|---------------|
| `extension.js` | Command registration, QuickPick/InputBox flow, activation |
| `src/scales.js` | 16 scale ratios (data) + 8 step definitions (small → h1) |
| `src/compute.js` | Pure functions: `computeScale`, `smartLineHeight`, `pxToRem`, `fluidClamp` |
| `src/format.js` | Output formatters: CSS rem, CSS fluid clamp, Tailwind, Design Tokens |
| `src/preview-model.js` | Pure display model: `buildPreviewModel`, `applyPatch`, `LIMITS` |
| `src/webview.js` | HTML template generator for the live preview panel |
| `src/preview.js` | Panel lifecycle, host-owned state, messaging, Copy…/Open… |
| `test/*.test.js` | Unit tests (Node.js built-in `node:test` runner) |

---

## The Math

### Modular Scale

Each heading level's font size is computed by raising the scale ratio to a step exponent:

```
fontSize = round(ratio^exponent × baseFontSize)
```

Steps range from `exponent = -1` (small) through `exponent = 6` (h1):

| Step | Exponent | Example at 1.25 / 16px |
|------|----------|------------------------|
| small | -1 | 13px |
| default | 0 | 16px |
| h6 | 1 | 20px |
| h5 | 2 | 25px |
| h4 | 3 | 31px |
| h3 | 4 | 39px |
| h2 | 5 | 49px |
| h1 | 6 | 61px |

### Smart Line-Height Interpolation

Large headings need tight leading (×1.1) while body text needs generous spacing (user value, e.g. ×1.5). The extension interpolates linearly between these:

```mermaid
graph LR
    H1["h1: ×1.10"] --- H2["h2: ×1.17"] --- H3["h3: ×1.23"]
    H3 --- H4["h4: ×1.30"] --- H5["h5: ×1.37"] --- H6["h6: ×1.43"]
    H6 --- DEFAULT["body: ×1.50"]
```

**Formula:**

```
multiplier = userLineHeight − (userLineHeight − 1.1) × (exponent / 6)
```

- `exponent = 0` (body, small): full user value (e.g. 1.5)
- `exponent = 6` (h1): minimum of 1.1
- `exponent = 3` (h4): midpoint — e.g. 1.3

### Vertical Rhythm Snapping

Raw line-heights are snapped to the nearest grid multiple that is **at or above** the font size. This guarantees text never overlaps:

```
rawLineHeight  = ceil(fontSize × multiplier)
snapped        = ceil(rawLineHeight / rhythm) × rhythm
minLineHeight  = ceil(fontSize / rhythm) × rhythm
lineHeight     = max(snapped, minLineHeight)
```

**Why `max()`?** With tight multipliers and large rhythm grids, naive snapping can produce line-heights *below* the font size:

```
Example: fontSize = 61px, multiplier = 1.10, rhythm = 10px

Without guard:
  ceil(61 × 1.1) = 68  →  floor(68 / 10) × 10 = 60  ← BROKEN (60 < 61)

With guard:
  ceil(68 / 10) × 10 = 70
  ceil(61 / 10) × 10 = 70  (minimum)
  max(70, 70) = 70px  ✓
```

The `minLineHeight` floor ensures line-height is always the first rhythm multiple ≥ font size.

### Fluid Type (clamp)

For responsive scaling without breakpoints, the fluid formatter generates `clamp()` expressions:

```
clamp(minRem, intercept + slopeVw × 1vw, maxRem)
```

Where:
- `minPx` = 80% of the computed step size, rounded — the size at a 320px viewport
- `maxPx` = the computed step size — the size at a 1280px viewport
- `minRem`, `maxRem` = `minPx / root`, `maxPx / root`
- `slope` = `(maxPx − minPx) / (1280 − 320)`, written as `slopeVw` = `slope × 100`
- `intercept` = `minRem − slope × 320 / root`

### The rem root

Every format converts px to rem with the **base font size** as the root, so the default step is always `1rem`. At a base of 16px that is the browser default and nothing else is needed. At any other base, the rem values are only true once the page sets `html { font-size: base ÷ 16 × 100% }` — `112.5%` for an 18px base. Each generated file states the root it assumes in its header comment (or, for Design Tokens, in `$description`).

---

## Output Examples

Every block below is the formatter's exact output for the extension's defaults: Major third (1.25) at 16px, line-height 1.5, rhythm 4px. `test/readme.test.js` fails if they drift from the code; regenerate with `node scripts/readme-examples.js`.

### CSS Custom Properties (rem)

```css
/**
  Typographic scale: Major third (1.25) at 16px
  rem root: 16px (browser default)
  Line-height: 1.5
  Vertical rhythm: 4px
*/

:root {
  --font-size-small: 0.8125rem;
  --line-height-small: 20px;
  --font-size-default: 1rem;
  --line-height-default: 24px;
  --font-size-h6: 1.25rem;
  --line-height-h6: 32px;
  --font-size-h5: 1.5625rem;
  --line-height-h5: 36px;
  --font-size-h4: 1.9375rem;
  --line-height-h4: 44px;
  --font-size-h3: 2.4375rem;
  --line-height-h3: 52px;
  --font-size-h2: 3.0625rem;
  --line-height-h2: 60px;
  --font-size-h1: 3.8125rem;
  --line-height-h1: 68px;
}
```

### CSS Fluid Type (clamp)

```css
/**
  Fluid typographic scale: Major third (1.25) at 16px
  rem root: 16px (browser default)
  Line-height: 1.5
  Vertical rhythm: 4px
  Fluid range: 320px – 1280px viewport
*/

:root {
  --font-size-small: clamp(0.625rem, 0.5625rem + 0.3125vw, 0.8125rem);
  --line-height-small: 20px;
  --font-size-default: clamp(0.8125rem, 0.75rem + 0.3125vw, 1rem);
  --line-height-default: 24px;
  --font-size-h6: clamp(1rem, 0.9167rem + 0.4167vw, 1.25rem);
  --line-height-h6: 32px;
  --font-size-h5: clamp(1.25rem, 1.1458rem + 0.5208vw, 1.5625rem);
  --line-height-h5: 36px;
  --font-size-h4: clamp(1.5625rem, 1.4375rem + 0.625vw, 1.9375rem);
  --line-height-h4: 44px;
  --font-size-h3: clamp(1.9375rem, 1.7708rem + 0.8333vw, 2.4375rem);
  --line-height-h3: 52px;
  --font-size-h2: clamp(2.4375rem, 2.2292rem + 1.0417vw, 3.0625rem);
  --line-height-h2: 60px;
  --font-size-h1: clamp(3.0625rem, 2.8125rem + 1.25vw, 3.8125rem);
  --line-height-h1: 68px;
}
```

### Tailwind CSS

```js
// Typographic scale: Major third (1.25) at 16px
// rem root: 16px (browser default)
// Add to tailwind.config.js → theme.extend.fontSize

module.exports = {
  theme: {
    extend: {
      fontSize: {
        'small': ['0.8125rem', { lineHeight: '20px' }],
        'default': ['1rem', { lineHeight: '24px' }],
        'h6': ['1.25rem', { lineHeight: '32px' }],
        'h5': ['1.5625rem', { lineHeight: '36px' }],
        'h4': ['1.9375rem', { lineHeight: '44px' }],
        'h3': ['2.4375rem', { lineHeight: '52px' }],
        'h2': ['3.0625rem', { lineHeight: '60px' }],
        'h1': ['3.8125rem', { lineHeight: '68px' }],
      },
    },
  },
};
```

### W3C Design Tokens (JSON)

```json
{
  "$description": "Typographic scale: Major third (1.25) at 16px. rem root: 16px (browser default)",
  "fontSize": {
    "small": {
      "$type": "dimension",
      "$value": "0.8125rem"
    },
    "default": {
      "$type": "dimension",
      "$value": "1rem"
    },
    "h6": {
      "$type": "dimension",
      "$value": "1.25rem"
    },
    "h5": {
      "$type": "dimension",
      "$value": "1.5625rem"
    },
    "h4": {
      "$type": "dimension",
      "$value": "1.9375rem"
    },
    "h3": {
      "$type": "dimension",
      "$value": "2.4375rem"
    },
    "h2": {
      "$type": "dimension",
      "$value": "3.0625rem"
    },
    "h1": {
      "$type": "dimension",
      "$value": "3.8125rem"
    }
  },
  "lineHeight": {
    "small": {
      "$type": "dimension",
      "$value": "20px"
    },
    "default": {
      "$type": "dimension",
      "$value": "24px"
    },
    "h6": {
      "$type": "dimension",
      "$value": "32px"
    },
    "h5": {
      "$type": "dimension",
      "$value": "36px"
    },
    "h4": {
      "$type": "dimension",
      "$value": "44px"
    },
    "h3": {
      "$type": "dimension",
      "$value": "52px"
    },
    "h2": {
      "$type": "dimension",
      "$value": "60px"
    },
    "h1": {
      "$type": "dimension",
      "$value": "68px"
    }
  }
}
```

### CSS Rhythm (`lh` + `rlh`)

```css
/**
  Rhythm typographic scale: Major third (1.25) at 16px
  rem root: 16px (browser default)
  Base line-height: 1.5
  Vertical rhythm input: 4px
  line-height tokens are unitless. spacing tokens use lh/rlh.
*/

:root {
  --font-size-small: 0.8125rem;
  --line-height-small: 1.5385;
  --font-size-default: 1rem;
  --line-height-default: 1.5;
  --font-size-h6: 1.25rem;
  --line-height-h6: 1.6;
  --font-size-h5: 1.5625rem;
  --line-height-h5: 1.44;
  --font-size-h4: 1.9375rem;
  --line-height-h4: 1.4194;
  --font-size-h3: 2.4375rem;
  --line-height-h3: 1.3333;
  --font-size-h2: 3.0625rem;
  --line-height-h2: 1.2245;
  --font-size-h1: 3.8125rem;
  --line-height-h1: 1.1148;

  /* Rhythm spacing tokens */
  --space-0: 0;
  --space-1: 0.5lh;
  --space-2: 1lh;
  --space-3: 1.5lh;
  --space-4: 2lh;
  --space-section: 2rlh;
}
```

### CSS Rhythm + Trim

The CSS Rhythm output above, followed by:

```css
/* Progressive enhancement for optical vertical alignment */
@supports (text-box: trim-both cap alphabetic) {
  .trim-text {
    text-box: trim-both cap alphabetic;
  }

  .trim-text-ex {
    text-box: trim-both ex alphabetic;
  }
}
```

### Compatibility Notes

- `lh` and `rlh` are widely supported in modern browsers.
- `text-box` trimming features are still best treated as progressive enhancement.
- Keep fallback declarations first, then apply `text-box` rules inside `@supports`.

---

## Development

```bash
git clone https://github.com/wiinci/rhythm-and-scale.git
cd rhythm-and-scale
npm install
```

| Task | Command |
|------|---------|
| Run extension | Open in VS Code → press `F5` |
| Run tests | `npm test` |
| Lint | `npm run lint` |
| Regenerate README output examples | `node scripts/readme-examples.js` |
| Format (oxfmt) | `oxfmt --write .` |
| Lint (oxlint) | `oxlint .` |

### Test Coverage

Unit tests covering:
- Scale computation (all ratios, edge cases)
- Smart line-height interpolation behavior
- Line-height ≥ font-size invariant (rhythm snapping guard)
- All 6 output formatters
- Input validation

---

## VS Code API Surface

| API | Usage |
|-----|-------|
| [`commands.registerCommand`](https://code.visualstudio.com/api/references/vscode-api#commands.registerCommand) | Register both commands |
| [`window.createWebviewPanel`](https://code.visualstudio.com/api/references/vscode-api#window.createWebviewPanel) | Live preview panel |
| [`window.showQuickPick`](https://code.visualstudio.com/api/references/vscode-api#window.showQuickPick) | Format + scale selection |
| [`window.showInputBox`](https://code.visualstudio.com/api/references/vscode-api#window.showInputBox) | Numeric parameter entry |
| [`workspace.openTextDocument`](https://code.visualstudio.com/api/references/vscode-api#workspace.openTextDocument) | Open generated output |
| [`env.clipboard.writeText`](https://code.visualstudio.com/api/references/vscode-api#env.clipboard) | Copy from preview panel |

---

## License

MIT

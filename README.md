# Rhythm & Scale

A VS Code extension that generates a **modular typographic scale** with line-heights snapped to a **vertical rhythm** baseline grid.

Based on Tim Brown's [More Meaningful Typography](https://alistapart.com/article/more-meaningful-typography/) and the concept of [vertical rhythm](https://medium.com/built-to-adapt/8-point-grid-vertical-rhythm-90d05ad95032).

## Features

- **16 modular scale ratios** — from Minor Second to Major Twelfth
- **Multiple output formats:**
  - CSS Custom Properties (rem)
  - CSS Fluid Type (clamp + vw)
  - Tailwind CSS theme config
  - W3C Design Tokens (JSON)
- **Input validation** — prompts reject non-numeric values
- **Vertical rhythm snapping** — line-heights align to your baseline grid

## Output Example (CSS Fluid)

```css
/**
  Fluid typographic scale: Major third (1.25) at 16px
  Line-height: 1.5
  Vertical rhythm: 4px
  Fluid range: 320px – 1280px viewport
*/

:root {
	--font-size-small: clamp(0.6375rem, 0.425rem + 0.8333vw, 0.8125rem);
	--line-height-small: 20px;
	--font-size-default: clamp(0.8rem, 0.5333rem + 1.0417vw, 1rem);
	--line-height-default: 24px;
	/* ... h6 through h1 ... */
}
```

## Usage

1. Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Type **"Rhythm & Scale"** and select the command
3. Choose an output format
4. Select a scale ratio
5. Enter base font size, line height, and rhythm values
6. A new document opens with your generated output

## Demo

![rhythm-and-scale](https://user-images.githubusercontent.com/505739/158106909-8a5bb5bd-0e99-4169-b962-264cc72e5439.gif)

## Development

```bash
git clone https://github.com/wiinci/rhythm-and-scale.git
cd rhythm-and-scale
npm install
```

- **Run extension:** Open in VS Code, press `F5`
- **Run tests:** `npm test`
- **Lint:** `npm run lint`

## Architecture

```
extension.js          → VS Code command registration and UI flow
src/scales.js         → Scale ratios and step definitions (data)
src/compute.js        → Pure functions: computeScale, pxToRem, fluidClamp
src/format.js         → Output formatters (CSS, fluid, Tailwind, tokens)
test/*.test.js        → Unit tests (Node.js built-in test runner)
```

## VS Code API

- [`commands.registerCommand`](https://code.visualstudio.com/api/references/vscode-api#commands.registerCommand)
- [`window.showInputBox`](https://code.visualstudio.com/api/references/vscode-api#window.showInputBox)
- [`window.showQuickPick`](https://code.visualstudio.com/api/references/vscode-api#window.showQuickPick)
- [`window.showTextDocument`](https://code.visualstudio.com/api/references/vscode-api#window.showTextDocument)
- [`workspace.openTextDocument`](https://code.visualstudio.com/api/references/vscode-api#workspace.openTextDocument)

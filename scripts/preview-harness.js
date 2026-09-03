#!/usr/bin/env node
/**
 * Dev-only QA harness for the Live Preview panel. Not part of the extension.
 *
 * Renders generatePreviewHTML() into a standalone HTML file that can be
 * driven by a headless browser: acquireVsCodeApi() is stubbed, and input
 * messages are answered in-page by the REAL applyPatch + buildPreviewModel
 * loaded through a tiny CommonJS shim — one source of math, no duplication.
 *
 * Usage:
 *   node scripts/preview-harness.js --theme=dark --out=preview.html
 *   node scripts/preview-harness.js --theme=light --rhythm=8 --baseFontSize=18
 */
const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
function flag(name, fallback) {
	const hit = args.find((arg) => arg.startsWith(`--${name}=`))
	return hit === undefined ? fallback : hit.slice(name.length + 3)
}
function flagNumber(name, fallback) {
	const raw = flag(name, '')
	const value = Number(raw)
	return raw !== '' && Number.isFinite(value) ? value : fallback
}

// Stand-in palettes approximating VS Code Dark+ and Light+. They exercise the
// same --vscode-* tokens the extension uses; they are not VS Code captures.
const THEMES = {
	dark: {
		'--vscode-font-family': 'system-ui, -apple-system, "Segoe UI", sans-serif',
		'--vscode-editor-font-family': '"SF Mono", Menlo, Monaco, Consolas, "Courier New", monospace',
		'--vscode-foreground': '#cccccc',
		'--vscode-descriptionForeground': '#9d9d9d',
		'--vscode-editor-background': '#1e1e1e',
		'--vscode-input-background': '#3c3c3c',
		'--vscode-input-border': '#3c3c3c',
		'--vscode-input-foreground': '#cccccc',
		'--vscode-panel-border': '#3c3c3c',
		'--vscode-button-background': '#0e639c',
		'--vscode-button-secondaryBackground': '#3a3d41',
		'--vscode-button-secondaryForeground': '#ffffff',
		'--vscode-button-secondaryHoverBackground': '#45494e',
		'--vscode-scrollbarSlider-background': 'rgba(121, 121, 121, 0.4)',
		'--vscode-focusBorder': '#007fd4',
		'--vscode-errorForeground': '#f48771',
	},
	light: {
		'--vscode-font-family': 'system-ui, -apple-system, "Segoe UI", sans-serif',
		'--vscode-editor-font-family': '"SF Mono", Menlo, Monaco, Consolas, "Courier New", monospace',
		'--vscode-foreground': '#3b3b3b',
		'--vscode-descriptionForeground': '#616161',
		'--vscode-editor-background': '#ffffff',
		'--vscode-input-background': '#ffffff',
		'--vscode-input-border': '#cecece',
		'--vscode-input-foreground': '#3b3b3b',
		'--vscode-panel-border': '#c8c8c8',
		'--vscode-button-background': '#005fb8',
		'--vscode-button-secondaryBackground': '#e4e6f1',
		'--vscode-button-secondaryForeground': '#1f1f1f',
		'--vscode-button-secondaryHoverBackground': '#d0d4e4',
		'--vscode-scrollbarSlider-background': 'rgba(100, 100, 100, 0.4)',
		'--vscode-focusBorder': '#005fb8',
		'--vscode-errorForeground': '#e51400',
	},
}

const theme = THEMES[flag('theme', 'dark')] ?? THEMES.dark

// The harness host starts from DEFAULT_STATE and goes through the same
// validated patch path the extension host uses.
const {DEFAULT_STATE, applyPatch, buildPreviewModel} = require('../src/preview-model')
const {generatePreviewHTML} = require('../src/webview')
let state = {...DEFAULT_STATE}
for (const key of ['scale', 'baseFontSize', 'lineHeight', 'rhythm']) {
	const value = flagNumber(key, Number.NaN)
	if (Number.isFinite(value)) state = applyPatch(state, {[key]: value})
}
if (flag('grid', '') !== '') state = applyPatch(state, {grid: flag('grid', 'on') === 'on'})
const model = buildPreviewModel(state)

// Tiny CommonJS shim so the page runs the real module sources in order.
function defineModule(name, file) {
	const source = fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8')
	return `__define(${JSON.stringify(name)}, function (__require, module, exports) {\n${source}\n});`
}

const shim = [
	'const __modules = {};',
	'function __define(name, factory) { __modules[name] = factory; }',
	'function __require(name) {',
	'  const module_ = { exports: {} };',
	'  __modules[name](__require, module_, module_.exports);',
	'  return module_.exports;',
	'}',
	defineModule('./scales', 'scales.js'),
	defineModule('./compute', 'compute.js'),
	defineModule('./preview-model', 'preview-model.js'),
	'const { applyPatch, buildPreviewModel } = __require("./preview-model");',
].join('\n')

const stub = `
  let __state = JSON.parse(document.getElementById('harness-state').textContent);
  function acquireVsCodeApi() {
    return {
      postMessage(message) {
        if (!message || message.type !== 'input') return;
        __state = applyPatch(__state, message.patch);
        const model = buildPreviewModel(__state);
        setTimeout(() => {
          window.dispatchEvent(new MessageEvent('message', { data: { type: 'render', model } }));
        }, 0);
      }
    };
  }
`

const themeCSS = `:root {\n${Object.entries(theme)
	.map(([name, value]) => `    ${name}: ${value};`)
	.join('\n')}\n  }`

const page = generatePreviewHTML(model).replace(
	'<head>',
	`<head>\n  <style id="harness-theme">\n  ${themeCSS}\n  </style>\n  <script id="harness-host">\n${shim}\n${stub}\n  </script>\n  <script type="application/json" id="harness-state">${JSON.stringify(state).replace(/</g, '\\u003c')}</script>`,
)

const out = path.resolve(process.cwd(), flag('out', 'preview-harness.html'))
fs.writeFileSync(out, page)
process.stdout.write(`wrote ${out} (${theme === THEMES.dark ? 'dark' : flag('theme')} theme, scale ${state.scale}, base ${state.baseFontSize}px, lh ${state.lineHeight}, rhythm ${state.rhythm}px, grid ${state.grid})\n`)

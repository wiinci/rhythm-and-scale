const {describe, it} = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const {generatePreviewHTML, embedModel} = require('../src/webview')
const {DEFAULT_STATE, LIMITS, buildPreviewModel} = require('../src/preview-model')

const model = buildPreviewModel(DEFAULT_STATE)
const html = generatePreviewHTML(model)

/** Extract the JSON text of the embedded model data block. */
function embeddedModel(page) {
	const match = page.match(/<script type="application\/json" id="model">(.*?)<\/script>/s)
	assert.ok(match, 'model data block missing')
	return match[1]
}

/** The <style> block of the generated page. */
function pageCSS(page) {
	const match = page.match(/<style>([\s\S]*?)<\/style>/)
	assert.ok(match, 'style block missing')
	return match[1]
}

describe('generatePreviewHTML', () => {
	it('embeds the host model as JSON that parses back to the same model', () => {
		assert.deepEqual(JSON.parse(embeddedModel(html)), model)
	})

	it('has exactly two action buttons: Copy… and Open…', () => {
		const buttons = html.match(/<button[^>]*>[^<]*<\/button>/g)
		assert.equal(buttons.length, 2)
		assert.ok(buttons[0].includes('id="copy"') && buttons[0].includes('Copy…'))
		assert.ok(buttons[1].includes('id="open"') && buttons[1].includes('Open…'))
	})

	it('bounds every numeric control with the host LIMITS, base font size in steps of 1', () => {
		assert.ok(html.includes('id="baseFontSize" min="4" max="40" step="1"'))
		assert.ok(html.includes(`id="lineHeight" min="${LIMITS.lineHeight.min}" max="${LIMITS.lineHeight.max}" step="${LIMITS.lineHeight.step}"`))
		assert.ok(html.includes(`id="rhythm" min="${LIMITS.rhythm.min}" max="${LIMITS.rhythm.max}" step="${LIMITS.rhythm.step}"`))
	})

	it('computes nothing client-side: no duplicated scale math or number formatting', () => {
		for (const forbidden of ['smartLineHeight', 'TIGHT_MIN', 'scale-info', 'toFixed(', 'Math.pow', 'Math.ceil', 'parseFloat']) {
			assert.ok(!html.includes(forbidden), `${forbidden} should not appear in the webview`)
		}
	})

	it('has one render function, used for first paint and for render messages', () => {
		assert.equal(html.match(/function render\(/g).length, 1)
		assert.ok(html.includes("render(JSON.parse(document.getElementById('model').textContent))"))
		assert.ok(html.includes("if (message && message.type === 'render') render(message.model)"))
	})

	it('posts input patches, copy and open to the host', () => {
		assert.ok(html.includes("vscode.postMessage({type: 'input', patch: patchToSend})"))
		assert.ok(html.includes("vscode.postMessage({type: 'copy'})"))
		assert.ok(html.includes("vscode.postMessage({type: 'open'})"))
		assert.ok(html.includes('requestAnimationFrame('))
	})

	it('keeps the content security policy unchanged', () => {
		assert.ok(
			html.includes(
				`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">`,
			),
		)
	})

	it('renders no specimen numbers server-side; every value comes from render()', () => {
		assert.ok(html.includes('<main class="column" id="preview"></main>'))
		assert.ok(!html.includes('<div class="sample" data-label'))
	})

	it('opens on a sticky toolbar instead of a header', () => {
		const css = pageCSS(html)
		assert.ok(/\.toolbar\s*{[^}]*position:\s*sticky;/.test(css), 'toolbar must be sticky')
		assert.ok(css.includes('border-bottom: 1px solid var(--vscode-panel-border)'), 'single hairline under the toolbar')
		assert.ok(!html.includes('<h1>'), 'no header block')
		assert.ok(!html.includes('class="controls"'), 'no boxed control panel')
	})

	it('toggles the rhythm grid with a checkbox seeded from the model', () => {
		assert.ok(html.includes('<label for="gridToggle">Grid</label>'))
		assert.ok(html.includes('<input type="checkbox" id="gridToggle">'))
		assert.ok(html.includes('gridToggle.checked = model.grid'))
		assert.ok(html.includes('queuePatch({grid: gridToggle.checked})'))
	})

	it('pairs each slider with an editable exact-value field bound to the same patch', () => {
		assert.ok(html.includes('id="baseFontSizeNumber"'))
		assert.ok(html.includes('id="rhythmNumber"'))
		assert.ok(html.includes("bindPair(baseFontSizeInput, baseFontSizeNumber, 'baseFontSize')"))
		assert.ok(html.includes("bindPair(rhythmInput, rhythmNumber, 'rhythm')"))
	})

	it('associates every control with a visible label or an accessible name', () => {
		for (const tag of html.match(/<(input|select)\b[^>]*>/g)) {
			const id = tag.match(/id="([^"]+)"/)?.[1]
			const named = (id && html.includes(`for="${id}"`)) || tag.includes('aria-label=')
			assert.ok(named, `unlabelled control: ${tag}`)
		}
		for (const match of html.match(/for="[^"]+"/g) ?? []) {
			const id = match.slice(5, -1)
			assert.ok(html.includes(`id="${id}"`), `label[for="${id}"] has no control`)
		}
	})

	it('flags rejected line-height input with aria-invalid and keeps the last rendering', () => {
		assert.ok(html.includes('flagInvalid(lineHeightInput, true)'))
		assert.ok(html.includes('input[type="number"][aria-invalid="true"]'))
	})

	it('renders one shared specimen text for all eight steps', () => {
		const sentence = 'Set to a scale, type reads as one voice; set to a grid, every line lands where the eye expects.'
		assert.equal(model.steps.length, 8)
		assert.equal(html.split(sentence).length - 1, 1, 'specimen text has one source; render() stamps it per step')
		assert.ok(html.includes('for (const step of model.steps)'))
		assert.ok(html.includes('stepFor(step.label)'))
	})

	it('annotates each step with label · px and rem · ratio · units, nothing uppercase', () => {
		assert.ok(html.includes("step.label + ' · ' + step.fontSizePx + ' / ' + step.lineHeightPx + ' px'"))
		assert.ok(html.includes("step.fontSizeRem + ' · ×' + step.ratio + ' · ' + step.rhythmUnits + ' × ' + model.rhythm"))
		assert.ok(!html.includes('toUpperCase()'))
		assert.ok(!html.includes('text-transform'))
		assert.ok(!html.includes('DISPLAY_LABELS'))
	})

	it('caps the specimen measure in ch and stacks annotations below 640px', () => {
		const css = pageCSS(html)
		assert.ok(/max-width:\s*60ch/.test(css), 'specimen measure capped in ch')
		assert.ok(css.includes('@media (max-width: 639px)'))
		assert.ok(/\.annotation\s*{[^}]*font-family:\s*var\(--vscode-editor-font-family\)/.test(css))
		assert.ok(/\.annotation\s*{[^}]*font-variant-numeric:\s*tabular-nums/.test(css))
		assert.ok(/\.annotation\s*{[^}]*font-size:\s*12px/.test(css))
	})

	it('draws the rhythm grid as a ::before layer that the Grid toggle can remove', () => {
		const css = pageCSS(html).replace(/\s+/g, ' ')
		const grid = css.match(/\.column::before {([^}]*)}/)
		assert.ok(grid, 'column ::before layer missing')
		assert.ok(grid[1].includes('repeating-linear-gradient(to bottom, var(--vscode-panel-border) 0 1px, transparent 1px var(--rhythm))'))
		assert.ok(grid[1].includes('pointer-events: none'))
		assert.ok(grid[1].includes('position: absolute'))
		assert.ok(css.includes('.column.no-grid::before { content: none; }'))
		assert.ok(html.includes("preview.classList.toggle('no-grid', !model.grid)"))
	})

	it('keeps every vertical dimension in the specimen column a rhythm multiple', () => {
		const css = pageCSS(html).replace(/\s+/g, ' ')
		const column = css.match(/\.column {([^}]*)}/)
		const step = css.match(/\.step {([^}]*)}/)
		const annotation = css.match(/\.annotation {([^}]*)}/)
		assert.ok(column, 'column block missing')
		assert.ok(column[0].includes('gap: var(--lh-body)') && column[0].includes('padding: var(--lh-body)'))
		assert.ok(step && step[0].includes('row-gap: var(--lh-body)'))
		assert.ok(annotation && annotation[0].includes('line-height: var(--lh-body)'))
		assert.ok(!/\.specimen {[^}]*margin(?!: 0)/.test(css), 'specimen carries a non-zero margin')
		assert.ok(!/\.annotation {[^}]*margin(?!: 0)/.test(css), 'annotation carries a non-zero margin')
	})

	it('styles with theme tokens only: no shadows, hard-coded colors or heavy radii', () => {
		const css = pageCSS(html)
		assert.ok(!css.includes('box-shadow'), 'no box shadows')
		assert.ok(!css.includes('rgba('), 'no rgba colors')
		assert.ok(!css.includes('#'), 'no hex color literals')
		for (const radius of css.match(/border-radius:\s*[^;]+/g) ?? []) {
			assert.ok(/^border-radius:\s*[12]px$/.test(radius.replace(/\s+/g, ' ').trim()), `unexpected radius: ${radius}`)
		}
		assert.ok(!css.includes('cursor: grab'), 'no grab cursor')
	})

	it('shows the focus ring only via :focus-visible in the theme focus color', () => {
		const css = pageCSS(html).replace(/\s+/g, ' ')
		assert.ok(css.includes(':is(button, input, select):focus { outline: none; }'))
		assert.ok(/:focus-visible\s*{[^}]*outline: 1px solid var\(--vscode-focusBorder\)/.test(css))
	})

	it('uses exactly two type sizes: 12px mono numbers and 13px UI labels', () => {
		const sizes = [...new Set((pageCSS(html).match(/font-size:\s*[^;]+/g) ?? []).map((s) => s.replace(/\s+/g, ' ').trim()))]
		assert.deepEqual(sizes.sort(), ['font-size: 12px', 'font-size: 13px'])
	})
})

describe('preview harness (dev-only)', () => {
	const harness = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'preview-harness.js'), 'utf8')
	const vscodeignore = fs.readFileSync(path.join(__dirname, '..', '.vscodeignore'), 'utf8')

	it('stubs acquireVsCodeApi and answers input with the real model functions', () => {
		assert.ok(harness.includes('function acquireVsCodeApi()'))
		assert.ok(harness.includes('applyPatch(__state, message.patch)'))
		assert.ok(harness.includes('buildPreviewModel(__state)'))
	})

	it('ships outside the package', () => {
		assert.ok(vscodeignore.includes('scripts/**'))
	})
})

describe('embedModel', () => {
	it('escapes < so a model string can never close the script block', () => {
		const hostile = {...model, scaleName: '</script><script>alert(1)</script>'}
		const embedded = embedModel(hostile)
		assert.ok(!embedded.includes('</script>'))
		assert.ok(!embedded.includes('<'))
		assert.deepEqual(JSON.parse(embedded), hostile)
	})
})

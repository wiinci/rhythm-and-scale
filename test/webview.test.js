const {describe, it} = require('node:test')
const assert = require('node:assert/strict')
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
		assert.ok(html.includes('<div class="preview" id="preview"></div>'))
		assert.ok(!html.includes('<div class="sample" data-label'))
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

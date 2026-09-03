const {describe, it} = require('node:test')
const assert = require('node:assert/strict')
const {createPreview, createPreviewCommand, STATE_KEY} = require('../src/preview')
const {DEFAULT_STATE, buildPreviewModel} = require('../src/preview-model')
const {OUTPUT_FORMATS} = require('../src/output-formats')
const {computeScale} = require('../src/compute')
const {formatOutput} = require('../src/format')

/**
 * A stub of the slice of the VS Code API the preview touches. Every call is
 * recorded so tests can assert on what the host did, and the QuickPick and
 * clipboard behaviour can be scripted per test.
 */
function stubVscode({pick, clipboardError} = {}) {
	const calls = {
		panels: [],
		posted: [],
		quickPicks: [],
		clipboard: [],
		info: [],
		errors: [],
		opened: [],
		shown: [],
	}

	function createWebviewPanel(viewType, title, column, options) {
		const panel = {
			viewType,
			title,
			column,
			options,
			disposeListeners: [],
			revealCount: 0,
			webview: {
				html: '',
				messageHandler: undefined,
				onDidReceiveMessage(handler) {
					this.messageHandler = handler
					return {dispose() {}}
				},
				postMessage(message) {
					calls.posted.push(message)
					return Promise.resolve(true)
				},
			},
			reveal() {
				this.revealCount += 1
			},
			onDidDispose(listener) {
				this.disposeListeners.push(listener)
				return {dispose() {}}
			},
			dispose() {
				for (const listener of this.disposeListeners) listener()
			},
		}
		calls.panels.push(panel)
		return panel
	}

	const vscode = {
		ViewColumn: {One: 1},
		window: {
			activeTextEditor: undefined,
			createWebviewPanel,
			showQuickPick(items, options) {
				calls.quickPicks.push({items, options})
				return Promise.resolve(pick)
			},
			showInformationMessage(message) {
				calls.info.push(message)
			},
			showErrorMessage(message) {
				calls.errors.push(message)
			},
			showTextDocument(doc) {
				calls.shown.push(doc)
				return Promise.resolve()
			},
		},
		env: {
			clipboard: {
				writeText(text) {
					if (clipboardError) return Promise.reject(clipboardError)
					calls.clipboard.push(text)
					return Promise.resolve()
				},
			},
		},
		workspace: {
			openTextDocument(options) {
				calls.opened.push(options)
				return Promise.resolve(options)
			},
		},
	}
	return {vscode, calls}
}

/** An ExtensionContext with an in-memory globalState. */
function stubContext(stored = {}) {
	const store = new Map(Object.entries(stored))
	return {
		subscriptions: [],
		globalState: {
			get(key, defaultValue) {
				return store.has(key) ? store.get(key) : defaultValue
			},
			update(key, value) {
				store.set(key, value)
				return Promise.resolve()
			},
		},
		store,
	}
}

/** Create a preview and return the pieces a test needs to drive it. */
function openPreview(options = {}, stored = {}) {
	const {vscode, calls} = stubVscode(options)
	const context = stubContext(stored)
	const panel = createPreview(vscode, context)
	const send = (message) => panel.webview.messageHandler(message)
	return {vscode, calls, context, panel, send}
}

function expectedOutput(state, format) {
	return formatOutput(computeScale(state), {
		scaleName: 'Major third',
		scaleValue: state.scale,
		baseFontSize: state.baseFontSize,
		lineHeight: state.lineHeight,
		rhythm: state.rhythm,
		format,
	})
}

describe('createPreview', () => {
	it('creates the panel with scripts enabled and context retained, and paints the default model', () => {
		const {calls, panel} = openPreview()
		assert.equal(calls.panels.length, 1)
		assert.equal(panel.viewType, 'rhythmAndScalePreview')
		assert.equal(panel.options.enableScripts, true)
		assert.equal(panel.options.retainContextWhenHidden, true)
		assert.ok(panel.webview.html.includes(JSON.stringify(buildPreviewModel(DEFAULT_STATE))))
	})

	it('answers an input patch with exactly one render carrying the new model and persists the state', async () => {
		const {calls, context, send} = openPreview()
		await send({type: 'input', patch: {baseFontSize: 18}})

		assert.equal(calls.posted.length, 1)
		const [message] = calls.posted
		assert.equal(message.type, 'render')
		assert.equal(message.model.baseFontSize, 18)
		assert.deepEqual(message.model, buildPreviewModel({...DEFAULT_STATE, baseFontSize: 18}))
		assert.deepEqual(context.store.get(STATE_KEY), {...DEFAULT_STATE, baseFontSize: 18})
	})

	it('keeps the previous state when a patch is invalid, and still re-renders it', async () => {
		const {calls, context, send} = openPreview()
		await send({type: 'input', patch: {baseFontSize: 18}})
		await send({type: 'input', patch: {lineHeight: NaN, baseFontSize: 'huge', rhythm: Infinity}})

		assert.equal(calls.posted.length, 2)
		assert.deepEqual(calls.posted[1].model, calls.posted[0].model)
		assert.deepEqual(context.store.get(STATE_KEY), {...DEFAULT_STATE, baseFontSize: 18})
	})

	it('ignores messages it does not understand', async () => {
		const {calls, send} = openPreview()
		await send({type: 'explode'})
		await send(null)
		await send('copy')
		assert.equal(calls.posted.length, 0)
		assert.equal(calls.quickPicks.length, 0)
	})

	it('copy shows the shared format picker, writes that format to the clipboard and toasts its label', async () => {
		const pick = OUTPUT_FORMATS.find((item) => item.detail === 'css-rhythm-trim')
		const {calls, send} = openPreview({pick})
		await send({type: 'copy'})

		assert.equal(calls.quickPicks.length, 1)
		assert.equal(calls.quickPicks[0].items, OUTPUT_FORMATS)
		assert.deepEqual(calls.clipboard, [expectedOutput(DEFAULT_STATE, 'css-rhythm-trim')])
		assert.deepEqual(calls.info, ['Copied CSS Rhythm + Trim'])
		assert.ok(!calls.info[0].includes('!'))
		assert.ok(!calls.info[0].includes('CSS-RHYTHM-TRIM'))
		assert.equal(calls.errors.length, 0)
	})

	it('copy exports the current state, not the defaults', async () => {
		const pick = OUTPUT_FORMATS.find((item) => item.detail === 'css')
		const {calls, send} = openPreview({pick})
		await send({type: 'input', patch: {baseFontSize: 18, rhythm: 6}})
		await send({type: 'copy'})

		assert.deepEqual(calls.clipboard, [expectedOutput({...DEFAULT_STATE, baseFontSize: 18, rhythm: 6}, 'css')])
	})

	it('reports a clipboard failure instead of toasting success', async () => {
		const pick = OUTPUT_FORMATS[0]
		const {calls, send} = openPreview({pick, clipboardError: new Error('no clipboard')})
		await send({type: 'copy'})

		assert.equal(calls.info.length, 0)
		assert.deepEqual(calls.errors, ['Could not copy: no clipboard'])
	})

	it('does nothing when the picker is cancelled', async () => {
		const {calls, send} = openPreview({pick: undefined})
		await send({type: 'copy'})
		await send({type: 'open'})

		assert.equal(calls.quickPicks.length, 2)
		assert.equal(calls.clipboard.length, 0)
		assert.equal(calls.info.length, 0)
		assert.equal(calls.errors.length, 0)
		assert.equal(calls.opened.length, 0)
	})

	it('open puts the picked format in an untitled editor with its language, like Generate', async () => {
		const pick = OUTPUT_FORMATS.find((item) => item.detail === 'tokens')
		const {calls, send} = openPreview({pick})
		await send({type: 'open'})

		assert.equal(calls.quickPicks[0].items, OUTPUT_FORMATS)
		assert.deepEqual(calls.opened, [{language: 'json', content: expectedOutput(DEFAULT_STATE, 'tokens')}])
		assert.equal(calls.shown.length, 1)
		assert.equal(calls.clipboard.length, 0)
	})

	it('restores persisted state into the first paint of a new panel', async () => {
		const first = openPreview()
		await first.send({type: 'input', patch: {scale: 1.5, baseFontSize: 20, lineHeight: 1.6, rhythm: 8}})

		const second = openPreview({}, Object.fromEntries(first.context.store))
		const expected = buildPreviewModel({...DEFAULT_STATE, scale: 1.5, baseFontSize: 20, lineHeight: 1.6, rhythm: 8})
		assert.ok(second.panel.webview.html.includes(JSON.stringify(expected)))
	})

	it('sanitises persisted state through the same validation as a patch', () => {
		const {panel} = openPreview({}, {[STATE_KEY]: {baseFontSize: 999, lineHeight: 'tall', scale: 7, grid: 0}})
		const expected = buildPreviewModel({...DEFAULT_STATE, baseFontSize: 40, grid: false})
		assert.ok(panel.webview.html.includes(JSON.stringify(expected)))
	})
})

describe('createPreviewCommand', () => {
	it('creates one panel, reveals it while open, and creates a new one after disposal', () => {
		const {vscode, calls} = stubVscode()
		const context = stubContext()
		const open = createPreviewCommand(vscode, context)

		open()
		open()
		assert.equal(calls.panels.length, 1)
		assert.equal(calls.panels[0].revealCount, 1)

		calls.panels[0].dispose()
		open()
		assert.equal(calls.panels.length, 2)
		assert.equal(calls.panels[1].revealCount, 0)
	})
})

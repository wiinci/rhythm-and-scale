const {generatePreviewHTML} = require('./webview')
const {computeScale} = require('./compute')
const {formatOutput} = require('./format')
const {OUTPUT_FORMATS, openOutputDocument} = require('./output-formats')
const {DEFAULT_STATE, scaleLabel, applyPatch, buildPreviewModel} = require('./preview-model')

/** globalState key under which the last panel state is kept between sessions. */
const STATE_KEY = 'rhythmAndScale.previewState'

/**
 * Create the live preview panel. The extension host owns the state: every
 * patch the webview sends is validated with applyPatch, the display model is
 * built here with buildPreviewModel, and the webview only renders what it is
 * given — so the numbers on screen are the numbers the exports write.
 *
 * `vscode` is a parameter rather than a require so the message handler can be
 * driven by a stub under node --test.
 *
 * @param {typeof import('vscode')} vscode
 * @param {import('vscode').ExtensionContext} context
 * @returns {import('vscode').WebviewPanel}
 */
function createPreview(vscode, context) {
	// Persisted state is untrusted too: run it through the same validation as a webview patch.
	let state = applyPatch(DEFAULT_STATE, context.globalState.get(STATE_KEY))

	const activeColumn = vscode.window.activeTextEditor?.viewColumn
	const panel = vscode.window.createWebviewPanel(
		'rhythmAndScalePreview',
		'Rhythm & Scale Preview',
		activeColumn || vscode.ViewColumn.One,
		{
			enableScripts: true,
			retainContextWhenHidden: true,
		},
	)

	panel.webview.html = generatePreviewHTML(buildPreviewModel(state))

	/**
	 * Format the current state for one of OUTPUT_FORMATS.
	 * @param {string} format - Format id
	 * @returns {string}
	 */
	function formatCurrentState(format) {
		const items = computeScale(state)
		return formatOutput(items, {
			scaleName: scaleLabel(state.scale),
			scaleValue: state.scale,
			baseFontSize: state.baseFontSize,
			lineHeight: state.lineHeight,
			rhythm: state.rhythm,
			format,
		})
	}

	/**
	 * Copy… and Open… share the picker Generate uses, so the formats read the
	 * same and sit in the same order everywhere.
	 * @param {'copy' | 'open'} action
	 */
	async function exportCurrentState(action) {
		const pick = await vscode.window.showQuickPick(OUTPUT_FORMATS, {placeHolder: 'Output format'})
		if (!pick) return

		const content = formatCurrentState(pick.detail)
		if (action === 'open') {
			await openOutputDocument(vscode, content, pick.detail)
			return
		}
		try {
			await vscode.env.clipboard.writeText(content)
			vscode.window.showInformationMessage(`Copied ${pick.label}`)
		} catch (error) {
			vscode.window.showErrorMessage(`Could not copy: ${error.message}`)
		}
	}

	/**
	 * @param {{type?: string, patch?: object}} message
	 */
	async function handleMessage(message) {
		if (!message || typeof message !== 'object') return

		switch (message.type) {
			case 'input':
				state = applyPatch(state, message.patch)
				await panel.webview.postMessage({type: 'render', model: buildPreviewModel(state)})
				await context.globalState.update(STATE_KEY, state)
				return
			case 'copy':
			case 'open':
				await exportCurrentState(message.type)
				return
		}
	}

	panel.webview.onDidReceiveMessage(handleMessage, undefined, context.subscriptions)

	return panel
}

/**
 * Build the handler for the "Open Live Preview" command: reveal the panel if
 * it is open, otherwise create it. The panel reference lives in this closure.
 *
 * @param {typeof import('vscode')} vscode
 * @param {import('vscode').ExtensionContext} context
 * @returns {() => void}
 */
function createPreviewCommand(vscode, context) {
	/** @type {import('vscode').WebviewPanel | undefined} */
	let panel

	return function openPreview() {
		if (panel) {
			panel.reveal(vscode.window.activeTextEditor?.viewColumn)
			return
		}
		panel = createPreview(vscode, context)
		panel.onDidDispose(
			() => {
				panel = undefined
			},
			null,
			context.subscriptions,
		)
	}
}

module.exports = {STATE_KEY, createPreview, createPreviewCommand}

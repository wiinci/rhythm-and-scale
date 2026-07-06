const vscode = require('vscode')
const {generatePreviewHTML} = require('./webview')
const {computeScale} = require('./compute')
const {formatOutput} = require('./format')

/**
 * @type {vscode.WebviewPanel | undefined}
 */
let currentPanel = undefined

/**
 * Current preview state
 */
let currentState = {
	scale: 1.25,
	scaleName: 'Major third',
	baseFontSize: 16,
	lineHeight: 1.5,
	rhythm: 4,
}

/**
 * Show the live preview panel.
 * @param {vscode.ExtensionContext} context
 */
function showPreview(context) {
	const columnToShowIn = vscode.window.activeTextEditor
		? vscode.window.activeTextEditor.viewColumn
		: undefined

	if (currentPanel) {
		// If panel already exists, just reveal it
		currentPanel.reveal(columnToShowIn)
		return
	}

	// Create new panel
	currentPanel = vscode.window.createWebviewPanel(
		'rhythmAndScalePreview',
		'Rhythm & Scale Preview',
		columnToShowIn || vscode.ViewColumn.One,
		{
			enableScripts: true,
			retainContextWhenHidden: true,
		},
	)

	// Set initial content
	currentPanel.webview.html = generatePreviewHTML(currentState)

	// Handle messages from webview
	currentPanel.webview.onDidReceiveMessage(
		message => {
			switch (message.command) {
				case 'update':
					// Update state
					currentState = {
						scale: message.scale,
						scaleName: message.scaleName,
						baseFontSize: message.baseFontSize,
						lineHeight: message.lineHeight,
						rhythm: message.rhythm,
					}
					// Refresh preview
					if (currentPanel) {
						currentPanel.webview.html = generatePreviewHTML(currentState)
					}
					break

				case 'copy':
					// Generate and copy formatted output
					const items = computeScale({
						scale: currentState.scale,
						baseFontSize: currentState.baseFontSize,
						lineHeight: currentState.lineHeight,
						rhythm: currentState.rhythm,
					})

					const content = formatOutput(items, {
						scaleName: currentState.scaleName,
						scaleValue: currentState.scale,
						baseFontSize: currentState.baseFontSize,
						lineHeight: currentState.lineHeight,
						rhythm: currentState.rhythm,
						format: message.format,
					})

					vscode.env.clipboard.writeText(content).then(() => {
						vscode.window.showInformationMessage(
							`Copied ${message.format.toUpperCase()} to clipboard!`,
						)
					})
					break
			}
		},
		undefined,
		context.subscriptions,
	)

	// Reset when panel is closed
	currentPanel.onDidDispose(
		() => {
			currentPanel = undefined
		},
		null,
		context.subscriptions,
	)
}

module.exports = {showPreview}

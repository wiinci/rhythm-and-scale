const vscode = require('vscode')
const {SCALES} = require('./src/scales')
const {computeScale} = require('./src/compute')
const {formatOutput, FORMAT_LANGUAGES} = require('./src/format')
const {showPreview} = require('./src/preview')

const OUTPUT_FORMATS = [
	{label: 'CSS Custom Properties (rem)', detail: 'css', description: 'Static rem values'},
	{label: 'CSS Fluid (clamp)', detail: 'css-fluid', description: 'Responsive clamp() expressions'},
	{label: 'Tailwind Config', detail: 'tailwind', description: 'theme.extend.fontSize'},
	{label: 'Design Tokens (JSON)', detail: 'tokens', description: 'W3C Design Tokens format'},
]

/**
 * Validate that a string is a positive number.
 * @param {string} value
 * @returns {string | undefined}
 */
function validatePositiveNumber(value) {
	const num = Number(value)
	if (isNaN(num) || num <= 0) {
		return 'Please enter a positive number'
	}
	return undefined
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	// Command: Generate and export scale
	const disposable = vscode.commands.registerCommand(
		'rhythm-and-scale.rhythmAndScale',
		async () => {
			// 1. Select output format
			const format = await vscode.window.showQuickPick(OUTPUT_FORMATS, {
				placeHolder: 'Select output format',
			})
			if (!format) return // User cancelled

			// 2. Select typographic scale ratio
			const scale = await vscode.window.showQuickPick(SCALES, {
				placeHolder: 'Select a typographic scale',
			})
			if (!scale) return

			// 3. Base font size
			const fontSizeInput = await vscode.window.showInputBox({
				prompt: 'Base font size in px (e.g. 16, 18, 24)',
				placeHolder: '16',
				validateInput: validatePositiveNumber,
			})
			if (fontSizeInput === undefined) return

			// 4. Default line height
			const lineHeightInput = await vscode.window.showInputBox({
				prompt: 'Default line height (e.g. 1.5)',
				placeHolder: '1.5',
				validateInput: validatePositiveNumber,
			})
			if (lineHeightInput === undefined) return

			// 5. Vertical rhythm grid unit
			const rhythmInput = await vscode.window.showInputBox({
				prompt: 'Vertical rhythm grid unit in px (e.g. 4, 8)',
				placeHolder: '4',
				validateInput: validatePositiveNumber,
			})
			if (rhythmInput === undefined) return

			const scaleValue = Number(scale.detail)
			const baseFontSize = Number(fontSizeInput) || 16
			const lineHeight = Number(lineHeightInput) || 1.5
			const rhythm = Number(rhythmInput) || 4

			// 6. Compute scale (pure function, no mutation)
			const items = computeScale({scale: scaleValue, baseFontSize, lineHeight, rhythm})

			// 7. Format output
			const content = formatOutput(items, {
				scaleName: scale.label,
				scaleValue,
				baseFontSize,
				lineHeight,
				rhythm,
				format: format.detail,
			})

			// 8. Display result
			const language = FORMAT_LANGUAGES[format.detail] || 'css'
			const doc = await vscode.workspace.openTextDocument({language, content})
			await vscode.window.showTextDocument(doc)
		},
	)

	// Command: Open live preview panel
	const previewDisposable = vscode.commands.registerCommand('rhythm-and-scale.preview', () => {
		showPreview(context)
	})

	context.subscriptions.push(disposable, previewDisposable)
}

function deactivate() {}

module.exports = {
	activate,
	deactivate,
}

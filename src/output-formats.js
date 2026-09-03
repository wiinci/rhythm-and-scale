const {FORMAT_LANGUAGES} = require('./format')

/**
 * The output formats offered to the user, in the order they appear in every
 * picker — Generate and the preview panel's Copy…/Open… show exactly this
 * list, so a format is never named or ordered two different ways.
 *
 * Items are VS Code QuickPickItems: `label` is what the user reads,
 * `detail` is the format id understood by formatOutput and FORMAT_LANGUAGES.
 */
const OUTPUT_FORMATS = [
	{label: 'CSS Custom Properties (rem)', detail: 'css', description: 'Static rem values'},
	{label: 'CSS Fluid (clamp)', detail: 'css-fluid', description: 'Responsive clamp() expressions'},
	{label: 'Tailwind Config', detail: 'tailwind', description: 'theme.extend.fontSize'},
	{label: 'Design Tokens (JSON)', detail: 'tokens', description: 'W3C Design Tokens format'},
	{label: 'CSS Rhythm (lh/rlh)', detail: 'css-rhythm', description: 'Line-height and rhythm spacing tokens'},
	{
		label: 'CSS Rhythm + Trim',
		detail: 'css-rhythm-trim',
		description: 'Rhythm tokens + text-box trim enhancement',
	},
]

/**
 * Show formatted output in a new untitled editor with the format's language.
 * `vscode` is injected so callers without a real extension host can be tested.
 *
 * @param {typeof import('vscode')} vscode
 * @param {string} content - Formatted output
 * @param {string} format - Format id (an OUTPUT_FORMATS `detail`)
 * @returns {Promise<void>}
 */
async function openOutputDocument(vscode, content, format) {
	const language = FORMAT_LANGUAGES[format] || 'css'
	const doc = await vscode.workspace.openTextDocument({language, content})
	await vscode.window.showTextDocument(doc)
}

module.exports = {OUTPUT_FORMATS, openOutputDocument}

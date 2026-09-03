#!/usr/bin/env node
/**
 * Regenerates the "## Output Examples" section of README.md from the formatters, so the
 * documented output is always the real output. Dev-only; not shipped in the extension.
 *
 *   node scripts/readme-examples.js
 *
 * test/readme.test.js fails when the README drifts from what this script would write.
 */
const fs = require('node:fs')
const path = require('node:path')
const {computeScale} = require('../src/compute')
const {formatOutput, formatCSSRhythm, FORMAT_LANGUAGES} = require('../src/format')

const README_PATH = path.join(__dirname, '..', 'README.md')
const SECTION_START = '## Output Examples\n'
const SECTION_END = '### Compatibility Notes\n'

/** The parameters every example is generated with: the extension's defaults. */
const OPTIONS = {scaleName: 'Major third', scaleValue: 1.25, baseFontSize: 16, lineHeight: 1.5, rhythm: 4}

const EXAMPLES = [
	{heading: 'CSS Custom Properties (rem)', format: 'css'},
	{heading: 'CSS Fluid Type (clamp)', format: 'css-fluid'},
	{heading: 'Tailwind CSS', format: 'tailwind'},
	{heading: 'W3C Design Tokens (JSON)', format: 'tokens'},
	{heading: 'CSS Rhythm (`lh` + `rlh`)', format: 'css-rhythm'},
]

/** Markdown fence language for each document language id the formats map to. */
const FENCE_LANGUAGES = {css: 'css', javascript: 'js', json: 'json'}

function fence(language, code) {
	return '```' + language + '\n' + code + '```\n'
}

/**
 * The section's markdown, from its heading up to (not including) "### Compatibility Notes".
 *
 * @returns {string}
 */
function buildOutputExamples() {
	const items = computeScale({
		scale: OPTIONS.scaleValue,
		baseFontSize: OPTIONS.baseFontSize,
		lineHeight: OPTIONS.lineHeight,
		rhythm: OPTIONS.rhythm,
	})
	const output = (format) => formatOutput(items, {...OPTIONS, format})

	let markdown = SECTION_START + '\n'
	markdown += `Every block below is the formatter's exact output for the extension's defaults: `
	markdown += `${OPTIONS.scaleName} (${OPTIONS.scaleValue}) at ${OPTIONS.baseFontSize}px, `
	markdown += `line-height ${OPTIONS.lineHeight}, rhythm ${OPTIONS.rhythm}px. `
	markdown += '`test/readme.test.js` fails if they drift from the code; regenerate with `node scripts/readme-examples.js`.\n\n'

	for (const {heading, format} of EXAMPLES) {
		markdown += `### ${heading}\n\n${fence(FENCE_LANGUAGES[FORMAT_LANGUAGES[format]], output(format))}\n`
	}

	// Trim is the rhythm output followed by the @supports block; show only what it adds.
	const rhythm = formatCSSRhythm(items, OPTIONS)
	const trim = output('css-rhythm-trim')
	if (!trim.startsWith(rhythm + '\n')) {
		throw new Error('css-rhythm-trim no longer starts with the css-rhythm output; update the README example')
	}
	markdown += `### CSS Rhythm + Trim\n\nThe CSS Rhythm output above, followed by:\n\n`
	markdown += `${fence('css', trim.slice(rhythm.length + 1))}\n`

	return markdown
}

/**
 * The README's current "## Output Examples" section, or null when its markers are missing.
 *
 * @param {string} readme
 * @returns {{start: number, end: number} | null}
 */
function locateSection(readme) {
	const start = readme.indexOf(SECTION_START)
	const end = start === -1 ? -1 : readme.indexOf(SECTION_END, start)
	return start === -1 || end === -1 ? null : {start, end}
}

function updateReadme() {
	const readme = fs.readFileSync(README_PATH, 'utf8')
	const section = locateSection(readme)
	if (!section) {
		throw new Error(`README.md needs a "${SECTION_START.trim()}" section that ends at "${SECTION_END.trim()}"`)
	}
	fs.writeFileSync(README_PATH, readme.slice(0, section.start) + buildOutputExamples() + readme.slice(section.end))
}

module.exports = {buildOutputExamples, locateSection, README_PATH}

if (require.main === module) updateReadme()

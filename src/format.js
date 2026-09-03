const {pxToRem, fluidClamp} = require('./compute')

/**
 * @typedef {'css' | 'css-fluid' | 'tailwind' | 'tokens' | 'css-rhythm' | 'css-rhythm-trim'} OutputFormat
 */

/**
 * @typedef {object} FormatOptions
 * @property {string} scaleName - Human-readable scale name (e.g. "Major third")
 * @property {number} scaleValue - The numeric ratio
 * @property {number} baseFontSize - Base font size in px
 * @property {number} lineHeight - Line height multiplier
 * @property {number} rhythm - Vertical rhythm grid unit
 * @property {OutputFormat} format - Output format
 */

/** Viewport range the fluid clamp() interpolates across, in px. */
const FLUID_VIEWPORT = {min: 320, max: 1280}

/**
 * Format a number for compact CSS token output.
 *
 * @param {number} value
 * @returns {string}
 */
function formatNumber(value) {
	return `${parseFloat(value.toFixed(4))}`
}

/**
 * The header line every format carries to say which root its rem values assume.
 * Every formatter converts with the base size as root, so a base other than the
 * browser's 16px only holds if the page sets html { font-size } accordingly.
 *
 * @param {number} baseFontSize
 * @returns {string}
 */
function remRootNote(baseFontSize) {
	if (baseFontSize === 16) return 'rem root: 16px (browser default)'
	const percentage = formatNumber((baseFontSize / 16) * 100)
	return `rem root: ${baseFontSize}px — set html { font-size: ${percentage}% }`
}

/**
 * Format computed scale items into CSS custom properties (static px/rem).
 *
 * @param {Array} items - Computed scale items from computeScale()
 * @param {FormatOptions} options
 * @returns {string}
 */
function formatCSS(items, options) {
	const {scaleName, scaleValue, baseFontSize, lineHeight, rhythm} = options

	let content = `/**\n`
	content += `  Typographic scale: ${scaleName} (${scaleValue}) at ${baseFontSize}px\n`
	content += `  ${remRootNote(baseFontSize)}\n`
	content += `  Line-height: ${lineHeight}\n`
	content += `  Vertical rhythm: ${rhythm}px\n`
	content += `*/\n\n`
	content += `:root {\n`

	for (const item of items) {
		content += `  --font-size-${item.label}: ${pxToRem(item.fontSize, baseFontSize)};\n`
		content += `  --line-height-${item.label}: ${item.lineHeight}px;\n`
	}

	content += `}\n`
	return content
}

/**
 * Format computed scale items into CSS custom properties with clamp() for fluid type.
 *
 * @param {Array} items - Computed scale items from computeScale()
 * @param {FormatOptions} options
 * @returns {string}
 */
function formatCSSFluid(items, options) {
	const {scaleName, scaleValue, baseFontSize, lineHeight, rhythm} = options

	// For fluid, we compute a smaller scale at mobile as 80% of desktop
	const mobileRatio = 0.8

	let content = `/**\n`
	content += `  Fluid typographic scale: ${scaleName} (${scaleValue}) at ${baseFontSize}px\n`
	content += `  ${remRootNote(baseFontSize)}\n`
	content += `  Line-height: ${lineHeight}\n`
	content += `  Vertical rhythm: ${rhythm}px\n`
	content += `  Fluid range: ${FLUID_VIEWPORT.min}px – ${FLUID_VIEWPORT.max}px viewport\n`
	content += `*/\n\n`
	content += `:root {\n`

	for (const item of items) {
		const minFontSize = Math.round(item.fontSize * mobileRatio)
		const maxFontSize = item.fontSize
		// Same rem root as every other format: the base size, not a fixed 16px
		const clamp = fluidClamp(minFontSize, maxFontSize, FLUID_VIEWPORT.min, FLUID_VIEWPORT.max, baseFontSize)
		content += `  --font-size-${item.label}: ${clamp};\n`
		content += `  --line-height-${item.label}: ${item.lineHeight}px;\n`
	}

	content += `}\n`
	return content
}

/**
 * Format computed scale items as rhythm-first CSS tokens.
 * Emits unitless line-height values and line-height-relative spacing tokens. The unitless
 * value is the snapped ratio (lineHeight / fontSize), not the pre-snap target, so 1lh of any
 * step is a whole number of rhythm units and the --space-* tokens land on the grid.
 *
 * @param {Array} items - Computed scale items from computeScale()
 * @param {FormatOptions} options
 * @returns {string}
 */
function formatCSSRhythm(items, options) {
	const {scaleName, scaleValue, baseFontSize, lineHeight, rhythm} = options

	let content = `/**\n`
	content += `  Rhythm typographic scale: ${scaleName} (${scaleValue}) at ${baseFontSize}px\n`
	content += `  ${remRootNote(baseFontSize)}\n`
	content += `  Base line-height: ${lineHeight}\n`
	content += `  Vertical rhythm input: ${rhythm}px\n`
	content += `  line-height tokens are unitless. spacing tokens use lh/rlh.\n`
	content += `*/\n\n`
	content += `:root {\n`

	for (const item of items) {
		content += `  --font-size-${item.label}: ${pxToRem(item.fontSize, baseFontSize)};\n`
		content += `  --line-height-${item.label}: ${formatNumber(item.lineHeight / item.fontSize)};\n`
	}

	content += `\n`
	content += `  /* Rhythm spacing tokens */\n`
	content += `  --space-0: 0;\n`
	content += `  --space-1: 0.5lh;\n`
	content += `  --space-2: 1lh;\n`
	content += `  --space-3: 1.5lh;\n`
	content += `  --space-4: 2lh;\n`
	content += `  --space-section: 2rlh;\n`
	content += `}\n`

	return content
}

/**
 * Format rhythm-first CSS tokens plus optional text trimming utilities.
 * Trimming is wrapped in @supports to keep it progressive.
 *
 * @param {Array} items - Computed scale items from computeScale()
 * @param {FormatOptions} options
 * @returns {string}
 */
function formatCSSRhythmTrim(items, options) {
	let content = formatCSSRhythm(items, options)
	content += `\n`
	content += `/* Progressive enhancement for optical vertical alignment */\n`
	content += `@supports (text-box: trim-both cap alphabetic) {\n`
	content += `  .trim-text {\n`
	content += `    text-box: trim-both cap alphabetic;\n`
	content += `  }\n`
	content += `\n`
	content += `  .trim-text-ex {\n`
	content += `    text-box: trim-both ex alphabetic;\n`
	content += `  }\n`
	content += `}\n`

	return content
}

/**
 * Format computed scale items as a Tailwind CSS theme extension.
 *
 * @param {Array} items - Computed scale items from computeScale()
 * @param {FormatOptions} options
 * @returns {string}
 */
function formatTailwind(items, options) {
	const {scaleName, scaleValue, baseFontSize} = options

	let content = `// Typographic scale: ${scaleName} (${scaleValue}) at ${baseFontSize}px\n`
	content += `// ${remRootNote(baseFontSize)}\n`
	content += `// Add to tailwind.config.js → theme.extend.fontSize\n\n`
	content += `module.exports = {\n`
	content += `  theme: {\n`
	content += `    extend: {\n`
	content += `      fontSize: {\n`

	for (const item of items) {
		const rem = pxToRem(item.fontSize, baseFontSize)
		content += `        '${item.label}': ['${rem}', { lineHeight: '${item.lineHeight}px' }],\n`
	}

	content += `      },\n`
	content += `    },\n`
	content += `  },\n`
	content += `};\n`
	return content
}

/**
 * Format computed scale items as W3C Design Tokens JSON.
 *
 * @param {Array} items - Computed scale items from computeScale()
 * @param {FormatOptions} options
 * @returns {string}
 */
function formatTokens(items, options) {
	const {scaleName, scaleValue, baseFontSize} = options

	const tokens = {
		// $description is the format's only free-text slot, so the rem root note lives there
		$description: `Typographic scale: ${scaleName} (${scaleValue}) at ${baseFontSize}px. ${remRootNote(baseFontSize)}`,
		fontSize: {},
		lineHeight: {},
	}

	for (const item of items) {
		tokens.fontSize[item.label] = {
			$type: 'dimension',
			$value: pxToRem(item.fontSize, baseFontSize),
		}
		tokens.lineHeight[item.label] = {
			$type: 'dimension',
			$value: `${item.lineHeight}px`,
		}
	}

	return JSON.stringify(tokens, null, 2) + '\n'
}

/**
 * Route to the correct formatter based on format string.
 *
 * @param {Array} items
 * @param {FormatOptions} options
 * @returns {string}
 */
function formatOutput(items, options) {
	switch (options.format) {
		case 'css-fluid':
			return formatCSSFluid(items, options)
		case 'css-rhythm':
			return formatCSSRhythm(items, options)
		case 'css-rhythm-trim':
			return formatCSSRhythmTrim(items, options)
		case 'tailwind':
			return formatTailwind(items, options)
		case 'tokens':
			return formatTokens(items, options)
		case 'css':
		default:
			return formatCSS(items, options)
	}
}

/** Map format identifiers to document language IDs */
const FORMAT_LANGUAGES = {
	css: 'css',
	'css-fluid': 'css',
	'css-rhythm': 'css',
	'css-rhythm-trim': 'css',
	tailwind: 'javascript',
	tokens: 'json',
}

module.exports = {
	formatCSS,
	formatCSSFluid,
	formatCSSRhythm,
	formatCSSRhythmTrim,
	formatTailwind,
	formatTokens,
	formatOutput,
	remRootNote,
	FORMAT_LANGUAGES,
}

const {STEPS} = require('./scales')

/**
 * Minimum line-height for display type (h1).
 * Professional type specimens use 1.1–1.15 for large headings.
 */
const TIGHT_MIN = 1.1

/**
 * Compute a smart line-height multiplier for a given step.
 * Interpolates linearly from tight (h1) to the user's chosen line-height (body).
 * Small text uses the full user line-height for legibility.
 *
 * @param {number} exponent - The step exponent (-1 to 6)
 * @param {number} userLineHeight - The user's chosen base line-height (e.g. 1.5)
 * @returns {number} The line-height multiplier for this step
 */
function smartLineHeight(exponent, userLineHeight) {
	// Small and default get the full user line-height
	if (exponent <= 0) return userLineHeight

	// Headings (exponent 1–6) interpolate from userLineHeight down to TIGHT_MIN
	// exponent 1 (h6) is closest to body, exponent 6 (h1) is tightest
	const maxExponent = 6
	const t = exponent / maxExponent // 0 at h6-ish, 1 at h1
	return userLineHeight - (userLineHeight - TIGHT_MIN) * t
}

/**
 * Compute the typographic scale values for each step.
 * Returns a new array — never mutates shared state.
 * Uses smart line-height: tighter for headings, generous for body text.
 *
 * @param {object} params
 * @param {number} params.scale - The modular scale ratio (e.g. 1.25)
 * @param {number} params.baseFontSize - Base font size in px (e.g. 16)
 * @param {number} params.lineHeight - Default line height multiplier (e.g. 1.5)
 * @param {number} params.rhythm - Vertical rhythm grid unit in px (e.g. 4)
 * @returns {Array<{label: string, exponent: number, fontSize: number, lineHeight: number, lineHeightMultiplier: number}>}
 */
function computeScale({scale, baseFontSize, lineHeight, rhythm}) {
	return STEPS.map((step) => {
		const fontSize = Math.round(Math.pow(scale, step.exponent) * baseFontSize)
		const multiplier = smartLineHeight(step.exponent, lineHeight)
		const computedLineHeight = Math.floor(Math.ceil(fontSize * multiplier) / rhythm) * rhythm

		return {
			label: step.label,
			exponent: step.exponent,
			fontSize,
			lineHeight: computedLineHeight,
			lineHeightMultiplier: parseFloat(multiplier.toFixed(3)),
		}
	})
}

/**
 * Convert a px font size to rem, assuming a 16px root.
 * @param {number} px
 * @param {number} [rootSize=16]
 * @returns {string}
 */
function pxToRem(px, rootSize = 16) {
	const rem = px / rootSize
	// Avoid trailing zeros: 1.0 → "1", 1.25 → "1.25"
	return `${parseFloat(rem.toFixed(4))}rem`
}

/**
 * Generate a clamp() expression for fluid type scaling.
 *
 * @param {number} minPx - Minimum font size in px
 * @param {number} maxPx - Maximum font size in px
 * @param {number} [minViewport=320] - Min viewport width in px
 * @param {number} [maxViewport=1280] - Max viewport width in px
 * @returns {string}
 */
function fluidClamp(minPx, maxPx, minViewport = 320, maxViewport = 1280) {
	const minRem = minPx / 16
	const slope = (maxPx - minPx) / (maxViewport - minViewport)
	const slopeVw = parseFloat((slope * 100).toFixed(4))
	const intercept = parseFloat((minRem - (slope * minViewport) / 16).toFixed(4))

	return `clamp(${pxToRem(minPx)}, ${intercept}rem + ${slopeVw}vw, ${pxToRem(maxPx)})`
}

module.exports = {computeScale, smartLineHeight, pxToRem, fluidClamp}

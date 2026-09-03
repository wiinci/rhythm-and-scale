const {computeScale, pxToRem} = require('./compute')
const {SCALES} = require('./scales')

/**
 * Bounds for the numeric preview controls. The webview writes these into its
 * input attributes and the host clamps every incoming patch to them, so the
 * two can never disagree.
 */
const LIMITS = {
	baseFontSize: {min: 4, max: 40, step: 1},
	lineHeight: {min: 1, max: 3, step: 0.05},
	rhythm: {min: 4, max: 20, step: 1},
}

/** Panel state before the user touches anything or when nothing is persisted. */
const DEFAULT_STATE = {
	scale: 1.25,
	baseFontSize: 16,
	lineHeight: 1.5,
	rhythm: 4,
	grid: true,
}

/** SCALES stores ratios as strings for the QuickPick `detail` field; state holds numbers. */
const SCALE_VALUES = SCALES.map((preset) => Number(preset.detail))

/**
 * Human-readable name of a preset ratio, or the number itself if it is not a preset.
 * @param {number} scale
 * @returns {string}
 */
function scaleLabel(scale) {
	const preset = SCALES.find((candidate) => Number(candidate.detail) === scale)
	return preset ? preset.label : String(scale)
}

/**
 * Merge a partial patch from the webview (or from persisted storage) into a
 * new state object. Only known keys are merged: `grid` is coerced to boolean,
 * `scale` must equal a preset ratio, and the numeric keys must be finite
 * numbers, which are clamped to LIMITS. Everything else — NaN, Infinity,
 * strings, unknown keys, a missing patch — is ignored. Never throws, because
 * the patch is untrusted input.
 *
 * @param {object} state
 * @param {object | null | undefined} patch
 * @returns {object} A new state; the input is not mutated.
 */
function applyPatch(state, patch) {
	const next = {...state}
	if (patch === null || typeof patch !== 'object') return next

	for (const [key, value] of Object.entries(patch)) {
		if (key === 'grid') {
			next.grid = Boolean(value)
			continue
		}
		if (key === 'scale') {
			if (SCALE_VALUES.includes(value)) next.scale = value
			continue
		}
		const limit = LIMITS[key]
		if (!limit || typeof value !== 'number' || !Number.isFinite(value)) continue
		next[key] = Math.min(limit.max, Math.max(limit.min, value))
	}
	return next
}

/**
 * Turn state into everything the webview shows. Every number here is the
 * achieved value — what actually renders and what the exports write — not
 * the pre-snap target: `ratio` is line-height ÷ font-size of the snapped
 * line-height, `rhythmUnits` is how many rhythm units that line-height spans,
 * and `fontSizeRem` uses the same pxToRem(fontSize, baseFontSize) as formatCSS.
 *
 * @param {{scale: number, baseFontSize: number, lineHeight: number, rhythm: number, grid: boolean}} state
 * @returns {{
 *   scaleName: string, scale: number, baseFontSize: number, lineHeight: number,
 *   rhythm: number, grid: boolean, lineHeightBodyPx: number,
 *   steps: Array<{label: string, fontSizePx: number, fontSizeRem: string, lineHeightPx: number, ratio: string, rhythmUnits: number}>
 * }}
 */
function buildPreviewModel(state) {
	const {scale, baseFontSize, lineHeight, rhythm, grid} = state
	const items = computeScale({scale, baseFontSize, lineHeight, rhythm})
	const body = items.find((item) => item.label === 'default')

	return {
		scaleName: scaleLabel(scale),
		scale,
		baseFontSize,
		lineHeight,
		rhythm,
		grid,
		lineHeightBodyPx: body.lineHeight,
		steps: items.map((item) => ({
			label: item.label,
			fontSizePx: item.fontSize,
			fontSizeRem: pxToRem(item.fontSize, baseFontSize),
			lineHeightPx: item.lineHeight,
			ratio: (item.lineHeight / item.fontSize).toFixed(2),
			rhythmUnits: item.lineHeight / rhythm,
		})),
	}
}

module.exports = {LIMITS, DEFAULT_STATE, scaleLabel, applyPatch, buildPreviewModel}

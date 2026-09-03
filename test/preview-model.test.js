const {describe, it} = require('node:test')
const assert = require('node:assert/strict')
const {
	LIMITS,
	DEFAULT_STATE,
	scaleLabel,
	applyPatch,
	buildPreviewModel,
} = require('../src/preview-model')
const {computeScale, pxToRem} = require('../src/compute')
const {formatCSS} = require('../src/format')
const {SCALES, STEPS} = require('../src/scales')

function stepOf(model, label) {
	return model.steps.find((step) => step.label === label)
}

describe('DEFAULT_STATE and LIMITS', () => {
	it('defaults to Major third, 16px, 1.5, rhythm 4, grid on', () => {
		assert.deepEqual(DEFAULT_STATE, {scale: 1.25, baseFontSize: 16, lineHeight: 1.5, rhythm: 4, grid: true})
	})

	it('defines the control ranges the spec locks', () => {
		assert.deepEqual(LIMITS.baseFontSize, {min: 4, max: 40, step: 1})
		assert.deepEqual(LIMITS.lineHeight, {min: 1, max: 3, step: 0.05})
		assert.deepEqual(LIMITS.rhythm, {min: 4, max: 20, step: 1})
	})

	it('keeps every default inside its limits', () => {
		for (const key of Object.keys(LIMITS)) {
			assert.ok(DEFAULT_STATE[key] >= LIMITS[key].min && DEFAULT_STATE[key] <= LIMITS[key].max, key)
		}
	})
})

describe('scaleLabel', () => {
	it('names every preset ratio', () => {
		for (const preset of SCALES) {
			assert.equal(scaleLabel(Number(preset.detail)), preset.label)
		}
	})

	it('falls back to the number for a non-preset ratio', () => {
		assert.equal(scaleLabel(1.3), '1.3')
	})
})

describe('applyPatch', () => {
	it('returns a new object and leaves the input untouched', () => {
		const state = {...DEFAULT_STATE}
		const next = applyPatch(state, {baseFontSize: 18})
		assert.notEqual(next, state)
		assert.equal(state.baseFontSize, 16)
		assert.equal(next.baseFontSize, 18)
	})

	it('merges known numeric keys', () => {
		const next = applyPatch(DEFAULT_STATE, {baseFontSize: 18, lineHeight: 1.6, rhythm: 8})
		assert.equal(next.baseFontSize, 18)
		assert.equal(next.lineHeight, 1.6)
		assert.equal(next.rhythm, 8)
	})

	it('clamps out-of-range numbers to LIMITS', () => {
		assert.equal(applyPatch(DEFAULT_STATE, {lineHeight: 0.5}).lineHeight, 1)
		assert.equal(applyPatch(DEFAULT_STATE, {lineHeight: 7}).lineHeight, 3)
		assert.equal(applyPatch(DEFAULT_STATE, {baseFontSize: 99}).baseFontSize, 40)
		assert.equal(applyPatch(DEFAULT_STATE, {baseFontSize: 0}).baseFontSize, 4)
		assert.equal(applyPatch(DEFAULT_STATE, {rhythm: 1}).rhythm, 4)
		assert.equal(applyPatch(DEFAULT_STATE, {rhythm: 64}).rhythm, 20)
	})

	it('ignores NaN, Infinity, strings and booleans for numeric keys', () => {
		const next = applyPatch(DEFAULT_STATE, {
			baseFontSize: NaN,
			lineHeight: Infinity,
			rhythm: '8',
			scale: '1.5',
		})
		assert.deepEqual(next, DEFAULT_STATE)
		assert.equal(applyPatch(DEFAULT_STATE, {baseFontSize: -Infinity}).baseFontSize, 16)
		assert.equal(applyPatch(DEFAULT_STATE, {rhythm: true}).rhythm, 4)
	})

	it('ignores unknown keys instead of adding them', () => {
		// JSON.parse yields an own "__proto__" key, the shape a hostile webview message would take
		const patch = JSON.parse('{"foo": 1, "steps": [], "__proto__": {"polluted": true}}')
		const next = applyPatch(DEFAULT_STATE, patch)
		assert.deepEqual(Object.keys(next).sort(), Object.keys(DEFAULT_STATE).sort())
		assert.equal(next.polluted, undefined)
	})

	it('accepts only preset scale values', () => {
		assert.equal(applyPatch(DEFAULT_STATE, {scale: 1.618}).scale, 1.618)
		assert.equal(applyPatch(DEFAULT_STATE, {scale: 2}).scale, 2)
		assert.equal(applyPatch(DEFAULT_STATE, {scale: 1.3}).scale, 1.25)
		assert.equal(applyPatch(DEFAULT_STATE, {scale: NaN}).scale, 1.25)
		for (const preset of SCALES) {
			const value = Number(preset.detail)
			assert.equal(applyPatch(DEFAULT_STATE, {scale: value}).scale, value)
		}
	})

	it('coerces grid to a boolean', () => {
		assert.equal(applyPatch(DEFAULT_STATE, {grid: 0}).grid, false)
		assert.equal(applyPatch(DEFAULT_STATE, {grid: 'yes'}).grid, true)
		assert.equal(applyPatch(DEFAULT_STATE, {grid: false}).grid, false)
	})

	it('never throws for null, undefined or non-object patches', () => {
		for (const patch of [null, undefined, 42, 'text', true, [], () => {}]) {
			assert.deepEqual(applyPatch(DEFAULT_STATE, patch), DEFAULT_STATE)
		}
	})
})

describe('buildPreviewModel', () => {
	const model = buildPreviewModel(DEFAULT_STATE)

	it('echoes the state and names the scale', () => {
		assert.equal(model.scaleName, 'Major third')
		assert.equal(model.scale, 1.25)
		assert.equal(model.baseFontSize, 16)
		assert.equal(model.lineHeight, 1.5)
		assert.equal(model.rhythm, 4)
		assert.equal(model.grid, true)
		assert.equal(buildPreviewModel({...DEFAULT_STATE, scale: 1.618}).scaleName, 'Golden ratio')
	})

	it('lists every step in STEPS order', () => {
		assert.deepEqual(
			model.steps.map((step) => step.label),
			STEPS.map((step) => step.label),
		)
	})

	it('reports the achieved ratio and rhythm units for h6 at defaults', () => {
		const h6 = stepOf(model, 'h6')
		assert.equal(h6.fontSizePx, 20)
		assert.equal(h6.lineHeightPx, 32)
		assert.equal(h6.fontSizeRem, '1.25rem')
		assert.equal(h6.ratio, '1.60')
		assert.equal(h6.rhythmUnits, 8)
	})

	it('reports the default step at defaults', () => {
		const body = stepOf(model, 'default')
		assert.equal(body.fontSizePx, 16)
		assert.equal(body.lineHeightPx, 24)
		assert.equal(body.fontSizeRem, '1rem')
		assert.equal(body.ratio, '1.50')
		assert.equal(body.rhythmUnits, 6)
	})

	it('derives ratio from the snapped line-height, to two decimals, for every step', () => {
		for (const step of model.steps) {
			assert.equal(step.ratio, (step.lineHeightPx / step.fontSizePx).toFixed(2), step.label)
			assert.match(step.ratio, /^\d+\.\d{2}$/)
		}
	})

	it('reports integer rhythm units that multiply back to the line-height', () => {
		for (const state of [DEFAULT_STATE, {...DEFAULT_STATE, rhythm: 7, baseFontSize: 18, lineHeight: 1.35}]) {
			for (const step of buildPreviewModel(state).steps) {
				assert.ok(Number.isInteger(step.rhythmUnits), `${step.label} units ${step.rhythmUnits}`)
				assert.equal(step.rhythmUnits * state.rhythm, step.lineHeightPx)
			}
		}
	})

	it('converts rem with the base size as root, exactly as formatCSS writes it', () => {
		for (const state of [DEFAULT_STATE, {...DEFAULT_STATE, baseFontSize: 18}]) {
			const current = buildPreviewModel(state)
			const css = formatCSS(computeScale(state), {
				scaleName: current.scaleName,
				scaleValue: state.scale,
				baseFontSize: state.baseFontSize,
				lineHeight: state.lineHeight,
				rhythm: state.rhythm,
				format: 'css',
			})
			for (const step of current.steps) {
				assert.equal(step.fontSizeRem, pxToRem(step.fontSizePx, state.baseFontSize))
				assert.ok(
					css.includes(`--font-size-${step.label}: ${step.fontSizeRem};`),
					`${step.label} rem ${step.fontSizeRem} at base ${state.baseFontSize} not in formatCSS output`,
				)
			}
		}
		assert.equal(stepOf(buildPreviewModel({...DEFAULT_STATE, baseFontSize: 18}), 'default').fontSizeRem, '1rem')
	})

	it('exposes the body line-height as a rhythm multiple', () => {
		assert.equal(model.lineHeightBodyPx, 24)
		for (const rhythm of [4, 5, 8, 12, 20]) {
			const current = buildPreviewModel({...DEFAULT_STATE, rhythm})
			assert.equal(current.lineHeightBodyPx % rhythm, 0)
			assert.equal(current.lineHeightBodyPx, stepOf(current, 'default').lineHeightPx)
		}
	})

	it('survives a JSON round trip unchanged', () => {
		assert.deepEqual(JSON.parse(JSON.stringify(model)), model)
	})
})

const {describe, it} = require('node:test')
const assert = require('node:assert/strict')
const {computeScale, smartLineHeight, pxToRem, fluidClamp} = require('../src/compute')

describe('computeScale', () => {
	it('returns correct number of steps', () => {
		const result = computeScale({
			scale: 1.25,
			baseFontSize: 16,
			lineHeight: 1.5,
			rhythm: 4,
		})
		assert.equal(result.length, 8)
	})

	it('does not mutate the STEPS module constant', () => {
		const {STEPS} = require('../src/scales')
		const before = JSON.stringify(STEPS)
		computeScale({scale: 1.25, baseFontSize: 16, lineHeight: 1.5, rhythm: 4})
		computeScale({scale: 2, baseFontSize: 24, lineHeight: 1.6, rhythm: 8})
		assert.equal(JSON.stringify(STEPS), before)
	})

	it('computes base size correctly at exponent 0', () => {
		const result = computeScale({
			scale: 1.25,
			baseFontSize: 16,
			lineHeight: 1.5,
			rhythm: 4,
		})
		const defaultStep = result.find((s) => s.label === 'default')
		assert.equal(defaultStep.fontSize, 16)
	})

	it('computes h1 size with Major third scale at 16px base', () => {
		const result = computeScale({
			scale: 1.25,
			baseFontSize: 16,
			lineHeight: 1.5,
			rhythm: 4,
		})
		const h1 = result.find((s) => s.label === 'h1')
		// 1.25^6 * 16 = 61.03... → rounds to 61
		assert.equal(h1.fontSize, Math.round(Math.pow(1.25, 6) * 16))
	})

	it('snaps line-height to rhythm grid', () => {
		const result = computeScale({
			scale: 1.25,
			baseFontSize: 16,
			lineHeight: 1.5,
			rhythm: 4,
		})
		for (const item of result) {
			assert.equal(
				item.lineHeight % 4,
				0,
				`${item.label} line-height ${item.lineHeight} not divisible by 4`,
			)
		}
	})

	it('never produces line-height less than font size', () => {
		// This exact case triggered the bug: 61px font, ×1.1, rhythm 10
		// floor(ceil(61*1.1)/10)*10 = floor(68/10)*10 = 60 < 61
		const result = computeScale({
			scale: 1.25,
			baseFontSize: 16,
			lineHeight: 1.5,
			rhythm: 10,
		})
		for (const item of result) {
			assert.ok(
				item.lineHeight >= item.fontSize,
				`${item.label}: line-height ${item.lineHeight}px must be >= font-size ${item.fontSize}px`,
			)
		}
	})

	it('never produces line-height less than font size with large rhythm', () => {
		const result = computeScale({
			scale: 1.5,
			baseFontSize: 16,
			lineHeight: 1.2,
			rhythm: 20,
		})
		for (const item of result) {
			assert.ok(
				item.lineHeight >= item.fontSize,
				`${item.label}: line-height ${item.lineHeight}px must be >= font-size ${item.fontSize}px`,
			)
		}
	})

	it('works with different rhythm values', () => {
		const result = computeScale({
			scale: 1.25,
			baseFontSize: 16,
			lineHeight: 1.5,
			rhythm: 8,
		})
		for (const item of result) {
			assert.equal(
				item.lineHeight % 8,
				0,
				`${item.label} line-height ${item.lineHeight} not divisible by 8`,
			)
		}
	})

	it('uses tighter line-height for headings than body', () => {
		const result = computeScale({
			scale: 1.25,
			baseFontSize: 16,
			lineHeight: 1.5,
			rhythm: 4,
		})
		const h1 = result.find((s) => s.label === 'h1')
		const body = result.find((s) => s.label === 'default')
		// h1 multiplier should be tighter than body multiplier
		assert.ok(
			h1.lineHeightMultiplier < body.lineHeightMultiplier,
			`h1 multiplier (${h1.lineHeightMultiplier}) should be less than body (${body.lineHeightMultiplier})`,
		)
	})

	it('includes lineHeightMultiplier in output', () => {
		const result = computeScale({
			scale: 1.25,
			baseFontSize: 16,
			lineHeight: 1.5,
			rhythm: 4,
		})
		for (const item of result) {
			assert.ok(typeof item.lineHeightMultiplier === 'number')
			assert.ok(item.lineHeightMultiplier >= 1.1)
			assert.ok(item.lineHeightMultiplier <= 1.5)
		}
	})
})

describe('smartLineHeight', () => {
	it('returns user line-height for body text (exponent 0)', () => {
		assert.equal(smartLineHeight(0, 1.5), 1.5)
	})

	it('returns user line-height for small text (exponent -1)', () => {
		assert.equal(smartLineHeight(-1, 1.5), 1.5)
	})

	it('returns tight minimum for h1 (exponent 6)', () => {
		assert.equal(smartLineHeight(6, 1.5), 1.1)
	})

	it('interpolates between tight and user value for mid headings', () => {
		const h3 = smartLineHeight(4, 1.5) // exponent 4
		assert.ok(h3 > 1.1, `h3 (${h3}) should be > 1.1`)
		assert.ok(h3 < 1.5, `h3 (${h3}) should be < 1.5`)
	})

	it('produces monotonically decreasing values from h6 to h1', () => {
		const values = [1, 2, 3, 4, 5, 6].map((exp) => smartLineHeight(exp, 1.5))
		for (let i = 1; i < values.length; i++) {
			assert.ok(
				values[i] < values[i - 1],
				`exponent ${i + 1} (${values[i]}) should be less than exponent ${i} (${values[i - 1]})`,
			)
		}
	})
})

describe('pxToRem', () => {
	it('converts 16px to 1rem with default root', () => {
		assert.equal(pxToRem(16), '1rem')
	})

	it('converts 24px to 1.5rem with default root', () => {
		assert.equal(pxToRem(24), '1.5rem')
	})

	it('uses custom root size', () => {
		assert.equal(pxToRem(18, 18), '1rem')
	})

	it('handles fractional values without trailing zeros', () => {
		assert.equal(pxToRem(20, 16), '1.25rem')
	})
})

describe('fluidClamp', () => {
	it('returns a clamp() expression', () => {
		const result = fluidClamp(16, 32)
		assert.ok(result.startsWith('clamp('))
		assert.ok(result.endsWith(')'))
	})

	it('includes min and max rem values', () => {
		const result = fluidClamp(16, 32)
		assert.ok(result.includes('1rem'), 'should include min 1rem')
		assert.ok(result.includes('2rem'), 'should include max 2rem')
	})

	it('includes vw unit in the middle value', () => {
		const result = fluidClamp(16, 32)
		assert.ok(result.includes('vw'), 'should include vw for fluid scaling')
	})

	it('defaults to a 16px rem root when the argument is omitted', () => {
		assert.equal(fluidClamp(16, 32), fluidClamp(16, 32, 320, 1280, 16))
		assert.equal(fluidClamp(16, 32), 'clamp(1rem, 0.6667rem + 1.6667vw, 2rem)')
	})

	it('converts the rem terms with the given root and leaves the vw slope alone', () => {
		// 18px at a 18px root is 1rem; 36px is 2rem. Slope is px per vw, so it does not change.
		assert.equal(fluidClamp(18, 36, 320, 1280, 18), 'clamp(1rem, 0.6667rem + 1.875vw, 2rem)')
		assert.equal(fluidClamp(18, 36, 320, 1280, 16), 'clamp(1.125rem, 0.75rem + 1.875vw, 2.25rem)')
	})
})

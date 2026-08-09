const {describe, it} = require('node:test')
const assert = require('node:assert/strict')
const {
	formatCSS,
	formatCSSFluid,
	formatCSSRhythm,
	formatCSSRhythmTrim,
	formatTailwind,
	formatTokens,
	formatOutput,
} = require('../src/format')
const {computeScale} = require('../src/compute')

const defaultOptions = {
	scaleName: 'Major third',
	scaleValue: 1.25,
	baseFontSize: 16,
	lineHeight: 1.5,
	rhythm: 4,
}

function getItems() {
	return computeScale({
		scale: defaultOptions.scaleValue,
		baseFontSize: defaultOptions.baseFontSize,
		lineHeight: defaultOptions.lineHeight,
		rhythm: defaultOptions.rhythm,
	})
}

describe('formatCSS', () => {
	it('outputs :root block with custom properties', () => {
		const items = getItems()
		const result = formatCSS(items, {...defaultOptions, format: 'css'})
		assert.ok(result.includes(':root {'))
		assert.ok(result.includes('--font-size-h1:'))
		assert.ok(result.includes('--line-height-default:'))
	})

	it('uses rem units for font sizes', () => {
		const items = getItems()
		const result = formatCSS(items, {...defaultOptions, format: 'css'})
		assert.ok(result.includes('rem'), 'should output rem units')
		assert.ok(
			!result.match(/--font-size-\w+:\s*\d+px/),
			'should not use px for font-size',
		)
	})

	it('includes metadata comment', () => {
		const items = getItems()
		const result = formatCSS(items, {...defaultOptions, format: 'css'})
		assert.ok(result.includes('Major third'))
		assert.ok(result.includes('1.25'))
	})
})

describe('formatCSSFluid', () => {
	it('outputs clamp() expressions', () => {
		const items = getItems()
		const result = formatCSSFluid(items, {
			...defaultOptions,
			format: 'css-fluid',
		})
		assert.ok(result.includes('clamp('))
		assert.ok(result.includes('vw'))
	})

	it('includes fluid range in comment', () => {
		const items = getItems()
		const result = formatCSSFluid(items, {
			...defaultOptions,
			format: 'css-fluid',
		})
		assert.ok(result.includes('320px'))
		assert.ok(result.includes('1280px'))
	})
})

describe('formatCSSRhythm', () => {
	it('uses unitless line-height tokens', () => {
		const items = getItems()
		const result = formatCSSRhythm(items, {
			...defaultOptions,
			format: 'css-rhythm',
		})
		assert.ok(result.includes('--line-height-default: 1.5;'))
		assert.ok(!result.includes('--line-height-default: 24px;'))
	})

	it('includes lh and rlh spacing tokens', () => {
		const items = getItems()
		const result = formatCSSRhythm(items, {
			...defaultOptions,
			format: 'css-rhythm',
		})
		assert.ok(result.includes('--space-2: 1lh;'))
		assert.ok(result.includes('--space-section: 2rlh;'))
	})
})

describe('formatCSSRhythmTrim', () => {
	it('wraps trimming styles in @supports for progressive enhancement', () => {
		const items = getItems()
		const result = formatCSSRhythmTrim(items, {
			...defaultOptions,
			format: 'css-rhythm-trim',
		})
		assert.ok(result.includes('@supports (text-box: trim-both cap alphabetic)'))
		assert.ok(result.includes('text-box: trim-both cap alphabetic;'))
	})
})

describe('formatTailwind', () => {
	it('outputs module.exports with fontSize config', () => {
		const items = getItems()
		const result = formatTailwind(items, {
			...defaultOptions,
			format: 'tailwind',
		})
		assert.ok(result.includes('module.exports'))
		assert.ok(result.includes('fontSize'))
		assert.ok(result.includes('lineHeight'))
	})
})

describe('formatTokens', () => {
	it('outputs valid JSON with $type fields', () => {
		const items = getItems()
		const result = formatTokens(items, {...defaultOptions, format: 'tokens'})
		const parsed = JSON.parse(result)
		assert.ok(parsed.fontSize)
		assert.ok(parsed.lineHeight)
		assert.equal(parsed.fontSize.h1.$type, 'dimension')
	})
})

describe('formatOutput', () => {
	it('routes to correct formatter based on format option', () => {
		const items = getItems()

		const css = formatOutput(items, {...defaultOptions, format: 'css'})
		assert.ok(css.includes(':root'))

		const fluid = formatOutput(items, {...defaultOptions, format: 'css-fluid'})
		assert.ok(fluid.includes('clamp('))

		const tailwind = formatOutput(items, {
			...defaultOptions,
			format: 'tailwind',
		})
		assert.ok(tailwind.includes('module.exports'))

		const tokens = formatOutput(items, {...defaultOptions, format: 'tokens'})
		assert.ok(JSON.parse(tokens).fontSize)

		const rhythm = formatOutput(items, {
			...defaultOptions,
			format: 'css-rhythm',
		})
		assert.ok(rhythm.includes('--space-2: 1lh;'))

		const rhythmTrim = formatOutput(items, {
			...defaultOptions,
			format: 'css-rhythm-trim',
		})
		assert.ok(rhythmTrim.includes('@supports (text-box: trim-both cap alphabetic)'))
	})
})

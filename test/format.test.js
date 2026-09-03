const {describe, it} = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const {
	formatCSS,
	formatCSSFluid,
	formatCSSRhythm,
	formatCSSRhythmTrim,
	formatTailwind,
	formatTokens,
	formatOutput,
	remRootNote,
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

/**
 * Output at the default options as captured from the release tip (676f9b4), before the
 * export-consistency change. Every deliberate change in output has to show against it.
 */
function readBaseline(format) {
	return fs.readFileSync(path.join(__dirname, 'fixtures', `${format}.base16.txt`), 'utf8')
}

/** The `--line-height-<step>` values of a rhythm output, in step order. */
function lineHeightTokens(text) {
	return [...text.matchAll(/^ {2}--line-height-\w+: (.+);$/gm)].map((match) => match[1])
}

function withoutLineHeightTokens(text) {
	return text.replace(/^ {2}--line-height-\w+: .+;\n/gm, '')
}

/** Strip the rem-root note this change adds: a header line, or a sentence in the tokens $description. */
function withoutRemRootNote(format, text) {
	const note = remRootNote(16)
	assert.ok(text.includes(note), `${format} output should state "${note}"`)
	return format === 'tokens' ? text.replace(`. ${note}`, '') : text.replace(/^.*rem root: .*\n/m, '')
}

describe('base 16 output against the release-tip baseline', () => {
	for (const format of ['css', 'css-fluid', 'tailwind', 'tokens']) {
		it(`${format} adds only the rem-root note to the release-tip output`, () => {
			const actual = formatOutput(getItems(), {...defaultOptions, format})
			assert.equal(withoutRemRootNote(format, actual), readBaseline(format))
		})
	}

	for (const format of ['css-rhythm', 'css-rhythm-trim']) {
		it(`${format} adds the rem-root note and moves the unitless line-heights from pre-snap targets to snapped ratios`, () => {
			const actual = withoutRemRootNote(format, formatOutput(getItems(), {...defaultOptions, format}))
			const baseline = readBaseline(format)
			assert.equal(withoutLineHeightTokens(actual), withoutLineHeightTokens(baseline))
			// small … h1: only the default step was already on the grid
			assert.deepEqual(lineHeightTokens(baseline), ['1.5', '1.5', '1.433', '1.367', '1.3', '1.233', '1.167', '1.1'])
			assert.deepEqual(lineHeightTokens(actual), ['1.5385', '1.5', '1.6', '1.44', '1.4194', '1.3333', '1.2245', '1.1148'])
		})
	}
})

const FORMATS = ['css', 'css-fluid', 'tailwind', 'tokens', 'css-rhythm', 'css-rhythm-trim']
const base18 = {...defaultOptions, baseFontSize: 18}
const items18 = computeScale({scale: 1.25, baseFontSize: 18, lineHeight: 1.5, rhythm: 4})

describe('rem root', () => {
	it('remRootNote names the browser default at 16px and the html font-size to set otherwise', () => {
		assert.equal(remRootNote(16), 'rem root: 16px (browser default)')
		assert.equal(remRootNote(18), 'rem root: 18px — set html { font-size: 112.5% }')
		assert.equal(remRootNote(20), 'rem root: 20px — set html { font-size: 125% }')
		assert.equal(remRootNote(15), 'rem root: 15px — set html { font-size: 93.75% }')
	})

	for (const format of FORMATS) {
		it(`${format} states the rem root at base 16 and at base 18`, () => {
			const at16 = formatOutput(getItems(), {...defaultOptions, format})
			const at18 = formatOutput(items18, {...base18, format})
			assert.ok(at16.includes('rem root: 16px (browser default)'), format)
			assert.ok(at18.includes('rem root: 18px — set html { font-size: 112.5% }'), format)
			assert.ok(!at18.includes('browser default'), format)
		})
	}

	it('fluid converts with the base size as root, like every other format', () => {
		const fluid = formatCSSFluid(items18, base18)
		// body step: 18px is 1rem at the top of the range, 14px (80%, rounded) is 0.7778rem at the bottom
		assert.ok(fluid.includes('--font-size-default: clamp(0.7778rem, 0.7037rem + 0.4167vw, 1rem);'), fluid)
		// small step: 14px → 11px at the bottom, both over an 18px root
		assert.ok(fluid.includes('--font-size-small: clamp(0.6111rem, 0.5556rem + 0.3125vw, 0.7778rem);'), fluid)
		assert.ok(!fluid.includes('1.125rem'), 'no value should still be converted over a 16px root')
		// the static css format agrees on the maximum
		assert.ok(formatCSS(items18, base18).includes('--font-size-default: 1rem;'))
	})
})

describe('rhythm formats print the snapped line-height', () => {
	it('h6 and default at the defaults', () => {
		const rhythm = formatCSSRhythm(getItems(), defaultOptions)
		assert.ok(rhythm.includes('--line-height-h6: 1.6;'), rhythm)
		assert.ok(rhythm.includes('--line-height-default: 1.5;'), rhythm)
		assert.ok(!rhythm.includes('1.433'), 'the pre-snap target must not be printed')
	})

	for (const [label, options, items] of [
		['defaults', defaultOptions, getItems()],
		['base 18', base18, items18],
		['base 40, rhythm 8', {...defaultOptions, baseFontSize: 40, rhythm: 8}, computeScale({scale: 1.25, baseFontSize: 40, lineHeight: 1.5, rhythm: 8})],
	]) {
		it(`every unitless value × font size is the snapped, on-grid line-height (${label})`, () => {
			for (const format of [formatCSSRhythm, formatCSSRhythmTrim]) {
				const output = format(items, options)
				for (const item of items) {
					const match = output.match(new RegExp(`--line-height-${item.label}: ([0-9.]+);`))
					assert.ok(match, `${item.label} has a unitless line-height`)
					const px = parseFloat(match[1]) * item.fontSize
					assert.ok(Math.abs(px - item.lineHeight) < 0.01, `${item.label}: ${match[1]} × ${item.fontSize} = ${px}, snapped ${item.lineHeight}`)
					assert.equal(item.lineHeight % options.rhythm, 0, `${item.label} sits on the ${options.rhythm}px grid`)
				}
			}
		})
	}
})

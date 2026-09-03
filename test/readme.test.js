const {describe, it} = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const {buildOutputExamples, locateSection, README_PATH} = require('../scripts/readme-examples')

describe('README output examples', () => {
	it('are the exact formatter output for the defaults (regenerate with `node scripts/readme-examples.js`)', () => {
		const readme = fs.readFileSync(README_PATH, 'utf8')
		const section = locateSection(readme)
		assert.ok(section, 'README.md should have an "## Output Examples" section ending at "### Compatibility Notes"')
		assert.equal(readme.slice(section.start, section.end), buildOutputExamples())
	})

	it('show the rem-root note and the snapped rhythm line-heights', () => {
		const examples = buildOutputExamples()
		assert.ok(examples.includes('rem root: 16px (browser default)'))
		assert.ok(examples.includes('--line-height-h6: 1.6;'))
		assert.ok(!examples.includes('1.433'))
	})
})

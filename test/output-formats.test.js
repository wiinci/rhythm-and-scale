const {describe, it} = require('node:test')
const assert = require('node:assert/strict')
const {OUTPUT_FORMATS, openOutputDocument} = require('../src/output-formats')
const {FORMAT_LANGUAGES, formatOutput} = require('../src/format')
const {computeScale} = require('../src/compute')

describe('OUTPUT_FORMATS', () => {
	it('offers six formats, each a complete QuickPick item', () => {
		assert.equal(OUTPUT_FORMATS.length, 6)
		for (const item of OUTPUT_FORMATS) {
			assert.equal(typeof item.label, 'string')
			assert.equal(typeof item.detail, 'string')
			assert.equal(typeof item.description, 'string')
		}
	})

	it('uses unique format ids that every formatter and language map understands', () => {
		const ids = OUTPUT_FORMATS.map((item) => item.detail)
		assert.equal(new Set(ids).size, ids.length)
		const items = computeScale({scale: 1.25, baseFontSize: 16, lineHeight: 1.5, rhythm: 4})
		for (const id of ids) {
			assert.ok(FORMAT_LANGUAGES[id], `${id} has no language`)
			const content = formatOutput(items, {
				scaleName: 'Major third',
				scaleValue: 1.25,
				baseFontSize: 16,
				lineHeight: 1.5,
				rhythm: 4,
				format: id,
			})
			assert.ok(content.length > 0, `${id} formats to nothing`)
		}
	})
})

describe('openOutputDocument', () => {
	function stubVscode() {
		const calls = {opened: [], shown: []}
		const vscode = {
			workspace: {
				openTextDocument(options) {
					calls.opened.push(options)
					return Promise.resolve({uri: 'untitled:Untitled-1', ...options})
				},
			},
			window: {
				showTextDocument(doc) {
					calls.shown.push(doc)
					return Promise.resolve()
				},
			},
		}
		return {vscode, calls}
	}

	it("opens an untitled document in the format's language and shows it", async () => {
		const {vscode, calls} = stubVscode()
		await openOutputDocument(vscode, '{"a": 1}', 'tokens')
		assert.deepEqual(calls.opened, [{language: 'json', content: '{"a": 1}'}])
		assert.equal(calls.shown.length, 1)
		assert.equal(calls.shown[0].content, '{"a": 1}')
	})

	it('falls back to css for an unknown format id', async () => {
		const {vscode, calls} = stubVscode()
		await openOutputDocument(vscode, ':root {}', 'not-a-format')
		assert.equal(calls.opened[0].language, 'css')
	})
})

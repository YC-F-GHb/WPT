import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { JSDOM } from 'jsdom'
const source = stripTypeScriptTypes(readFileSync('src/utils/presentationBackground.ts', 'utf8'))
const { setPresentationBackground } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
const dom = new JSDOM('<html class="existing"><head><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=contain"><meta name="theme-color" content="#fafafa"></head><body></body></html>')
globalThis.document = dom.window.document
const viewport = document.querySelector('meta[name="viewport"]')
const original = viewport.content
for (let i = 0; i < 3; i++) {
  const restore = setPresentationBackground()
  assert.ok(document.documentElement.classList.contains('wpt-presenting'))
  assert.ok(document.documentElement.classList.contains('existing'))
  assert.equal(document.querySelector('meta[name="theme-color"]').content, '#000000')
  assert.match(viewport.content, /viewport-fit=cover/)
  assert.doesNotMatch(viewport.content, /viewport-fit=contain/)
  assert.equal(document.querySelectorAll('meta[name="viewport"]').length, 1)
  restore()
  assert.equal(document.documentElement.classList.contains('wpt-presenting'), false)
  assert.equal(document.querySelector('meta[name="theme-color"]').content, '#fafafa')
  assert.equal(viewport.content, original)
}
document.querySelectorAll('meta').forEach(meta => meta.remove())
const restore = setPresentationBackground()
assert.match(document.querySelector('meta[name="viewport"]').content, /width=device-width/)
restore()
assert.equal(document.querySelectorAll('meta').length, 0, 'created hints must not change the editor after exiting')
console.log('PASS: presentation black page state, Safari theme hint, safe-area viewport hint, repeated entry and restoration on exit')

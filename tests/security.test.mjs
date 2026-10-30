import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { JSDOM } from 'jsdom'
const { window } = new JSDOM('<!doctype html><html><body></body></html>')
for (const name of ['document', 'Node', 'HTMLElement']) globalThis[name] = window[name]
const source = stripTypeScriptTypes(readFileSync(new URL('../src/utils/security.ts', import.meta.url), 'utf8'))
const security = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
const { sanitizeHTML, sanitizeData, sanitizeSlides, escapeHTML, isLocalImage } = security
const attacks = [
 '<img src="https://example.invalid/tracker" onerror="alert(1)">',
 '<svg onload="alert(1)"><a href="javascript:alert(1)">x</a></svg>',
 '<p onclick="alert(1)" style="background-image:url(https://example.invalid/x)">x</p>',
 '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
 '<a href="javascript:alert(1)">click</a><style>@import "https://example.invalid";</style>',
 '<math><mtext><img src=x onerror=alert(1)></mtext></math>',
]
for (const attack of attacks) {
 const clean = sanitizeHTML(attack)
 assert.doesNotMatch(clean, /onerror|onclick|onload|<img|<svg|<math|<iframe|<script|<style|href=|url\(/i)
 assert.equal(sanitizeHTML(clean), clean)
}
assert.match(sanitizeHTML('<p style="text-align:center"><strong>中文内容</strong></p>'), /<strong>中文内容<\/strong>/)
assert.equal(escapeHTML('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;')
const data = sanitizeSlides([{ id: 'p', elements: [
 {type: 'video', src:'https://example.invalid/video'},
 {type: 'audio', src:'https://example.invalid/audio'},
 {type: 'image', src:'https://example.invalid/track'},
 {type: 'text', content: attacks[0], link:{type:'web',target:'javascript:alert(1)'}},
], remark: '<script>bad()</script>notes'}])
assert.equal(data[0].elements.length, 2)
assert.equal(data[0].elements[0].src, '')
assert.equal(data[0].elements[1].content, '')
assert.equal(data[0].elements[1].link, undefined)
assert.equal(data[0].remark, 'notes')
assert.equal(isLocalImage('https://example.invalid/test.png'), false)
assert.equal(isLocalImage('data:image/svg+xml;base64,PHN2Zz4='), false)
assert.equal(isLocalImage('data:image/png;base64,aGVsbG8='), true)
const hostile = JSON.parse('{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}')
assert.deepEqual(sanitizeData(hostile), {})
assert.equal({}.polluted, undefined)
assert.throws(() => sanitizeSlides(null))
console.log('PASS: HTML injection, formatting, table escaping, remote resources, media rejection, prototype pollution and invalid input')

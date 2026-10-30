import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'

const source = readFileSync('src/utils/exportPDF.ts', 'utf8').split('export const exportPDF')[0].replace(/^import .*$/gm, '')
const compiled = stripTypeScriptTypes(source)
const { createPagePDF } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const image = { bytes: new Uint8Array([255, 216, 0, 128, 255, 217]), width: 2000, height: 1125 }
for (const [width, height, count] of [[1000, 562.5, 3], [800, 1200, 1], [1122.52, 793.7, 2]]) {
  const blob = createPagePDF(Array(count).fill(image), width, height)
  assert.equal(blob.type, 'application/pdf')
  const bytes = Buffer.from(await blob.arrayBuffer())
  const pdf = bytes.toString('latin1')
  const xref = Number(pdf.match(/startxref\n(\d+)/)[1])
  assert.equal(bytes.subarray(xref, xref + 4).toString(), 'xref')
  const entries = pdf.slice(xref).split('\n').slice(3, 3 + 2 + 3 * count)
  entries.forEach((line, index) => {
    const offset = Number(line.slice(0, 10))
    assert.ok(bytes.subarray(offset).toString('latin1').startsWith(`${index + 1} 0 obj\n`), 'xref must point to object byte offset')
  })
  assert.ok(pdf.includes(`/Count ${count} /Kids`))
  const boxes = [...pdf.matchAll(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/g)]
  assert.equal(boxes.length, count)
  boxes.forEach(box => {
    assert.ok(Math.abs(Number(box[1]) - width * 0.75) < 1e-6)
    assert.ok(Math.abs(Number(box[2]) - height * 0.75) < 1e-6)
  })
  assert.equal((pdf.match(/\/Slide Do/g) || []).length, count)
  assert.equal((pdf.match(/ 0 0 cm/g) || []).length, count, 'each slide fills the page from origin with no margins')
  assert.equal(pdf.includes('/Annots'), false)
  assert.equal(pdf.includes('/Font'), false)
  for (let id = 4; id < 3 + 3 * count; id += 3) {
    const start = pdf.indexOf('stream\n', pdf.indexOf(`${id} 0 obj\n`)) + 7
    assert.deepEqual(bytes.subarray(start, start + image.bytes.length), Buffer.from(image.bytes))
  }
}
assert.throws(() => createPagePDF([], 1000, 500))
assert.throws(() => createPagePDF([image], 0, 500))
console.log('PASS: PDF byte offsets, binary streams, all page counts, exact portrait/landscape dimensions, full-page placement without headers or margins')

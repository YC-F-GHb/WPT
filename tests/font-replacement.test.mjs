import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'
import {JSDOM} from 'jsdom'
globalThis.document=new JSDOM('').window.document
const code=stripTypeScriptTypes(readFileSync('src/utils/fontReplacement.ts','utf8'))
const {processDocumentFonts}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const original={theme:{fontName:'Arial'},slides:[{elements:[{defaultFontName:'Arial',content:'<p><span style="font-family: Arial; font-size: 24px; color: red">Arial 正文</span><b style="font-family: Inter">保留</b></p>'},{data:[[{style:{fontname:'Arial',bold:true}}]]}]}],masters:[{elements:[{defaultFontName:'Arial'}],layouts:[{elements:[{content:'<span style="font-family: Arial, sans-serif">标题</span>'}]}]}]}
const before=JSON.stringify(original)
assert.deepEqual(processDocumentFonts(original).fonts,['Arial','Inter','sans-serif'])
const {data,count}=processDocumentFonts(original,{from:'arial',to:'SourceHanSans'})
assert.equal(count,6)
assert.equal(data.theme.fontName,'SourceHanSans')
assert.equal(data.slides[0].elements[1].data[0][0].style.fontname,'SourceHanSans')
assert.match(data.slides[0].elements[0].content,/Arial 正文/)
assert.match(data.slides[0].elements[0].content,/font-size: 24px/)
assert.match(data.slides[0].elements[0].content,/font-family: Inter/)
assert.match(data.masters[0].layouts[0].elements[0].content,/sans-serif/)
assert.equal(JSON.stringify(original),before)
assert.equal(processDocumentFonts(original,{from:'missing',to:'Inter'}).count,0)
assert.equal(processDocumentFonts({defaultFontName:''},{from:'',to:'Inter'}).data.defaultFontName,'Inter')
console.log('PASS: font discovery, mixed HTML, case matching, theme/master/layout/table coverage, fallback families, formatting retention, default fonts and immutability')

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
const code=stripTypeScriptTypes(readFileSync(new URL('../src/utils/headerFooter.ts',import.meta.url),'utf8'))
const {defaultHeaderFooter,normalizeHeaderFooter,headerFooterElements}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const slide={id:'p1',elements:[]}
const config=defaultHeaderFooter()
assert.equal(headerFooterElements(slide,config,0,3,1000,562.5).length,0)
config.header={enabled:true,text:'建筑材料 <img src=x onerror=alert(1)>',align:'left'}
config.footer={enabled:true,text:'教学资料',align:'left'}
config.pageNumber={enabled:true,align:'right',format:'total',start:1}
let els=headerFooterElements(slide,config,0,3,1000,562.5)
assert.equal(els.length,3)
assert.match(els[0].content,/&lt;img/)
assert.doesNotMatch(els[0].content,/<img/)
assert.match(els[2].content,/1 \/ 3/)
assert.match(headerFooterElements(slide,config,2,3,1000,562.5)[2].content,/3 \/ 3/)
config.hideOnFirst=true
assert.equal(headerFooterElements(slide,config,0,3,1000,562.5).length,0)
assert.equal(headerFooterElements(slide,config,1,3,1000,562.5).length,3)
assert.equal(headerFooterElements(slide,config,-1,3,1000,562.5).length,0)
const override=defaultHeaderFooter();override.footer={enabled:true,text:'仅本页',align:'center'}
assert.equal(headerFooterElements({...slide,headerFooter:override},config,1,3,1000,562.5).length,1)
config.hideOnFirst=false; config.pageNumber.format='number';config.pageNumber.start=5
assert.match(headerFooterElements(slide,config,0,3,1000,562.5)[2].content,/>5</)
config.footer.align='right'
els=headerFooterElements(slide,config,0,3,1000,562.5)
assert.ok(els[1].top+els[1].height<els[2].top,'same-alignment footer and number do not overlap')
const normalized=normalizeHeaderFooter({fontSize:Infinity,margin:-100,color:'url(evil)',pageNumber:{start:NaN,align:'evil'}})
assert.equal(normalized.fontSize,14);assert.equal(normalized.margin,8);assert.equal(normalized.color,'#687386');assert.equal(normalized.pageNumber.start,1)
console.log('PASS: fields, automatic numbering, first-page hiding, per-page override, escaping, size and collision handling')

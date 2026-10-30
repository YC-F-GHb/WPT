import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { JSDOM } from 'jsdom'
import { build } from 'esbuild'
import { createPinia, setActivePinia } from 'pinia'
const { window } = new JSDOM('<!doctype html><html><body></body></html>')
for (const name of ['document', 'Node', 'HTMLElement']) globalThis[name] = window[name]
const temp = new URL('./.master-store-test.mjs', import.meta.url)
try {
 await build({entryPoints:['src/store/slides.ts'],bundle:true,platform:'node',format:'esm',outfile:temp.pathname,external:['vue','pinia'],alias:{'@':new URL('../src',import.meta.url).pathname},logLevel:'silent'})
 const {useSlidesStore}=await import(temp.href+`?t=${Date.now()}`)
 setActivePinia(createPinia())
 const store=useSlidesStore()
 store.setSlides([{id:'slide1',elements:[]},{id:'slide2',elements:[]}])
 store.ensureMasters()
 const master=store.masters[0]
 const layout=master.layouts[0]
 store.masterEditingId=master.id
 const masterTitle=master.elements[0]
 store.updateElement({id:masterTitle.id,props:{defaultColor:'#123456'}})
 assert.equal(layout.elements[0].defaultColor,'#123456','master styles cascade to layout placeholders')
 store.masterEditingId=''

 store.applyLayout(layout.id,true)
 assert.equal(store.slides[0].elements.length,2)
 assert.equal(store.slides[1].elements.length,2)
 const title=store.slides[0].elements[0]
 store.updateElement({id:title.id,props:{content:'<p><span style="font-size: 36px;">保留标题</span></p>'}})
 store.masterEditingId=layout.id
 const source=store.currentSlide.elements[0]
 store.updateElement({id:source.id,props:{left:180,defaultColor:'#ff0000',content:'<p><span style="font-size: 42px;">母版标题</span></p>'}})
 assert.equal(store.slides[0].elements[0].left,180)
 assert.equal(store.slides[1].elements[0].left,180)
 assert.match(store.slides[0].elements[0].content,/保留标题/)
 assert.match(store.slides[0].elements[0].content,/42px/)
 store.masterEditingId=''
 store.updateElement({id:title.id,props:{left:250}})
 store.masterEditingId=layout.id
 store.updateElement({id:source.id,props:{left:200}})
 assert.equal(store.slides[0].elements[0].left,250,'local positioning override retained')
 assert.equal(store.slides[1].elements[0].left,200)
 store.masterEditingId=master.id
 store.addElement({type:'shape',id:'brand',left:0,top:0,width:100,height:10,rotate:0,path:'M0 0L100 0L100 10Z',viewBox:[100,10],fixedRatio:false,fill:'#4266e8'})
 let resolved=store.resolveSlide(store.slides[0])
 assert.equal(resolved.elements.length,3)
 assert.ok(resolved.elements[0].id.includes('__inherited_'))
 store.updateSlide({background:{type:'solid',color:'#faf0f0'}})
 assert.equal(store.resolveSlide(store.slides[0]).background.color,'#faf0f0')
 store.masterEditingId=''
 store.resetLayout()
 assert.equal(store.slides[0].elements[0].left,200)
 assert.match(store.slides[0].elements[0].content,/保留标题/)
 store.updateSlide({hideMasterGraphics:true})
 assert.equal(store.resolveSlide(store.slides[0]).elements.length,2)
 store.updateSlide({hideMasterGraphics:false})
 const serialized=JSON.parse(JSON.stringify({slides:store.slides,masters:store.masters}))
 store.setMasters([]);store.setSlides(serialized.slides);store.setMasters(serialized.masters)
 assert.equal(store.resolveSlide(store.slides[0]).elements.length,3,'JSON round trip retains composition')
 const runningConfig={...store.headerFooter,footer:{enabled:true,text:'课程页脚',align:'left'},pageNumber:{enabled:true,align:'right',format:'total',start:1}}
 store.applyHeaderFooter(runningConfig,true)
 assert.match(store.resolveSlide(store.slides[0]).elements.find(el=>el.id.endsWith('__running_page-number')).content,/1 \/ 2/)
 const originalFirst=store.slides[0].id
 store.slides.reverse()
 assert.match(store.resolveSlide(store.slides.find(slide=>slide.id===originalFirst)).elements.find(el=>el.id.endsWith('__running_page-number')).content,/2 \/ 2/)
 store.slides.reverse()
 store.applyHeaderFooter({...runningConfig,footer:{enabled:true,text:'当前页',align:'left'}},false)
 assert.match(store.resolveSlide(store.slides[0]).elements.find(el=>el.id.endsWith('__running_footer')).content,/当前页/)
 assert.match(store.resolveSlide(store.slides[1]).elements.find(el=>el.id.endsWith('__running_footer')).content,/课程页脚/)
 store.setHeaderFooter({});store.slides.forEach(slide=>delete slide.headerFooter)
 store.removeMasterItem(master.id)
 assert.equal(store.slides[0].layoutId,undefined)
 assert.equal(store.slides[0].elements.length,3,'deletion preserves visible content')
 assert.match(store.slides[0].elements.find(e=>e.type==='text').content,/保留标题/)
 store.ensureMasters()
 const nextMaster=store.masters[0]; const nextLayout=nextMaster.layouts[0]
 store.masterEditingId=nextLayout.id
 const removedKey=store.currentSlide.elements[0].placeholderKey
 store.deleteElement(store.currentSlide.elements[0].id)
 store.syncMasterPlaceholders()
 assert.ok(!nextLayout.elements.some(el=>el.placeholderKey===removedKey),'layout placeholder removal remains suppressed')
 assert.ok(nextMaster.elements.some(el=>el.placeholderKey===removedKey),'parent placeholder retained')
 const preservedLeft=nextMaster.elements[0].left
 store.setCanvasDimensions(900,1200)
 assert.equal(store.viewportSize,900)
 assert.equal(store.viewportSize*store.viewportRatio,1200)
 assert.equal(nextMaster.elements[0].left,preservedLeft,'canvas resize preserves element coordinates')
 assert.throws(()=>store.setCanvasDimensions(0,1200))
 assert.equal(store.viewportSize,900,'invalid dimensions leave document unchanged')
 console.log('PASS: master/layout inheritance, shared edits, content retention, local overrides, reset, background, hiding, JSON round trip and safe deletion')
} finally {try {unlinkSync(temp)} catch {}}

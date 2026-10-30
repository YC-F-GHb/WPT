import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { stripTypeScriptTypes } from 'node:module'
import { build } from 'esbuild'
import { parse, compileScript } from '@vue/compiler-sfc'
import { JSDOM } from 'jsdom'
const src = stripTypeScriptTypes(readFileSync('src/utils/units.ts', 'utf8'))
const { pxToMm, mmToPx } = await import(`data:text/javascript;base64,${Buffer.from(src).toString('base64')}`)
for (const mm of [0, -10.25, 0.1, 25.4, 210, 297, 2645.833]) assert.ok(Math.abs(pxToMm(mmToPx(mm)) - mm) < 1e-10)
assert.ok(Math.abs(pxToMm(96)-25.4)<1e-10)
const dom = new JSDOM('<div id="app"></div>')
for (const name of ['window','document','Element','HTMLElement','SVGElement','Node','Event']) globalThis[name] = dom.window[name]
const dir=mkdtempSync(join(tmpdir(),'wpt-units-'))
try {
  const out=join(dir,'component.mjs')
  await build({stdin:{contents:`export { default as LengthInput } from './src/components/LengthInput.vue'; export { createApp, h, reactive, nextTick } from 'vue'`,resolveDir:process.cwd()},outfile:out,bundle:true,format:'esm',platform:'node',logLevel:'silent',plugins:[{name:'vue-test',setup(b){b.onResolve({filter:/^@\//},a=>({path:join(process.cwd(),'src',a.path.slice(2) + (a.path.endsWith('.vue') ? '' : '.ts'))}));b.onLoad({filter:/\.vue$/},a=>{const {descriptor}=parse(readFileSync(a.path,'utf8'));const s=compileScript(descriptor,{id:a.path,inlineTemplate:true,genDefaultAs:'__sfc__'});return {contents:s.content+'\nexport default __sfc__',loader:'ts',resolveDir:join(a.path,'..')}})}}]})
  const {LengthInput,createApp,h,reactive,nextTick}=await import(pathToFileURL(out))
  let updates=0
  const state=reactive({value:1000})
  const app=createApp({render:()=>h(LengthInput,{value:state.value,min:-1000,max:10000,'onUpdate:value':v=>{state.value=v;updates++}})})
  app.mount(document.querySelector('#app'))
  await nextTick()
  const input=document.querySelector('input')
  assert.equal(input.value,'264.583')
  assert.equal(state.value,1000); assert.equal(updates,0)
  input.value='210';input.dispatchEvent(new Event('input',{bubbles:true}));await nextTick();await nextTick()
  assert.ok(Math.abs(pxToMm(state.value)-210)<1e-10)
  input.dispatchEvent(new Event('blur'));await nextTick();assert.ok(Math.abs(pxToMm(state.value)-210)<1e-10)
  const up=document.querySelector('.handler');up.click();await nextTick();await nextTick()
  assert.ok(Math.abs(pxToMm(state.value)-210.1)<1e-10)
  input.value='-10.25';input.dispatchEvent(new Event('input',{bubbles:true}));await nextTick();await nextTick()
  assert.ok(Math.abs(pxToMm(state.value)+10.25)<1e-10)
  state.value=562.5;await nextTick();await nextTick()
  assert.equal(input.value,'148.828');assert.equal(state.value,562.5)
  app.unmount()
  // Exercise the exact PPTX layout and ratios used by the application.
  let code=readFileSync('src/hooks/useExport.ts','utf8')
  const layout=code.match(/  const setPPTXLayout = \(pptx: pptxgen\) => \{([\s\S]*?)\n  \}\n/)[1]
  const Pptx=(await import('pptxgenjs')).default
  const pptx=new Pptx()
  const viewportSize={value:mmToPx(210)},viewportRatio={value:297/210},ratioPx2Inch={value:96}
  new Function('pptx','viewportSize','viewportRatio','ratioPx2Inch',layout)(pptx,viewportSize,viewportRatio,ratioPx2Inch)
  const bytes=await pptx.write({outputType:'nodebuffer'})
  const JSZip=(await import('jszip')).default
  const zip=await JSZip.loadAsync(bytes)
  const xml=await zip.file('ppt/presentation.xml').async('string')
  assert.match(xml,/<p:sldSz cx="7560000" cy="10692000"/)
  assert.match(code,/parseFloat\(styleObj\['font-size'\]\)/)
  console.log('PASS: mm conversion, no geometry drift, decimal/negative input, arrow increments, and actual 210 × 297 mm PPTX dimensions')
} finally {rmSync(dir,{recursive:true,force:true})}

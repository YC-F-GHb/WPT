import assert from 'node:assert/strict'
import {readFileSync,mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {build} from 'esbuild'
import {parse,compileScript} from '@vue/compiler-sfc'
import {JSDOM} from 'jsdom'
const dom=new JSDOM('<div id="app"></div>')
for(const k of ['window','document','HTMLElement','SVGElement','Element','Node','Event'])globalThis[k]=dom.window[k]
const dir=mkdtempSync(join(tmpdir(),'wpt-file-test-'))
try{
 const out=join(dir,'test.mjs')
 await build({stdin:{contents:`export {default as FileInput} from './src/components/FileInput.vue';export {createApp,h,ref,nextTick} from 'vue'`,resolveDir:process.cwd()},outfile:out,bundle:true,platform:'node',format:'esm',logLevel:'silent',plugins:[{name:'vue',setup(b){b.onLoad({filter:/\.vue$/},a=>{const {descriptor}=parse(readFileSync(a.path,'utf8'));return {contents:compileScript(descriptor,{id:'test',inlineTemplate:true,genDefaultAs:'Component'}).content+'\nexport default Component',loader:'ts',resolveDir:join(a.path,'..')}})}}]})
 const {FileInput,createApp,h,ref,nextTick}=await import(pathToFileURL(out))
 const menu=ref(true),inputRef=ref(null);let received=0,opens=0
 dom.window.HTMLInputElement.prototype.click=function(){opens++}
 const app=createApp({render:()=>h('div',[menu.value?h('button',{onClick:()=>inputRef.value.open()},'PPTX'):null,h(FileInput,{ref:inputRef,onChange:()=>received++})])})
 app.config.warnHandler=()=>{};app.mount(document.querySelector('#app'));await nextTick()
 document.querySelector('button').click();assert.equal(opens,1)
 menu.value=false;await nextTick()
 const input=document.querySelector('input');assert.ok(input,'input survives menu close')
 Object.defineProperty(input,'files',{configurable:true,value:[new dom.window.File(['test'],'sample.pptx')]})
 input.dispatchEvent(new Event('change',{bubbles:true}));assert.equal(received,1)
 inputRef.value.open();input.dispatchEvent(new Event('change',{bubbles:true}));assert.equal(received,2,'same file can be selected again')
 Object.defineProperty(input,'files',{value:[]});input.dispatchEvent(new Event('change',{bubbles:true}));assert.equal(received,2,'cancel does not start import')
 app.unmount()
 const header=readFileSync('src/views/Editor/EditorHeader/index.vue','utf8')
 assert.ok(header.indexOf('<FileInput ref="pptxInputRef"')>header.indexOf('</div>\n\n    <!-- File inputs'))
 console.log('PASS: persistent picker survives menu dismissal, emits selected file, supports repeat selection and ignores cancellation')
}finally{rmSync(dir,{recursive:true,force:true})}

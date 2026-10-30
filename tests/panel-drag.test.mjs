import assert from 'node:assert/strict'
import {readFileSync,mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {build} from 'esbuild'
import {parse,compileScript} from '@vue/compiler-sfc'
import {JSDOM} from 'jsdom'
const dom=new JSDOM('<div id="app"></div>')
for(const k of ['window','document','HTMLElement','SVGElement','Element','Node','Event','MouseEvent'])globalThis[k]=dom.window[k]
const dir=mkdtempSync(join(tmpdir(),'wpt-drag-'))
try {
 const out=join(dir,'panel.mjs')
 await build({stdin:{contents:`export {default as Panel} from './src/components/MoveablePanel.vue';export {createApp,h,nextTick} from 'vue'`,resolveDir:process.cwd()},outfile:out,bundle:true,platform:'node',format:'esm',logLevel:'silent',plugins:[{name:'vue',setup(b){b.onLoad({filter:/\.vue$/},a=>{const {descriptor}=parse(readFileSync(a.path,'utf8'));return {contents:compileScript(descriptor,{id:'test',inlineTemplate:true,genDefaultAs:'Panel'}).content+'\nexport default Panel',loader:'ts',resolveDir:join(a.path,'..')}})}}]})
 const {Panel,createApp,h,nextTick}=await import(pathToFileURL(out))
 const app=createApp({render:()=>h(Panel,{title:'查找与替换',width:330,height:0,left:100,top:90},{default:()=>h('select',[h('option','字体')])})})
 app.config.warnHandler=()=>{}
 app.mount(document.querySelector('#app'));await nextTick()
 const panel=document.querySelector('.moveable-panel'),header=panel.querySelector('.header')
 const fire=(el,type,x,y,buttons=1)=>el.dispatchEvent(new MouseEvent(type,{bubbles:true,button:0,buttons,clientX:x,clientY:y}))
 fire(panel.querySelector('select'),'mousedown',110,100);fire(window,'mousemove',200,200);await nextTick();assert.equal(panel.style.left,'100px','font selector must not initiate dragging')
 fire(header,'mousedown',110,100);fire(window,'mousemove',130,120);await nextTick();assert.equal(panel.style.left,'120px')
 fire(window,'mouseup',130,120,0);fire(window,'mousemove',200,200);await nextTick();assert.equal(panel.style.left,'120px','release stops drag')
 fire(header,'mousedown',130,120);window.dispatchEvent(new Event('blur'));fire(window,'mousemove',200,200);await nextTick();assert.equal(panel.style.left,'120px','window blur stops drag')
 fire(header,'mousedown',130,120);fire(window,'mousemove',200,200,0);fire(window,'mousemove',300,300);await nextTick();assert.equal(panel.style.left,'120px','missing mouseup recovered through buttons state')
 fire(header,'mousedown',130,120);app.unmount();fire(window,'mousemove',200,200)
 const search=readFileSync('src/views/Editor/SearchPanel.vue','utf8')
 assert.match(search,/title="查找与替换"/)
 assert.doesNotMatch(readFileSync('src/views/Editor/MasterControls.vue','utf8'),/aria-label="应用到全部"/)
 console.log('PASS: content interaction, header-only dragging, release, blur, lost mouseup, unmount cleanup and top toolbar button removal')
}finally{rmSync(dir,{recursive:true,force:true})}

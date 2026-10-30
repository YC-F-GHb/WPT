import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'
const code=stripTypeScriptTypes(readFileSync('src/views/Screen/hooks/useExecPlay.ts','utf8'))
const body=name=>code.match(new RegExp('const '+name+' = \\([^)]*\\) => \\{([\\s\\S]*?)\\n  \\}'))[1]
const slideIndex={value:0},slides={value:[1,2,3]},inAnimation={value:true}
const turn=index=>{slideIndex.value=index}
const next=new Function('slideIndex','slides','inAnimation','turnSlideToIndex',body('turnNextSlide')).bind(null,slideIndex,slides,inAnimation,turn)
const prev=new Function('slideIndex','slides','inAnimation','turnSlideToIndex',body('turnPrevSlide')).bind(null,slideIndex,slides,inAnimation,turn)
prev();assert.equal(slideIndex.value,0);next();assert.equal(slideIndex.value,1);next();next();assert.equal(slideIndex.value,2);prev();assert.equal(slideIndex.value,1)
class Element {constructor(interactive){this.interactive=interactive} closest(){return this.interactive}}
let count=0
const click=new Function('Element','turnNextSlide','e',body('slideClickListener')).bind(null,Element,()=>count++)
click({button:0,target:new Element(false)});assert.equal(count,1)
for(const e of [{button:2,target:new Element(false)},{button:0,target:new Element(true)},{button:0,defaultPrevented:true,target:new Element(false)}])click(e)
assert.equal(count,1)
assert.match(code,/key === KEYS.UP\) turnPrevSlide/);assert.match(code,/key === KEYS.DOWN\) turnNextSlide/)
for(const view of ['BaseView','PresenterView'])assert.match(readFileSync(`src/views/Screen/${view}.vue`,'utf8'),/@click="slideClickListener"/)
console.log('PASS: page navigation, first/last bounds, left click, interactive target exclusion, arrow mapping and both presentation views')

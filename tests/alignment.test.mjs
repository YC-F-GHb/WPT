import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { unlinkSync } from 'node:fs'
const temp=new URL('./.alignment-test.mjs',import.meta.url)
try {
 await build({entryPoints:['src/utils/alignment.ts'],bundle:true,platform:'node',format:'esm',outfile:temp.pathname,alias:{'@':new URL('../src',import.meta.url).pathname},logLevel:'silent'})
 const {alignElements,alignmentUnits}=await import(temp.href)
 const rect=(id,left,top,width=50,height=40,extra={})=>({id,type:'shape',left,top,width,height,rotate:0,...extra})
 const input=[rect('a',10,20),rect('b',160,100,80,60),rect('c',350,220,100,80),rect('other',20,30)]
 const ids=['a','b','c']
 const go=(action,target='selection',els=input,selected=ids)=>alignElements(els,selected,action,target,1000,600)
 const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`)
 for (const [action,prop,edge] of [['left','left',10],['top','top',20]]) go(action).slice(0,3).forEach(e=>near(e[prop],edge))
 go('right').slice(0,3).forEach(e=>near(e.left+e.width,450))
 go('bottom').slice(0,3).forEach(e=>near(e.top+e.height,300))
 go('horizontal').slice(0,3).forEach(e=>near(e.left+e.width/2,230))
 go('vertical').slice(0,3).forEach(e=>near(e.top+e.height/2,160))
 for (const e of go('right','slide').slice(0,3)) near(e.left+e.width,1000)
 for (const e of go('bottom','slide').slice(0,3)) near(e.top+e.height,600)
 const x=go('distribute-horizontal');near(x[1].left-(x[0].left+x[0].width),x[2].left-(x[1].left+x[1].width));assert.equal(x[0],input[0]);assert.equal(x[2],input[2])
 const y=go('distribute-vertical');near(y[1].top-(y[0].top+y[0].height),y[2].top-(y[1].top+y[1].height))
 const across=go('distribute-horizontal','slide');near(across[0].left,0);near(across[2].left+across[2].width,1000)
 assert.equal(go('left')[3],input[3]);assert.equal(input[1].left,160,'input is not mutated')
 assert.equal(go('left','selection',input,[]),input)
 assert.equal(go('left','selection',input,['a']),input)
 assert.equal(go('distribute-horizontal','selection',input,['a','b']),input)
 const groups=[rect('g1',100,200,50,40,{groupId:'g'}),rect('g2',180,250,80,40,{groupId:'g'}),rect('z',450,100)]
 const aligned=go('left','selection',groups,['g1','z']);near(aligned[1].left-aligned[0].left,80);near(aligned[1].top-aligned[0].top,50);near(aligned[2].left,100)
 assert.equal(alignmentUnits(groups,['g1','g2']).length,1)
 const locked=groups.map(e=>e.id==='g2'?{...e,lock:true}:e)
 const l=go('left','slide',locked,['g1','z']);assert.equal(l[0],locked[0]);assert.equal(l[1],locked[1]);near(l[2].left,0)
 const rot=[rect('r',200,200,100,40,{rotate:45}),rect('s',400,400)]
 const alignedRot=go('left','selection',rot,['r','s']);const rb=alignmentUnits(alignedRot,['r','s']);near(rb[0].minX,rb[1].minX)
 const line={id:'line',type:'line',left:200,top:100,start:[20,50],end:[120,0],width:100,height:50}
 const lineAligned=go('left','slide',[line],['line']);near(lineAligned[0].left+20,0)
 const internal=alignElements(groups,['g1','g2'],'left','slide',1000,600,'g2');assert.equal(internal[0],groups[0]);near(internal[1].left,0)
 const overlap=[rect('1',0,0,100),rect('2',10,0,100),rect('3',30,0,100)]
 assert.ok(go('distribute-horizontal','selection',overlap,['1','2','3']).every(e=>Number.isFinite(e.left)))
 console.log('PASS: six alignments, slide targets, equal gaps, groups, rotation, line offsets, locks, member editing, guards, immutability and no-op behavior')
} finally {try {unlinkSync(temp)} catch {}}

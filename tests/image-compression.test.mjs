import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'
import {reactive,shallowRef} from 'vue'
globalThis.reactive=reactive;globalThis.shallowRef=shallowRef
let stored=null
globalThis.localStorage={getItem:()=>stored,setItem:(_,v)=>{stored=v}}
const code=stripTypeScriptTypes(readFileSync('src/utils/imageCompression.ts','utf8')).replace("import { reactive, shallowRef } from 'vue'",'const {reactive,shallowRef}=globalThis')
const m=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
assert.deepEqual({...m.compressionSettings},{thresholdKB:1024,targetKB:500})
const small=new File([new Uint8Array(1024*1024)],'small.png',{type:'image/png'})
assert.equal(await m.prepareImageFile(small),small)
const large=new File([new Uint8Array(1100*1024)],'large.png',{type:'image/png'})
const prompt=m.prepareImageFile(large);await Promise.resolve();assert.equal(m.compressionRequest.value.targetBytes,500*1024);m.finishCompression(large);assert.equal(await prompt,large)
assert.throws(()=>m.saveCompressionSettings({thresholdKB:100,targetKB:500}))
m.saveCompressionSettings({thresholdKB:2048,targetKB:400});assert.equal(JSON.parse(stored).targetKB,400)
let closed=0,attempts=0
globalThis.createImageBitmap=async()=>({width:3000,height:2000,close:()=>closed++})
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({clearRect(){},drawImage(){}}),toBlob(cb){attempts++;cb(new Blob([new Uint8Array(attempts<6?600*1024:300*1024)],{type:'image/webp'}))}})}
const output=await m.compressImage(large,500*1024)
assert.ok(output.size<500*1024);assert.equal(output.type,'image/webp');assert.equal(closed,1);assert.ok(attempts>5)
console.log('PASS: threshold boundary, user prompt, preserve-original choice, settings validation/persistence, resize fallback, byte limit and bitmap cleanup')

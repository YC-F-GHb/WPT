import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
const source=stripTypeScriptTypes(readFileSync(new URL('../src/utils/canvasSize.ts',import.meta.url),'utf8'))
const {validCanvasSize,orientCanvas,presetCanvas,detectCanvasPreset}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
assert.deepEqual(presetCanvas('16:9','landscape'),{width:1000,height:562.5})
assert.deepEqual(presetCanvas('4:3','landscape'),{width:1000,height:750})
assert.deepEqual(presetCanvas('4:3','portrait'),{width:750,height:1000})
assert.deepEqual(orientCanvas(1200,800,'portrait'),{width:800,height:1200})
assert.deepEqual(orientCanvas(800,1200,'landscape'),{width:1200,height:800})
assert.equal(detectCanvasPreset(1080,1920),'16:9')
assert.equal(detectCanvasPreset(1200,900),'4:3')
assert.equal(detectCanvasPreset(800,800),'custom')
assert.equal(validCanvasSize(100,10000),true)
assert.equal(validCanvasSize(562.5,1000),true)
for(const size of [[0,500],[-1,500],[10001,500],[500,NaN],[Infinity,500],['',500],['1000',500]]) assert.equal(validCanvasSize(...size),false)
console.log('PASS: canvas presets, landscape/portrait swap, custom ratios, decimal dimensions and invalid input rejection')

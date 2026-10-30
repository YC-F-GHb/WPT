import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { parse, compileScript } from '@vue/compiler-sfc'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<div id="app"></div>')
for (const key of ['window', 'document', 'HTMLElement', 'SVGElement', 'Element', 'Node', 'Event', 'MouseEvent', 'TouchEvent']) globalThis[key] = dom.window[key]
const temporary = mkdtempSync(join(tmpdir(), 'wpt-touch-'))
const touch = (identifier, x, y) => ({ identifier, pageX: x, pageY: y, clientX: x, clientY: y })
const fireTouch = (target, type, touches = [], changedTouches = touches) => {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(event, { touches: { value: touches }, changedTouches: { value: changedTouches } })
  target.dispatchEvent(event)
  return event
}
const mouse = (target, type, x, y, buttons = 1) => target.dispatchEvent(new MouseEvent(type, { bubbles: true, button: 0, buttons, clientX: x, clientY: y }))
const near = (a, b) => assert.ok(Math.abs(a - b) < 0.0001, `${a} != ${b}`)
try {
  const outfile = join(temporary, 'touch.mjs')
  await build({
    stdin: { resolveDir: process.cwd(), contents: `
      export { default as ImageClipHandler } from './src/views/components/element/ImageElement/ImageClipHandler.vue'
      export { default as ImageOperate } from './src/views/Editor/Canvas/Operate/ImageElementOperate.vue'
      export { default as TextOperate } from './src/views/Editor/Canvas/Operate/TextElementOperate.vue'
      export { default as scaleHook } from './src/views/Editor/Canvas/hooks/useScaleElement'
      export { default as dragHook } from './src/views/Editor/Canvas/hooks/useDragElement'
      export { default as rotateHook } from './src/views/Editor/Canvas/hooks/useRotateElement'
      export { default as groupRotateHook } from './src/views/Editor/Canvas/hooks/useRotateGroupElement'
      export { default as lineHook } from './src/views/Editor/Canvas/hooks/useDragLineElement'
      export { bindCanvasPinch, clampCanvasPercentage } from './src/utils/canvasTouch'
      export { getDragPoint, stopActiveDrag } from './src/utils/drag'
      export { OperateResizeHandlers as Handles, OperateLineHandlers as LineHandles } from './src/types/edit'
      export { useMainStore, useSlidesStore } from '@/store'
      export { createPinia, setActivePinia } from 'pinia'
      export { ref, createApp, h, nextTick } from 'vue'
    ` },
    outfile, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent',
    plugins: [{ name: 'test-components', setup(b) {
      b.onResolve({ filter: /^@\/store$/ }, () => ({ path: 'stores', namespace: 'test-stores' }))
      b.onLoad({ filter: /.*/, namespace: 'test-stores' }, () => ({ resolveDir: process.cwd(), contents: `
        import {defineStore} from 'pinia'
        export const useMainStore=defineStore('touch-main',{
          state:()=>({activeElementIdList:['a'],activeGroupElementId:'',clipingImageElementId:'',canvasScale:2,isScaling:false}),
          actions:{setScalingState(value){this.isScaling=value}}
        })
        export const useSlidesStore=defineStore('touch-slides',{
          state:()=>({viewportSize:1000,viewportRatio:0.5625,updates:0,snapshots:0,elements:[]}),
          actions:{updateSlide({elements}){this.elements=JSON.parse(JSON.stringify(elements));this.updates++}}
        })
        export const useKeyboardStore=defineStore('touch-keys',{state:()=>({ctrlOrShiftKeyActive:false,ctrlKeyState:false,shiftKeyState:false})})
      ` }))
      b.onResolve({ filter: /^@\/hooks\/useHistorySnapshot$/ }, () => ({ path: 'history', namespace: 'test-history' }))
      b.onLoad({ filter: /.*/, namespace: 'test-history' }, () => ({ resolveDir: process.cwd(), contents: `import {useSlidesStore} from '@/store'; export default ()=>({addHistorySnapshot:()=>useSlidesStore().snapshots++})` }))
      b.onResolve({ filter: /^@\// }, a => ({ path: resolve('src', a.path.slice(2)) + (a.path.endsWith('.vue') ? '' : '.ts') }))
      b.onLoad({ filter: /\.vue$/ }, a => {
        let source = readFileSync(a.path, 'utf8')
        let { descriptor } = parse(source)
        if (!descriptor.script && !descriptor.scriptSetup) {
          source += '\n<script setup>const _empty = true</script>'
          descriptor = parse(source).descriptor
        }
        return { contents: compileScript(descriptor, { id: a.path, inlineTemplate: true }).content, loader: 'ts', resolveDir: dirname(a.path) }
      })
    } }],
  })
  const api = await import(pathToFileURL(outfile))
  const { ref, createApp, h, nextTick, Handles, LineHandles } = api
  const image = (id = 'a', left = 100) => ({ id, type: 'image', left, top: 100, width: 200, height: 100, rotate: 0, fixedRatio: false })
  const reset = (items = [image()]) => {
    api.stopActiveDrag()
    api.setActivePinia(api.createPinia())
    const main = api.useMainStore(), slides = api.useSlidesStore()
    const elements = ref(structuredClone(items)), alignment = ref([]), scale = ref(2)
    const resize = api.scaleHook(elements, alignment, scale)
    const drag = api.dragHook(elements, alignment, scale)
    return { main, slides, elements, alignment, scale, ...resize, ...drag }
  }
  let context = reset()
  let bodyMoves = 0
  let component = api.ImageOperate
  const props = ref(null)
  const app = createApp({ render: () => h('div', { id: 'surface', onTouchstart: () => bodyMoves++ }, [h(component, props.value)]) })
  const selectProps = () => ({ elementInfo: context.elements.value[0], handlerVisible: true, scaleElement: context.scaleElement, rotateElement: () => {} })
  props.value = selectProps()
  app.mount(document.querySelector('#app'))
  await nextTick()
  const handle = direction => document.querySelector('.resize-handler.' + direction)
  const a = touch(7, 600, 400), b = touch(7, 680, 440)
  assert.equal(fireTouch(handle(Handles.RIGHT_BOTTOM), 'touchstart', [a]).defaultPrevented, true)
  assert.equal(context.main.isScaling, true)
  fireTouch(document, 'touchmove', [b])
  near(context.elements.value[0].width, 240); near(context.elements.value[0].height, 120)
  near(context.elements.value[0].left, 100); near(context.elements.value[0].top, 100)
  assert.equal(bodyMoves, 0, 'touching a resize point must not initiate element movement')
  fireTouch(document, 'touchend', [], [b])
  assert.equal(context.slides.updates, 1); assert.equal(context.slides.snapshots, 1)
  assert.equal(context.main.isScaling, false)

  // A tap or OS cancellation must release resizing state and global listeners.
  props.value = selectProps(); await nextTick()
  fireTouch(handle(Handles.RIGHT_BOTTOM), 'touchstart', [a])
  fireTouch(document, 'touchend', [], [a])
  assert.equal(context.main.isScaling, false); assert.equal(context.slides.snapshots, 1)
  fireTouch(handle(Handles.RIGHT_BOTTOM), 'touchstart', [a])
  fireTouch(document, 'touchcancel', [], [])
  assert.equal(context.main.isScaling, false)
  const saved = JSON.stringify(context.elements.value)
  fireTouch(document, 'touchmove', [touch(7, 900, 900)])
  assert.equal(JSON.stringify(context.elements.value), saved)

  // Text side controls change width, not position. Mouse resizing follows the same path.
  context = reset([{ ...image(), type: 'text', content: '<p>建筑设计</p>', fixedHeight: false }])
  component = api.TextOperate; props.value = selectProps(); await nextTick()
  fireTouch(handle(Handles.RIGHT), 'touchstart', [a])
  fireTouch(document, 'touchmove', [b]); fireTouch(document, 'touchend', [], [b])
  near(context.elements.value[0].width, 240); near(context.elements.value[0].height, 100)
  near(context.elements.value[0].left, 100)
  props.value = selectProps(); await nextTick()
  mouse(handle(Handles.RIGHT), 'mousedown', 680, 440)
  mouse(document, 'mousemove', 720, 440)
  mouse(document, 'mouseup', 720, 440, 0)
  near(context.elements.value[0].width, 260); assert.equal(context.slides.snapshots, 2)

  // Rotated, fixed-ratio and all eight directions retain mouse geometry on touch devices.
  for (const rotate of [0, 37]) for (const fixedRatio of [false, true]) for (const direction of Object.values(Handles)) {
    const run = useTouch => {
      const state = reset([{ ...image(), rotate, fixedRatio }])
      const down = useTouch ? Object.assign(new Event('touchstart'), { touches: [a] }) : new MouseEvent('mousedown', { button: 0, clientX: a.pageX, clientY: a.pageY })
      state.scaleElement(down, state.elements.value[0], direction)
      if (useTouch) { fireTouch(document, 'touchmove', [b]); fireTouch(document, 'touchend', [], [b]) }
      else { mouse(document, 'mousemove', b.pageX, b.pageY); mouse(document, 'mouseup', b.pageX, b.pageY, 0) }
      assert.equal(state.slides.snapshots, 1)
      return state.elements.value[0]
    }
    assert.deepEqual(run(true), run(false))
  }
  context = reset([image(), image('b', 400)])
  context.main.activeElementIdList = ['a', 'b']
  context.scaleMultiElement(Object.assign(new Event('touchstart'), { touches: [a] }), { minX: 100, minY: 100, maxX: 600, maxY: 200 }, Handles.RIGHT_BOTTOM)
  fireTouch(document, 'touchmove', [b]); fireTouch(document, 'touchend', [], [b])
  near(context.elements.value[0].width, 216); near(context.elements.value[1].width, 216)
  assert.equal(context.slides.snapshots, 1)

  // A second finger switches from element drag to anchored canvas zoom and pan.
  context = reset(); props.value = selectProps(); component = api.ImageOperate; await nextTick()
  const surface = document.querySelector('#surface')
  let viewport = { percentage: 90, scale: 2, left: 100, top: 100 }
  const unbind = api.bindCanvasPinch(surface, () => viewport, value => { viewport = value })
  context.dragElement(Object.assign(new Event('touchstart'), { touches: [touch(1, 400, 300)] }), context.elements.value[0])
  const selectedBefore = JSON.stringify(context.elements.value)
  fireTouch(surface, 'touchstart', [touch(1, 400, 300), touch(2, 600, 300)])
  // Reversed TouchList order must still track the original two fingers.
  fireTouch(surface, 'touchmove', [touch(2, 700, 350), touch(1, 400, 350)])
  near(viewport.percentage, 135); near(viewport.scale, 3)
  near(viewport.left, -50); near(viewport.top, 50)
  assert.equal(JSON.stringify(context.elements.value), selectedBefore)
  assert.equal(context.slides.snapshots, 0)
  assert.equal(bodyMoves, 0)
  fireTouch(surface, 'touchend', [touch(1, 400, 350)], [touch(2, 700, 350)])
  fireTouch(surface, 'touchmove', [touch(1, 800, 800)])
  assert.equal(JSON.stringify(context.elements.value), selectedBefore, 'remaining finger must not resume dragging')
  fireTouch(surface, 'touchend', [], [touch(1, 800, 800)])
  fireTouch(surface, 'touchstart', [touch(3, 400, 300), touch(4, 600, 300)])
  fireTouch(surface, 'touchmove', [touch(3, 0, 300), touch(4, 2000, 300)])
  near(viewport.percentage, 200)
  fireTouch(surface, 'touchmove', [touch(3, 400, 300), touch(4, 401, 300)])
  near(viewport.percentage, 30)
  fireTouch(surface, 'touchcancel', [], [])
  fireTouch(surface, 'touchstart', [touch(1, 400, 300)])
  assert.equal(bodyMoves, 1, 'single-finger interaction must recover after pinch cancellation')
  unbind()

  // Rotation tap must not rotate to zero or create a history entry.
  context = reset([{ ...image(), rotate: 37 }])
  const rotation = api.rotateHook(context.elements, ref({ getBoundingClientRect: () => ({ left: 0, top: 0 }) }), context.scale)
  rotation.rotateElement(Object.assign(new Event('touchstart'), { touches: [a] }), context.elements.value[0])
  fireTouch(document, 'touchend', [], [a])
  near(context.elements.value[0].rotate, 37); assert.equal(context.slides.snapshots, 0)
  // Line endpoints also use the shared touch tracker.
  context = reset([{ id: 'a', type: 'line', left: 100, top: 100, width: 100, start: [0, 0], end: [100, 50], points: ['', ''] }])
  api.lineHook(context.elements).dragLineElement(Object.assign(new Event('touchstart'), { touches: [a] }), context.elements.value[0], LineHandles.END)
  fireTouch(document, 'touchmove', [b]); fireTouch(document, 'touchend', [], [b])
  near(context.elements.value[0].end[0], 140); near(context.elements.value[0].end[1], 70)
  context = reset(); props.value = selectProps(); await nextTick()
  fireTouch(handle(Handles.RIGHT_BOTTOM), 'touchstart', [a])
  window.dispatchEvent(new Event('blur'))
  assert.equal(context.main.isScaling, false)
  app.unmount(); api.stopActiveDrag()
  // Exercise all eight crop handles with mouse and touch, then move/cancel/commit.
  for (const direction of Object.values(Handles)) {
    let expected
    for (const input of ['mouse', 'touch']) {
      reset()
      const root = document.createElement('div'); document.body.append(root)
      let result
      const crop = createApp({ render: () => h(api.ImageClipHandler, {
        src: '', clipPath: '', width: 200, height: 100, top: 0, left: 0, rotate: 0,
        onClip: value => { result = value },
      }) })
      crop.directive('click-outside', { mounted(el, binding) { el.commitCrop = binding.value } })
      crop.mount(root); await nextTick()
      const point = root.querySelector('.clip-point.' + direction)
      assert.ok(point, direction)
      const dx = direction.includes('left') ? 40 : direction.includes('right') ? -40 : 0
      const dy = direction.includes('top') ? 20 : direction.includes('bottom') ? -20 : 0
      if (input === 'touch') {
        assert.equal(fireTouch(point, 'touchstart', [touch(8, 100, 100)]).defaultPrevented, true)
        fireTouch(document, 'touchmove', [touch(8, 100 + dx, 100 + dy)])
        fireTouch(document, 'touchend', [], [])
      }
      else {
        mouse(point, 'mousedown', 100, 100)
        mouse(document, 'mousemove', 100 + dx, 100 + dy)
        mouse(document, 'mouseup', 100 + dx, 100 + dy, 0)
      }
      await nextTick(); await new Promise(resolve => setTimeout(resolve, 1))
      const operate = root.querySelector('.operate')
      const dimensions = [operate.style.left, operate.style.top, operate.style.width, operate.style.height]
      if (input === 'mouse') expected = dimensions
      else assert.deepEqual(dimensions, expected, direction + ' touch/mouse geometry')
      assert.notDeepEqual(dimensions, ['0%', '0%', '100%', '100%'])
      // Moving the smaller crop must work and cancellation must release its lock.
      fireTouch(operate, 'touchstart', [touch(9, 100, 100)])
      fireTouch(document, 'touchmove', [touch(9, 110, 110)])
      fireTouch(document, 'touchcancel', [], [])
      await nextTick(); await new Promise(resolve => setTimeout(resolve, 1))
      root.querySelector('.image-clip-handler').commitCrop()
      assert.ok(result?.range)
      assert.ok(result.position.width <= 0 && result.position.height <= 0)
      crop.unmount(); root.remove()
    }
  }
  console.log('PASS: eight crop handles, mouse/touch parity, crop movement, cancellation and commit')

  assert.equal(api.getDragPoint(Object.assign(new Event('touchstart'), { touches: [a, b] })), null)
  console.log('PASS: touch image/text resize versus move, desktop geometry, groups, rotation, lines, tap/cancel/blur cleanup, two-finger anchored zoom/pan, bounds and gesture recovery')
} finally { rmSync(temporary, { recursive: true, force: true }) }

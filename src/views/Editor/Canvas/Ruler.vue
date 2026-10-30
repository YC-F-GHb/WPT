<template>
  <div class="ruler" ref="rulerRef" @mousedown.stop @dblclick.stop @contextmenu.stop>
    <div class="track horizontal" title="向下拖动，创建水平辅助线" @pointerdown.stop.prevent="startDrag($event, 'horizontal')">
      <svg :width="size.width" height="22" aria-label="顶部标尺">
        <g v-for="tick in horizontalTicks" :key="tick.value">
          <line :x1="tick.pixel" :x2="tick.pixel" :y1="tick.major ? 12 : 17" y2="22" />
          <text v-if="tick.major" :x="tick.pixel + 3" y="10">{{ tick.value }}</text>
        </g>
      </svg>
    </div>
    <div class="track vertical" title="向右拖动，创建垂直辅助线" @pointerdown.stop.prevent="startDrag($event, 'vertical')">
      <svg width="22" :height="size.height" aria-label="左侧标尺">
        <g v-for="tick in verticalTicks" :key="tick.value">
          <line :y1="tick.pixel" :y2="tick.pixel" :x1="tick.major ? 12 : 17" x2="22" />
          <text v-if="tick.major" :transform="`translate(10 ${tick.pixel + 3}) rotate(90)`">{{ tick.value }}</text>
        </g>
      </svg>
    </div>
    <div class="corner" title="单位：毫米">mm</div>
    <div v-for="guide in visibleGuides" :key="guide.id" class="guide" :class="guide.axis"
      :style="guide.axis === 'horizontal' ? { top: `${guide.pixel - 4}px` } : { left: `${guide.pixel - 4}px` }"
      title="拖动调整；双击或拖回标尺删除"
      @pointerdown.stop.prevent="startDrag($event, guide.axis, guide.id)"
      @dblclick.stop="removeGuide(guide.id)"
    />
  </div>
</template>

<script lang="ts" setup>
import { mmToPx, pxToMm } from '@/utils/units'
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import { storeToRefs } from 'pinia'
import { nanoid } from 'nanoid'
import { useMainStore } from '@/store'
import type { PPTElement } from '@/types/slides'

type Axis = 'horizontal' | 'vertical'
const props = defineProps<{
  viewportStyles: { top: number; left: number; width: number; height: number }
  elementList: PPTElement[]
}>()
const store = useMainStore()
const { canvasScale, editorGuides } = storeToRefs(store)
const rulerRef = useTemplateRef<HTMLElement>('rulerRef')
const size = ref({ width: 0, height: 0 })
const updateSize = () => {
  if (rulerRef.value) size.value = { width: rulerRef.value.clientWidth, height: rulerRef.value.clientHeight }
}
let observer: ResizeObserver | undefined
onMounted(() => {
  observer = new ResizeObserver(updateSize)
  if (rulerRef.value) observer.observe(rulerRef.value)
  updateSize()
})
const ticks = (axis: Axis) => {
  const origin = axis === 'horizontal' ? props.viewportStyles.left : props.viewportStyles.top
  const length = axis === 'horizontal' ? size.value.width : size.value.height
  const scale = canvasScale.value
  if (!(scale > 0)) return []
  const step = scale < .4 ? 10 : scale < .8 ? 5 : 1
  const major = step * (step === 1 ? 10 : 2)
  const start = Math.ceil(pxToMm((22 - origin) / scale) / step) * step
  const end = Math.floor(pxToMm((length - origin) / scale) / step) * step
  return Array.from({ length: Math.max(0, Math.min(2000, Math.floor((end - start) / step) + 1)) }, (_, index) => {
    const value = start + index * step
    return { value, pixel: origin + mmToPx(value) * scale, major: value % major === 0 }
  })
}
const horizontalTicks = computed(() => ticks('horizontal'))
const verticalTicks = computed(() => ticks('vertical'))
const visibleGuides = computed(() => editorGuides.value.map(guide => ({
  ...guide,
  pixel: (guide.axis === 'horizontal' ? props.viewportStyles.top : props.viewportStyles.left) + guide.position * canvasScale.value,
})).filter(guide => guide.pixel >= 22 && guide.pixel <= (guide.axis === 'horizontal' ? size.value.height : size.value.width)))
const removeGuide = (id: string) => { store.editorGuides = editorGuides.value.filter(guide => guide.id !== id) }
let cancelDrag: (() => void) | undefined
const startDrag = (event: PointerEvent, axis: Axis, existingId?: string) => {
  if (event.button !== 0 || !rulerRef.value || canvasScale.value <= 0) return
  cancelDrag?.()
  const id = existingId || nanoid(10)
  const original = editorGuides.value.find(guide => guide.id === id)?.position
  if (!existingId) store.editorGuides.push({ id, axis, position: 0 })
  let lastInside = false
  const move = (e: PointerEvent) => {
    if (e.pointerId !== event.pointerId || !rulerRef.value) return
    const rect = rulerRef.value.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    lastInside = x >= 22 && y >= 22 && x <= rect.width && y <= rect.height
    const coordinate = axis === 'horizontal' ? y : x
    const origin = axis === 'horizontal' ? props.viewportStyles.top : props.viewportStyles.left
    const guide = editorGuides.value.find(item => item.id === id)
    if (guide) guide.position = Math.round((coordinate - origin) / canvasScale.value * 10) / 10
  }
  const cleanup = () => {
    document.removeEventListener('pointermove', move)
    document.removeEventListener('pointerup', finish)
    document.removeEventListener('pointercancel', cancel)
    document.removeEventListener('keydown', keydown)
    window.removeEventListener('blur', cancel)
    cancelDrag = undefined
  }
  const cancel = () => {
    cleanup()
    const guide = editorGuides.value.find(item => item.id === id)
    if (original === undefined) removeGuide(id)
    else if (guide) guide.position = original
  }
  const finish = (e: PointerEvent) => {
    if (e.pointerId !== event.pointerId) return
    move(e)
    cleanup()
    if (!lastInside) removeGuide(id)
  }
  const keydown = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel() } }
  cancelDrag = cancel
  document.addEventListener('pointermove', move)
  document.addEventListener('pointerup', finish)
  document.addEventListener('pointercancel', cancel)
  document.addEventListener('keydown', keydown)
  window.addEventListener('blur', cancel)
  move(event)
}
onUnmounted(() => { cancelDrag?.(); observer?.disconnect() })
</script>

<style lang="scss" scoped>
.ruler { position: absolute; inset: 0; z-index: 30; pointer-events: none; overflow: hidden; user-select: none; }
.track { position: absolute; background: #f8f9fc; pointer-events: auto; touch-action: none; overflow: hidden; }
.track.horizontal { top: 0; left: 0; right: 0; height: 22px; border-bottom: 1px solid #dce0e8; cursor: row-resize; }
.track.vertical { top: 0; left: 0; bottom: 0; width: 22px; border-right: 1px solid #dce0e8; cursor: col-resize; }
svg { display: block; }
line { stroke: #a0a7b5; stroke-width: 1; }
text { fill: #697386; font: 9px sans-serif; }
.corner { position: absolute; left: 0; top: 0; width: 22px; height: 22px; background: #eef1f6; border-right: 1px solid #dce0e8; border-bottom: 1px solid #dce0e8; color: #8a93a3; font: 9px/22px sans-serif; text-align: center; }
.guide { position: absolute; pointer-events: auto; touch-action: none; }
.guide::after { content: ''; position: absolute; pointer-events: none; }
.guide.horizontal { left: 22px; right: 0; height: 9px; cursor: row-resize; }
.guide.horizontal::after { left: 0; right: 0; top: 4px; border-top: 1px dashed #5286eb; }
.guide.vertical { top: 22px; bottom: 0; width: 9px; cursor: col-resize; }
.guide.vertical::after { top: 0; bottom: 0; left: 4px; border-left: 1px dashed #5286eb; }
.guide:hover::after { border-color: #245cbd; }
</style>

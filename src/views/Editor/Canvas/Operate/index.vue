<template>
  <div
    class="operate"
    :class="{ 'multi-select': isMultiSelect && !isActive }"
    :style="{
      top: elementInfo.top * canvasScale + 'px',
      left: elementInfo.left * canvasScale + 'px',
      transform: `rotate(${rotate}deg)`,
      transformOrigin: `${elementInfo.width * canvasScale / 2}px ${height * canvasScale / 2}px`,
    }"
  >
    <component
      v-if="isSelected"
      :is="currentOperateComponent"
      :elementInfo="elementInfo"
      :handlerVisible="!elementInfo.lock && (isActiveGroupElement || !isMultiSelect)"
      :rotateElement="rotateElement"
      :scaleElement="scaleElement"
      :dragLineElement="dragLineElement"
      :moveShapeKeypoint="moveShapeKeypoint"
    ></component>
    <MoveHandler v-if="isSelected && !elementInfo.lock && !isMultiSelect" :style="{left: (moveWidth * canvasScale + 20) + 'px', top: (moveHeight * canvasScale + 20) + 'px'}" @move="event => dragElement(event, elementInfo)" />
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore } from '@/store'
import {
  ElementTypes,
  type PPTElement,
  type PPTLineElement,
  type PPTShapeElement,
  type PPTChartElement,
} from '@/types/slides'
import type { OperateLineHandlers, OperateResizeHandlers } from '@/types/edit'

import MoveHandler from './MoveHandler.vue'
import ImageElementOperate from './ImageElementOperate.vue'
import TextElementOperate from './TextElementOperate.vue'
import ShapeElementOperate from './ShapeElementOperate.vue'
import LineElementOperate from './LineElementOperate.vue'
import TableElementOperate from './TableElementOperate.vue'
import CommonElementOperate from './CommonElementOperate.vue'

const props = defineProps<{
  elementInfo: PPTElement
  dragElement: (e: MouseEvent | TouchEvent, element: PPTElement) => void
  isSelected: boolean
  isActive: boolean
  isActiveGroupElement: boolean
  isMultiSelect: boolean
  rotateElement: (e: MouseEvent | TouchEvent, element: Exclude<PPTElement, PPTChartElement | PPTLineElement>) => void
  scaleElement: (e: MouseEvent | TouchEvent, element: Exclude<PPTElement, PPTLineElement>, command: OperateResizeHandlers) => void
  dragLineElement: (e: MouseEvent | TouchEvent, element: PPTLineElement, command: OperateLineHandlers) => void
  moveShapeKeypoint: (e: MouseEvent | TouchEvent, element: PPTShapeElement, index: number) => void
}>()

const { canvasScale } = storeToRefs(useMainStore())

const currentOperateComponent = computed<unknown>(() => {
  const elementTypeMap = {
    [ElementTypes.IMAGE]: ImageElementOperate,
    [ElementTypes.TEXT]: TextElementOperate,
    [ElementTypes.SHAPE]: ShapeElementOperate,
    [ElementTypes.LINE]: LineElementOperate,
    [ElementTypes.TABLE]: TableElementOperate,
    [ElementTypes.CHART]: CommonElementOperate,
    [ElementTypes.LATEX]: CommonElementOperate,
  }
  return elementTypeMap[props.elementInfo.type] || null
})

const moveWidth = computed(() => props.elementInfo.type === 'line' ? Math.max(...[props.elementInfo.start[0], props.elementInfo.end[0]]) : props.elementInfo.width)
const moveHeight = computed(() => props.elementInfo.type === 'line' ? Math.max(props.elementInfo.start[1], props.elementInfo.end[1]) : props.elementInfo.height)
const rotate = computed(() => 'rotate' in props.elementInfo ? props.elementInfo.rotate : 0)
const height = computed(() => 'height' in props.elementInfo ? props.elementInfo.height : 0)
</script>

<style lang="scss" scoped>
.operate {
  position: absolute;
  z-index: 100;
  user-select: none;

  &.multi-select {
    opacity: 0.2;
  }
}
</style>

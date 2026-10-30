<template>
  <div class="common-element-operate">
    <BorderLine 
      class="operate-border-line"
      v-for="line in borderLines" 
      :key="line.type" 
      :type="line.type" 
      :style="line.style"
    />
    <template v-if="handlerVisible">
      <ResizeHandler
        class="operate-resize-handler" 
        v-for="point in resizeHandlers"
        :key="point.direction"
        :type="point.direction"
        :rotate="elementInfo.rotate"
        :style="point.style"
        @mousedown.stop="($event: MouseEvent) => scaleElement($event, elementInfo, point.direction)"
        @touchstart.stop.prevent="($event: TouchEvent) => scaleElement($event, elementInfo, point.direction)"
      />
      <RotateHandler
        class="operate-rotate-handler" 
        v-if="!cannotRotate"
        :style="{ left: scaleWidth / 2 + 'px' }"
        @mousedown.stop="($event: MouseEvent) => rotateElement($event, elementInfo)"
        @touchstart.stop.prevent="($event: TouchEvent) => rotateElement($event, elementInfo)"
      />
    </template>
  </div>
</template>

<script lang="ts">
export default {
  inheritAttrs: false,
}
</script>

<script lang="ts" setup>
import type { PPTLatexElement, PPTChartElement } from '@/types/slides'
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore } from '@/store'
import type { OperateResizeHandlers } from '@/types/edit'
import useCommonOperate from '../hooks/useCommonOperate'

import RotateHandler from './RotateHandler.vue'
import ResizeHandler from './ResizeHandler.vue'
import BorderLine from './BorderLine.vue'

type PPTElement = PPTLatexElement | PPTChartElement

const props = defineProps<{
  elementInfo: PPTElement
  handlerVisible: boolean
  rotateElement: (e: MouseEvent | TouchEvent, element: PPTElement) => void
  scaleElement: (e: MouseEvent | TouchEvent, element: PPTElement, command: OperateResizeHandlers) => void
}>()

const { canvasScale } = storeToRefs(useMainStore())

const scaleWidth = computed(() => props.elementInfo.width * canvasScale.value)
const scaleHeight = computed(() => props.elementInfo.height * canvasScale.value)
const { resizeHandlers, borderLines } = useCommonOperate(scaleWidth, scaleHeight)

const cannotRotate = computed(() => ['chart'].includes(props.elementInfo.type))
</script>

<template>
  <div class="mobile-editor">
    <Header :changeMode="changeMode" />
    
    <div class="content" ref="contentRef" @touchstart="handleClickBlankArea()">
      <div class="viewport-wrapper" :style="viewportStyles">
        <div class="background" :style="backgroundStyle"></div>
        <AlignmentLine 
          v-for="(line, index) in alignmentLines" 
          :key="index" 
          :type="line.type" 
          :axis="line.axis" 
          :length="line.length"
          :canvasScale="canvasScale"
        />
        <template v-for="element in elementList" :key="element.id">
          <MobileOperate
            v-if="element.type !== 'line'"
            :elementInfo="element"
            :isSelected="activeElementIdList.includes(element.id)"
            :canvasScale="canvasScale"
            :scaleElement="scaleElement"
            :rotateElement="rotateElement"
          />
        </template>
        <div class="viewport" ref="viewportRef" :style="{ transform: `scale(${canvasScale})` }">
          <MobileEditableElement 
            v-for="(element, index) in elementList" 
            :key="element.id"
            :elementInfo="element"
            :elementIndex="index + 1"
            :selectElement="selectElement"
          />
        </div>
      </div>
    </div>

    <SlideToolbar />
    <ElementToolbar v-if="handleElement" />
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watchEffect, useTemplateRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import type { PPTElement } from '@/types/slides'
import type { AlignmentLineProps } from '@/types/edit'
import type { Mode } from '@/types/mobile'
import useSlideBackgroundStyle from '@/hooks/useSlideBackgroundStyle'
import useDragElement from '@/views/Editor/Canvas/hooks/useDragElement'
import useScaleElement from '@/views/Editor/Canvas/hooks/useScaleElement'
import useRotateElement from '@/views/Editor/Canvas/hooks/useRotateElement'
import { bindCanvasPinch } from '@/utils/canvasTouch'

import AlignmentLine from '@/views/Editor/Canvas/AlignmentLine.vue'
import MobileEditableElement from './MobileEditableElement.vue'
import MobileOperate from './MobileOperate.vue'
import SlideToolbar from './SlideToolbar.vue'
import ElementToolbar from './ElementToolbar.vue'
import Header from './Header.vue'

defineProps<{
  changeMode: (mode: Mode) => void
}>()

const slidesStore = useSlidesStore()
const mainStore = useMainStore()
const { slideIndex, currentSlide, viewportRatio, viewportSize } = storeToRefs(slidesStore)
const { activeElementIdList, handleElement } = storeToRefs(mainStore)

const contentRef = useTemplateRef<HTMLElement>('contentRef')
const viewportRef = useTemplateRef<HTMLElement>('viewportRef')

const alignmentLines = ref<AlignmentLineProps[]>([])

const background = computed(() => currentSlide.value.background)
const { backgroundStyle } = useSlideBackgroundStyle(background)

const contentSize = ref({ width: 0, height: 0 })
const zoomPercentage = ref(90)
const pan = ref({ left: 0, top: 0 })
const canvasScale = computed(() => {
  const { width, height } = contentSize.value
  if (!width || !height) return 1
  const fit = Math.min((width - 20) / viewportSize.value, (height - 20) / viewportRatio.value / viewportSize.value)
  return Math.max(0.01, fit) * zoomPercentage.value / 90
})

let removePinch: (() => void) | undefined
const resizeObserver = new ResizeObserver(() => {
  if (!contentRef.value) return
  contentSize.value = { width: contentRef.value.clientWidth, height: contentRef.value.clientHeight }
})

onMounted(() => {
  if (activeElementIdList.value.length) mainStore.setActiveElementIdList([])
  if (slideIndex.value !== 0) slidesStore.updateSlideIndex(0)
  if (contentRef.value) {
    resizeObserver.observe(contentRef.value)
    removePinch = bindCanvasPinch(contentRef.value, () => ({
      percentage: zoomPercentage.value,
      scale: canvasScale.value,
      left: (contentSize.value.width - viewportSize.value * canvasScale.value) / 2 + pan.value.left,
      top: (contentSize.value.height - viewportSize.value * viewportRatio.value * canvasScale.value) / 2 + pan.value.top,
    }), state => {
      zoomPercentage.value = state.percentage
      pan.value = {
        left: state.left - (contentSize.value.width - viewportSize.value * canvasScale.value) / 2,
        top: state.top - (contentSize.value.height - viewportSize.value * viewportRatio.value * canvasScale.value) / 2,
      }
    })
  }
})
onUnmounted(() => {
  resizeObserver.disconnect()
  removePinch?.()
})

const viewportStyles = computed(() => ({
  width: viewportSize.value * canvasScale.value + 'px',
  height: viewportSize.value * viewportRatio.value * canvasScale.value + 'px',
  left: (contentSize.value.width - viewportSize.value * canvasScale.value) / 2 + pan.value.left + 'px',
  top: (contentSize.value.height - viewportSize.value * viewportRatio.value * canvasScale.value) / 2 + pan.value.top + 'px',
}))

const elementList = ref<PPTElement[]>([])
const setLocalElementList = () => {
  elementList.value = currentSlide.value ? JSON.parse(JSON.stringify(currentSlide.value.elements)) : []
}
watchEffect(setLocalElementList)

const { dragElement } = useDragElement(elementList, alignmentLines, canvasScale)
const { scaleElement } = useScaleElement(elementList, alignmentLines, canvasScale)
const { rotateElement } = useRotateElement(elementList, viewportRef, canvasScale)

const selectElement = (e: TouchEvent, element: PPTElement, startMove = true) => {
  if (!activeElementIdList.value.includes(element.id)) {
    mainStore.setActiveElementIdList([element.id])
    mainStore.setHandleElementId(element.id)
  }
  if (startMove) dragElement(e, element)
}

const handleClickBlankArea = () => {
  mainStore.setActiveElementIdList([])
}
</script>

<style lang="scss" scoped>
.mobile-editor {
  height: 100%;
  position: relative;
  background-color: $lightGray;
}
.content {
  height: calc(100% - 280px);
  position: relative;
  overflow: hidden;
  touch-action: none;
}
.viewport {
  transform-origin: 0 0;
}
.viewport-wrapper {
  position: absolute;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.01), 0 0 12px 0 rgba(0, 0, 0, 0.1);
}
.background {
  width: 100%;
  height: 100%;
  background-position: center;
  position: absolute;
}
</style>

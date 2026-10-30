<template>
  <div class="export-pdf-dialog">
    <div class="thumbnails-view">
      <div class="thumbnails" ref="pdfThumbnailsRef">
        <ThumbnailSlide 
          class="thumbnail" 
          :slide="currentSlide" 
          :size="viewportSize" 
          v-if="rangeType === 'current'"
        />
        <template v-else>
          <ThumbnailSlide 
            class="thumbnail" 
            
            v-for="slide in slides" 
            :key="slide.id" 
            :slide="slide" 
            :size="viewportSize" 
          />
        </template>
      </div>
    </div>
    <div class="configs">
      <div class="row">
        <div class="title">导出范围：</div>
        <RadioGroup
          class="config-item"
          v-model:value="rangeType"
        >
          <RadioButton style="width: 50%;" value="all">全部</RadioButton>
          <RadioButton style="width: 50%;" value="current">当前页</RadioButton>
        </RadioGroup>
      </div>
      <div class="tip">
        每张幻灯片导出为一页，尺寸与画布一致，无边距，不添加水印、网址或页眉页脚。
      </div>
    </div>

    <div class="btns">
      <Button class="btn export" type="primary" :disabled="printing" @click="expPDF()"><i-icon-park-outline:download /> {{ printing ? '正在导出…' : '导出 PDF' }}</Button>
      <Button class="btn close" @click="emit('close')">关闭</Button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, useTemplateRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useSlidesStore } from '@/store'
import { exportPDF } from '@/utils/exportPDF'
import message from '@/utils/message'

import ThumbnailSlide from '@/views/components/ThumbnailSlide/index.vue'
import Button from '@/components/Button.vue'
import RadioButton from '@/components/RadioButton.vue'
import RadioGroup from '@/components/RadioGroup.vue'

const emit = defineEmits<{
  (event: 'close'): void
}>()

const { slides, currentSlide, viewportRatio, viewportSize, title } = storeToRefs(useSlidesStore())

const pdfThumbnailsRef = useTemplateRef<HTMLElement>('pdfThumbnailsRef')
const rangeType = ref<'all' | 'current'>('all')

const printing = ref(false)
const expPDF = async () => {
  if (!pdfThumbnailsRef.value || printing.value) return
  const pageSize = {
    width: viewportSize.value,
    height: viewportSize.value * viewportRatio.value,
  }
  printing.value = true
  try {
    await exportPDF(pdfThumbnailsRef.value, pageSize, title.value)
  }
  catch {
    message.error('导出 PDF 失败，请重试')
  }
  finally {
    printing.value = false
  }
}
</script>

<style lang="scss" scoped>
.export-pdf-dialog {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}
.thumbnails-view {
  @include absolute-0();

  &::after {
    content: '';
    background-color: #fff;
    @include absolute-0();
  }
}
.thumbnail {
  &.break-page {
    break-after: page;
  }
}
.configs {
  width: 300px;
  height: calc(100% - 80px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  z-index: 1;

  .row {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 25px;
  }

  .title {
    width: 100px;
  }
  .config-item {
    flex: 1;
  }

  .tip {
    font-size: 12px;
    color: #aaa;
    line-height: 1.8;
    margin-top: 25px;
  }
}
.btns {
  width: 300px;
  height: 80px;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1;

  .export {
    flex: 1;
  }
  .close {
    width: 100px;
    margin-left: 10px;
  }
}
</style>
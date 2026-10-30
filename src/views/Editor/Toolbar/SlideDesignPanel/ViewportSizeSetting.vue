<template>
  <div class="canvas-size-dialog" @keydown.stop>
    <h2>画布大小</h2>
    <p class="subtitle">选择常用比例，或输入自定义宽度和高度。</p>
    <div class="body">
      <div class="settings">
        <div class="label">尺寸预设</div>
        <div class="presets">
          <button v-for="item in presets" :key="item.value" :class="{active: selectedPreset === item.value}" @click="selectPreset(item.value)">{{ item.label }}</button>
        </div>
        <div class="dimensions">
          <label>宽度<LengthInput aria-label="画布宽度" v-model:value="width" :min="CANVAS_MIN" :max="CANVAS_MAX" @update:value="selectedPreset = 'custom'" @enter="apply" /></label>
          <span class="multiply">×</span>
          <label>高度<LengthInput aria-label="画布高度" v-model:value="height" :min="CANVAS_MIN" :max="CANVAS_MAX" @update:value="selectedPreset = 'custom'" @enter="apply" /></label>
          
        </div>
        <div class="label">纸张方向</div>
        <div class="directions">
          <button :class="{active: direction === 'landscape'}" @click="orient('landscape')"><span class="paper landscape"></span>横向</button>
          <button :class="{active: direction === 'portrait'}" @click="orient('portrait')"><span class="paper portrait"></span>竖向</button>
        </div>
        <p class="note">切换方向会交换宽度与高度。</p>
        <p class="error" v-if="!valid">宽度和高度须为 {{ displayMm(CANVAS_MIN) }}–{{ displayMm(CANVAS_MAX) }} mm 之间的有效数字。</p>
        <p class="hint">单位为毫米（mm）。设置作用于整份文稿及所有母版；现有元素保持原尺寸和位置，页眉页脚会自动定位到新画布边缘。</p>
      </div>
      <div class="preview-area">
        <span class="label">方向预览</span>
        <div class="preview-stage"><div class="page" :style="previewStyle"><span>{{ valid ? `${displayMm(width)} × ${displayMm(height)} mm` : '尺寸无效' }}</span></div></div>
        <div class="ratio">{{ selectedPreset === 'custom' ? '自定义尺寸' : selectedPreset }} · {{ direction === 'landscape' ? '横向' : '竖向' }}</div>
      </div>
    </div>
    <div class="buttons"><button @click="emit('close')">取消</button><button class="primary" :disabled="!valid" @click="apply">应用尺寸</button></div>
  </div>
</template>
<script lang="ts" setup>
import LengthInput from '@/components/LengthInput.vue'
import { displayMm } from '@/utils/units'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useMainStore, useSlidesStore } from '@/store'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import { CANVAS_MIN, CANVAS_MAX, validCanvasSize, orientCanvas, presetCanvas, detectCanvasPreset } from '@/utils/canvasSize'
const emit = defineEmits<{(event: 'close'): void}>()
const store = useSlidesStore()
const main = useMainStore()
const { addHistorySnapshot } = useHistorySnapshot()
const width = ref(store.viewportSize)
const height = ref(store.viewportSize * store.viewportRatio)
const selectedPreset = ref(detectCanvasPreset(width.value,height.value))
const direction = computed(() => width.value >= height.value ? 'landscape' : 'portrait')
const valid = computed(() => validCanvasSize(width.value,height.value))
const presets = [{value:'16:9',label:'16:9 宽屏'},{value:'4:3',label:'4:3 标准'},{value:'custom',label:'自定义'}]
const selectPreset = (value: string) => {
  selectedPreset.value = value
  if (value !== 'custom') {
    const size = presetCanvas(value as '16:9' | '4:3',direction.value)
    width.value = size.width; height.value = size.height
  }
}
const orient = (value: 'landscape' | 'portrait') => {
  if (!valid.value) return
  const size = orientCanvas(width.value,height.value,value)
  width.value = size.width; height.value = size.height
}
const previewStyle = computed(() => {
  const scale = valid.value ? Math.min(190/width.value,190/height.value) : 1
  return {width: `${valid.value ? width.value*scale : 150}px`,height: `${valid.value ? height.value*scale : 100}px`}
})
const apply = () => {
  if (!valid.value) return
  store.setCanvasDimensions(width.value,height.value)
  main.setCanvasDragged(false)
  addHistorySnapshot()
  emit('close')
}
onMounted(() => main.setDisableHotkeysState(true))
onUnmounted(() => main.setDisableHotkeysState(false))
</script>
<style scoped>
.canvas-size-dialog { padding: 5px 8px; font-size: 12px; color: #42516a; }
h2 { margin: 0 0 8px; font-size: 19px; color: #23334e; }
.subtitle { margin: 0 0 22px; color: #8a94a6; }
.body { display: flex; gap: 28px; }.settings { flex: 1; min-width: 0; }
.label { font-weight: 600; display: block; margin-bottom: 10px; }
button { font: inherit; cursor: pointer; background: white; border: 1px solid #dce2ed; color: #42516a; border-radius: 5px; padding: 8px 12px; }
button.active { color: #3455db; border-color: #6c87e9; background: #eef2ff; }
.presets { display: flex; gap: 8px; margin-bottom: 22px; }.presets button { flex: 1; white-space: nowrap; }
.dimensions { display: flex; align-items: flex-end; gap: 10px; margin-bottom: 22px; }.dimensions label { flex: 1; min-width: 0; }
input { display: block; width: 100%; box-sizing: border-box; border: 1px solid #dce2ed; padding: 8px 10px; font: inherit; color: #26344e; border-radius: 5px; margin-top: 8px; }
.multiply,.unit { margin-bottom: 9px; color: #8b95a5; }
.directions { display: flex; gap: 12px; }.directions button { display: flex; gap: 10px; align-items: center; padding: 10px 20px; }
.paper { display: inline-block; border: 1px solid currentColor; background: #f7f9ff; border-radius: 2px; }.landscape { width: 23px; height: 15px; }.portrait { width: 15px; height: 23px; }
.note { font-size: 11px; color: #8b95a5; margin: 10px 0 20px; }.hint { font-size: 11px; color: #8b95a5; line-height: 1.9; }.error { color: #c44747; }
.preview-area { width: 210px; border-left: 1px solid #e8edf4; padding-left: 24px; }.preview-stage { height: 220px; display: flex; align-items: center; justify-content: center; background: #f5f7fb; border-radius: 6px; }.page { background: white; border: 1px solid #aab9d3; box-shadow: 0 4px 14px #26324710; display: flex; align-items: center; justify-content: center; }.page span { font-size: 10px; color: #8996aa; white-space: nowrap; }.ratio { text-align: center; margin-top: 14px; color: #8a94a6; font-size: 11px; }
.buttons { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; padding-top: 18px; border-top: 1px solid #e8edf4; }.primary { background: #3455db; border-color: #3455db; color: white; }.primary:disabled { opacity: .4; cursor: default; }
</style>

<style scoped>.dimensions :deep(.number-input) { width: 100%; box-sizing: border-box; margin-top: 8px; }</style>

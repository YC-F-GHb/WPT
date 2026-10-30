<template>
  <div class="running-fields-dialog" @keydown.stop>
    <h2>页眉、页脚和页码</h2>
    <p class="subtitle">设置普通幻灯片的固定信息；页码随页面顺序自动更新。</p>
    <div class="body">
      <div class="settings">
        <section>
          <label class="toggle"><input type="checkbox" v-model="draft.header.enabled">页眉</label>
          <input aria-label="页眉内容" type="text" v-model="draft.header.text" :disabled="!draft.header.enabled" maxlength="500" placeholder="例如：课程名称、单位名称">
          <label class="setting">对齐<select aria-label="页眉对齐" v-model="draft.header.align"><option value="left">左对齐</option><option value="center">居中</option><option value="right">右对齐</option></select></label>
        </section>
        <section>
          <label class="toggle"><input type="checkbox" v-model="draft.footer.enabled">页脚</label>
          <input aria-label="页脚内容" type="text" v-model="draft.footer.text" :disabled="!draft.footer.enabled" maxlength="500" placeholder="例如：章节名称、固定说明">
          <label class="setting">对齐<select aria-label="页脚对齐" v-model="draft.footer.align"><option value="left">左对齐</option><option value="center">居中</option><option value="right">右对齐</option></select></label>
        </section>
        <section>
          <label class="toggle"><input type="checkbox" v-model="draft.pageNumber.enabled">自动页码</label>
          <div class="pair">
            <label class="setting">格式<select aria-label="页码格式" v-model="draft.pageNumber.format"><option value="number">1、2、3…</option><option value="total">1 / 总页数</option></select></label>
            <label class="setting">起始编号<input aria-label="起始页码" type="number" min="0" max="99999" v-model.number="draft.pageNumber.start"></label>
          </div>
          <label class="setting">对齐<select aria-label="页码对齐" v-model="draft.pageNumber.align"><option value="left">左对齐</option><option value="center">居中</option><option value="right">右对齐</option></select></label>
        </section>
        <div class="pair appearance">
          <label class="setting">字号<LengthInput aria-label="页眉页脚字号" :min="8" :max="48" v-model:value="draft.fontSize" style="width: 105px" /></label>
          <label class="setting">颜色<input aria-label="页眉页脚颜色" type="color" v-model="draft.color"></label>
          <label class="setting">边距<LengthInput aria-label="页眉页脚边距" :min="8" :max="100" v-model:value="draft.margin" style="width: 105px" /></label>
        </div>
        <label class="toggle first"><input type="checkbox" v-model="draft.hideOnFirst">首页不显示页眉、页脚和页码</label>
      </div>
      <div class="preview-panel">
        <div class="preview-caption">幻灯片 {{ store.slideIndex + 1 }} 预览</div>
        <div class="preview"><ThumbnailSlide :slide="preview" :size="330" /></div>
        <p>页眉和页脚通过本面板统一修改。应用到全部会覆盖各页面的单独设置。</p>
      </div>
    </div>
    <div class="buttons">
      <button class="secondary" @click="emit('close')">取消</button>
      <button @click="apply(false)">应用到当前页</button>
      <button class="primary" @click="apply(true)">应用到全部</button>
    </div>
  </div>
</template>
<script lang="ts" setup>
import LengthInput from '@/components/LengthInput.vue'
import { computed, onMounted, onUnmounted, reactive } from 'vue'
import { useSlidesStore, useMainStore } from '@/store'
import { normalizeHeaderFooter } from '@/utils/headerFooter'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import ThumbnailSlide from '@/views/components/ThumbnailSlide/index.vue'
const emit = defineEmits<{(event: 'close'): void}>()
const store = useSlidesStore()
const main = useMainStore()
const draft = reactive(normalizeHeaderFooter(store.slides[store.slideIndex]?.headerFooter || store.headerFooter))
const { addHistorySnapshot } = useHistorySnapshot()
const preview = computed(() => ({ ...store.slides[store.slideIndex], headerFooter: normalizeHeaderFooter(draft) }))
const apply = (all: boolean) => { store.applyHeaderFooter(draft, all); addHistorySnapshot(); emit('close') }
onMounted(() => main.setDisableHotkeysState(true))
onUnmounted(() => main.setDisableHotkeysState(false))
</script>
<style scoped>
.running-fields-dialog { padding: 4px 8px; color: #34445e; font-size: 12px; }
h2 { font-size: 19px; margin: 0 0 8px; color: #23334e; }
.subtitle { color: #8590a2; margin: 0 0 20px; }
.body { display: flex; gap: 28px; }
.settings { flex: 1; min-width: 0; }
section { border-bottom: 1px solid #e8edf4; padding-bottom: 12px; margin-bottom: 14px; }
.toggle { display: flex; align-items: center; gap: 6px; font-weight: 600; margin-bottom: 8px; }
input[type=text] { width: 100%; box-sizing: border-box; margin-bottom: 8px; }
input, select { font: inherit; color: #34445e; }
input[type=text], input[type=number], select { border: 1px solid #dce2ed; border-radius: 5px; padding: 6px 8px; background: white; }
input:disabled { background: #f4f6fa; color: #9aa4b5; }
input[type=number] { width: 66px; } input[type=color] { width: 36px; height: 28px; border: 1px solid #dce2ed; background: white; }
.setting { display: flex; align-items: center; gap: 8px; }
.pair { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 8px; }
.appearance { padding-top: 2px; }
.first { font-weight: normal; margin-top: 14px; }
.preview-panel { width: 330px; padding-top: 3px; }
.preview-caption { font-weight: 600; margin-bottom: 12px; }
.preview { border: 1px solid #dce2ed; box-shadow: 0 4px 18px #26324710; }
.preview-panel p { font-size: 11px; line-height: 1.8; color: #8590a2; white-space: normal; }
.buttons { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; padding-top: 18px; border-top: 1px solid #e8edf4; }
button { cursor: pointer; border: 1px solid #cdd7e8; background: white; color: #415576; border-radius: 5px; padding: 8px 14px; font: inherit; }
button.primary { background: #3455db; border-color: #3455db; color: white; }
.secondary { margin-right: auto; }
</style>

<template>
  <div class="font-replacement">
    <label>替换字体（文稿中使用的字体）</label>
    <select aria-label="原字体" v-model="source"><option v-for="font in usedFonts" :key="font" :value="font">{{ label(font) }}</option></select>
    <label>替换为</label>
    <Select :options="FONTS.filter(item => item.value)" :value="target" search searchLabel="搜索目标字体" @update:value="target = String($event)" />
    <p>替换整份文稿、母版、版式和表格中的指定字体，保留字号、颜色及其他样式。可通过撤销恢复。</p>
    <Button type="primary" :disabled="!usedFonts.includes(source) || !target || source.toLowerCase() === target.toLowerCase()" @click="replace">全部替换字体</Button>
    <p role="status">{{ status }}</p>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMainStore, useSlidesStore } from '@/store'
import { FONTS } from '@/configs/font'
import { processDocumentFonts } from '@/utils/fontReplacement'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import Select from '@/components/Select.vue'
import Button from '@/components/Button.vue'
const store=useSlidesStore()
const main=useMainStore()
const {addHistorySnapshot}=useHistorySnapshot()
const source=ref(''),target=ref('SourceHanSans'),status=ref('')
const data=computed(()=>({slides:store.slides,masters:store.masters,theme:store.theme}))
const usedFonts=computed(()=>processDocumentFonts(data.value).fonts)
watch(usedFonts, fonts=>{if (!fonts.includes(source.value)) source.value=fonts[0] ?? ''},{immediate:true})
const label=(font: string)=>FONTS.find(item=>item.value===font)?.label || font
const replace=()=>{
  const result=processDocumentFonts(data.value,{from:source.value,to:target.value})
  if (!result.count) {status.value='未找到需要替换的字体。';return}
  main.setActiveElementIdList([]);main.setHandleElementId('')
  // Commit together: avoids master synchronization overwriting local slide styles.
  store.$patch({slides:result.data.slides,masters:result.data.masters,theme:result.data.theme})
  addHistorySnapshot()
  status.value=`已替换 ${result.count} 处字体设置。`
}
</script>
<style scoped>
.font-replacement {display:flex;flex-direction:column;gap:10px;padding-top:12px;}
select {width:100%;padding:8px;border:1px solid #d9e0ec;border-radius:4px;background:white;color:#34445f;}
p {font-size:12px;color:#8590a2;line-height:1.7;margin:2px 0;}
</style>

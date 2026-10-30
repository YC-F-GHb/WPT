<template>
  <div class="alignment-controls" @mousedown.stop.prevent>
    <div class="caption">对齐参照</div>
    <div class="targets">
      <button :aria-pressed="target === 'selection'" @click="target = 'selection'">对齐所选对象</button>
      <button :aria-pressed="target === 'slide'" @click="target = 'slide'">对齐幻灯片</button>
    </div>
    <div class="caption">对齐方式</div>
    <div class="actions">
      <button v-for="item in actions" :key="item.key" :disabled="!canAlign" @click="run(item.key)">{{ item.label }}</button>
    </div>
    <div class="distribute">
      <button :disabled="!canDistribute" @click="run('distribute-horizontal')">横向分布</button>
      <button :disabled="!canDistribute" @click="run('distribute-vertical')">纵向分布</button>
    </div>
    <p>{{ count ? `已选 ${count} 个可移动对象；组合按一个对象处理。` : '按住 Shift 点选多个元素，或在画布空白处框选。' }}</p>
    <p v-if="target === 'selection' && count < 3">对象间对齐需要至少 2 个对象，分布需要至少 3 个。</p>
  </div>
</template>
<script setup lang="ts">
import useElementAlignment from '@/hooks/useElementAlignment'
import type { AlignmentAction } from '@/utils/alignment'
const {target,count,canAlign,canDistribute,run}=useElementAlignment()
const actions: {key: AlignmentAction;label: string}[]=[{key:'left',label:'左对齐'},{key:'horizontal',label:'水平居中'},{key:'right',label:'右对齐'},{key:'top',label:'顶端对齐'},{key:'vertical',label:'垂直居中'},{key:'bottom',label:'底端对齐'}]
</script>
<style scoped>
.alignment-controls { font-size: 12px; color: #34445e; min-width: 220px; }
.caption { font-weight: 600; margin-bottom: 8px; }
.targets,.distribute { display:flex; gap:6px; margin-bottom:14px; }
button { font:inherit; cursor:pointer; border:1px solid #dce2ed; border-radius:4px; background:white; padding:8px 4px; color:inherit; flex:1; }
button:hover:enabled,button[aria-pressed=true] { color:#3455db; background:#eef2ff; border-color:#8299eb; }
button:disabled { cursor:default; opacity:.4; }
.actions { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin-bottom:8px; }
p { font-size:11px; line-height:1.7; color:#8590a2; margin:6px 0; }
</style>

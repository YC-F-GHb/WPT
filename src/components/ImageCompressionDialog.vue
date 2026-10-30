<template>
  <Modal :visible="!!request" :width="480" :closeOnClickMask="false" :closeOnEsc="false">
    <div v-if="request" class="compression-dialog" @keydown.stop>
      <h3>是否压缩图片？</h3>
      <p>{{ request.file.name }} · {{ (request.file.size / 1024).toFixed(1) }} KB</p>
      <p>图片超过 {{ compressionSettings.thresholdKB }} KB，默认压缩到小于 {{ request.targetBytes / 1024 }} KB。压缩可能降低分辨率，原始文件不会被修改。</p>
      <p v-if="/gif|webp|png/i.test(request.file.type)">若图片包含动画，压缩后将变为静态图片；透明背景会保留。</p>
      <p role="status">{{ status }}</p>
      <div class="actions"><Button :disabled="busy" @click="finishCompression(request.file)">保留原图</Button><Button type="primary" :disabled="busy" @click="compress">{{ busy ? '正在压缩…' : '压缩后导入（默认）' }}</Button></div>
    </div>
  </Modal>
</template>
<script setup lang="ts">
import {ref,watch} from 'vue'
import Modal from './Modal.vue'
import Button from './Button.vue'
import {compressionRequest as request,compressionSettings,compressImage,finishCompression} from '@/utils/imageCompression'
const busy=ref(false),status=ref('')
watch(request,()=>{status.value='';busy.value=false})
const compress=async()=>{
  const item=request.value
  if(!item || busy.value)return
  busy.value=true
  try {const file=await compressImage(item.file,item.targetBytes);finishCompression(file)}
  catch(error){status.value=error instanceof Error?error.message:'压缩失败，请保留原图。'}
  finally{busy.value=false}
}
</script>
<style scoped>.compression-dialog {padding:8px;color:#34445f;}p {line-height:1.8;word-break:break-word;} .actions {display:flex;justify-content:flex-end;gap:10px;margin-top:18px;}</style>

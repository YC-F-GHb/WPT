<template>
  <div class="general-settings" @keydown.stop>
    <section v-if="backupFilesVisible" class="autosave-files" aria-label="自动保存文件">
      <div class="backup-heading"><Button @click="backupFilesVisible = false">返回设置</Button><h3>自动保存文件</h3></div>
      <p>当前设备、当前浏览器的 JSON 备份。下载后可在“文件”或下载文件夹中查看，并通过“导入”恢复。</p>
      <Button :disabled="loadingBackups" @click="refreshBackups">刷新</Button>
      <p role="status" v-if="backupStatus">{{ backupStatus }}</p>
      <p v-else-if="loadingBackups" role="status">正在读取备份…</p>
      <p v-else-if="!backupList.length">暂无自动保存文件。达到设置的自动保存间隔后，备份会显示在这里。</p>
      <div class="backup-list" v-else>
        <div class="backup-file" v-for="backup in backupList" :key="backup.id">
          <div class="backup-details"><strong>{{ backup.document?.title || '未命名演示文稿' }}</strong><span>{{ backup.filename }}</span><time>{{ new Date(backup.createdAt).toLocaleString('zh-CN') }}</time></div>
          <Button :disabled="downloadingId === backup.id" @click="downloadBackup(backup.id)">下载 JSON</Button>
        </div>
      </div>
    </section>
    <template v-else>
    <h3>通用设置</h3>
    <h4>自动保存</h4>
    <label>自动保存间隔<select aria-label="自动保存间隔" v-model.number="autoSaveMinutes"><option :value="0">关闭</option><option :value="15">每 15 分钟</option><option :value="30">每半个小时</option><option :value="60">每一个小时</option></select></label>
    <p>自动保存为 JSON，包含页面、母版、主题和画布尺寸。每次生成独立文件，保留历史版本；页面关闭后停止保存。</p>
    <Button class="autosave-files-button" @click="openAutoSaveFiles"><i-icon-park-outline:folder-open /> 自动保存文件</Button>
    <p role="status">{{ folderStatus || autoSaveState.error || (autoSaveState.busy ? '正在自动保存…' : autoSaveState.lastSaved ? '上次保存：' + autoSaveState.lastSaved : '尚未自动保存') }}</p>
    <h4>图片压缩</h4>
    <label>压缩提示触发阈值（KB）<input type="number" min="11" max="102400" v-model.number="thresholdKB"></label>
    <label>压缩目标：小于（KB）<input type="number" min="10" :max="thresholdKB - 1" v-model.number="targetKB"></label>
    <p>默认超过 1024 KB（1 MB）时询问，压缩到小于 500 KB。设置保存在当前浏览器；图片在本机处理，不上传。</p>
    <p role="status">{{ error }}</p>
    <div class="actions"><Button @click="reset">恢复默认</Button><Button @click="emit('close')">取消</Button><Button type="primary" @click="save">保存</Button></div>
    </template>
  </div>
</template>
<script setup lang="ts">
import {ref} from 'vue'
import {autoSaveState,setAutoSaveInterval,localSaveRequest,browserAutoSave,listBrowserBackups,downloadBrowserBackup} from '@/utils/autoSave'
import Button from '@/components/Button.vue'
import {compressionSettings,saveCompressionSettings,DEFAULT_COMPRESSION} from '@/utils/imageCompression'
const autoSaveMinutes=ref(autoSaveState.minutes),folderStatus=ref('')
const openFolder=async()=>{try{await localSaveRequest('/__wpt/autosave/open-folder',{});folderStatus.value='已打开自动保存文件夹。'}catch(e){folderStatus.value=e instanceof Error?e.message:'无法打开文件夹'}}
const backupFilesVisible = ref(false)
const loadingBackups = ref(false)
const backupStatus = ref('')
const downloadingId = ref<number | null>(null)
const backupList = ref<{id: number; createdAt: number; filename: string; document?: {title?: string}}[]>([])
const refreshBackups = async () => {
  loadingBackups.value = true
  backupStatus.value = ''
  try { backupList.value = await listBrowserBackups() }
  catch { backupStatus.value = '无法读取浏览器备份，请检查存储权限。' }
  finally { loadingBackups.value = false }
}
const openAutoSaveFiles = async () => {
  if (!browserAutoSave) { await openFolder(); return }
  backupFilesVisible.value = true
  await refreshBackups()
}
const downloadBackup = async (id: number) => {
  downloadingId.value = id
  backupStatus.value = ''
  try { await downloadBrowserBackup(id) }
  catch { backupStatus.value = '下载备份失败，请重试。' }
  finally { downloadingId.value = null }
}
const emit=defineEmits<{(event:'close'):void}>()
const thresholdKB=ref(compressionSettings.thresholdKB),targetKB=ref(compressionSettings.targetKB),error=ref('')
const reset=()=>{thresholdKB.value=DEFAULT_COMPRESSION.thresholdKB;targetKB.value=DEFAULT_COMPRESSION.targetKB;autoSaveMinutes.value=15}
const save=()=>{try{saveCompressionSettings({thresholdKB:thresholdKB.value,targetKB:targetKB.value});setAutoSaveInterval(autoSaveMinutes.value);emit('close')}catch(e){error.value=e instanceof Error?e.message:'无法保存设置。'}}
</script>
<style scoped>.general-settings {padding:8px;color:#34445f;font-size:13px;}label{display:flex;align-items:center;justify-content:space-between;margin:18px 0;}input{width:100px;padding:7px;border:1px solid #dce2ed;border-radius:4px;}p{line-height:1.8;color:#8590a2;}.actions{display:flex;gap:8px;justify-content:flex-end;}</style>

<style scoped>select {padding:7px;border:1px solid #dce2ed;border-radius:4px;color:inherit;background:white;}</style>

<style scoped>
.autosave-files-button { gap:6px; }
.backup-heading { display:flex; align-items:center; gap:16px; }
.backup-list { max-height:360px; overflow:auto; margin-top:16px; }
.backup-file { display:flex; align-items:center; gap:12px; justify-content:space-between; padding:14px 0; border-bottom:1px solid #e5e5e5; }
.backup-details { display:flex; flex-direction:column; gap:6px; min-width:0; overflow-wrap:anywhere; }
.backup-details span,.backup-details time { font-size:12px; color:#8590a2; }
.backup-file :deep(button) { flex-shrink:0; }
</style>

import {onMounted,onUnmounted,watch} from 'vue'
import {useSlidesStore} from '@/store'
import {autoSaveState,localSaveRequest} from '@/utils/autoSave'
export default ()=>{
  const store=useSlidesStore()
  let lastAttempt=Date.now(),timer:ReturnType<typeof setInterval>|undefined
  const tick=async()=>{
    if(new URLSearchParams(location.search).get('mode')==='audience' || !autoSaveState.minutes || autoSaveState.busy || !store.slides.length || Date.now()-lastAttempt<autoSaveState.minutes*60000)return
    lastAttempt=Date.now();autoSaveState.busy=true
    try {
      await localSaveRequest('/__wpt/autosave',{title:store.title,width:store.viewportSize,height:store.viewportSize*store.viewportRatio,theme:store.theme,headerFooter:store.headerFooter,masters:store.masters,schemaVersion:2,slides:store.slides})
      autoSaveState.lastSaved=new Date().toLocaleString('zh-CN');autoSaveState.error=''
    }catch(e){autoSaveState.error=e instanceof Error?e.message:'自动保存失败'}
    finally{autoSaveState.busy=false}
  }
  watch(()=>autoSaveState.minutes,()=>{lastAttempt=Date.now()})
  const resume=()=>{if(document.visibilityState==='visible')void tick()}
  onMounted(()=>{timer=setInterval(()=>void tick(),10000);document.addEventListener('visibilitychange',resume)})
  onUnmounted(()=>{clearInterval(timer);document.removeEventListener('visibilitychange',resume)})
}

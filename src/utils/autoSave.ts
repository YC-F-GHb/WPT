import { reactive } from 'vue'
import Dexie from 'dexie'
import { saveAs } from 'file-saver'
export const AUTO_SAVE_INTERVALS=[0,15,30,60]
let interval=15
try {const saved=Number(localStorage.getItem('wpt-autosave-minutes'));if(localStorage.getItem('wpt-autosave-minutes')!==null && AUTO_SAVE_INTERVALS.includes(saved))interval=saved} catch {}
export const autoSaveState=reactive({minutes:interval,lastSaved:'',error:'',busy:false})
export const setAutoSaveInterval=(minutes:number)=>{
  if(!AUTO_SAVE_INTERVALS.includes(minutes))throw new Error('请选择有效的自动保存间隔。')
  localStorage.setItem('wpt-autosave-minutes',String(minutes));autoSaveState.minutes=minutes
}
export const browserAutoSave = !['localhost', '127.0.0.1'].includes(location.hostname)
const backups = new Dexie('WPT-browser-backups')
backups.version(1).stores({documents: '++id,createdAt'})
export const listBrowserBackups = () => backups.table('documents').orderBy('createdAt').reverse().toArray()
export const downloadBrowserBackup = async(id:number) => {
  const record = await backups.table('documents').get(id)
  if(!record)throw new Error('未找到备份。')
  saveAs(new Blob([JSON.stringify(record.document)], {type:'application/json'}), record.filename)
}
export const localSaveRequest=async(path:string,body:unknown)=>{
  if(browserAutoSave) {
    if(path !== '/__wpt/autosave')throw new Error('网页版备份保存在此浏览器，请在备份列表下载 JSON。')
    const createdAt = Date.now()
    const filename = `WPT-${new Date(createdAt).toISOString().replace(/[:.]/g,'-')}.json`
    await backups.table('documents').add({createdAt, filename, document:JSON.parse(JSON.stringify(body))})
    return {ok:true,filename}
  }
  const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
  if(!response.ok)throw new Error('本地自动保存失败，请确认通过“启动WPT.command”运行，且磁盘有可用空间。')
  const data=await response.json()
  if(!data.ok)throw new Error(data.error || '操作失败')
  return data
}

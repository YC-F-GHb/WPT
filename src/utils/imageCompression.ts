import { reactive, shallowRef } from 'vue'
export const DEFAULT_COMPRESSION = {thresholdKB:1024,targetKB:500}
const valid=(v: unknown): v is typeof DEFAULT_COMPRESSION => {
  const x=v as typeof DEFAULT_COMPRESSION
  return !!x && Number.isFinite(x.thresholdKB) && Number.isFinite(x.targetKB) && x.targetKB>=10 && x.thresholdKB>x.targetKB && x.thresholdKB<=102400
}
let saved=DEFAULT_COMPRESSION
try {const value=JSON.parse(localStorage.getItem('wpt-image-compression') || 'null');if(valid(value))saved=value} catch {}
export const compressionSettings=reactive({...saved})
export const saveCompressionSettings=(settings: typeof DEFAULT_COMPRESSION)=>{
  if(!valid(settings))throw new Error('目标大小须至少为 10 KB，触发阈值须大于目标大小且不超过 100 MB。')
  localStorage.setItem('wpt-image-compression',JSON.stringify(settings))
  Object.assign(compressionSettings,settings)
}
export interface CompressionRequest {file:File;targetBytes:number;resolve:(file:File)=>void}
export const compressionRequest=shallowRef<CompressionRequest | null>(null)
let pending=Promise.resolve()
export const prepareImageFile=(file:File):Promise<File>=>{
  if(file.size<=compressionSettings.thresholdKB*1024 || !/^image\/(png|jpe?g|webp|gif)$/i.test(file.type))return Promise.resolve(file)
  const result=pending.then(()=>new Promise<File>(resolve=>{compressionRequest.value={file,targetBytes:compressionSettings.targetKB*1024,resolve}}))
  pending=result.then(()=>{},()=>{})
  return result
}
export const finishCompression=(file:File)=>{
  const request=compressionRequest.value
  compressionRequest.value=null
  request?.resolve(file)
}
export const compressImage=async(file:File,targetBytes:number):Promise<File>=>{
  const bitmap=await createImageBitmap(file)
  try {
    const canvas=document.createElement('canvas')
    const ctx=canvas.getContext('2d')
    if(!ctx)throw new Error('浏览器不支持图片压缩。')
    let scale=Math.min(1,4096/Math.max(bitmap.width,bitmap.height))
    for(let round=0;round<30;round++){
      canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale))
      ctx.clearRect(0,0,canvas.width,canvas.height)
      ctx.drawImage(bitmap,0,0,canvas.width,canvas.height)
      for(const quality of [.92,.8,.65,.5,.35]){
        const blob=await new Promise<Blob | null>(resolve=>canvas.toBlob(resolve,'image/webp',quality))
        if(blob && blob.size<targetBytes && blob.size<file.size)return new File([blob],file.name.replace(/\.[^.]+$/,'')+(blob.type==='image/webp'?'.webp':'.png'),{type:blob.type})
      }
      if(canvas.width===1 && canvas.height===1)break
      scale*=.75
    }
    throw new Error('无法达到目标大小，可选择保留原图或调整设置。')
  } finally {bitmap.close()}
}

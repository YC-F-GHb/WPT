import type { Plugin, Connect } from 'vite'
import { mkdir, writeFile, rename, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const run=promisify(execFile)
export const autoSaveMiddleware=(directory:string):Connect.NextHandleFunction=>async(req,res,next)=>{
  const route=(req.url || '').split('?')[0]
  if(!['/__wpt/autosave','/__wpt/autosave/open-folder'].includes(route))return next()
  res.setHeader('Content-Type','application/json; charset=utf-8')
  const send=(status:number,data:unknown)=>{res.statusCode=status;res.end(JSON.stringify(data))}
  const host=req.headers.host || ''
  if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host) || req.headers.origin!==`http://${host}` || req.method!=='POST' || !req.headers['content-type']?.startsWith('application/json')){send(403,{error:'仅允许本机 WPT 页面访问'});return}
  try {
    await mkdir(directory,{recursive:true})
    if(route.endsWith('/open-folder')){
      await run(process.platform==='darwin'?'open':process.platform==='win32'?'explorer.exe':'xdg-open',[directory])
      send(200,{ok:true});return
    }
    let size=0;const chunks:Buffer[]=[]
    for await(const chunk of req){const buffer=Buffer.from(chunk);size+=buffer.length;if(size>256*1024*1024){send(413,{error:'文稿超过自动保存大小限制（256 MB）'});return}chunks.push(buffer)}
    const text=Buffer.concat(chunks).toString('utf8')
    const data=JSON.parse(text)
    if(!data || !Array.isArray(data.slides) || !data.slides.length || !Number.isFinite(data.width) || !Number.isFinite(data.height)){send(400,{error:'文稿数据无效'});return}
    const title=String(data.title || '未命名演示文稿').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').slice(0,60)
    const filename=`${title}_${new Date().toISOString().replace(/[:.]/g,'-')}_${randomUUID().slice(0,8)}.json`
    const temporary=join(directory,`.${filename}.tmp`)
    try {await writeFile(temporary,text,{flag:'wx',mode:0o600});await rename(temporary,join(directory,filename))}
    catch(e){await unlink(temporary).catch(()=>{});throw e}
    send(200,{ok:true,filename})
  }catch{send(500,{error:'自动保存操作失败，请检查文件夹权限或磁盘空间。'})}
}
export default function localAutoSave():Plugin {
  let directory=''
  return {name:'wpt-local-autosave',configResolved(config){directory=join(config.root,'自动保存')},configureServer(server){server.middlewares.use(autoSaveMiddleware(directory))},configurePreviewServer(server){server.middlewares.use(autoSaveMiddleware(directory))}}
}

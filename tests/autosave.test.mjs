import assert from 'node:assert/strict'
import {mkdtemp,readdir,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createServer} from 'node:http'
import {build} from 'esbuild'
import {pathToFileURL} from 'node:url'
const dir=await mkdtemp(join(tmpdir(),'wpt-autosave-'))
let server
try {
 const out=join(dir,'server.mjs')
 await build({entryPoints:['server/autoSave.ts'],outfile:out,bundle:true,platform:'node',format:'esm',logLevel:'silent'})
 const {autoSaveMiddleware}=await import(pathToFileURL(out))
 const folder=join(dir,'saved'),handler=autoSaveMiddleware(folder)
 server=createServer((req,res)=>handler(req,res,()=>{res.statusCode=404;res.end()}))
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 const origin=`http://127.0.0.1:${server.address().port}`
 const doc={title:'课程/测试',width:1000,height:562.5,theme:{fontName:'Inter'},masters:[],headerFooter:{},schemaVersion:2,slides:[{id:'s',elements:[]}]}
 const post=(body,source=origin)=>fetch(origin+'/__wpt/autosave',{method:'POST',headers:{Origin:source,'Content-Type':'application/json'},body:JSON.stringify(body)})
 assert.equal((await post(doc,'http://untrusted.example')).status,403)
 assert.equal((await post({slides:[]})).status,400)
 for(let i=0;i<2;i++){const res=await post(doc);assert.equal(res.status,200);assert.match((await res.json()).filename,/\.json$/)}
 const files=await readdir(folder);assert.equal(files.length,2)
 for(const file of files)assert.deepEqual(JSON.parse(await readFile(join(folder,file),'utf8')),doc)
 console.log('PASS: real JSON writes, round trip, independent versions, filename safety, invalid data and foreign origin rejection')
}finally{if(server)await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true})}

import {PDFDocument} from './vendor/pdf-lib.mjs';
export async function submitRecognition(bytes,pages,{onProgress=()=>{},signal}={}){
 const source=await PDFDocument.load(bytes);const chosen=await PDFDocument.create();chosen.setCreationDate(new Date(0));chosen.setModificationDate(new Date(0));for(const p of await chosen.copyPages(source,pages))chosen.addPage(p);const data=await chosen.save();
 if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
 const response=await fetch(`/api/jobs?pages=${pages.join(',')}`,{method:'POST',headers:{'Content-Type':'application/pdf'},body:data});
 const job=await response.json();if(!response.ok)throw new Error(job.error||'Could not start recognition.');
 const cancel=()=>fetch(`/api/jobs/${job.id}`,{method:'DELETE'}).catch(()=>{});signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted){cancel();throw new DOMException('Cancelled','AbortError');}
 try{while(true){if(signal?.aborted)throw new DOMException('Cancelled','AbortError');const statusResponse=await fetch(`/api/jobs/${job.id}`,{signal});const status=await statusResponse.json();if(!statusResponse.ok)throw new Error('Score processing was interrupted. Retry recognition.');onProgress(status);if(status.status==='done')return status.score;if(status.status==='error'||status.status==='cancelled')throw new Error(status.error||'Recognition cancelled.');await new Promise((resolve,reject)=>{const abort=()=>{clearTimeout(t);reject(new DOMException('Cancelled','AbortError'));};const t=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},800);signal?.addEventListener('abort',abort,{once:true});});}}finally{signal?.removeEventListener('abort',cancel);}
}

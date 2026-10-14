import {PDFDocument} from './vendor/pdf-lib.mjs';
export function recognitionUrl(path,baseUrl=''){
 if(!baseUrl)return path;
 const url=new URL(baseUrl);if(url.protocol!=='https:')throw new Error('The hosted recognition endpoint must use HTTPS.');
 return url.origin+path;
}
export function recognitionProgressView(job={}){
 const value=job.status==='done'?100:typeof job.percent==='number'&&Number.isFinite(job.percent)?Math.floor(Math.max(0,Math.min(99,job.percent))):null;
 const validPage=Number.isInteger(job.sourcePage)&&job.sourcePage>0&&Number.isInteger(job.pageIndex)&&job.pageIndex>0&&job.pageIndex<=job.pageCount;
 return {value,label:value!=null?`${value}%`:job.status==='queued'?'Waiting':'Working…',detail:validPage?`Page ${job.sourcePage} · ${job.pageIndex} of ${job.pageCount} selected pages`:''};
}
export async function submitRecognition(bytes,pages,{onProgress=()=>{},signal,baseUrl=''}={}){
 onProgress({stage:'preparing',message:'Preparing only the selected pages…'});
 const source=await PDFDocument.load(bytes);const chosen=await PDFDocument.create();chosen.setCreationDate(new Date(0));chosen.setModificationDate(new Date(0));for(const p of await chosen.copyPages(source,pages))chosen.addPage(p);const data=await chosen.save();
 if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
 onProgress({stage:'uploading',message:'Sending selected pages for recognition…'});
 const response=await fetch(recognitionUrl(`/api/jobs?pages=${pages.join(',')}`,baseUrl),{method:'POST',headers:{'Content-Type':'application/pdf'},body:data});
 const job=await response.json();if(!response.ok)throw new Error(job.error||'Could not start recognition.');onProgress(job);
 const cancel=()=>fetch(recognitionUrl(`/api/jobs/${job.id}`,baseUrl),{method:'DELETE'}).catch(()=>{});signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted){cancel();throw new DOMException('Cancelled','AbortError');}
 try{while(true){if(signal?.aborted)throw new DOMException('Cancelled','AbortError');const statusResponse=await fetch(recognitionUrl(`/api/jobs/${job.id}`,baseUrl),{signal});const status=await statusResponse.json();if(!statusResponse.ok)throw new Error('Score processing was interrupted. Retry recognition.');onProgress(status);if(status.status==='done')return status.score;if(status.status==='error'||status.status==='cancelled')throw new Error(status.error||'Recognition cancelled.');await new Promise((resolve,reject)=>{const abort=()=>{clearTimeout(t);reject(new DOMException('Cancelled','AbortError'));};const t=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},800);signal?.addEventListener('abort',abort,{once:true});});}}finally{signal?.removeEventListener('abort',cancel);}
}

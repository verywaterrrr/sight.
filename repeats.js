import {scoreMeasures} from './timeline.js';
// Each visit retains printed score time; elapsed audio time is accumulated separately.
export function repeatVisits(score,from,to,initial={}){
 const measures=scoreMeasures(score),index=new Map(measures.map((m,i)=>[m.number,i]));
 const repeats=(score.repeats||[]).filter(r=>index.has(r.startMeasure)&&index.has(r.endMeasure)).map(r=>({...r,start:index.get(r.startMeasure),end:index.get(r.endMeasure),times:Math.max(2,Math.min(8,r.times||2))}));
 const counts={...initial},done=new Set();for(const r of repeats)if(measures[r.end].start+measures[r.end].duration<=from)done.add(r.id);
 const chosenEnding=(score.endings||[]).find(e=>{const start=measures[index.get(e.startMeasure)],end=measures[index.get(e.endMeasure)];return start&&end&&from>=start.start&&from<end.start+end.duration;});if(chosenEnding&&initial[chosenEnding.repeatId]==null)counts[chosenEnding.repeatId]=Math.min(...chosenEnding.numbers)-1;
 const visits=[];let i=measures.findIndex(m=>m.start+m.duration>from+1e-6),first=true;
 for(let guard=0;i>=0&&i<measures.length&&guard<4096;guard++){
  const m=measures[i];if(m.start>=to-1e-6)break;
  const ending=(score.endings||[]).find(e=>m.number>=e.startMeasure&&m.number<=e.endMeasure);
  if(ending&&!ending.numbers.includes((counts[ending.repeatId]||0)+1)){
   const end=index.get(ending.endMeasure);for(const r of repeats)if(r.end>=i&&r.end<=end)done.add(r.id);i=end+1;continue;
  }
  const visit={measure:m.number,from:first?Math.max(from,m.start):m.start,to:Math.min(to,m.start+m.duration),passes:{...counts},completed:[...done]};first=false;visits.push(visit);
  let next=i+1;
  for(const r of repeats.filter(r=>r.end===i).sort((a,b)=>b.start-a.start)){
   if((counts[r.id]||0)<r.times-1){counts[r.id]=(counts[r.id]||0)+1;next=r.start;for(const inner of repeats)if(inner.id!==r.id&&inner.start>=r.start&&inner.end<r.end){counts[inner.id]=0;done.delete(inner.id);}break;}
   done.add(r.id);
  }
  visit.afterCompleted=[...done];visit.afterPasses={...counts};i=next;
 }
 return visits;
}

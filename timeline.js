const EPS=1e-6;
export function scoreMeasures(score){
 if(score.measures?.length)return score.measures;
 const count=Math.max(1,...score.events.map(e=>e.measure||Math.floor(e.time/4)+1));
 return Array.from({length:count},(_,i)=>({number:i+1,start:i*4,duration:4,timeSig:{num:4,den:4}}));
}
export function countInPlan(score,position){
 const measures=scoreMeasures(score);const m=measures.find(m=>position>=m.start-EPS&&position<m.start+m.duration-EPS)||measures.at(-1);
 const step=4/(m.timeSig?.den||4);const offset=Math.max(0,position-m.start);const duration=offset<EPS?m.duration:offset;
 const clicks=[];for(let t=0;t<duration-EPS;t+=step)clicks.push({time:t,accent:t===0,beat:Math.round(t/step)});
 return {duration,clicks};
}
function sustainedNotes(score){
 const notes=score.events.filter(e=>e.midi!=null&&!e.rest).map(e=>({...e})).sort((a,b)=>a.time-b.time);const merged=[];
 for(const n of notes){const previous=n.tieStop?merged.findLast(p=>p.part===n.part&&(p.voice||'1')===(n.voice||'1')&&p.midi===n.midi&&Math.abs(p.time+p.duration-n.time)<EPS&&p.tieStart):null;
  if(previous){previous.duration+=n.duration;previous.tieStart=n.tieStart;}
  else merged.push(n);
 }return merged;
}
export function playbackEvents(score,from,to){
 const plan=[];
 for(const note of sustainedNotes(score)){if(note.time>=to-EPS||note.time+note.duration<=from+EPS)continue;const start=Math.max(from,note.time);plan.push({kind:'note',time:start,duration:Math.min(to,note.time+note.duration)-start,attack:note.time>=from-EPS&&!note.tieStop,note});}
 for(const m of scoreMeasures(score)){const step=4/(m.timeSig?.den||4);for(let off=0;off<m.duration-EPS;off+=step){const time=m.start+off;if(time>=from-EPS&&time<to-EPS)plan.push({kind:'beat',time,accent:off<EPS,beat:Math.round(off/step)});}}
 return plan.sort((a,b)=>a.time-b.time||(a.kind==='beat'?-1:1));
}
export function expectedNoteAt(score,position,part){return score.events.find(e=>e.part===part&&e.midi!=null&&!e.rest&&position>=e.time-EPS&&position<e.time+e.duration-EPS)||null;}

// Page identity stays tied to the original PDF; playback time joins included bars.
export function scoreForPages(source,pages){
 const selected=new Set(pages),full=structuredClone(source.pageSource||source),mapping=new Map();delete full.pageSource;
 if(source.pageSource){
  full.parts=structuredClone(source.parts);full.removedNoteIds=[...new Set([...(full.removedNoteIds||[]),...(source.removedNoteIds||[])])];
  const originalBars=new Map(source.measures.map(m=>[m.number,m.originalNumber??m.number]));
  for(const m of source.measures){const original=full.measures.find(b=>b.number===originalBars.get(m.number));if(original)Object.assign(original,{duration:m.duration,timeSig:structuredClone(m.timeSig),reviewed:m.reviewed});}
  for(const n of source.events){const restored={...n,measure:originalBars.get(n.measure)};const index=full.events.findIndex(e=>e.id===n.id);if(index<0)full.events.push(restored);else full.events[index]=restored;}
  full.events=full.events.filter(n=>!full.removedNoteIds.includes(n.id));
  let time=0;for(const m of full.measures){m.start=time;time+=m.duration;}full.duration=time;
  for(const n of full.events)n.time=full.measures.find(m=>m.number===n.measure).start+n.beat;
 }
 const score=structuredClone(full);let start=0;
 score.measures=score.measures.filter(m=>selected.has(m.page)).map((m,i)=>{mapping.set(m.number,{number:i+1,start});const next={...m,originalNumber:m.number,number:i+1,start};start+=m.duration;return next;});
 score.events=score.events.filter(n=>selected.has(n.page)&&mapping.has(n.measure)).map(n=>{const m=mapping.get(n.measure);return {...n,measure:m.number,time:m.start+n.beat};});
 score.staves=Object.fromEntries(Object.entries(score.staves||{}).filter(([page])=>selected.has(+page)));score.duration=start;score.pageSource=full;
 if(pages.some((p,i)=>i&&p!==pages[i-1]+1))score.warnings=[...(score.warnings||[]),'Selected pages have gaps. Playback joins only the included pages.'];
 return score;
}

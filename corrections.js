// All score editing stays in quarter-note units and normalized PDF coordinates.
const EPS=1e-5;
function copy(score){return structuredClone(score);}
function bar(score,number){const measure=score.measures?.find(m=>m.number===number);if(!measure)throw new Error('Choose a valid bar.');return measure;}
function checkNote(score,note){
 const measure=bar(score,note.measure);
 if(!score.parts.some(p=>p.id===note.part))throw new Error('Choose a valid voice part.');
 if(note.midi!==null&&(!Number.isInteger(note.midi)||note.midi<21||note.midi>108))throw new Error('Choose a pitch between A0 and C8, or a rest.');
 if(!Number.isFinite(note.beat)||note.beat<0||!Number.isFinite(note.duration)||note.duration<=0)throw new Error('Onset and duration must be valid beat values.');
 if(note.beat+note.duration>measure.duration+EPS)throw new Error(`This note extends beyond bar ${measure.number}. Correct its onset, duration, or the bar length.`);
}
export function validateScore(score){
 const issues=[];
 for(const note of score.events||[]){
  try{checkNote(score,note);const measure=bar(score,note.measure);if(Math.abs(note.time-measure.start-note.beat)>EPS)throw new Error(`Bar ${measure.number} has inconsistent onset timing.`);}
  catch(error){issues.push({kind:'error',id:note.id,measure:note.measure,message:error.message});}
  if(note.midi!=null&&(note.x==null||note.y==null))issues.push({kind:'warning',id:note.id,measure:note.measure,message:`A note in bar ${note.measure} has no reliable printed position.`});
 }
 for(const measure of score.measures||[]){const full=measure.timeSig.num*4/measure.timeSig.den;if(Math.abs(measure.duration-full)>EPS)issues.push({kind:'warning',measure:measure.number,message:`Bar ${measure.number} lasts ${measure.duration} quarter beats; check its pickup or metre.`});}
 return issues;
}
export function correctNote(source,id,patch){
 const score=copy(source),note=score.events.find(n=>n.id===id);if(!note)throw new Error('This note no longer exists.');
 for(const key of ['midi','part','beat','duration'])if(key in patch)note[key]=patch[key];
 checkNote(score,note);note.time=bar(score,note.measure).start+note.beat;note.rest=note.midi==null;note.reviewed=true;note.uncertain=false;
 return score;
}
export function correctMeasure(source,number,{num,den,duration=num*4/den}){
 if(!Number.isInteger(num)||num<1||num>32||![1,2,4,8,16,32].includes(den)||!Number.isFinite(duration)||duration<=0||duration>num*4/den+EPS)throw new Error('Choose a valid metre and bar length. Pickups may be shorter than a full bar.');
 const score=copy(source),measure=bar(score,number);measure.timeSig={num,den};measure.duration=duration;measure.reviewed=true;
 for(const note of score.events.filter(n=>n.measure===number))checkNote(score,note);
 let start=0;for(const m of score.measures){m.start=start;start+=m.duration;}
 for(const n of score.events)n.time=bar(score,n.measure).start+n.beat;
 score.duration=start;return score;
}
export function addNote(source,fields){
 const score=copy(source),note={...fields,voice:fields.voice||'1',staff:fields.staff||'1',tieStart:false,tieStop:false,reviewed:true,uncertain:false};
 if(!note.id||score.events.some(n=>n.id===note.id))throw new Error('Choose a unique note identity.');
 if(!Number.isInteger(note.page)||!Number.isFinite(note.x)||!Number.isFinite(note.y)||note.x<0||note.x>1||note.y<0||note.y>1)throw new Error('Place the note on its printed page.');
 checkNote(score,note);note.time=bar(score,note.measure).start+note.beat;note.rest=note.midi==null;score.events.push(note);return score;
}
export function removeNote(source,id){const score=copy(source);score.events=score.events.filter(n=>n.id!==id);score.removedNoteIds=[...new Set([...(score.removedNoteIds||[]),id])];return score;}

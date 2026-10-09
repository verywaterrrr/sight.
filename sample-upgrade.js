import {correctMeasure,correctNote,addNote,removeNote} from './corrections.js';
export function upgradeSample(saved,latest){
 if(!saved||saved.recognition?.sampleRevision>=latest.recognition.sampleRevision||saved.events.length>=latest.events.length)return saved||latest;
 let score=structuredClone(latest);
 for(const part of saved.parts){const target=score.parts.find(p=>p.id===part.id);if(target&&part.name!=='Voice'){target.name=part.name;delete target.suggestedName;}}
 try{
  for(const m of saved.measures||[]){if(m.reviewed)score=correctMeasure(score,m.number,{...m.timeSig,duration:m.duration});}
  for(const id of saved.removedNoteIds||[])score=removeNote(score,id);
  for(const note of saved.events){const current=score.events.find(n=>n.id===note.id);if(!current){if(note.reviewed)score=addNote(score,note);continue;}
   if(note.reviewed||['midi','part','beat','duration'].some(key=>note[key]!==current[key]))score=correctNote(score,note.id,note);
  }
 }catch(error){score.warnings.push(`Some saved corrections could not be attached to the expanded sample: ${error.message}`);return saved;}
 return score;
}

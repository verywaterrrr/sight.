export function voiceProfile(part,notes=[]){
 const name=((part.suggestedName||'')+' '+(part.name||'')).toLowerCase();
 if(/piano|pno|keyboard/.test(name))return 'piano';
 if(/soprano|alto|female|women|girl/.test(name))return 'female';
 if(/tenor|bass|male|men|boy/.test(name))return 'male';
 const pitches=notes.filter(n=>n.midi!=null).map(n=>n.midi);return !pitches.length||pitches.reduce((a,b)=>a+b,0)/pitches.length>=60?'female':'male';
}
export class InstrumentBank{
 constructor(context){this.ctx=context;this.buffers=new Map();this.profiles=new Map();this.loading=new Map();}
 async prepare(score){
  const generation=this.generation=(this.generation||0)+1;
  this.manifestLoading??=fetch(new URL('./assets/sounds/manifest.json',import.meta.url)).then(r=>{if(!r.ok)throw new Error('Instrument manifest could not load.');return r.json();}).catch(e=>{this.manifestLoading=null;throw e;});this.manifest=await this.manifestLoading;
  const profiles=new Map((score.parts||[]).map(part=>[part.id,voiceProfile(part,score.events.filter(n=>n.part===part.id))]));
  await Promise.all([...new Set(profiles.values())].map(async profile=>{
   for(const sample of this.manifest[profile]){if(this.buffers.has(sample.file))continue;
    if(!this.loading.has(sample.file))this.loading.set(sample.file,(async()=>{const response=await fetch(new URL('./assets/sounds/'+sample.file,import.meta.url));if(!response.ok)throw new Error('Instrument sounds could not load. Check your connection and try again.');this.buffers.set(sample.file,await this.ctx.decodeAudioData(await response.arrayBuffer()));})().catch(e=>{this.loading.delete(sample.file);throw e;}));
    await this.loading.get(sample.file);
   }
  }));
  if(generation===this.generation)this.profiles=profiles;
 }
 play(when,midi,duration,part,destination,nodes){
  const profile=this.profiles.get(part);if(!profile)return false;
  const sample=this.manifest[profile].reduce((best,n)=>Math.abs(n.midi-midi)<Math.abs(best.midi-midi)?n:best);const buffer=this.buffers.get(sample.file);if(!buffer)return false;
  const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;source.playbackRate.value=2**((midi-sample.midi)/12+(sample.tune||0)/1200);source.loop=profile!=='piano';source.loopStart=0;source.loopEnd=buffer.duration;
  source.connect(gain);gain.connect(destination);const volume=profile==='piano'?.18:.10*(sample.gain||1);const hold=Math.max(.025,duration*.94),release=profile==='piano'?.16:.06;
  gain.gain.setValueAtTime(0,when);gain.gain.linearRampToValueAtTime(volume,when+.012);gain.gain.setValueAtTime(volume,when+hold);gain.gain.linearRampToValueAtTime(0,when+hold+release);source.start(when);source.stop(when+hold+release+.01);nodes.add(source);source.onended=()=>nodes.delete(source);return true;
 }
}

import {countInPlan,playbackEvents,scoreMeasures} from './timeline.js';
export class ScorePlayer{
 constructor(context,{selection=()=>new Set(),mode=()=> 'notes',onEvent=()=>{},onEnd=()=>{}}={}){this.ctx=context;Object.assign(this,{selection,mode,onEvent,onEnd});this.partGains=new Map();this.nodes=new Set();this.visuals=new Set();this.playing=false;this.bpm=92;this.generation=0;}
 stop(){this.generation++;this.playing=false;clearInterval(this.timer);this.visuals.forEach(clearTimeout);this.visuals.clear();this.nodes.forEach(n=>{try{n.stop();}catch{}});this.nodes.clear();}
 currentSegment(now=this.ctx.currentTime){return this.segments?.find(s=>now>=s.base&&now<s.endWall)||this.segments?.at(-1);}
 get counting(){const s=this.currentSegment();return !!s&&this.ctx.currentTime<s.origin;}
 positionAt(time){const s=this.currentSegment(time);return s?s.from+Math.max(0,time-s.origin)*this.bpm/60:this.from;}
 position(){return this.playing?this.positionAt(this.ctx.currentTime):this.paused??0;}
 pause(){this.pausedWasCounting=this.counting;this.paused=this.position();this.stop();}
 setBpm(bpm){const pos=this.position(),wasCounting=this.playing&&this.counting;this.bpm=bpm;if(this.playing)this.play(this.score,pos,{...this.options,bpm,countIn:wasCounting});}
 play(score,from,{bpm=this.bpm,loop=null,countIn=true,loopCountIn=false}={}){this.stop();this.ctx.resume();this.score=score;this.options={bpm,loop,countIn,loopCountIn};this.bpm=bpm;this.playing=true;this.segments=[];this.cycle(from,countIn);this.timer=setInterval(()=>this.pump(),25);this.pump();}
 cycle(from,countIn,base=this.ctx.currentTime+.055){this.from=from;const m=scoreMeasures(this.score);this.end=this.options.loop?.end??Math.max(...this.score.events.map(n=>n.time+n.duration),m.at(-1).start+m.at(-1).duration);const wait=countIn?countInPlan(this.score,from):{duration:0,clicks:[]};this.base=base;this.origin=this.base+wait.duration*60/this.bpm;this.endWall=this.origin+(this.end-from)*60/this.bpm;this.plan=[...wait.clicks.map(c=>({...c,kind:'count',when:this.base+c.time*60/this.bpm})),...playbackEvents(this.score,from,this.end).map(e=>({...e,when:this.origin+(e.time-from)*60/this.bpm}))];this.index=0;this.segments=this.segments.filter(s=>s.endWall>this.ctx.currentTime-.5);this.segments.push({from,base:this.base,origin:this.origin,endWall:this.endWall});}
 pump(){if(!this.playing)return;const now=this.ctx.currentTime;for(let cycles=0;cycles<32;cycles++){while(this.index<this.plan.length&&this.plan[this.index].when<now+.16){this.schedule(this.plan[this.index++]);}if(this.options.loop&&this.index===this.plan.length&&this.endWall<now+.16){this.cycle(this.options.loop.start,this.options.loopCountIn,this.endWall);continue;}if(!this.options.loop&&now>=this.endWall){this.pause();this.onEnd();}break;}}

 partBus(part){if(!this.partGains.has(part)){const bus=this.ctx.createGain();bus.gain.value=this.selection().has(part)?1:0;bus.connect(this.ctx.destination);this.partGains.set(part,bus);}return this.partGains.get(part);}
 syncSelection(){for(const [part,bus] of this.partGains)bus.gain.setTargetAtTime(this.selection().has(part)?1:0,this.ctx.currentTime,.008);}
 schedule(e){if(e.kind==='beat'||e.kind==='count')this.click(e.when,e.accent);
  else {if(this.mode()==='rhythm'){if(e.attack)this.click(e.when,false,'wood',.20,e.note.part);}else this.note(e.when,e.note.midi,e.duration*60/this.bpm,e.note.part);}
  const generation=this.generation;const id=setTimeout(()=>{this.visuals.delete(id);if(this.playing&&generation===this.generation)this.onEvent(e);},Math.max(0,(e.when-this.ctx.currentTime)*1000));this.visuals.add(id);
 }
 oscillator(when,freq,duration,volume,type='sine',part=null,sustain=false){const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.value=freq;o.connect(g);g.connect(part==null?this.ctx.destination:this.partBus(part));g.gain.setValueAtTime(.0001,when);g.gain.exponentialRampToValueAtTime(Math.max(.001,volume),when+.005);if(sustain&&duration>.05)g.gain.setValueAtTime(Math.max(.001,volume*.8),when+Math.max(.008,duration-.03));g.gain.exponentialRampToValueAtTime(.0001,when+Math.max(.02,duration));o.start(when);o.stop(when+Math.max(.02,duration)+.02);this.nodes.add(o);o.onended=()=>this.nodes.delete(o);}
 click(when,accent=false,tone='bright',volume=.16,part=null){this.oscillator(when,tone==='wood'?(accent?1250:800):tone==='bell'?(accent?2200:1500):(accent?1900:1200),tone==='bell'?.12:.035,volume,tone==='wood'?'triangle':'sine',part);}
 note(when,midi,duration,part){this.oscillator(when,440*2**((midi-69)/12),Math.max(.04,duration*.94),.07,'triangle',part,true);}
}
export class StandaloneMetronome extends ScorePlayer{
 start(options){this.stop();this.playing=true;this.options=options;this.beat=0;this.next=this.ctx.currentTime+.05;this.ctx.resume();this.timer=setInterval(()=>this.pump(),25);this.pump();}
 pump(){if(!this.playing)return;while(this.next<this.ctx.currentTime+.16){const {bpm,num,accent,tone,volume}=this.options;const index=this.beat%num,when=this.next;this.click(when,accent&&index===0,tone,volume);const generation=this.generation;const id=setTimeout(()=>{this.visuals.delete(id);if(this.playing&&generation===this.generation)this.onEvent({kind:'beat',beat:index});},Math.max(0,(when-this.ctx.currentTime)*1000));this.visuals.add(id);this.next+=60/bpm;this.beat++;}}
}

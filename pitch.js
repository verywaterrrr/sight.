// YIN difference function. Unknown or weak input is deliberately not judged.
export function detectPitch(samples,sampleRate){
 let power=0;for(const n of samples)power+=n*n;const rms=Math.sqrt(power/samples.length);if(rms<.008)return null;
 const min=Math.max(2,Math.floor(sampleRate/1100)),max=Math.min(Math.floor(samples.length/2)-1,Math.ceil(sampleRate/60)),half=Math.floor(samples.length/2);
 const diff=new Float64Array(max+1);let sum=0;
 for(let tau=1;tau<=max;tau++){let d=0;for(let i=0;i<half;i++){const a=samples[i]-samples[i+tau];d+=a*a;}sum+=d;diff[tau]=sum?d*tau/sum:1;}
 let found=-1;for(let tau=min;tau<max;tau++){if(diff[tau]<.12){while(tau+1<=max&&diff[tau+1]<diff[tau])tau++;found=tau;break;}}
 if(found<0)return null;const left=diff[found-1],center=diff[found],right=diff[found+1];const adjustment=(left-right)/(2*(left-2*center+right)||1);const frequency=sampleRate/(found+adjustment);return {frequency,clarity:1-center,rms,midi:69+12*Math.log2(frequency/440)};
}
export function pitchVerdict(detected,target,{audibleMidi=[]}={}){if(!detected||target==null||detected.clarity<.90)return {kind:'neutral',direction:null,cents:null};const heardMidi=69+12*Math.log2(detected.frequency/440);if(audibleMidi.some(midi=>[0,12,19.01955,24,27.86314].some(harmonic=>Math.abs((heardMidi-midi-harmonic)*100)<=40)))return {kind:'neutral',reason:'speaker',direction:null,cents:null};const cents=1200*Math.log2(detected.frequency/(440*2**((target-69)/12)));return {kind:Math.abs(cents)<=25?'good':Math.abs(cents)<=50?'warn':'bad',direction:Math.abs(cents)<=12?null:cents>0?'lower':'higher',cents};}
export class VoiceTracker{
 constructor(context,onFrame){this.ctx=context;this.onFrame=onFrame;this.generation=0;this.running=false;this.history=[];}
 async start(){this.stop();const generation=this.generation;if(!navigator.mediaDevices?.getUserMedia)throw new Error('Microphone access needs HTTPS or localhost.');const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:false,autoGainControl:false},video:false});if(generation!==this.generation){stream.getTracks().forEach(t=>t.stop());return;}
  this.stream=stream;this.source=this.ctx.createMediaStreamSource(stream);this.analyser=this.ctx.createAnalyser();this.analyser.fftSize=4096;this.source.connect(this.analyser);this.buffer=new Float32Array(4096);await this.ctx.resume();if(generation!==this.generation)return;this.running=true;this.loop();
 }
 loop(){if(!this.running)return;this.analyser.getFloatTimeDomainData(this.buffer);let result=detectPitch(this.buffer,this.ctx.sampleRate);if(result){this.history.push(result.frequency);if(this.history.length>5)this.history.shift();if(this.history.length>=3){const values=[...this.history].sort((a,b)=>a-b),median=values[Math.floor(values.length/2)];if(Math.abs(1200*Math.log2(result.frequency/median))>90)result=null;}}else this.history=[];if(result)result.frameTime=this.ctx.currentTime-this.buffer.length/(2*this.ctx.sampleRate);this.onFrame(result);this.timer=setTimeout(()=>this.loop(),50);}
 stop(){this.generation++;this.running=false;clearTimeout(this.timer);this.stream?.getTracks().forEach(t=>t.stop());this.source?.disconnect();this.stream=null;this.history=[];}
}

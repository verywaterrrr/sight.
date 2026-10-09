import test from 'node:test';import assert from 'node:assert/strict';import * as instruments from '../instruments.js';
test('piano and SATB resolve to sampled piano, female and male voices',()=>{assert.equal(typeof instruments.voiceProfile,'function');assert.equal(instruments.voiceProfile({name:'Piano'}),'piano');assert.equal(instruments.voiceProfile({name:'Soprano'}),'female');assert.equal(instruments.voiceProfile({name:'Alto'}),'female');assert.equal(instruments.voiceProfile({name:'Tenor'}),'male');assert.equal(instruments.voiceProfile({name:'Voice',suggestedName:'Bass'}),'male');});
test('a delayed previous score cannot overwrite the latest voice profile',async t=>{
 let release;const held=new Promise(resolve=>release=resolve);
 t.mock.method(globalThis,'fetch',async url=>{if(String(url).endsWith('manifest.json'))return {ok:true,json:async()=>({female:[{file:'female.wav',midi:72}],male:[{file:'male.wav',midi:48}]})};if(String(url).endsWith('female.wav'))await held;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};});
 const bank=new instruments.InstrumentBank({decodeAudioData:async()=>({duration:1})});const older=bank.prepare({parts:[{id:'p',name:'Soprano'}],events:[]});await new Promise(resolve=>setImmediate(resolve));await bank.prepare({parts:[{id:'p',name:'Bass'}],events:[]});release();await older;assert.equal(bank.profiles.get('p'),'male');
});

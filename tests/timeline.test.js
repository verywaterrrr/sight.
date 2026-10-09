import {test} from 'node:test';import assert from 'node:assert/strict';
import {countInPlan,playbackEvents,expectedNoteAt} from '../timeline.js';
const score={measures:[{number:1,start:0,duration:4,timeSig:{num:4,den:4}},{number:2,start:4,duration:3,timeSig:{num:3,den:4}}],events:[{id:'a',part:'s',time:0,duration:1,midi:60},{id:'b',part:'s',time:1.5,duration:.25,midi:62},{id:'c',part:'s',time:4,duration:3,midi:64}]};
test('count in uses a whole bar at its start, elapsed beats mid-bar, and fractional timing',()=>{
 assert.deepEqual(countInPlan(score,0).clicks.map(c=>c.time),[0,1,2,3]);assert.equal(countInPlan(score,0).duration,4);
 assert.deepEqual(countInPlan(score,2).clicks.map(c=>c.time),[0,1]);assert.equal(countInPlan(score,1.5).duration,1.5);
 assert.equal(countInPlan(score,4).duration,3);
});
test('scheduling preserves sixteenths and excludes a loop end boundary',()=>{
 const plan=playbackEvents(score,1.5,4);assert.equal(plan.find(e=>e.kind==='note').time,1.5);assert.ok(!plan.some(e=>e.note?.id==='c'));assert.ok(plan.some(e=>e.kind==='beat'&&e.time===2));
});
test('tied continuation sustains but has no rhythm attack',()=>{
 const tied={...score,events:[{id:'x',part:'s',time:0,duration:1,midi:60,tieStart:true},{id:'y',part:'s',time:1,duration:1,midi:60,tieStop:true}]};
 const plan=playbackEvents(tied,0,2).filter(e=>e.kind==='note');assert.equal(plan.length,1);assert.equal(plan[0].duration,2);
 const seek=playbackEvents(tied,1,2).find(e=>e.kind==='note');assert.equal(seek.duration,1);assert.equal(seek.attack,false);
});
test('voice monitor expects a sounding target note only',()=>{
 assert.equal(expectedNoteAt(score,1.3,'s'),null);assert.equal(expectedNoteAt(score,1.6,'s').midi,62);assert.equal(expectedNoteAt(score,1.6,'other'),null);
});
test('ties cannot attach to a different simultaneous voice with the same pitch',()=>{const source={...score,events:[{id:'lead',part:'p',voice:'1',time:0,duration:2,midi:60,tieStart:true},{id:'other',part:'p',voice:'2',time:1,duration:1,midi:60,tieStart:true},{id:'continuation',part:'p',voice:'1',time:2,duration:1,midi:60,tieStop:true}]};const events=playbackEvents(source,0,3).filter(e=>e.kind==='note');assert.equal(events.find(e=>e.note.id==='lead').duration,3);assert.equal(events.find(e=>e.note.id==='other').duration,1);});

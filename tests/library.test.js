import test from 'node:test';
import assert from 'node:assert/strict';
import * as storage from '../storage.js';
test('an uploaded PDF is a reopenable score before recognition succeeds',()=>{
 assert.equal(typeof storage.uploadedScoreRecord,'function');const bytes=new ArrayBuffer(8),record=storage.uploadedScoreRecord({id:'pdf1',bytes,filename:'My choir.pdf',pages:[0,2]});
 assert.equal(record.title,'My choir');assert.equal(record.bytes,bytes);assert.deepEqual(record.pages,[0,2]);assert.deepEqual(record.score.events,[]);assert.deepEqual(record.score.parts,[]);
});
test('reuploading the same PDF preserves corrections and part levels',()=>{
 const saved={id:'pdf1',title:'Choir',partVolumes:{S:0},selected:['S'],score:{parts:[{id:'S'}],events:[{id:'n',part:'S',midi:61,reviewed:true,page:1,measure:2,beat:0,time:4,duration:1}],measures:[{number:1,page:0,start:0,duration:4},{number:2,page:1,start:4,duration:4}],warnings:[],staves:{},duration:8}};
 const record=storage.uploadedScoreRecord({id:'pdf1',bytes:new ArrayBuffer(8),filename:'same.pdf',pages:[1]},saved);assert.equal(record.score.events[0].midi,61);assert.equal(record.score.events[0].time,0);assert.equal(record.partVolumes.S,0);assert.equal(record.title,'Choir');assert.deepEqual(saved.score.events[0].time,4);
});

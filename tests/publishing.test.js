import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,readdir,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {scoreForPages} from '../public-score.js';
import {buildPages,PUBLIC_FILES} from '../scripts/build-pages.mjs';
test('selected demo pages contain only their music and a continuous playback timeline',()=>{
 const source={parts:[{id:'S'}],duration:12,warnings:[],staves:{0:[{}],1:[{}],2:[{}]},measures:[0,1,2].map((p)=>({number:p+1,page:p,start:p*4,duration:4,timeSig:{num:4,den:4}})),events:[0,1,2].map(p=>({id:`n${p}`,page:p,measure:p+1,time:p*4+1,beat:1,duration:1,part:'S'}))};
 const result=scoreForPages(source,[0,2]);assert.deepEqual(result.events.map(n=>n.id),['n0','n2']);assert.deepEqual(result.events.map(n=>[n.measure,n.time]),[[1,1],[2,5]]);assert.equal(result.duration,8);assert.deepEqual(Object.keys(result.staves),['0','2']);assert.equal(source.duration,12);assert.equal(source.events[2].time,9);
});
test('public build copies an explicit allowlist and cannot carry private uploads or certificates',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'sight-publish-'));try{
 for(const name of PUBLIC_FILES){await mkdir(path.dirname(path.join(root,name)),{recursive:true});await writeFile(path.join(root,name),'public');}
 for(const name of ['assets/united-in-purpose.pdf','assets/sight-local-ca.cer','.runtime/tls/ca.key','assets/unlisted.pdf','screenshots/score.png','server/service.py']){await mkdir(path.dirname(path.join(root,name)),{recursive:true});await writeFile(path.join(root,name),'private');}
 await buildPages(root,path.join(root,'dist'));const assets=await readdir(path.join(root,'dist/assets'));assert.ok(!assets.includes('united-in-purpose.pdf'));assert.ok(!assets.includes('sight-local-ca.cer'));assert.ok(!assets.includes('unlisted.pdf'));assert.equal(await readFile(path.join(root,'dist/app.js'),'utf8'),'public');assert.deepEqual((await readdir(path.join(root,'dist'))).filter(x=>['.runtime','server','screenshots'].includes(x)),[]);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('reincluding demo pages preserves edited notes and avoids nesting saved source data',()=>{
 const source={parts:[{id:'S',name:'Soprano'}],duration:8,warnings:[],staves:{0:[],1:[]},measures:[0,1].map(p=>({number:p+1,page:p,start:p*4,duration:4,timeSig:{num:4,den:4}})),events:[0,1].map(p=>({id:`n${p}`,page:p,measure:p+1,time:p*4,beat:0,duration:1,midi:60,part:'S'}))};
 const chosen=scoreForPages(source,[1]);chosen.events[0].midi=64;chosen.events[0].reviewed=true;const result=scoreForPages(chosen,[0,1]);assert.deepEqual(result.events.map(n=>n.midi),[60,64]);assert.equal(result.events[1].time,4);assert.equal(result.pageSource.pageSource,undefined);
});
test('page filtering remaps complete repeats and drops incomplete passages',()=>{
 const source={parts:[],duration:16,warnings:[],events:[],staves:{},measures:[0,1,2,3].map(page=>({number:page+1,page,start:page*4,duration:4})),repeats:[{id:'r',startMeasure:3,endMeasure:4,times:2}],repeatMarks:[{repeatId:'r',page:3}],endings:[{repeatId:'r',startMeasure:4,endMeasure:4,numbers:[1]}]};
 const full=scoreForPages(source,[2,3]);assert.deepEqual(full.repeats,[{id:'r',startMeasure:1,endMeasure:2,times:2}]);assert.equal(full.endings[0].startMeasure,2);assert.equal(full.repeatMarks.length,1);const partial=scoreForPages(source,[3]);assert.deepEqual(partial.repeats,[]);assert.deepEqual(partial.repeatMarks,[]);assert.deepEqual(partial.endings,[]);
});

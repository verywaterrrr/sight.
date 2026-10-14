import test from 'node:test';import assert from 'node:assert/strict';import * as client from '../recognition-client.js';
test('progress uses server measurements and leaves unknown stages indeterminate',()=>{
 assert.equal(typeof client.recognitionProgressView,'function');assert.deepEqual(client.recognitionProgressView({status:'queued'}),{value:null,label:'Waiting',detail:''});assert.equal(client.recognitionProgressView({status:'running'}).value,null);
 assert.deepEqual(client.recognitionProgressView({status:'running',percent:52,sourcePage:12,pageIndex:2,pageCount:3}),{value:52,label:'52%',detail:'Page 12 · 2 of 3 selected pages'});assert.equal(client.recognitionProgressView({status:'done',percent:95}).value,100);assert.equal(client.recognitionProgressView({status:'running',percent:1000}).value,99);
});

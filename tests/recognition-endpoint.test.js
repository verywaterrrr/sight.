import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recognitionUrl} from '../recognition-client.js';
test('recognition uses the local API by default and a configured HTTPS Railway origin from Pages',()=>{
 assert.equal(recognitionUrl('/api/jobs?pages=0'),'/api/jobs?pages=0');assert.equal(recognitionUrl('/api/jobs/abc','https://sight.example.up.railway.app/'),'https://sight.example.up.railway.app/api/jobs/abc');
 assert.throws(()=>recognitionUrl('/api/jobs','http://remote.example'),/HTTPS/);
});

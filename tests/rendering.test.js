import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rasterDimensions} from '../renderer.js';
test('Retina pages render at least 3x instead of the previous 1.6x ceiling',()=>{
 const r=rasterDimensions(500,707,2);
 assert.equal(r.width,1500);assert.equal(r.height,2121);
});
test('large zoom bounds pixel memory without changing the displayed aspect ratio',()=>{
 const r=rasterDimensions(2400,3394,3);
 assert.ok(r.width*r.height<=16_000_000);assert.ok(Math.abs(r.width/r.height-2400/3394)<.001);
});

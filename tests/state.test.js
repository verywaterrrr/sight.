import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageWindow, changePart, enterRhythm, leaveRhythm } from '../state.js';

test('landscape moves one page per action and clamps at the last spread', () => {
  assert.deepEqual(pageWindow(0, 15, true), [0, 1]);
  assert.deepEqual(pageWindow(1, 15, true), [1, 2]);
  assert.deepEqual(pageWindow(14, 15, true), [13, 14]);
  assert.deepEqual(pageWindow(-1, 15, true), [0, 1]);
  assert.deepEqual(pageWindow(0, 1, true), [0]);
});
test('portrait preserves its anchor and displays one page', () => {
  assert.deepEqual(pageWindow(4, 15, false), [4]);
});
test('rhythm starts empty, replaces its selection, and restores normal parts', () => {
  const state = { mode: 'notes', selected: new Set(['soprano', 'bass']) };
  enterRhythm(state);
  assert.equal(state.selected.size, 0);
  changePart(state, 'alto', true);
  changePart(state, 'tenor', true);
  assert.deepEqual([...state.selected], ['tenor']);
  leaveRhythm(state);
  assert.deepEqual([...state.selected], ['soprano', 'bass']);
});
test('saved part levels keep zero, default missing parts, and reject invalid values',async()=>{
 const {normalisePartVolumes}=await import('../state.js');assert.equal(typeof normalisePartVolumes,'function');
 const parts=['S','A','T','B','P','X'].map(id=>({id}));const saved={S:0,A:.4,T:NaN,B:-.2,P:2,X:'0.5',old:.2};
 assert.deepEqual(normalisePartVolumes(parts,saved),{S:0,A:.4,T:1,B:0,P:1,X:1});assert.deepEqual(normalisePartVolumes([{id:'new'}],null),{new:1});assert.equal(saved.B,-.2);
});

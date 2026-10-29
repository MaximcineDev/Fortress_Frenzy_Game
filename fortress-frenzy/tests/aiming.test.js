import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clampElevation,shotAngle,elevationFromPoint} from '../src/aiming.js';
test('aiming limits prevent backwards shots and invalid angle values',()=>{
 assert.equal(clampElevation(100),75);assert.equal(clampElevation(-30),-15);assert.equal(clampElevation(NaN),8);
 assert.equal(elevationFromPoint({x:90,y:268},{x:20,y:140},1),null);
});
test('aim angle and pointer aiming mirror correctly for both online player sides',()=>{
 const left=shotAngle(12,1),right=shotAngle(12,-1);
 assert.ok(Math.cos(left)>0&&Math.cos(right)<0);assert.ok(Math.sin(left)<0&&Math.sin(right)<0);
 assert.ok(Math.abs(Math.sin(left)-Math.sin(right))<1e-10);
 const a=elevationFromPoint({x:90,y:268},{x:690,y:168},1);
 const b=elevationFromPoint({x:810,y:268},{x:210,y:168},-1);
 assert.ok(Math.abs(a-b)<1e-10);assert.ok(Math.abs(shotAngle(a,1)-Math.atan2(-100,600))<1e-10);
});

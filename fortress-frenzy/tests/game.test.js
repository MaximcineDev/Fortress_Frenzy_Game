import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalMatch, pickBotShot } from '../src/localEngine.js';
import { resolveShot } from '../src/shared/resolveShot.js';
import { buildCastle } from '../src/shared/gameState.js';
import { getUnit } from '../src/units.js';
import { simulateShot } from '../src/shared/trajectory.js';
import { Storage } from '../src/storage.js';

test('healing repairs friendly core and blocks without healing enemy', () => {
 const castles = { me: buildCastle('me',0), enemy: buildCastle('enemy',1) };
 castles.me.core.hp=50; castles.me.blocks[0].hp=10; castles.enemy.core.hp=40;
 const result = resolveShot(castles,'me','enemy',getUnit('fairy'),0);
 assert.equal(castles.me.core.hp,70); assert.equal(castles.me.blocks[0].hp,30); assert.equal(castles.enemy.core.hp,40); assert.equal(result.updates.length,2);
});
test('archer pierces distinct blocks and reports both hits', () => {
 const blocks=[100,124].map((x,i)=>({id:String(i),x,y:100,halfSize:11,alive:true}));
 const result=simulateShot(getUnit('archer'),0,100,0,blocks,{alive:false});
 assert.deepEqual(result.hitBlockIds,['0','1']);
});
test('burst, cooldown and invalid inputs are enforced', () => {
 const match=createLocalMatch();assert.equal(match.fire('me','crow',0).length,2);
 assert.equal(match.fire('me','crow',0),null);assert.equal(match.fire('me','wrecker',NaN),null);
});
test('storage retains progress when localStorage is unavailable', () => {
 Storage.reset();Storage.addCoins(40);assert.equal(Storage.get().coins,190);
 Storage.upgradeUnit('wrecker');assert.equal(Storage.unitLevel('wrecker'),1);
});
test('bot can find damaging trajectories and matches reach a winner', () => {
 const match=createLocalMatch();let now=10000;const real=Date.now;Date.now=()=>now;
 try { for(let i=0;i<150 && !match.isOver();i++) { now+=4000; const shot=pickBotShot(match);match.fire('enemy',shot.unitId,shot.angle); } assert.equal(match.isOver(),true); } finally { Date.now=real; }
});

test('early offline castle survives four direct Wrecker hits and falls on the fifth', async () => {
 const {getMission}=await import('../src/campaign.js');
 Storage.reset();
 for(const mission of [null,getMission(1)]) {
  const match=createLocalMatch(mission),own=match.castles.me.core,enemy=match.castles.enemy;
  let angle;
  for(let d=-40;d<=15;d+=0.1)if(simulateShot(getUnit('wrecker'),own.x,own.y-30,d*Math.PI/180,enemy.blocks,enemy.core).hitCore){angle=d*Math.PI/180;break;}
  assert.ok(Number.isFinite(angle));
  const real=Date.now;let now=10000;Date.now=()=>now;
  try {
   for(let i=1;i<=5;i++){now+=2000;match.fire('me','wrecker',angle);assert.equal(match.isOver(),i===5);assert.equal(enemy.core.hp,225-i*45);}
  } finally {Date.now=real;}
 }
 const tenth=createLocalMatch(getMission(10)),last=createLocalMatch(getMission(30));
 assert.equal(tenth.castles.enemy.core.maxHp,276);
 assert.equal(last.castles.enemy.core.maxHp,388);
});

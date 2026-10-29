import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getMission, MISSION_COUNT, campaignProgress, missionOutcome, completeMission, canPlayMission, unlockMission } from '../src/campaign.js';
import { Storage } from '../src/storage.js';
import { createLocalMatch, pickBotShot } from '../src/localEngine.js';
import { simulateShot } from '../src/shared/trajectory.js';
import { getUnit } from '../src/units.js';

test('new campaign has five free missions and 25 genuinely locked coin missions',()=>{
 Storage.reset();assert.equal(MISSION_COUNT,30);
 for(let id=1;id<=30;id++){assert.equal(canPlayMission(id),id<=5);assert.equal(getMission(id).unlockCost,id<=5?0:300+(id-6)*25);}
 assert.equal(completeMission(6,3),null);
});
test('unlock charges once, grants permanent access and never charges replay',()=>{
 Storage.reset();Storage.set({coins:400});const first=unlockMission(6);assert.equal(first.cost,300);assert.equal(Storage.get().coins,100);
 assert.equal(canPlayMission(6),true);assert.deepEqual(campaignProgress().purchased,[6]);
 const again=unlockMission(6);assert.equal(again.alreadyOwned,true);assert.equal(Storage.get().coins,100);
 assert.equal(completeMission(6,3).reward,100);assert.equal(completeMission(6,1).reward,20);assert.equal(campaignProgress().stars[6],3);
 assert.equal(Storage.get().coins,220);
});
test('insufficient coins and invalid IDs cannot change access or balance',()=>{
 Storage.reset();Storage.set({coins:30});assert.equal(unlockMission(6).reason,'insufficient');assert.equal(unlockMission(30).missing,870);
 for(const id of [-1,0,31,1.5,NaN,'6'])assert.equal(unlockMission(id).ok,false);
 assert.equal(Storage.get().coins,30);assert.deepEqual(campaignProgress().purchased,[]);
});
test('winning free missions does not bypass paid locks; free replay can earn coins',()=>{
 Storage.reset();Storage.set({coins:0});for(let id=1;id<=5;id++)assert.ok(completeMission(id,3));
 assert.equal(Storage.get().coins,350);assert.equal(canPlayMission(6),false);
 completeMission(5,2);assert.equal(Storage.get().coins,370);assert.equal(canPlayMission(6),false);
});
test('legacy 12-mission saves preserve access, best stars, coins and upgrades',()=>{
 Storage.reset();Storage.set({coins:777,unitLevels:{wrecker:2},campaign:{unlocked:12,stars:{1:3,6:2}}});
 for(let id=1;id<=12;id++)assert.equal(canPlayMission(id),true);
 assert.equal(canPlayMission(13),false);assert.equal(campaignProgress().stars[6],2);assert.equal(Storage.get().coins,777);
 unlockMission(13);assert.equal(Storage.get().campaign.schema,2);assert.equal(Storage.unitLevel('wrecker'),2);
 assert.equal(canPlayMission(12),true);assert.equal(canPlayMission(13),true);
});
test('health and timed objectives remain enforced',()=>{
 for(let id=1;id<=30;id++){
  const m=getMission(id);if(m.type==='guard'){
   assert.equal(missionOutcome(m,{won:true,hp:m.minHealth*100-1,maxHp:100,elapsed:30}).success,false);
   assert.equal(missionOutcome(m,{won:true,hp:m.minHealth*100,maxHp:100,elapsed:30}).success,true);
  }
  if(m.timeLimit)assert.equal(missionOutcome(m,{won:true,hp:100,maxHp:100,elapsed:m.timeLimit+1}).success,false);
 }
});
test('all 30 missions have distinct scenery combinations and actual castle geometry',()=>{
 const worlds=new Set(),layouts=new Set();
 for(let id=1;id<=30;id++){
  const m=getMission(id);worlds.add(m.world.realm.id+':'+m.world.phase.name);
  const match=createLocalMatch(m),castle=match.castles.me;
  layouts.add(JSON.stringify(castle.blocks.map(b=>[b.x,b.y])));
  for(const b of [...castle.blocks,...match.castles.enemy.blocks])assert.ok(b.x>=6&&b.x<=894&&b.y<500);
  assert.equal(castle.core.maxHp,225);
  // Every castle has a usable ballistic route to its commander.
  const enemy=match.castles.enemy;let canHit=false;
  for(let degrees=-40;degrees<=15;degrees+=0.25){if(simulateShot(getUnit('wrecker'),castle.core.x,castle.core.y-30,degrees*Math.PI/180,enemy.blocks,enemy.core).hitCore){canHit=true;break;}}
  assert.ok(canHit,'Mission '+id+' commander is unreachable');
 }
 assert.equal(worlds.size,30);assert.equal(layouts.size,30);
});
test('difficulty increases gently without negative bot timers or aim values at mission 30',()=>{
 for(let id=2;id<=30;id++){
  const a=getMission(id-1),b=getMission(id);assert.ok(b.enemyHealth>a.enemyHealth&&b.enemyHealth-a.enemyHealth<0.05);
  assert.ok(b.enemyDamage>a.enemyDamage&&b.enemyDamage-a.enemyDamage<0.03);assert.ok(b.botDelay<a.botDelay&&b.botDelay>=1500);assert.ok(b.aimError<a.aimError&&b.aimError>0.03);
 }
 const easy=createLocalMatch(getMission(1)),hard=createLocalMatch(getMission(30));assert.equal(easy.castles.enemy.core.maxHp,225);assert.equal(hard.castles.enemy.core.maxHp,388);
 for(let i=0;i<10;i++)assert.ok(getMission(1).enemyUnits.includes(pickBotShot(easy,getMission(1)).unitId));
});
test('Quick Battle earnings fund higher unlock costs; final mission and reset preserve correct state',()=>{
 Storage.reset();for(let id=1;id<=30;id++){
  if(id>5){
   const cost=getMission(id).unlockCost;
   while(Storage.get().coins<cost)Storage.addCoins(40); // A Quick Battle victory.
   assert.ok(unlockMission(id).ok,'Cannot afford mission '+id);
  }
  const result=completeMission(id,3);assert.ok(result);assert.equal(result.finished,id===30);
 }
 assert.equal(Object.keys(campaignProgress().stars).length,30);assert.equal(campaignProgress().purchased.length,25);
 Storage.reset();assert.equal(canPlayMission(6),false);assert.deepEqual(campaignProgress().stars,{});
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdManager, AD_RULES } from '../src/adsCore.js';
import { Storage } from '../src/storage.js';
function harness(options={}){
 let time=1000000,pacing=options.pacing||{},balance=0,locks=0,shows=0,pending=[],outcome='rewarded';
 const events={},receipts=new Set();
 const bridge={
  async addListener(name,fn){events[name]=fn;return {remove(){}};},
  async initialize(){return {canRequestAds:options.consent!==false,privacyRequired:true,testMode:true};},
  async privacy(){return {canRequestAds:false,privacyRequired:true};},
  async prepare(){if(options.loadFailure)throw Error('No fill');},
  async pendingRewards(){return {rewards:[...pending]};},
  async acknowledgeReward({claimId}){pending=pending.filter(p=>p.claimId!==claimId);},
  async show({kind,claimId,amount}){
   shows++;if(options.showFailure)throw Error('Show failed');events.adShown({kind});
   if(kind==='rewarded'&&outcome==='rewarded'){pending.push({claimId,amount});events.rewardEarned();}
   return {rewarded:kind==='rewarded'&&outcome==='rewarded'};
  }
 };
 const manager=createAdManager({bridge,supported:options.supported!==false,readPacing:()=>pacing,writePacing:v=>{pacing=v;},now:()=>time,
  lock:()=>{locks++;return ()=>locks--;},creditReward:(id,amount)=>{if(receipts.has(id))return false;receipts.add(id);balance+=amount;return true;}});
 return {manager,bridge,events,advance:ms=>time+=ms,stats:()=>({pacing,balance,locks,shows,pending}),outcome:v=>outcome=v,queue:item=>pending.push(item)};
}
test('interstitials require four battles AND five minutes; shown ads reset pacing',async()=>{
 const h=harness(),a=h.manager;await a.init();await a.prepare('interstitial');
 for(let i=0;i<4;i++)a.recordBattle();assert.equal(a.eligible(),false);
 h.advance(AD_RULES.intervalMs);assert.equal(a.eligible(),true);assert.equal(await a.interstitial(),true);
 assert.equal(h.stats().shows,1);assert.equal(h.stats().locks,0);assert.equal(a.eligible(),false);
 for(let i=0;i<4;i++)a.recordBattle();h.advance(AD_RULES.intervalMs-1);assert.equal(a.eligible(),false);
 h.advance(1);assert.equal(a.eligible(),true);
});
test('rewarded ad adds the earned amount once and prevents a back-to-back interstitial',async()=>{
 const h=harness(),a=h.manager;await a.init();await a.prepare('rewarded');
 h.advance(AD_RULES.intervalMs);for(let i=0;i<4;i++)a.recordBattle();
 assert.equal((await a.reward('battle-a',50)).status,'rewarded');assert.equal(h.stats().balance,50);
 h.queue({claimId:'battle-a',amount:50});await a.recover();assert.equal(h.stats().balance,50);
 assert.equal(h.stats().pending.length,0);assert.equal(a.eligible(),false);assert.equal(h.stats().locks,0);
});
test('early close, no fill and failed show grant no reward and release the UI',async()=>{
 const h=harness();await h.manager.init();h.outcome('closed');
 assert.equal((await h.manager.reward('early',50)).status,'closed');assert.equal(h.stats().balance,0);assert.equal(h.stats().locks,0);
 for(const setting of ['loadFailure','showFailure']){
  const failed=harness({[setting]:true});await failed.manager.init();
  assert.equal((await failed.manager.reward('failed',50)).status,'unavailable');assert.equal(failed.stats().balance,0);assert.equal(failed.stats().locks,0);
 }
});
test('pending native reward is recovered at startup; consent denial prevents requests',async()=>{
 const h=harness({consent:false});h.queue({claimId:'interrupted',amount:100});await h.manager.init();
 assert.equal(h.stats().balance,100);assert.equal(h.manager.canReward(),false);
 assert.equal((await h.manager.reward('denied',50)).status,'unavailable');assert.equal(h.stats().shows,0);
});
test('browser stays ad-free and privacy withdrawal clears ad eligibility',async()=>{
 const web=harness({supported:false});await web.manager.init();assert.equal(web.stats().locks,0);assert.equal(await web.manager.interstitial(),false);
 const h=harness();await h.manager.init();assert.equal(h.manager.privacyRequired(),true);
 await h.manager.privacy();assert.equal(h.manager.canReward(),false);assert.equal(h.stats().locks,0);
});
test('ad gold and receipt persist together, reset cannot replay rewards, failed saves do not consume credit',()=>{
 const values=new Map();globalThis.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 Storage.reset();assert.equal(Storage.creditAdReward('native-reward-1',50),true);assert.equal(Storage.get().coins,200);
 assert.equal(Storage.creditAdReward('native-reward-1',50),false);Storage.reset();assert.equal(Storage.creditAdReward('native-reward-1',50),false);
 localStorage.setItem=()=>{throw Error('Storage full');};assert.throws(()=>Storage.creditAdReward('native-reward-2',100));assert.equal(Storage.get().coins,150);
 delete globalThis.localStorage;
});

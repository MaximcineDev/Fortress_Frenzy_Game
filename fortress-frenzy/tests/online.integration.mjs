import {test} from 'node:test';
import assert from 'node:assert/strict';
import {io} from 'socket.io-client';
import {createGameServer} from '../server/server.js';
import {UNITS,getUnit} from '../src/units.js';
import {simulateShot} from '../src/shared/trajectory.js';
const units=UNITS.map(u=>u.id);
const event=(s,name,ms=4000)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>{s.off(name,done);reject(Error('Timed out: '+name));},ms);const done=value=>{clearTimeout(timer);resolve(value);};s.once(name,done);});
const send=(s,name,data={})=>new Promise((resolve,reject)=>s.timeout(3000).emit(name,data,(error,result)=>error?reject(error):resolve(result)));
async function fixture(t,options={}){
 const game=createGameServer(options);await new Promise(r=>game.httpServer.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+game.httpServer.address().port,clients=[];
 t.after(async()=>{clients.forEach(s=>s.disconnect());await game.close();});
 const client=async extra=>{const s=io(url,{forceNew:true,reconnection:false,...extra});clients.push(s);await event(s,'connect');return s;};
 return {game,url,client};
}
async function pair(a,b){const found=Promise.all([event(a,'matchFound'),event(b,'matchFound')]);await send(a,'findMatch',{name:'Red Knight'});await send(b,'findMatch',{name:'Blue Knight'});return (await found)[0];}
async function ready(a,b,roomId){const starts=Promise.all([event(a,'matchStart'),event(b,'matchStart')]);await send(a,'draftReady',{roomId,units});await send(b,'draftReady',{roomId,units});return (await starts)[0].startState;}
function angleFor(state,from,to,unitId){
 const a=state.castles[from].core,d=state.castles[to],candidates=[];
 for(let degrees=-45;degrees<=15;degrees+=0.25){const angle=from===Object.keys(state.castles)[0]?degrees*Math.PI/180:Math.PI-degrees*Math.PI/180;const r=simulateShot(getUnit(unitId),a.x,a.y-30,angle,d.blocks,d.core);if(r.hitCore)candidates.push(angle);}
 assert.ok(candidates.length,'No core trajectory');return candidates[Math.floor(candidates.length/2)];
}
test('public queue handles multiple clients and cancelled searches',async t=>{
 const f=await fixture(t),a=await f.client(),b=await f.client(),c=await f.client(),d=await f.client(),e=await f.client();
 const first=await pair(a,b);assert.ok(first.roomId);assert.equal(first.opponentName,'Blue Knight');
 assert.equal((await send(c,'findMatch',{})).queued,true);await send(c,'cancelSearch');
 assert.equal((await send(d,'findMatch',{})).queued,true);
 const matches=Promise.all([event(d,'matchFound'),event(e,'matchFound')]);await send(e,'findMatch',{});const [room]=await matches;assert.notEqual(room.roomId,first.roomId);
 assert.equal((await send(c,'requestState')).ok,false);
});
test('private codes isolate rooms, reject full/unknown rooms and expire cleanly',async t=>{
 const f=await fixture(t,{privateWaitMs:100}),a=await f.client(),b=await f.client(),c=await f.client(),d=await f.client();
 const one=await send(a,'createRoom',{name:'Host A'}),two=await send(b,'createRoom',{name:'Host B'});
 assert.match(one.code,/^[A-Z2-9]{6}$/);assert.notEqual(one.code,two.code);
 const matched=event(a,'matchFound');assert.equal((await send(c,'joinRoom',{code:one.code.toLowerCase(),name:'Friend'})).ok,true);assert.equal((await matched).opponentName,'Friend');
 assert.equal((await send(d,'joinRoom',{code:one.code})).ok,false);assert.equal((await send(d,'joinRoom',{code:'XXXXXX'})).ok,false);
 await event(b,'roomExpired',2500);assert.equal((await send(d,'joinRoom',{code:two.code})).ok,false);
});
test('ready gate, membership, malformed inputs, authoritative damage and cooldowns',async t=>{
 const f=await fixture(t),a=await f.client(),b=await f.client(),outsider=await f.client();const {roomId}=await pair(a,b);
 assert.equal((await send(a,'playerShot',{roomId,unitId:'wrecker',angle:0})).ok,false);
 assert.equal((await send(a,'draftReady',{roomId,units:Array(8).fill('wrecker')})).ok,false);
 assert.equal((await send(outsider,'draftReady',{roomId,units})).ok,false);
 const state=await ready(a,b,roomId),angle=angleFor(state,a.id,b.id,'wrecker');
 assert.equal((await send(a,'playerShot',{roomId,unitId:'wrecker',angle:null})).ok,false);
 assert.equal((await send(outsider,'playerShot',{roomId,unitId:'wrecker',angle})).ok,false);
 const resolved=event(b,'shotResolved');assert.equal((await send(a,'playerShot',{roomId,unitId:'wrecker',angle,damage:99999})).ok,true);await resolved;
 const snap=await send(b,'requestState');assert.equal(snap.startState.castles[b.id].core.hp,55);
 const cooldown=await send(a,'playerShot',{roomId,unitId:'wrecker',angle});assert.equal(cooldown.code,'cooldown');assert.ok(cooldown.remainingMs>0);
 assert.equal((await send(a,'draftReady',{roomId,units})).ok,false);
 assert.equal((await send(b,'playerShot',{roomId,unitId:'fairy',angle:0})).ok,true);
 const healed=await send(b,'requestState');assert.equal(healed.startState.castles[b.id].core.hp,75);assert.equal(healed.startState.castles[a.id].core.hp,100);
});
test('both sides can hit; win result is shared and finished games reject further fire',async t=>{
 const f=await fixture(t),a=await f.client(),b=await f.client();const {roomId}=await pair(a,b),state=await ready(a,b,roomId);
 const rightAngle=angleFor(state,b.id,a.id,'scout');await send(b,'playerShot',{roomId,unitId:'scout',angle:rightAngle});
 assert.equal((await send(a,'requestState')).startState.castles[a.id].core.hp,88);
 const over=Promise.all([event(a,'matchOver'),event(b,'matchOver')]);
 for(const id of ['wrecker','archer','scout','crow'])await send(a,'playerShot',{roomId,unitId:id,angle:angleFor(state,a.id,b.id,id)});
 const [x,y]=await over;assert.equal(x.winnerId,a.id);assert.equal(y.winnerId,a.id);
 assert.equal((await send(a,'playerShot',{roomId,unitId:'fairy',angle:0})).ok,false);
});
test('temporary network loss pauses shots and restores the same room and health',async t=>{
 const f=await fixture(t,{graceMs:1800}),a=await f.client({reconnection:true,reconnectionDelay:350,reconnectionDelayMax:350,randomizationFactor:0}),b=await f.client();
 const id=a.id,{roomId}=await pair(a,b),state=await ready(a,b,roomId);
 await send(a,'playerShot',{roomId,unitId:'wrecker',angle:angleFor(state,a.id,b.id,'wrecker')});
 const lost=event(b,'opponentDisconnected'),back=event(a,'connect'),resumed=event(b,'matchResumed');a.io.engine.close();await lost;
 assert.equal((await send(b,'playerShot',{roomId,unitId:'scout',angle:0})).ok,false);
 await back;await resumed;assert.equal(a.id,id);assert.equal(a.recovered,true);
 const restored=await send(a,'requestState');assert.equal(restored.roomId,roomId);assert.equal(restored.paused,false);assert.equal(restored.startState.castles[b.id].core.hp,55);
});
test('unrecovered network loss awards the opponent a forfeit win',async t=>{
 const f=await fixture(t,{graceMs:180}),a=await f.client(),b=await f.client();const {roomId}=await pair(a,b);await ready(a,b,roomId);
 const over=event(b,'matchOver');a.io.engine.close();const result=await over;assert.equal(result.winnerId,b.id);assert.equal(result.reason,'disconnect');
});
test('health endpoint reports protocol and active connections',async t=>{
 const f=await fixture(t);await f.client();const data=await (await fetch(f.url+'/health')).json();assert.equal(data.status,'ready');assert.equal(data.protocol,1);assert.equal(data.onlinePlayers,1);
});

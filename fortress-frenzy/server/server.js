import express from 'express';
import { createServer } from 'node:http';
import { randomUUID, randomInt } from 'node:crypto';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { getUnit } from '../src/units.js';
import { buildCastle } from '../src/shared/gameState.js';
import { resolveShot } from '../src/shared/resolveShot.js';

export function createGameServer(options={}) {
 const graceMs=options.graceMs??15000,draftMs=options.draftMs??90000,privateWaitMs=options.privateWaitMs??600000;
 const app=express(),httpServer=createServer(app);
 const origin=process.env.ALLOWED_ORIGIN?process.env.ALLOWED_ORIGIN.split(',').map(s=>s.trim()):'*';
 const io=new Server(httpServer,{cors:{origin},maxHttpBufferSize:16384,connectionStateRecovery:{maxDisconnectionDuration:graceMs,skipMiddlewares:true}});
 const rooms=new Map(),codes=new Map(),queue=[],recoveryTimers=new Map();
 const cleanName=value=>typeof value==='string'?value.replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,18)||'Knight':'Knight';
 const ack=(fn,result)=>{if(typeof fn==='function')fn(result);};
 const fail=(fn,message,code='invalid')=>ack(fn,{ok:false,message,code});
 function removeQueued(id){for(let i=queue.length-1;i>=0;i--)if(queue[i]===id)queue.splice(i,1);}
 function currentRoom(socket){return rooms.get(socket.data.roomId);}
 function forget(room){
  if(!rooms.has(room.id))return;
  rooms.delete(room.id);if(room.code)codes.delete(room.code);
  for(const id of room.players){
   clearTimeout(recoveryTimers.get(id));recoveryTimers.delete(id);
   const s=io.sockets.sockets.get(id);s?.leave(room.id);if(s?.data.roomId===room.id)delete s.data.roomId;
  }
 }
 function state(room,id){
  const enemy=room.players.find(p=>p!==id),remaining={};
  for(const unitId of room.drafts[id]||[]){const unit=getUnit(unitId);remaining[unitId]=Math.max(0,unit.cooldownMs-(Date.now()-(room.last[id]?.[unitId]??0)));}
  return {roomId:room.id,code:room.code||'',phase:room.phase,paused:room.disconnected.size>0,playerIndex:room.players.indexOf(id),opponentName:room.names[enemy]||'Waiting for a friend',myReady:!!room.drafts[id],opponentReady:!!room.drafts[enemy],winnerId:room.winnerId??null,
   startState:room.started?{myUnits:room.drafts[id],mySide:room.players.indexOf(id),castles:room.castles,names:room.names,opponentName:room.names[enemy],cooldowns:remaining}:null};
 }
 function broadcastState(room,event='roomState'){for(const id of room.players)io.to(id).emit(event,state(room,id));}
 function finish(room,winnerId,reason){
  if(room.phase==='finished')return;
  room.phase='finished';room.winnerId=winnerId;room.cleanupAt=Date.now()+60000;
  for(const id of room.players){clearTimeout(recoveryTimers.get(id));recoveryTimers.delete(id);}
  io.to(room.id).emit('matchOver',{winnerId,reason});
 }
 function expire(room,message){io.to(room.id).emit('roomExpired',{message});forget(room);}
 function leave(socket,reason='opponent-left'){
  removeQueued(socket.id);const room=currentRoom(socket);if(!room)return;
  const other=room.players.find(id=>id!==socket.id);
  if(room.phase==='playing'){finish(room,other,reason);if(other)io.to(other).emit('opponentLeft',{reason});}
  else if(room.phase!=='finished'){expire(room,'The other player left the room. Create or find another match.');return;}
  socket.leave(room.id);delete socket.data.roomId;
  if(!room.players.some(id=>io.sockets.sockets.get(id)?.data.roomId===room.id))forget(room);
 }
 function newRoom(player,code=''){
  const room={id:randomUUID(),code,players:[player.id],names:{[player.id]:player.data.name},drafts:{},castles:{},last:{},disconnected:new Set(),phase:code?'waiting':'draft',started:false,expiresAt:Date.now()+(code?privateWaitMs:draftMs),lastActivity:Date.now()};
  rooms.set(room.id,room);if(code)codes.set(code,room.id);player.join(room.id);player.data.roomId=room.id;return room;
 }
 function addOpponent(room,socket){
  removeQueued(socket.id);room.players.push(socket.id);room.names[socket.id]=socket.data.name;room.phase='draft';room.expiresAt=Date.now()+draftMs;socket.join(room.id);socket.data.roomId=room.id;
  for(const id of room.players)io.to(id).emit('matchFound',state(room,id));
 }
 function startIfReady(room){
  if(room.started||room.disconnected.size||room.players.length!==2||!room.players.every(id=>room.drafts[id]))return;
  room.phase='playing';room.started=true;room.lastActivity=Date.now();
  room.players.forEach((id,side)=>{room.castles[id]=buildCastle(id,side);room.last[id]={};});
  for(const id of room.players)io.to(id).emit('matchStart',{startState:state(room,id).startState});
 }
 const staticDir=resolve(dirname(fileURLToPath(import.meta.url)),'../dist');
 app.get('/health',(_req,res)=>res.json({game:'Fortress Frenzy',status:'ready',protocol:1,onlinePlayers:io.engine.clientsCount}));
 if(existsSync(resolve(staticDir,'index.html')))app.use(express.static(staticDir));
 else app.get('/',(_req,res)=>res.json({game:'Fortress Frenzy',status:'ready'}));
 io.on('connection',socket=>{
  socket.data.name=socket.data.name||'Knight';
  socket.emit('serverWelcome',{protocol:1,graceMs,onlinePlayers:io.engine.clientsCount});
  const previous=currentRoom(socket);
  if(socket.recovered&&previous){
   clearTimeout(recoveryTimers.get(socket.id));recoveryTimers.delete(socket.id);previous.disconnected.delete(socket.id);
   socket.join(previous.id);
   if(previous.disconnected.size===0){broadcastState(previous,'matchResumed');startIfReady(previous);}else socket.emit('roomState',state(previous,socket.id));
  }else if(socket.data.roomId){delete socket.data.roomId;socket.emit('roomExpired',{message:'That match is no longer available. Please find another opponent.'});}
  let windowStart=Date.now(),requests=0;
  const allowed=()=>{if(Date.now()-windowStart>=1000){windowStart=Date.now();requests=0;}return ++requests<=80;};
  socket.on('setProfile',(data={},fn)=>{socket.data.name=cleanName(data?.name);ack(fn,{ok:true,name:socket.data.name});});
  socket.on('findMatch',(data={},fn)=>{
   if(!allowed())return fail(fn,'Please wait a moment.','rate-limit');
   if(currentRoom(socket))return fail(fn,'Leave your current room first.');
   socket.data.name=cleanName(data?.name||socket.data.name);
   if(queue.includes(socket.id)){ack(fn,{ok:true,queued:true});return;}
   let opponent;while(queue.length&&!opponent){const s=io.sockets.sockets.get(queue.shift());if(s?.connected&&!currentRoom(s)&&s.id!==socket.id)opponent=s;}
   if(opponent){const room=newRoom(opponent);addOpponent(room,socket);ack(fn,{ok:true,queued:false});}
   else{queue.push(socket.id);socket.emit('queueStatus',{searching:true});ack(fn,{ok:true,queued:true});}
  });
  socket.on('cancelSearch',(_data,fn)=>{removeQueued(socket.id);socket.emit('queueStatus',{searching:false});ack(fn,{ok:true});});
  socket.on('createRoom',(data={},fn)=>{
   if(!allowed())return fail(fn,'Please wait a moment.','rate-limit');
   if(currentRoom(socket))return fail(fn,'Leave your current room first.');
   removeQueued(socket.id);socket.data.name=cleanName(data?.name||socket.data.name);
   const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let code;
   do{code=Array.from({length:6},()=>alphabet[randomInt(alphabet.length)]).join('');}while(codes.has(code));
   const room=newRoom(socket,code);ack(fn,{ok:true,...state(room,socket.id)});socket.emit('roomState',state(room,socket.id));
  });
  socket.on('joinRoom',(data={},fn)=>{
   if(!allowed())return fail(fn,'Please wait a moment.','rate-limit');
   if(currentRoom(socket))return fail(fn,'Leave your current room first.');
   const code=typeof data?.code==='string'?data.code.trim().toUpperCase():'';
   if(!/^[A-Z2-9]{6}$/.test(code))return fail(fn,'Enter the six-character room code.');
   const room=rooms.get(codes.get(code));if(!room||room.phase!=='waiting'||room.players.length!==1||room.disconnected.size)return fail(fn,'Room not found, full or not ready. Ask your friend for a new code.','room-unavailable');
   socket.data.name=cleanName(data?.name||socket.data.name);addOpponent(room,socket);ack(fn,{ok:true});
  });
  socket.on('draftReady',(data={},fn)=>{
   if(!allowed())return fail(fn,'Please wait a moment.','rate-limit');
   const room=currentRoom(socket),{roomId,units}=data||{};
   if(!room||room.id!==roomId||room.phase!=='draft'||!room.players.includes(socket.id))return fail(fn,'This room is no longer drafting.');
   if(!Array.isArray(units)||units.length!==8||new Set(units).size!==8||!units.every(id=>typeof id==='string'&&getUnit(id)))return fail(fn,'Select all eight valid units.');
   room.drafts[socket.id]=[...units];ack(fn,{ok:true});broadcastState(room,'draftStatus');startIfReady(room);
  });
  socket.on('playerShot',(data={},fn)=>{
   if(!allowed())return fail(fn,'Too many requests.','rate-limit');
   const room=currentRoom(socket),{roomId,unitId,angle}=data||{},unit=getUnit(unitId);
   if(!room||room.id!==roomId||room.phase!=='playing'||room.disconnected.size||!room.players.includes(socket.id))return fail(fn,'Match is paused or unavailable.','unavailable');
   if(!unit||!room.drafts[socket.id]?.includes(unitId)||!Number.isFinite(angle)||Math.abs(angle)>Math.PI*2)return fail(fn,'Invalid shot.');
   const now=Date.now(),remaining=unit.cooldownMs-(now-(room.last[socket.id][unitId]??0));
   if(remaining>0){ack(fn,{ok:false,code:'cooldown',remainingMs:remaining});return;}
   room.last[socket.id][unitId]=now;room.lastActivity=now;
   const enemy=room.players.find(id=>id!==socket.id);
   for(let i=0;i<(unit.burstCount||1);i++){
    const fire=()=>{
     if(!rooms.has(room.id)||room.phase!=='playing'||room.disconnected.size)return;
     const result=resolveShot(room.castles,socket.id,enemy,unit,angle);
     io.to(room.id).emit('shotResolved',{shooterId:socket.id,unitId,...result});
     if(!room.castles[enemy].core.alive)finish(room,socket.id,'core-destroyed');
    };
    if(i){const timer=setTimeout(fire,i*(unit.burstDelayMs||150));timer.unref();}else fire();
   }
   ack(fn,{ok:true});
  });
  socket.on('requestState',(_data,fn)=>{const room=currentRoom(socket);if(room){ack(fn,{ok:true,...state(room,socket.id)});}else fail(fn,'Match no longer available.','room-unavailable');});
  socket.on('leaveRoom',(_data,fn)=>{leave(socket);ack(fn,{ok:true});});
  socket.on('disconnect',reason=>{
   removeQueued(socket.id);const room=currentRoom(socket);if(!room)return;
   if(room.phase==='finished')return;
   if(reason==='client namespace disconnect'||reason==='server namespace disconnect'){leave(socket);return;}
   room.disconnected.add(socket.id);
   io.to(room.id).emit('opponentDisconnected',{playerId:socket.id,graceMs});
   clearTimeout(recoveryTimers.get(socket.id));
   const timer=setTimeout(()=>{
    recoveryTimers.delete(socket.id);if(!rooms.has(room.id)||!room.disconnected.has(socket.id))return;
    const other=room.players.find(id=>id!==socket.id);
    if(room.phase==='playing'&&other&&!room.disconnected.has(other))finish(room,other,'disconnect');
    else expire(room,'Connection recovery timed out. Find or create another match.');
   },graceMs);timer.unref();recoveryTimers.set(socket.id,timer);
  });
 });
 const sweep=setInterval(()=>{
  const now=Date.now();for(const room of rooms.values()){
   if(room.phase==='finished'&&now>=room.cleanupAt)forget(room);
   else if((room.phase==='waiting'||room.phase==='draft')&&now>=room.expiresAt)expire(room,room.phase==='draft'?'Ready-up timed out. Start another match.':'Private room expired. Create a new code.');
   else if(room.phase==='playing'&&now-room.lastActivity>1800000)expire(room,'This inactive match has expired.');
  }
 },1000);sweep.unref();
 return {app,io,httpServer,close:()=>new Promise(resolve=>{clearInterval(sweep);for(const t of recoveryTimers.values())clearTimeout(t);io.close(resolve);})};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const game=createGameServer();game.httpServer.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Fortress Frenzy multiplayer server ready'));
 process.once('SIGTERM',()=>game.close().then(()=>process.exit(0)));
}

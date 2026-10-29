import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';
import assert from 'node:assert/strict';
const server=spawn(process.execPath, ['server/server.js'], { env: { ...process.env, PORT: '3217' }, stdio: ['ignore','pipe','pipe'] });
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
const a=io('http://127.0.0.1:3217'), b=io('http://127.0.0.1:3217');
const once=(s,event)=>new Promise((resolve,reject)=> { const timeout=setTimeout(()=>reject(Error('Timed out: '+event)),5000);s.once(event,data=>{clearTimeout(timeout);resolve(data)}); });
try {
 await Promise.all([once(a,'connect'),once(b,'connect')]);
 const matches=Promise.all([once(a,'matchFound'),once(b,'matchFound')]);a.emit('findMatch');b.emit('findMatch');
 const [room]=await matches;
 const ids=['wrecker','bomber','scout','napalmer','fairy','crow','archer','catapult'];
 const starts=Promise.all([once(a,'matchStart'),once(b,'matchStart')]);
 a.emit('draftReady',{roomId:room.roomId,units:ids});b.emit('draftReady',{roomId:room.roomId,units:ids});
 const [start]=await starts;assert.equal(Object.keys(start.startState.castles).length,2);
 const shot=once(b,'shotResolved');a.emit('playerShot',{roomId:room.roomId,unitId:'wrecker',angle:-0.15});
 assert.equal((await shot).shooterId,a.id);
 const left=once(b,'opponentLeft');a.emit('leaveRoom',{roomId:room.roomId});await left;
 console.log('PASS: two clients matched, drafted, fired, received results and left cleanly.');
} finally {a.disconnect();b.disconnect();server.kill();}

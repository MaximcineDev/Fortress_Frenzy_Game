import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { addMenuBackButton, returnToMenu, handleGameBack } from '../src/ui/navigation.js';

function sceneHarness(key = 'Options') {
 const calls = [];
 const socket = { connected: true, emit: (...args) => calls.push(['emit', ...args]), removeAllListeners: () => calls.push(['clear']), disconnect: () => calls.push(['disconnect']) };
 const data = new Map([['socket', socket], ['roomId', 'active-room']]);
 const button = new EventEmitter();
 for (const name of ['setStrokeStyle','setDepth','setInteractive','setName','setFillStyle']) button[name] = () => button;
 const scene = { registry: { get: k => data.get(k), remove: k => data.delete(k) },
 time: { paused: true }, tweens: { paused: true }, scene: { key, start: k => calls.push(['start',k]) },
 input: { keyboard: new EventEmitter() }, events: new EventEmitter(),
 add: { rectangle: (x,y,w,h) => { button.bounds = {x,y,w,h}; return button; }, text: () => ({setOrigin(){return this;},setDepth(){return this;}}) } };
 return { scene, button, data, calls };
}
test('return to menu leaves room and clears stale sockets even from paused battle', () => {
 const {scene,data,calls}=sceneHarness('Game'); returnToMenu(scene);
 assert.deepEqual(calls,[['emit','leaveRoom',{roomId:'active-room'}],['clear'],['disconnect'],['start','MainMenu']]);
 assert.equal(scene.time.paused,false);assert.equal(scene.tweens.paused,false);assert.equal(data.has('socket'),false);assert.equal(data.has('roomId'),false);
});
test('back button has a full touch area, navigates on tap and cleans keyboard binding', () => {
 const {scene,button,calls}=sceneHarness();addMenuBackButton(scene);
 assert.equal(button.bounds.w,146);assert.equal(button.bounds.h,46);
 let stopped=false;button.emit('pointerdown',{},0,0,{stopPropagation:()=>{stopped=true;}});
 assert.equal(stopped,true);assert.deepEqual(calls.at(-1),['start','MainMenu']);
 assert.equal(scene.input.keyboard.listenerCount('keydown-ESC'),1);scene.events.emit('shutdown');assert.equal(scene.input.keyboard.listenerCount('keydown-ESC'),0);
});
test('Android back closes Play dialog before exiting, and leaves submenus for main menu', () => {
 const {scene,calls}=sceneHarness('MainMenu');let closed=0,exited=0;
 const game={scene:{getScenes:()=>[scene]}};
 scene.matchDialog={};scene.closeMatchChoices=()=>{closed++;scene.matchDialog=null;};
 handleGameBack(game,()=>exited++);assert.equal(closed,1);assert.equal(exited,0);
 handleGameBack(game,()=>exited++);assert.equal(exited,1);
 scene.scene.key='Shop';handleGameBack(game,()=>exited++);assert.deepEqual(calls.at(-1),['start','MainMenu']);assert.equal(exited,1);
});

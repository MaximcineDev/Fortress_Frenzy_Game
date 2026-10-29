import Phaser from 'phaser';
import { io } from 'socket.io-client';
import { addMenuBackButton } from '../ui/navigation.js';
import { loadOnlineSettings,saveOnlineSettings } from '../onlineSettings.js';

export default class OnlineLobbyScene extends Phaser.Scene {
 constructor(){super('OnlineLobby');}
 create(data={}){
  this.socket=null;this.intent=null;this.bindings=[];this.transitioning=false;this.roomCode='';
  this.registry.remove('missionId');this.registry.set('offlineMode',false);
  const prior=this.registry.get('socket');prior?.removeAllListeners();prior?.disconnect();this.registry.remove('socket');this.registry.remove('roomId');
  this.add.image(450,300,'bg-battle-medieval').setDisplaySize(900,600);
  this.add.rectangle(450,300,900,600,0x0e2135,0.91);addMenuBackButton(this);
  this.add.text(450,27,'ONLINE DUEL',{fontFamily:'Georgia',fontSize:'27px',color:'#ffe2a0'}).setOrigin(0.5);
  this.connectionLabel=this.add.text(870,28,'OFFLINE',{fontFamily:'Arial',fontSize:'13px',color:'#c9dbe5'}).setOrigin(1,0.5);
  const settings=loadOnlineSettings();
  this.add.text(182,87,'PLAYER NAME',{fontFamily:'Arial',fontSize:'12px',color:'#e6ce92'});
  this.nameInput=this.add.dom(450,124,'input','width:520px;height:40px;box-sizing:border-box;border:1px solid #b69b63;border-radius:6px;background:#11283d;color:white;padding:8px 12px;font:17px Arial;').setDepth(20);
  this.nameInput.node.value=settings.name;this.nameInput.node.maxLength=18;this.nameInput.node.setAttribute('aria-label','Player name');
  this.add.text(182,163,'SERVER ADDRESS',{fontFamily:'Arial',fontSize:'12px',color:'#e6ce92'});
  this.serverInput=this.add.dom(450,200,'input','width:520px;height:40px;box-sizing:border-box;border:1px solid #b69b63;border-radius:6px;background:#11283d;color:white;padding:8px 12px;font:16px Arial;').setDepth(20);
  this.serverInput.node.value=settings.serverUrl;this.serverInput.node.placeholder='https://your-game-server.example';this.serverInput.node.setAttribute('aria-label','Game server address');this.serverInput.node.setAttribute('autocapitalize','none');this.serverInput.node.spellcheck=false;
  this.add.text(450,239,'Both players must connect to the same server.',{fontFamily:'Arial',fontSize:'13px',color:'#b8d0df'}).setOrigin(0.5);
  this.connectButton=this.button(450,280,330,'CONNECT',()=>this.socket?.connected?this.disconnect():this.connect());
  this.findButton=this.button(275,355,300,'FIND OPPONENT',()=>this.findMatch());
  this.createButton=this.button(625,355,300,'CREATE PRIVATE ROOM',()=>this.createRoom());
  this.codeInput=this.add.dom(300,423,'input','width:290px;height:44px;box-sizing:border-box;border:1px solid #65879d;border-radius:6px;background:#11283d;color:white;padding:8px 12px;font:bold 20px Arial;letter-spacing:4px;text-transform:uppercase;').setDepth(20);
  this.codeInput.node.placeholder='ROOM CODE';this.codeInput.node.maxLength=6;this.codeInput.node.setAttribute('aria-label','Six character room code');this.codeInput.node.spellcheck=false;
  this.joinButton=this.button(625,423,300,'JOIN ROOM',()=>this.joinRoom());
  this.status=this.add.text(450,491,data.message||'Connect, then find a public opponent or invite a friend.',{fontFamily:'Arial',fontSize:'16px',color:'#ffe3a1',align:'center',wordWrap:{width:800},lineSpacing:5}).setOrigin(0.5);
  this.cancelButton=this.button(450,556,300,'CANCEL SEARCH / ROOM',()=>this.cancel());this.cancelButton.box.setVisible(false);this.cancelButton.text.setVisible(false);
  this.setActions(false);
  this.events.once('shutdown',()=>{
   for(const [event,fn]of this.bindings)this.socket?.off(event,fn);
   if(!this.transitioning){this.socket?.removeAllListeners();this.socket?.disconnect();this.registry.remove('socket');}
  });
 }
 button(x,y,width,label,fn){
  const box=this.add.rectangle(x,y,width,44,0x315872).setStrokeStyle(1,0xd7bb7d).setInteractive({useHandCursor:true});
  const text=this.add.text(x,y,label,{fontFamily:'Arial',fontSize:'15px',fontStyle:'bold',color:'#ffe4a1'}).setOrigin(0.5);
  box.on('pointerdown',fn);return {box,text};
 }
 setActions(connected){
  const idle=connected&&!this.intent;
  for(const b of [this.findButton,this.createButton,this.joinButton]){b.box.setAlpha(idle?1:0.4);b.text.setAlpha(idle?1:0.4);b.box.input.enabled=!!idle;}
  this.codeInput.node.disabled=!idle;
  this.nameInput.node.disabled=!!connected;this.serverInput.node.disabled=!!connected;
  this.cancelButton.box.setVisible(!!this.intent);this.cancelButton.text.setVisible(!!this.intent);
 }
 on(event,fn){this.socket.on(event,fn);this.bindings.push([event,fn]);}
 message(text){this.status.setText(text);}
 disconnect(){
  this.intent=null;this.socket?.removeAllListeners();this.socket?.disconnect();this.socket=null;this.bindings=[];
  this.registry.remove('socket');this.registry.remove('roomId');this.connectionLabel.setText('OFFLINE');this.connectButton.text.setText('CONNECT');this.message('Disconnected. You can change the server address.');this.setActions(false);
 }
 connect(){
  let settings;try{settings=saveOnlineSettings(this.nameInput.node.value,this.serverInput.node.value);}catch(error){this.message(error.message);return;}
  this.nameInput.node.blur();this.serverInput.node.blur();this.codeInput.node.blur();
  this.socket?.removeAllListeners();this.socket?.disconnect();this.bindings=[];
  this.socket=io(settings.serverUrl,{autoConnect:false,reconnection:true,reconnectionAttempts:10,reconnectionDelay:500,reconnectionDelayMax:2000,timeout:8000});
  this.registry.set('socket',this.socket);this.connectionLabel.setText('CONNECTING');this.message('Connecting to the game server…');this.connectButton.box.input.enabled=false;
  this.on('connect',()=>{
   this.connectionLabel.setText('CONNECTED');this.connectButton.text.setText('DISCONNECT');this.connectButton.box.input.enabled=true;
   this.socket.emit('setProfile',{name:settings.name});
   if(this.socket.recovered&&this.intent==='host'){this.message('Connection restored. Waiting for your friend…');}
   else if(this.intent==='public'){this.request('findMatch',{name:settings.name},()=>this.message('Finding an opponent… You can cancel at any time.'));}
   else{this.intent=null;this.message('Connected. Find an opponent or create a private room.');}
   this.setActions(true);
  });
  this.on('connect_error',()=>{this.connectionLabel.setText('UNAVAILABLE');this.connectButton.box.input.enabled=true;this.message('Could not reach the server. Check the address or try again.');this.setActions(false);});
  this.on('disconnect',()=>{this.connectionLabel.setText('RECONNECTING');this.setActions(false);this.message('Connection lost. Trying to reconnect…');});
  this.on('queueStatus',({searching})=>{if(searching)this.message('Finding an opponent… You can cancel at any time.');});
  this.on('matchFound',state=>this.enterDraft(state));
  this.on('roomState',state=>this.handleRoomState(state));
  this.on('matchResumed',state=>this.handleRoomState(state));
  this.on('roomExpired',({message})=>{this.intent=null;this.registry.remove('roomId');this.message(message);this.setActions(this.socket?.connected);});
  this.socket.connect();
 }
 request(event,data,onSuccess){
  if(!this.socket?.connected){this.message('Connect to a server first.');return;}
  this.socket.timeout(8000).emit(event,data,(error,result)=>{
   if(!this.scene.isActive())return;
   if(error||!result?.ok){this.message(result?.message||'The server did not respond. Please try again.');this.intent=null;this.setActions(this.socket?.connected);return;}
   onSuccess?.(result);
  });
 }
 findMatch(){this.intent='public';this.setActions(true);this.message('Finding an opponent…');this.request('findMatch',{name:this.nameInput.node.value},()=>{});}
 createRoom(){this.intent='host';this.setActions(true);this.request('createRoom',{name:this.nameInput.node.value},state=>this.handleRoomState(state));}
 joinRoom(){this.codeInput.node.blur();const code=this.codeInput.node.value.trim().toUpperCase();if(!/^[A-Z2-9]{6}$/.test(code)){this.message('Enter your friend’s six-character room code.');return;}this.intent='join';this.setActions(true);this.request('joinRoom',{name:this.nameInput.node.value,code},()=>{});}
 cancel(){
  if(this.socket?.connected){this.socket.emit('cancelSearch',{});this.socket.emit('leaveRoom',{});}
  this.intent=null;this.roomCode='';this.registry.remove('roomId');this.message('Cancelled. Choose another match.');this.setActions(this.socket?.connected);
 }
 handleRoomState(state){
  if(state.phase==='draft'){this.enterDraft(state);return;}
  if(state.phase==='waiting'){this.intent='host';this.roomCode=state.code;this.registry.set('roomId',state.roomId);this.message('ROOM CODE: '+state.code+'\nShare this code with your friend. Waiting for them to join…');this.setActions(this.socket?.connected);}
 }
 enterDraft(state){
  if(this.transitioning)return;this.transitioning=true;
  this.registry.set('roomId',state.roomId);this.registry.set('playerIndex',state.playerIndex);this.registry.set('opponentName',state.opponentName);this.registry.set('draftState',state);
  this.scene.start('Draft');
 }
}

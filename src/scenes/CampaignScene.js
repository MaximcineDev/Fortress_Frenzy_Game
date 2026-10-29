import Phaser from 'phaser';
import { addMenuBackButton } from '../ui/navigation.js';
import { campaignProgress, getMission, MISSION_COUNT, canPlayMission, unlockMission } from '../campaign.js';
import { Storage } from '../storage.js';
import { UNITS } from '../units.js';

export default class CampaignScene extends Phaser.Scene {
 constructor(){super('Campaign');}
 create(data={}){
  this.briefing=null;
  this.pageIndex=Math.max(0,Math.min(2,data.page??this.registry.get('campaignPage')??0));
  this.registry.set('campaignPage',this.pageIndex);
  this.add.image(450,300,'bg-battle-medieval').setDisplaySize(900,600);
  this.add.rectangle(450,300,900,600,0x101d2c,0.84);
  addMenuBackButton(this);
  const progress=campaignProgress();
  this.add.text(450,27,'WORLD CAMPAIGN',{fontFamily:'Georgia',fontSize:'25px',color:'#ffe5a1'}).setOrigin(0.5);
  this.add.text(865,26,Storage.get().coins+' COINS',{fontSize:'14px',color:'#ffe5a1'}).setOrigin(1,0.5);
  this.add.text(450,65,'30 missions • Missions 1–5 are free • Unlock 6–30 with earned coins',{fontFamily:'Arial',fontSize:'14px',color:'#d5e6e9'}).setOrigin(0.5);
  const first=this.pageIndex*10+1;
  this.add.text(450,103,'MISSIONS '+first+'–'+(first+9)+'  •  '+Object.keys(progress.stars).length+'/30 COMPLETE',{fontSize:'13px',color:'#eacb80'}).setOrigin(0.5);
  for(let i=0;i<10;i++){
   const mission=getMission(first+i),owned=canPlayMission(mission.id,progress),stars=progress.stars[mission.id]||0;
   const x=106+(i%5)*172,y=207+Math.floor(i/5)*158;
   const panel=this.add.rectangle(x,y,154,132,owned?0x25445c:0x1c2731,0.98).setStrokeStyle(2,owned?0xe7c079:0x586779).setInteractive({useHandCursor:true}).setName('mission-'+mission.id);
   this.add.image(x+52,y-42,'flag-atlas',mission.world.city.countryCode).setDisplaySize(27,20);
   this.add.text(x-62,y-51,String(mission.id).padStart(2,'0'),{fontFamily:'Georgia',fontSize:'23px',color:owned?'#ffd98a':'#94a5ae'});
   this.add.text(x,y-13,mission.world.city.city,{fontFamily:'Arial',fontSize:'15px',fontStyle:'bold',color:owned?'#ffffff':'#b1bec7',align:'center',wordWrap:{width:140}}).setOrigin(0.5);
   this.add.text(x,y+16,mission.title,{fontFamily:'Arial',fontSize:'10px',color:'#a8c8d5',align:'center'}).setOrigin(0.5);
   this.add.text(x,y+43,owned?(stars?'':mission.id<=5?'FREE TO PLAY':'UNLOCKED'):'LOCKED • '+mission.unlockCost+' COINS',{fontFamily:'Arial',fontSize:'11px',fontStyle:'bold',color:owned?'#ffd476':'#e9c281'}).setOrigin(0.5);
   if(stars)for(let j=0;j<3;j++)this.add.star(x-20+j*20,y+43,5,3,7,j<stars?0xffd476:0x455666).setStrokeStyle(1,0xffd476);
   panel.on('pointerdown',()=>owned?this.showBriefing(mission):this.showUnlock(mission));
  }
  const nav=(x,text,page)=>{
   const box=this.add.rectangle(x,480,150,44,0x29495f).setStrokeStyle(1,0xe6c27a).setInteractive({useHandCursor:true});
   this.add.text(x,480,text,{fontFamily:'Arial',fontSize:'15px',color:'#ffe5a1'}).setOrigin(0.5);
   box.on('pointerdown',()=>this.scene.restart({page}));
  };
  if(this.pageIndex>0)nav(234,'< PREVIOUS',this.pageIndex-1);
  this.add.text(450,480,'PAGE '+(this.pageIndex+1)+' / 3',{fontFamily:'Arial',fontSize:'16px',color:'#ffe5a1'}).setOrigin(0.5);
  if(this.pageIndex<2)nav(666,'NEXT >',this.pageIndex+1);
  this.add.text(450,537,'Unlocks are permanent. Replays are free. Earn coins from missions or Quick Battle.',{fontFamily:'Arial',fontSize:'13px',color:'#cad8de',align:'center'}).setOrigin(0.5);
  if(Number.isInteger(data.missionToUnlock)&&!canPlayMission(data.missionToUnlock))this.showUnlock(getMission(data.missionToUnlock));
 }
 makeDialog(title,body){
  if(this.briefing)return null;
  const group=this.add.container(0,0).setDepth(1100);this.briefing=group;
  group.add(this.add.rectangle(450,300,900,600,0x071523,0.88).setInteractive());
  group.add(this.add.rectangle(450,300,570,350,0x203b52).setStrokeStyle(3,0xe5c478));
  group.add(this.add.text(450,170,title,{fontFamily:'Georgia',fontSize:'25px',color:'#ffe5a1',align:'center',wordWrap:{width:520}}).setOrigin(0.5));
  group.add(this.add.text(450,277,body,{fontFamily:'Arial',fontSize:'16px',color:'#e6eef1',align:'center',wordWrap:{width:510},lineSpacing:8}).setOrigin(0.5));
  return group;
 }
 dialogButton(group,x,label,fn,enabled=true){
  const box=this.add.rectangle(x,420,228,52,enabled?0x365e77:0x34424b).setStrokeStyle(2,enabled?0xe5c478:0x6e7b84);
  group.add(box);group.add(this.add.text(x,420,label,{fontFamily:'Arial',fontSize:'15px',color:enabled?'#ffe5a1':'#a2aeb6',fontStyle:'bold'}).setOrigin(0.5));
  if(enabled){box.setInteractive({useHandCursor:true});box.on('pointerdown',fn);}return box;
 }
 closeDialog(){this.briefing?.destroy(true);this.briefing=null;}
 showUnlock(mission){
  const coins=Storage.get().coins,afford=coins>=mission.unlockCost;
  const group=this.makeDialog('UNLOCK MISSION '+mission.id,
   mission.title+'\n'+mission.world.city.city+', '+mission.world.city.country+' • '+mission.world.city.landmark+'\n\nCost: '+mission.unlockCost+' coins • Balance: '+coins+' coins\n'+(afford?'One-time unlock. No extra fee to replay.':'You need '+(mission.unlockCost-coins)+' more coins.\nReplay free missions or win Quick Battles.'));
  if(!group)return;
  this.dialogButton(group,324,'CANCEL',()=>this.closeDialog());
  this.dialogButton(group,576,afford?'UNLOCK • '+mission.unlockCost+' COINS':'NOT ENOUGH COINS',()=>{
   // The save layer rejects repeat charges, including rapid repeated taps.
   const result=unlockMission(mission.id);
   this.closeDialog();
   if(result.ok)this.scene.restart({page:Math.floor((mission.id-1)/10)});
   else this.showUnlock(mission);
  },afford);
 }
 showBriefing(mission){
  if(!canPlayMission(mission.id)){this.showUnlock(mission);return;}
  const group=this.makeDialog('MISSION '+mission.id+' • '+mission.title,
   mission.description+'\n\n'+mission.world.city.city+', '+mission.world.city.country+' • '+mission.world.city.landmark+'\n'+(mission.timeLimit?'Time limit: '+mission.timeLimit+' seconds':'Take your time and aim carefully.')+'\nFirst victory: '+mission.reward+' coins • Replay: 20 coins');
  if(!group)return;
  this.dialogButton(group,324,'BACK',()=>this.closeDialog());
  this.dialogButton(group,576,'START MISSION',()=>{
   if(!canPlayMission(mission.id))return;
   this.briefing=null;this.registry.set('offlineMode',true);this.registry.set('missionId',mission.id);
   this.registry.set('startState',{myUnits:UNITS.map(unit=>unit.id)});this.scene.start('Game');
  });
  this.events.once('shutdown',()=>{this.briefing=null;});
 }
}

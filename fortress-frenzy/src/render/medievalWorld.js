import { getSkin } from '../skins.js';

export function buildMedievalWorld(scene,castles,myId,mission){
 const world=mission?.world;
 const bg=world?scene.add.image(450,300,'realm-atlas',world.realm.id):scene.add.image(450,300,'bg-battle-medieval');
 bg.setDisplaySize(900,600).setDepth(-20);
 if(world){
  bg.setTint(world.phase.tint);
  if(world.phase.alpha)scene.add.rectangle(450,300,900,600,world.phase.overlay,world.phase.alpha).setDepth(-19);
  if(world.phaseIndex===4){
   scene.add.circle(650,145,20,0xe8edff,0.85).setDepth(-18);
   for(let i=0;i<18;i++)scene.add.circle(30+(i*137)%840,115+(i*31)%110,1,0xf5e7ff,0.65).setDepth(-18);
  }
 }
 const realm=world?.realm;
 scene.missionStoneKey=realm?'realm-stone-'+realm.id:null;
 scene.castleDetails=new Map();scene.commanderKnights=new Map();
 for(const [owner,castle]of Object.entries(castles)){
  const mine=owner===myId,x=castle.core.x,design=castle.design||{cols:6,rows:8,style:0,variant:0};
  const top=design.topY??Math.min(...castle.blocks.map(b=>b.y))-11;
  const width=design.cols*24;
  const skin=getSkin(scene.registry.get('selectedSkin')||'classic');
  const color=mine?skin.colors[0]:(realm?.banner??0x2554ad);
  scene.add.rectangle(x,499,width+14,12,realm?.ground??0x536d2c,0.95).setDepth(-5);
  const decor=scene.add.container(0,0).setDepth(1);
  const columns=[...new Set(castle.blocks.map(b=>b.x))].sort((a,b)=>a-b);
  // Caps follow each column's actual height, including stepped and twin keeps.
  columns.forEach((colX,i)=>{
   const colTop=Math.min(...castle.blocks.filter(b=>b.x===colX).map(b=>b.y))-11;
   if(i%2===0||i===columns.length-1)decor.add(scene.add.rectangle(colX,colTop-6,21,13,realm?.stone[0]??0xb7b2a0).setStrokeStyle(1,realm?.stone[1]??0x756e62));
   if((i===0||i===columns.length-1)&&world?.phaseIndex>0){
    const roof=scene.add.graphics();roof.fillStyle(color);
    if(world.phaseIndex===2)roof.fillRoundedRect(colX-15,colTop-21,30,18,8);
    else roof.fillTriangle(colX-17,colTop-7,colX,colTop-29-(world.phaseIndex*2),colX+17,colTop-7);
    roof.lineStyle(1,0xf3cd75);roof.lineBetween(colX-17,colTop-7,colX+17,colTop-7);decor.add(roof);
   }
  });
  const flagX=x+(mine?-width*0.32:width*0.32);
  decor.add(scene.add.rectangle(flagX,top-37,4,62,0x73502b));
  const flag=scene.add.graphics();flag.fillStyle(color);flag.fillTriangle(flagX,top-66,flagX+(mine?40:-40),top-58,flagX,top-40);flag.lineStyle(2,0xf6cc65);flag.strokeTriangle(flagX,top-66,flagX+(mine?40:-40),top-58,flagX,top-40);decor.add(flag);
  const banner=scene.add.rectangle(x,top+82,32,62,color).setStrokeStyle(2,0xebc25f);decor.add(banner);
  const crown=scene.add.graphics();crown.fillStyle(0xffd76b);crown.fillPoints([{x:x-12,y:top+72},{x:x-8,y:top+79},{x:x,y:top+68},{x:x+8,y:top+79},{x:x+12,y:top+72},{x:x+9,y:top+89},{x:x-9,y:top+89}],true);decor.add(crown);
  scene.castleDetails.set(owner,decor);
  const knight=scene.add.image(mine?232:668,492,'knight-sheet',mine?'red':mission?.type==='boss'?'green':'blue').setOrigin(0.5,1).setDisplaySize(120,120).setDepth(2);
  scene.commanderKnights.set(owner,knight);scene.tweens.add({targets:knight,y:488,duration:950,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
  for(let i=0;i<2;i++){
   const from=mine?190+i*54:710-i*54;
   const troop=scene.add.image(from,501+i*3,'knight-sheet',mine?(i?'gold':'red'):(i?'green':'blue')).setOrigin(0.5,1).setDisplaySize(44,44).setDepth(1.5);
   scene.tweens.add({targets:troop,x:from+(mine?42:-42),duration:2400+i*400,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});scene.tweens.add({targets:troop,y:troop.y-3,duration:160,yoyo:true,repeat:-1});
  }
 }
 // Cosmetic weather: it never changes hit detection or mission timing.
 const snow=realm?.id==='snow',rain=world?.phaseIndex===2&&!snow;
 for(let i=0;i<(snow||rain?22:10);i++){
  const x=20+(i*83)%860,y=snow||rain?105+(i*37)%320:400-(i%3)*68;
  const particle=rain?scene.add.rectangle(x,y,1,10,0xc7e8fa,0.5):scene.add.circle(x,y,snow?2:1.5,realm?.particle??0xffd48a,0.6);
  particle.setDepth(-6);
  scene.tweens.add({targets:particle,x:x+(snow?24:rain?-35:28),y:snow||rain?y+150:y-80,alpha:0,duration:rain?750+i*17:2200+i*110,repeat:-1});
 }
}
export function animateCommanderAttack(scene,owner,heal=false){
 const knight=scene.commanderKnights.get(owner);if(!knight)return;
 const direction=owner===scene.myId?1:-1;
 scene.tweens.add({targets:knight,angle:heal?-5:direction*9,duration:90,yoyo:true});
}

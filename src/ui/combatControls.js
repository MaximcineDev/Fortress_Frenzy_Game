// Dedicated controls are separate from battlefield aiming, so aim changes never shoot.
export function addCombatControls(scene) {
 const button=(name,x,y,w,h,label,color)=>{
  const box=scene.add.rectangle(x,y,w,h,color,0.98).setStrokeStyle(2,0xe5c479).setDepth(12).setInteractive({useHandCursor:true}).setName(name);
  const text=scene.add.text(x,y,label,{fontFamily:'Arial',fontSize:'15px',fontStyle:'bold',color:'#fff0bd',align:'center'}).setOrigin(0.5).setDepth(13);
  return {box,text};
 };
 const up=button('aim-up',65,530,110,42,'AIM +',0x2c5069);
 const down=button('aim-down',65,578,110,42,'AIM −',0x2c5069);
 const fire=button('fire-button',806,553,152,76,'FIRE',0x947025);
 fire.text.setY(541).setFontSize(23);
 const status=scene.add.text(806,573,'READY',{fontFamily:'Arial',fontSize:'12px',color:'#fff0bd'}).setOrigin(0.5).setDepth(13);
 const angle=scene.add.text(151,553,'AIM\n8.0°',{fontFamily:'Arial',fontSize:'13px',color:'#ffe6a5',align:'center',lineSpacing:5}).setOrigin(0.5).setDepth(13);
 for(const [control,direction]of [[up,1],[down,-1]]){
  control.box.on('pointerdown',(pointer,_x,_y,event)=>{
   event.stopPropagation();
   if(!scene.canAdjustAim())return;
   scene.aimHold={id:pointer.id,direction,elapsed:0};scene.changeAim(direction);
  });
 }
 fire.box.on('pointerdown',(_pointer,_x,_y,event)=>{event.stopPropagation();scene.tryFire();});
 return {up,down,fire,status,angle};
}

export function lockAdPresentation(game,message,onBlock){
 if(!game)return ()=>{};
 game.registry.set('adBusy',true);onBlock(true);
 const scenes=game.scene.getScenes(true), snapshots=scenes.map(s=>({s,input:s.input.enabled,keyboard:s.input.keyboard?.enabled,time:s.time.paused,tweens:s.tweens.paused,anims:s.anims.paused}));
 for(const {s} of snapshots){s.input.enabled=false;if(s.input.keyboard)s.input.keyboard.enabled=false;s.time.paused=true;s.tweens.paused=true;s.anims.pauseAll();}
 const scene=scenes[0];let cover;
 if(scene){cover=scene.add.container(0,0).setDepth(10000);cover.add(scene.add.rectangle(450,300,900,600,0x071321,.9));cover.add(scene.add.text(450,300,message||'Returning to your game shortly...',{fontFamily:'Arial',fontSize:'23px',color:'#ffe4a1',align:'center',wordWrap:{width:700}}).setOrigin(.5));}
 let released=false;
 return ()=>{
  if(released)return;released=true;
  cover?.destroy(true);
  for(const p of snapshots)if(p.s.sys.isActive()){p.s.input.enabled=p.input;if(p.s.input.keyboard)p.s.input.keyboard.enabled=p.keyboard;p.s.time.paused=p.time;p.s.tweens.paused=p.tweens;if(!p.anims)p.s.anims.resumeAll();}
  game.registry.set('adBusy',false);onBlock(false);
 };
}

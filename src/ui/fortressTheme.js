// Drawn UI keeps every label crisp and every control interactive on mobile.
export const fortressText = (size = 18, color = '#fff0bd') => ({
  fontFamily: 'Arial', fontSize: `${size}px`, fontStyle: 'bold', color,
  stroke: '#15253b', strokeThickness: 3, shadow: { offsetY: 2, color: '#071323', blur: 2, fill: true }
});
export function fortressPanel(scene, x, y, w, h, color = 0x173e69) {
  const g = scene.add.graphics();
  g.fillStyle(0x071321, 0.85).fillRoundedRect(x-w/2+3,y-h/2+7,w,h,14);
  g.fillStyle(0x69441e).fillRoundedRect(x-w/2-3,y-h/2-3,w+6,h+6,14);
  g.fillStyle(0xd6a34c).fillRoundedRect(x-w/2,y-h/2,w,h,12);
  g.fillStyle(color).fillRoundedRect(x-w/2+5,y-h/2+5,w-10,h-10,9);
  g.lineStyle(2,0x7fb4dc,0.5).strokeRoundedRect(x-w/2+9,y-h/2+9,w-18,h-18,7);
  for(const dx of [-1,1]) for(const dy of [-1,1]) {
    g.fillStyle(0x071c32).fillCircle(x+dx*(w/2-15),y+dy*(h/2-15),5);
    g.fillStyle(0xf9d47c).fillCircle(x+dx*(w/2-16),y+dy*(h/2-16),3);
  }
  return g;
}
export function fortressButton(scene,x,y,w,h,label,action,{red=false,size=18}={}) {
  const group=scene.add.container(x,y);
  const face=fortressPanel(scene,0,0,w,h,red?0x822f32:0x245d99);
  const text=scene.add.text(0,-1,label,fortressText(size)).setOrigin(0.5);
  const hit=scene.add.rectangle(0,0,w,h,0xffffff,0).setInteractive({useHandCursor:true});
  group.add([face,text,hit]);
  hit.on('pointerover',()=>face.setAlpha(0.82));
  hit.on('pointerout',()=>face.setAlpha(1));
  hit.on('pointerdown',(_p,_x,_y,event)=>{event.stopPropagation();action?.();});
  group.label=text;
  group.setText=value=>{text.setText(value);return group;};
  group.setStyle=value=>{const {backgroundColor,...style}=value;text.setStyle(style);return group;};
  return group;
}
export function fortressBackdrop(scene,title,subtitle) {
  scene.add.image(450,300,'bg-splash').setDisplaySize(900,600);
  scene.add.rectangle(450,300,900,600,0x071b36,0.66);
  fortressPanel(scene,450,48,470,68);
  scene.add.text(450,46,title,fortressText(30)).setOrigin(0.5);
  if(subtitle) scene.add.text(450,100,subtitle,{...fortressText(14),fontStyle:'normal'}).setOrigin(0.5);
}

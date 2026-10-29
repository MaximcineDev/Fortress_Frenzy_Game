export const REALMS = [
 { id:'forest',name:'Emerald Valley',stone:[0xb6b29b,0x635d50,0xe2ddc4],banner:0x28764e,ground:0x536d2c,particle:0xf6df9c },
 { id:'snow',name:'Frostfall Mountains',stone:[0x9fb9ce,0x526a84,0xe4f3fc],banner:0x3c83bc,ground:0xb1ccdc,particle:0xffffff },
 { id:'desert',name:'Sunspire Oasis',stone:[0xd4b16b,0x8d6033,0xfbe0a3],banner:0xd49b33,ground:0xaa853c,particle:0xf3ce7a },
 { id:'volcano',name:'Ashen Caldera',stone:[0x777583,0x3d3747,0xab9aa0],banner:0xc54926,ground:0x54434a,particle:0xff9a45 },
 { id:'coast',name:'Tidewatch Coast',stone:[0x98b8b3,0x506b72,0xdbddd0],banner:0x268f9e,ground:0x608e71,particle:0xd3f4f5 },
 { id:'enchanted',name:'Thornveil Woods',stone:[0xa393c3,0x57456e,0xe6c9f7],banner:0x8451bd,ground:0x6d4e8d,particle:0xcda5ff }
];
export const ATMOSPHERES = [
 {name:'Daylight',tint:0xffffff,overlay:0x10202b,alpha:0},
 {name:'Golden dusk',tint:0xffd5af,overlay:0xb95c2d,alpha:0.08},
 {name:'Misty rain',tint:0xc2d4df,overlay:0x658fa6,alpha:0.16},
 {name:'Twilight',tint:0xc3b4eb,overlay:0x36205a,alpha:0.18},
 {name:'Moonlit siege',tint:0xa1b8dd,overlay:0x0d2142,alpha:0.26}
];
export function worldVariant(id) {
 const index=Math.max(0,Math.min(29,Math.floor(Number(id)||1)-1));
 return { key:'mission-'+(index+1),realm:REALMS[index%6],realmIndex:index%6,phase:ATMOSPHERES[Math.floor(index/6)],phaseIndex:Math.floor(index/6),castle:{style:index%6,variant:Math.floor(index/6)} };
}

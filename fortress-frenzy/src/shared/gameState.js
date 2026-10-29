export const BLOCK_SIZE = 24;
export const CASTLE_COLS = 6;
export const CASTLE_ROWS = 8;
export const BLOCK_HP = 30;
export const CORE_HP = 100;
export const CORE_RADIUS = 16;
export const WORLD_W = 900;
export const WORLD_H = 600;

// World coordinates are canonical and identical for every viewer: player
// 0's castle is always physically at x=90, player 1's at x=810. Clients
// just render whatever the server tells them — no per-client mirroring.
function castleCenterX(side) {
  return side === 0 ? 90 : WORLD_W - 90;
}

export function buildCastle(playerId, side, profile = null) {
  const blocks = [], centerX = castleCenterX(side);
  const variant = profile?.variant ?? 0, style = profile?.style ?? 0;
  const shapes = [{cols:6,rows:8},{cols:6,rows:9},{cols:5,rows:8},{cols:7,rows:8},{cols:7,rows:9}];
  const {cols,rows} = profile ? shapes[variant] : shapes[0];
  const startY = WORLD_H - rows * BLOCK_SIZE - 90;
  const middle = Math.floor(cols / 2);
  for(let row=0;row<rows;row++) for(let col=0;col<cols;col++) {
    const c = side === 0 ? col : cols - 1 - col;
    // Each realm has a different real collision layout, not just a skin.
    if(profile) {
      if(style===1 && row<3 && c>=2 && c<cols-2) continue; // twin towers
      if(style===2 && row<2 && (c===0 || c===cols-1)) continue; // stepped palace
      if(style===3 && row>=rows-3 && c===middle) continue; // gatehouse arch
      if(style===4 && row<3 && c<2) continue; // coastal watchtower
      if(style===5 && row<2 && c!==0 && c!==middle && c!==cols-1) continue; // three spires
    }
    const x = centerX - cols * BLOCK_SIZE / 2 + col * BLOCK_SIZE + BLOCK_SIZE / 2;
    const y = startY + row * BLOCK_SIZE;
    blocks.push({id:`${playerId}_${row}_${col}`,owner:playerId,x,y,halfSize:(BLOCK_SIZE-2)/2,hp:BLOCK_HP,maxHp:BLOCK_HP,alive:true});
  }
  const core={id:`core_${playerId}`,owner:playerId,x:centerX,y:startY-20,radius:CORE_RADIUS,hp:CORE_HP,maxHp:CORE_HP,alive:true};
  return {blocks,core,design:{cols,rows,style,variant,topY:startY-11}};
}

export function applyDamage(target, amount) {
  target.hp -= amount;
  if (target.hp <= 0) {
    target.hp = 0;
    target.alive = false;
  }
}

export function applySplash(blocks, core, originX, originY, radius, amount, excludeId) {
  const changed = [];
  for (const b of blocks) {
    if (!b.alive || b.id === excludeId) continue;
    if (Math.hypot(b.x - originX, b.y - originY) <= radius) {
      applyDamage(b, amount);
      changed.push(b);
    }
  }
  if (core.alive && Math.hypot(core.x - originX, core.y - originY) <= radius) {
    applyDamage(core, amount);
    changed.push(core);
  }
  return changed;
}

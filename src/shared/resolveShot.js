import { applyDamage, applySplash } from './gameState.js';
import { simulateShot } from './trajectory.js';

// One resolver shared by the local game and authoritative multiplayer.
export function resolveShot(castles, side, enemy, unit, angle, multiplier = 1) {
  const own = castles[side], target = castles[unit.heal ? side : enemy];
  const origin = { x: own.core.x, y: own.core.y - 30 };
  if (unit.heal) {
    const changed = [target.core, ...target.blocks].filter(b => b.alive && b.hp < b.maxHp);
    changed.forEach(b => { b.hp = Math.min(b.maxHp, b.hp + unit.heal * multiplier); });
    return { points: [origin, { x: own.core.x, y: own.core.y }], updates: changed.map(snapshot) };
  }
  const result = simulateShot(unit, origin.x, origin.y, angle, target.blocks, target.core);
  const changed = new Map();
  const damage = (unit.damage + (unit.burnTicks || 0) * (unit.burnDamage || 0)) * multiplier;
  const hit = item => { applyDamage(item, damage); changed.set(item.id, item); };
  for (const id of result.hitBlockIds) {
    const block = target.blocks.find(b => b.id === id);
    hit(block);
  }
  if (result.hitCore) hit(target.core);
  const impact = result.points.at(-1);
  if ((result.hitBlockIds.length || result.hitCore) && unit.splashRadius) {
    const extra = applySplash(target.blocks, target.core, impact.x, impact.y, unit.splashRadius, damage * 0.5, result.hitBlockId || target.core.id);
    extra.forEach(item => changed.set(item.id, item));
  }
  const points = result.points.filter((_, i) => i % 2 === 0);
  if (points.at(-1) !== impact) points.push(impact);
  return { points, updates: [...changed.values()].map(snapshot) };
}
function snapshot(item) { return { id: item.id, hp: item.hp, alive: item.alive }; }

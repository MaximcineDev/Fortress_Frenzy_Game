import { buildCastle } from './shared/gameState.js';
import { resolveShot } from './shared/resolveShot.js';
import { simulateShot } from './shared/trajectory.js';
import { getUnit, UNITS } from './units.js';
import { Storage, DAMAGE_PER_LEVEL } from './storage.js';

// Five base Wrecker hits at 45 damage; shared online balance remains separate.
export const LOCAL_CORE_HP = 225;

export function createLocalMatch(mission = null) {
  const profile = mission?.world.castle || null;
  const castles = { me: buildCastle('me', 0, profile), enemy: buildCastle('enemy', 1, profile) };
  for (const castle of Object.values(castles)) {
    castle.core.hp = castle.core.maxHp = LOCAL_CORE_HP;
  }
  if (mission) {
    [castles.enemy.core, ...castles.enemy.blocks].forEach(target => {
      target.maxHp = Math.round(target.maxHp * mission.enemyHealth + 1e-8);
      target.hp = target.maxHp;
    });
  }
  const lastFired = { me: {}, enemy: {} };
  let over = false;
  function fire(side, unitId, angle) {
    const unit = getUnit(unitId);
    if (over || !unit || !castles[side] || !Number.isFinite(angle)) return null;
    const now = Date.now();
    if (now - (lastFired[side][unitId] ?? -Infinity) < unit.cooldownMs) return null;
    lastFired[side][unitId] = now;
    const enemy = side === 'me' ? 'enemy' : 'me';
    const multiplier = side === 'me' ? 1 + DAMAGE_PER_LEVEL * Storage.unitLevel(unitId) : (mission?.enemyDamage ?? 1);
    const shots = [];
    for (let i = 0; i < (unit.burstCount || 1) && !over; i++) {
      const resolved = resolveShot(castles, side, enemy, unit, angle, multiplier);
      over = !castles[enemy].core.alive;
      shots.push({ ...resolved, shooterSide: side, unitId, matchOver: over, winnerSide: over ? side : null });
    }
    return shots;
  }
  return { castles, fire, stop: () => { over = true; }, isOver: () => over };
}

export function pickBotShot(match, mission = null) {
  const roster = mission ? UNITS.filter(unit => mission.enemyUnits.includes(unit.id)) : UNITS;
  const unit = roster[Math.floor(Math.random() * roster.length)];
  let best = Math.PI, score = -Infinity;
  if (match && !unit.heal) {
    const own = match.castles.enemy.core, target = match.castles.me;
    for (let degrees = -45; degrees <= 15; degrees += 1) {
      const angle = Math.PI - degrees * Math.PI / 180;
      const result = simulateShot(unit, own.x, own.y - 30, angle, target.blocks, target.core);
      const value = result.hitCore ? 100 : result.hitBlockIds.length ? 20 : -Math.hypot(result.points.at(-1).x-target.core.x, result.points.at(-1).y-target.core.y);
      if (value > score) { score = value; best = angle; }
    }
  }
  return { unitId: unit.id, angle: best + (Math.random() - 0.5) * (mission?.aimError ?? 0.045) };
}

// Authoritative projectile simulation. This is the ONLY place hit
// detection happens now — clients just render whatever points and
// outcomes this function decides, so a modified client can't fake damage
// or dodge hits it shouldn't be able to dodge.

const GRAVITY = 0.22;     // px per (visual) frame^2 — tuned so every unit has a usable aiming arc across the 900px arena
const MAX_FRAMES = 240;   // ~4 seconds of flight at 60fps before we give up
const SUBSTEPS = 6;       // collision is checked this many times per visual frame

// At these speeds a projectile can move further in one frame than a
// castle block is wide (~24px), so checking collision once per frame lets
// shots tunnel straight through blocks without ever landing a sample
// inside one. Sub-stepping the collision check (while only recording one
// point per visual frame, so the payload sent to clients doesn't grow)
// fixes that without changing how fast anything looks like it's moving.
const WORLD_W = 900;
const WORLD_H = 600;

function circleRectHit(px, py, radius, rect) {
  const halfW = rect.halfSize + radius;
  return Math.abs(px - rect.x) <= halfW && Math.abs(py - rect.y) <= halfW;
}

function circleCircleHit(px, py, radius, circle) {
  const dx = px - circle.x, dy = py - circle.y;
  return Math.hypot(dx, dy) <= radius + circle.radius;
}

function findHitBlock(x, y, radius, blocks) {
  return blocks.find(b => b.alive && circleRectHit(x, y, radius, b));
}

/**
 * Simulate one shot and resolve who it hits.
 * @param {object} unit - unit definition from units.js (server copy)
 * @param {number} originX
 * @param {number} originY
 * @param {number} angle - world-space angle in radians
 * @param {Array} defenderBlocks - alive blocks belonging to the defender
 * @param {object} defenderCore - defender's core { x, y, radius, hp, alive }
 */
export function simulateShot(unit, originX, originY, angle, defenderBlocks, defenderCore) {
  // Every unit uses the same ballistic formula now — "arc" units (bomber,
  // catapult) differentiate through slower projectileSpeed, which means
  // the player must aim more steeply upward to cover the same distance,
  // rather than a hardcoded lob that ignores where the player aimed.
  let vx = Math.cos(angle) * unit.projectileSpeed;
  let vy = Math.sin(angle) * unit.projectileSpeed;
  let x = originX, y = originY;
  const points = [{ x, y }];
  let hitBlockId = null;
  let hitCore = false;
  let pierced = 0;
  const piercedIds = new Set();
  const hitBlockIds = [];
  const pierceLimit = unit.pierce || 0;
  let stop = false;

  for (let frame = 1; frame <= MAX_FRAMES && !stop; frame++) {
    for (let s = 0; s < SUBSTEPS; s++) {
      vy += GRAVITY / SUBSTEPS;
      x += vx / SUBSTEPS;
      y += vy / SUBSTEPS;

      if (x < -20 || x > WORLD_W + 20 || y > WORLD_H + 40) { stop = true; break; }

      const block = findHitBlock(x, y, unit.projectileRadius, defenderBlocks.filter(b => !piercedIds.has(b.id)));
      if (block) {
        hitBlockIds.push(block.id);
        piercedIds.add(block.id);
        if (pierced < pierceLimit) {
          pierced++;
          continue; // pass through, keep flying
        }
        hitBlockId = block.id;
        stop = true;
        break;
      }

      if (defenderCore.alive && circleCircleHit(x, y, unit.projectileRadius, defenderCore)) {
        hitCore = true;
        stop = true;
        break;
      }
    }
    points.push({ x, y });
  }

  return { points, hitBlockId, hitBlockIds, hitCore };
}

export const WORLD = { WORLD_W, WORLD_H };

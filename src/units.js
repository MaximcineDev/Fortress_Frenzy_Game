// Unit roster. Each unit defines how its projectile behaves when fired
// from the castle. Keep numbers here so balance tweaks live in one place.

export const UNITS = [
  {
    id: 'wrecker',
    name: 'Wrecker',
    color: 0xd94f4f,
    description: 'Slow, heavy shot. Big single-target damage.',
    projectileSpeed: 22,
    damage: 45,
    splashRadius: 0,
    cooldownMs: 1800,
    projectileRadius: 10
  },
  {
    id: 'bomber',
    name: 'Bomber',
    color: 0xe0a63a,
    description: 'Arcing bomb, explodes on impact with splash damage.',
    projectileSpeed: 16,
    damage: 25,
    splashRadius: 60,
    cooldownMs: 2200,
    projectileRadius: 8
  },
  {
    id: 'scout',
    name: 'Scout',
    color: 0x4fd9a0,
    description: 'Fast, light shot. Low damage but quick cooldown.',
    projectileSpeed: 26,
    damage: 12,
    splashRadius: 0,
    cooldownMs: 700,
    projectileRadius: 5
  },
  {
    id: 'napalmer',
    name: 'Napalmer',
    color: 0xff7043,
    description: 'Incendiary shot with bonus burn damage and a small blast.',
    projectileSpeed: 21,
    damage: 15,
    splashRadius: 30,
    cooldownMs: 1600,
    projectileRadius: 7,
    burnTicks: 3,
    burnDamage: 5
  },
  {
    id: 'fairy',
    name: 'Fairy',
    color: 0x9d7cf0,
    description: 'Repairs your core and all surviving damaged blocks.',
    projectileSpeed: 23,
    damage: 0,
    heal: 20,
    splashRadius: 0,
    cooldownMs: 2000,
    projectileRadius: 6,
    friendlyFire: false
  },
  {
    id: 'crow',
    name: 'Crow',
    color: 0x2f2f2f,
    description: 'Two small shots per cooldown, decent damage each.',
    projectileSpeed: 24,
    damage: 14,
    splashRadius: 0,
    cooldownMs: 1400,
    projectileRadius: 5,
    burstCount: 2,
    burstDelayMs: 150
  },
  {
    id: 'archer',
    name: 'Archer',
    color: 0x6fbf73,
    description: 'Straight fast arrow, pierces one block.',
    projectileSpeed: 28,
    damage: 18,
    splashRadius: 0,
    cooldownMs: 1000,
    projectileRadius: 4,
    pierce: 1
  },
  {
    id: 'catapult',
    name: 'Catapult',
    color: 0x8d6e63,
    description: 'Huge arcing rock. Long cooldown, devastating splash.',
    projectileSpeed: 13,
    damage: 35,
    splashRadius: 90,
    cooldownMs: 3000,
    projectileRadius: 14
  }
];

export function getUnit(id) {
  return UNITS.find(u => u.id === id);
}

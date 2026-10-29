// Cosmetic skins for the PLAYER's own tower only — the enemy's tower is
// always the fixed red palette regardless of what the player has
// equipped, same as most games don't let you reskin your opponent.
// "classic" is free and always owned; the rest are bought with the
// local coin balance (src/storage.js) and have no effect on gameplay.

export const SKINS = [
  { id: 'classic', label: 'Classic Blue', cost: 0, colors: [0x2c4a7a, 0x1c3258, 0x4d70a8] },
  { id: 'emerald', label: 'Emerald', cost: 120, colors: [0x1f6b4a, 0x123f2c, 0x3fae7c] },
  { id: 'gold', label: 'Gold', cost: 180, colors: [0x8a6a1f, 0x5c4712, 0xd4ab3f] },
  { id: 'violet', label: 'Violet', cost: 180, colors: [0x5a2c7a, 0x3a1c52, 0x8a5cae] }
];

export function textureKeyForSkin(id) {
  return `tower-block-skin-${id}`;
}

export function getSkin(id) {
  return SKINS.find(s => s.id === id) || SKINS[0];
}

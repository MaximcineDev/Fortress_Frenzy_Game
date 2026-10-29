export const COIN_PACKS = Object.freeze([
  { id: 'ff_gold_300', name: 'COIN POUCH', coins: 300, previewPrice: '$0.99', badge: 'STARTER' },
  { id: 'ff_gold_800', name: 'SOLDIER CHEST', coins: 800, previewPrice: '$1.99', badge: 'GROW YOUR ARSENAL' },
  { id: 'ff_gold_1800', name: 'ROYAL CHEST', coins: 1800, previewPrice: '$3.99', badge: 'LARGE PACK' },
  { id: 'ff_gold_4000', name: 'KINGDOM VAULT', coins: 4000, previewPrice: '$7.99', badge: 'BIGGEST PACK' }
]);
export function packFor(id) { return COIN_PACKS.find(p => p.id === id); }

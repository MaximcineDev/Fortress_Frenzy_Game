// Simple localStorage-backed save data. This is entirely local to the
// device — there's no account system or server-side economy, so nothing
// here syncs between devices or gets validated by the multiplayer
// server. That's also why unit upgrades (see UPGRADE_DAMAGE_PER_LEVEL
// in units usage) only apply in offline matches: the online server is
// the sole authority on damage and has no notion of a player's saved
// progress, so applying a client-side boost there would do nothing
// (best case) or look like an unexplained mismatch (worst case).

const KEY = 'ff_save_v1';
const MAX_UNIT_LEVEL = 3;

function defaults() {
  return {
    coins: 150,
    unitLevels: {},        // { wrecker: 2, ... } — absent/0 = base stats
    ownedSkins: ['classic'],
    selectedSkin: 'classic',
    campaign: { schema: 2, purchased: [], stars: {} },
    musicMuted: false,
    sfxMuted: false
  };
}

const listeners = new Set();
function notify(data){for(const fn of listeners)fn(data);}
let memory = defaults();
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(memory);
    return { ...defaults(), ...JSON.parse(raw) };
  } catch (e) {
    return structuredClone(memory); // corrupted/blocked storage — fall back rather than crash
  }
}

function persist(data) {
  memory = structuredClone(data);
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    // Storage can fail (private browsing, quota, disabled) — the game
    // should keep working with in-memory state for the session even if
    // nothing saves.
  }
  notify(data);
}

export const Storage = {
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  get() {
    return load();
  },

  set(partial) {
    const data = { ...load(), ...partial };
    persist(data);
    return data;
  },

  addCoins(amount) {
    const data = load();
    data.coins = Math.max(0, data.coins + amount);
    persist(data);
    return data;
  },

  spendCoins(amount) {
    const data = load();
    if (data.coins < amount) return null; // insufficient funds — caller checks for null
    data.coins -= amount;
    persist(data);
    return data;
  },

  unitLevel(unitId) {
    return load().unitLevels[unitId] || 0;
  },

  upgradeCost(currentLevel) {
    return (currentLevel + 1) * 60;
  },

  canUpgrade(unitId) {
    const level = this.unitLevel(unitId);
    return level < MAX_UNIT_LEVEL;
  },

  upgradeUnit(unitId) {
    const data = load();
    const level = data.unitLevels[unitId] || 0;
    if (level >= MAX_UNIT_LEVEL) return null;
    const cost = this.upgradeCost(level);
    if (data.coins < cost) return null;
    data.coins -= cost;
    data.unitLevels[unitId] = level + 1;
    persist(data);
    return data;
  },

  creditAdReward(claimId, amount) {
    if (!claimId || !Number.isSafeInteger(amount) || amount <= 0 || amount > 10000) throw new Error('Invalid ad reward.');
    const data = load(), receipts = data.adRewardReceipts || [];
    if (receipts.includes(claimId)) return false;
    data.coins += amount;
    data.adRewardReceipts = [...receipts, claimId];
    localStorage.setItem(KEY, JSON.stringify(data));
    memory = structuredClone(data);notify(data);return true;
  },

  creditPurchase(token, amount) {
    if (!token || !Number.isSafeInteger(amount) || amount <= 0) throw new Error('Invalid purchase.');
    const data = load();
    const receipts = data.purchaseReceipts || [];
    if (receipts.includes(token)) return false;
    data.coins += amount;
    data.purchaseReceipts = [...receipts, token];
    // Purchases require durable storage: never consume on a failed save.
    localStorage.setItem(KEY, JSON.stringify(data));
    memory = structuredClone(data);
    notify(data);
    return true;
  },

  reset() {
    const purchaseReceipts = load().purchaseReceipts || [];
    const adRewardReceipts = load().adRewardReceipts || [];
    persist({ ...defaults(), purchaseReceipts, adRewardReceipts });
    return defaults();
  }
};

export const MAX_LEVEL = MAX_UNIT_LEVEL;
export const DAMAGE_PER_LEVEL = 0.08; // +8% damage/heal per upgrade level

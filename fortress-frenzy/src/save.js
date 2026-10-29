// A small persistence layer backed by localStorage, which is fully
// functional and durable inside a Capacitor WebView on a real device
// (unlike a sandboxed browser artifact) — this is what lets Gold,
// upgrades, and settings survive between app launches.
//
// Every function reads/writes the whole save blob rather than keeping
// state in memory, since the amount of data here is tiny and this way
// there's a single source of truth with no risk of scenes drifting out
// of sync with what's actually on disk.

const KEY = 'fortress-frenzy-save-v1';

const DEFAULTS = {
  gold: 0,
  unitLevels: {},       // unitId -> level (0 = base, up to MAX_UNIT_LEVEL)
  unlockedThemes: ['classic'],
  selectedTheme: 'classic',
  soundEnabled: true
};

export const MAX_UNIT_LEVEL = 3;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredCloneSafe(DEFAULTS);
    const parsed = JSON.parse(raw);
    return {
      ...structuredCloneSafe(DEFAULTS),
      ...parsed,
      unitLevels: { ...parsed.unitLevels }
    };
  } catch (e) {
    return structuredCloneSafe(DEFAULTS);
  }
}

function persist(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    // Storage can fail (private browsing, quota, etc.) — progress just
    // won't persist this session rather than crashing the game.
  }
}

function structuredCloneSafe(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function getSave() {
  return load();
}

export function getGold() {
  return load().gold;
}

export function addGold(amount) {
  const data = load();
  data.gold += amount;
  persist(data);
  return data.gold;
}

export function getUnitLevel(unitId) {
  return load().unitLevels[unitId] || 0;
}

export function upgradeCost(level) {
  // level here is the level being purchased (1, 2, or 3)
  return [null, 50, 100, 200][level] ?? null;
}

export function upgradeUnit(unitId) {
  const data = load();
  const currentLevel = data.unitLevels[unitId] || 0;
  const nextLevel = currentLevel + 1;
  if (nextLevel > MAX_UNIT_LEVEL) return { success: false, reason: 'max' };
  const cost = upgradeCost(nextLevel);
  if (data.gold < cost) return { success: false, reason: 'gold', cost };
  data.gold -= cost;
  data.unitLevels[unitId] = nextLevel;
  persist(data);
  return { success: true, newLevel: nextLevel, gold: data.gold };
}

export function isThemeUnlocked(themeId) {
  return load().unlockedThemes.includes(themeId);
}

export function unlockTheme(themeId, cost) {
  const data = load();
  if (data.unlockedThemes.includes(themeId)) return { success: false, reason: 'owned' };
  if (data.gold < cost) return { success: false, reason: 'gold' };
  data.gold -= cost;
  data.unlockedThemes.push(themeId);
  persist(data);
  return { success: true, gold: data.gold };
}

export function selectTheme(themeId) {
  const data = load();
  if (!data.unlockedThemes.includes(themeId)) return false;
  data.selectedTheme = themeId;
  persist(data);
  return true;
}

export function getSelectedTheme() {
  return load().selectedTheme;
}

export function isSoundEnabled() {
  return load().soundEnabled;
}

export function setSoundEnabled(enabled) {
  const data = load();
  data.soundEnabled = enabled;
  persist(data);
}

export function resetProgress() {
  persist(structuredCloneSafe(DEFAULTS));
}

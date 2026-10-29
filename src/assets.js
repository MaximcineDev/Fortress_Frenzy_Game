// All textures are drawn procedurally with Phaser's Graphics API and
// baked into the texture cache. No external image files are used, so
// there's nothing to license and nothing to break if a CDN goes down —
// swap any of these for hand-drawn sprites later without touching
// scene logic, since scenes just reference texture keys.

import { SKINS, textureKeyForSkin } from './skins.js';
import { REALMS } from './worldVariants.js';

export function generateTextures(scene) {
  REALMS.forEach(realm => generateRealmBlock(scene, realm));
  SKINS.forEach(skin => generateTowerBlock(scene, textureKeyForSkin(skin.id), ...skin.colors));
  generateTowerBlock(scene, 'tower-block-red', 0x7a2c2c, 0x581c1c, 0xa84d4d); // enemy — fixed, not a skin choice
  generateCore(scene, 'core-blue', 0x3b6fd9, 0x9dc0ff);
  generateCore(scene, 'core-red', 0xd94f4f, 0xffb3b3);
  generateProjectile(scene, 'proj-basic', 0xffffff);
  generateCityBackground(scene);
  generateExplosion(scene);
}

// A castle's destructible blocks now read as a stacked tower facade
// instead of plain stone — a colored panel, a beveled frame (like the
// old mortar lines), and a small lit window. Since every block in a
// castle shares this one texture, the repeated windows read as a
// building's curtain wall once the full 6x8 grid is stacked up,
// matching the city skyline behind it. Blue for the player's tower, red
// for the enemy's — same color language the HUD and core portraits
// already use.
function generateTowerBlock(scene, key, baseColor, edgeColor, highlightColor) {
  const size = 22;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0x6c665b, 1); g.fillRect(0, 0, size, size);
  g.fillStyle(0xc9c0a8, 1); g.fillRect(1, 1, 20, 9);
  g.fillStyle(0xb0a58c, 1); g.fillRect(1, 12, 20, 9);
  g.fillStyle(baseColor, 0.16); g.fillRect(1, 1, 20, 20);
  g.fillStyle(0x6c665b, 1); g.fillRect(11, 1, 1, 9); g.fillRect(5, 12, 1, 9);
  g.fillStyle(0xf7e9c4, 0.65); g.fillRect(2, 2, 8, 1); g.fillRect(7, 13, 12, 1);
  g.fillStyle(0x756c59, 0.45); g.fillRect(16, 5, 2, 1); g.fillRect(9, 18, 3, 1);

  g.generateTexture(key, size, size);
  g.destroy();
}

function generateCore(scene, key, mainColor, glowColor) {
  const size = 40;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(glowColor, 0.35);
  g.fillCircle(size / 2, size / 2, size / 2);
  g.fillStyle(mainColor, 1);
  g.fillCircle(size / 2, size / 2, size / 2 - 6);
  g.fillStyle(glowColor, 0.9);
  g.fillCircle(size / 2 - 4, size / 2 - 4, 4);
  g.generateTexture(key, size, size);
  g.destroy();
}

function generateProjectile(scene, key, color) {
  const size = 20;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(color, 0.25);
  g.fillCircle(size / 2, size / 2, size / 2);
  g.fillStyle(color, 1);
  g.fillCircle(size / 2, size / 2, size / 2 - 5);
  g.generateTexture(key, size, size);
  g.destroy();
}

// Decides which skyline palette to use based on the device's real clock,
// checked once when the app loads (not re-checked mid-session — a game
// session is short enough that this doesn't need to be live).
export function getTimePeriod() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'night'; // 17:00–4:59, covers evening through pre-dawn
}

const PALETTES = {
  morning: {
    // Dawn indigo up top warming into a coral sunrise band — the
    // warmest colors sit in the region that's always visible above the
    // skyline, rather than near the horizon where buildings would hide
    // them entirely.
    skyTop: [0x2b, 0x2f, 0x5c],
    skyMid: [0xe0, 0x87, 0x6e],
    skyHorizon: [0xf6, 0xc9, 0x8a],
    celestial: { x: 800, y: 95, color: 0xfff2c2, halo: 0xffe6a8, coreRadius: 28 },
    windowsLit: false
  },
  afternoon: {
    // Vivid, fairly saturated blue throughout — the brightest, least
    // moody of the three on purpose, to read as clear midday.
    skyTop: [0x1c, 0x5a, 0xc4],
    skyMid: [0x7d, 0xc4, 0xf2],
    skyHorizon: [0xd8, 0xf0, 0xff],
    celestial: { x: 800, y: 95, color: 0xfff9e0, halo: 0xfff3c0, coreRadius: 24 },
    windowsLit: false
  },
  night: {
    // The original dusk-into-night look this all started from.
    skyTop: [0x0d, 0x0e, 0x22],
    skyMid: [0x2a, 0x22, 0x3e],
    skyHorizon: [0x6b, 0x3a, 0x42],
    celestial: { x: 800, y: 95, color: 0xfdf2c6, halo: 0xfff6d8, coreRadius: 28 },
    windowsLit: true
  }
};

function generateCityBackground(scene) {
  const w = 900, h = 600;
  const palette = PALETTES[getTimePeriod()];
  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  const steps = 48;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    let color;
    if (t < 0.55) {
      const u = t / 0.55;
      color = lerpColor(palette.skyTop, palette.skyMid, u);
    } else {
      const u = (t - 0.55) / 0.45;
      color = lerpColor(palette.skyMid, palette.skyHorizon, u);
    }
    g.fillStyle(color, 1);
    g.fillRect(0, (h / steps) * i, w, h / steps + 1);
  }

  // Sun or moon, depending on time of day — same layered-glow technique,
  // just different color/position/size per palette.
  const { x: cx, y: cy, color: coreColor, halo: haloColor, coreRadius } = palette.celestial;
  g.fillStyle(haloColor, 0.12);
  g.fillCircle(cx, cy, coreRadius + 42);
  g.fillStyle(haloColor, 0.22);
  g.fillCircle(cx, cy, coreRadius + 18);
  g.fillStyle(coreColor, 0.9);
  g.fillCircle(cx, cy, coreRadius);

  // Back skyline layer — smaller, lighter, further away. Fixed heights
  // (not random) so the result is tuned rather than a coin-flip on
  // every rebuild.
  const backColor = 0x232c46;
  const backHeights = [70, 110, 60, 130, 90, 75, 120, 65, 100, 85, 140, 70, 95, 60, 115];
  drawSkylineRow(g, backColor, 0.75, backHeights, h, 60);

  // Front skyline layer — taller, darker, closer. A few buildings get a
  // thin spire/antenna for silhouette variety. Windows only light up at
  // night — during the day they'd just look like odd yellow squares on
  // sunlit buildings.
  const frontColor = 0x11162a;
  const frontHeights = [150, 210, 130, 260, 170, 300, 145, 220, 190, 250, 160, 230, 140, 200, 175];
  const frontTops = drawSkylineRow(g, frontColor, 1, frontHeights, h, 64);

  g.fillStyle(0x191d33, 1);
  [1, 4, 9, 12].forEach((i) => {
    const x = 64 * i + 32;
    const topY = frontTops[i];
    g.fillRect(x - 2, topY - 22, 4, 22);
  });

  if (palette.windowsLit) {
    drawWindows(g, frontTops, h, 64);
  }

  // Ground haze so the castles (added on top by GameScene) sit into the
  // scene rather than floating on a hard edge.
  g.fillStyle(0x0a0b16, 0.45);
  g.fillRect(0, h - 200, w, 200);

  g.generateTexture('city-bg', w, h);
  g.destroy();
}

function lerpColor(from, to, u) {
  const r = Math.round(from[0] + (to[0] - from[0]) * u);
  const gg = Math.round(from[1] + (to[1] - from[1]) * u);
  const b = Math.round(from[2] + (to[2] - from[2]) * u);
  return (r << 16) | (gg << 8) | b;
}

function drawSkylineRow(g, color, alpha, heights, canvasH, buildingW) {
  g.fillStyle(color, alpha);
  const tops = [];
  heights.forEach((height, i) => {
    const x = buildingW * i;
    const y = canvasH - height - 150; // lifted above the ground-haze band
    g.fillRect(x, y, buildingW - 6, height + 150);
    tops.push(y);
  });
  return tops;
}

function drawWindows(g, tops, canvasH, buildingW) {
  // A sparse, fixed pattern of lit windows rather than randomly
  // generated each build, so the skyline looks deliberate.
  const litPattern = [
    [1, 1], [1, 3], [2, 0], [2, 2], [3, 1], [4, 0], [4, 2],
    [5, 1], [5, 3], [6, 0], [7, 2], [8, 1], [9, 0], [9, 3],
    [10, 2], [11, 1], [12, 0], [13, 2], [14, 1]
  ];
  g.fillStyle(0xffd98a, 0.85);
  litPattern.forEach(([buildingIndex, row]) => {
    if (buildingIndex >= tops.length) return;
    const x = buildingW * buildingIndex + 14 + (row % 2) * 10;
    const y = tops[buildingIndex] + 20 + row * 26;
    if (y < canvasH - 40) g.fillRect(x, y, 6, 8);
  });
}

function generateExplosion(scene) {
  const size = 48;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0xfff3b0, 1);
  g.fillCircle(size / 2, size / 2, size * 0.18);
  g.fillStyle(0xffb84f, 0.85);
  g.fillCircle(size / 2, size / 2, size * 0.3);
  g.fillStyle(0xff6b3d, 0.6);
  g.fillCircle(size / 2, size / 2, size * 0.42);
  g.fillStyle(0xff3d3d, 0.35);
  g.fillCircle(size / 2, size / 2, size * 0.5);
  g.generateTexture('explosion', size, size);
  g.destroy();
}

function generateRealmBlock(scene, realm) {
  const key='realm-stone-'+realm.id;
  if(scene.textures.exists(key))return;
  const [stone,mortar,light]=realm.stone;
  const g=scene.make.graphics({x:0,y:0,add:false});
  g.fillStyle(mortar);g.fillRect(0,0,22,22);
  g.fillStyle(stone);g.fillRect(1,1,20,9);g.fillRect(1,12,20,9);
  g.fillStyle(mortar);g.fillRect(11,1,1,9);g.fillRect(5,12,1,9);
  g.fillStyle(light,0.7);g.fillRect(2,2,8,1);g.fillRect(7,13,12,1);
  g.fillStyle(mortar,0.4);g.fillRect(16,6,3,1);g.fillRect(9,18,3,1);
  g.generateTexture(key,22,22);g.destroy();
}

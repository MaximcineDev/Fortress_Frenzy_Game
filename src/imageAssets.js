import cityAtlas1 from './images/city-atlas-1.webp';
import cityAtlas2 from './images/city-atlas-2.webp';
import cityAtlas3 from './images/city-atlas-3.webp';
import cityAtlas4 from './images/city-atlas-4.webp';
import cityAtlas5 from './images/city-atlas-5.webp';
import flagAtlas from './images/flag-atlas.png';
// Importing these gives Vite-processed URLs (fingerprinted, bundled
// correctly for both `npm run dev` and the production build that
// Capacitor packages) rather than raw file paths, which would break
// once the build hashes/moves the files.

import iconSword from './images/icon-sword.png';
import iconFire from './images/icon-fire.png';
import iconBow from './images/icon-bow.png';
import iconSkull from './images/icon-skull.png';
import iconHeal from './images/icon-heal.png';
import iconMace from './images/icon-mace.png';
import iconIce from './images/icon-ice.png';
import iconHelmet from './images/icon-helmet.png';
import iconHeart from './images/icon-heart.png';
import iconCoin from './images/icon-coin.png';
import iconDiamond from './images/icon-diamond.png';

import portrait1p from './images/portrait-1p.png';
import portrait2p from './images/portrait-2p.png';

import bgTapToStart from './images/bg-tap-to-start.jpg';
import bgSplash from './images/bg-splash.jpg';
import bgMainMenu from './images/bg-main-menu.jpg';
import battleMedieval from './images/bg-battle-medieval-optimized.webp';
import knightSheet from './images/knights-sheet.png';
import realmAtlas from './images/realm-atlas-optimized.webp';

// key -> url, so a scene's preload() can just do
// Object.entries(IMAGE_ASSETS).forEach(([key, url]) => this.load.image(key, url))
export const IMAGE_ASSETS = {
  'city-atlas-1': cityAtlas1,
  'city-atlas-2': cityAtlas2,
  'city-atlas-3': cityAtlas3,
  'city-atlas-4': cityAtlas4,
  'city-atlas-5': cityAtlas5,
  'flag-atlas': flagAtlas,
  'icon-sword': iconSword,
  'icon-fire': iconFire,
  'icon-bow': iconBow,
  'icon-skull': iconSkull,
  'icon-heal': iconHeal,
  'icon-mace': iconMace,
  'icon-ice': iconIce,
  'icon-helmet': iconHelmet,
  'icon-heart': iconHeart,
  'icon-coin': iconCoin,
  'icon-diamond': iconDiamond,
  'portrait-1p': portrait1p,
  'portrait-2p': portrait2p,
  'bg-tap-to-start': bgTapToStart,
  'bg-splash': bgSplash,
  'bg-main-menu': bgMainMenu,
  'bg-battle-medieval': battleMedieval,
  'knight-sheet': knightSheet,
  'realm-atlas': realmAtlas
};

// Which icon represents each unit in the draft/battle UI. Purely
// cosmetic — doesn't affect any unit's stats.
export const UNIT_ICON_KEYS = {
  wrecker: 'icon-sword',
  bomber: 'icon-fire',
  scout: 'icon-bow',
  napalmer: 'icon-skull',
  fairy: 'icon-heal',
  crow: 'icon-mace',
  archer: 'icon-ice',
  catapult: 'icon-helmet'
};

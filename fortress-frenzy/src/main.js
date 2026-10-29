import { Billing } from './billing.js';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { handleGameBack } from './ui/navigation.js';
import Phaser from 'phaser';
import SplashScene from './scenes/SplashScene.js';
import StartScreen from './scenes/StartScreen.js';
import MainMenuScene from './scenes/MainMenuScene.js';
import ShopScene from './scenes/ShopScene.js';
import UpgradesScene from './scenes/UpgradesScene.js';
import OptionsScene from './scenes/OptionsScene.js';
import DraftScene from './scenes/DraftScene.js';
import OnlineLobbyScene from './scenes/OnlineLobbyScene.js';
import GameScene from './scenes/GameScene.js';
import CampaignScene from './scenes/CampaignScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 900,
  height: 600,
  backgroundColor: '#161826',
  input: { activePointers: 3 },
  dom: { createContainer: true },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  // No client-side physics engine on purpose: the server is the sole
  // authority on hit detection and damage (see server/trajectory.js) in
  // online mode, and src/localEngine.js reuses that same logic directly
  // in offline mode. The client only renders positions and outcomes.
  //
  // Scene flow: Splash (loads art + shows loading bar) -> StartScreen
  // (tap to start) -> MainMenu (Play jumps straight into an offline
  // match; Find Online Match connects to the server; Upgrades/Shop/
  // Options are their own scenes) -> Draft -> Game.
  scene: [SplashScene, StartScreen, MainMenuScene, ShopScene, UpgradesScene, OptionsScene, CampaignScene, OnlineLobbyScene, DraftScene, GameScene]
};

const game = new Phaser.Game(config);
if (import.meta.env.DEV) window.__castleGame = game;
if (Capacitor.isNativePlatform()) {
  App.addListener('backButton', () => handleGameBack(game, () => App.exitApp()));
}

// Retry completed pending transactions at startup and on Play/resume events.
if (Billing.supported()) {
  Billing.listen(() => Billing.recover().catch(() => {})).catch(() => {});
  Billing.recover().catch(() => {});
}

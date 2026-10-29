import ProfileScene from './scenes/ProfileScene.js';
import { Ads } from './ads.js';
import StudioIntroScene from './scenes/StudioIntroScene.js';
import { Music } from './music.js';
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
  callbacks: {
    postBoot(game) {
      // Keep the shared 900x600 game/input coordinates while filling the
      // viewport. ScaleManager also applies both axes to DOM form overlays.
      game.scale.displaySize.setAspectMode(Phaser.Structs.Size.NONE);
      const fitViewport = () => {
        game.scale.getParentBounds();
        game.scale.refresh();
      };
      fitViewport();
      const observer = new ResizeObserver(fitViewport);
      observer.observe(document.getElementById('game-container'));
      game.events.once('destroy', () => observer.disconnect());
    }
  },
  // No client-side physics engine on purpose: the server is the sole
  // authority on hit detection and damage (see server/trajectory.js) in
  // online mode, and src/localEngine.js reuses that same logic directly
  // in offline mode. The client only renders positions and outcomes.
  //
  // Scene flow: StudioIntro -> Splash (loads art + shows loading bar) -> StartScreen
  // (tap to start) -> MainMenu (Play jumps straight into an offline
  // match; Find Online Match connects to the server; Upgrades/Shop/
  // Options are their own scenes) -> Draft -> Game.
  scene: [StudioIntroScene, SplashScene, StartScreen, ProfileScene, MainMenuScene, ShopScene, UpgradesScene, OptionsScene, CampaignScene, OnlineLobbyScene, DraftScene, GameScene]
};

const game = new Phaser.Game(config);
Ads.attachGame(game);
if (import.meta.env.DEV) window.__castleGame = game;
if (Capacitor.isNativePlatform()) {
  App.addListener('backButton', () => handleGameBack(game, () => App.exitApp()));
}

// Retry completed pending transactions at startup and on Play/resume events.
if (Billing.supported()) {
  Billing.listen(() => Billing.recover().catch(() => {})).catch(() => {});
  Billing.recover().catch(() => {});
}

// A real user gesture unlocks music; never force autoplay during loading.
document.addEventListener('pointerdown',()=>Music.unlock(),{passive:true});
document.addEventListener('visibilitychange',()=>Music.setForeground(!document.hidden));
game.events.on('step',()=>{
 const key=game.scene.getScenes(true)[0]?.sys.settings.key || 'Splash';
 Music.setScene(key);
 if(key==='MainMenu'&&!game.registry.get('adsStarted')){game.registry.set('adsStarted',true);Ads.init();}
});
if(Capacitor.isNativePlatform())App.addListener('appStateChange',({isActive})=>Music.setForeground(isActive));

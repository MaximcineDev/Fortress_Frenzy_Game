import Phaser from 'phaser';
import { IMAGE_ASSETS } from '../imageAssets.js';
import { generateTextures } from '../assets.js';
import { SFX } from '../sound.js';
import { Storage } from '../storage.js';

// The bundled art here is tiny (a few hundred KB total), so real load
// progress would jump from 0% to 100% almost instantly and the bar
// would just flash — not much of a "loading animation". Instead this
// drives the bar with a fixed-duration tween (matching the feel of the
// reference mockup) and only leaves once BOTH that animation and the
// real asset load are done, so it's never lying about being ready.
const MIN_DISPLAY_MS = 1400;

export default class SplashScene extends Phaser.Scene {
  constructor() {
    super('Splash');
  }

  preload() {
    this.cameras.main.setBackgroundColor('#0e0f1a');

    const barW = 460, barH = 22;
    const barX = this.scale.width / 2;
    const barY = this.scale.height - 70;

    this.add.rectangle(barX, barY, barW, barH, 0x000000, 0.55).setStrokeStyle(2, 0xf0c860);
    this.fillBar = this.add.rectangle(barX - barW / 2 + 2, barY, 0, barH - 4, 0xf0c860).setOrigin(0, 0.5);
    this.add.text(barX, barY - 26, 'LOADING...', {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffffff'
    }).setOrigin(0.5);
    this.percentLabel = this.add.text(barX, barY + 24, '0%', {
      fontFamily: 'monospace', fontSize: '12px', color: '#cccccc'
    }).setOrigin(0.5);

    Object.entries(IMAGE_ASSETS).forEach(([key, url]) => this.load.image(key, url));

    this.barWidth = barW - 4;
    this.assetsReady = false;
    this.load.once('complete', () => { this.assetsReady = true; });
  }

  create() {
    // Assets are guaranteed loaded by the time create() runs (Phaser
    // waits for preload's queue to finish first) — safe to use bg-splash
    // now even though it was still "loading" a moment ago.
    const bg = this.add.image(450, 300, 'bg-splash').setDisplaySize(900, 600);
    this.children.sendToBack(bg);
    const knights = this.textures.get('knight-sheet');
    if (!knights.has('red')) {
      knights.add('red', 0, 0, 0, 627, 615);
      knights.add('blue', 0, 627, 0, 627, 627);
      knights.add('gold', 0, 0, 615, 627, 639);
      knights.add('green', 0, 627, 627, 627, 627);
    }
    const realms = this.textures.get('realm-atlas');
    const realmImage = realms.getSourceImage();
    const frameW = Math.floor(realmImage.width / 2), frameH = Math.floor(realmImage.height / 3);
    ['forest','snow','desert','volcano','coast','enchanted'].forEach((name, i) => {
      if (!realms.has(name)) realms.add(name, 0, (i % 2) * frameW, Math.floor(i / 2) * frameH, frameW, frameH);
    });
    generateTextures(this); // procedural game textures (stone blocks, cores, etc.)
    SFX.setMuted(Storage.get().sfxMuted);

    this.tweens.addCounter({
      from: 0, to: 100,
      duration: MIN_DISPLAY_MS,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        const v = tween.getValue();
        this.fillBar.width = this.barWidth * (v / 100);
        this.percentLabel.setText(Math.round(v) + '%');
      },
      onComplete: () => this.scene.start('StartScreen')
    });
  }
}

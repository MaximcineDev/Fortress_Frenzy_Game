import { loadProfile } from '../profile.js';
import { Music } from '../music.js';
import Phaser from 'phaser';

export default class StartScreen extends Phaser.Scene {
  constructor() {
    super('StartScreen');
  }

  create() {
    const bg = this.add.image(450, 300, 'bg-tap-to-start');
    // Source art is 991x598 vs. our 900x600 canvas — nearly the same
    // aspect ratio already, so a straight display-size match covers the
    // canvas cleanly without visible stretching.
    bg.setDisplaySize(900, 600);

    // A gentle pulse on the whole scene hints that it's tappable without
    // needing to touch the baked-in "TAP TO START" artwork itself.
    this.tweens.add({
      targets: bg,
      alpha: 0.85,
      duration: 900,
      yoyo: true,
      repeat: -1
    });

    this.starting = false;
    const pressed = this.add.rectangle(442, 514, 415, 82, 0x071321, 0)
      .setStrokeStyle(3, 0xffde79, 0).setName('start-pressed');
    const start = () => {
      if (this.starting) return;
      this.starting = true;
      Music.unlock();
      this.tweens.killTweensOf(bg);
      bg.setAlpha(1);
      pressed.setFillStyle(0x071321, 0.4).setStrokeStyle(3, 0xffde79, 1);
      this.tweens.add({ targets: bg, scaleX: bg.scaleX * 0.985, scaleY: bg.scaleY * 0.985, duration: 90, yoyo: true });
      this.time.delayedCall(280, () => this.scene.start(loadProfile()?'MainMenu':'Profile'));
    };
    this.input.once('pointerdown', start);
    this.input.keyboard?.once('keydown-ENTER', start);
    this.input.keyboard?.once('keydown-SPACE', start);
    this.events.once('shutdown',()=>{
      this.input.keyboard?.off('keydown-ENTER',start);
      this.input.keyboard?.off('keydown-SPACE',start);
    });
  }
}

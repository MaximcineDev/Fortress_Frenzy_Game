import Phaser from 'phaser';
import companyLogo from '../images/company-logo.png';

export default class StudioIntroScene extends Phaser.Scene {
  constructor() { super('StudioIntro'); }

  preload() {
    this.cameras.main.setBackgroundColor('#080c15');
    this.load.image('studio-logo', companyLogo);
  }

  create() {
    this.leaving = false;
    this.cameras.main.setBackgroundColor('#080c15');
    const group = this.add.container(450, 300).setAlpha(0);
    if (this.textures.exists('studio-logo')) {
      const texture = this.textures.get('studio-logo');
      // Visible bounds of the supplied PNG; keep the original file unchanged.
      if (!texture.has('wordmark')) texture.add('wordmark', 0, 247, 295, 1581, 560);
      group.add(this.add.image(0, -15, 'studio-logo', 'wordmark').setDisplaySize(650, 650 * 560 / 1581));
    } else {
      group.add(this.add.text(0, -15, 'MAXIMCINE STUDIOS', {
        fontFamily: 'Arial', fontSize: '38px', fontStyle: 'bold', color: '#f3c56b'
      }).setOrigin(0.5));
    }
    group.add(this.add.text(0, 145, 'P R E S E N T S', {
      fontFamily: 'Arial', fontSize: '16px', color: '#d9bd83'
    }).setOrigin(0.5));
    this.tweens.add({ targets: group, alpha: 1, duration: 600, ease: 'Sine.easeOut' });
    const finish = () => {
      if (this.leaving) return;
      this.leaving = true;
      this.tweens.killTweensOf(group);
      this.tweens.add({ targets: group, alpha: 0, duration: 500, ease: 'Sine.easeIn',
        onComplete: () => this.scene.start('Splash') });
    };
    this.time.delayedCall(1900, finish);
    // Allow a deliberate skip after the logo has begun to appear.
    const skip = () => { if (this.time.now - this.startedAt >= 600) finish(); };
    this.startedAt = this.time.now;
    this.input.on('pointerdown', skip);
    this.input.keyboard?.on('keydown-ENTER', skip);
    this.input.keyboard?.on('keydown-SPACE', skip);
    this.events.once('shutdown', () => {
      this.input.off('pointerdown', skip);
      this.input.keyboard?.off('keydown-ENTER', skip);
      this.input.keyboard?.off('keydown-SPACE', skip);
    });
  }
}

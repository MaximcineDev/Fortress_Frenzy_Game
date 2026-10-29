import { fortressPanel, fortressButton, fortressText } from '../ui/fortressTheme.js';
import Phaser from 'phaser';
import { MENU_BUTTONS } from '../ui/menuLayout.js';

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }

  create() {
    this.matchDialog = null;
    this.input.enabled = true;
    this.cameras.main.setBackgroundColor('#0e0f1a');
    // Show the original menu art once, unobscured by a second menu.
    this.add.image(450, 300, 'bg-main-menu').setDisplaySize(900, 600);
    MENU_BUTTONS.forEach(({ key, x, y, width, height }) => {
      const button = this.add.rectangle(x, y, width, height, 0xffffff, 0)
        .setDepth(10).setName('menu-' + key).setInteractive({ useHandCursor: true });
      button.on('pointerover', () => button.setFillStyle(0xffffff, 0.15));
      button.on('pointerout', () => button.setFillStyle(0xffffff, 0));
      button.on('pointerdown', (_pointer, _x, _y, event) => {
        event.stopPropagation();
        this.handleButton(key);
      });
    });
    // Online play lives under PLAY so the four illustrated menu options
    // remain the only menu layout.
    this.toast = this.add.text(450, 583, '', {
      fontFamily: 'Arial', fontSize: '13px', color: '#ffffff',
      backgroundColor: '#14243c', padding: { x: 10, y: 4 }
    }).setOrigin(0.5).setDepth(20).setAlpha(0);
  }

  handleButton(key) {
    this.registry.get('socket')?.disconnect();
    if (key === 'play') {
      // Keep offline and online choices inside the illustrated PLAY option.
      this.showMatchChoices();
      return;
    }
    const targetScene = { upgrades: 'Upgrades', shop: 'Shop', options: 'Options' }[key];
    if (targetScene) this.scene.start(targetScene);
  }

  showMatchChoices() {
    if (this.matchDialog) return;
    const group = this.add.container(0, 0).setDepth(50);
    this.matchDialog = group;
    const shade = this.add.rectangle(450, 300, 900, 600, 0x071222, 0.76).setInteractive();
    const panel = fortressPanel(this,450,300,500,390);
    const blocker = this.add.rectangle(450,300,500,390,0,0).setInteractive();
    group.add([shade, panel, blocker]);
    group.add(this.add.text(450, 150, 'CHOOSE YOUR BATTLE', fortressText(27)).setOrigin(0.5));
    const close = () => { group.destroy(true); this.matchDialog = null; this.closeMatchChoices = null; };
    this.closeMatchChoices = () => { this.registry.get('socket')?.disconnect(); close(); };
    const onEscape = () => this.closeMatchChoices?.();
    this.input.keyboard?.on('keydown-ESC', onEscape);
    this.events.once('shutdown', () => this.input.keyboard?.off('keydown-ESC', onEscape));
    const makeChoice = (y, text, action) => {
      const button = fortressButton(this,450,y,390,54,text,()=>action(button));
      group.add(button);
    };
    makeChoice(239, 'CAMPAIGN • 30 MISSIONS', () => { close(); this.scene.start('Campaign'); });
    makeChoice(304, 'QUICK BATTLE', () => { this.registry.remove('missionId'); this.registry.set('offlineMode', true); close(); this.scene.start('Draft'); });
    makeChoice(369, 'ONLINE DUEL', () => { close(); this.scene.start('OnlineLobby'); });
    makeChoice(434, 'BACK', () => { this.registry.get('socket')?.disconnect(); close(); });
  }

  showToast(message, persist = false) {
    this.toast.setText(message).setAlpha(1);
    this.tweens.killTweensOf(this.toast);
    if (!persist) {
      this.tweens.add({ targets: this.toast, alpha: 0, delay: 900, duration: 400 });
    }
  }
}

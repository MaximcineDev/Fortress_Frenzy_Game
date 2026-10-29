import { Ads } from '../ads.js';
import { Music } from '../music.js';
import { fortressBackdrop, fortressPanel, fortressButton, fortressText } from '../ui/fortressTheme.js';
import { addMenuBackButton } from '../ui/navigation.js';
import Phaser from 'phaser';
import { Storage } from '../storage.js';
import { SFX } from '../sound.js';

export default class OptionsScene extends Phaser.Scene {
  constructor() {
    super('Options');
  }

  create() {
    fortressBackdrop(this,'KINGDOM SETTINGS','Prepare your game before the next siege');
    addMenuBackButton(this);
    fortressPanel(this,450,330,600,390);
    this.confirmingReset = false;
    this.buildSfxRow();
    this.buildResetRow();
    this.buildMusicRow();
    if(Ads.supported && Ads.privacyRequired()) {
      fortressButton(this,450,564,300,44,'AD PRIVACY OPTIONS',async()=>{
        const ok=await Ads.privacy();
        if(this.sys.isActive()&&!ok)this.add.text(450,535,'Privacy options could not open. Please try again.',{fontFamily:'Arial',fontSize:'13px',color:'#ffe4a1'}).setOrigin(.5);
      },{size:15});
    }
  }

  buildSfxRow() {
    const y = 200;
    fortressPanel(this,450,y,530,90);
    this.add.text(210, y, 'Sound Effects', {
      fontFamily: 'Arial', fontSize: '16px', color: '#ffffff'
    }).setOrigin(0, 0.5);

    this.sfxBtn = fortressButton(this,635,y,120,48,'',()=> {
      const muted = !SFX.isMuted();
      SFX.setMuted(muted);
      Storage.set({ sfxMuted: muted });
      if (!muted) SFX.fire({ projectileSpeed: 20 }); // audible confirmation it's back on
      this.refreshSfxBtn();
    });

    this.refreshSfxBtn();
  }

  refreshSfxBtn() {
    const muted = SFX.isMuted();
    this.sfxBtn.setText(muted ? 'OFF' : 'ON').setStyle({
      backgroundColor: muted ? '#d94f4f' : '#4fd9a0',
      color: '#fff0bd'
    });
  }

  buildMusicRow() {
    fortressPanel(this,450,310,530,90);
    this.add.text(210,310,'Intro & Menu Music',{fontFamily:'Arial',fontSize:'16px',color:'#ffffff'}).setOrigin(0,0.5);
    this.musicBtn=fortressButton(this,635,310,120,48,Music.isMuted()?'OFF':'ON',()=>{
      Music.setMuted(!Music.isMuted());
      this.musicBtn.setText(Music.isMuted()?'OFF':'ON');
    });
  }

  buildResetRow() {
    const y = 420;
    fortressPanel(this,450,y,530,90);
    this.add.text(210, y, 'Reset Progress', {
      fontFamily: 'Arial', fontSize: '16px', color: '#ffffff'
    }).setOrigin(0, 0.5);
    this.add.text(210, y + 24, 'Coins, skins, upgrades and mission unlocks', {
      fontFamily: 'Arial', fontSize: '10px', color: '#bbcee0'
    }).setOrigin(0, 0.5);

    this.resetBtn = fortressButton(this,635,y,120,48,'RESET',()=>this.handleResetTap(),{red:true,size:16});
  }

  handleResetTap() {
    if (!this.confirmingReset) {
      this.confirmingReset = true;
      this.resetBtn.setText('TAP AGAIN\nTO CONFIRM').setStyle({ fontSize: '11px', align: 'center' });
      this.resetTimeout = this.time.delayedCall(3000, () => {
        this.confirmingReset = false;
        this.resetBtn.setText('RESET').setStyle({ fontSize: '14px' });
      });
      return;
    }

    if (this.resetTimeout) this.resetTimeout.remove();
    Storage.reset();
    this.confirmingReset = false;
    this.resetBtn.setText('RESET').setStyle({ fontSize: '14px' });
    SFX.setMuted(false);
    Music.setMuted(false);
    this.musicBtn.setText('ON');
    this.refreshSfxBtn();

    const toast = this.add.text(this.scale.width / 2, 510, 'Progress reset', {
      fontFamily: 'Arial', fontSize: '13px', color: '#f0c860'
    }).setOrigin(0.5);
    this.tweens.add({ targets: toast, alpha: 0, delay: 900, duration: 400 });
  }
}

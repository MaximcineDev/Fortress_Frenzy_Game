import { fortressBackdrop, fortressPanel, fortressButton, fortressText } from '../ui/fortressTheme.js';
import { addMenuBackButton } from '../ui/navigation.js';
import Phaser from 'phaser';
import { UNITS } from '../units.js';
import { UNIT_ICON_KEYS } from '../imageAssets.js';
import { Storage, MAX_LEVEL, DAMAGE_PER_LEVEL } from '../storage.js';
import { SFX } from '../sound.js';

export default class UpgradesScene extends Phaser.Scene {
  constructor() {
    super('Upgrades');
  }

  create() {
    fortressBackdrop(this, 'ROYAL ARMOURY', `+${Math.round(DAMAGE_PER_LEVEL * 100)}% damage / healing per level • Offline battles`);
    addMenuBackButton(this);
    fortressPanel(this,800,33,158,44);
    this.coinIcon = this.add.image(750,33,'icon-coin').setDisplaySize(25,25);
    this.coinText = this.add.text(775,33,'',fortressText(19)).setOrigin(0,0.5);
    this.cards = [];
    this.buildCards();
    this.refresh();
  }

  buildCards() {
    const cols = 4, cardW = 190, cardH = 205, gap = 16;
    const startX = (this.scale.width - (cols * cardW + (cols - 1) * gap)) / 2 + cardW / 2;
    const startY = 235;

    UNITS.forEach((unit, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);

      fortressPanel(this,x,y,cardW,cardH);
      this.add.image(x, y - 62, UNIT_ICON_KEYS[unit.id]).setDisplaySize(48, 48);
      this.add.text(x, y - 30, unit.name, {
        fontFamily: 'Arial', fontSize: '13px', color: '#ffffff'
      }).setOrigin(0.5);

      const pips = this.add.text(x, y - 6, '', {
        fontFamily: 'Arial', fontSize: '13px', color: '#f0c860'
      }).setOrigin(0.5);

      const statusText = this.add.text(x, y + 18, '', {
        fontFamily: 'Arial', fontSize: '11px', color: '#cccccc'
      }).setOrigin(0.5);

      const actionBtn = fortressButton(this,x,y+65,156,44,'UPGRADE',()=>this.handleUpgrade(unit.id),{size:15});

      this.cards.push({ unit, pips, statusText, actionBtn });
    });
  }

  handleUpgrade(unitId) {
    const before = Storage.unitLevel(unitId);
    if (before >= MAX_LEVEL) return;
    const result = Storage.upgradeUnit(unitId);
    if (result) {
      SFX.win();
    } else {
      SFX.hitBlock(); // insufficient funds
    }
    this.refresh();
  }

  refresh() {
    const data = Storage.get();
    this.coinText.setText(String(data.coins));

    this.cards.forEach(({ unit, pips, statusText, actionBtn }) => {
      const level = data.unitLevels[unit.id] || 0;
      pips.setText(`LEVEL ${level} / ${MAX_LEVEL}`);

      if (level >= MAX_LEVEL) {
        statusText.setText('Max level');
        actionBtn.setText('MAXED').setStyle({ backgroundColor: '#3a3a44', color: '#aab9c9' });
      } else {
        const cost = Storage.upgradeCost(level);
        statusText.setText(`Next: ${cost} coins`);
        const affordable = data.coins >= cost;
        actionBtn.setText('UPGRADE').setStyle({
          backgroundColor: affordable ? '#245d99' : '#3a3a44',
          color: affordable ? '#fff0bd' : '#aab9c9'
        });
      }
    });
  }
}

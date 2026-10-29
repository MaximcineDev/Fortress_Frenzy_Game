import { addMenuBackButton } from '../ui/navigation.js';
import Phaser from 'phaser';
import { UNITS } from '../units.js';
import { UNIT_ICON_KEYS } from '../imageAssets.js';

const DRAFT_SIZE = 8;

export default class DraftScene extends Phaser.Scene {
  constructor() {
    super('Draft');
  }

  create() {
    this.selected = UNITS.map(unit => unit.id);
    this.offlineMode = this.registry.get('offlineMode');
    const socket = this.registry.get('socket');
    this.transitioning = false;
    this.sentReady = false;
    this.onlineBindings = [];
    if (!this.offlineMode && !socket) { this.scene.start('OnlineLobby', { message: 'Connect to a server first.' }); return; }

    // Reuse the city skyline for visual consistency with the battle
    // screen, dimmed with an overlay so the cards and text stay readable
    // against it rather than competing with a bright, detailed backdrop.
    this.add.image(this.scale.width / 2, this.scale.height / 2, 'bg-battle-medieval').setDisplaySize(900, 600);
    this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x0a0b16, 0.55);

    this.add.text(this.scale.width / 2, 16, 'Draft Your Squad', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ffffff'
    }).setOrigin(0.5);

    addMenuBackButton(this);
    this.events.once('shutdown', () => { for (const [event, fn] of this.onlineBindings) socket?.off(event, fn); });
    this.counterText = this.add.text(this.scale.width / 2, 36, `${DRAFT_SIZE} / ${DRAFT_SIZE} selected — tap cards to adjust`, {
      fontFamily: 'monospace', fontSize: '12px', color: '#aaaaaa'
    }).setOrigin(0.5);

    // Sized for the 900x600 landscape canvas: the grid must start well
    // below the header text (previous version overlapped it, and since
    // cards were added after the counter text, they rendered on top and
    // hid it) and leave enough vertical room per card for the wrapped
    // description text not to spill past the card's edges.
    const cols = 4;
    const cardW = 170, cardH = 185, gap = 16;
    const startX = (this.scale.width - (cols * cardW + (cols - 1) * gap)) / 2 + cardW / 2;
    const startY = 150;

    this.cards = UNITS.map((unit, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);

      const rect = this.add.rectangle(x, y, cardW, cardH, unit.color, 0.7)
        .setStrokeStyle(2, unit.color)
        .setInteractive({ useHandCursor: true });

      this.add.image(x, y - 60, UNIT_ICON_KEYS[unit.id]).setDisplaySize(36, 36);
      this.add.text(x, y - 18, unit.name, {
        fontFamily: 'monospace', fontSize: '15px', color: '#ffffff'
      }).setOrigin(0.5);
      this.add.text(x, y + 8, unit.description, {
        fontFamily: 'monospace', fontSize: '10px', color: '#cccccc',
        wordWrap: { width: cardW - 20 }, align: 'center'
      }).setOrigin(0.5, 0);

      rect.on('pointerdown', () => this.toggleUnit(unit.id, rect));
      return rect;
    });

    this.readyBtn = this.add.text(this.scale.width / 2, this.scale.height - 26, 'READY UP', {
      fontFamily: 'monospace', fontSize: '18px', color: '#000000',
      backgroundColor: '#4fd9a0', padding: { x: 18, y: 8 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setAlpha(1);

    this.readyBtn.on('pointerdown', () => {
      if (this.selected.length !== DRAFT_SIZE) return;

      if (this.offlineMode) {
        // No server round-trip needed — just hand GameScene the units it
        // needs and let it build both castles locally.
        this.registry.set('startState', { myUnits: this.selected });
        this.scene.start('Game');
        return;
      }

      this.readyBtn.setText('Sending ready…').disableInteractive();
      socket.timeout(8000).emit('draftReady', { roomId: this.registry.get('roomId'), units: this.selected }, (error, result) => {
        if (!this.scene.isActive() || this.transitioning) return;
        if (error || !result?.ok) { this.readyBtn.setText('READY UP').setInteractive({ useHandCursor: true }); this.onlineStatus.setText(result?.message || 'Could not send Ready. Check the connection and retry.'); }
        else { this.sentReady = true; this.readyBtn.setText('Waiting for opponent…').disableInteractive(); }
      });
    });

    if (!this.offlineMode) {
      const opponentFlag=this.registry.get('opponentCountryCode');
      if(opponentFlag&&this.textures.get('flag-atlas').has(opponentFlag))this.add.image(450,480,'flag-atlas',opponentFlag).setDisplaySize(30,22);
      this.onlineStatus = this.add.text(450, 510, 'Opponent: ' + (this.registry.get('opponentName') || 'Knight') + ' • Both players must press Ready.', { fontFamily: 'Arial', fontSize: '14px', color: '#ffe4a1', align: 'center', wordWrap: { width: 800 } }).setOrigin(0.5);
      const bind = (event, fn) => { socket.on(event, fn); this.onlineBindings.push([event, fn]); };
      const startGame = startState => { if (this.transitioning) return; this.transitioning = true; this.registry.set('startState', startState); this.scene.start('Game'); };
      const updateState = state => {
        if (state.phase === 'playing' && state.startState) { startGame(state.startState); return; }
        this.sentReady = state.myReady;
        this.readyBtn.setText(state.myReady ? 'Waiting for opponent…' : 'READY UP');
        if (state.myReady || state.paused) this.readyBtn.disableInteractive(); else this.readyBtn.setInteractive({ useHandCursor: true });
        this.onlineStatus.setText(state.paused ? 'Waiting for the connection to recover…' : state.opponentReady ? 'Your opponent is ready. Press Ready to begin.' : 'Opponent: ' + state.opponentName + ' • Both players must press Ready.');
      };
      const expired = data => { if (!this.transitioning) { this.transitioning = true; this.scene.start('OnlineLobby', { message: data?.message || 'Room closed. Find another match.' }); } };
      bind('matchStart', ({ startState }) => startGame(startState));
      bind('draftStatus', updateState); bind('matchResumed', updateState); bind('roomState', updateState);
      bind('opponentDisconnected', () => { this.readyBtn.disableInteractive(); this.onlineStatus.setText('Opponent disconnected. Waiting up to 15 seconds…'); });
      bind('roomExpired', expired);
      bind('disconnect', () => { this.readyBtn.disableInteractive(); this.onlineStatus.setText('Connection lost. Reconnecting…'); });
      bind('connect', () => socket.timeout(8000).emit('requestState', {}, (error, state) => { if (!this.scene.isActive()) return; if (error || !state?.ok) expired(state); else updateState(state); }));
      const initial = this.registry.get('draftState'); if (initial) updateState(initial);
    }
  }

  toggleUnit(id, rect) {
    if (this.sentReady) return;
    const idx = this.selected.indexOf(id);
    if (idx >= 0) {
      this.selected.splice(idx, 1);
      rect.setFillStyle(rect.fillColor, 0.25);
    } else {
      if (this.selected.length >= DRAFT_SIZE) return;
      this.selected.push(id);
      rect.setFillStyle(rect.fillColor, 0.7);
    }
    this.counterText.setText(`${this.selected.length} / ${DRAFT_SIZE} selected`);
    this.readyBtn.setAlpha(this.selected.length === DRAFT_SIZE ? 1 : 0.4);
  }
}

import { addMenuBackButton } from '../ui/navigation.js';
import Phaser from 'phaser';
import { io } from 'socket.io-client';

// Point this at your deployed server, or 10.0.2.2 instead of localhost
// when testing in the Android emulator (localhost inside the emulator
// means the emulator itself, not your host machine).
export const SERVER_URL = 'http://localhost:3000';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.add.image(450, 300, 'sky-bg');

    addMenuBackButton(this);


    this.add.text(450, 160, 'CHOOSE MATCH TYPE', {
      fontFamily: 'monospace', fontSize: '32px', color: '#ffffff'
    }).setOrigin(0.5);

    this.statusText = this.add.text(450, 220, '', {
      fontFamily: 'monospace', fontSize: '14px', color: '#cccccc'
    }).setOrigin(0.5);

    const makeButton = (y, label, color, onTap) => {
      const btn = this.add.text(450, y, label, {
        fontFamily: 'monospace', fontSize: '20px', color: '#000000',
        backgroundColor: color, padding: { x: 24, y: 12 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      btn.on('pointerdown', onTap);
      return btn;
    };

    // Offline mode needs no server at all — it runs the same physics and
    // damage logic locally (src/localEngine.js) so you can verify drafting,
    // aiming, destruction, and win/lose without networking in the picture.
    makeButton(320, 'TEST OFFLINE', '#4fd9a0', () => {
      this.registry.set('offlineMode', true);
      this.scene.start('Draft');
    });

    makeButton(390, 'FIND ONLINE MATCH', '#3b6fd9', () => this.connectAndFindMatch());
  }

  connectAndFindMatch() {
    this.statusText.setText(`Connecting to ${SERVER_URL} ...`);
    const socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    this.registry.set('socket', socket);
    this.registry.set('offlineMode', false);

    socket.on('connect', () => {
      this.statusText.setText('Connected. Finding a match...');
      socket.emit('findMatch');
    });

    socket.on('connect_error', (err) => {
      this.statusText.setText(`Could not reach server (${err.message}).\nCheck the server is running and SERVER_URL is correct.`);
    });

    socket.on('matchFound', ({ roomId, playerIndex }) => {
      this.registry.set('roomId', roomId);
      this.registry.set('playerIndex', playerIndex);
      this.scene.start('Draft');
    });
  }
}

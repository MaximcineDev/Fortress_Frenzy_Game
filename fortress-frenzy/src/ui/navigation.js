// Use a real, generously sized hit area rather than the text's glyph bounds.
export function returnToMenu(scene) {
  const socket = scene.registry.get('socket');
  if (socket) {
    const roomId = scene.registry.get('roomId');
    if (socket.connected && roomId) socket.emit('leaveRoom', { roomId });
    socket.removeAllListeners();
    socket.disconnect();
  }
  scene.registry.remove('socket');
  scene.registry.remove('roomId');
  scene.time.paused = false;
  scene.tweens.paused = false;
  scene.scene.start('MainMenu');
}

export function addMenuBackButton(scene) {
  const button = scene.add.rectangle(91, 31, 146, 46, 0x162a43, 0.96)
    .setStrokeStyle(2, 0xe8c373).setDepth(1000)
    .setInteractive({ useHandCursor: true });
  scene.add.text(91, 31, '< MAIN MENU', {
    fontFamily: 'Arial', fontSize: '16px', fontStyle: 'bold', color: '#ffe6ac'
  }).setOrigin(0.5).setDepth(1001);
  button.setName('menu-back-button');
  button.on('pointerover', () => button.setFillStyle(0x315077));
  button.on('pointerout', () => button.setFillStyle(0x162a43));
  button.on('pointerdown', (_pointer, _x, _y, event) => {
    event.stopPropagation();
    returnToMenu(scene);
  });
  const onEscape = () => returnToMenu(scene);
  scene.input.keyboard?.on('keydown-ESC', onEscape);
  scene.events.once('shutdown', () => scene.input.keyboard?.off('keydown-ESC', onEscape));
  return button;
}

export function handleGameBack(game, onHome = () => {}) {
  const scene = game.scene.getScenes(true)[0];
  if (!scene) return;
  const key = scene.scene.key;
  if (key === 'MainMenu') {
    if (scene.matchDialog) scene.closeMatchChoices();
    else onHome();
  } else if (key === 'Shop' && scene.tab && scene.tab !== 'home') {
    scene.showTab('home');
  } else if (key !== 'Splash' && key !== 'StartScreen') {
    returnToMenu(scene);
  }
}

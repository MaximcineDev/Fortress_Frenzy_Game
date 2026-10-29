import { loadProfile } from '../profile.js';
import { Ads } from '../ads.js';
import { fortressPanel, fortressText } from '../ui/fortressTheme.js';
import { clampElevation, shotAngle, elevationFromPoint } from '../aiming.js';
import { addCombatControls } from '../ui/combatControls.js';
import { getMission, missionOutcome, completeMission, MISSION_COUNT, canPlayMission } from '../campaign.js';
import { buildMedievalWorld, animateCommanderAttack } from '../render/medievalWorld.js';
import { returnToMenu } from '../ui/navigation.js';
import Phaser from 'phaser';
import { simulateShot } from '../shared/trajectory.js';
import { getUnit } from '../units.js';
import { SFX } from '../sound.js';
import { createLocalMatch, pickBotShot } from '../localEngine.js';
import { UNIT_ICON_KEYS } from '../imageAssets.js';
import { Storage } from '../storage.js';
import { textureKeyForSkin, getSkin } from '../skins.js';

// Online mode: this scene does NOT decide who gets hit or how much damage
// lands — that's the server's job (see server/trajectory.js). This scene
// only draws whatever state and shot results the server sends.
//
// Offline mode: there is no server, so this scene drives a local match
// (src/localEngine.js) using the exact same physics/damage code the
// server uses, plus a simple bot opponent — good for verifying the game
// logic itself independently of networking.

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.time.paused = false;
    this.tweens.paused = false;
    this.lastImpactAt = 0;
    this.onlineBlocked = false;
    this.onlineNotice = null;
    this.resyncing = false;
    this.networkGeneration = (this.networkGeneration || 0) + 1;
    this.networkBindings = [];
    this.aimElevation = this.registry.get('resumeAimElevation') ?? 8;
    this.registry.remove('resumeAimElevation');
    this.aimHold = null;
    this.dragAimPointerId = null;
    this.aimGuide = null;
    this.combatControls = null;
    this.ending = false;
    this.battleReward = 0;
    this.battleClaimId = 'battle-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    this.bonusClaimed = false;
    this.rewardBusy = false;
    this.navigating = false;
    this.paused = false;
    this.localMatch = null;
    this.socket = null;
    this.cooldownLabels = [];
    this.unitButtons = [];
    this.elapsed = 0;
    this.resultScheduled = false;
    this.mission = null;
    this.wonMission = false;
    this.offlineMode = this.registry.get('offlineMode');
    const startState = this.registry.get('startState');
    const missionId = this.registry.get('missionId');
    this.mission = this.offlineMode && missionId ? getMission(missionId) : null;
    if (this.mission && !canPlayMission(this.mission.id)) {
      this.scene.start('Campaign', { page: Math.floor((this.mission.id - 1) / 10), missionToUnlock: this.mission.id });
      return;
    }
    this.registry.set('selectedSkin', Storage.get().selectedSkin);

    if (this.offlineMode) {
      this.myId = 'me';
      this.localMatch = createLocalMatch(this.mission);
      this.myUnits = startState.myUnits;
      startState.castles = {
        me: { side: 0, design: this.localMatch.castles.me.design, blocks: this.localMatch.castles.me.blocks, core: this.localMatch.castles.me.core },
        enemy: { side: 1, design: this.localMatch.castles.enemy.design, blocks: this.localMatch.castles.enemy.blocks, core: this.localMatch.castles.enemy.core }
      };
    } else {
      this.socket = this.registry.get('socket');
      this.roomId = this.registry.get('roomId');
      this.myId = this.socket.id;
      this.myUnits = startState.myUnits;
    }

    this.selectedUnitId = this.myUnits[0];
    this.lastFiredLocal = {};
    if (!this.offlineMode) for (const [id, remaining] of Object.entries(startState.cooldowns || {})) {
      const unit = getUnit(id); if (unit && remaining > 0) this.lastFiredLocal[id] = this.time.now - (unit.cooldownMs - remaining);
    }

    this.blockMaxHp = new Map();
    this.blockOwners = new Map();
    this.blockData = new Map();
    this.blockSprites = new Map(); // blockId -> Phaser image
    this.coreSprites = new Map();  // ownerId -> Phaser image
    this.coreData = new Map();     // ownerId -> {hp, maxHp, x, y}
    this.myOwnerId = null;
    this.enemyOwnerId = null;

    if(!this.offlineMode)this.registry.set('opponentCountryCode',startState.opponentCountryCode||startState.countries?.[Object.keys(startState.castles).find(id=>id!==this.myId)]||'');
    buildMedievalWorld(this, startState.castles, this.myId, this.mission);

    this.buildWorldFromState(startState);
    this.setupUI();
    const profile=loadProfile();
    const enemyId=Object.keys(startState.castles).find(id=>id!==this.myId);
    const identities=[{x:58,nameX:74,origin:0,name:profile?.name||'Knight',code:profile?.countryCode||''},
      {x:842,nameX:826,origin:1,name:this.offlineMode?(this.mission?.world.city.city||'Royal Guard'):(startState.names?.[enemyId]||startState.opponentName||'Knight'),code:this.offlineMode?(this.mission?.world.city.countryCode||''):(startState.countries?.[enemyId]||startState.opponentCountryCode||'')}];
    for(const identity of identities){
      if(identity.code&&this.textures.get('flag-atlas').has(identity.code))this.add.image(identity.x,10,'flag-atlas',identity.code).setDisplaySize(20,15).setDepth(9);
      const nameText=this.add.text(identity.nameX,10,identity.name,{fontFamily:'Arial',fontSize:'10px',fontStyle:'bold',color:'#fff0bd',stroke:'#15253b',strokeThickness:2}).setOrigin(identity.origin,.5).setDepth(9);
      if(nameText.width>112)nameText.setScale(112/nameText.width);
    }
    fortressPanel(this,285,25,160,38).setDepth(8);
    this.add.image(224,25,'icon-coin').setDisplaySize(24,24).setDepth(9);
    this.goldHud=this.add.text(249,25,'',fortressText(17)).setOrigin(0,0.5).setDepth(9).setName('hud-gold');
    const refreshGold=()=>{const coins=Storage.get().coins;this.goldHud.setText(coins.toLocaleString());this.goldHud.setFontSize(coins>=1000000?13:17);};
    refreshGold();
    const unsubscribeGold=Storage.subscribe(refreshGold);
    this.events.once('shutdown',unsubscribeGold);
    this.aimGuide = this.add.graphics().setDepth(3);
    this.combatControls = addCombatControls(this);
    this.setupInput();
    this.refreshAimGuide();
    const exit = this.add.text(450, 22, 'EXIT BATTLE', { fontSize: '14px', color: '#ffe4a1', backgroundColor: '#192437', padding: { x: 12, y: 8 } }).setOrigin(0.5).setInteractive();
    exit.on('pointerdown', () => returnToMenu(this));
    if (this.offlineMode) {
      const pause = this.add.text(590, 22, 'PAUSE', { fontSize: '14px', color: '#ffe4a1', backgroundColor: '#192437', padding: { x: 12, y: 8 } }).setOrigin(0.5).setInteractive();
      const shade = this.add.rectangle(450, 300, 900, 600, 0x071020, 0.85).setDepth(90).setVisible(false).setInteractive();
      const resume = this.add.text(450, 300, 'PAUSED • TAP TO RESUME', { fontSize: '24px', color: '#ffe4a1' }).setOrigin(0.5).setDepth(91).setVisible(false).setInteractive();
      const toggle = () => { if (this.ending) return; this.paused = !this.paused; this.aimHold = null; this.dragAimPointerId = null; this.refreshAimGuide(); this.time.paused = this.paused; this.tweens.paused = this.paused; shade.setVisible(this.paused); resume.setVisible(this.paused); };
      pause.on('pointerdown', toggle); resume.on('pointerdown', toggle);
    }
    this.events.once('shutdown', () => {
      for (const [event, fn] of this.networkBindings) this.socket?.off(event, fn);
    });

    if (this.offlineMode) {
      this.add.rectangle(450, 73, 870, 52, 0x142a3d, 0.87).setDepth(4);
      this.missionLabel = this.add.text(450, 61, this.mission ? 'MISSION ' + this.mission.id + ' • ' + this.mission.title + ' • ' + this.mission.world.city.city : 'QUICK BATTLE • Destroy the enemy commander', {
        fontFamily: 'monospace', fontSize: '12px', color: '#f0c860'
      }).setOrigin(0.5).setDepth(5);
      this.objectiveLabel = this.add.text(450, 83, (this.mission?this.mission.world.city.landmark+' • '+this.mission.description:null) || 'Aim with + / − or drag, then press FIRE.', { fontFamily: 'Arial', fontSize: '12px', color: '#e6edf1' }).setOrigin(0.5).setDepth(5);
      this.scheduleBotShot();
    } else {
      this.add.rectangle(450, 73, 870, 52, 0x142a3d, 0.87).setDepth(4);
      this.add.text(450, 61, 'ONLINE DUEL • ' + (startState.opponentName || this.registry.get('opponentName') || 'Knight'), { fontFamily: 'Arial', fontSize: '14px', color: '#ffe3a1' }).setOrigin(0.5).setDepth(5);
      this.add.text(450, 83, 'Unranked match • All units use base stats • Destroy the enemy commander', { fontFamily: 'Arial', fontSize: '12px', color: '#d9e8ef' }).setOrigin(0.5).setDepth(5);
      this.setupNetworking();
    }
  }

  buildWorldFromState(startState) {
    const myTextureKey = textureKeyForSkin(Storage.get().selectedSkin);
    const entries = Object.entries(startState.castles);
    for (const [ownerId, castle] of entries) {
      const isMine = ownerId === this.myId;
      if (isMine) this.myOwnerId = ownerId; else this.enemyOwnerId = ownerId;

      for (const block of castle.blocks) {
        const img = this.add.image(block.x, block.y, this.missionStoneKey || (isMine ? myTextureKey : 'tower-block-red'));
        if (this.mission && isMine && Storage.get().selectedSkin !== 'classic') img.setTint(getSkin(Storage.get().selectedSkin).colors[2]);
        this.blockSprites.set(block.id, img);
        this.blockData.set(block.id, { ...block });
        this.blockMaxHp.set(block.id, block.maxHp);
        this.blockOwners.set(block.id, ownerId);
      }

      const coreImg = this.add.image(castle.core.x, castle.core.y, 'knight-sheet', isMine ? 'red' : this.mission?.type === 'boss' ? 'green' : 'blue');
      coreImg.setDisplaySize(53, 53); // portraits are ~103x127 — scale down to fit the core's footprint
      this.coreSprites.set(ownerId, coreImg);
      this.coreData.set(ownerId, { ...castle.core });

      this.add.text(castle.core.x, castle.core.y - 32, isMine ? 'YOU' : 'ENEMY', {
        fontFamily: 'monospace', fontSize: '12px', color: isMine ? '#9db8ff' : '#ffb3ac'
      }).setOrigin(0.5);
    }

    this.myOrigin = {
      x: this.coreData.get(this.myOwnerId).x,
      y: this.coreData.get(this.myOwnerId).y - 30
    };
  }

  setupUI() {
    this.playerBar = this.buildHudBar(true);
    this.enemyBar = this.buildHudBar(false);
    this.updateHud();

    const barY = this.scale.height - 30;
    this.unitButtons = this.myUnits.map((id, i) => {
      const unit = getUnit(id);
      const x = 212 + i * 68;
      const ring = this.add.circle(x, barY, 17, 0x000000, 0.35).setStrokeStyle(2, unit.color);
      const icon = this.add.image(x, barY, UNIT_ICON_KEYS[id]).setDisplaySize(26, 26);
      ring.setDepth(6); icon.setDepth(7);
      ring.unitId = id;
      ring.setInteractive({ useHandCursor: true });
      ring.on('pointerdown', () => {
        this.selectedUnitId = id;
        this.refreshUnitButtons();
      });
      return ring;
    });
    this.add.rectangle(450, barY, 570, 48, 0x101b2d, 0.65).setDepth(-0.1);
    this.add.rectangle(450, 552, 900, 96, 0x101f2e, 0.93).setDepth(5);
    this.add.text(450, 520, 'Aim + / − or Up/Down keys • Fire / Space • Units 1–8', { fontSize: '12px', color: '#ffe4a1' }).setOrigin(0.5).setDepth(6);
    this.unitInfo = this.add.text(450, 541, '', { fontFamily: 'Arial', fontSize: '12px', color: '#ffffff', align: 'center', wordWrap: { width: 530 } }).setOrigin(0.5).setDepth(6);
    this.cooldownLabels = this.myUnits.map((id, i) => this.add.text(212 + i * 68, barY + 22, String(i + 1), { fontSize: '10px', color: '#ffffff' }).setOrigin(0.5).setDepth(7));
    const selectKey = event => { const id = this.myUnits[Number(event.key)-1]; if (id && !this.paused && !this.ending) { this.selectedUnitId = id; this.refreshUnitButtons(); } };
    this.input.keyboard?.on('keydown', selectKey);
    this.events.once('shutdown', () => this.input.keyboard?.off('keydown', selectKey));
    this.refreshUnitButtons();
  }

  // A compact status-HUD panel — portrait, framed bar, and an icon
  // marking what the bar represents — styled after a reference mockup.
  // Player's panel sits top-left, enemy's mirrors it top-right; the bar
  // itself is a real dynamically-resized rectangle (not a pre-baked
  // image), the same technique the splash-screen loading bar uses, so
  // it can actually reflect changing HP rather than being a static
  // picture of a full bar.
  buildHudBar(isPlayer) {
    const barW = 130, barH = 18;
    const portraitW = 34, portraitH = 42;
    const margin = 10;
    const y = margin + portraitH / 2;
    const accent = isPlayer ? 0xff6b6b : 0x6fa8ff;

    const portraitX = isPlayer ? margin + portraitW / 2 : this.scale.width - margin - portraitW / 2;
    const barX = isPlayer ? margin + portraitW + 8 : this.scale.width - margin - portraitW - 8 - barW;

    this.add.image(portraitX, y, isPlayer ? 'portrait-1p' : 'portrait-2p')
      .setDisplaySize(portraitW, portraitH);

    this.add.rectangle(barX + barW / 2, y, barW, barH, 0x1a1a24, 0.85)
      .setStrokeStyle(2, accent);
    const fill = this.add.rectangle(barX + 2, y, barW - 4, barH - 4, 0xd9484f)
      .setOrigin(0, 0.5);
    this.add.image(barX + 9, y, 'icon-heart').setDisplaySize(16, 16); // overlaps the bar's left edge, matching the reference mockup

    const label = this.add.text(barX + barW / 2, y, '', {
      fontFamily: 'monospace', fontSize: '10px', color: '#ffffff'
    }).setOrigin(0.5);

    return { fill, label, maxWidth: barW - 4 };
  }

  update(_time, delta) {
    this.updateCombatControls(delta);
    if (this.offlineMode && this.localMatch && !this.ending && !this.paused && !this.resultScheduled && !this.localMatch.isOver()) {
      this.elapsed += delta / 1000;
      if (this.mission?.timeLimit) {
        const left = Math.max(0, Math.ceil(this.mission.timeLimit - this.elapsed));
        this.objectiveLabel?.setText(this.mission.world.city.landmark+' • '+this.mission.description + ' • ' + left + 's left');
        if (!left) {
          this.localMatch.stop();
          this.endMatch('Time ran out. Regroup and try this mission again.');
          SFX.lose();
        }
      }
    }
    this.cooldownLabels?.forEach((label, i) => {
      const unit = getUnit(this.myUnits[i]);
      const remaining = Math.max(0, unit.cooldownMs - (this.time.now - (this.lastFiredLocal[unit.id] ?? -Infinity)));
      label.setText(remaining ? (remaining/1000).toFixed(1) + 's' : String(i+1));
      this.unitButtons[i].setAlpha(remaining ? 0.4 : 1);
    });
  }

  refreshUnitButtons() {
    this.refreshAimGuide();
    this.unitInfo?.setText(getUnit(this.selectedUnitId).name + ' • ' + getUnit(this.selectedUnitId).description);
    this.unitButtons.forEach(btn => {
      btn.setStrokeStyle(btn.unitId === this.selectedUnitId ? 3 : 0, 0xffffff);
    });
  }

  updateHud() {
    const mine = this.coreData.get(this.myOwnerId);
    const enemy = this.coreData.get(this.enemyOwnerId);
    this.applyHudBar(this.playerBar, mine);
    this.applyHudBar(this.enemyBar, enemy);
  }

  applyHudBar(bar, data) {
    const ratio = Phaser.Math.Clamp(data.hp / data.maxHp, 0, 1);
    bar.fill.width = bar.maxWidth * ratio;
    bar.label.setText(`${Math.max(0, Math.round(data.hp))}/${data.maxHp}`);
  }

  canAdjustAim() {
    return !this.ending && !this.paused && !this.onlineBlocked && !this.resultScheduled && !this.localMatch?.isOver() && !getUnit(this.selectedUnitId)?.heal;
  }

  aimFromPointer(pointer) {
    if (!this.canAdjustAim()) return false;
    const elevation = elevationFromPoint(this.myOrigin, {x:pointer.worldX,y:pointer.worldY}, this.aimDirection());
    if (elevation === null) return false;
    this.aimElevation = elevation;
    this.refreshAimGuide();
    return true;
  }

  aimDirection() { return this.coreData.get(this.enemyOwnerId).x > this.myOrigin.x ? 1 : -1; }

  changeAim(amount) {
    if (!this.canAdjustAim()) return;
    this.aimElevation = clampElevation(this.aimElevation + amount);
    this.refreshAimGuide();
  }

  refreshAimGuide() {
    if (!this.aimGuide || !this.myOrigin) return;
    this.aimGuide.clear();
    if (this.ending || this.paused || this.onlineBlocked || this.resultScheduled) return;
    const unit=getUnit(this.selectedUnitId);
    if (unit.heal) {
      this.aimGuide.lineStyle(2,0x94ffb3,0.8);
      const core=this.coreData.get(this.myOwnerId);
      this.aimGuide.strokeCircle(core.x,core.y,30);
      return;
    }
    const blocks=[...this.blockData.values()].filter(block=>block.owner===this.enemyOwnerId);
    const result=simulateShot(unit,this.myOrigin.x,this.myOrigin.y,shotAngle(this.aimElevation,this.aimDirection()),blocks,this.coreData.get(this.enemyOwnerId));
    result.points.forEach((point,i)=>{
      if(i%3===0&&point.y>=100&&point.y<504){
        this.aimGuide.fillStyle(0x172c43,0.9);this.aimGuide.fillCircle(point.x,point.y,3.5);
        this.aimGuide.fillStyle(0xffdf68,1);this.aimGuide.fillCircle(point.x,point.y,2);
      }
    });
    const impact=result.points.at(-1);
    if(impact.y>=100&&impact.y<504){
      this.aimGuide.lineStyle(2,result.hitCore||result.hitBlockIds.length?0xffcf66:0xffffff,0.8);
      this.aimGuide.strokeCircle(impact.x,impact.y,8);
    }
  }

  updateCombatControls(delta) {
    const c=this.combatControls;
    if (!c) return;
    if (this.canAdjustAim()) {
      const keyboardDirection=Number(this.aimKeys?.up.isDown||false)-Number(this.aimKeys?.down.isDown||false);
      if (keyboardDirection) this.changeAim(keyboardDirection*25*Math.min(delta,80)/1000);
      else if (this.aimHold) {
        this.aimHold.elapsed+=delta;
        if(this.aimHold.elapsed>220)this.changeAim(this.aimHold.direction*25*Math.min(delta,80)/1000);
      }
    } else this.aimHold=null;
    const unit=getUnit(this.selectedUnitId);
    const remaining=Math.max(0,unit.cooldownMs-(this.time.now-(this.lastFiredLocal[unit.id]??-Infinity)));
    const stopped=this.ending||this.paused||this.onlineBlocked||this.resultScheduled||this.localMatch?.isOver();
    c.fire.text.setText(unit.heal?'REPAIR':'FIRE');
    c.status.setText(this.ending||this.resultScheduled?'BATTLE OVER':this.paused?'PAUSED':this.onlineBlocked?'RECONNECTING':remaining?(remaining/1000).toFixed(1)+'s':'READY');
    c.fire.box.setFillStyle(stopped||remaining?0x3c4d5a:0x947025);
    c.angle.setText(unit.heal?'SUPPORT': 'AIM\n'+this.aimElevation.toFixed(1)+'°');
    c.up.box.setAlpha(stopped||unit.heal?0.4:1);c.down.box.setAlpha(stopped||unit.heal?0.4:1);
  }

  setupInput() {
    this.input.on('pointerdown',(pointer,objects)=>{
      if(!objects.length&&pointer.worldY>100&&pointer.worldY<504&&this.canAdjustAim()){
        this.dragAimPointerId=pointer.id;this.aimFromPointer(pointer);
      }
    });
    this.input.on('pointermove',pointer=>{
      if(this.dragAimPointerId===pointer.id&&pointer.isDown&&pointer.worldY>100&&pointer.worldY<504)this.aimFromPointer(pointer);
    });
    const release=pointer=>{
      if(this.dragAimPointerId===pointer.id)this.dragAimPointerId=null;
      if(this.aimHold?.id===pointer.id)this.aimHold=null;
    };
    this.input.on('pointerup',release);this.input.on('pointerupoutside',release);
    this.input.on('gameout',()=>{this.dragAimPointerId=null;this.aimHold=null;});
    if(this.input.keyboard){
      this.aimKeys=this.input.keyboard.addKeys({up:'UP',down:'DOWN'});
      this.input.keyboard.addCapture(['UP','DOWN','SPACE']);
      const fireKey=event=>{if(!event.repeat)this.tryFire();};
      this.input.keyboard.on('keydown-SPACE',fireKey);
      this.events.once('shutdown',()=>{
        this.input.keyboard.off('keydown-SPACE',fireKey);
        this.input.keyboard.removeCapture(['UP','DOWN','SPACE']);
        this.aimHold=null;this.dragAimPointerId=null;
      });
    }
  }

  tryFire(pointer = null) {
    if (this.ending || this.paused || this.onlineBlocked || this.resultScheduled || this.localMatch?.isOver()) return false;
    if (pointer && !this.aimFromPointer(pointer)) return false;
    const unit=getUnit(this.selectedUnitId),now=this.time.now;
    if(now-(this.lastFiredLocal[unit.id]??-Infinity)<unit.cooldownMs)return false;
    const angle=shotAngle(this.aimElevation,this.aimDirection());
    if(this.offlineMode){
      const result=this.localMatch.fire('me',unit.id,angle);
      if(!result)return false;
      this.handleShotResult(result);
    } else {
      if(!this.socket?.connected)return false;
      const generation = this.networkGeneration;
      this.socket.timeout(5000).emit('playerShot',{roomId:this.roomId,unitId:unit.id,angle},(error,result)=>{
        if (generation !== this.networkGeneration || !this.scene.isActive() || this.ending) return;
        if (result?.code === 'cooldown') this.lastFiredLocal[unit.id] = this.time.now - (unit.cooldownMs - result.remainingMs);
        else if (error || !result?.ok) this.requestOnlineState();
      });
    }
    this.lastFiredLocal[unit.id]=now;
    SFX.fire(unit);
    return true;
  }

  scheduleBotShot() {
    const delay = this.mission ? this.mission.botDelay + Math.random() * 300 : 1100 + Math.random() * 700;
    this.time.delayedCall(delay, () => {
      if (this.localMatch.isOver()) return;
      const { unitId, angle } = pickBotShot(this.localMatch, this.mission);
      const result = this.localMatch.fire('enemy', unitId, angle);
      if (result) this.handleShotResult(result);
      if (!this.localMatch.isOver()) this.scheduleBotShot();
    });
  }

  handleShotResult(results) {
    results.forEach((result, index) => this.time.delayedCall(index * (getUnit(result.unitId).burstDelayMs || 0), () => this.handleSingleResult(result)));
  }

  handleSingleResult(result) {
    this.playShot(result.shooterSide, result.unitId, result.points, result.updates);
    if (result.matchOver && !this.resultScheduled) {
      this.resultScheduled = true;
      this.refreshAimGuide();
      const won = result.winnerSide === 'me';
      let message;
      if (this.mission) {
        const core = this.localMatch.castles.me.core;
        const outcome = missionOutcome(this.mission, { won, hp: core.hp, maxHp: core.maxHp, elapsed: this.elapsed });
        this.wonMission = outcome.success;
        this.earnedStars = outcome.stars;
        if (outcome.success) {
          const completed = completeMission(this.mission.id, outcome.stars);
          this.battleReward = completed.reward;
          message = 'MISSION COMPLETE!\n' + ' ' + '\n+' + completed.reward + ' gold' + (completed.finished ? '\nThe Six Realms are yours!' : canPlayMission(this.mission.id + 1) ? ' • Next mission ready' : ' • Unlock the next mission with coins');
        } else message = outcome.reason;
      } else {
        if (won) { Storage.addCoins(40); this.battleReward = 40; }
        message = won ? 'Victory! Enemy commander defeated. +40 gold' : 'Your commander fell. Try again!';
      }
      this.time.delayedCall((result.points.length - 1) * 1000 / 30 + 350, () => {
        this.endMatch(message);
        (this.mission ? this.wonMission : won) ? SFX.win() : SFX.lose();
      });
    }
  }

  setOnlineBlocked(blocked, message = '') {
    this.onlineBlocked = blocked; this.aimHold = null; this.dragAimPointerId = null;
    this.refreshAimGuide();
    if (!blocked) { this.onlineNotice?.destroy(true); this.onlineNotice = null; return; }
    if (this.ending) return;
    if (!this.onlineNotice) {
      const group = this.add.container(0,0).setDepth(70); this.onlineNotice = group;
      group.add(this.add.rectangle(450,300,900,600,0x071526,0.77).setInteractive());
      group.add(this.add.rectangle(450,295,620,200,0x20394d).setStrokeStyle(2,0xe4c37e));
      this.onlineNoticeText = this.add.text(450,270,'',{fontFamily:'Arial',fontSize:'21px',color:'#ffe5a1',align:'center',wordWrap:{width:560}}).setOrigin(0.5); group.add(this.onlineNoticeText);
      const exit = this.add.rectangle(450,355,220,44,0x365e77).setStrokeStyle(1,0xe4c37e).setInteractive({useHandCursor:true});group.add(exit);
      group.add(this.add.text(450,355,'LEAVE MATCH',{fontFamily:'Arial',fontSize:'16px',color:'#ffffff'}).setOrigin(0.5));exit.on('pointerdown',()=>returnToMenu(this));
    }
    this.onlineNoticeText.setText(message);
  }

  requestOnlineState() {
    const generation = this.networkGeneration;
    if (!this.socket?.connected || this.ending || this.resyncing) return;
    this.socket.timeout(8000).emit('requestState',{},(error,state)=>{
      if(generation!==this.networkGeneration||!this.scene.isActive()||this.ending)return;
      if(error||!state?.ok)this.endMatch('This match could not be restored. Return to the menu and find another opponent.');
      else this.restoreOnlineState(state);
    });
  }

  restoreOnlineState(state) {
    if(this.ending||this.resyncing)return;
    if(state.phase==='finished') { this.finishOnlineMatch(state.winnerId,'recovered-result'); return; }
    if(state.paused){this.setOnlineBlocked(true,'Waiting for the other player to reconnect…');return;}
    if(state.phase!=='playing'||!state.startState){this.endMatch('This match is no longer running.');return;}
    this.resyncing=true;this.registry.set('startState',state.startState);this.registry.set('resumeAimElevation',this.aimElevation);this.scene.restart();
  }

  finishOnlineMatch(winnerId, reason) {
    if(this.ending||this.resultScheduled)return;
    this.resultScheduled=true;this.setOnlineBlocked(false);this.refreshAimGuide();
    const won=winnerId===this.myId;
    const message=won?(reason==='core-destroyed'?'Victory! Enemy commander defeated.':reason==='recovered-result'?'Victory! You won the duel.':'Victory! Your opponent left or could not reconnect.'):'Defeat. Your opponent won the duel.';
    this.time.delayedCall(Math.max(0,(this.lastImpactAt||0)-this.time.now)+300,()=>this.endMatch(message));
    won?SFX.win():SFX.lose();
  }

  setupNetworking() {
    const generation=this.networkGeneration;
    const bind=(event,handler)=>{const fn=(...args)=>{if(generation===this.networkGeneration&&this.scene.isActive())handler(...args);};this.socket.on(event,fn);this.networkBindings.push([event,fn]);};
    bind('shotResolved',({shooterId,unitId,points,updates})=>{
      this.playShot(shooterId,unitId,points,updates);this.lastImpactAt=Math.max(this.lastImpactAt||0,this.time.now+(points.length-1)*1000/30);
    });
    bind('disconnect',()=>{
      this.setOnlineBlocked(true,'Connection lost. Trying to reconnect…');
      this.time.delayedCall(17000,()=>{if(!this.ending&&!this.socket.connected)this.endMatch('Connection recovery timed out. Return to the menu to reconnect.');});
    });
    bind('connect',()=>this.requestOnlineState());
    bind('opponentDisconnected',()=>this.setOnlineBlocked(true,'Opponent disconnected. Waiting up to 15 seconds…'));
    bind('matchResumed',state=>this.restoreOnlineState(state));
    bind('roomState',state=>this.restoreOnlineState(state));
    bind('roomExpired',({message})=>this.endMatch(message||'The match has expired.'));
    bind('matchOver',({winnerId,reason})=>this.finishOnlineMatch(winnerId,reason));
  }

  playShot(shooterId, unitId, points, updates) {
    const unit = getUnit(unitId);
    const isMine = shooterId === this.myId;
    animateCommanderAttack(this, shooterId, !!unit.heal);
    const sprite = this.add.image(points[0].x, points[0].y, 'proj-basic');
    sprite.setTint(unit.color).setDepth(4);

    const frameDurationMs = 1000 / 30; // points were sampled every other frame at 60fps
    let i = 0;
    this.time.addEvent({
      delay: frameDurationMs,
      repeat: points.length - 2,
      callback: () => {
        i++;
        if (points[i]) sprite.setPosition(points[i].x, points[i].y);
      }
    });

    this.time.delayedCall(frameDurationMs * (points.length - 1), () => {
      sprite.destroy();
      const impact = points[points.length - 1];
      if (updates.length && !unit.heal) this.cameras.main.shake(90, 0.002);
      this.spawnImpactFX(impact.x, impact.y, unit);
      this.applyUpdates(updates, unit, isMine);
    });
  }

  spawnImpactFX(x, y, unit) {
    const fx = this.add.image(x, y, 'explosion').setScale(0.4).setAlpha(0.9);
    this.tweens.add({
      targets: fx,
      scale: unit.splashRadius > 0 ? 1.6 : 0.9,
      alpha: 0,
      duration: 300,
      onComplete: () => fx.destroy()
    });
    if (!unit.heal) {
      for (let i = 0; i < 5; i++) {
        const chip = this.add.rectangle(x, y, 4, 4, 0xd2c3a0).setDepth(4);
        this.tweens.add({ targets: chip, x: x + (Math.random() - 0.5) * 70, y: y + Math.random() * 48, angle: Math.random() * 180, alpha: 0, duration: 400, onComplete: () => chip.destroy() });
      }
    }
    unit.heal ? SFX.heal() : (unit.splashRadius > 0 ? SFX.explosion() : SFX.hitBlock());
  }

  applyUpdates(updates) {
    for (const u of updates) {
      const block=this.blockData.get(u.id);
      if(block)Object.assign(block,u);
      if (u.id.startsWith('core_')) {
        const ownerId = this.ownerFromCoreId(u.id);
        const prev = this.coreData.get(ownerId) || {};
        this.coreData.set(ownerId, { ...prev, hp: u.hp, alive: u.alive });
        const coreSprite = this.coreSprites.get(ownerId);
        if (coreSprite) {
          this.tweens.add({ targets: coreSprite, alpha: 0.4, duration: 80, yoyo: true });
          if (!u.alive) coreSprite.setTint(0x444444);
          const knight = this.commanderKnights.get(ownerId);
          if (knight) {
            this.tweens.add({ targets: knight, alpha: 0.45, duration: 100, yoyo: true });
            if (!u.alive) knight.setTint(0x777777);
          }
        }
      } else {
        const sprite = this.blockSprites.get(u.id);
        if (!sprite) continue;
        if (!u.alive) {
          this.tweens.add({
            targets: sprite, alpha: 0, scale: 0.4, duration: 200,
            onComplete: () => sprite.destroy()
          });
          this.blockSprites.delete(u.id);
        } else {
          const dmgRatio = u.hp / (this.blockMaxHp.get(u.id) || 30);
          sprite.setAlpha(0.5 + 0.5 * dmgRatio);
        }
      }
    }
    for (const [owner, decor] of this.castleDetails) {
      const total = [...this.blockOwners.values()].filter(id => id === owner).length;
      const alive = [...this.blockSprites.keys()].filter(id => this.blockOwners.get(id) === owner).length;
      decor.setAlpha(alive < total * 0.4 ? 0.25 : 1);
    }
    this.updateHud();
    this.refreshAimGuide();
  }

  ownerFromCoreId(coreId) {
    // core ids are `core_<ownerId>` — ownerId itself may contain
    // underscores, so strip only the known prefix.
    return coreId.slice('core_'.length);
  }

  async navigateAfterBattle(action) {
    if(this.rewardBusy || this.navigating || Ads.isBusy())return;
    this.navigating=true;
    if(this.offlineMode)await Ads.interstitial();
    if(this.sys.isActive())action();
  }

  endMatch(message) {
    if (this.ending) return;
    this.ending = true;
    if (this.offlineMode) Ads.recordBattle();
    this.onlineNotice?.destroy(true); this.onlineNotice = null; this.onlineBlocked = false;
    this.aimHold = null;
    this.dragAimPointerId = null;
    this.aimGuide?.clear();
    this.time.removeAllEvents();
    this.aiming = false;
    this.input.removeAllListeners('pointerup');
    this.input.removeAllListeners('pointerdown'); // stop tryFire from firing into a finished match

    this.time.paused = false;
    this.tweens.paused = false;
    this.add.rectangle(450, 300, 900, 600, 0x081625, 0.84).setDepth(100).setInteractive();
    this.add.rectangle(450, 300, 640, 420, 0x20394d).setStrokeStyle(3, 0xe4c37e).setDepth(101);
    this.add.text(450, 247, message, {
      fontFamily: 'Arial', fontSize: '22px', color: '#ffe4a1', align: 'center',
      wordWrap: { width: 560 }, lineSpacing: 8
    }).setOrigin(0.5).setDepth(102);
    if (this.mission && this.wonMission) {
      for (let i = 0; i < 3; i++) this.add.star(414 + i * 36, 247, 5, 6, 14, i < this.earnedStars ? 0xffd56a : 0x4a6170).setStrokeStyle(1, 0xffd56a).setDepth(104);
    }
    const makeButton = (x, label, onTap) => {
      const box = this.add.rectangle(x, 382, 174, 48, 0x365e77).setStrokeStyle(1,0xe4c37e).setDepth(102).setInteractive({useHandCursor:true});
      this.add.text(x, 382, label, {fontFamily:'Arial',fontSize:'15px',fontStyle:'bold',color:'#ffffff'}).setOrigin(0.5).setDepth(103);
      box.on('pointerdown', () => this.navigateAfterBattle(onTap));
    };
    if (this.offlineMode && this.battleReward > 0 && Ads.supported) {
      const bonus = this.add.rectangle(450,448,390,46,0x996b23).setStrokeStyle(2,0xffd875).setDepth(102).setInteractive({useHandCursor:true}).setName('double-reward-button');
      const label = this.add.text(450,448,`WATCH AD • +${this.battleReward} GOLD (2× TOTAL)`,{fontFamily:'Arial',fontSize:'16px',fontStyle:'bold',color:'#fff0bd'}).setOrigin(.5).setDepth(103);
      const status=this.add.text(450,488,'Optional • Complete the ad to earn the bonus',{fontFamily:'Arial',fontSize:'13px',color:'#d9e5ef',align:'center',wordWrap:{width:590}}).setOrigin(.5).setDepth(103);
      bonus.on('pointerdown',async()=>{
        if(this.rewardBusy||this.bonusClaimed||this.navigating||Ads.isBusy())return;
        this.rewardBusy=true;label.setText('LOADING REWARD AD...');
        const result=await Ads.reward(this.battleClaimId,this.battleReward);
        if(!this.sys.isActive())return;
        this.bonusClaimed=(Storage.get().adRewardReceipts||[]).includes(this.battleClaimId);
        this.rewardBusy=false;
        if(this.bonusClaimed){label.setText('BONUS CLAIMED');bonus.disableInteractive();status.setText(`+${this.battleReward} bonus gold added • ${this.battleReward*2} gold total`);SFX.win();}
        else {label.setText(`WATCH AD • +${this.battleReward} GOLD (2× TOTAL)`);status.setText(result.status==='closed'?'Ad closed before completion. You can try again.':'No reward ad is available right now. Your earned gold is safe.');}
      });
    }
    if (this.mission) {
      makeButton(250, 'RETRY MISSION', () => this.scene.restart());
      makeButton(450, 'MISSIONS', () => this.scene.start('Campaign'));
      if (this.wonMission && this.mission.id < MISSION_COUNT) {
        const nextId = this.mission.id + 1;
        makeButton(650, canPlayMission(nextId) ? 'NEXT MISSION' : 'UNLOCK NEXT', () => {
          if (canPlayMission(nextId)) { this.registry.set('missionId', nextId); this.scene.restart(); }
          else this.scene.start('Campaign', { page: Math.floor((nextId - 1) / 10), missionToUnlock: nextId });
        });
      } else makeButton(650, 'MAIN MENU', () => returnToMenu(this));
    } else if (this.offlineMode) {
      makeButton(350, 'PLAY AGAIN', () => this.scene.restart());
      makeButton(550, 'MAIN MENU', () => returnToMenu(this));
    } else {
      this.socket.emit('leaveRoom', {roomId:this.roomId});
      makeButton(450, 'MAIN MENU', () => returnToMenu(this));
    }
  }
}

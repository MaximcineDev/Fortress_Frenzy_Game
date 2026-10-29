import { fortressBackdrop, fortressPanel, fortressButton, fortressText } from '../ui/fortressTheme.js';
import { COIN_PACKS } from '../coinPacks.js';
import { Billing } from '../billing.js';
import { addMenuBackButton } from '../ui/navigation.js';
import Phaser from 'phaser';
import { SKINS, textureKeyForSkin } from '../skins.js';
import { Storage } from '../storage.js';
import { SFX } from '../sound.js';

export default class ShopScene extends Phaser.Scene {
  constructor() {
    super('Shop');
  }

  create() {
    fortressBackdrop(this,'ROYAL MARKET','Stock your treasury or customise your fortress');
    addMenuBackButton(this);
    fortressPanel(this,800,33,158,44);
    this.add.image(750,33,'icon-coin').setDisplaySize(25,25);
    this.coinText=this.add.text(775,33,'',fortressText(18)).setOrigin(0,0.5);
    this.products = new Map();
    this.busy = false;
    this.activeShop = true;
    this.cards=[];
    this.shopContent=[];
    this.message=this.add.text(450,550,'', {fontFamily:'Arial',fontSize:'15px',color:'#fff0bd',align:'center',wordWrap:{width:780}}).setOrigin(0.5);
    this.showTab('home');
    this.loadBilling();
    Billing.listen(()=>this.recoverPurchases()).then(listener=>{
      if(!this.activeShop) listener.remove(); else this.purchaseListener=listener;
    });
    this.events.once('shutdown',()=>{this.activeShop=false;this.purchaseListener?.remove();});
  }

  async loadBilling() {
    if(!Billing.supported()) return;
    this.message.setText('Connecting to Google Play...');
    try {
      const products=await Billing.products();
      if(!this.activeShop)return;
      this.products=new Map(products.map(p=>[p.id,p]));
      this.showTab(this.tab);
      this.updateShopMessage();
      await this.recoverPurchases();
    } catch(e) { if(this.activeShop)this.message.setText(e.message || 'Google Play is unavailable. Please try again.'); }
  }

  showTab(tab) {
    this.shopContent.forEach(o=>o.destroy());this.shopContent=[];this.cards=[];this.tab=tab;
    // Keep card objects together so switching tabs clears every old hit area.
    const before=new Set(this.children.list);
    if(tab==='home')this.buildCategories();
    else {
      fortressButton(this,180,150,220,46,'< SHOP CATEGORIES',()=>this.showTab('home'),{size:15});
      this.add.text(570,150,tab==='coins'?'GOLD PACKS':'CASTLE SKINS',fortressText(25)).setOrigin(0.5);
      if(tab==='skins')this.buildSkinCards();else this.buildCoinCards();
    }
    this.shopContent=this.children.list.filter(o=>!before.has(o));
    this.refresh();
    this.updateShopMessage();
  }

  updateShopMessage() {
    if(this.tab==='home')this.message.setText('Choose a shop category to explore.');
    else if(this.tab==='skins')this.message.setText('Buy castle skins with your gold. Cosmetic changes only.');
    else this.message.setText(this.products.size===COIN_PACKS.length?'Prices provided by Google Play.':'Preview prices in USD. Checkout is available when Google Play products are connected.');
  }

  buildCategories() {
    const categories=[
      {x:260,label:'GOLD PACKS',icon:'icon-coin',description:'Grow your treasury',detail:'4 gold pack sizes',tab:'coins'},
      {x:640,label:'CASTLE SKINS',icon:textureKeyForSkin('gold'),description:'Give your fortress a new look',detail:'Unlock with your gold',tab:'skins'}
    ];
    for(const c of categories) {
      fortressPanel(this,c.x,330,320,320);
      this.add.image(c.x,255,c.icon).setDisplaySize(80,80);
      this.add.text(c.x,325,c.label,fortressText(26)).setOrigin(0.5);
      this.add.text(c.x,364,c.description,{fontFamily:'Arial',fontSize:'16px',color:'#fff0bd'}).setOrigin(0.5);
      this.add.text(c.x,393,c.detail,{fontFamily:'Arial',fontSize:'14px',color:'#bbcee0'}).setOrigin(0.5);
      fortressButton(this,c.x,448,240,48,'EXPLORE',()=>this.showTab(c.tab));
      const hit=this.add.rectangle(c.x,285,300,220,0,0).setInteractive({useHandCursor:true});
      hit.on('pointerdown',()=>this.showTab(c.tab));
    }
  }

  buildCoinCards() {
    COIN_PACKS.forEach((pack,i)=>{
      const x=141+i*206,y=345;
      fortressPanel(this,x,y,190,290);
      this.add.text(x,y-112,pack.badge,fortressText(11)).setOrigin(0.5);
      this.add.image(x,y-58,'icon-coin').setDisplaySize(50+i*5,50+i*5);
      this.add.text(x,y-6,pack.coins.toLocaleString()+' GOLD',fortressText(24)).setOrigin(0.5);
      this.add.text(x,y+30,pack.name,fortressText(13)).setOrigin(0.5);
      const product=this.products.get(pack.id);
      this.add.text(x,y+62,product?.price || pack.previewPrice,fortressText(24)).setOrigin(0.5);
      this.add.text(x,y+85,product?'Google Play price':'USD preview', {fontFamily:'Arial',fontSize:'11px',color:'#bbcee0'}).setOrigin(0.5);
      fortressButton(this,x,y+119,160,40,product?'BUY GOLD':'NOT LIVE YET',()=>this.buyPack(pack),{size:14});
    });
  }

  async buyPack(pack) {
    if(this.busy)return;
    if(!this.products.has(pack.id)) {
      this.message.setText(Billing.supported()?'This pack is not available on Google Play yet.':'Open the Google Play Android app to purchase gold.');return;
    }
    this.busy=true;this.message.setText('Opening Google Play checkout...');
    try {
      const result=await Billing.buy(pack.id);
      if(this.activeShop)this.message.setText(result.status==='cancelled'?'Purchase cancelled.':result.status==='pending'?'Payment pending. Gold arrives after payment completes.':'Checking your purchase...');
      await this.recoverPurchases();
    } catch(e) {if(this.activeShop)this.message.setText(e.message || 'Purchase could not be completed.');}
    finally {this.busy=false;}
  }

  async recoverPurchases() {
    if(this.recovering)return;
    this.recovering=true;
    try {
      const coins=await Billing.recover();
      if(this.activeShop){this.refresh();if(coins){this.message.setText(`Added ${coins.toLocaleString()} gold to your treasury!`);SFX.win();}}
    } catch(e) {if(this.activeShop){this.refresh();this.message.setText('Purchase delivery will retry when you reopen the Shop. '+(e.message||''));}}
    finally{this.recovering=false;}
  }

  buildSkinCards() {
    const cardW = 190, cardH = 210, gap = 20;
    const cols = SKINS.length;
    const startX = (this.scale.width - (cols * cardW + (cols - 1) * gap)) / 2 + cardW / 2;
    const y = 350;

    SKINS.forEach((skin, i) => {
      const x = startX + i * (cardW + gap);
      const panel = fortressPanel(this,x,y,cardW,cardH);

      this.add.image(x, y - 60, textureKeyForSkin(skin.id)).setDisplaySize(56, 56);
      this.add.text(x, y - 12, skin.label, {
        fontFamily: 'Arial', fontSize: '14px', color: '#ffffff'
      }).setOrigin(0.5);

      const statusText = this.add.text(x, y + 14, '', {
        fontFamily: 'Arial', fontSize: '11px', color: '#cccccc'
      }).setOrigin(0.5);

      const actionBtn = this.add.text(x, y + 50, '', {
        fontFamily: 'Arial', fontSize: '13px', color: '#000000',
        backgroundColor: '#4fd9a0', padding: { x: 14, y: 8 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      actionBtn.on('pointerdown', () => this.handleAction(skin));

      this.cards.push({ skin, statusText, actionBtn });
    });
  }

  handleAction(skin) {
    const data = Storage.get();
    const owned = data.ownedSkins.includes(skin.id);
    const equipped = data.selectedSkin === skin.id;

    if (equipped) return; // nothing to do

    if (owned) {
      Storage.set({ selectedSkin: skin.id });
      SFX.heal();
    } else if (data.coins >= skin.cost) {
      const updated = Storage.spendCoins(skin.cost);
      if (updated) {
        updated.ownedSkins.push(skin.id);
        updated.selectedSkin = skin.id;
        Storage.set(updated);
        SFX.win();
      }
    } else {
      SFX.hitBlock(); // a small "nope" sound for insufficient funds
    }
    this.refresh();
  }

  refresh() {
    const data = Storage.get();
    this.coinText.setText(String(data.coins));

    this.cards.forEach(({ skin, statusText, actionBtn }) => {
      const owned = data.ownedSkins.includes(skin.id);
      const equipped = data.selectedSkin === skin.id;

      if (equipped) {
        statusText.setText('Equipped');
        actionBtn.setText('EQUIPPED').setStyle({ backgroundColor: '#3a3a44', color: '#888888' });
      } else if (owned) {
        statusText.setText('Owned');
        actionBtn.setText('EQUIP').setStyle({ backgroundColor: '#4fd9a0', color: '#000000' });
      } else {
        statusText.setText(`${skin.cost} coins`);
        const affordable = data.coins >= skin.cost;
        actionBtn.setText('BUY').setStyle({
          backgroundColor: affordable ? '#f0c860' : '#3a3a44',
          color: affordable ? '#000000' : '#888888'
        });
      }
    });
  }
}

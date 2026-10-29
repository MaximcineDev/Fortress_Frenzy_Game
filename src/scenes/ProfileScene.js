import Phaser from 'phaser';
import { COUNTRIES, countryName } from '../countries.js';
import { loadProfile, saveProfile } from '../profile.js';
import { fortressBackdrop, fortressPanel, fortressButton, fortressText } from '../ui/fortressTheme.js';

export default class ProfileScene extends Phaser.Scene {
 constructor(){super('Profile');}
 create(){
  const saved=loadProfile();this.firstSetup=!saved;this.selectedCountry=saved?.countryCode||'';this.page=0;this.filter='';this.tiles=[];
  fortressBackdrop(this,'PLAYER PROFILE','Your name. Your chosen flag. Your adventure.');
  const back=()=>this.scene.start(loadProfile()?'MainMenu':'StartScreen');
  fortressButton(this,91,31,146,44,'< BACK',back,{size:16});
  this.add.text(190,119,'PLAYER NAME',{fontFamily:'Arial',fontSize:'12px',color:'#efd7a3'});
  this.nameInput=this.add.dom(450,162,'input','width:520px;height:44px;box-sizing:border-box;border:2px solid #d6ad60;border-radius:8px;background:#142e4c;color:#fff3d0;padding:8px 12px;font:18px Arial;').setDepth(20);
  this.nameInput.node.value=saved?.name||'';this.nameInput.node.placeholder='Enter your name';this.nameInput.node.maxLength=36;this.nameInput.node.setAttribute('aria-label','Player name');this.nameInput.node.autocomplete='off';this.nameInput.node.setAttribute('enterkeyhint','done');this.nameInput.node.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();this.nameInput.node.blur();}});
  this.add.text(450,205,'CHOOSE YOUR COUNTRY FLAG',{...fortressText(16)}).setOrigin(.5);
  this.search=this.add.dom(450,243,'input','width:520px;height:38px;box-sizing:border-box;border:1px solid #8aa9bd;border-radius:7px;background:#142e4c;color:white;padding:7px 12px;font:16px Arial;').setDepth(20);
  this.search.node.placeholder='Search countries or country codes';this.search.node.setAttribute('aria-label','Search country flags');this.search.node.setAttribute('enterkeyhint','done');this.search.node.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();this.search.node.blur();}});
  this.search.node.addEventListener('input',()=>{this.filter=this.search.node.value.trim().toLocaleLowerCase();this.page=0;this.drawFlags();});
  this.pageLabel=this.add.text(450,480,'',fortressText(14)).setOrigin(.5);
  fortressButton(this,225,480,150,38,'< PREVIOUS',()=>{if(this.page>0){this.page--;this.drawFlags();}},{size:13});
  fortressButton(this,675,480,150,38,'NEXT >',()=>{if((this.page+1)*8<this.filtered().length){this.page++;this.drawFlags();}},{size:13});
  this.chosenFlag=this.add.image(298,522,'flag-atlas',saved?.countryCode||'NG').setDisplaySize(36,27).setVisible(!!saved);
  this.chosenText=this.add.text(328,522,saved?countryName(saved.countryCode):'No flag selected',{fontFamily:'Arial',fontSize:'16px',color:'#ffe5a1'}).setOrigin(0,.5);
  this.error=this.add.text(450,545,'',{fontFamily:'Arial',fontSize:'13px',color:'#ffc18e'}).setOrigin(.5);
  fortressButton(this,450,574,330,36,'CONFIRM & CONTINUE',()=>this.confirm(),{size:16});
  this.drawFlags();
  this.input.keyboard?.on('keydown-ESC',back);
  this.events.once('shutdown',()=>{this.nameInput.node?.blur();this.search.node?.blur();this.input.keyboard?.off('keydown-ESC',back);});
 }
 filtered(){const exact=COUNTRIES.find(c=>c.code.toLowerCase()===this.filter);return exact?[exact]:COUNTRIES.filter(c=>!this.filter||c.name.toLocaleLowerCase().includes(this.filter));}
 drawFlags(){
  this.tiles.forEach(t=>t.destroy());this.tiles=[];
  const list=this.filtered(),pages=Math.max(1,Math.ceil(list.length/8));this.page=Math.min(this.page,pages-1);
  this.pageLabel.setText(list.length?`${this.page+1} / ${pages} • ${list.length} flags`:'No countries match');
  list.slice(this.page*8,this.page*8+8).forEach((country,i)=>{
   const x=165+(i%4)*190,y=320+Math.floor(i/4)*91;
   const panel=fortressPanel(this,x,y,172,78,this.selectedCountry===country.code?0x366a77:0x173e69);
   const image=this.add.image(x,y-12,'flag-atlas',country.code).setDisplaySize(44,33);
   const label=this.add.text(x,y+20,country.name,{fontFamily:'Arial',fontSize:'11px',color:'#fff0bd',align:'center',wordWrap:{width:156}}).setOrigin(.5);
   const hit=this.add.rectangle(x,y,172,78,0,0).setInteractive({useHandCursor:true}).setName('country-'+country.code);
   hit.on('pointerdown',()=>{this.selectedCountry=country.code;this.chosenFlag.setFrame(country.code).setVisible(true);this.chosenText.setText(country.name);this.search.node.blur();this.error.setText('');this.drawFlags();});
   this.tiles.push(panel,image,label,hit);
  });
 }
 confirm(){
  try{
   const result=saveProfile({name:this.nameInput.node.value,countryCode:this.selectedCountry});
   this.nameInput.node.blur();this.search.node.blur();
   if(!result.persistent)this.registry.set('profileNotice','Profile saved for this session. Device storage is unavailable.');
   this.scene.start('MainMenu');
  }catch(error){this.error.setText(error.message);}
 }
}

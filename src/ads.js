import { lockAdPresentation } from './ui/adOverlay.js';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { createAdManager } from './adsCore.js';
import { Storage } from './storage.js';
import { Music } from './music.js';
import { SFX } from './sound.js';
let game;
const key='ff_ad_pacing_v1';let memory={};
const lock=message=>lockAdPresentation(game,message,blocked=>{Music.setAdBlocked(blocked);SFX.setAdBlocked(blocked);});

export const Ads=createAdManager({
 bridge:registerPlugin('FortressAds'),supported:Capacitor.getPlatform()==='android',lock,
 readPacing:()=>{try{return JSON.parse(localStorage.getItem(key)||'{}');}catch{return memory;}},
 writePacing:value=>{memory=value;try{localStorage.setItem(key,JSON.stringify(value));}catch{}},
 creditReward:(claimId,amount)=>Storage.creditAdReward(claimId,amount)
});
Ads.attachGame=value=>{game=value;};

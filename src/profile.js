import { validProfile } from './shared/playerProfile.js';
export { cleanPlayerName, cleanCountryCode } from './shared/playerProfile.js';
const KEY='ff_player_profile_v1';let memory=null,sessionOnly=false;
export function loadProfile(){
 if(sessionOnly)return memory?{...memory}:null;
 try{const saved=localStorage.getItem(KEY);if(saved)memory=validProfile(JSON.parse(saved));}catch{}
 return memory?{...memory}:null;
}
export function saveProfile(value){
 const profile=validProfile(value);
 if(!profile)throw new Error('Enter your name and choose a country flag.');
 memory=profile;let persistent=true;
 try{localStorage.setItem(KEY,JSON.stringify(profile));sessionOnly=false;}catch{persistent=false;sessionOnly=true;}
 return {...profile,persistent};
}

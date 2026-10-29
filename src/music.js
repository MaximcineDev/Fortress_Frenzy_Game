import introUrl from './audio/fortress-intro.mp3';
import { Storage } from './storage.js';
let audio, unlocked=false, foreground=true, scene='Splash';
let adBlocked=false;
let muted=!!Storage.get().musicMuted;
function track(){
 if(!audio){audio=new Audio(introUrl);audio.loop=true;audio.preload='auto';audio.volume=.28;}
 return audio;
}
function sync(){
 const shouldPlay=!adBlocked && unlocked && foreground && !muted && !['StudioIntro','Splash','Game'].includes(scene);
 if(shouldPlay)track().play().catch(()=>{});else if(audio)audio.pause();
}
export const Music={
 setAdBlocked(value){adBlocked=!!value;sync();},
 unlock(){unlocked=true;sync();},
 setScene(value){if(value!==scene){scene=value;sync();}},
 isMuted:()=>muted,
 setMuted(value){muted=!!value;Storage.set({musicMuted:muted});if(!muted)unlocked=true;sync();},
 setForeground(value){foreground=!!value;sync();},
 // Small diagnostic snapshot for QA, without exposing a writable player.
 status:()=>({muted,unlocked,scene,playing:!!audio&&!audio.paused})
};

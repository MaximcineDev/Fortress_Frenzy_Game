const KEY='ff_online_settings_v1';
let memory={name:'Knight',serverUrl:''};
export function normalizeServerUrl(value){
 if(typeof value!=='string'||!value.trim())throw new Error('Enter the game server address.');
 let url;try{url=new URL(value.trim());}catch{throw new Error('Use a full address starting with https:// (or http:// for local testing).');}
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||!['','/'].includes(url.pathname))throw new Error('Use only the server origin, for example https://your-game-server.example.');
 return url.origin;
}
export function loadOnlineSettings(){
 try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved)memory={...memory,...saved};}catch{}
 const configured=import.meta.env?.VITE_SERVER_URL||'';
 const native=typeof window!=='undefined'&&window.Capacitor?.isNativePlatform?.();
 const sameOrigin=typeof window!=='undefined'&&!native&&['http:','https:'].includes(window.location.protocol)?window.location.origin:'';
 return {...memory,serverUrl:memory.serverUrl||configured||sameOrigin};
}
export function saveOnlineSettings(name,serverUrl){
 const url=normalizeServerUrl(serverUrl);memory={name:String(name||'Knight').trim().slice(0,18)||'Knight',serverUrl:url};
 try{localStorage.setItem(KEY,JSON.stringify(memory));}catch{}
 return {...memory};
}

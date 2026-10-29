import { Storage } from './storage.js';
import { worldVariant } from './worldVariants.js';

const CHAPTERS=['The Royal Outskirts','The Crown Vanguard','The Shifting Realms','The Siege Lords','The Final Crown'];
const DEFINITIONS=[
 ['First Banner','Learn to aim and defeat the outpost.','conquer'],
 ['Stonewatch','Break the watchtower and defeat its commander.','conquer'],
 ['Hold the Bridge','Win with at least 25% commander health.','guard'],
 ['The Red Rampart','Defeat the reinforced garrison.','conquer'],
 ['River Crossing','Defeat the river guard before time expires.','timed'],
 ['Shield of the Crown','Win with at least 30% commander health.','guard'],
 ['Siege of Dawn','Breach the veteran fortress.','conquer'],
 ['The Twin Banners','Defeat the garrison before time expires.','timed'],
 ['The Royal Guard','Win with at least 35% commander health.','guard'],
 ['Citadel Approach','Overcome the elite defenders.','conquer'],
 ['The Last Gate','Defeat the gatekeeper before time expires.','timed'],
 ['The Crown Vanguard','Defeat the royal vanguard.','boss'],
 ['Silverpine Pass','Break the forest fortification.','conquer'],
 ['The Frozen Shield','Win with at least 35% commander health.','guard'],
 ['The Dune Marshal','Defeat the desert marshal.','boss'],
 ['Ember Pursuit','Beat the volcanic garrison before time expires.','timed'],
 ['Harbor of Shields','Win with at least 40% commander health.','guard'],
 ['Spellbound Gate','Breach the enchanted fortress.','conquer'],
 ['The Woodland Clock','Take the forest gate before time expires.','timed'],
 ['The Frost Regent','Defeat the ice regent.','boss'],
 ['Sands of Honor','Win with at least 40% commander health.','guard'],
 ['The Black Rampart','Overcome the volcanic defenders.','conquer'],
 ['Against the Tide','Defeat the coast guard before time expires.','timed'],
 ['Moonlit Keep','Win with at least 45% commander health.','guard'],
 ['The Emerald King','Defeat the forest siege lord.','boss'],
 ['Winter Vigil','Win with at least 45% commander health.','guard'],
 ['Sunspire Assault','Defeat the final desert garrison.','conquer'],
 ['Ashen Hour','Take the caldera before time expires.','timed'],
 ['The Last Harbor','Win with at least 45% commander health.','guard'],
 ['Throne of Six Realms','Defeat the final ruler and claim the crown.','boss']
];
export const MISSION_COUNT=DEFINITIONS.length;
export const FREE_MISSION_COUNT=5;
const validId=id=>Number.isInteger(id)&&id>=1&&id<=MISSION_COUNT;
export function getMission(id) {
 const n=Math.max(1,Math.min(MISSION_COUNT,Math.floor(Number(id)||1)));
 const [title,description,type]=DEFINITIONS[n-1];
 return {id:n,title,description,type,chapter:CHAPTERS[Math.floor((n-1)/6)],world:worldVariant(n),
  unlockCost:n<=5?0:300+(n-6)*25,reward:50+(n-1)*10,
  enemyHealth:1+(n-1)*0.025,enemyDamage:0.45+(n-1)*0.025,
  botDelay:3100-(n-1)*55,aimError:0.115-(n-1)*0.0028,
  minHealth:type==='guard'?({3:0.25,6:0.30,9:0.35,14:0.35,17:0.40,21:0.40,24:0.45,26:0.45,29:0.45}[n]||0.35):0,
  timeLimit:type==='timed'?Math.max(110,150-Math.floor(n/4)*5):0,
  enemyUnits:n<=2?['scout','wrecker']:n<=4?['scout','wrecker','bomber']:n<=7?['scout','wrecker','bomber','archer','fairy']:['scout','wrecker','bomber','archer','napalmer','catapult','crow','fairy']};
}
export function campaignProgress() {
 const source=Storage.get().campaign||{};
 const stars={};
 for(const [key,value] of Object.entries(source.stars||{})) if(validId(Number(key))&&Number.isInteger(value)&&value>=1&&value<=3) stars[key]=value;
 let purchased=Array.isArray(source.purchased)?source.purchased.filter(id=>validId(id)&&id>5):[];
 // Grandfather missions previously available in the 12-mission campaign.
 if(source.schema!==2){
  const legacy=Math.min(12,Math.max(1,Math.floor(Number(source.unlocked)||1)));
  for(let id=6;id<=legacy;id++) purchased.push(id);
 }
 purchased=[...new Set([...purchased,...Object.keys(stars).map(Number).filter(id=>id>5)])].sort((a,b)=>a-b);
 return {schema:2,purchased,stars};
}
export function canPlayMission(id,progress=campaignProgress()) {
 return validId(id)&&(id<=FREE_MISSION_COUNT||progress.purchased.includes(id));
}
export function unlockMission(id) {
 if(!validId(id)) return {ok:false,reason:'invalid'};
 const progress=campaignProgress();
 if(canPlayMission(id,progress)) return {ok:true,alreadyOwned:true,cost:0};
 const data=Storage.get(),cost=getMission(id).unlockCost;
 if(data.coins<cost) return {ok:false,reason:'insufficient',cost,missing:cost-data.coins};
 progress.purchased.push(id);progress.purchased.sort((a,b)=>a-b);
 // Persist access and the matching deduction in one save, including rapid repeat taps.
 Storage.set({coins:data.coins-cost,campaign:progress});
 return {ok:true,alreadyOwned:false,cost};
}
export function missionOutcome(mission,{won,hp,maxHp,elapsed}) {
 if(!won)return {success:false,reason:'Your commander fell. Regroup and try again.',stars:0};
 if(mission.timeLimit&&elapsed>mission.timeLimit)return {success:false,reason:'Time ran out. Retry with faster attacks.',stars:0};
 const health=Math.max(0,hp/maxHp);
 if(health+0.00001<mission.minHealth)return {success:false,reason:'Victory, but your commander needs more health. Use Fairy to repair.',stars:0};
 return {success:true,reason:'Mission complete!',stars:1+Number(health>=0.5)+Number(health>=0.8)};
}
export function completeMission(id,stars) {
 if(!canPlayMission(id)||!Number.isInteger(stars)||stars<1||stars>3)return null;
 const mission=getMission(id),progress=campaignProgress(),first=!progress.stars[id];
 progress.stars[id]=Math.max(stars,progress.stars[id]||0);
 const reward=first?mission.reward:20,data=Storage.get();
 Storage.set({coins:data.coins+reward,campaign:progress});
 return {reward,first,finished:id===MISSION_COUNT};
}

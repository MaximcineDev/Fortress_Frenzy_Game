import test from 'node:test';
import assert from 'node:assert/strict';
import { COUNTRIES, COUNTRY_CODES } from '../src/countries.js';
import { CITIES } from '../src/cities.js';
import { loadProfile, saveProfile } from '../src/profile.js';
import { cleanPlayerName, cleanCountryCode, validProfile } from '../src/shared/playerProfile.js';
import { Storage } from '../src/storage.js';
test('world tour starts with ten African cities and uses 30 distinct valid destinations',()=>{
 assert.equal(CITIES.length,30);assert.equal(new Set(CITIES.map(c=>c.key)).size,30);
 assert.deepEqual(CITIES.slice(0,10).map(c=>c.city),['Lagos','Abuja','Accra','Abidjan','Dakar','Cairo','Addis Ababa','Nairobi','Johannesburg','Cape Town']);
 for(const city of CITIES){assert.ok(COUNTRY_CODES.has(city.countryCode));assert.ok(city.landmark);assert.ok(city.sky.length===3);}
 assert.equal(COUNTRIES.length,249);
});
test('profile validates chosen flags, trims names and does not overwrite game progress',()=>{
 const map=new Map();globalThis.localStorage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
 assert.equal(loadProfile(),null);
 assert.throws(()=>saveProfile({name:'',countryCode:'NG'}));assert.throws(()=>saveProfile({name:'Ada',countryCode:'XX'}));
 Storage.reset();Storage.addCoins(80);
 assert.equal(saveProfile({name:'  Ada  Okafor  ',countryCode:'ng'}).persistent,true);
 assert.deepEqual(loadProfile(),{name:'Ada Okafor',countryCode:'NG'});assert.equal(Storage.get().coins,230);
 Storage.reset();assert.equal(loadProfile().name,'Ada Okafor');
 saveProfile({name:'世界の勇者',countryCode:'JP'});assert.equal(loadProfile().countryCode,'JP');
 localStorage.setItem=()=>{throw Error('No storage');};
 assert.equal(saveProfile({name:'Knight',countryCode:'GH'}).persistent,false);
 assert.equal(loadProfile().countryCode,'GH');delete globalThis.localStorage;assert.equal(loadProfile().countryCode,'GH');
});
test('server/client profile sanitizer rejects invalid flags and control characters',()=>{
 assert.equal(cleanCountryCode('../NG'),'');assert.equal(cleanCountryCode('<NG>'),'');assert.equal(cleanCountryCode(' ng '),'NG');
 assert.equal(cleanPlayerName(' <Ada>\u0000 '),'Ada');assert.equal([...cleanPlayerName('😀'.repeat(30))].length,18);
 assert.equal(validProfile({name:'   ',countryCode:'NG'}),null);
});

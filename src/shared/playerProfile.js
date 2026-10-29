import { COUNTRY_CODES } from '../countries.js';
export function cleanPlayerName(value){
 return typeof value==='string'?[...value.normalize('NFC').replace(/[\u0000-\u001f\u007f<>]/g,'').trim().replace(/\s+/g,' ')].slice(0,18).join(''):'';
}
export function cleanCountryCode(value){
 const code=typeof value==='string'?value.trim().toUpperCase():'';
 return COUNTRY_CODES.has(code)?code:'';
}
export function validProfile(value){
 const name=cleanPlayerName(value?.name),countryCode=cleanCountryCode(value?.countryCode);
 return name&&countryCode?{name,countryCode}:null;
}

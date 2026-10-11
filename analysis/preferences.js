/* Preferências de mapeamento por assinatura de esquema, confirmadas pela pessoa. */
(function(root,factory){const api=factory(root);if(typeof module==="object"&&module.exports)module.exports=api;else root.MCPreferences=api;})(typeof window!=="undefined"?window:globalThis,function(root){
"use strict";
const key="michelle.schema.preferences.v1";
function read(){try{const o=JSON.parse(root.localStorage?.getItem(key)||"{}");return o&&typeof o==="object"&&!Array.isArray(o)?o:{};}catch(e){return {};}}
function write(value){try{root.localStorage?.setItem(key,JSON.stringify(value));return true;}catch(e){return false;}}
function get(signature){const p=read()[signature];if(!p||p.version!==1)return null;return p;}
function confirm(p){
 if(!p?.analysisProfile?.signature||(!p.userEdited&&!p.manualReview))return false;
 const signature=p.analysisProfile.signature;
 const mapping={};
 for(const [role,index]of Object.entries(p.mapping||{}))if(Number.isInteger(index)&&index>=-1&&index<200)mapping[role]=index;
 const store=read();
 store[signature]={version:1,type:p.type,sector:p.sector,headerRow:p.headerRow,mapping,savedAt:new Date().toISOString(),filename:p.name||""};
 // Limita o número de padrões salvos para evitar armazenamento ilimitado.
 const ordered=Object.entries(store).sort((a,b)=>String(b[1]?.savedAt||"").localeCompare(String(a[1]?.savedAt||""))).slice(0,80);
 return write(Object.fromEntries(ordered));
}
function reset(){try{root.localStorage?.removeItem(key);return true;}catch(e){return false;}}
return {key,read,get,confirm,reset};
});
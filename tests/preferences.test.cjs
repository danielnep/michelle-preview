const test=require("node:test");const assert=require("node:assert/strict");
const mem=new Map();global.localStorage={getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v),removeItem:k=>mem.delete(k)};
const P=require("../analysis/preferences.js");
test("preferência é salva somente após correção consciente",()=>{const p={analysisProfile:{signature:"a|b"},type:"ligacoes",mapping:{date:0},name:"f.xlsx"};assert.equal(P.confirm(p),false);assert.equal(P.get("a|b"),null);p.userEdited=true;assert.equal(P.confirm(p),true);assert.equal(P.get("a|b").type,"ligacoes");});
test("preferências podem ser apagadas",()=>{assert.equal(P.reset(),true);assert.equal(P.get("a|b"),null);});

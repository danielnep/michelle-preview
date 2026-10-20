const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const {IDBFactory}=require("fake-indexeddb");

const source=name=>fs.readFileSync(path.join(__dirname,"..",name),"utf8");

test("Pages mantém importações, originais e biblioteca isolados em IndexedDB",async()=>{
  const location={hostname:"danielnep.github.io",pathname:"/michelle-preview/"};
  let remoteCalls=0;
  const root={location,MCPreview:{enabled:true},indexedDB:new IDBFactory()};
  vm.runInNewContext(source("data-core.js"),{window:root});
  const local=root.MCStore;
  await local.open();
  await local.put("files",{id:"origem-a",name:"teste.xlsx",bytes:new Uint8Array([80,75,3,4]).buffer});
  await local.put("lots",{id:"aba-a",fileId:"origem-a",rows:[]});
  vm.runInNewContext(source("mc-cloud-store.js"),{
    window:root,fetch:async()=>{remoteCalls++;throw Error("Produção não pode ser acessada pela prévia");}
  });
  assert.equal(root.MCStore,local,"Deve preservar armazenamento local");
  assert.equal(root.MCStore.cloud,undefined);
  assert.equal(root.MCAccess.owner,true,"Somente acesso local fictício, sem login remoto");
  const catalog=await root.MCCloudFiles.refresh();
  assert.equal(catalog.length,1);
  assert.equal(catalog[0].name,"teste.xlsx");
  assert.equal(catalog[0].size,4);
  const record=await local.read("files","origem-a");
  assert.equal(record.id,"origem-a");
  const removed=await root.MCCloudFiles.deleteFiles(["origem-a"]);
  assert.equal(removed.deletedIds.length,1);
  assert.equal(await local.read("files","origem-a"),undefined);
  assert.equal(await local.read("lots","aba-a"),undefined);
  assert.equal(remoteCalls,0);
});

test("Produção mantém adaptador autenticado e não ativa o modo Pages",async()=>{
  const calls=[];
  const root={location:{hostname:"powerbi-completo-mc.up.railway.app"},
    MCPreview:{enabled:false},MCStore:{open:async()=>null}};
  vm.runInNewContext(source("mc-cloud-store.js"),{
    window:root,
    fetch:async url=>{
      calls.push(url);
      return {ok:true,status:200,json:async()=>(
        url==="/api/me"?{owner:true,rights:{ai:true}}:
        url==="/api/files"?[]:[]
      )};
    }
  });
  assert.equal(root.MCStore.cloud,true);
  await root.MCStore.open();
  assert.equal(calls[0],"/api/me");
  assert.equal(calls[1],"/api/files");
});

test("Pages não restaura nem envia automaticamente revisões para API do cliente",()=>{
  const review=source("analysis/automatic-review.js");
  const library=source("mc-file-library.js");
  const app=source("app.js");
  assert.match(review,/if\(root\.MCPreview\?\.enabled\)return;/);
  assert.match(review,/if\(root\.MCPreview\?\.enabled \|\| !root\.MCAccess/);
  assert.match(library,/data-library-download/);
  assert.match(library,/root\.MCPreview\?\.enabled/);
  assert.match(app,/PRÉVIA GITHUB · DADOS LOCAIS/);
  assert.match(app,/access\.owner && !window\.MCPreview\?\.enabled/);
});

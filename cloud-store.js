/* Persistência remota para o painel hospedado no Railway. */
(function(root){
 "use strict";
 if(!/\.up\.railway\.app$/i.test(root.location.hostname))return;
 const original=root.MCStore;
 let lots=[];
 const once=new Set();
 async function api(path,method="GET",body){
   const binary=body instanceof ArrayBuffer || ArrayBuffer.isView(body);
   const r=await fetch(path,{method,credentials:"same-origin",cache:"no-store",headers:body===undefined?{}:{"Content-Type":binary?"application/octet-stream":"application/json"},...(body===undefined?{}:{body:binary?body:JSON.stringify(body)})});
   if(!r.ok){const error=await r.json().catch(()=>({}));throw Error(error.error||"Falha na nuvem ("+r.status+").");}
   return r;
 }
 async function open(){
   const res=await api("/api/cloud/status");
   const state=await res.json();
   if(!state.configured)throw Error("Nuvem não configurada; nenhuma importação foi salva.");
   if(!state.authenticated)throw Error("Autenticação necessária para acessar os arquivos na nuvem.");
   await original.open();
 }
 async function all(table){
   if(table==="lots"){lots=(await(await api("/api/cloud/lots")).json()).lots||[];return lots;}
   if(table==="files"){const ids=[...new Set(lots.map(l=>l.fileId).filter(Boolean))];return Promise.all(ids.map(id=>read("files",id)));}
   return original.all(table);
 }
 async function read(table,id){
   if(table==="lots")return (await all("lots")).find(l=>l.id===id);
   if(table==="files"){const r=await api("/api/cloud/files/"+encodeURIComponent(id));return {id,name:lots.find(l=>l.fileId===id)?.name||"Planilha",bytes:await r.arrayBuffer()};}
   return original.read(table,id);
 }
 async function put(table,value){
   if(table==="files"){
     if(!once.has(value.id)){await api("/api/cloud/files/"+encodeURIComponent(value.id),"PUT",value.bytes);once.add(value.id);}
     return;
   }
   if(table==="lots"){
     await api("/api/cloud/lots/"+encodeURIComponent(value.id),"PUT",value);
     const i=lots.findIndex(l=>l.id===value.id);if(i>=0)lots[i]=value;else lots.push(value);
     return;
   }
   return original.put(table,value);
 }
 async function batch(ops){
   for(const op of ops.filter(x=>x.store==="files")){if(op.remove)throw Error("Remoção definitiva não disponível.");await put("files",op.value);}
   for(const op of ops.filter(x=>x.store==="lots")){if(op.remove)throw Error("Remoção definitiva não disponível.");await put("lots",op.value);}
   const localOps=ops.filter(x=>!["files","lots"].includes(x.store));
   if(localOps.length)await original.batch(localOps);
 }
 async function remove(table,id){if(["lots","files"].includes(table))throw Error("Remoção definitiva não disponível.");return original.remove(table,id);}
 root.MCStore={open,read,all,put,batch,remove,cloud:true};
})(typeof window!=="undefined"?window:globalThis);

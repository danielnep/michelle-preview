/* Persistência remota para o painel hospedado no Railway. */
(function(root){
 "use strict";
 if(!/\.up\.railway\.app$/i.test(root.location.hostname))return;
 const original=root.MCStore;
 let lots=[];
 let migrated=false;
 const once=new Set();
 async function api(path,method="GET",body){
   const binary=body instanceof ArrayBuffer || ArrayBuffer.isView(body);
   const r=await fetch(path,{method,credentials:"same-origin",cache:"no-store",headers:body===undefined?{}:{"Content-Type":binary?"application/octet-stream":"application/json"},...(body===undefined?{}:{body:binary?body:JSON.stringify(body)})});
   if(!r.ok){const error=await r.json().catch(()=>({}));throw Error(error.error||"Falha na nuvem ("+r.status+").");}
   return r;
 }
 async function signIn(){
   return new Promise(resolve=>{
     const box=document.createElement("div");
     box.id="mc-cloud-auth";
     box.style.cssText="position:fixed;inset:0;z-index:2147483647;background:#0b1730f5;display:grid;place-items:center;padding:18px;color:white;font:15px system-ui";
     box.innerHTML='<form style="width:min(100%,390px);box-sizing:border-box;padding:26px;border-radius:16px;background:#173454;border:1px solid #44739d"><h2>Power BI | Michelle Cândido</h2><p>Acesso seguro aos arquivos da nuvem</p><label>E-mail<input name="email" type="email" autocomplete="username" required style="width:100%;box-sizing:border-box;padding:12px;margin:7px 0 14px;border-radius:8px"></label><label>Senha<input name="password" type="password" autocomplete="current-password" required style="width:100%;box-sizing:border-box;padding:12px;margin:7px 0 10px;border-radius:8px"></label><p role="alert" style="color:#ffbebe"></p><button style="padding:13px;background:#4ab8ff;color:#082039;border:0;border-radius:8px;width:100%;font-weight:700">Entrar</button></form>';
     document.body.append(box);
     const form=box.querySelector("form"),error=box.querySelector('[role="alert"]');
     form.addEventListener("submit",async e=>{
       e.preventDefault();const button=form.querySelector("button");button.disabled=true;error.textContent="";
       try{
         await api("/api/cloud/login","POST",{email:form.elements.email.value,password:form.elements.password.value});
         box.remove();resolve();
       }catch(ex){error.textContent=ex.message;}
       finally{button.disabled=false;}
     });
   });
 }
 async function migrateLegacy(){
   if(migrated)return;
   lots=(await(await api("/api/cloud/lots")).json()).lots||[];
   const previous=await original.all("lots");
   const known=new Set(lots.map(l=>l.id));
   for(const item of previous){
     if(known.has(item.id))continue;
     const id=item.fileId;
     if(typeof id==="string"&&/^[a-f0-9]{64}$/i.test(id)){
       const file=await original.read("files",id);
       if(file?.bytes)await put("files",file);
     }
     await put("lots",item);
     known.add(item.id);
   }
   migrated=true;
 }
 async function open(){
   const res=await api("/api/cloud/status");
   const state=await res.json();
   if(!state.configured)throw Error("Nuvem não configurada; nenhuma importação foi salva.");
   if(!state.authenticated)await signIn();
   await original.open();
   await migrateLegacy();
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

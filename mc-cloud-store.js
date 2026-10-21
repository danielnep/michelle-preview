/* Store compartilhado no Railway: API PostgreSQL + arquivos originais em bucket privado. */
(function(root){
 "use strict";
 // GitHub Pages é prévia isolada. IndexedDB local vem de data-core.js.
 if(root.MCPreview?.enabled){
   const local=root.MCStore;
   if(!local?.open || !local?.all || !local?.read || !local?.batch){
     throw Error("Armazenamento local da prévia não foi inicializado.");
   }
   let catalog=[];
   root.MCAccess={owner:true,rights:{ai:true,filesView:true,filesUpload:true,
     filesDownload:true,filesDelete:true,reportsExport:true},sectors:[]};
   async function refreshFiles(){
     const items=await local.all("files");
     catalog=items.map(f=>({
       id:f.id,name:f.name||"Planilha",size:f.size||f.bytes?.byteLength||0,
       created:f.created||null,canDelete:true
     }));
     return catalog.slice();
   }
   root.MCCloudFiles={
     list:()=>catalog.slice(),refresh:refreshFiles,
     openLibrary:()=>root.MCFileLibrary?.open(),
     deleteFiles:async(ids)=>{
       const valid=new Set(ids.filter(id=>catalog.some(file=>file.id===id)));
       if(valid.size){
         const lots=await local.all("lots");
         await local.batch([
           ...[...valid].map(id=>({store:"files",id,remove:true})),
           ...lots.filter(lot=>valid.has(lot.fileId)).map(lot=>({store:"lots",id:lot.id,remove:true}))
         ]);
       }
       await refreshFiles();
       return {deletedIds:[...valid]};
     }
   };
   // Nunca troca MCStore pelo cliente HTTP, nem lê a conta do servidor.
   return;
 }
 let catalog=[];
 async function request(url,opts={}){
   const res=await fetch(url,{credentials:"same-origin",cache:"no-store",...opts});
   if(res.status===401){root.location.replace("/login.html");throw Error("Sessão encerrada. Entre novamente.");}
   if(!res.ok){const body=await res.json().catch(()=>({}));throw Error(body.error||"Erro de comunicação com o servidor ("+res.status+").");}
   return res;
 }
 const json=(value)=>({method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(value)});
 async function refreshFiles(){
   catalog=await (await request("/api/files")).json();
   return catalog;
 }
 async function open(){
  root.MCAccess=await (await request("/api/me")).json();
  try{await refreshFiles()}catch(error){
    if(!root.MCAccess.owner && !["filesView","filesUpload","filesDownload","filesDelete"].some(k=>root.MCAccess.rights?.[k])) catalog=[];
    else throw error;
  }
  return true;
}
 async function read(store,id){
   if(store==="files"){
     const file=catalog.find(f=>f.id===id);
     if(!file)return null;
     const bytes=await (await request("/api/files/"+encodeURIComponent(id))).arrayBuffer();
     return {id,name:file.name,bytes};
   }
   return (await (await request("/api/store/"+encodeURIComponent(store)+"/"+encodeURIComponent(id))).json());
 }
 async function all(store){
   if(store==="files"){
     const list=[];for(const file of catalog){list.push(await read("files",file.id));}
     return list;
   }
   return (await (await request("/api/store/"+encodeURIComponent(store))).json());
 }
 async function uploadFile(item){
   if(!item?.id||!item?.bytes)throw Error("O arquivo original está incompleto.");
   const bytes=item.bytes instanceof ArrayBuffer?item.bytes:item.bytes.buffer?.slice(item.bytes.byteOffset,item.bytes.byteOffset+item.bytes.byteLength);
   if(!bytes)throw Error("Formato do arquivo original inválido.");
   await request("/api/files/"+encodeURIComponent(item.id),{
     method:"PUT",headers:{"Content-Type":"application/octet-stream","X-File-Name":encodeURIComponent(item.name||"planilha.xlsx")},body:bytes
   });
 }
 async function batch(ops){
   const fileOps=ops.filter(o=>o.store==="files");
   let uploaded=0, failure=null;
   try{
     for(const op of fileOps) {
       if(op.remove)throw Error("A remoção definitiva de originais não está disponível.");
       await uploadFile(op.value);
       uploaded++;
     }
     const others=ops.filter(o=>o.store!=="files");
     if(others.length)await request("/api/store/batch",json({ops:others}));
   }catch(error){failure=error;}
   // Original confirmado no servidor, mas o lote pode falhar depois: reconciliar o catálogo.
   if(uploaded)try{await refreshFiles();}catch(error){if(!failure)failure=error;}
   if(failure)throw failure;
 }
 const put=(store,value)=>batch([{store,value}]);
 const remove=(store,id)=>batch([{store,id,remove:true}]);
 root.MCStore={open,read,all,batch,put,remove,cloud:true};
 root.MCCloudFiles={list:()=>catalog.slice(),refresh:refreshFiles,openLibrary:()=>root.MCFileLibrary?.open(),deleteFiles:async(ids)=>{
   const result=await (await request("/api/files/delete",json({ids}))).json();
   const removed=new Set(result.deletedIds);
   catalog=catalog.filter(file=>!removed.has(file.id));
   return result;
 }};
})(window);
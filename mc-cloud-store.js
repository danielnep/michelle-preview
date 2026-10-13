/* Store compartilhado no Railway: API PostgreSQL + arquivos originais em bucket privado. */
(function(root){
 "use strict";
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
 async function open(){await (await request("/api/me")).json();await refreshFiles();return true;}
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
   for(const op of fileOps) {
     if(op.remove)throw Error("A remoção definitiva de originais não está disponível.");
     await uploadFile(op.value);
   }
   const others=ops.filter(o=>o.store!=="files");
   if(others.length)await request("/api/store/batch",json({ops:others}));
   if(fileOps.length)await refreshFiles();
 }
 const put=(store,value)=>batch([{store,value}]);
 const remove=(store,id)=>batch([{store,id,remove:true}]);
 root.MCStore={open,read,all,batch,put,remove};
 root.MCCloudFiles={list:()=>catalog.slice(),refresh:refreshFiles,openLibrary:()=>root.open("/arquivos.html","_blank","noopener,noreferrer")};
})(window);
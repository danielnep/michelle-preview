/* Instalação progressiva e mensagens honestas por navegador. */
(function(root){
"use strict";
let offer=null;
const media=()=>root.matchMedia?.("(display-mode: standalone)").matches||root.navigator.standalone===true;
const ios=()=>/iP(ad|hone|od)/.test(root.navigator.userAgent||"");
const buttons=()=>Array.from(document.querySelectorAll("[data-mc-install]"));
function update(){
 const installed=media();
 buttons().forEach(b=>{b.hidden=installed;b.disabled=installed;b.setAttribute("aria-label",offer?"Instalar Painel Michelle":"Como instalar o Painel Michelle");});
 const state=document.querySelector("[data-install-status]");
 if(state)state.textContent=installed?"Aplicativo instalado e aberto em janela própria.":offer?"Este navegador oferece instalação direta.":"A instalação depende do navegador e do sistema.";
}
async function trigger(){
 if(media())return;
 if(offer){
   const event=offer;offer=null;
   try{await event.prompt();const result=await event.userChoice;if(result?.outcome==="accepted")root.MichelleBridge?.notify("Pedido de instalação enviado ao navegador.");}
   catch(e){root.MichelleBridge?.notify("Use a opção Instalar aplicativo no menu do navegador.",true);}
   update();return;
 }
 const msg=ios()?"No iPhone ou iPad, abra o menu Compartilhar do navegador e toque em Adicionar à Tela de Início.":"No Chrome/Edge, abra o menu do navegador e procure Instalar aplicativo ou Adicionar à tela inicial.";
 root.MichelleBridge?.notify(msg);
 const guide=document.getElementById("mc-install-guide");
 if(guide){guide.hidden=false;guide.textContent=msg;}
}
function bind(){
 buttons().forEach(b=>{b.onclick=trigger;});
 update();
}
root.addEventListener("beforeinstallprompt",e=>{e.preventDefault();offer=e;update();});
root.addEventListener("appinstalled",()=>{offer=null;update();});
root.addEventListener("pageshow",update);
if("serviceWorker" in root.navigator && root.location.protocol==="https:")root.addEventListener("load",()=>root.navigator.serviceWorker.register("./service-worker.js",{scope:"./"}).catch(()=>{/* App continua online sem SW. */}));
root.MCInstall={bind,trigger,update,installed:media};
})(window);
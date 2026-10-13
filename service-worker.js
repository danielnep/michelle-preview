/* Railway: nunca armazenar páginas autenticadas nem respostas de API em cache offline. */
const CACHE="michelle-railway-shell-v5";
self.addEventListener("install",event=>event.waitUntil(self.skipWaiting()));
self.addEventListener("activate",event=>event.waitUntil((async()=>{
 for(const key of await caches.keys()) if(key.startsWith("michelle-")) await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener("fetch", event=>{
 const url=new URL(event.request.url);
 if(url.pathname.startsWith("/api/")||event.request.mode==="navigate")return;
 // Assets requisitados diretamente ao servidor. Não armazenar dados privados no worker.
});

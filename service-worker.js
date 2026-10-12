/* Cache exclusivamente do shell público. Dados operacionais ficam no IndexedDB. */
const CACHE="michelle-shell-v4.4.1-pages-ai-20261012";
const ROOT=new URL("./",self.registration.scope);
const ASSETS=["./","./index.html","./manifest.webmanifest","./assets/mc-symbol.svg","./styles.css","./enhancements.css","./theme.css","./dashboard.css","./clarity.css","./mc-4.css","./profiles.css","./profiles.js","./motion.css","./motion.js","./michelle-ai-client.js","./michelle-ai-dock.js","./michelle-ai-dock.css","./vendor/xlsx.full.min.js","./vendor/jszip.min.js","./analysis/mc-analysis.js","./analysis/preferences.js","./data-core.js","./data-intelligence.js","./pptx.js","./install.js","./app.js","./studio.js","./dashboard.js"];
const urls=ASSETS.map(x=>new URL(x,ROOT).href);
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>Promise.allSettled(urls.map(url=>cache.add(new Request(url,{cache:"reload"}))))).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith("michelle-shell-")&&k!==CACHE)await caches.delete(k);await self.clients.claim();})()));
self.addEventListener("fetch",event=>{
 const req=event.request;if(req.method!=="GET")return;
 const url=new URL(req.url);if(url.origin!==self.location.origin||!url.pathname.startsWith(ROOT.pathname))return;
 if(req.mode==="navigate"){event.respondWith((async()=>{try{return await fetch(req);}catch(e){return await caches.match(new URL("./index.html",ROOT).href)||Response.error();}})());return;}
 if(!urls.includes(url.href))return;
 event.respondWith((async()=>{
 const cache=await caches.open(CACHE),found=await cache.match(url.href);
 if(found)return found;
 try{const net=await fetch(req);if(net.ok)await cache.put(url.href,net.clone());return net;}catch(e){return Response.error();}
 })());
});
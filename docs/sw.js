const VERSION='strad-gm-20261023-prep-v3';
const SHELL=['./','index.html','today.html','today.json','future.html','future.json','tarokka.html','style.css','reader.css','reader.js','tarokka.js','offline.js','reader.json','cards.json','assets/mark.svg','offline-manifest.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{const fresh=await caches.open(VERSION);for(const key of await caches.keys()){if(!key.startsWith('strad-gm-')||key===VERSION)continue;const old=await caches.open(key);for(const request of await old.keys()){if(!await fresh.match(request)){const response=await old.match(request);if(response)await fresh.put(request,response);}}await caches.delete(key);}await self.clients.claim();})());});
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
 e.respondWith(fetch(e.request).then(async r=>{if(r.ok){const c=await caches.open(VERSION);await c.put(e.request,r.clone());}return r;}).catch(async()=>{const r=await caches.match(e.request);if(r)return r;return new Response('Нет сети. Заранее нажмите «Сохранить для дороги».',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});}));
});
self.addEventListener('message',e=>{
 if(e.data?.type!=='CACHE_ALL')return;const port=e.ports[0];
 e.waitUntil((async()=>{try{const response=await fetch('offline-manifest.json',{cache:'reload'});if(!response.ok)throw new Error();const files=await response.json(),cache=await caches.open(VERSION);let done=0;
 for(const file of files){await cache.add(new Request(new URL(file,self.registration.scope),{cache:'reload'}));port.postMessage({type:'progress',done:++done,total:files.length});}
 port.postMessage({type:'done'});
 }catch{port.postMessage({type:'error'});}})());
});

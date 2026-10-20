export function setupOffline(){
 const button=document.querySelector('#offline-save'),status=document.querySelector('#offline-status');
 if(!('serviceWorker'in navigator)||!window.isSecureContext){if(button)button.hidden=true;return;}
 const ready=navigator.serviceWorker.register('sw.js').then(()=>navigator.serviceWorker.ready);
 ready.catch(()=>{if(status)status.textContent='Офлайн-режим недоступен в этом браузере.';});
 button?.addEventListener('click',async()=>{
  button.disabled=true;if(status)status.textContent='Сохраняю карты и материалы…';
  try{const registration=await ready;const channel=new MessageChannel();
   channel.port1.onmessage=e=>{if(e.data.type==='progress'){status.textContent=`Сохранено ${e.data.done} из ${e.data.total}`;}else if(e.data.type==='done'){status.textContent='Готово: материалы доступны без сети на этом устройстве.';button.disabled=false;channel.port1.close();}else if(e.data.type==='error'){status.textContent='Не всё сохранилось. Подключись к сети и повтори.';button.disabled=false;channel.port1.close();}};
   (registration.active||registration.waiting||registration.installing).postMessage({type:'CACHE_ALL'},[channel.port2]);
  }catch{status.textContent='Не удалось сохранить. Проверь подключение.';button.disabled=false;}
 });
}

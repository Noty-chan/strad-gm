const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const key='strad.tarokka.v1';
let state={deck:'high',suit:'all',readingMode:'personal',saved:[],notes:{},spread:[null,null,null,null,null],last:null};
try{Object.assign(state,JSON.parse(localStorage.getItem(key)||'{}'));}catch{}
if(!Array.isArray(state.saved))state.saved=[];
if(!Array.isArray(state.spread)||state.spread.length!==5)state.spread=[null,null,null,null,null];
if(!state.notes||typeof state.notes!=='object')state.notes={};
const save=()=>{try{localStorage.setItem(key,JSON.stringify(state));}catch{toast('Браузер не разрешил сохранить данные на устройстве.');}};
let data,filtered=[],current=null,role=null,selectedSlot=null,toastTimer;
const slotNames=['Том Страда','Святой символ Равенкинд','Солнечный меч','Союзник против Страда','Место встречи со Страдом'];
function toast(message){const e=$('#toast');($('#card-dialog').open?$('#card-dialog'):document.body).append(e);e.textContent=message;e.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.hidden=true,3400);}
function make(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
const clean=s=>s.toLocaleLowerCase('ru').replaceAll('ё','е');
function byId(id){return data.cards.find(c=>c.id===id);}
function description(){if(state.readingMode==='personal')return 'Личная судьба: выбери образ героя. Книжное значение и авторская заготовка показаны отдельно.';return state.deck==='high'?'Старшая колода — силы судьбы. Союзник и место встречи со Страдом.':state.deck==='common'?'Младшая колода — четыре масти. Места трёх сокровищ.':'Все 54 карты. Общее значение и книжные толкования.';}
function filters(){
  if(!data)return;
  $$('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===state.readingMode)));
  $$('[data-deck]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.deck===state.deck)));
  $$('[data-suit]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.suit===state.suit)));
  $('#suit-filters').hidden=state.deck==='high';
  const q=clean($('#card-search').value.trim());
  filtered=data.cards.filter(c=>(state.deck==='all'||c.deck===state.deck)&&(state.suit==='all'||state.deck==='high'||c.suit===state.suit)&&(!$('#only-saved').checked||state.saved.includes(c.id))&&(!q||clean([c.name,c.english,c.number,c.meaning,c.playing,JSON.stringify(c.personal||{}),...Object.values(c.readings).flat().map(r=>r.text),c.id==='high-6'?'Привидение':'',c.id==='high-13'?'Прорицатель':'',c.id==='glyphs-3'?'Целитель':''].join(' ')).includes(q)));
  const grid=$('#cards-grid');grid.replaceChildren();$('#no-cards').hidden=filtered.length>0;
  $('#deck-description').textContent=q?`Найдено: ${filtered.length}. Поиск по названиям, значениям и толкованиям.`:description();
  filtered.forEach(c=>{
    const b=make('button',undefined,'card-tile');b.dataset.cardId=c.id;b.setAttribute('aria-label',`${c.name}, ${c.number}. Открыть карту`);
    const picture=make('span',undefined,'card-picture');picture.style.display='block';const img=make('img');img.src=c.image;img.alt='';img.loading='lazy';img.width=324;img.height=454;picture.append(img);
    if(state.saved.includes(c.id))picture.append(make('span','★','tile-saved'));
    b.append(picture,make('span',c.name,'card-label'),make('span',c.number,'card-subtitle'));
    b.addEventListener('click',()=>openCard(c.id));grid.append(b);
  });
  save();
}
function paragraphs(raw,parent){
  const lines=raw.trim().split(/\n/);let pending='';
  const flush=()=>{if(pending.trim())parent.append(make('p',pending.replace(/\s+/g,' ').trim()));pending='';};
  for(const line of lines){const t=line.trim();if(!t){flush();continue;}pending+=(pending?' ':'')+t;if(/[.!?»]$/.test(t))flush();}
  flush();
}
function oracleSplit(text){
  const re=/\n(?=(?:Сокровище (?:находится|расположено|спрятано|лежит)|Эта карта (?:отсылает|указывает|говорит)|Страд встретит|Это (?:карта|место)|В этой карте|Он находится))/g;
  const m=re.exec(text);return m?[text.slice(0,m.index),text.slice(m.index)]:[null,text];
}
function renderReading(){
  const c=byId(current),wrap=$('#reading-content');wrap.replaceChildren();wrap.className='reading-content';
  const campaignOptions=c.deck==='common'?[['treasure','Сокровище']]:[['ally','Союзник'],['strahd','Страд в замке']];
  const options=[['personal','Личная судьба'],...campaignOptions];
  if(!options.some(([r])=>r===role)||role===null)role=state.readingMode==='personal'?'personal':campaignOptions[0][0];
  const tabs=$('#reading-tabs');tabs.replaceChildren();
  for(const [r,label] of options){const b=make('button',label);b.setAttribute('aria-pressed',String(r===role));b.addEventListener('click',()=>{role=r;renderReading();});tabs.append(b);}
  if(role==='personal'){renderPersonal(c,wrap);return;}
  wrap.append(make('p',role==='treasure'?'Это толкование используется в позициях 1–3. Карта указывает место сокровища; конкретный предмет определяет позиция.':role==='ally'?'Позиция 4: союзник. Если книга даёт несколько вариантов, ведущий выбирает один из них.':'Позиция 5: место в Равенлофте, где герои впервые гарантированно встретят Страда, если тот ещё не вынужден вернуться в гроб.','role-note'));
  const variants=c.readings[role]||[];
  variants.forEach((r,i)=>{
    const section=make('section',undefined,'reading-variant');if(variants.length>1)section.append(make('h4',`Вариант ${i+1} из ${variants.length}`));
    const [oracle,answer]=oracleSplit(r.text);
    if(oracle){section.append(make('h3','Слова предсказания'));const quote=make('blockquote',oracle.replace(/\s+/g,' ').trim());section.append(quote);section.append(make('h3','Разгадка для ведущего'));paragraphs(answer,section);}
    else{section.append(make('h3','Книжное толкование · для ведущего'));paragraphs(answer,section);}
    section.append(make('p',`${r.source} · глава 1 · страницы PDF ${r.pages}`,'source-ref'));wrap.append(section);
  });
  if(c.id==='glyphs-3'||c.id==='high-6'||c.id==='high-13')wrap.append(make('p',c.id==='glyphs-3'?'В главе 1 эта же карта названа «Целитель». В приложении Е — «Лекарь».':c.id==='high-6'?'В главе 1 эта же карта называется «Привидение». В приложении Е — «Призрак».':'В главе 1 эта же карта называется «Прорицатель». В приложении Е — «Провидец».','role-note'));
}
function renderPersonal(c,wrap){
  const p=c.personal;if(!p){wrap.append(make('p','Обнови страницу, чтобы загрузить личные трактовки.'));return;}
  wrap.append(make('p',p.kind,'role-note'),make('h3','Возможные слова предсказания'),make('blockquote',p.omen),make('h3','Какое личное дело может обозначать'),make('p',p.task),make('h3','Что остаётся выбором героя'),make('p',p.choice));
  const copyOmen=make('button','Скопировать личное предсказание','quiet');copyOmen.addEventListener('click',()=>copy(c.name+' — авторская личная трактовка\n'+p.omen+'\nТема: '+p.task+'\nВыбор: '+p.choice));wrap.append(copyOmen);
  if(p.raisingExample){const box=make('aside',undefined,'personal-source');box.append(make('h3','Прямой пример из «Повышения ставок»'),make('p',p.raisingExample));wrap.append(box);}
  wrap.append(make('p',p.basis,'source-ref'));
  if(p.campaignDraft){const d=p.campaignDraft,box=make('section',undefined,'personal-draft');box.append(make('h3','Для нашей кампании: '+d.hero),make('p',d.status,'role-note'),make('blockquote',d.text),make('p',d.context));wrap.append(box);}
  const link=make('a','Книжный метод, варианты из гайдов и источники →');link.href='index.html#personal-reading';wrap.append(link);
}
function openCard(id,{replace=false}={}){
  const c=byId(id);if(!c)return;current=id;state.last=id;save();
  $('#card-title').textContent=c.name;$('#card-number').textContent=c.number+' · '+(c.deck==='high'?'Старшая колода':'Младшая колода');$('#card-english').textContent=c.english+' · обычная колода: '+c.playing;
  $('#card-art').src=c.image;$('#card-art').alt=`${c.name} — оригинальная карта ${c.english}`;
  $('#card-meaning').textContent=c.meaning;$('#meaning-source').textContent=`Дословно: Проклятье Страда · приложение Е · PDF ${c.meaningPage} / печатная ${c.meaningPage-2}. Сверено с PDF.`;
  $('#art-source').textContent=`Иллюстрация: Проклятье Страда, страница PDF ${c.artPage}. Извлечена без перерисовки.`;
  $('#card-note').value=state.notes[id]||'';
  updateSaved();renderReading();
  const index=filtered.findIndex(x=>x.id===id);
  $('#card-position').textContent=index>=0?`${index+1} / ${filtered.length} · ${state.deck==='high'?'старшая':state.deck==='common'?'младшая':'все карты'}`:'Карта из сохранённого расклада';
  $('#card-prev').disabled=index<=0;$('#card-next').disabled=index<0||index>=filtered.length-1;
  $('#assign-popover').hidden=true;$('#card-scroll').scrollTop=0;
  if(!$('#card-dialog').open){$('#card-dialog').showModal();document.body.style.overflow='hidden';}
  const next=filtered[index+1];if(next){const im=new Image();im.src=next.image;}
  if(!replace)history.replaceState(null,'','#card='+encodeURIComponent(id)+(state.readingMode==='personal'?'&mode=personal':''));
}
function updateSaved(){const saved=state.saved.includes(current);$('#card-save').setAttribute('aria-pressed',String(saved));$('#card-save').textContent=saved?'★':'☆';$('#card-save').setAttribute('aria-label',saved?'Убрать карту из закладок':'Добавить карту в закладки');}
function nextCard(delta){const i=filtered.findIndex(x=>x.id===current);if(i>=0&&filtered[i+delta])openCard(filtered[i+delta].id);}
function closeCard(){if($('#card-dialog').open)$('#card-dialog').close();}
function renderSpread(){
  const wrap=$('#spread-slots');wrap.replaceChildren();
  slotNames.forEach((name,i)=>{
    const b=make('button',undefined,'spread-slot'+(selectedSlot===i?' selected':''));b.dataset.slot=String(i);const c=byId(state.spread[i]);
    if(c){const img=make('img');img.src=c.image;img.alt='';b.append(img);}
    b.append(make('span',`${i+1}. ${name}`),make('strong',c?c.name:'Выбрать карту'),make('small',i<3?'Младшая колода':'Старшая колода'));
    b.addEventListener('click',()=>{selectedSlot=i;state.deck=i<3?'common':'high';state.suit='all';$('#card-search').value='';$('#only-saved').checked=false;filters();renderSpread();toast(`Выбери карту: ${name.toLowerCase()}`);$('#cards-grid').scrollIntoView({behavior:'smooth',block:'start'});});wrap.append(b);
  });
  $('#spread-count').textContent=`${state.spread.filter(Boolean).length}/5`;
}
function assignPopover(){
  const c=byId(current),wrap=$('#assign-slots');wrap.replaceChildren();
  slotNames.forEach((name,i)=>{if((i<3)!==(c.deck==='common'))return;const b=make('button',`${i+1}. ${name}`);const existing=byId(state.spread[i]);if(existing)b.append(make('small','Сейчас: '+existing.name));
    b.addEventListener('click',()=>{assignToSlot(i,c.id);selectedSlot=null;save();renderSpread();$('#assign-popover').hidden=true;toast('Карта добавлена в черновик расклада.');});wrap.append(b);});
  $('#assign-popover').hidden=false;
}
function assignToSlot(slot,id){state.spread=state.spread.map((old,i)=>i===slot?id:old===id?null:old);}
async function copy(text){try{await navigator.clipboard.writeText(text);toast('Скопировано. Можно вставить в наш чат.');}catch{const area=make('textarea',text);document.body.append(area);area.select();const success=document.execCommand('copy');area.remove();toast(success?'Скопировано.':'Не удалось скопировать; браузер запретил доступ.');}}
$('#card-close').addEventListener('click',closeCard);
$('#card-dialog').addEventListener('close',()=>{document.body.append($('#toast'));document.body.style.overflow='';history.replaceState(null,'',location.pathname+location.search);filters();});
$('#card-dialog').addEventListener('click',e=>{if(e.target===$('#card-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeCard();}});
$('#card-prev').addEventListener('click',()=>nextCard(-1));$('#card-next').addEventListener('click',()=>nextCard(1));
$('#card-save').addEventListener('click',()=>{state.saved=state.saved.includes(current)?state.saved.filter(x=>x!==current):[...state.saved,current];save();updateSaved();});
$('#card-note').addEventListener('input',e=>{state.notes[current]=e.target.value;save();});
$('#assign-card').addEventListener('click',()=>{
  const c=byId(current);
  if(selectedSlot!==null&&((selectedSlot<3)===(c.deck==='common'))){assignToSlot(selectedSlot,c.id);selectedSlot=null;save();renderSpread();toast('Карта добавлена в выбранное место.');return;}
  assignPopover();
});
$('#assign-cancel').addEventListener('click',()=>$('#assign-popover').hidden=true);
$('#copy-card').addEventListener('click',()=>{const c=byId(current);copy(`Тарокка: ${c.name} (${c.number}).\nЗначение: ${c.meaning}\n${state.notes[c.id]?'Моя заметка: '+state.notes[c.id]+'\n':''}Обсудим эту карту для нашей кампании.\n${location.href}`);});
$('#copy-spread').addEventListener('click',()=>copy('Черновик общего расклада Тарокка:\n'+slotNames.map((n,i)=>`${i+1}. ${n}: ${byId(state.spread[i])?.name||'не выбрано'}`).join('\n')));
$('#clear-spread').addEventListener('click',()=>{if(state.spread.some(Boolean)&&!confirm('Очистить пять карт черновика?'))return;state.spread=[null,null,null,null,null];selectedSlot=null;save();renderSpread();});
$('#spread-toggle').addEventListener('click',()=>{const p=$('#spread-panel');p.hidden=!p.hidden;$('#spread-toggle').setAttribute('aria-expanded',String(!p.hidden));});
$$('[data-deck]').forEach(b=>b.addEventListener('click',()=>{state.deck=b.dataset.deck;state.suit='all';filters();}));
$$('[data-mode]').forEach(b=>b.addEventListener('click',()=>{state.readingMode=b.dataset.mode;role=null;filters();if($('#card-dialog').open)renderReading();}));
$$('[data-suit]').forEach(b=>b.addEventListener('click',()=>{state.suit=b.dataset.suit;filters();}));
$('#card-search').addEventListener('input',filters);$('#only-saved').addEventListener('change',filters);
$('#reset-filters').addEventListener('click',()=>{state.deck='all';state.suit='all';$('#card-search').value='';$('#only-saved').checked=false;filters();});
document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName))return;if($('#card-dialog').open){if(e.key==='ArrowLeft'){e.preventDefault();nextCard(-1);}if(e.key==='ArrowRight'){e.preventDefault();nextCard(1);}}else if(e.key==='/'){e.preventDefault();$('#card-search').focus();}});
let touch=null;
$('#swipe-area').addEventListener('touchstart',e=>{if(e.touches.length===1)touch={x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});
$('#swipe-area').addEventListener('touchend',e=>{if(!touch||!e.changedTouches.length)return;const dx=e.changedTouches[0].clientX-touch.x,dy=e.changedTouches[0].clientY-touch.y;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5)nextCard(dx<0?1:-1);touch=null;},{passive:true});
function openFromHash(){
  if(!data)return;
  const params=new URLSearchParams(location.hash.slice(1));if(['personal','campaign'].includes(params.get('mode'))){state.readingMode=params.get('mode');role=null;}
  const wanted=params.get('card');if(wanted&&byId(wanted)){state.deck=byId(wanted).deck;state.suit='all';filters();openCard(wanted,{replace:true});}
}
window.addEventListener('hashchange',openFromHash);
try{
  const response=await fetch('cards.json');if(!response.ok)throw new Error('HTTP '+response.status);data=await response.json();filters();renderSpread();
  openFromHash();
}catch(error){$('#cards-grid').replaceChildren(make('p','Не удалось загрузить карты. Проверь соединение и обнови страницу.'));console.error(error);}
import {setupOffline} from './offline.js';setupOffline();

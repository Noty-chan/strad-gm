const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const KEY=document.body.dataset.store||'strad.reader.v1',NOTE_FORMAT=document.body.dataset.noteFormat||'strad-notes-1';let state={last:'start',read:[],saved:[],notes:{},font:19,light:false,scroll:{}};
try{Object.assign(state,JSON.parse(localStorage.getItem(KEY)||'{}'));}catch{}
for(const k of ['read','saved'])if(!Array.isArray(state[k]))state[k]=[];
for(const k of ['notes','scroll'])if(!state[k]||typeof state[k]!=='object')state[k]={};
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}};
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
let book,current=null,toastTimer;
function toast(s){$('#toast').textContent=s;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,3500);}
function prefs(){document.documentElement.style.setProperty('--reading-size',Math.min(27,Math.max(16,state.font))+'px');document.body.classList.toggle('light',state.light);}
function toc(){
 const q=$('#reader-search').value.toLowerCase().replaceAll('ё','е'),nav=$('#chapter-list');nav.replaceChildren();
 book.sections.forEach((s,i)=>{if(q&&!JSON.stringify(s).toLowerCase().replaceAll('ё','е').includes(q))return;const a=el('a',undefined,'chapter-link');a.href='#'+s.id;if(s.id===current)a.setAttribute('aria-current','page');a.append(el('span',String(i+1).padStart(2,'0'),'chapter-number'),el('span',s.title,'chapter-label'),el('span',state.read.includes(s.id)?'✓':state.saved.includes(s.id)?'★':'','chapter-check'));nav.append(a);});
 if(!nav.children.length)nav.append(el('p','Ничего не найдено.','toc-note'));
}
function render(id,{restore=false}={}){
 const s=book.sections.find(s=>s.id===id)||book.sections[0];
 current=s.id;state.last=current;save();
 const a=$('#chapter');a.replaceChildren(el('div',s.kicker,'eyebrow'),el('h2',s.title),el('p',s.summary,'chapter-summary'));
 const body=el('div');body.innerHTML=s.body;a.append(body);
 const sources=el('aside',undefined,'sources');sources.append(el('strong','Где читать · физические страницы PDF'));for(const source of s.sources)sources.append(el('p',source));a.append(sources);
 if(s.extracts.length){a.append(el('h3','Книжные фрагменты'));a.append(el('p','Раскрой нужный блок. Текст из твоих файлов: переносы строк частично сохранены; исходные формулировки и варианты могут отличаться от принятой версии кампании.','excerpt-warning'));}
 s.extracts.forEach(ex=>{const details=el('details',undefined,'excerpt'),summary=el('summary',ex.title);summary.append(el('small',`${ex.book} · PDF ${ex.pages}`));const tools=el('div',undefined,'excerpt-tools'),copy=el('button','Скопировать фрагмент','quiet');copy.addEventListener('click',()=>clipboard(ex.title+'\n'+ex.book+', PDF '+ex.pages+'\n\n'+ex.text));tools.append(copy);const text=el('div',ex.text,'excerpt-content');details.append(summary,tools,text);a.append(details);});
 $('#section-note').value=state.notes[current]||'';const index=book.sections.indexOf(s);$('#chapter-prev').disabled=index===0;$('#chapter-next').disabled=index===book.sections.length-1;$('#mobile-position').textContent=`${index+1} / ${book.sections.length}`;
 updateRead();toc();document.title=s.title+' · Туманы Баровии';
 $('#reader-toc').classList.remove('open');$('#toc-toggle').setAttribute('aria-expanded','false');
 if(restore&&state.scroll[current])requestAnimationFrame(()=>window.scrollTo(0,state.scroll[current]));
}
function updateRead(){const read=state.read.includes(current);$('#mark-read').setAttribute('aria-pressed',String(read));$('#mark-read').textContent=read?'Прочитано ✓':'Отметить прочитанным';$('#reading-progress').textContent=`Прочитано ${state.read.length} из ${book.sections.length}`;const saved=state.saved.includes(current);$('#bookmark-section').textContent=saved?'★':'☆';$('#bookmark-section').setAttribute('aria-pressed',String(saved));}
function move(delta){const i=book.sections.findIndex(s=>s.id===current);if(book.sections[i+delta])location.hash=book.sections[i+delta].id;}
async function clipboard(text){try{await navigator.clipboard.writeText(text);toast('Скопировано — можно отправить в наш чат.');}catch{toast('Браузер запретил копирование. Можно выделить текст вручную.');}}
$('#chapter-prev').addEventListener('click',()=>move(-1));$('#chapter-next').addEventListener('click',()=>move(1));
$('#mark-read').addEventListener('click',()=>{state.read=state.read.includes(current)?state.read.filter(x=>x!==current):[...state.read,current];save();updateRead();toc();});
$('#bookmark-section').addEventListener('click',()=>{state.saved=state.saved.includes(current)?state.saved.filter(x=>x!==current):[...state.saved,current];save();updateRead();toc();});
$('#section-note').addEventListener('input',e=>{state.notes[current]=e.target.value;save();});
$('#copy-section').addEventListener('click',()=>{const s=book.sections.find(s=>s.id===current);clipboard(`Подготовка Страда: ${s.title}\n${state.notes[current]||'Хочу обсудить этот раздел.'}\n${location.href}`);});
$('#reader-search').addEventListener('input',toc);$('#toc-toggle').addEventListener('click',()=>{const open=$('#reader-toc').classList.toggle('open');$('#toc-toggle').setAttribute('aria-expanded',String(open));});
$('#font-down').addEventListener('click',()=>{state.font=Math.max(16,state.font-1);prefs();save();});$('#font-up').addEventListener('click',()=>{state.font=Math.min(27,state.font+1);prefs();save();});$('#theme-switch').addEventListener('click',()=>{state.light=!state.light;prefs();save();});
$('#export-notes').addEventListener('click',()=>{let tarokka=null;try{tarokka=JSON.parse(localStorage.getItem('strad.tarokka.v1')||'null');}catch{}const blob=new Blob([JSON.stringify({format:NOTE_FORMAT,exported:new Date().toISOString(),reader:state,tarokka},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='strad-notes-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);});
$('#import-notes').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const value=JSON.parse(await file.text());if(value.format!==NOTE_FORMAT||!value.reader||typeof value.reader.notes!=='object')throw new Error();if(!confirm('Объединить заметки? Совпадающие записи будут заменены импортированными.'))return;state.notes={...state.notes,...value.reader.notes};state.read=[...new Set([...state.read,...(value.reader.read||[])])];state.saved=[...new Set([...state.saved,...(value.reader.saved||[])])];if(value.tarokka){let old={};try{old=JSON.parse(localStorage.getItem('strad.tarokka.v1')||'{}');}catch{}localStorage.setItem('strad.tarokka.v1',JSON.stringify({...old,...value.tarokka,notes:{...old.notes,...value.tarokka.notes}}));}save();render(current);toast('Заметки загружены.');}catch{toast('Не удалось прочитать файл заметок этой читалки.');}finally{e.target.value='';}});
let scrollTimer;window.addEventListener('scroll',()=>{if(!current)return;clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>{state.scroll[current]=window.scrollY;save();},250);},{passive:true});
window.addEventListener('hashchange',()=>{const wanted=decodeURIComponent(location.hash.slice(1));if(book?.sections.some(s=>s.id===wanted)){render(wanted);$('#chapter').scrollIntoView({behavior:'instant',block:'start'});}});
prefs();
try{const r=await fetch(document.body.dataset.book||'reader.json',{cache:'no-cache'});if(!r.ok)throw new Error(r.status);book=await r.json();const hash=decodeURIComponent(location.hash.slice(1));render(hash||state.last,{restore:!hash});}catch(e){$('#chapter').textContent='Не удалось загрузить материалы. Проверь соединение и обнови страницу.';console.error(e);}
import {setupOffline} from './offline.js';setupOffline();

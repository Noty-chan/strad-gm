"""Publish only GM-authored preparation and source analysis; no full book exports."""
from pathlib import Path
from markdown_it import MarkdownIt
import json,re
root=Path(__file__).resolve().parents[1]
campaign=root.parent/'База кампании'
docs=root/'docs'
md=MarkdownIt('commonmark',{'html':False}).enable('table')
plans=campaign/'02_Сессии/Планы'
research=campaign/'07_Источники/Большой разбор 2026-10-23'
spec=[
 ('plan','Материалы на сегодня',plans/'Сегодня — деревня Баровия.md','Выбранное ведущим · открытые связи'),
 ('village','Деревня: сведения и связи',plans/'Сегодня — карточки деревни.md','Книги и версия кампании'),
 ('personal','Личные зацепки',plans/'Сегодня — личные зацепки.md','Джари · Корво · Рататуй'),
 ('cooking','Кулинария: правила и пробник',plans/'Кулинария — первый запуск.md','Механика и техническая заготовка'),
 ('remi','Реми: справка',plans/'Сегодня — тренировка Реми.md','Уже выданные способности'),
 ('sources','Сверка источников',plans/'Сегодня — сверка источников.md','Книжное / выбранное / предложенное'),
]
future=[
 ('seeds','Связи с будущим',plans/'Ружья будущего — деревня и Тсер.md','Книги · возможные пересечения'),
 ('overview','Как читать дополнения',research/'README.md','Обзор исследования'),
 ('reloaded','Reloaded: будущие связи',research/'Reloaded — карта и ранние следы.md','Глубже · сюжет и развилки'),
 ('mandy','MandyMod: будущие связи',research/'MandyMod — карта и ранние следы.md','Глубже · отношения и последствия'),
 ('pyram','Pyram King: будущие связи',research/'Pyram King — карта и ранние следы.md','Глубже · местные дополнения'),
 ('heliana','Хелиана: полезное для партии',research/'Хелиана — что брать в кампанию.md','Механики · без перегруза'),
]
extra=research/'Кибблз — возможности для Джари и темп кампании.md'
if extra.exists(): future.append(('kibbles','Кибблз: возможности Джари',extra,'Механики · отдельный выбор'))
# Read the handoff file once it is explicitly saved by the Foundry chat.
handoff=campaign/'06_Foundry/Рабочее место/Сессия 6 — готовность/Сводка для вкладки подготовки.md'
if handoff.exists():spec.insert(1,('foundry','Foundry: что готово и где',handoff,'Сводка соседнего чата'))
all_specs=[('today.html',x) for x in spec]+[('future.html',x) for x in future]
mapping={p.resolve():(page+'#'+ident) for page,(ident,title,p,kicker) in all_specs}
def render(p):
    text=p.read_text(encoding='utf-8')
    text=re.sub(r'^# .+\n','',text,count=1)
    # Absolute/local/private file links are shown as source labels, never broken public paths.
    def link(m):
        label,target=m.group(1),m.group(2).strip('<>')
        if target.startswith(('https://','http://','#','mailto:')):return m.group(0)
        from urllib.parse import unquote
        path=(p.parent/unquote(target.split('#')[0])).resolve()
        dest=mapping.get(path)
        return f'[{label}]({dest})' if dest else label+' *(локальный источник)*'
    text=re.sub(r'\[([^\]]+)\]\((<[^>]+>|[^)]+)\)',link,text)
    html=md.render(text).replace('<h2>','<h3>').replace('</h2>','</h3>')
    if p==handoff:
        html='<div class="campaign-box"><strong>Готово к игре:</strong> 7 закрытых страниц, лист ван Рихтена, кандидат Сава, макросы плана, карт и обеда. Токены не дублировались. Открывай «Codex — подготовка сессии 6».<br><strong>Перед показом карты:</strong> на старой обзорной Баровии уже есть видимые зомби и крысы — сначала осмотри её.</div><details class="excerpt"><summary>Полная сводка: расположение токенов, UUID и ручные действия</summary>'+html+'</details>'
    return html.replace('<table>','<div class="table-scroll"><table>').replace('</table>','</table></div>')
def build(name,entries,title,subtitle):
    sections=[]
    for ident,label,path,kicker in entries:
        assert path.exists(),path
        sections.append(dict(id=ident,title=label,kicker=kicker,summary='Подготовка 23.10.2026 · для ведущего · не хроника сыгранного',body=render(path),sources=[path.name+' · рабочий материал кампании; ссылки на первоисточники внутри раздела.'],extracts=[],editorial=True))
    (docs/(name+'.json')).write_text(json.dumps({'sections':sections},ensure_ascii=False,indent=2),encoding='utf-8')
    template=(docs/'index.html').read_text(encoding='utf-8')
    template=template.replace('<body>','<body data-book="'+name+'.json" data-store="strad.'+name+'.v1" data-note-format="strad-'+name+'-notes-1">')
    template=template.replace('Из Баровии<br>к озеру Тсер',title)
    template=template.replace('Ирина, Сваличская дорога, виселица и карты судьбы.<br>Обе книги и ваши решения — рядом.',subtitle)
    template=template.replace('БЛИЖАЙШАЯ ИГРА <span>ПОДГОТОВКА В ДОРОГЕ</span>','23 ОКТЯБРЯ <span>СЕССИЯ ПОСЛЕ ПЯТОЙ</span>')
    template=re.sub(r'<a href="tarokka.html" class="tarokka-banner">.*?</a>','<div class="campaign-box">Сведения из книг, выбранное ведущим и возможные связи. Без расписания и назначенных сцен.</div>',template)
    template=template.replace('aria-current="page"','')
    template=template.replace('href="'+name+'.html"','href="'+name+'.html" aria-current="page"')
    template=template.replace('обновлено 20.10.2026','обновлено 23.10.2026')
    template=template.replace('Книжные фрагменты отмечены источником. Предложения ведущему и решения кампании подписаны отдельно.','Рабочие карточки и аналитика. Выбранное ведущим отделено от новых предложений; сыгранное — в хронике.')
    (docs/(name+'.html')).write_text(template,encoding='utf-8')
for name in ['index.html','tarokka.html']:
    p=docs/name;s=p.read_text(encoding='utf-8')
    if 'href="today.html"' not in s:s=s.replace('</nav></header>','<a href="today.html">Сегодня</a><a href="future.html">Ружья</a></nav></header>',1)
    p.write_text(s,encoding='utf-8')
build('today',spec,'Сегодня в Баровии','Книжные сведения и выбранные тобой направления.<br>Рядом — сохранённая техническая подготовка Foundry.')
build('future',future,'Ружья будущего','Найденные связи с дальнейшим сюжетом.<br>Что есть в источниках и что можно обсудить для нашей кампании.')
manifest=docs/'offline-manifest.json';files=json.loads(manifest.read_text(encoding='utf-8'))
for name in ['today.html','today.json','future.html','future.json']:
    if name not in files:files.append(name)
manifest.write_text(json.dumps(files,ensure_ascii=False,indent=2),encoding='utf-8')
sw=docs/'sw.js';s=sw.read_text(encoding='utf-8');s=re.sub(r"const VERSION='[^']+';","const VERSION='strad-gm-20261023-prep-v3';",s)
if "'today.html'" not in s:s=s.replace("'index.html',","'index.html','today.html','today.json','future.html','future.json',")
sw.write_text(s,encoding='utf-8')
js=docs/'reader.js';s=js.read_text(encoding='utf-8')
s=s.replace("format:'strad-notes-1'","format:NOTE_FORMAT").replace("value.format!=='strad-notes-1'","value.format!==NOTE_FORMAT").replace("fetch('reader.json')","fetch(document.body.dataset.book||'reader.json')").replace("fetch(document.body.dataset.book||'reader.json')","fetch(document.body.dataset.book||'reader.json',{cache:'no-cache'})")
js.write_text(s,encoding='utf-8')
print('Built',len(spec),'session sections and',len(future),'future sections. Foundry summary:',handoff.exists())

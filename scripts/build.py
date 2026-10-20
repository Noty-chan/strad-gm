"""Build only the selected GM materials; never copy the campaign vault or books wholesale."""
from pathlib import Path
import re, json, html, hashlib
import fitz
from PIL import Image
from io import BytesIO

ROOT = Path(__file__).resolve().parents[1]
CAMPAIGN = ROOT.parent
SOURCES = CAMPAIGN / 'База кампании/07_Источники/Текстовые копии'
OUT = ROOT / 'docs'
OUT.mkdir(exist_ok=True)
BOOKS = {'original': 'Проклятье Страда', 'raising': 'Повышение Ставок'}

def page(book, n):
    text = (SOURCES / (BOOKS[book] + '.md')).read_text(encoding='utf-8')
    match = re.search(r'^## PDF page '+str(n)+r'\b.*$', text, re.M)
    assert match, (book, n)
    end = text.find('\n## PDF page ', match.end())
    raw = text[match.end():end if end >= 0 else None].strip()
    lines = raw.splitlines()
    # Printed running heads and feet are navigation, not part of the excerpt.
    lines = [l for l in lines if not re.match(r'^\d+\s*(?:Г\s*лава|Приложение|Эпилог)', l)
             and not re.match(r'^(?:\d+\s*\||.*\|\s*\d+\s*$)', l)]
    return '\n'.join(lines).strip()

def pages(book, ns):
    return '\n\n'.join(page(book, n) for n in ns)

def dehyphen(text):
    text = re.sub(r'([а-яА-ЯёЁ])[-\u00ad]\s*\n\s*([а-яё])', r'\1\2', text)
    return text.replace('\u00ad', '')

def flat(text):
    return re.sub(r'\s+', ' ', dehyphen(text)).strip()

def between(text, start=None, end=None):
    if start:
        i = text.find(start)
        assert i >= 0, start
        text = text[i:]
    if end:
        i = text.find(end)
        assert i >= 0, end
        text = text[:i]
    return text.strip()

SUITS = {
 'swords': ('Мечи', 'Мечей', ['Воин','Мститель','Паладин','Солдат','Наёмник','Мирмидон','Берсерк','Сокрытый','Диктатор','Мучитель'], ['Warrior','Avenger','Paladin','Soldier','Mercenary','Myrmidon','Berserker','Hooded One','Dictator','Torturer']),
 'stars': ('Звёзды', 'Звёзд', ['Волшебник','Превращающий','Прорицающий','Очарователь','Преграждающий','Элементалист','Воплощающий','Иллюзионист','Некромант','Сотворяющий'], ['Wizard','Transmuter','Diviner','Enchanter','Abjurer','Elementalist','Evoker','Illusionist','Necromancer','Conjurer']),
 'coins': ('Монеты', 'Монет', ['Плут','Бретёр','Филантроп','Торговец','Купец','Член гильдии','Попрошайка','Вор','Сборщик податей','Скряга'], ['Rogue','Swashbuckler','Philanthropist','Trader','Merchant','Guild Member','Beggar','Thief','Tax Collector','Miser']),
 'glyphs': ('Глифы', 'Глифов', ['Священник','Монах','Миссионер','Лекарь','Пастух','Друид','Анархист','Шарлатан','Епископ','Предатель'], ['Priest','Monk','Missionary','Healer','Shepherd','Druid','Anarchist','Charlatan','Bishop','Traitor'])
}
HIGH = ['Артефакт','Зверь','Сломленный','Тёмный Властелин','Донжон','Призрак','Палач','Всадник','Невинный','Марионетка','Туманы','Ворон','Провидец','Искуситель']
HIGH_EN = ['Artifact','Beast','Broken One','Darklord','Donjon','Ghost','Executioner','Horseman','Innocent','Marionette','Mists','Raven','Seer','Tempter']
PLAYING = ['Джокер 1','Бубновый валет','Бубновый король','Пиковый король','Трефовый король','Червовый король','Пиковый валет','Джокер 2','Червовая дама','Червовый валет','Пиковая дама','Трефовая дама','Трефовый валет','Бубновая дама']
cards = []
high_text = between(page('original',241), 'стаРшая колода')
high_pattern = re.compile(r'^('+'|'.join(re.escape(n) for n in HIGH)+r')\s+', re.M|re.I)
matches = list(high_pattern.finditer(high_text))
assert len(matches) == 14
for index, match in enumerate(matches):
    name = next(n for n in HIGH if n.lower()==match[1].lower())
    i = HIGH.index(name)
    meaning = high_text[match.end():matches[index+1].start() if index+1<len(matches) else None]
    cards.append(dict(id='high-'+str(i+1),name=name,english=HIGH_EN[i],deck='high',suit='high',rank=None,number='Корона',playing=PLAYING[i],meaning=flat(meaning),meaningPage=241,readings={}))

low_text = page('original',242)
low_pattern = re.compile(r'^(Мастер|[1-9])\s+(Мечей|Зв[её]зд|монет|Глифов)\s+',re.M|re.I)
matches = list(low_pattern.finditer(low_text))
assert len(matches)==40
for index,match in enumerate(matches):
    key = next(k for k,v in SUITS.items() if v[1].lower().replace('ё','е')==match[2].lower().replace('ё','е'))
    rank=0 if match[1].lower()=='мастер' else int(match[1])
    name=SUITS[key][2][rank]
    body = low_text[match.end():matches[index+1].start() if index+1<len(matches) else None]
    assert body.lower().startswith(name.lower()), (name,body[:60])
    body=body[len(name):]
    body=re.sub(r'\n(?:мечи|звезды|монеты|глифы)\nКарта Название Значение\s*$','',body,flags=re.I)
    cards.append(dict(id=f'{key}-{rank}',name=name,english=SUITS[key][3][rank],deck='common',suit=key,rank=rank,number=f'{"Мастер" if rank==0 else rank} {SUITS[key][1]}',playing=f'{"10" if rank==0 else "Туз" if rank==1 else rank} '+{'swords':'пик','stars':'треф','coins':'бубен','glyphs':'червей'}[key],meaning=flat(body),meaningPage=242,readings={}))

# Every interpretation is taken from the reading chapter, never invented from the picture.
reading_text=dehyphen(pages('original',range(14,20)))
common_pattern=re.compile(r'^(мастер|[1-9])\s+(мечей|зв[её]зд|монет|глифов)\s*[–—-]\s*[^\n]+',re.I|re.M)
common_matches=list(common_pattern.finditer(reading_text))
assert len(common_matches)==40, len(common_matches)
allies_start=reading_text.index('\nВраги Страда\n')
strahd_start=reading_text.index('Р асположение Страда в замке')
for i,m in enumerate(common_matches):
    rank=0 if m[1].lower()=='мастер' else int(m[1])
    suit=next(k for k,v in SUITS.items() if v[1].lower().replace('ё','е')==m[2].lower().replace('ё','е'))
    end=common_matches[i+1].start() if i+1<len(common_matches) else allies_start
    body=reading_text[m.end():end].strip()
    body=re.sub(r'\n(?:Мечи \(Пики\)|Звёзды \(Трефы\)|Монеты \(Бубны\)|Глифы \(Червы\))\s*$','',body,flags=re.I)
    c=next(c for c in cards if c['id']==f'{suit}-{rank}')
    c['readings']['treasure']=[dict(text=body,source='Проклятье Страда',pages='14–16')]

ALIASES={'привидение':'Призрак','прорицатель':'Провидец'}
major_pattern=re.compile(r'^(?:[абв]\.[ \t]*)?('+'|'.join(re.escape(n).replace('ё','[её]') for n in HIGH+['Привидение','Прорицатель'])+r')\s*\([^\n]+\)', re.M|re.I)
for role, text, ref in [('ally',reading_text[allies_start:strahd_start],'16–18'),('strahd',between(reading_text[strahd_start:],end='Зацепки приключения'),'19')]:
    mm=list(major_pattern.finditer(text))
    for i,m in enumerate(mm):
        raw_name=ALIASES.get(m[1].lower(),m[1])
        name=next(n for n in HIGH if n.lower().replace('ё','е')==raw_name.lower().replace('ё','е'))
        body=text[m.end():mm[i+1].start() if i+1<len(mm) else None].strip()
        c=next(c for c in cards if c['name']==name)
        c['readings'].setdefault(role,[]).append(dict(text=body,source='Проклятье Страда',pages=ref))
    assert all(role in c['readings'] for c in cards if c['deck']=='high'), (role,len(mm))

# Six appendix plates contain 54 individual card images, in this verified order.
art_order=[c['id'] for c in cards if c['deck']=='high']
for key in SUITS:
    art_order += [f'{key}-{n}' for n in range(10)]
artdir=OUT/'assets/cards';artdir.mkdir(parents=True,exist_ok=True)
pdf=fitz.open(CAMPAIGN/'Проклятье Страда.pdf')
image_index=0
for n in range(243,249):
    p=pdf[n-1]
    images=[]
    for im in p.get_images(full=True):
        for r in p.get_image_rects(im[0]):
            if 155<r.width<170 and 220<r.height<235:
                images.append((round(r.y0),round(r.x0),im[0]))
    images.sort()
    assert len(images)==9,(n,len(images))
    for y,x,xref in images:
        cid=art_order[image_index]
        raw=pdf.extract_image(xref)
        image=Image.open(BytesIO(raw['image'])).convert('RGB')
        image.thumbnail((600,840))
        image.save(artdir/(cid+'.webp'),'WEBP',quality=88)
        card=next(c for c in cards if c['id']==cid)
        card['image']='assets/cards/'+cid+'.webp'
        card['artPage']=n
        image_index+=1
pdf.close()
assert image_index==54
assert len({c['id'] for c in cards})==54
assert all(c['meaning'] and c['image'] for c in cards)
for c in cards:
    assert 'Карта Название Значение' not in c['meaning'],c['id']
    assert not re.search(r'Р асположение|Зацепки приключения',str(c['readings'])),c['id']
# Independent check against the actual PDF, not just the Markdown extraction.
meaning_pdf=fitz.open(CAMPAIGN/'Проклятье Страда.pdf')
audit=[]
for card in cards:
    exact=flat(card['meaning']) in flat(meaning_pdf[card['meaningPage']-1].get_text())
    assert exact,('Meaning differs from PDF',card['id'])
    card['meaningKind']='Дословный текст Проклятья Страда, приложение Е'
    audit.append(dict(id=card['id'],name=card['name'],pdfPage=card['meaningPage'],printedPage=card['meaningPage']-2,exactMatch=exact))
meaning_pdf.close()
(OUT/'meaning-audit.json').write_text(json.dumps(dict(source='Проклятье Страда.pdf',appendix='Е',checked='2026-10-20',normalization='Только соединение переносов слов и пробелов; без изменения формулировок',matched=len(audit),cards=audit),ensure_ascii=False,indent=2),encoding='utf-8')
import personal_tarokka
personal_tarokka.enrich(cards)
(OUT/'cards.json').write_text(json.dumps(dict(version='2026-10-20-personal',cards=cards,suits={k:v[0] for k,v in SUITS.items()}),ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(dict(cards=len(cards),common=sum(c['deck']=='common' for c in cards),high=sum(c['deck']=='high' for c in cards),images=image_index,readings={role:sum(len(c['readings'].get(role,[])) for c in cards) for role in ['treasure','ally','strahd']}),ensure_ascii=False))
import reader
reader.build(page,pages,between,dehyphen,flat,OUT)
offline_files=['./']+[p.relative_to(OUT).as_posix() for p in OUT.rglob('*') if p.is_file() and not p.name.startswith('.') and p.name!='offline-manifest.json']
(OUT/'offline-manifest.json').write_text(json.dumps(offline_files,ensure_ascii=False,indent=2),encoding='utf-8')

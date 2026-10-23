from pathlib import Path
from html.parser import HTMLParser
import json,re
root=Path(__file__).resolve().parents[1]/'docs'
cards=json.loads((root/'cards.json').read_text(encoding='utf-8'))['cards']
reader=json.loads((root/'reader.json').read_text(encoding='utf-8'))['sections']
assert len(cards)==54 and len({c['id'] for c in cards})==54
assert sum(c['deck']=='high' for c in cards)==14
for c in cards:
    assert (root/c['image']).is_file()
    assert len(c['meaning'])>20
    assert c['meaningKind'].startswith('Дословный текст')
    assert all(c['personal'][k] for k in ['omen','task','choice','kind'])
    roles=['ally','strahd'] if c['deck']=='high' else ['treasure']
    for role in roles:
        assert c['readings'].get(role)
        for reading in c['readings'][role]:
            assert len(reading['text'])>30
            assert not re.search(r'Карта Название Значение|Зацепки приключения|## PDF page',reading['text'])
    assert not re.search(r'Карта Название Значение|## PDF page',c['meaning'])
assert len(reader)>=15 and len({s['id'] for s in reader})==len(reader)
audit=json.loads((root/'meaning-audit.json').read_text(encoding='utf-8'))
assert audit['matched']==54 and all(c['exactMatch'] for c in audit['cards'])
assert any(s['id']=='personal-reading' for s in reader)
assert all(s['body'] and (s['extracts'] or s.get('editorial') or s['id']=='start') for s in reader)
class Links(HTMLParser):
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        for key in ['src','href']:
            url=attrs.get(key,'')
            if url and not url.startswith(('http','#','mailto:','data:')):
                assert (root/url.split('#')[0]).exists(),url
for file in root.glob('*.html'):Links().feed(file.read_text(encoding='utf-8'))
for file in json.loads((root/'offline-manifest.json').read_text(encoding='utf-8')):
    assert (root/file).exists(),file
section_ids={name:{s['id'] for s in json.loads((root/(name+'.json')).read_text(encoding='utf-8'))['sections']} for name in ['today','future']}
for name in ['today','future']:
    data=json.loads((root/(name+'.json')).read_text(encoding='utf-8'))['sections']
    assert len(data)>=6 and len({s['id'] for s in data})==len(data)
    for section in data:
        Links().feed(section['body'])
        assert section['body'] and section['editorial']
        assert 'D:/' not in section['body'] and 'C:/' not in section['body']
        for page,anchor in re.findall(r'href="(today|future)\.html#([^"]+)"',section['body']):
            assert anchor in section_ids[page],(section['id'],page,anchor)
    html=(root/(name+'.html')).read_text(encoding='utf-8')
    assert 'data-store="strad.'+name+'.v1"' in html
assert any(s['id']=='foundry' for s in json.loads((root/'today.json').read_text(encoding='utf-8'))['sections'])
print(f'PASS: 54 unique cards, all roles and images; {len(reader)} chapters; HTML links and offline manifest.')

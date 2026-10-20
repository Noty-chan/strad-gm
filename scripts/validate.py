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
    roles=['ally','strahd'] if c['deck']=='high' else ['treasure']
    for role in roles:
        assert c['readings'].get(role)
        for reading in c['readings'][role]:
            assert len(reading['text'])>30
            assert not re.search(r'Карта Название Значение|Зацепки приключения|## PDF page',reading['text'])
    assert not re.search(r'Карта Название Значение|## PDF page',c['meaning'])
assert len(reader)==14 and len({s['id'] for s in reader})==14
assert all(s['body'] and s['extracts'] or s['id']=='start' for s in reader)
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
print('PASS: 54 unique cards, all roles and images; 14 chapters; HTML links and offline manifest.')

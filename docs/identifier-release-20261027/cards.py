from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import json,textwrap
root=Path(__file__).parent;repo=root/'repository';out=repo/'assets/identifier-cards';out.mkdir(exist_ok=True)
font='/System/Library/Fonts/Supplemental/Arial.ttf'
def ft(size):return ImageFont.truetype(font,size)
for e in json.loads((repo/'content/identifier-dossiers.json').read_text())['entries']:
 im=Image.new('RGB',(1200,630),'#141914');d=ImageDraw.Draw(im);d.rectangle((0,0,18,630),fill='#d5b67b');d.text((70,48),'GROK ARCHIVE HUB',font=ft(28),fill='#d5b67b');d.text((70,116),e['id'],font=ft(72),fill='#f2eadc')
 lines=textwrap.wrap(e['title'],width=43)[:3]
 for i,line in enumerate(lines):d.text((74,225+i*58),line,font=ft(42),fill='#f2eadc')
 d.line((74,460,1120,460),fill='#56634f',width=2);d.text((74,488),'SOURCE DOSSIER  •  READ WITH LIMITS',font=ft(26),fill='#d5b67b');d.text((74,540),'Updated October 27, 2026  |  '+('Published source note' if e['indexable'] else 'Source verification pending'),font=ft(23),fill='#c4cbbd');im.save(out/(e['id']+'.png'),optimize=True)
print('Generated',len(list(out.glob('*.png'))),'identifier-specific share cards')

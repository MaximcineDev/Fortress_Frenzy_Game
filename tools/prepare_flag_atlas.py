"""Regenerate the bundled flag atlas from the included flag-icons SVGs (MIT).
Development only: requires Pillow + CairoSVG; the game ships the finished atlas.
"""
from pathlib import Path
from io import BytesIO
import json
import cairosvg
from PIL import Image
root=Path(__file__).resolve().parents[1]
text=(root/'src/countries.js').read_text()
countries=json.loads(text[text.index('['):text.index(';\nexport const COUNTRY_CODES')])
atlas=Image.new('RGBA',(1024,768))
for i,country in enumerate(countries):
    png=cairosvg.svg2png(url=str(root/'artwork/flags'/f"{country['code'].lower()}.svg"),output_width=64,output_height=48)
    atlas.alpha_composite(Image.open(BytesIO(png)).convert('RGBA'),((i%16)*64,(i//16)*48))
atlas.save(root/'src/images/flag-atlas.png',optimize=True)

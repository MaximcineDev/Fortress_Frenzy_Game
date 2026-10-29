"""Size the generated emblem for Android's launcher and splash resources."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageOps
root=Path(__file__).resolve().parents[1]
res=root/'android/app/src/main/res'
source=Image.open(root/'artwork/fortress-emblem.png').convert('RGBA')
source=source.crop(source.getbbox())
def foreground(size,fraction):
 canvas=Image.new('RGBA',(size,size));mark=ImageOps.contain(source,(int(size*fraction),int(size*fraction)),Image.Resampling.LANCZOS)
 canvas.alpha_composite(mark,((size-mark.width)//2,(size-mark.height)//2));return canvas
for density,scale in [('mdpi',1),('hdpi',1.5),('xhdpi',2),('xxhdpi',3),('xxxhdpi',4)]:
 folder=res/('mipmap-'+density);folder.mkdir(exist_ok=True)
 foreground(round(108*scale),.56).save(folder/'ic_launcher_foreground.png',optimize=True)
 size=round(48*scale);base=Image.new('RGBA',(size,size),'#102540');base.alpha_composite(foreground(size,.82))
 base.save(folder/'ic_launcher.png',optimize=True)
 mask=Image.new('L',(size,size));ImageDraw.Draw(mask).ellipse((0,0,size-1,size-1),fill=255)
 rounded=base.copy();rounded.putalpha(mask);rounded.save(folder/'ic_launcher_round.png',optimize=True)
# Modern splash icon uses a padded mark; system controls the launch background.
folder=res/'drawable-nodpi';folder.mkdir(exist_ok=True)
foreground(864,.56).save(folder/'ic_splash.png',optimize=True)
# Legacy launch keeps a centered, modest-sized copy of the same emblem.
foreground(288,.8).save(folder/'fortress_emblem.png',optimize=True)
for p in res.glob('drawable*/splash.png'):p.unlink()
(root/'artwork/play-store-icon.png').parent.mkdir(exist_ok=True)
store=Image.new('RGBA',(512,512),'#102540');store.alpha_composite(foreground(512,.82));store.convert('RGB').save(root/'artwork/play-store-icon.png',optimize=True)

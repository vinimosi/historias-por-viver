"""Gera docs/capa.png, a imagem que aparece quando o link é colado no WhatsApp."""
import os, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 1200, 630
papel, tinta, ocre, musgo, linha = (236, 226, 208), (42, 32, 23), (158, 95, 31), (86, 98, 47), (213, 196, 168)
img = Image.new("RGB", (W, H), papel)
d = ImageDraw.Draw(img)
random.seed(7)
# textura de papel
ruido = Image.effect_noise((W, H), 18).convert("L")
img = Image.composite(img, Image.new("RGB", (W, H), (226, 214, 192)), ruido.point(lambda v: 255 if v > 118 else 225))
d = ImageDraw.Draw(img)
# pontinhos como pinos no mapa, à direita
for _ in range(46):
    x, y = random.gauss(930, 120), random.gauss(320, 110)
    r = random.choice([7, 8, 9])
    c = musgo if random.random() < .18 else ocre
    d.ellipse((x - r - 3, y - r - 3, x + r + 3, y + r + 3), fill=papel)
    d.ellipse((x - r, y - r, x + r, y + r), fill=c)
F = "C:/Windows/Fonts/"
titulo = ImageFont.truetype(F + "georgia.ttf", 92)
sub = ImageFont.truetype(F + "georgiai.ttf", 34)
pequeno = ImageFont.truetype(F + "georgia.ttf", 24)
d.line((80, 120, 640, 120), fill=tinta, width=2)
d.text((80, 150), "Histórias", font=titulo, fill=tinta)
d.text((80, 252), "por viver", font=titulo, fill=ocre)
d.text((80, 390), "Restaurantes, bares e cafés de São Paulo", font=sub, fill=(118, 100, 78))
d.text((80, 436), "que ainda vão virar história.", font=sub, fill=(118, 100, 78))
d.line((80, 520, 640, 520), fill=linha, width=1)
d.text((80, 538), "Um mapa com o que dizem de cada lugar", font=pequeno, fill=(118, 100, 78))
img.save(os.path.join(RAIZ, "docs", "capa.png"), optimize=True)
print("docs/capa.png")

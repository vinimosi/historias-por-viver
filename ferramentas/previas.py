"""Gera as prévias de link (WhatsApp, Instagram, etc.).

- docs/capa.jpg: capa do site, com o mapa de São Paulo e os pontos de todos os lugares.
- docs/l/<id>/index.html + capa.jpg: uma página por lugar, com prévia própria, que
  leva direto para o lugar no site.

Lê os lugares do Supabase (chave pública do .env). Rode de novo sempre que a lista mudar:
  python ferramentas/previas.py
"""
import json, os, re, sys, math, shutil, random, html, urllib.request
from urllib.parse import urlparse
from PIL import Image, ImageDraw, ImageFont, ImageFilter

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(RAIZ, "docs")
FONTES = os.path.join(RAIZ, "ferramentas", "fontes")
SITE = "https://vinimosi.github.io/historias-por-viver/"
W, H = 1200, 630

PAPEL = (237, 227, 209); PAPEL2 = (245, 238, 226); TINTA = (42, 32, 23); MUTED = (118, 100, 78)
OCRE = (158, 95, 31); MUSGO = (86, 98, 47); LINHA = (213, 196, 168)
TERRA = (227, 213, 189); TERRA2 = (219, 204, 177); BORDA = (196, 178, 146)


def fonte(nome, tam, peso=None, opsz=None):
    f = ImageFont.truetype(os.path.join(FONTES, nome), tam)
    try:
        eixos = f.get_variation_axes()
        vals = []
        for e in eixos:
            n = e["name"].decode() if isinstance(e["name"], bytes) else e["name"]
            vals.append(peso if n == "Weight" and peso else opsz if n == "Optical Size" and opsz else e["default"])
        f.set_variation_by_axes(vals)
    except Exception:
        pass
    return f


def ler_env():
    env = {}
    for linha in open(os.path.join(RAIZ, ".env"), encoding="utf-8"):
        if "=" in linha and not linha.startswith("#"):
            k, v = linha.strip().split("=", 1); env[k] = v.strip()
    u = urlparse(env["SUPABASE_URL"]); env["SUPABASE_URL"] = f"{u.scheme}://{u.netloc}"
    return env


def lugares():
    env = ler_env(); k = env["SUPABASE_ANON_KEY"]
    req = urllib.request.Request(env["SUPABASE_URL"] + "/rest/v1/lugares?select=*",
                                 headers={"apikey": k, "Authorization": "Bearer " + k})
    return json.load(urllib.request.urlopen(req, timeout=30))


DISTRITOS = json.load(open(os.path.join(RAIZ, "ferramentas", "distritos.json"), encoding="utf-8"))["features"]


def papel(img, forca=10):
    random.seed(3)
    ruido = Image.effect_noise(img.size, 40).convert("L").filter(ImageFilter.GaussianBlur(.6))
    escuro = Image.new("RGB", img.size, (205, 188, 160))
    return Image.composite(escuro, img, ruido.point(lambda v: forca if v > 150 else 0))


def projetor(lat0, lng0, escala, cx, cy):
    k = math.cos(math.radians(lat0))
    return lambda lat, lng: (cx + (lng - lng0) * k * escala, cy - (lat - lat0) * escala)


def desenhar_mapa(img, caixa, centro, escala, pontos, destaque=None):
    """Desenha distritos e pontos dentro da caixa (x0,y0,x1,y1)."""
    x0, y0, x1, y1 = caixa
    camada = Image.new("RGB", (x1 - x0, y1 - y0), PAPEL)
    d = ImageDraw.Draw(camada)
    P = projetor(centro[0], centro[1], escala, (x1 - x0) / 2, (y1 - y0) / 2)
    for i, f in enumerate(DISTRITOS):
        cor = TERRA if i % 3 else TERRA2
        for poli in f["geometry"]["coordinates"]:
            for anel in poli[:1]:
                pts = [P(lat, lng) for lng, lat in anel]
                if len(pts) > 2: d.polygon(pts, fill=cor, outline=BORDA)
    for p in pontos:
        x, y = P(p["lat"], p["lng"])
        r = 6 if destaque else 7
        cor = MUSGO if p.get("status") == "fui" else OCRE
        if destaque: cor = tuple(int(c * .55 + 237 * .45) for c in cor)
        d.ellipse((x - r - 2.5, y - r - 2.5, x + r + 2.5, y + r + 2.5), fill=PAPEL2)
        d.ellipse((x - r, y - r, x + r, y + r), fill=cor)
    if destaque:
        x, y = P(destaque["lat"], destaque["lng"])
        for rr, a in ((42, 40), (30, 70)):
            halo = Image.new("L", camada.size, 0); ImageDraw.Draw(halo).ellipse((x - rr, y - rr, x + rr, y + rr), fill=a)
            camada = Image.composite(Image.new("RGB", camada.size, OCRE), camada, halo.filter(ImageFilter.GaussianBlur(4)))
        d = ImageDraw.Draw(camada)
        d.ellipse((x - 17, y - 17, x + 17, y + 17), fill=PAPEL2)
        d.ellipse((x - 12, y - 12, x + 12, y + 12), fill=MUSGO if destaque.get("status") == "fui" else OCRE)
    sombra = Image.new("L", camada.size, 0)
    ImageDraw.Draw(sombra).rectangle((0, 0, camada.size[0], camada.size[1]), outline=60, width=26)
    camada = Image.composite(Image.new("RGB", camada.size, (200, 182, 150)), camada, sombra.filter(ImageFilter.GaussianBlur(18)))
    img.paste(camada, (x0, y0))


def quebrar(d, texto, f, largura, max_linhas):
    palavras, linhas, atual = texto.split(), [], ""
    for p in palavras:
        teste = (atual + " " + p).strip()
        if d.textlength(teste, font=f) <= largura: atual = teste
        else:
            if atual: linhas.append(atual)
            atual = p
    if atual: linhas.append(atual)
    if len(linhas) > max_linhas:
        linhas = linhas[:max_linhas]
        while d.textlength(linhas[-1] + "…", font=f) > largura and " " in linhas[-1]:
            linhas[-1] = linhas[-1].rsplit(" ", 1)[0]
        linhas[-1] = linhas[-1].rstrip(",.;:") + "…"
    return linhas


def capa_site(lista):
    img = Image.new("RGB", (W, H), PAPEL)
    pts = [l for l in lista if isinstance(l.get("lat"), (int, float))]
    desenhar_mapa(img, (640, 0, W, H), (-23.575, -46.66), 4300, pts)
    img = papel(img)
    d = ImageDraw.Draw(img)
    d.line((640, 0, 640, H), fill=LINHA, width=2)
    rotulo = fonte("WorkSans.ttf", 19, 600)
    d.text((72, 74), "UM MAPA DE SÃO PAULO", font=rotulo, fill=OCRE, spacing=4)
    t = fonte("Gloock.ttf", 104)
    d.text((66, 120), "Histórias", font=t, fill=TINTA)
    d.text((66, 232), "por viver", font=t, fill=OCRE)
    d.line((72, 378, 560, 378), fill=TINTA, width=2)
    s = fonte("Newsreader-Italic.ttf", 34, 400, 36)
    d.text((72, 400), "Restaurantes, bares e cafés", font=s, fill=MUTED)
    d.text((72, 442), "que ainda vão virar história.", font=s, fill=MUTED)
    tipos = len({(l.get("tipo") or "").split(" ")[0] for l in lista if l.get("tipo")})
    d.text((72, 534), f"{len(lista)} LUGARES   ·   {len({l.get('bairro') for l in lista if l.get('bairro')})} BAIRROS", font=rotulo, fill=MUTED)
    img.save(os.path.join(DOCS, "capa.jpg"), quality=88, optimize=True, progressive=True)


def capa_lugar(l, todos_pts, destino):
    img = Image.new("RGB", (W, H), PAPEL)
    tem = isinstance(l.get("lat"), (int, float))
    if tem:
        vizinhos = [p for p in todos_pts if p is not l and abs(p["lat"] - l["lat"]) < .08 and abs(p["lng"] - l["lng"]) < .08]
        desenhar_mapa(img, (780, 0, W, H), (l["lat"], l["lng"]), 17000, vizinhos, destaque=l)
    img = papel(img)
    d = ImageDraw.Draw(img)
    largura = 640 if tem else 1040
    if tem: d.line((780, 0, 780, H), fill=LINHA, width=2)
    rotulo = fonte("WorkSans.ttf", 18, 600)
    situ = "JÁ FUI" if l.get("status") == "fui" else "QUERO IR"
    d.text((72, 64), "HISTÓRIAS POR VIVER   ·   " + situ, font=rotulo, fill=OCRE)
    nome = l.get("nome") or ""
    for tam in (96, 84, 72, 62, 54):
        ft = fonte("Gloock.ttf", tam)
        linhas = quebrar(d, nome, ft, largura, 2)
        if not any(x.endswith("…") for x in linhas): break
    y = 104
    for ln in linhas:
        d.text((68, y), ln, font=ft, fill=TINTA); y += int(tam * 1.08)
    y += 12
    meta = ", ".join(x for x in [l.get("tipo"), l.get("bairro")] if x)
    if meta:
        d.text((72, y), meta, font=fonte("Newsreader-Italic.ttf", 30, 400, 30), fill=OCRE); y += 52
    d.line((72, y, 72 + min(largura, 560), y), fill=TINTA, width=2); y += 24
    post = l.get("post") or {}
    fina = post.get("linhafina") or l.get("porque") or ""
    titulo = post.get("titulo") or ""
    if len(fina) < 70 and ":" in titulo:
        frase = titulo.split(":", 1)[1].strip()
        fina = (frase[:1].upper() + frase[1:]).rstrip(".") + ". " + fina
    if fina:
        fs = fonte("Newsreader.ttf", 31, 400, 30)
        for ln in quebrar(d, fina, fs, largura - 10, 3 if y < 420 else 2):
            d.text((72, y), ln, font=fs, fill=MUTED); y += 42
    rodape = "   ·   ".join(x for x in ["$" * (l.get("preco") or 0), (l.get("post") or {}).get("nota_publica")] if x)
    if rodape: d.text((72, H - 76), rodape.upper() if len(rodape) < 40 else rodape, font=rotulo, fill=MUTED)
    img.save(destino, quality=86, optimize=True, progressive=True)


PAGINA = """<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{titulo}</title>
<meta name="description" content="{desc}">
<meta property="og:site_name" content="Histórias por viver">
<meta property="og:type" content="article">
<meta property="og:title" content="{titulo}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{img}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{nome}, no mapa de São Paulo">
<meta property="og:locale" content="pt_BR">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="{alvo}">
<meta http-equiv="refresh" content="0;url={alvo}">
<script>location.replace({alvo_js});</script>
<style>body{{background:#ECE2D0;color:#2A2017;font:18px Georgia,serif;display:grid;place-items:center;min-height:100vh;margin:0}}a{{color:#9E5F1F}}</style>
</head><body><p>Abrindo <a href="{alvo}">{nome}</a>…</p></body></html>
"""


def main():
    lista = lugares()
    pts = [l for l in lista if isinstance(l.get("lat"), (int, float))]
    capa_site(lista)
    pasta = os.path.join(DOCS, "l")
    if os.path.isdir(pasta): shutil.rmtree(pasta)
    for l in lista:
        dest = os.path.join(pasta, l["id"]); os.makedirs(dest, exist_ok=True)
        capa_lugar(l, pts, os.path.join(dest, "capa.jpg"))
        p = l.get("post") or {}
        desc = p.get("linhafina") or l.get("porque") or "Um lugar para conhecer em São Paulo."
        meta = ", ".join(x for x in [l.get("tipo"), l.get("bairro")] if x)
        if meta: desc = meta + ". " + desc
        url = SITE + "l/" + l["id"] + "/"
        alvo = SITE + "#" + l["id"]
        with open(os.path.join(dest, "index.html"), "w", encoding="utf-8") as f:
            f.write(PAGINA.format(titulo=html.escape(l["nome"] + " · Histórias por viver"), desc=html.escape(desc), url=url,
                                  img=url + "capa.jpg", nome=html.escape(l["nome"]), alvo=html.escape(alvo), alvo_js=json.dumps(alvo)))
    print(f"capa do site + {len(lista)} prévias de lugares")


if __name__ == "__main__":
    main()

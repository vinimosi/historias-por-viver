"""Liga o site ao Supabase e envia os lugares.

Lê o arquivo .env (que nunca vai para o GitHub) com:
  SUPABASE_URL=https://xxxx.supabase.co
  SUPABASE_ANON_KEY=...        (chave pública, vai para o site)
  SUPABASE_SERVICE_KEY=...     (chave secreta, só usada aqui no PC)

Uso:
  python ferramentas/enviar.py config   -> escreve docs/config.js
  python ferramentas/enviar.py dados    -> envia dados/lugares/*.json para a tabela
"""
import json, os, sys, glob, urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAMPOS = ["id", "nome", "tipo", "bairro", "endereco", "lat", "lng", "preco", "status", "tiktok", "porque", "visita", "post", "criado"]


def ler_env():
    env = {}
    caminho = os.path.join(RAIZ, ".env")
    if not os.path.exists(caminho):
        sys.exit("Falta o arquivo .env na pasta do projeto.")
    for linha in open(caminho, encoding="utf-8"):
        linha = linha.strip()
        if linha and not linha.startswith("#") and "=" in linha:
            k, v = linha.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    for k in ("SUPABASE_URL", "SUPABASE_ANON_KEY"):
        if not env.get(k):
            sys.exit(f"Falta {k} no .env.")
    # Fica só com https://xxxx.supabase.co, mesmo que tenham colado /rest/v1/ junto.
    from urllib.parse import urlparse
    u = urlparse(env["SUPABASE_URL"])
    env["SUPABASE_URL"] = f"{u.scheme}://{u.netloc}"
    return env


def config(env):
    destino = os.path.join(RAIZ, "docs", "config.js")
    with open(destino, "w", encoding="utf-8") as f:
        f.write("// Endereço e chave pública do Supabase (a chave pública pode ficar no site).\n")
        f.write("window.SUPABASE = " + json.dumps({"url": env["SUPABASE_URL"], "chave": env["SUPABASE_ANON_KEY"]}) + ";\n")
    print("docs/config.js escrito.")


def dados(env):
    chave = env.get("SUPABASE_SERVICE_KEY")
    if not chave:
        sys.exit("Falta SUPABASE_SERVICE_KEY no .env.")
    linhas = []
    for p in sorted(glob.glob(os.path.join(RAIZ, "dados", "lugares", "*.json"))):
        d = json.load(open(p, encoding="utf-8"))
        d["id"] = os.path.splitext(os.path.basename(p))[0]
        linhas.append({k: d.get(k) for k in CAMPOS if k in d or k == "id"})
    for i in range(0, len(linhas), 50):
        lote = linhas[i:i + 50]
        # Todas as linhas do lote precisam ter as mesmas colunas.
        lote = [{k: l.get(k) for k in CAMPOS} for l in lote]
        for l in lote:
            if l["status"] is None: l["status"] = "quero"
            if l["criado"] is None: l["criado"] = "2026-11-19T00:00:00Z"
        req = urllib.request.Request(env["SUPABASE_URL"] + "/rest/v1/lugares?on_conflict=id",
            data=json.dumps(lote).encode("utf-8"), method="POST",
            headers={"apikey": chave, "Authorization": "Bearer " + chave, "Content-Type": "application/json",
                     "Prefer": "resolution=merge-duplicates,return=minimal"})
        try:
            urllib.request.urlopen(req, timeout=60)
        except urllib.error.HTTPError as e:
            sys.exit("O Supabase recusou: " + e.read().decode("utf-8", "replace")[:500])
        print(f"Enviados {min(i + 50, len(linhas))} de {len(linhas)}")


if __name__ == "__main__":
    env = ler_env()
    acao = sys.argv[1] if len(sys.argv) > 1 else ""
    if acao == "config": config(env)
    elif acao == "dados": dados(env)
    else: sys.exit(__doc__)

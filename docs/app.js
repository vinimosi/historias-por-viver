(function(){
"use strict";
const TABELA = "lugares";
const st = { lugares:{}, carregado:false, semBanco:false, podeEditar:false, sessao:null, filtro:"todos", grupo:"", busca:"",
  aberto:null, form:false, marcando:false, novoPos:null, confirmaExcluir:false, visitaEdit:null, aviso:"", entrando:false, linkEnviado:false,
  posicao:null, ordem:"nome", sugestoes:[], sugerindo:false, sugerido:false, toast:"" };
let sb = null, mapa = null, mapaPronto = false, popup = null, marcaEu = null, marcaNovo = null;
const painel = document.getElementById("painel");
const dica = document.getElementById("dica");
const toastEl = document.getElementById("toast");
const folha = document.getElementById("folha");
const alca = document.getElementById("alca");
const celular = () => matchMedia("(max-width:860px)").matches;

/* ---------- Gaveta do celular ---------- */
function altura(a){ folha.dataset.altura = a; if (a === "baixo") painel.scrollTop = 0; }
function folgaMapa(){
  // Espaço que a lista ocupa por cima do mapa, para centralizar os pontos no que sobra visível.
  if (celular()) return { top: 60, left: 30, right: 30, bottom: Math.round(folha.getBoundingClientRect().height * .46) + 20 };
  return { top: 50, left: 60, bottom: 50, right: folha.getBoundingClientRect().width + 60 };
}
(function arrastar(){
  let y0 = null, t0 = 0, base = 0, moveu = false;
  const H = () => folha.getBoundingClientRect().height;
  alca.addEventListener("pointerdown", e => { y0 = e.clientY; t0 = Date.now(); moveu = false; base = folha.dataset.altura === "alto" ? 0 : H() * .54; folha.classList.add("arrastando"); alca.setPointerCapture(e.pointerId); });
  alca.addEventListener("pointermove", e => { if (y0 === null) return; const dy = e.clientY - y0; if (Math.abs(dy) > 4) moveu = true;
    folha.style.transform = `translateY(${Math.min(H() * .54, Math.max(0, base + dy))}px)`; });
  const soltar = e => { if (y0 === null) return; const dy = e.clientY - y0, rapido = Date.now() - t0 < 250;
    folha.classList.remove("arrastando"); folha.style.transform = "";
    if (!moveu) altura(folha.dataset.altura === "alto" ? "baixo" : "alto");
    else if (dy < -40 || (rapido && dy < 0)) altura("alto"); else if (dy > 40 || (rapido && dy > 0)) altura("baixo");
    y0 = null; };
  alca.addEventListener("pointerup", soltar); alca.addEventListener("pointercancel", soltar);
  // Na gaveta baixa, rolar a lista para cima abre a gaveta.
  painel.addEventListener("wheel", e => { if (celular() && folha.dataset.altura === "baixo" && e.deltaY > 0) altura("alto"); }, { passive:true });
  let ty = null;
  painel.addEventListener("touchstart", e => { ty = e.touches[0].clientY; }, { passive:true });
  painel.addEventListener("touchmove", e => { if (ty === null || !celular()) return; const dy = e.touches[0].clientY - ty;
    if (folha.dataset.altura === "baixo" && dy < -24){ altura("alto"); ty = null; }
    else if (folha.dataset.altura === "alto" && painel.scrollTop <= 0 && dy > 60){ altura("baixo"); ty = null; } }, { passive:true });
})();

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const urlOk = u => /^https?:\/\//i.test(u||"") ? u : "";
const slug = s => (s||"lugar").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40) || "lugar";
const preco = n => ["","$","$$","$$$","$$$$"][n] || "";
const situacao = l => l.status === "fui" ? "fui" : (l.post ? "quero" : "esperando");
const rotuloSit = { quero:"quero ir", fui:"já fui", esperando:"esperando pesquisa" };
const gmaps = l => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([l.nome, l.endereco || l.bairro, "São Paulo"].filter(Boolean).join(", "));
const dataBR = s => { if(!s) return ""; const d = new Date(s); return isNaN(d) ? s : d.toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"}); };
const temPonto = l => typeof l.lat === "number" && typeof l.lng === "number";
function distKm(a, b){ const R = 6371, r = x => x * Math.PI / 180; const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat/2)**2 + Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dLng/2)**2; return 2 * R * Math.asin(Math.sqrt(h)); }
const km = d => d < 1 ? Math.round(d * 1000 / 50) * 50 + " m" : d.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " km";
function avisar(msg){ toastEl.textContent = msg; toastEl.hidden = false; clearTimeout(avisar.t); avisar.t = setTimeout(() => toastEl.hidden = true, 2600); }

const GRUPOS = [
  ["Japonesa", /japon|sushi|izakaya|yakitori|lámen|lamen/i],
  ["Asiática", /asiát|corean|chines|taiwan|vietnam|tailand/i],
  ["Italiana", /italian|pizza|osteria|massa/i],
  ["Francesa", /franc|bistr|brasserie/i],
  ["Árabe e Oriente Médio", /árabe|arab|libanês|israel|turca|oriente|síria|kebab/i],
  ["Ibérica", /ibéric|espanhol|tapas|portugu/i],
  ["Peixes e frutos do mar", /peixe|frutos do mar|marisq/i],
  ["Hambúrguer e lanche", /hambúrguer|sanduíche|lanche|lanchonete|deli|prensado/i],
  ["Américas", /mexican|peruan|argentin|parrilla/i],
  ["Brasileira", /brasileir|baian|nordest|mineir|família|gaúcho|carioca|brasa|porco|prato feito/i],
  ["Bar e boteco", /bar|boteco|vinho|drinks|coquet/i],
  ["Café e doce", /café|padaria|doce|sorvete|chá/i],
  ["Autoral", /contempor|autoral|variada|sustent|dividir|criativa/i],
];
const grupoDe = l => { const t = l.tipo || ""; for (const [g, re] of GRUPOS) if (re.test(t)) return g; return "Outros"; };

/* ---------- Mapa (MapLibre + OpenFreeMap, pintado nas cores do site) ---------- */
const escuro = () => matchMedia("(prefers-color-scheme: dark)").matches;
function paleta(){
  return escuro()
    ? { fundo:"#1B1511", uso:"#201914", parque:"#212616", agua:"#141A1A", predio:"#251D17", rua:"#33291F", ruaMaior:"#46382A", trilho:"#3A2F25", rotulo:"#A8957A", halo:"#1B1511", limite:"#4A3B2D",
        quero:"#D69A4A", fui:"#A3AE78", borda:"#1B1511", grupo:"#D69A4A", grupoTexto:"#1B1511" }
    : { fundo:"#EDE3D1", uso:"#E7DCC8", parque:"#DADDBF", agua:"#C7D2CB", predio:"#E3D6C0", rua:"#FAF4E8", ruaMaior:"#F6E7C9", trilho:"#D2C2A5", rotulo:"#6E5B45", halo:"#EDE3D1", limite:"#C8B391",
        quero:"#9E5F1F", fui:"#56622F", borda:"#FAF4E8", grupo:"#9E5F1F", grupoTexto:"#FAF4E8" };
}
function pintarEstilo(estilo){
  const c = paleta();
  estilo.layers = estilo.layers.filter(l => !/shield|aeroway|airport|ice_shelf|glacier|country|label_state/.test(l.id));
  for (const l of estilo.layers){
    const p = l.paint = l.paint || {}; const sl = l["source-layer"];
    if (l.type === "background") p["background-color"] = c.fundo;
    else if (l.type === "fill"){
      p["fill-color"] = sl === "water" ? c.agua : sl === "park" || l.id === "landcover_wood" ? c.parque : sl === "building" ? c.predio : sl === "landuse" ? c.uso : c.uso;
      if (sl === "building") p["fill-opacity"] = .7;
      delete p["fill-outline-color"];
    } else if (l.type === "line"){
      if (sl === "waterway") p["line-color"] = c.agua;
      else if (sl === "boundary") p["line-color"] = c.limite;
      else if (/railway/.test(l.id)) p["line-color"] = c.trilho;
      else if (/casing/.test(l.id)) p["line-color"] = c.uso;
      else if (/motorway|major/.test(l.id)) p["line-color"] = c.ruaMaior;
      else p["line-color"] = c.rua;
    } else if (l.type === "symbol"){
      p["text-color"] = c.rotulo; p["text-halo-color"] = c.halo; p["text-halo-width"] = 1.4;
    }
  }
  return estilo;
}
let estiloBase = null;
async function iniciarMapa(){
  if (!window.maplibregl){ document.getElementById("mapa").innerHTML = '<p class="mapa-erro">O mapa não carregou. Recarregue a página.</p>'; return; }
  try { estiloBase = await (await fetch("https://tiles.openfreemap.org/styles/positron")).json(); }
  catch(_){ document.getElementById("mapa").innerHTML = '<p class="mapa-erro">O mapa não carregou. Recarregue a página.</p>'; return; }
  mapa = new maplibregl.Map({ container:"mapa", style: pintarEstilo(structuredClone(estiloBase)), center:[-46.665, -23.565], zoom:11.6, minZoom:9, maxZoom:18,
    attributionControl:false });
  mapa.addControl(new maplibregl.AttributionControl({ compact:true }), "bottom-left");
  mapa.addControl(new maplibregl.NavigationControl({ showCompass:false }), "top-left");
  mapa.on("dragstart", () => { if (celular() && folha.dataset.altura === "alto") altura("baixo"); });
  popup = new maplibregl.Popup({ closeButton:false, closeOnClick:false, offset:12, className:"dica-pino" });
  mapa.on("style.load", montarCamadas);
  mapa.on("click", cliqueMapa);
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => { if (estiloBase) mapa.setStyle(pintarEstilo(structuredClone(estiloBase))); });
}
function dadosMapa(){
  return { type:"FeatureCollection", features: visiveis().filter(temPonto).map(l => ({ type:"Feature", geometry:{ type:"Point", coordinates:[l.lng, l.lat] },
    properties:{ id:l.id, nome:l.nome, sit: situacao(l) === "fui" ? "fui" : "quero", sub:[l.tipo, l.bairro].filter(Boolean).join(" · ") } })) };
}
function montarCamadas(){
  const c = paleta();
  mapa.addSource("lugares", { type:"geojson", data: dadosMapa(), cluster:true, clusterRadius:38, clusterMaxZoom:14 });
  mapa.addLayer({ id:"grupos", type:"circle", source:"lugares", filter:["has","point_count"],
    paint:{ "circle-color": c.grupo, "circle-opacity": .92, "circle-stroke-color": c.borda, "circle-stroke-width": 2,
      "circle-radius": ["step", ["get","point_count"], 15, 5, 18, 12, 23, 25, 28] } });
  mapa.addLayer({ id:"grupos-num", type:"symbol", source:"lugares", filter:["has","point_count"],
    layout:{ "text-field":["get","point_count_abbreviated"], "text-font":["Noto Sans Bold"], "text-size":13, "text-allow-overlap":true },
    paint:{ "text-color": c.grupoTexto } });
  mapa.addLayer({ id:"ativo", type:"circle", source:"lugares", filter:["==",["get","id"], st.aberto || ""],
    paint:{ "circle-radius": 13, "circle-color":"transparent", "circle-stroke-color": c.quero, "circle-stroke-width": 2, "circle-stroke-opacity": .6 } });
  mapa.addLayer({ id:"pontos", type:"circle", source:"lugares", filter:["!",["has","point_count"]],
    paint:{ "circle-color":["match",["get","sit"],"fui", c.fui, c.quero], "circle-stroke-color": c.borda, "circle-stroke-width": 2,
      "circle-radius":["interpolate",["linear"],["zoom"], 10, 4.5, 14, 7, 17, 9] } });
  mapa.addLayer({ id:"nomes", type:"symbol", source:"lugares", filter:["!",["has","point_count"]], minzoom:14.5,
    layout:{ "text-field":["get","nome"], "text-font":["Noto Sans Bold"], "text-size":12, "text-offset":[0, 1.1], "text-anchor":"top", "text-optional":true },
    paint:{ "text-color": c.rotulo, "text-halo-color": c.halo, "text-halo-width": 1.6 } });
  if (!mapaPronto){
    mapa.on("click", "grupos", async e => {
      const f = e.features[0]; const z = await mapa.getSource("lugares").getClusterExpansionZoom(f.properties.cluster_id);
      mapa.easeTo({ center: f.geometry.coordinates, zoom: z + .3 });
    });
    mapa.on("click", "pontos", e => { e.preventDefault(); abrir(e.features[0].properties.id); });
    for (const camada of ["grupos", "pontos"]){
      mapa.on("mouseenter", camada, () => mapa.getCanvas().style.cursor = "pointer");
      mapa.on("mouseleave", camada, () => { mapa.getCanvas().style.cursor = ""; popup.remove(); });
    }
    mapa.on("mousemove", "pontos", e => { const p = e.features[0].properties;
      popup.setLngLat(e.features[0].geometry.coordinates).setHTML(`<b>${esc(p.nome)}</b>${p.sub ? `<span>${esc(p.sub)}</span>` : ""}`).addTo(mapa); });
  }
  mapaPronto = true;
  enquadrar(true);
}
let enquadrado = false;
function enquadrar(forcar){
  if (!mapaPronto || (enquadrado && !forcar) || st.aberto) return;
  const pts = visiveis().filter(temPonto); if (!pts.length) return;
  const b = new maplibregl.LngLatBounds(); pts.forEach(l => b.extend([l.lng, l.lat]));
  mapa.fitBounds(b, { padding: folgaMapa(), maxZoom: 15, duration: enquadrado ? 600 : 0 }); enquadrado = true;
}
function atualizarMapa(){
  if (!mapaPronto) return;
  mapa.getSource("lugares")?.setData(dadosMapa());
  mapa.setFilter("ativo", ["==",["get","id"], st.aberto || ""]);
  if (marcaNovo){ marcaNovo.remove(); marcaNovo = null; }
  if (st.novoPos){ const el = document.createElement("div"); el.className = "marca-nova"; marcaNovo = new maplibregl.Marker({ element: el }).setLngLat([st.novoPos.lng, st.novoPos.lat]).addTo(mapa); }
}
async function cliqueMapa(e){
  if (e.defaultPrevented || !st.marcando) return;
  const pos = { lat:+e.lngLat.lat.toFixed(5), lng:+e.lngLat.lng.toFixed(5) };
  const modo = st.marcando;
  st.marcando = false; dica.hidden = true;
  if (modo === "existente"){ await salvar(st.aberto, pos, true); return; }
  st.novoPos = pos; render(); restaurarRascunho();
}

/* ---------- Dados ---------- */
function todos(){ return Object.values(st.lugares); }
function visiveis(){
  const q = st.busca.trim().toLowerCase();
  const lista = todos().filter(l => {
    const s = situacao(l);
    if (st.filtro === "quero" && s === "fui") return false;
    if (st.filtro === "fui" && s !== "fui") return false;
    if (st.grupo && grupoDe(l) !== st.grupo) return false;
    if (q && ![l.nome,l.bairro,l.tipo,l.endereco,l.post?.linhafina].join(" ").toLowerCase().includes(q)) return false;
    return true;
  });
  if (st.ordem === "perto" && st.posicao) return lista.sort((a,b) => (temPonto(a) ? distKm(st.posicao, a) : 1e9) - (temPonto(b) ? distKm(st.posicao, b) : 1e9));
  return lista.sort((a,b) => (a.nome||"").localeCompare(b.nome||"", "pt-BR"));
}
async function carregar(){
  const { data, error } = await sb.from(TABELA).select("*");
  if (error){ st.aviso = "Não deu para ler os lugares agora. Recarregue a página."; st.carregado = true; render(); return; }
  const novo = {}; (data || []).forEach(l => novo[l.id] = l);
  st.lugares = novo; st.carregado = true;
  if (st.aberto && !novo[st.aberto]) st.aberto = null;
  const h = decodeURIComponent(location.hash.slice(1));
  if (!st.aberto && h && novo[h]){ abrir(h); return; }
  if (!st.form && !st.sugerindo) render(); else atualizarMapa();
  enquadrar();
}
async function carregarSugestoes(){
  if (!st.podeEditar){ st.sugestoes = []; return; }
  const { data } = await sb.from("sugestoes").select("*").order("criado", { ascending:false });
  st.sugestoes = data || [];
}
async function salvar(id, dados, mudar){
  const q = mudar ? sb.from(TABELA).update(dados).eq("id", id) : sb.from(TABELA).insert(Object.assign({ id }, dados));
  const { error } = await q;
  if (error){ st.aviso = /row-level|permission|JWT/i.test(error.message) ? "Para mudar a lista é preciso entrar com o e-mail de quem edita." : "Não deu para salvar agora. Tente de novo em instantes."; render(); return false; }
  st.aviso = ""; await carregar(); return true;
}
async function verEditor(){
  st.podeEditar = false;
  if (!st.sessao) return;
  const { data } = await sb.from("editores").select("user_id").eq("user_id", st.sessao.user.id).maybeSingle();
  st.podeEditar = !!data;
}

/* ---------- Tela ---------- */
function render(){
  const l = st.aberto && st.lugares[st.aberto];
  painel.innerHTML = l ? telaPost(l) : telaLista();
  atualizarMapa();
}
function telaLista(){
  const t = todos();
  const nFui = t.filter(x => situacao(x) === "fui").length;
  const nEsp = t.filter(x => situacao(x) === "esperando").length;
  const contaGrupo = {}; t.forEach(x => { const g = grupoDe(x); contaGrupo[g] = (contaGrupo[g]||0) + 1; });
  const grupos = GRUPOS.map(g => g[0]).concat("Outros").filter(g => contaGrupo[g]);
  const vis = visiveis();
  let h = `<header class="topo"><div><h1>Histórias por viver</h1>
    <p class="sub">Restaurantes, bares e cafés de São Paulo que ainda vão virar história.</p>
    <div class="contagem"><i style="background:var(--accent)"></i>${t.length - nFui} para ir &nbsp; <i style="background:var(--moss)"></i>${nFui} visitados${nEsp ? ` &nbsp; ${nEsp} esperando pesquisa` : ""}</div></div>
    ${st.podeEditar && !st.form ? `<button class="btn prim" id="b-novo">Anotar lugar</button>` : ""}</header>`;
  if (st.aviso) h += `<div class="aviso" role="status">${esc(st.aviso)}</div>`;
  if (st.semBanco) h += `<div class="aviso">O site ainda não está ligado ao banco de dados.</div>`;
  if (st.form) h += telaForm();
  if (st.podeEditar && st.sugestoes.length) h += telaSugestoesRecebidas();
  if (t.length){
    h += `<div class="filtros">
      <div class="abas" role="group" aria-label="Mostrar">${[["todos","Todos"],["quero","Quero ir"],["fui","Já fui"]].map(([k,n]) => `<button data-filtro="${k}" aria-pressed="${st.filtro===k}">${n}</button>`).join("")}</div>
      <input class="busca" id="busca" type="search" placeholder="Procurar por nome, bairro ou comida" value="${esc(st.busca)}" aria-label="Procurar">
      ${grupos.length > 1 ? `<div class="grupos">${grupos.map(g => `<button data-grupo="${esc(g)}" aria-pressed="${st.grupo===g}">${esc(g)} <span>${contaGrupo[g]}</span></button>`).join("")}</div>` : ""}
      <div class="ferramentas">
        <button class="chip" id="b-sortear">Me surpreenda</button>
        <button class="chip" id="b-perto" aria-pressed="${st.ordem === "perto"}">${st.ordem === "perto" ? "Mais perto de você" : "Perto de mim"}</button>
        <span class="conta-vis">${vis.length} ${vis.length === 1 ? "lugar" : "lugares"}</span>
      </div>
    </div>`;
    h += vis.length ? `<ul class="lista">${vis.map(itemLista).join("")}</ul>` : `<p class="vazio">Nada por aqui com esse filtro.</p>`;
  } else if (st.carregado && !st.form){
    h += `<div class="vazio"><h2>O caderno ainda está em branco</h2>Assim que houver lugares anotados, eles aparecem aqui e no mapa.</div>`;
  } else if (!st.carregado && !st.semBanco){
    h += `<p class="vazio">Abrindo o caderno…</p>`;
  }
  if (!st.podeEditar && !st.semBanco) h += telaSugerir();
  h += telaEntrar();
  return h;
}
function telaSugerir(){
  if (st.sugerido) return `<section class="sugerir"><h2>Obrigada pela dica</h2><p>A sugestão chegou e vai ser lida com carinho.</p><button class="link" id="b-sugerir-mais">Sugerir outro lugar</button></section>`;
  if (!st.sugerindo) return `<section class="sugerir"><h2>Conhece um lugar que devia estar aqui?</h2><p>Manda a dica. Se for bom mesmo, ele entra no mapa.</p><button class="btn" id="b-sugerir">Sugerir um lugar</button></section>`;
  return `<form class="form sugerir" id="form-sugerir">
    <h2>Sugerir um lugar</h2>
    <label>Nome do lugar<input id="s-nome" required minlength="2" maxlength="120" placeholder="Padaria da esquina"></label>
    <label>Link <span>do vídeo, do Instagram ou do Google Maps</span><input id="s-link" type="url" maxlength="500" placeholder="https://"></label>
    <label>Seu nome <span>opcional</span><input id="s-quem" maxlength="60"></label>
    <label>Por que vale a pena <span>opcional</span><textarea id="s-coment" maxlength="600"></textarea></label>
    <div class="linha-acoes"><button class="btn prim" type="submit">Mandar sugestão</button><button class="link" type="button" id="b-sugerir-cancelar">Cancelar</button></div>
  </form>`;
}
function telaSugestoesRecebidas(){
  return `<section class="recebidas"><h2>Sugestões dos amigos <span>${st.sugestoes.length}</span></h2><ul>${st.sugestoes.map(s => `<li>
    <div><b>${esc(s.nome)}</b>${s.quem ? ` <span class="de">por ${esc(s.quem)}</span>` : ""}</div>
    ${s.comentario ? `<p>${esc(s.comentario)}</p>` : ""}
    ${urlOk(s.link) ? `<a href="${esc(s.link)}" target="_blank" rel="noopener">Ver o link</a>` : ""}
    <div class="linha-acoes"><button class="link" data-aceitar="${esc(s.id)}">Pôr na lista</button><button class="link perigo" data-descartar="${esc(s.id)}">Descartar</button></div>
  </li>`).join("")}</ul></section>`;
}
function telaEntrar(){
  if (st.semBanco) return "";
  if (st.sessao) return `<div class="entrar">${st.podeEditar ? "Você está editando." : "Esta conta só pode ver a lista."} <button class="link" id="b-sair">Sair</button></div>`;
  if (st.linkEnviado) return `<div class="entrar">Mandamos um link para o seu e-mail. Abra por ele para editar.</div>`;
  if (!st.entrando) return `<div class="entrar"><button class="link" id="b-entrar">Entrar para editar</button></div>`;
  return `<div class="entrar">Receba um link de acesso no e-mail de quem edita.
    <form id="form-entrar"><input id="e-mail" type="email" required autocomplete="email" placeholder="seu e-mail" aria-label="E-mail"><button class="btn" type="submit">Mandar link</button></form></div>`;
}
function itemLista(l){
  const s = situacao(l);
  const meta = [l.tipo, l.bairro].filter(Boolean).join(", ");
  const resumo = l.post?.linhafina || l.porque || "";
  const dist = st.ordem === "perto" && st.posicao && temPonto(l) ? `<span class="dist">${km(distKm(st.posicao, l))}</span>` : "";
  const selo = s === "fui" ? `<span class="selo fui">já fui${l.visita?.nota ? " · " + l.visita.nota + "/5" : ""}</span>` : s === "esperando" ? `<span class="selo esperando">esperando pesquisa</span>` : "";
  return `<li class="item" data-abrir="${esc(l.id)}" tabindex="0" role="button" aria-label="Abrir ${esc(l.nome)}">
    <div class="linha"><h3>${esc(l.nome)}</h3><span class="pontos"></span><span class="preco">${preco(l.preco)}</span></div>
    <div class="meta">${meta ? `<span>${esc(meta)}</span>` : ""}${dist}${selo}</div>
    ${resumo ? `<p class="resumo">${esc(resumo)}</p>` : ""}</li>`;
}
function telaForm(){
  return `<form class="form" id="form-novo">
    <h2>Anotar lugar</h2>
    <label>Nome<input id="f-nome" required maxlength="80" placeholder="Bar do Zé"></label>
    <label>Bairro ou endereço <span>se souber</span><input id="f-end" maxlength="140" placeholder="Pinheiros"></label>
    <label>Link do vídeo <span>ou de onde você viu</span><input id="f-tt" type="url" maxlength="400" placeholder="https://www.tiktok.com/@..."></label>
    <label>O que chamou atenção <span>opcional</span><textarea id="f-porque" maxlength="600" placeholder="O sanduíche de pernil que derrete"></textarea></label>
    <div class="linha-acoes"><button type="button" class="btn" id="b-marcar">${st.novoPos ? "Mudar o ponto no mapa" : "Marcar no mapa"}</button>
      <span class="pos">${st.novoPos ? "ponto marcado" : "ou deixe o Claude achar na pesquisa"}</span></div>
    <div class="linha-acoes"><button class="btn prim" type="submit">Guardar</button><button class="link" type="button" id="b-cancelar">Cancelar</button></div>
  </form>`;
}
function telaPost(l){
  const s = situacao(l), p = l.post || {};
  const dist = st.posicao && temPonto(l) ? km(distKm(st.posicao, l)) + " de você" : "";
  const fatos = [["Comida", l.tipo], ["Bairro", l.bairro], ["Endereço", l.endereco], ["Distância", dist], ["Preço", preco(l.preco) && preco(l.preco) + (p.preco_txt ? ", " + p.preco_txt : "")], ["Fama", p.nota_publica], ["Horário", p.horario]].filter(x => x[1]);
  let h = `<div class="post-topo"><button class="link voltar" id="b-voltar">Voltar para a lista</button>
    <span class="post-botoes">${temPonto(l) ? `<button class="chip ver-mapa" id="b-ver-mapa">Ver no mapa</button>` : ""}<button class="chip" id="b-compartilhar">Compartilhar</button></span></div><article class="post">
    <div class="eyebrow"><span class="${s}">${rotuloSit[s]}</span></div>
    <h2>${esc(p.titulo || l.nome)}</h2>
    ${p.linhafina ? `<p class="fina">${esc(p.linhafina)}</p>` : ""}`;
  if (l.visita) h += `<div class="visita"><b>Minha visita, ${esc(dataBR(l.visita.data))}${l.visita.nota ? " · " + l.visita.nota + "/5" : ""}</b>${l.visita.comentario ? `<p>${esc(l.visita.comentario)}</p>` : ""}</div>`;
  if (fatos.length) h += `<dl class="fatos">${fatos.map(([k,v]) => `<div><dt>${k}</dt><span class="pontos"></span><dd>${esc(v)}</dd></div>`).join("")}</dl>`;
  if (l.porque || urlOk(l.tiktok)) h += `<div class="porque"><b>Por que entrou na lista</b>${l.porque ? esc(l.porque) : ""}${urlOk(l.tiktok) ? `${l.porque ? " " : ""}<a href="${esc(urlOk(l.tiktok))}" target="_blank" rel="noopener">Ver o vídeo</a>` : ""}</div>`;
  if (!l.post) h += `<div class="esperando-box">Este lugar ainda não foi pesquisado.</div>`;
  (p.paragrafos || []).forEach((x, i) => h += `<p${i === 0 ? ' class="abre"' : ""}>${esc(x)}</p>`);
  if (p.pedir?.length) h += `<h3>O que pedir</h3><ul>${p.pedir.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
  if (p.atencao?.length) h += `<h3>Bom saber</h3><ul>${p.atencao.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
  h += `<div class="acoes"><a class="btn" href="${esc(gmaps(l))}" target="_blank" rel="noopener">Abrir no Google Maps</a>`;
  if (st.podeEditar && !temPonto(l) && !st.marcando) h += `<button class="btn" id="b-posicionar">Marcar no mapa</button>`;
  h += `</div>`;
  if (p.fontes?.length) h += `<div class="fontes">Pesquisado em ${esc(dataBR(p.pesquisado))}, a partir de:<ol>${p.fontes.map(f => `<li>${urlOk(f.url) ? `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.nome || f.url)}</a>` : esc(f.nome)}</li>`).join("")}</ol>Preços e horários mudam; confira antes de ir.</div>`;
  if (st.podeEditar) h += `<div class="acoes">${st.confirmaExcluir
      ? `<div class="confirma">Tirar ${esc(l.nome)} da lista? <button class="link perigo" id="b-excluir-sim">Tirar</button><button class="link" id="b-excluir-nao">Manter</button></div>`
      : `<button class="link" id="b-excluir">Tirar da lista</button>`}</div>`;
  h += `</article>`;
  // Barra fixa no pé da tela com o "Já fui aqui" (só para quem edita).
  if (st.podeEditar){
    h += `<div class="barra-visita">`;
    if (st.visitaEdit) h += `<form id="form-visita"><div class="bv-topo"><b>Como foi?</b><button class="link" type="button" id="b-vcancel">Cancelar</button></div>
      <div class="notas" role="group" aria-label="Nota de 1 a 5">${[1,2,3,4,5].map(n => `<button type="button" data-nota="${n}" aria-pressed="${st.visitaEdit.nota===n}">${n}</button>`).join("")}</div>
      <textarea id="v-com" maxlength="800" rows="2" aria-label="Comentário" placeholder="Comentário, se quiser: o que pediu, o que achou, se volta">${esc(st.visitaEdit.comentario||"")}</textarea>
      <button class="btn prim cheio" type="submit">Guardar visita</button></form>`;
    else if (s !== "fui") h += `<button class="btn prim cheio" id="b-fui">Já fui aqui</button>`;
    else h += `<div class="bv-feito"><span>Você já foi${l.visita?.nota ? ` · nota ${l.visita.nota}/5` : ""}</span><span class="linha-acoes"><button class="link" id="b-editar-visita">Mudar a nota</button><button class="link" id="b-desfazer">Desmarcar</button></span></div>`;
    h += `</div>`;
  }
  return h;
}

function abrir(id){
  st.aberto = id; st.confirmaExcluir = false; st.visitaEdit = null; st.form = false;
  if (decodeURIComponent(location.hash.slice(1)) !== id) location.hash = id;
  render(); painel.scrollTop = 0;
  if (celular()) altura("alto");
  const l = st.lugares[id];
  if (mapaPronto && l && temPonto(l)) mapa.flyTo({ center:[l.lng, l.lat], zoom: Math.max(mapa.getZoom(), 15), duration: 900, padding: folgaMapa() });
}
function fechar(){ st.aberto = null; st.confirmaExcluir = false; st.visitaEdit = null; if (location.hash) history.replaceState(null, "", location.pathname + location.search); render(); }
window.addEventListener("hashchange", () => { const id = decodeURIComponent(location.hash.slice(1)); if (id && st.lugares[id]) abrir(id); else if (!id && st.aberto) fechar(); });

async function compartilhar(l){
  // Cada lugar tem uma página própria (l/<id>/) com a prévia bonita para WhatsApp; lugares novos ainda sem ela usam o link direto.
  const base = location.origin + location.pathname.replace(/index\.html$/, "");
  let url = base + "#" + encodeURIComponent(l.id);
  try { const r = await fetch(base + "l/" + encodeURIComponent(l.id) + "/", { method:"HEAD" }); if (r.ok) url = base + "l/" + encodeURIComponent(l.id) + "/"; } catch(_){}
  const texto = (l.post?.linhafina || l.tipo || "") + "";
  if (navigator.share){ try { await navigator.share({ title: l.nome + " · Histórias por viver", text: texto, url }); return; } catch(e){ if (e && e.name === "AbortError") return; } }
  try { await navigator.clipboard.writeText(url); avisar("Link copiado"); } catch(_){ prompt("Copie o link:", url); }
}
function pertoDeMim(){
  if (st.ordem === "perto"){ st.ordem = "nome"; render(); return; }
  if (!navigator.geolocation){ avisar("Este navegador não informa a localização"); return; }
  avisar("Procurando onde você está…");
  navigator.geolocation.getCurrentPosition(p => {
    st.posicao = { lat: p.coords.latitude, lng: p.coords.longitude }; st.ordem = "perto"; render();
    if (mapaPronto){
      if (!marcaEu){ const el = document.createElement("div"); el.className = "marca-eu"; el.title = "Você"; marcaEu = new maplibregl.Marker({ element: el }).setLngLat([st.posicao.lng, st.posicao.lat]).addTo(mapa); }
      else marcaEu.setLngLat([st.posicao.lng, st.posicao.lat]);
      mapa.flyTo({ center:[st.posicao.lng, st.posicao.lat], zoom: 13.5 });
    }
    toastEl.hidden = true;
  }, () => avisar("Não deu para saber onde você está"), { enableHighAccuracy:true, timeout:10000, maximumAge:60000 });
}
function sortear(){
  const op = visiveis().filter(l => situacao(l) !== "fui");
  if (!op.length){ avisar("Nenhum lugar para sortear com esse filtro"); return; }
  const l = op[Math.floor(Math.random() * op.length)];
  avisar("Que tal " + l.nome + "?"); abrir(l.id);
}

/* ---------- Eventos ---------- */
painel.addEventListener("click", async e => {
  const t = e.target.closest("button, [data-abrir]"); if (!t) return;
  const l = st.aberto && st.lugares[st.aberto];
  if (t.dataset.abrir) return abrir(t.dataset.abrir);
  if (t.dataset.filtro){ st.filtro = t.dataset.filtro; render(); enquadrar(true); return; }
  if (t.dataset.grupo !== undefined){ st.grupo = st.grupo === t.dataset.grupo ? "" : t.dataset.grupo; render(); enquadrar(true); return; }
  if (t.dataset.nota){ st.visitaEdit.nota = +t.dataset.nota; st.visitaEdit.comentario = document.getElementById("v-com").value; return render(); }
  if (t.dataset.aceitar){ const s = st.sugestoes.find(x => String(x.id) === t.dataset.aceitar); if (!s) return;
    const ok = await salvar(slug(s.nome) + "-" + Math.random().toString(36).slice(2,6), { nome: s.nome, tiktok: urlOk(s.link) || null, porque: "Sugestão" + (s.quem ? " de " + s.quem : "") + (s.comentario ? ": " + s.comentario : "."), status:"quero" });
    if (ok){ await sb.from("sugestoes").delete().eq("id", s.id); await carregarSugestoes(); render(); avisar("Entrou na lista, esperando pesquisa"); } return; }
  if (t.dataset.descartar){ await sb.from("sugestoes").delete().eq("id", t.dataset.descartar); await carregarSugestoes(); render(); return; }
  switch (t.id){
    case "b-novo": st.form = true; st.novoPos = null; render(); document.getElementById("f-nome")?.focus(); break;
    case "b-cancelar": st.form = false; st.novoPos = null; st.marcando = false; dica.hidden = true; render(); break;
    case "b-marcar": guardarRascunho(); st.marcando = true; dica.textContent = "Clique no mapa onde fica o lugar"; dica.hidden = false; break;
    case "b-voltar": fechar(); break;
    case "b-compartilhar": compartilhar(l); break;
    case "b-ver-mapa": altura("baixo"); setTimeout(() => mapa && mapa.flyTo({ center:[l.lng, l.lat], zoom: 16, duration: 700, padding: folgaMapa() }), 340); break;
    case "b-sortear": sortear(); break;
    case "b-perto": pertoDeMim(); break;
    case "b-sugerir": case "b-sugerir-mais": st.sugerindo = true; st.sugerido = false; render(); document.getElementById("s-nome")?.focus(); break;
    case "b-sugerir-cancelar": st.sugerindo = false; render(); break;
    case "b-fui": st.visitaEdit = { nota:0, comentario:"" }; render(); break;
    case "b-editar-visita": st.visitaEdit = { nota: l.visita?.nota || 0, comentario: l.visita?.comentario || "", data: l.visita?.data }; render(); break;
    case "b-vcancel": st.visitaEdit = null; render(); break;
    case "b-desfazer": await salvar(l.id, { status:"quero" }, true); break;
    case "b-posicionar": st.marcando = "existente"; dica.textContent = "Clique no mapa onde fica " + l.nome; dica.hidden = false; break;
    case "b-excluir": st.confirmaExcluir = true; render(); break;
    case "b-excluir-nao": st.confirmaExcluir = false; render(); break;
    case "b-excluir-sim": { const { error } = await sb.from(TABELA).delete().eq("id", l.id); if (!error){ st.aberto = null; history.replaceState(null, "", location.pathname); await carregar(); } else { st.aviso = "Não deu para tirar agora."; render(); } break; }
    case "b-entrar": st.entrando = true; render(); document.getElementById("e-mail")?.focus(); break;
    case "b-sair": await sb.auth.signOut(); break;
  }
});
painel.addEventListener("keydown", e => { const it = e.target.closest?.("[data-abrir]"); if (it && (e.key === "Enter" || e.key === " ")){ e.preventDefault(); abrir(it.dataset.abrir); } });
painel.addEventListener("input", e => { if (e.target.id === "busca"){ st.busca = e.target.value; const pos = e.target.selectionStart; render(); const b = document.getElementById("busca"); b.focus(); b.setSelectionRange(pos,pos); } });
let rascunho = {};
function guardarRascunho(){ ["f-nome","f-end","f-tt","f-porque"].forEach(k => { const el = document.getElementById(k); if (el) rascunho[k] = el.value; }); }
function restaurarRascunho(){ ["f-nome","f-end","f-tt","f-porque"].forEach(k => { const el = document.getElementById(k); if (el && rascunho[k]) el.value = rascunho[k]; }); }
painel.addEventListener("submit", async e => {
  e.preventDefault();
  const v = k => (document.getElementById(k)?.value || "").trim();
  if (e.target.id === "form-entrar"){
    const { error } = await sb.auth.signInWithOtp({ email: v("e-mail"), options:{ shouldCreateUser:false, emailRedirectTo: location.origin + location.pathname } });
    if (error){ st.aviso = "Esse e-mail não tem acesso para editar."; render(); return; }
    st.linkEnviado = true; st.entrando = false; render();
  }
  if (e.target.id === "form-sugerir"){
    const { error } = await sb.from("sugestoes").insert({ nome: v("s-nome"), link: v("s-link") || null, quem: v("s-quem") || null, comentario: v("s-coment") || null });
    if (error){ avisar("Não deu para mandar agora. Tente de novo."); return; }
    st.sugerindo = false; st.sugerido = true; render();
  }
  if (e.target.id === "form-novo"){
    const nome = v("f-nome"); if (!nome) return;
    const id = slug(nome) + "-" + Math.random().toString(36).slice(2,6);
    const dados = { nome, endereco: v("f-end"), tiktok: v("f-tt"), porque: v("f-porque"), status:"quero" };
    if (st.novoPos){ dados.lat = st.novoPos.lat; dados.lng = st.novoPos.lng; }
    if (await salvar(id, dados)){ st.form = false; st.novoPos = null; rascunho = {}; render(); }
  }
  if (e.target.id === "form-visita"){
    const l = st.lugares[st.aberto];
    const visita = { data: st.visitaEdit.data || new Date().toISOString().slice(0,10), nota: st.visitaEdit.nota || null, comentario: v("v-com") };
    if (await salvar(l.id, { status:"fui", visita }, true)){ st.visitaEdit = null; render(); }
  }
});

/* ---------- Início ---------- */
iniciarMapa();
render();
(async () => {
  const cfg = window.SUPABASE;
  if (!cfg || !cfg.url || !window.supabase){ st.semBanco = true; render(); return; }
  sb = window.supabase.createClient(cfg.url, cfg.chave);
  const { data } = await sb.auth.getSession();
  st.sessao = data.session; await verEditor(); await carregarSugestoes();
  sb.auth.onAuthStateChange(async (_ev, sessao) => { st.sessao = sessao; await verEditor(); await carregarSugestoes(); render(); });
  await carregar();
})();
})();

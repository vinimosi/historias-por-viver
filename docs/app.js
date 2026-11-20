(function(){
"use strict";
const TABELA = "lugares";
const st = { lugares:{}, carregado:false, semBanco:false, podeEditar:false, sessao:null, filtro:"todos", grupo:"", busca:"",
  aberto:null, form:false, marcando:false, novoPos:null, confirmaExcluir:false, visitaEdit:null, aviso:"", entrando:false, linkEnviado:false };
let sb = null, mapa = null, camPinos = null;
const painel = document.getElementById("painel");
const dica = document.getElementById("dica");

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const urlOk = u => /^https?:\/\//i.test(u||"") ? u : "";
const slug = s => (s||"lugar").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40) || "lugar";
const preco = n => ["","$","$$","$$$","$$$$"][n] || "";
const situacao = l => l.status === "fui" ? "fui" : (l.post ? "quero" : "esperando");
const rotuloSit = { quero:"quero ir", fui:"já fui", esperando:"esperando pesquisa" };
const gmaps = l => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([l.nome, l.endereco || l.bairro, "São Paulo"].filter(Boolean).join(", "));
const dataBR = s => { if(!s) return ""; const d = new Date(s); return isNaN(d) ? s : d.toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"}); };

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

/* ---------- Mapa ---------- */
function iniciarMapa(){
  if (!window.L){ document.getElementById("mapa").innerHTML = '<p style="padding:24px;color:var(--muted);font-style:italic">O mapa não carregou. Recarregue a página.</p>'; return; }
  mapa = L.map("mapa", { zoomSnap:0.5, minZoom:10, maxZoom:18 }).setView([-23.565, -46.66], 12.5);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom:19, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(mapa);
  mapa.attributionControl.setPrefix(false);
  camPinos = L.layerGroup().addTo(mapa);
  mapa.on("click", cliqueMapa);
}
async function cliqueMapa(e){
  if (!st.marcando) return;
  const pos = { lat:+e.latlng.lat.toFixed(5), lng:+e.latlng.lng.toFixed(5) };
  const modo = st.marcando;
  st.marcando = false; dica.hidden = true;
  if (modo === "existente"){ await salvar(st.aberto, pos, true); return; }
  st.novoPos = pos; render(); restaurarRascunho();
}
let enquadrado = false;
function enquadrar(){
  if (enquadrado || !mapa) return;
  const pts = todos().filter(l => typeof l.lat === "number").map(l => [l.lat, l.lng]);
  if (pts.length){ mapa.fitBounds(L.latLngBounds(pts).pad(0.05), { maxZoom:15 }); enquadrado = true; }
}
function desenharPinos(){
  if (!mapa) return;
  if (!st.aberto) enquadrar();
  camPinos.clearLayers();
  for (const l of visiveis()){
    if (typeof l.lat !== "number" || typeof l.lng !== "number") continue;
    const m = L.marker([l.lat, l.lng], { title: l.nome, riseOnHover:true,
      icon: L.divIcon({ className: "pino" + (situacao(l) === "fui" ? " fui" : "") + (st.aberto === l.id ? " ativo" : ""), html:"<span></span>", iconSize:null }) });
    m.on("click", () => abrir(l.id));
    camPinos.addLayer(m);
  }
  if (st.novoPos) camPinos.addLayer(L.marker([st.novoPos.lat, st.novoPos.lng], { interactive:false, icon: L.divIcon({ className:"pino ativo", html:"<span></span>", iconSize:null }) }));
}

/* ---------- Dados ---------- */
function todos(){ return Object.values(st.lugares).sort((a,b) => (a.nome||"").localeCompare(b.nome||"", "pt-BR")); }
function visiveis(){
  const q = st.busca.trim().toLowerCase();
  return todos().filter(l => {
    const s = situacao(l);
    if (st.filtro === "quero" && s === "fui") return false;
    if (st.filtro === "fui" && s !== "fui") return false;
    if (st.grupo && grupoDe(l) !== st.grupo) return false;
    if (q && ![l.nome,l.bairro,l.tipo,l.endereco,l.post?.linhafina].join(" ").toLowerCase().includes(q)) return false;
    return true;
  });
}
async function carregar(){
  const { data, error } = await sb.from(TABELA).select("*");
  if (error){ st.aviso = "Não deu para ler os lugares agora. Recarregue a página."; st.carregado = true; render(); return; }
  const novo = {}; (data || []).forEach(l => novo[l.id] = l);
  st.lugares = novo; st.carregado = true;
  if (st.aberto && !novo[st.aberto]) st.aberto = null;
  const h = decodeURIComponent(location.hash.slice(1));
  if (!st.aberto && h && novo[h]){ abrir(h); return; }
  if (!st.form) render(); else desenharPinos();
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
  desenharPinos();
}
function telaLista(){
  const t = todos();
  const nFui = t.filter(x => situacao(x) === "fui").length;
  const nEsp = t.filter(x => situacao(x) === "esperando").length;
  const contaGrupo = {}; t.forEach(x => { const g = grupoDe(x); contaGrupo[g] = (contaGrupo[g]||0) + 1; });
  const grupos = GRUPOS.map(g => g[0]).concat("Outros").filter(g => contaGrupo[g]);
  const vis = visiveis();
  let h = `<header class="topo"><div><h1>Histórias por viver</h1>
    <p class="sub">Os lugares que apareceram no caminho, anotados para um dia.</p>
    <div class="contagem"><i style="background:var(--accent)"></i>${t.length - nFui} para ir &nbsp; <i style="background:var(--moss)"></i>${nFui} visitados${nEsp ? ` &nbsp; ${nEsp} esperando pesquisa` : ""}</div></div>
    ${st.podeEditar && !st.form ? `<button class="btn prim" id="b-novo">Anotar lugar</button>` : ""}</header>`;
  if (st.aviso) h += `<div class="aviso" role="status">${esc(st.aviso)}</div>`;
  if (st.semBanco) h += `<div class="aviso">O site ainda não está ligado ao banco de dados.</div>`;
  if (st.form) h += telaForm();
  if (t.length){
    h += `<div class="filtros">
      <div class="abas" role="group" aria-label="Mostrar">${[["todos","Todos"],["quero","Quero ir"],["fui","Já fui"]].map(([k,n]) => `<button data-filtro="${k}" aria-pressed="${st.filtro===k}">${n}</button>`).join("")}</div>
      <input class="busca" id="busca" type="search" placeholder="Procurar por nome, bairro ou comida" value="${esc(st.busca)}" aria-label="Procurar">
      ${grupos.length > 1 ? `<div class="grupos">${grupos.map(g => `<button data-grupo="${esc(g)}" aria-pressed="${st.grupo===g}">${esc(g)} <span>${contaGrupo[g]}</span></button>`).join("")}</div>` : ""}
    </div>`;
    h += vis.length ? `<ul class="lista">${vis.map(itemLista).join("")}</ul>` : `<p class="vazio">Nada por aqui com esse filtro.</p>`;
  } else if (st.carregado && !st.form){
    h += `<div class="vazio"><h2>O caderno ainda está em branco</h2>Assim que houver lugares anotados, eles aparecem aqui e no mapa.</div>`;
  } else if (!st.carregado && !st.semBanco){
    h += `<p class="vazio">Abrindo o caderno…</p>`;
  }
  h += telaEntrar();
  return h;
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
  const selo = s === "fui" ? `<span class="selo fui">já fui${l.visita?.nota ? " · " + l.visita.nota + "/5" : ""}</span>` : s === "esperando" ? `<span class="selo esperando">esperando pesquisa</span>` : "";
  return `<li class="item" data-abrir="${esc(l.id)}" tabindex="0" role="button" aria-label="Abrir ${esc(l.nome)}">
    <div class="linha"><h3>${esc(l.nome)}</h3><span class="pontos"></span><span class="preco">${preco(l.preco)}</span></div>
    <div class="meta">${meta ? `<span>${esc(meta)}</span>` : ""}${selo}</div>
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
  const fatos = [["Comida", l.tipo], ["Bairro", l.bairro], ["Endereço", l.endereco], ["Preço", preco(l.preco) && preco(l.preco) + (p.preco_txt ? ", " + p.preco_txt : "")], ["Fama", p.nota_publica], ["Horário", p.horario]].filter(x => x[1]);
  let h = `<button class="link voltar" id="b-voltar">Voltar para a lista</button><article class="post">
    <div class="eyebrow"><span class="${s}">${rotuloSit[s]}</span></div>
    <h2>${esc(p.titulo || l.nome)}</h2>
    ${p.linhafina ? `<p class="fina">${esc(p.linhafina)}</p>` : ""}`;
  if (fatos.length) h += `<dl class="fatos">${fatos.map(([k,v]) => `<div><dt>${k}</dt><span class="pontos"></span><dd>${esc(v)}</dd></div>`).join("")}</dl>`;
  if (l.visita) h += `<div class="visita"><b>Minha visita, ${esc(dataBR(l.visita.data))}${l.visita.nota ? " · " + l.visita.nota + "/5" : ""}</b>${l.visita.comentario ? `<p style="margin:6px 0 0;font-size:17px">${esc(l.visita.comentario)}</p>` : ""}</div>`;
  if (l.porque || urlOk(l.tiktok)) h += `<div class="porque"><b>Por que entrou na lista</b>${l.porque ? esc(l.porque) : ""}${urlOk(l.tiktok) ? `${l.porque ? " " : ""}<a href="${esc(urlOk(l.tiktok))}" target="_blank" rel="noopener">Ver o vídeo</a>` : ""}</div>`;
  if (!l.post) h += `<div class="esperando-box">Este lugar ainda não foi pesquisado.</div>`;
  (p.paragrafos || []).forEach((x, i) => h += `<p${i === 0 ? ' class="abre"' : ""}>${esc(x)}</p>`);
  if (p.pedir?.length) h += `<h3>O que pedir</h3><ul>${p.pedir.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
  if (p.atencao?.length) h += `<h3>Bom saber</h3><ul>${p.atencao.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
  h += `<div class="acoes"><a class="btn" href="${esc(gmaps(l))}" target="_blank" rel="noopener">Abrir no Google Maps</a>`;
  if (st.podeEditar){
    h += s === "fui" ? `<button class="link" id="b-desfazer">Voltar para quero ir</button>` : `<button class="btn prim" id="b-fui">Já fui</button>`;
    if (typeof l.lat !== "number" && !st.marcando) h += `<button class="btn" id="b-posicionar">Marcar no mapa</button>`;
  }
  h += `</div>`;
  if (st.visitaEdit) h += `<form class="form" id="form-visita"><h2>Como foi?</h2>
    <div class="notas" role="group" aria-label="Nota">${[1,2,3,4,5].map(n => `<button type="button" data-nota="${n}" aria-pressed="${st.visitaEdit.nota===n}">${n}</button>`).join("")}</div>
    <label>Comentário <span>opcional</span><textarea id="v-com" maxlength="800">${esc(st.visitaEdit.comentario||"")}</textarea></label>
    <div class="linha-acoes"><button class="btn prim" type="submit">Guardar visita</button><button class="link" type="button" id="b-vcancel">Cancelar</button></div></form>`;
  if (p.fontes?.length) h += `<div class="fontes">Pesquisado em ${esc(dataBR(p.pesquisado))}, a partir de:<ol>${p.fontes.map(f => `<li>${urlOk(f.url) ? `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.nome || f.url)}</a>` : esc(f.nome)}</li>`).join("")}</ol>Preços e horários mudam; confira antes de ir.</div>`;
  if (st.podeEditar) h += `<div class="acoes">${st.confirmaExcluir
      ? `<div class="confirma">Tirar ${esc(l.nome)} da lista? <button class="link perigo" id="b-excluir-sim">Tirar</button><button class="link" id="b-excluir-nao">Manter</button></div>`
      : `<button class="link" id="b-excluir">Tirar da lista</button>`}</div>`;
  return h + `</article>`;
}

function abrir(id){
  st.aberto = id; st.confirmaExcluir = false; st.visitaEdit = null; st.form = false;
  if (decodeURIComponent(location.hash.slice(1)) !== id) location.hash = id;
  render(); painel.scrollTop = 0;
  if (window.innerWidth <= 860) painel.scrollIntoView({ behavior:"smooth", block:"start" });
  const l = st.lugares[id];
  if (mapa && l && typeof l.lat === "number") mapa.flyTo([l.lat, l.lng], Math.max(mapa.getZoom(), 15), { duration:.6 });
}
function fechar(){ st.aberto = null; st.confirmaExcluir = false; st.visitaEdit = null; if (location.hash) history.replaceState(null, "", location.pathname + location.search); render(); }
window.addEventListener("hashchange", () => { const id = decodeURIComponent(location.hash.slice(1)); if (id && st.lugares[id]) abrir(id); else if (!id && st.aberto) fechar(); });

/* ---------- Eventos ---------- */
painel.addEventListener("click", async e => {
  const t = e.target.closest("button, [data-abrir]"); if (!t) return;
  const l = st.aberto && st.lugares[st.aberto];
  if (t.dataset.abrir) return abrir(t.dataset.abrir);
  if (t.dataset.filtro){ st.filtro = t.dataset.filtro; return render(); }
  if (t.dataset.grupo !== undefined){ st.grupo = st.grupo === t.dataset.grupo ? "" : t.dataset.grupo; return render(); }
  if (t.dataset.nota){ st.visitaEdit.nota = +t.dataset.nota; st.visitaEdit.comentario = document.getElementById("v-com").value; return render(); }
  switch (t.id){
    case "b-novo": st.form = true; st.novoPos = null; render(); document.getElementById("f-nome")?.focus(); break;
    case "b-cancelar": st.form = false; st.novoPos = null; st.marcando = false; dica.hidden = true; render(); break;
    case "b-marcar": guardarRascunho(); st.marcando = true; dica.textContent = "Clique no mapa onde fica o lugar"; dica.hidden = false; break;
    case "b-voltar": fechar(); break;
    case "b-fui": st.visitaEdit = { nota:0, comentario:"" }; render(); break;
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
  if (e.target.id === "form-entrar"){
    const email = document.getElementById("e-mail").value.trim();
    const { error } = await sb.auth.signInWithOtp({ email, options:{ shouldCreateUser:false, emailRedirectTo: location.origin + location.pathname } });
    if (error){ st.aviso = "Esse e-mail não tem acesso para editar."; render(); return; }
    st.linkEnviado = true; st.entrando = false; render();
  }
  if (e.target.id === "form-novo"){
    const v = k => document.getElementById(k).value.trim();
    const nome = v("f-nome"); if (!nome) return;
    const id = slug(nome) + "-" + Math.random().toString(36).slice(2,6);
    const dados = { nome, endereco: v("f-end"), tiktok: v("f-tt"), porque: v("f-porque"), status:"quero" };
    if (st.novoPos){ dados.lat = st.novoPos.lat; dados.lng = st.novoPos.lng; }
    if (await salvar(id, dados)){ st.form = false; st.novoPos = null; rascunho = {}; render(); }
  }
  if (e.target.id === "form-visita"){
    const l = st.lugares[st.aberto];
    const visita = { data: new Date().toISOString().slice(0,10), nota: st.visitaEdit.nota || null, comentario: document.getElementById("v-com").value.trim() };
    if (await salvar(l.id, { status:"fui", visita }, true)){ st.visitaEdit = null; render(); }
  }
});

/* ---------- Início ---------- */
iniciarMapa();
render();
(async () => {
  const cfg = window.SUPABASE;
  if (!cfg || !cfg.url || !window.supabase){
    // Teste local: com ?amostra, lê amostra.json (arquivo que só existe no PC).
    if (location.search === "?amostra"){ try { const d = await (await fetch("amostra.json")).json(); d.forEach(l => st.lugares[l.id] = l); st.carregado = true; st.podeEditar = true; render(); return; } catch(_){} }
    st.semBanco = true; render(); return;
  }
  sb = window.supabase.createClient(cfg.url, cfg.chave);
  const { data } = await sb.auth.getSession();
  st.sessao = data.session; await verEditor();
  sb.auth.onAuthStateChange(async (_ev, sessao) => { st.sessao = sessao; await verEditor(); render(); });
  await carregar();
})();
})();

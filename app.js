let DADOS = null;
let GOV = null;
let BUS = null;
let temaAtivo = "Todos";
let modo = "lista";
let ladoA = null;
let ladoB = null;
const busResp = {}; // id da pergunta -> -1 | 0 | 1

async function carregar() {
  const [cRes, gRes, bRes] = await Promise.all([
    fetch("data/candidatos.json"),
    fetch("data/governo.json"),
    fetch("data/bussola.json"),
  ]);
  DADOS = await cRes.json();
  GOV = await gRes.json();
  BUS = await bRes.json();

  document.getElementById("atualizado").textContent = formatarData(DADOS.atualizadoEm);

  const validos = candidatosValidos();
  const nTemas = DADOS.temas.length;
  document.getElementById("heroStat").innerHTML =
    `<b>${validos.length}</b> candidatos · <b>${nTemas}</b> temas · resumido dos planos oficiais`;

  ladoA = validos[0]?.id || null;
  ladoB = validos[1]?.id || validos[0]?.id || null;

  montarHeroFaces();
  montarFiltros();
  montarModos();
  montarSeletoresX1();
  renderGoverno();
  montarPerguntas();
  render();
}

function candidatosValidos() {
  return DADOS.candidatos.filter((c) => c.id !== "exemplo");
}
function acharCandidato(id) {
  return DADOS.candidatos.find((c) => c.id === id);
}
function formatarData(iso) {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}
function iniciais(nome) {
  return nome.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}
function corDe(c) {
  return c.cor || "var(--ink)";
}
function embaralhar(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function faceEl(c, classe) {
  return c.foto
    ? `<img class="face ${classe}" src="${c.foto}" alt="Foto de ${c.nome}" loading="lazy" />`
    : `<div class="face ${classe}" aria-hidden="true">${iniciais(c.nome)}</div>`;
}

/* ---------- Hero faces ---------- */
function montarHeroFaces() {
  const wrap = document.getElementById("heroFaces");
  wrap.innerHTML = candidatosValidos()
    .map((c) => {
      const inner = c.foto
        ? `<img src="${c.foto}" alt="" loading="lazy" />`
        : `<span class="hero-face-ini">${iniciais(c.nome)}</span>`;
      return `<button class="hero-face" style="--cor:${corDe(c)}" data-id="${c.id}" title="${c.nome}" aria-label="Ver propostas de ${c.nome}">${inner}</button>`;
    })
    .join("");

  wrap.addEventListener("click", (e) => {
    const btn = e.target.closest(".hero-face");
    if (!btn) return;
    if (modo !== "lista") trocarModo("lista");
    const alvo = document.getElementById("c-" + btn.dataset.id);
    if (alvo) requestAnimationFrame(() => alvo.scrollIntoView({ behavior: "smooth", block: "start" }));
  });
}

/* ---------- Modos ---------- */
const MODOS = [
  { modo: "lista", btn: "modoLista", sec: "lista" },
  { modo: "x1", btn: "modoX1", sec: "x1" },
  { modo: "governo", btn: "modoGoverno", sec: "governo" },
  { modo: "bussola", btn: "modoBussola", sec: "bussola" },
];
function montarModos() {
  MODOS.forEach((m) =>
    document.getElementById(m.btn).addEventListener("click", () => trocarModo(m.modo))
  );
}
function trocarModo(novo) {
  modo = novo;
  MODOS.forEach((m) => {
    const ativo = m.modo === modo;
    const btn = document.getElementById(m.btn);
    btn.classList.toggle("ativo", ativo);
    btn.setAttribute("aria-selected", ativo);
    document.getElementById(m.sec).hidden = !ativo;
  });
  document.getElementById("filtros").hidden = modo !== "lista";
  window.scrollTo({ top: document.querySelector(".controls").offsetTop - 1, behavior: "auto" });
  render();
}

/* ---------- Filtros ---------- */
function montarFiltros() {
  const nav = document.getElementById("filtros");
  const temas = ["Todos", ...DADOS.temas];
  nav.innerHTML = temas
    .map(
      (t) =>
        `<button class="chip ${t === temaAtivo ? "ativo" : ""}" data-tema="${t}" aria-pressed="${t === temaAtivo}">${t}</button>`
    )
    .join("");
  nav.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    temaAtivo = chip.dataset.tema;
    nav.querySelectorAll(".chip").forEach((c) => {
      const ativo = c === chip;
      c.classList.toggle("ativo", ativo);
      c.setAttribute("aria-pressed", ativo);
    });
    render();
  });
}

/* ---------- Seletores X1 ---------- */
function montarSeletoresX1() {
  const validos = candidatosValidos();
  const opcoes = (sel) =>
    validos
      .map((c) => `<option value="${c.id}" ${c.id === sel ? "selected" : ""}>${c.numero ? c.numero + " · " : ""}${c.nome}</option>`)
      .join("");
  const selA = document.getElementById("selA");
  const selB = document.getElementById("selB");
  selA.innerHTML = opcoes(ladoA);
  selB.innerHTML = opcoes(ladoB);
  selA.addEventListener("change", (e) => { ladoA = e.target.value; render(); });
  selB.addEventListener("change", (e) => { ladoB = e.target.value; render(); });
}

/* ---------- Render ---------- */
function render() {
  if (modo === "lista") renderLista();
  else if (modo === "x1") renderX1();
  else if (modo === "bussola") renderBussola();
  // "governo" é estático (renderizado uma vez no carregar)
}

function renderLista() {
  const lista = document.getElementById("lista");
  const cards = candidatosValidos().map(cardCandidato).filter(Boolean);
  if (cards.length === 0) {
    lista.innerHTML = `<div class="vazio">Nenhum candidato com propostas em <strong>${temaAtivo}</strong>.</div>`;
    return;
  }
  lista.innerHTML = cards.join("");
}

function cardCandidato(c, i) {
  const cor = corDe(c);
  const temas = Object.keys(c.propostas || {}).filter(
    (t) => (temaAtivo === "Todos" || t === temaAtivo) && (c.propostas[t] || []).length > 0
  );
  if (temas.length === 0) return "";

  const blocos = temas
    .map((t) => {
      const itens = c.propostas[t];
      return `
      <div class="tema">
        <div class="tema-cab">
          <span class="tema-nome">${t}</span>
          <span class="tema-count">${String(itens.length).padStart(2, "0")}</span>
        </div>
        ${itens.map((p) => `<div class="prop">${p}</div>`).join("")}
      </div>`;
    })
    .join("");

  const rf = c.redflags || [];
  const rfBlock = rf.length
    ? `<div class="redflags">
         <div class="rf-head"><span class="rf-dot"></span> Controvérsias &amp; processos</div>
         ${rf
           .map((it) => {
             const fonte = it.url
               ? `<a class="rf-fonte" href="${it.url}" target="_blank" rel="noopener">${it.fonte} ↗</a>`
               : `<span class="rf-fonte">${it.fonte}</span>`;
             return `<div class="rf-item"><span class="rf-texto">${it.texto}</span><br />${fonte}</div>`;
           })
           .join("")}
       </div>`
    : `<div class="semflag"><span class="semflag-dot"></span> Sem processo ou escândalo de grande repercussão registrado em fontes confiáveis.</div>`;

  const numChip = c.numero ? `<span class="num-chip">nº ${c.numero}</span>` : "";
  const fonte =
    c.fonte && c.fonte !== "#"
      ? `<a class="fonte-link" href="${c.fonte}" target="_blank" rel="noopener">Plano de governo oficial →</a>`
      : `<span class="fonte-nolink">Fonte: plano registrado no TSE</span>`;

  const delay = Math.min(i * 0.05, 0.4);

  return `
    <article class="cand" id="c-${c.id}" style="--cor:${cor}; animation-delay:${delay}s">
      <div class="cand-head">
        ${faceEl(c, "face-lg")}
        <div class="cand-id">
          <h2 class="cand-nome">${c.nome}</h2>
          <div class="cand-meta">
            <span class="cand-partido">${c.partido || ""}</span>
            ${numChip}
          </div>
        </div>
      </div>
      <div class="cand-body">${blocos}</div>
      ${rfBlock}
      <div class="cand-fonte">
        <span class="fonte-selo">TSE</span>
        ${fonte}
      </div>
    </article>`;
}

/* ---------- Render X1 ---------- */
function fighterHeader(c) {
  return `
    <div class="x1-fighter" style="--cor:${corDe(c)}">
      ${faceEl(c, "face-md")}
      <div>
        <div class="x1-fighter-nome">${c.nome}</div>
        <div class="x1-fighter-partido">${c.partido || ""}${c.numero ? " · nº " + c.numero : ""}</div>
      </div>
    </div>`;
}
function colunaItens(itens, lado) {
  if (!itens || itens.length === 0) {
    return `<div class="x1-col" data-lado="${lado}"><div class="x1-vazio">Sem proposta neste tema.</div></div>`;
  }
  return `<div class="x1-col" data-lado="${lado}">${itens.map((p) => `<div class="x1-item">${p}</div>`).join("")}</div>`;
}
function renderX1() {
  const arena = document.getElementById("x1Arena");
  const a = acharCandidato(ladoA);
  const b = acharCandidato(ladoB);
  if (!a || !b) {
    arena.innerHTML = `<div class="vazio">Escolha dois candidatos para comparar.</div>`;
    return;
  }
  arena.style.setProperty("--corA", corDe(a));
  arena.style.setProperty("--corB", corDe(b));
  const mesmo = a.id === b.id;

  const temas = mesmo
    ? []
    : DADOS.temas.filter((t) => (a.propostas && a.propostas[t]) || (b.propostas && b.propostas[t]));

  const bandas = temas
    .map(
      (t) => `
      <div class="x1-tema">
        <div class="x1-tema-faixa">${t}</div>
        <div class="x1-cols">
          ${colunaItens(a.propostas[t], "A")}
          ${colunaItens(b.propostas[t], "B")}
        </div>
      </div>`
    )
    .join("");

  arena.innerHTML = `
    <div class="x1-cabecalho">
      ${fighterHeader(a)}
      ${fighterHeader(b)}
    </div>
    ${mesmo ? `<div class="x1-mesmo">Escolha dois candidatos diferentes para comparar.</div>` : bandas}`;
}

/* ---------- Balanço do governo ---------- */
function renderGoverno() {
  document.getElementById("govTitulo").textContent = GOV.titulo;
  document.getElementById("govPeriodo").textContent = GOV.periodo;
  document.getElementById("govNota").textContent = GOV.nota;

  const av = GOV.avaliacao;
  if (av) {
    document.getElementById("govAval").innerHTML = `
      <div class="aval-card">
        <h3 class="aval-titulo">Como o povo avalia o governo</h3>
        <p class="aval-resumo">${av.resumo}</p>
        <div class="aval-pontos">
          ${av.pontos
            .map(
              (p) => `
            <div class="aval-ponto">
              <span class="aval-texto">${p.texto}</span>
              ${p.url ? `<a class="aval-fonte" href="${p.url}" target="_blank" rel="noopener">${p.fonte} ↗</a>` : `<span class="aval-fonte">${p.fonte}</span>`}
            </div>`
            )
            .join("")}
        </div>
      </div>`;
  }

  const alvo = document.getElementById("govAreas");
  alvo.innerHTML = GOV.areas
    .map((a, i) => {
      const av = a.pontos.filter((p) => p.tipo === "avanço").length;
      const pr = a.pontos.filter((p) => p.tipo === "problema").length;
      const avLabel = `${av} ${av === 1 ? "avanço" : "avanços"}`;
      const prLabel = `${pr} ${pr === 1 ? "problema" : "problemas"}`;
      const pontos = a.pontos
        .map(
          (p) => `
        <div class="gov-ponto t-${p.tipo}">
          <span>${p.texto}</span>
          ${p.url ? `<a class="gov-ponto-fonte" href="${p.url}" target="_blank" rel="noopener">${p.fonte} ↗</a>` : `<span class="gov-ponto-fonte">${p.fonte}</span>`}
        </div>`
        )
        .join("");
      return `
      <details class="gov-area" ${i === 0 ? "open" : ""}>
        <summary>
          <span class="gov-area-nome">${a.area}</span>
          <span class="gov-area-stat">
            <span class="s-av"><span class="s-dot"></span>${avLabel}</span>
            <span class="s-pr"><span class="s-dot"></span>${prLabel}</span>
            <span class="gov-chev" aria-hidden="true">⌄</span>
          </span>
        </summary>
        <div class="gov-pontos">${pontos}</div>
      </details>`;
    })
    .join("");
}

/* ---------- Bússola do voto (afinidade) ---------- */
const OPCOES = [
  { v: 1, rot: "Concordo" },
  { v: 0, rot: "Tanto faz" },
  { v: -1, rot: "Discordo" },
];

function montarPerguntas() {
  const wrap = document.getElementById("busPerguntas");
  wrap.innerHTML = BUS.perguntas
    .map(
      (q, i) => `
      <div class="bus-q">
        <p class="bus-q-txt"><span class="bus-q-num">${i + 1}</span> ${q.texto}</p>
        <div class="bus-opts" role="group" aria-label="${q.texto}">
          ${OPCOES.map(
            (o) =>
              `<button class="bus-opt" data-q="${q.id}" data-v="${o.v}" aria-pressed="false">${o.rot}</button>`
          ).join("")}
        </div>
      </div>`
    )
    .join("");

  wrap.addEventListener("click", (e) => {
    const btn = e.target.closest(".bus-opt");
    if (!btn) return;
    const q = btn.dataset.q;
    const v = Number(btn.dataset.v);
    busResp[q] = busResp[q] === v ? undefined : v; // clicar de novo desmarca
    wrap.querySelectorAll(`.bus-opt[data-q="${q}"]`).forEach((b) => {
      const on = Number(b.dataset.v) === busResp[q];
      b.classList.toggle("ativo", on);
      b.setAttribute("aria-pressed", on);
    });
    renderBussola();
  });
}

function afinidade(c) {
  const pos = BUS.posicoes[c.id] || {};
  let n = 0,
    soma = 0;
  BUS.perguntas.forEach((q) => {
    const u = busResp[q.id];
    if (u === undefined || u === 0) return; // só conta onde o usuário tem opinião
    n += 1;
    soma += u * (pos[q.id] || 0); // +1 concorda, -1 discorda, 0 candidato neutro
  });
  if (n === 0) return null;
  return { pct: Math.round(((soma + n) / (2 * n)) * 100), n };
}

function renderBussola() {
  const alvo = document.getElementById("busResultado");
  const respondidas = Object.values(busResp).filter((v) => v === 1 || v === -1).length;
  if (respondidas === 0) {
    alvo.innerHTML = `<div class="bus-empty">Responda pelo menos uma afirmação acima para ver sua afinidade com cada candidato.</div>`;
    return;
  }

  const rank = candidatosValidos()
    .map((c) => ({ c, af: afinidade(c) }))
    .filter((r) => r.af)
    .sort((a, b) => b.af.pct - a.af.pct || a.c.nome.localeCompare(b.c.nome, "pt"));

  alvo.innerHTML = `
    <p class="bus-rank-nota">Ordenado por afinidade com as suas ${respondidas} resposta(s). Empates aparecem juntos — e afinidade alta não quer dizer que o candidato seja bom, só que concorda com você nessas questões.</p>
    <div class="bus-rank">${rank
      .map((r, i) => {
        const destaque = i === 0;
        return `
      <article class="bus-card ${destaque ? "bus-top" : ""}" style="--cor:${corDe(r.c)}">
        <div class="bus-card-top">
          <span class="bus-pos">${i + 1}</span>
          ${faceEl(r.c, "face-md")}
          <div class="bus-card-id">
            <div class="bus-card-nome">${r.c.nome}</div>
            <div class="bus-card-part">${r.c.partido || ""}</div>
          </div>
          <span class="bus-match">${r.af.pct}%</span>
        </div>
      </article>`;
      })
      .join("")}</div>`;
}

carregar();

let DADOS = null;
let GOV = null;
let temaAtivo = "Todos";
let modo = "lista";
let ladoA = null;
let ladoB = null;
const busSel = new Set();

async function carregar() {
  const [cRes, gRes] = await Promise.all([
    fetch("data/candidatos.json"),
    fetch("data/governo.json"),
  ]);
  DADOS = await cRes.json();
  GOV = await gRes.json();

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
  montarBussolaTemas();
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

/* ---------- Bússola do voto ---------- */
function montarBussolaTemas() {
  const wrap = document.getElementById("busTemas");
  wrap.innerHTML = DADOS.temas
    .map((t) => `<button class="bus-tema" data-tema="${t}" aria-pressed="false">${t}</button>`)
    .join("");
  wrap.addEventListener("click", (e) => {
    const btn = e.target.closest(".bus-tema");
    if (!btn) return;
    const t = btn.dataset.tema;
    if (busSel.has(t)) busSel.delete(t);
    else busSel.add(t);
    btn.setAttribute("aria-pressed", busSel.has(t));
    renderBussola();
  });
}

function renderBussola() {
  const alvo = document.getElementById("busResultado");
  const temas = [...busSel];
  if (temas.length === 0) {
    alvo.innerHTML = `<div class="bus-empty">Escolha ao menos um tema acima para ver o ranking.</div>`;
    return;
  }

  const ranking = candidatosValidos()
    .map((c) => {
      let total = 0;
      const porTema = temas.map((t) => {
        const itens = (c.propostas && c.propostas[t]) || [];
        total += itens.length;
        return { tema: t, itens };
      });
      return { c, total, porTema };
    })
    .sort((a, b) => b.total - a.total);

  alvo.innerHTML = `<div class="bus-rank">${ranking
    .map((r, i) => {
      const props = r.porTema
        .filter((pt) => pt.itens.length)
        .map(
          (pt) => `
        <div>
          <div class="bus-prop-tema">${pt.tema}</div>
          ${pt.itens.map((p) => `<div class="bus-prop">${p}</div>`).join("")}
        </div>`
        )
        .join("");
      return `
      <article class="bus-card" style="--cor:${corDe(r.c)}">
        <div class="bus-card-top">
          <span class="bus-pos">${i + 1}</span>
          ${faceEl(r.c, "face-md")}
          <div class="bus-card-id">
            <div class="bus-card-nome">${r.c.nome}</div>
            <div class="bus-card-part">${r.c.partido || ""}</div>
          </div>
          <span class="bus-count">${r.total} propostas</span>
        </div>
        ${props ? `<div class="bus-props">${props}</div>` : ""}
      </article>`;
    })
    .join("")}</div>`;
}

carregar();

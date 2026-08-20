let DADOS = null;
let temaAtivo = "Todos";
let modo = "lista";
let ladoA = null;
let ladoB = null;

async function carregar() {
  const res = await fetch("data/candidatos.json");
  DADOS = await res.json();

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
function montarModos() {
  document.getElementById("modoLista").addEventListener("click", () => trocarModo("lista"));
  document.getElementById("modoX1").addEventListener("click", () => trocarModo("x1"));
}
function trocarModo(novo) {
  modo = novo;
  const emLista = modo === "lista";
  document.getElementById("modoLista").classList.toggle("ativo", emLista);
  document.getElementById("modoX1").classList.toggle("ativo", !emLista);
  document.getElementById("modoLista").setAttribute("aria-selected", emLista);
  document.getElementById("modoX1").setAttribute("aria-selected", !emLista);
  document.getElementById("filtros").hidden = !emLista;
  document.getElementById("lista").hidden = !emLista;
  document.getElementById("x1").hidden = emLista;
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
  else renderX1();
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

carregar();

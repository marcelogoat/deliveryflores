// home.js — vitrine da home (SCREEN 1 do redesign-board):
// barra de localização (CEP real via ViaCEP, salvo localmente), banner Entrega
// Expressa, menu de categorias, trilha por ocasião, coleção "Mais pedidos" e
// catálogo de /data/catalog.json com busca ([data-search]), ordenação
// ([data-sort]) e paginação incremental (~24 por leva via IntersectionObserver).
// Honestidade: rating só com dados reais de /data/reviews.json; "esgotado" não
// tem botão de compra; nada de prazos fabricados por CEP.
import { addItem } from "./cart.js";
import { normalizeCatalog } from "./pricing.js";
import { brl, esc, mountShell } from "./ui.js";
import { trackPageView } from "./track.js";
import { viewItemList, selectItem, searchTerm } from "./ga4-ecom.js";

const PAGE = 24; // itens renderizados por leva
const RAIL_MAX = 8; // cards na coleção "Mais pedidos"

const el = {
  catalog: document.querySelector("[data-catalog]"),
  search: document.querySelector("[data-search]"),
  sort: document.querySelector("[data-sort]"),
  cats: document.querySelector("[data-cats]"),
  occasions: document.querySelector("[data-occasions]"),
  count: document.querySelector("[data-count]"),
  sentinel: document.querySelector("[data-sentinel]"),
  rail: document.querySelector("[data-rail]"),
  railSec: document.querySelector("[data-rail-sec]"),
};

// Trilha por ocasião — curadoria editorial sobre categorias REAIS do catálogo
// (nenhum dado fabricado: cada chip só filtra produtos existentes).
const OCCASIONS = [
  { id: "Romance", label: "💘 Romance", cats: ["Rosas", "Buquês", "Tulipas"] },
  { id: "Aniversário", label: "🎂 Aniversário", cats: ["Girassóis", "Gérberas", "Arranjos", "Kits e Presentes"] },
  { id: "Gratidão", label: "🤍 Gratidão", cats: ["Orquídeas", "Lisianthus", "Cestas"] },
  { id: "Condolências", label: "🌿 Condolências", cats: ["Lírios", "Arranjos"] },
];
// Aliases usados pelo drawer de coleções (ui.js) — /?ocasiao=…
const OCCASION_ALIAS = { Namorados: "Romance", "Dia das Mães": "Gratidão" };

const STAR_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.9 6.3 6.8.6-5.1 4.5 1.5 6.7L12 17l-6 3.6 1.5-6.7L2.4 8.9l6.8-.6L12 2Z"/></svg>';
const PLUS_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
const CHECK_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

let all = [];          // catálogo completo
let reviews = {};      // /data/reviews.json → byProduct (pode ser vazio)
let bestIds = [];      // /api/bestsellers → ids por venda real (mais vendidos primeiro)
let bestExcl = new Set(); // ids a não mostrar no rail (order bump + brindes/extras)
let catOrder = [];     // categorias na ordem de aparição no catálogo
let queue = [];        // fila de render: {head,count} | {p:item}
let cursor = 0;        // próximo índice da fila a renderizar
let renderedItems = 0; // itens já renderizados (para eager/lazy)
let currentGrid = null;
// Filtro ativo da vitrine: all | {type:"cat"} | {type:"promo"} | {type:"occ"}
let view = { type: "all" };
let lastListSig = null; // assinatura da última lista enviada ao GA4 (dedupe view_item_list)

// "Buscar" da bottom-nav aponta para /#busca — ao chegar (ou clicar já na home),
// rola até o campo e foca, deixando o teclado pronto para digitar.
function focusSearchFromHash() {
  if (!/^#busca/.test(location.hash)) return;
  const s = el.search;
  if (!s) return;
  s.scrollIntoView({ behavior: "smooth", block: "center" });
  s.focus({ preventScroll: true });
}

async function init() {
  mountShell();
  trackPageView(); // conversão "Page view" (1x por sessão)
  focusSearchFromHash();
  window.addEventListener("hashchange", focusSearchFromHash);
  if (!el.catalog) return;
  bindControls();
  observeSentinel();

  const [catRes, revRes] = await Promise.allSettled([
    fetch("/data/catalog.json").then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))),
    fetch("/data/reviews.json").then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))),
  ]);
  if (catRes.status !== "fulfilled" || !Array.isArray(catRes.value)) {
    el.catalog.innerHTML = emptyHTML(
      "Não foi possível carregar o catálogo agora. Atualize a página para tentar de novo."
    );
    return;
  }
  all = normalizeCatalog(catRes.value);
  // Oculta o atalho "Promoções" quando não há produto com desconto real.
  if (!all.some(hasOff)) {
    document.querySelectorAll('[data-qcat="__promo"]').forEach((t) => { t.hidden = true; });
  }
  // Reviews são opcionais: sem arquivo/registro, nenhum card mostra estrela.
  reviews = revRes.status === "fulfilled" ? revRes.value?.byProduct || {} : {};

  catOrder = [...new Set(all.flatMap(pcats))];
  renderCats();
  renderOccasions();
  bindQuickCats();
  renderRail();
  loadBestsellers(); // assíncrono: reordena o rail por venda real ao chegar
  const fromURL = applyURLParams();
  applyView();
  if (fromURL) document.getElementById("catalogo")?.scrollIntoView();
}

/* --------------------------------------------------------------------------
   Controles: busca (debounce), ordenação, chips, tiles e quick-add
   -------------------------------------------------------------------------- */
function bindControls() {
  let t;
  let ts;
  el.search?.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(applyView, 160);
    // GA4 search — debounce ~600ms para não disparar a cada tecla; só com termo.
    clearTimeout(ts);
    ts = setTimeout(() => {
      const term = el.search.value.trim();
      if (term) searchTerm(term);
    }, 600);
  });
  el.sort?.addEventListener("change", applyView);

  // Delegação global: quick-add (vitrine + rail) e "limpar busca" do vazio.
  document.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) {
      const p = all.find((i) => i.id === Number(add.dataset.add));
      if (!p || p.sold_out || add.disabled) return;
      addItem({ id: p.id, name: p.name, price_cents: p.price_cents, image: p.image, qty: 1 });
      add.innerHTML = CHECK_SVG;
      add.classList.add("is-added");
      add.disabled = true;
      setTimeout(() => {
        add.innerHTML = PLUS_SVG;
        add.classList.remove("is-added");
        add.disabled = false;
      }, 1200);
      return;
    }
    if (e.target.closest("[data-clear-search]")) {
      if (el.search) el.search.value = "";
      if (el.sort) el.sort.value = "";
      view = { type: "all" };
      syncControls();
      applyView();
      return;
    }
    if (e.target.closest("[data-rail-all]")) {
      view = { type: "all" };
      syncControls();
      applyView();
      return;
    }

    // GA4 select_item — clique num card de produto (link p/ /produto/<slug> ou o
    // ?id= legado), tanto na vitrine quanto na coleção "Mais pedidos". Ignora o quick-add.
    const card = e.target.closest(".pitem");
    if (card && !e.target.closest("[data-add]")) {
      const link = e.target.closest('a[href*="/produto"]');
      if (link) {
        const u = new URL(link.href, location.origin);
        const qid = Number(u.searchParams.get("id"));
        let p = null;
        if (Number.isFinite(qid) && qid) p = all.find((i) => i.id === qid);
        else { const m = u.pathname.match(/^\/produto\/([^/?#]+)/); if (m) { const slug = decodeURIComponent(m[1]); p = all.find((i) => i.slug === slug); } }
        if (p) selectItem(p, "Vitrine");
      }
    }
  });
}

function renderCats() {
  if (!el.cats) return;
  const chips = ["", ...catOrder];
  el.cats.innerHTML = chips
    .map((c) => {
      const on = c === "" ? view.type === "all" : view.type === "cat" && view.cat === c;
      return `<button type="button" class="chip${on ? " is-active" : ""}" data-cat="${esc(c)}" aria-pressed="${on}">${c ? esc(c) : "Todas"}</button>`;
    })
    .join("");
  el.cats.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-cat]");
    if (!chip) return;
    const cat = chip.dataset.cat;
    view = !cat || (view.type === "cat" && view.cat === cat) ? { type: "all" } : { type: "cat", cat };
    syncControls();
    applyView();
  });
}

function renderOccasions() {
  if (!el.occasions) return;
  el.occasions.innerHTML = OCCASIONS.map(
    (o) =>
      `<button type="button" class="chip" data-occ="${esc(o.id)}" aria-pressed="false">${o.label}</button>`
  ).join("");
  el.occasions.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-occ]");
    if (!chip) return;
    const occ = chip.dataset.occ;
    view = view.type === "occ" && view.occ === occ ? { type: "all" } : { type: "occ", occ };
    syncControls();
    applyView();
    document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
  });
}

// Tiles do menu de categorias (estáticos no HTML) — "__promo" = só descontos.
function bindQuickCats() {
  document.querySelectorAll("[data-qcat]").forEach((tile) => {
    tile.addEventListener("click", () => {
      const q = tile.dataset.qcat;
      if (q === "__promo") {
        view = view.type === "promo" ? { type: "all" } : { type: "promo" };
      } else {
        view = view.type === "cat" && view.cat === q ? { type: "all" } : { type: "cat", cat: q };
      }
      syncControls();
      applyView();
      document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
    });
  });
}

// Reflete o filtro ativo em chips, ocasiões e tiles.
function syncControls() {
  el.cats?.querySelectorAll("[data-cat]").forEach((c) => {
    const on = c.dataset.cat === "" ? view.type === "all" : view.type === "cat" && view.cat === c.dataset.cat;
    c.classList.toggle("is-active", on);
    c.setAttribute("aria-pressed", String(on));
  });
  el.occasions?.querySelectorAll("[data-occ]").forEach((c) => {
    const on = view.type === "occ" && view.occ === c.dataset.occ;
    c.classList.toggle("is-active", on);
    c.setAttribute("aria-pressed", String(on));
  });
  document.querySelectorAll("[data-qcat]").forEach((tile) => {
    const on =
      (view.type === "cat" && tile.dataset.qcat === view.cat) ||
      (view.type === "promo" && tile.dataset.qcat === "__promo");
    tile.classList.toggle("is-active", on);
  });
}

// Deep links do drawer de coleções (ui.js): /?cat=… e /?ocasiao=…
function applyURLParams() {
  const sp = new URLSearchParams(location.search);
  const cat = sp.get("cat");
  const occRaw = sp.get("ocasiao");
  if (cat && catOrder.includes(cat)) {
    view = { type: "cat", cat };
    syncControls();
    return true;
  }
  if (occRaw) {
    const id = OCCASION_ALIAS[occRaw] || occRaw;
    if (OCCASIONS.some((o) => o.id === id)) {
      view = { type: "occ", occ: id };
      syncControls();
      return true;
    }
  }
  return false;
}

/* --------------------------------------------------------------------------
   Visão atual: filtra + ordena + monta a fila de render
   -------------------------------------------------------------------------- */
const norm = (s) =>
  String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const hasOff = (p) => Boolean(p.old_price_cents && p.old_price_cents > p.price_cents);

// Multi-categoria: todas as categorias do produto (a 1ª é a principal, usada no
// kicker/GA4). Produto só com o campo legado `category` se comporta como antes.
const pcats = (p) =>
  Array.isArray(p.categories) && p.categories.length ? p.categories : (p.category ? [p.category] : []);

function matchesView(p) {
  if (view.type === "cat") return pcats(p).includes(view.cat);
  if (view.type === "promo") return hasOff(p);
  if (view.type === "occ") {
    const occ = OCCASIONS.find((o) => o.id === view.occ);
    return occ ? occ.cats.some((c) => pcats(p).includes(c)) : true;
  }
  return true;
}

function viewLabel(q) {
  if (view.type === "cat") return view.cat;
  if (view.type === "promo") return "Promoções";
  if (view.type === "occ") return `Para ${view.occ}`;
  return q ? "Resultados" : "Todos os produtos";
}

function applyView() {
  const q = norm(el.search?.value.trim());
  const sort = el.sort?.value ?? "";

  let items = all.filter(matchesView);
  if (q) items = items.filter((p) => norm(p.name).includes(q) || pcats(p).some((c) => norm(c).includes(q)));

  queue = [];
  if (sort === "menor" || sort === "maior") {
    // Ordenação global por preço: lista única
    const sorted = items.slice().sort((a, b) =>
      sort === "menor" ? a.price_cents - b.price_cents : b.price_cents - a.price_cents
    );
    pushSection(viewLabel(q), sorted);
  } else if (q || view.type !== "all") {
    // Busca/filtro: lista única, esgotados por último
    const sorted = items.slice().sort((a, b) => Number(a.sold_out) - Number(b.sold_out));
    pushSection(viewLabel(q), sorted);
  } else {
    // Padrão: agrupado por categoria, esgotados por último em cada uma.
    // Multi-categoria: o produto aparece em CADA categoria dele (Rosas E Buquês).
    for (const cat of catOrder) {
      const list = items
        .filter((p) => pcats(p).includes(cat))
        .sort((a, b) => Number(a.sold_out) - Number(b.sold_out));
      pushSection(cat, list);
    }
    // Produto SEM nenhuma categoria não pode sumir da vitrine: seção final sem título
    // (mesmo comportamento de antes do multi-categoria, quando "" entrava no catOrder).
    const semCat = items
      .filter((p) => pcats(p).length === 0)
      .sort((a, b) => Number(a.sold_out) - Number(b.sold_out));
    if (semCat.length) pushSection("", semCat);
  }

  updateCount(items.length, q);

  // GA4 view_item_list — 1x por lista realmente exibida (sem spam): dedupe por
  // assinatura (view + termo) para não disparar a cada tecla do debounce de 160ms.
  // Os primeiros produtos visíveis (o helper já limita a 20). "Vitrine" como nome.
  const listSig = `${view.type}|${view.cat ?? ""}|${view.occ ?? ""}|${q}`;
  if (items.length && listSig !== lastListSig) {
    lastListSig = listSig;
    viewItemList(items, "Vitrine");
  }

  // Reinicia o render incremental
  el.catalog.innerHTML = "";
  cursor = 0;
  renderedItems = 0;
  currentGrid = null;

  if (!items.length) {
    el.catalog.innerHTML = emptyHTML(
      q
        ? `Nada encontrado para “${esc(el.search.value.trim())}”.`
        : "Nenhum produto disponível com este filtro.",
      true
    );
    if (el.sentinel) el.sentinel.hidden = true;
    return;
  }
  renderChunk();
  // Fallback raro (sem IntersectionObserver): renderiza tudo de uma vez.
  if (!hasIO) while (cursor < queue.length) renderChunk();
}

function pushSection(title, items) {
  if (!items.length) return;
  queue.push({ head: title, count: items.length });
  for (const p of items) queue.push({ p });
}

function updateCount(n, q) {
  if (!el.count) return;
  const plural = n === 1 ? "produto" : "produtos";
  if (q) el.count.textContent = `${n} ${n === 1 ? "resultado" : "resultados"} para “${el.search.value.trim()}”`;
  else if (view.type === "cat") el.count.textContent = `${n} ${plural} em ${view.cat}`;
  else if (view.type === "promo") el.count.textContent = `${n} ${plural} em promoção`;
  else if (view.type === "occ") el.count.textContent = `${n} ${n === 1 ? "sugestão" : "sugestões"} para ${view.occ}`;
  else el.count.textContent = `${n} ${plural} no catálogo`;
}

/* --------------------------------------------------------------------------
   Coleção "Mais pedidos" — ordem por VENDA REAL (/api/bestsellers, pedidos pagos),
   mais vendidos primeiro; exclui o order bump e os brindes (extras). Quando ainda
   não há dados de venda, cai na curadoria (avaliações reais → descontos reais).
   -------------------------------------------------------------------------- */
function renderRail() {
  if (!el.rail || !el.railSec) return;
  const score = (p) => Number(reviews[String(p.id)]?.total) || 0;
  const rank = new Map(bestIds.map((id, i) => [Number(id), i]));
  const picks = all
    .filter((p) => !p.sold_out && !bestExcl.has(Number(p.id)))
    .sort((a, b) => {
      const ra = rank.has(Number(a.id)) ? rank.get(Number(a.id)) : Infinity;
      const rb = rank.has(Number(b.id)) ? rank.get(Number(b.id)) : Infinity;
      if (ra !== rb) return ra - rb; // mais vendidos primeiro (ordem de venda real)
      return score(b) - score(a) || Number(hasOff(b)) - Number(hasOff(a)); // curadoria de reserva
    })
    .slice(0, RAIL_MAX);
  if (!picks.length) return;
  el.rail.innerHTML = picks.map((p) => cardHTML(p, 0, { lazy: true })).join("");
  el.railSec.hidden = false;
}

// Busca o ranking real de vendas (não bloqueia a página) e reordena o rail.
async function loadBestsellers() {
  try {
    const res = await fetch("/api/bestsellers");
    if (!res.ok) return;
    const d = await res.json();
    bestIds = Array.isArray(d.ids) ? d.ids.map(Number) : [];
    bestExcl = new Set(Array.isArray(d.exclude) ? d.exclude.map(Number) : []);
    renderRail();
  } catch { /* mantém a curadoria padrão */ }
}

/* --------------------------------------------------------------------------
   Render incremental (~24 itens por leva) com IntersectionObserver
   -------------------------------------------------------------------------- */
function renderChunk() {
  let rendered = 0;
  while (cursor < queue.length && rendered < PAGE) {
    const entry = queue[cursor++];
    if (entry.head !== undefined) {
      el.catalog.insertAdjacentHTML(
        "beforeend",
        `<section class="cat">
          <div class="cat__head">
            <h2>${esc(entry.head)}</h2>
            <span class="muted">${entry.count} ${entry.count === 1 ? "item" : "itens"}</span>
          </div>
          <div class="pgrid"></div>
        </section>`
      );
      currentGrid = el.catalog.lastElementChild.querySelector(".pgrid");
    } else if (currentGrid) {
      currentGrid.insertAdjacentHTML("beforeend", cardHTML(entry.p, renderedItems++));
      rendered++;
    }
  }
  if (el.sentinel) el.sentinel.hidden = cursor >= queue.length;
}

let hasIO = true;
function observeSentinel() {
  if (!el.sentinel || !("IntersectionObserver" in window)) {
    hasIO = false;
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && cursor < queue.length) renderChunk();
      }
    },
    { rootMargin: "600px 0px" }
  );
  io.observe(el.sentinel);
}

/* --------------------------------------------------------------------------
   Card de produto (redesign) — kicker da categoria, rating real (se houver),
   badge de desconto, preço vinho e quick-add. Esgotado: overlay, sem botão.
   -------------------------------------------------------------------------- */
function ratingHTML(p) {
  const r = reviews[String(p.id)];
  const media = Number(r?.media);
  const total = Number(r?.total);
  if (!r || !media || !total) return ""; // sem review real → sem estrela
  const mediaFmt = media.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `
    <span class="rating pitem__rate" aria-label="Avaliação ${mediaFmt} de 5 (${total} ${total === 1 ? "avaliação" : "avaliações"})">
      ${STAR_SVG}
      <span class="rating__value">${mediaFmt}</span>
      <span class="rating__count">(${total})</span>
    </span>`;
}

function cardHTML(p, index, { lazy = false } = {}) {
  const url = p.slug ? `/produto/${encodeURIComponent(p.slug)}` : `/produto.html?id=${p.id}`;
  const off = hasOff(p) ? Math.round((1 - p.price_cents / p.old_price_cents) * 100) : 0;
  const tag = !p.sold_out && off > 0 ? `<span class="tag">-${off}%</span>` : "";
  const sold = p.sold_out ? `<span class="pitem__sold"><span>Esgotado</span></span>` : "";
  const oldPrice = !p.sold_out && off > 0 ? `<s class="price--old">${brl(p.old_price_cents)}</s>` : "";
  const buy = p.sold_out
    ? `<span class="pitem__soldnote">Indisponível</span>`
    : `<button type="button" class="qadd" data-add="${p.id}" aria-label="Adicionar ${esc(p.name)} à sacola">${PLUS_SVG}</button>`;
  // Primeiras imagens da página carregam imediatamente; demais são lazy.
  const loading = !lazy && index < 4 ? "eager" : "lazy";
  return `
  <article class="pitem${p.sold_out ? " pitem--soldout" : ""}" style="animation-delay:${Math.min(index % PAGE, 11) * 35}ms">
    <a class="pitem__media" href="${url}" tabindex="-1" aria-hidden="true">
      ${tag}
      <img src="${esc(p.image)}" alt="${esc(p.name)}" width="600" height="750" loading="${loading}" decoding="async">
      ${sold}
    </a>
    <div class="pitem__body">
      <span class="pitem__kicker">${esc(p.category)}</span>
      <h3 class="pitem__name"><a href="${url}">${esc(p.name)}</a></h3>
      ${ratingHTML(p)}
      <div class="pitem__buy">
        <span class="pitem__prices">
          <span class="price">${brl(p.price_cents)}</span>
          ${oldPrice}
        </span>
        ${buy}
      </div>
    </div>
  </article>`;
}

function emptyHTML(message, withClear = false) {
  return `
  <div class="empty">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 13c3 0 5-2 5-5 0-1.5-.8-3-2-4-.5 1.2-1.6 2-3 2s-2.5-.8-3-2c-1.2 1-2 2.5-2 4 0 3 2 5 5 5Z"/><path d="M12 13v8"/><path d="M12 18c-2.5 0-4.5-1.5-5-4 2.5 0 4.5 1.5 5 4Z"/></svg>
    <p>${message}</p>
    ${withClear ? `<p style="margin-top:14px"><button type="button" class="btn btn--soft btn--sm" data-clear-search>Limpar filtros</button></p>` : ""}
  </div>`;
}

// Dispara o carregamento do catálogo (consts/handlers acima já inicializados).
init();

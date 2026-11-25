/* Luigi's Pixel Pizzeria — JavaScript puro, sem build.
   Ordem: dados -> API -> cálculo -> renderização -> eventos. */

// ---------- 1. Dados (iguais ao script Python; fallback se a API estiver offline) ----------
let menu = {
  precosSabor: {
    "Mussarela": { P: 30, M: 40, G: 50 }, "Calabresa": { P: 32, M: 42, G: 52 },
    "Frango com catupiry": { P: 35, M: 45, G: 56 }, "Portuguesa": { P: 36, M: 47, G: 58 },
    "Quatro queijos": { P: 38, M: 50, G: 62 }, "Camarão": { P: 45, M: 58, G: 72 },
  },
  precoBorda: { P: 6, M: 8, G: 10 },
  bebidas: {
    "1": { nome: "Água 500 ml", preco: 4 }, "2": { nome: "Refrigerante lata", preco: 6 },
    "3": { nome: "Suco natural", preco: 8 }, "4": { nome: "Refrigerante 2 L", preco: 14 },
  },
  frete: 8, freteGratisAcima: 80,
};
const TAMANHOS = { P: "Pequena", M: "Média", G: "Grande" };
const ESCALA = { P: 0.78, M: 0.9, G: 1 };
const MAX_SABORES = 2;
const VISUAL = { // [cobertura, recheio]
  "Mussarela": ["#F3DE9B", "#FFF6D6"], "Calabresa": ["#EBC27A", "#C0392B"],
  "Frango com catupiry": ["#F2D9A0", "#FFFDF4"], "Portuguesa": ["#E9C885", "#4E9A4F"],
  "Quatro queijos": ["#F6E3A4", "#E2A93B"], "Camarão": ["#F0C8A0", "#D9694A"],
};

// ---------- 2. API (rotas do server.py) ----------
async function http(url, opcoes) {
  const r = await fetch(url, { headers: { "Content-Type": "application/json" }, ...opcoes });
  if (!r.ok) throw new Error("Erro " + r.status);
  return r.json();
}
const buscarCardapio = () => http("/api/cardapio");               // GET  -> { precosSabor, precoBorda, bebidas, frete, freteGratisAcima }
const enviarPedido = (p) => http("/api/pedido", { method: "POST", body: JSON.stringify(p) }); // POST -> { numero, total }

// ---------- 3. Estado e cálculo ----------
const pedido = { tamanho: "G", sabores: [], borda: false, bebidaId: "" };
const brl = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Regras do Python: meio a meio = sabor mais caro; frete grátis só se subtotal > limite.
function calcular() {
  const { tamanho: t, sabores, borda, bebidaId } = pedido;
  const pizza = sabores.length ? Math.max(...sabores.map((s) => menu.precosSabor[s][t])) : 0;
  const bordaV = borda ? menu.precoBorda[t] : 0;
  const bebidaV = bebidaId ? menu.bebidas[bebidaId].preco : 0;
  const subtotal = pizza + bordaV + bebidaV;
  const frete = subtotal > menu.freteGratisAcima ? 0 : menu.frete;
  return { pizza, bordaV, bebidaV, subtotal, frete, total: subtotal + frete,
           falta: Math.max(0, menu.freteGratisAcima - subtotal) };
}

// ---------- 4. Renderização ----------
const $ = (id) => document.getElementById(id);
let ultimo = null; // cartão clicado: recebe a animação "bate"

// Pizza em SVG (duas metades com 2 sabores; anel dourado com borda recheada).
function pizzaSVG(sabores, borda, uid) {
  const pts = [[60,70],[95,55],[135,68],[150,105],[125,140],[85,145],[55,115],[100,100],[75,95],[120,95]];
  const dois = sabores.length === 2;
  const camadas = (sabores.length ? sabores : [null]).map((n, i) => {
    const [base, dot] = n ? VISUAL[n] : ["#EADCC3", "transparent"];
    return `<g ${dois ? `clip-path="url(#${uid}${i})"` : ""}><circle cx="100" cy="100" r="78" fill="${base}"/>
      ${pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="${dot}"/>`).join("")}</g>`;
  }).join("");
  return `<svg viewBox="0 0 200 200"><defs><clipPath id="${uid}0"><rect width="100" height="200"/></clipPath>
    <clipPath id="${uid}1"><rect x="100" width="100" height="200"/></clipPath></defs>
    <circle cx="100" cy="100" r="96" fill="#D9A55F" stroke="#2B3A55" stroke-width="6"/>
    <circle cx="100" cy="100" r="84" fill="#C8472F"/>${camadas}
    ${dois ? '<line x1="100" y1="18" x2="100" y2="182" stroke="#2B3A55" stroke-width="3" stroke-dasharray="6 5"/>' : ""}
    ${borda ? '<circle cx="100" cy="100" r="90" fill="none" stroke="#F0C94A" stroke-width="8" stroke-dasharray="3 7"/>' : ""}</svg>`;
}

const cls = (id, on) => `${on ? " on" : ""}${id === ultimo ? " bate" : ""}`;

function renderOpcoes() {
  const t = pedido.tamanho;
  $("tamanhos").innerHTML = Object.entries(TAMANHOS).map(([k, nome]) =>
    `<button type="button" class="card${cls("t" + k, t === k)}" data-id="t:${k}" aria-pressed="${t === k}">
      <span class="selo">${k}</span><span>${nome}</span></button>`).join("");

  const cheio = pedido.sabores.length >= MAX_SABORES;
  $("sabores").innerHTML = Object.keys(menu.precosSabor).map((s, i) => {
    const on = pedido.sabores.includes(s);
    return `<button type="button" class="sabor${cls("s" + s, on)}" data-id="s:${s}" aria-pressed="${on}" ${cheio && !on ? "disabled" : ""}>
      <i>0${i + 1}</i><span>${s}</span><em>${brl(menu.precosSabor[s][t])}</em><b class="caixa">${on ? "✓" : "+"}</b></button>`;
  }).join("");
  $("contador").textContent = `${pedido.sabores.length} / ${MAX_SABORES}`;

  $("borda").innerHTML = `<button type="button" class="borda${cls("b", pedido.borda)}" data-id="b" aria-pressed="${pedido.borda}">
    <b class="caixa">${pedido.borda ? "✓" : ""}</b>
    <div>Borda recheada<small>Porque a melhor parte também merece recheio.</small></div><em>+ ${brl(menu.precoBorda[t])}</em></button>`;

  $("bebida").innerHTML = `<option value="">Sem bebida</option>` + Object.entries(menu.bebidas).map(([id, b]) =>
    `<option value="${id}" ${pedido.bebidaId === id ? "selected" : ""}>${b.nome} — ${brl(b.preco)}</option>`).join("");
  ultimo = null;
}

// Rolagem numérica: do valor anterior ao novo em ~450 ms.
function animarPreco(el, novo) {
  const de = el._v ?? novo; el._v = novo; cancelAnimationFrame(el._raf);
  if (de === novo || matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = brl(novo); return; }
  const ini = performance.now();
  const passo = (agora) => {
    const k = Math.min(1, (agora - ini) / 450);
    el.textContent = brl(de + (novo - de) * (1 - Math.pow(1 - k, 4)));
    if (k < 1) el._raf = requestAnimationFrame(passo);
  };
  el._raf = requestAnimationFrame(passo);
}

function renderTicket() {
  const c = calcular(), p = pedido;
  $("l-pizza").innerHTML = `Pizza ${p.tamanho}<small>${p.sabores.join(" + ") || "Nenhum sabor ainda"}</small>`;
  $("l-borda").hidden = !p.borda; $("l-bebida").hidden = !p.bebidaId;
  if (p.bebidaId) $("n-bebida").textContent = menu.bebidas[p.bebidaId].nome;
  animarPreco($("v-pizza"), c.pizza); animarPreco($("v-borda"), c.bordaV); animarPreco($("v-bebida"), c.bebidaV);
  animarPreco($("v-subtotal"), c.subtotal); animarPreco($("v-total"), c.total);
  if (c.frete === 0) { $("v-frete")._v = 0; $("v-frete").textContent = "Grátis"; } else animarPreco($("v-frete"), c.frete);
  $("barra").style.transform = `scaleX(${Math.min(1, c.subtotal / menu.freteGratisAcima)})`;
  $("frete-msg").textContent = c.frete === 0 ? "Frete grátis conquistado!"
    : `Frete grátis em pedidos acima de R$ ${menu.freteGratisAcima}. Falta mais de R$ ${c.falta.toFixed(2).replace(".", ",")}.`;
  document.querySelectorAll(".limite").forEach((e) => (e.textContent = menu.freteGratisAcima));
  $("pizza-mini").innerHTML = pizzaSVG(p.sabores, p.borda, "mp");
  $("pizza-mini").style.transform = `scale(${ESCALA[p.tamanho]})`;
  $("enviar").disabled = p.sabores.length === 0;
  $("enviar").textContent = p.sabores.length ? "Finalizar missão →" : "Escolha ao menos 1 sabor";
}

const renderTudo = () => { renderOpcoes(); renderTicket(); };

// ---------- 5. Eventos ----------
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-id]");
  if (!b) return;
  const [tipo, valor] = b.dataset.id.split(":");
  ultimo = tipo + (valor ?? "");
  if (tipo === "t") pedido.tamanho = valor;
  else if (tipo === "b") pedido.borda = !pedido.borda;
  else if (tipo === "s") {
    const i = pedido.sabores.indexOf(valor);
    if (i >= 0) pedido.sabores.splice(i, 1);
    else if (pedido.sabores.length < MAX_SABORES) pedido.sabores.push(valor);
  }
  renderTudo();
});

$("bebida").addEventListener("change", (e) => { pedido.bebidaId = e.target.value; renderTicket(); });

$("enviar").addEventListener("click", async () => {
  const btn = $("enviar");
  btn.disabled = true; btn.textContent = "Enviando..."; $("erro").hidden = true;
  try {
    const r = await enviarPedido({ ...pedido, bebidaId: pedido.bebidaId || null });
    $("sucesso-msg").textContent = `Pedido ${r.numero ? "nº " + r.numero + " " : ""}enviado. Já estamos assando.`;
    $("ticket").hidden = true; $("sucesso").hidden = false;
    try { localStorage.setItem("luigi_ultimo", r.numero); } catch {}
    $("num-pedido").value = r.numero; mostrarPedido(r.numero);
  } catch {
    $("erro").textContent = "Não conseguimos enviar o pedido. Confira a conexão e tente de novo.";
    $("erro").hidden = false; renderTicket();
  }
});

// ---------- 6. Acompanhar pedido ----------
const ETAPAS = ["Recebido", "No forno", "Saiu para entrega", "Entregue"];
const buscarPedido = (n) => http("/api/pedido/" + n); // GET -> pedido + bebida + status (0 a 3)
let timer = null;

// Monta o recibo: etapas do andamento + itens + total.
function reciboHTML(p) {
  const fim = p.status === ETAPAS.length - 1;   // true quando o pedido já foi entregue
  const etapas = ETAPAS.map((e, i) => {
    const feito = fim || i < p.status;
    const classe = feito ? "feito" : i === p.status ? "atual" : "";
    return `<li class="${classe}"><b>${feito ? "✓" : i + 1}</b>${e}</li>`;
}).join("");

  return `<div class="ticket__cab"><span>Pedido nº ${p.numero}</span><span>${ETAPAS[p.status]}</span></div>
    <ol class="etapas">${etapas}</ol>
    <dl class="linhas">
      <div><dt>Pizza ${p.tamanho}<small>${p.sabores.join(" + ")}</small></dt><dd>${brl(p.valorPizza)}</dd></div>
      ${p.borda ? `<div><dt>Borda recheada</dt><dd>${brl(p.valorBorda)}</dd></div>` : ""}
      ${p.bebida ? `<div><dt>${p.bebida}</dt><dd>${brl(p.valorBebida)}</dd></div>` : ""}
      <div class="tracejado"><dt>Subtotal</dt><dd>${brl(p.subtotal)}</dd></div>
      <div><dt>Entrega</dt><dd>${p.frete ? brl(p.frete) : "Grátis"}</dd></div>
    </dl>
    <div class="total"><span>Total</span><strong>${brl(p.total)}</strong></div>`;
}

// Busca o pedido e atualiza a cada 5 s até a entrega.
async function mostrarPedido(numero) {
  clearInterval(timer);
  const atualizar = async () => {
    const p = await buscarPedido(numero);
    $("recibo").innerHTML = `<div class="recibo">${reciboHTML(p)}</div>`;
    return p;
  };
  try {
    $("busca-erro").hidden = true;
    const p = await atualizar();
    if (p.status < ETAPAS.length - 1) {
      timer = setInterval(async () => {
        try {
          const novo = await atualizar();
          if (novo.status >= ETAPAS.length - 1) clearInterval(timer);
        } catch {}
      }, 5000);
    }
  } catch {
    $("recibo").innerHTML = "";
    $("busca-erro").textContent = `Não achamos o pedido nº ${numero}. Confira o número e tente de novo.`;
    $("busca-erro").hidden = false;
  }
}

$("busca").addEventListener("submit", (e) => { e.preventDefault(); mostrarPedido($("num-pedido").value); });

// ---------- 7. Início ----------
$("pizza-hero").innerHTML = pizzaSVG(["Calabresa"], true, "hp"); // pizza decorativa da cena
renderTudo();
buscarCardapio().then((m) => { menu = m; renderTudo(); }).catch(() => {}); // sem API, usa o cardápio local

// Se o cliente já fez um pedido neste navegador, mostra o último automaticamente.
try { const u = localStorage.getItem("luigi_ultimo"); if (u) { $("num-pedido").value = u; mostrarPedido(u); } } catch {}

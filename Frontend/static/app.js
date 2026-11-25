/* Luigi's Pixel Pizzeria — JavaScript puro, sem build.
   Ordem: dados -> API -> cálculo -> renderização -> eventos. */

// ---------- 1. Dados (iguais ao script Python; fallback se a API estiver offline) ----------
let menu = null;

const TAMANHOS = { P: "Pequena", M: "Média", G: "Grande" };
const ESCALA = { P: 0.78, M: 0.9, G: 1 };
const MAX_SABORES = 2;
const VISUAL = { // [cobertura, recheio]
  "Mussarela": ["#F3DE9B", "#FFF6D6"], "Calabresa": ["#EBC27A", "#C0392B"],
  "Frango com catupiry": ["#F2D9A0", "#FFFDF4"], "Portuguesa": ["#E9C885", "#4E9A4F"],
  "Quatro queijos": ["#F6E3A4", "#E2A93B"], "Camarão": ["#F0C8A0", "#D9694A"],
};

// ---------- 2. API (rotas do server.py) ----------
class ErroApi extends Error {
  constructor(status, mensagem) { super(mensagem); this.status = status; } // status 0 = sem conexão
}

async function http(url, opcoes) {
  let r;
  try {
    r = await fetch(url, { headers: { "Content-Type": "application/json" }, ...opcoes });
  } catch {
    throw new ErroApi(0, "Sem conexão com o servidor");
  }
  const corpo = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErroApi(r.status, corpo.erro || "Erro " + r.status);
  return corpo;
}

function mensagemDeErro(e) {
  if (e.status === 400) return e.message; // o servidor explicou o que está errado
  if (e.status === 0) return "Sem conexão com o servidor. Confira se ele está rodando e tente de novo.";
  return "Algo deu errado do nosso lado. Tente de novo em instantes.";
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
  if (!b || !menu) return;
  const id = b.dataset.id;
  const [tipo, valor] = id.split(":");
  ultimo = tipo + (valor ?? "");
  if (tipo === "t") pedido.tamanho = valor;
  else if (tipo === "b") pedido.borda = !pedido.borda;
  else if (tipo === "s") {
    const i = pedido.sabores.indexOf(valor);
    if (i >= 0) pedido.sabores.splice(i, 1);
    else if (pedido.sabores.length < MAX_SABORES) pedido.sabores.push(valor);
  }
  renderTudo();
  const novo = document.querySelector(`[data-id="${id}"]`);
  if (novo && !novo.disabled) novo.focus();
});

$("bebida").addEventListener("change", (e) => { pedido.bebidaId = e.target.value; renderTicket(); });

// Dados do cliente (campos fixos no HTML: o renderTudo não mexe neles).
const lerCliente = () => ({
  nome: $("nome").value.trim(), telefone: $("telefone").value.trim(),
  endereco: $("endereco").value.trim(), pagamento: $("pagamento").value, obs: $("obs").value.trim(),
});
function primeiroErro(c) { // validação rápida para o usuário; quem decide mesmo é o servidor
  if (c.nome.length < 2) return { campo: "nome", msg: "Informe seu nome." };
  if (![10, 11].includes(c.telefone.replace(/\D/g, "").length)) return { campo: "telefone", msg: "Informe um telefone válido, com DDD." };
  if (c.endereco.length < 5) return { campo: "endereco", msg: "Informe o endereço de entrega." };
  return null;
}
const mostrarErro = (msg) => { $("erro").textContent = msg; $("erro").hidden = false; };

$("enviar").addEventListener("click", async () => {
  const btn = $("enviar");
  const cliente = lerCliente(), falta = primeiroErro(cliente);
  if (falta) { mostrarErro(falta.msg); $(falta.campo).focus(); return; }
  btn.disabled = true; btn.textContent = "Enviando..."; $("erro").hidden = true;
  try {
    const r = await enviarPedido({ ...pedido, bebidaId: pedido.bebidaId || null, ...cliente });
    $("sucesso-msg").textContent = `Pedido ${r.numero ? "nº " + r.numero + " " : ""}enviado. Já estamos assando.`;
    $("ticket").hidden = true; $("sucesso").hidden = false;
    try { localStorage.setItem("luigi_ultimo", r.numero); } catch {}
    $("num-pedido").value = r.numero; mostrarPedido(r.numero);
  } catch (e) {
    mostrarErro(mensagemDeErro(e)); renderTicket();
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
const preencherPagamentos = () =>
  ($("pagamento").innerHTML = menu.pagamentos.map((p) => `<option>${p}</option>`).join(""));

$("pizza-hero").innerHTML = pizzaSVG(["Calabresa"], true, "hp"); // pizza decorativa da cena
$("enviar").disabled = true;
buscarCardapio()
  .then((m) => { menu = m; preencherPagamentos(); renderTudo(); })
  .catch(() => mostrarErro("Não conseguimos carregar o cardápio. Confira se o servidor está rodando e atualize a página."));

// Se o cliente já fez um pedido neste navegador, mostra o último automaticamente.
try { const u = localStorage.getItem("luigi_ultimo"); if (u) { $("num-pedido").value = u; mostrarPedido(u, { silencioso: true }); } } catch {}

# Servidor da Pizzaria do Luigi: entrega o site (pasta static/) e a API.
# Rodar:  pip install flask   e depois   python server.py
import json, os, time
from flask import Flask, jsonify, request

app = Flask(__name__, static_folder="static", static_url_path="")

# ---------- Dados ----------
precos_sabor = {
    "Mussarela": {"P": 30, "M": 40, "G": 50},
    "Calabresa": {"P": 32, "M": 42, "G": 52},
    "Frango com catupiry": {"P": 35, "M": 45, "G": 56},
    "Portuguesa": {"P": 36, "M": 47, "G": 58},
    "Quatro queijos": {"P": 38, "M": 50, "G": 62},
    "Camarão": {"P": 45, "M": 58, "G": 72},
}
preco_borda = {"P": 6, "M": 8, "G": 10} # preço com a borda (para cada tamanho)
nome_bebida = {"1": "Água 500 ml", "2": "Refrigerante lata", "3": "Suco natural", "4": "Refrigerante 2 L"}
preco_bebida = {"Água 500 ml": 4, "Refrigerante lata": 6, "Suco natural": 8, "Refrigerante 2 L": 14}
frete = 8
frete_gratis_acima = 80
ARQUIVO = "pedidos.json"  # os pedidos ficam salvos aqui


def calcular(tamanho, sabores, borda, bebida_id):
    """Mesma lógica do script: meio a meio cobra o mais caro; frete grátis se subtotal > 80."""
    pizza = max(precos_sabor[s][tamanho] for s in sabores)
    v_borda = preco_borda[tamanho] if borda else 0
    v_bebida = preco_bebida[nome_bebida[bebida_id]] if bebida_id else 0
    subtotal = pizza + v_borda + v_bebida
    v_frete = 0 if subtotal > frete_gratis_acima else frete
    return {"valorPizza": pizza, "valorBorda": v_borda, "valorBebida": v_bebida,
            "subtotal": subtotal, "frete": v_frete, "total": subtotal + v_frete}


def ler_pedidos():
    if not os.path.exists(ARQUIVO):
        return []
    with open(ARQUIVO, encoding="utf-8") as f:
        return json.load(f)


def status_do(pedido):
    """Andamento simulado pelo tempo (para demonstração):
    0 Recebido, 1 No forno, 2 Saiu para entrega, 3 Entregue."""
    seg = time.time() - pedido["criado"]
    return 0 if seg < 30 else 1 if seg < 90 else 2 if seg < 150 else 3


@app.get("/")
def home():
    return app.send_static_file("index.html")


@app.get("/api/cardapio")
def cardapio():
    return jsonify(
        precosSabor=precos_sabor,
        precoBorda=preco_borda,
        bebidas={k: {"nome": n, "preco": preco_bebida[n]} for k, n in nome_bebida.items()},
        frete=frete,
        freteGratisAcima=frete_gratis_acima,
    )


@app.post("/api/pedido")
def pedido():
    d = request.get_json(silent=True) or {}
    tamanho, sabores = d.get("tamanho"), d.get("sabores") or []
    bebida_id = d.get("bebidaId")
    # Validação: o servidor não confia no navegador
    if (tamanho not in preco_borda or not 1 <= len(sabores) <= 2
            or any(s not in precos_sabor for s in sabores)
            or (bebida_id is not None and bebida_id not in nome_bebida)):
        return jsonify(erro="Pedido inválido"), 400

    valores = calcular(tamanho, sabores, bool(d.get("borda")), bebida_id)

    pedidos = ler_pedidos()
    numero = len(pedidos) + 1
    pedidos.append({"numero": numero, "criado": time.time(), "tamanho": tamanho, "sabores": sabores,
                    "borda": bool(d.get("borda")), "bebidaId": bebida_id, **valores})
    with open(ARQUIVO, "w", encoding="utf-8") as f:
        json.dump(pedidos, f, ensure_ascii=False, indent=2)
    return jsonify(numero=numero, total=valores["total"])


@app.get("/api/pedido/<int:numero>")
def ver_pedido(numero):
    """Devolve um pedido salvo, com o status atual, para o cliente acompanhar."""
    for p in ler_pedidos():
        if p["numero"] == numero:
            bebida = nome_bebida.get(p["bebidaId"]) if p["bebidaId"] else None
            return jsonify({**p, "bebida": bebida, "status": status_do(p)})
    return jsonify(erro="Pedido não encontrado"), 404


if __name__ == "__main__":
    app.run(debug=True, port=5000)

# Servidor da Pizzaria do Luigi: entrega o site (pasta static/) e a API.
# Rodar:  pip install -r requirements.txt   e depois   python server.py
import json, os, re, threading, time
from flask import Flask, jsonify, request
from cardapio import (precos_sabor, preco_borda, bebidas, pagamentos,
                      frete, frete_gratis_acima, calcular)

app = Flask(__name__, static_folder="../Frontend/static", static_url_path="")

ARQUIVO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pedidos.json") # os pedidos ficam salvos aqui
trava = threading.Lock()  # impede dois pedidos de gravarem ao mesmo tempo
PRIVADOS = {"nome", "telefone", "endereco", "obs", "criado"}   # nunca saem pela consulta pública


def ler_pedidos():
    try:
        with open(ARQUIVO, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):   # sem arquivo ou arquivo vazio/corrompido
        return []


def salvar_pedidos(pedidos):
    """Grava num arquivo temporário e troca: se der erro no meio, o original não se perde."""
    temporario = ARQUIVO + ".tmp"
    with open(temporario, "w", encoding="utf-8") as f:
        json.dump(pedidos, f, ensure_ascii=False, indent=2)
    os.replace(temporario, ARQUIVO)


def status_do(pedido):
    """Andamento simulado pelo tempo (demonstração):
    0 Recebido, 1 No forno, 2 Saiu para entrega, 3 Entregue."""
    seg = time.time() - pedido["criado"]
    return 0 if seg < 30 else 1 if seg < 90 else 2 if seg < 150 else 3


def validar(d):
    """Confere o pedido inteiro. Devolve (dados_limpos, None) ou (None, mensagem_de_erro).
    O servidor não confia no navegador: confere tipo E conteúdo de cada campo."""
    if not isinstance(d, dict):
        return None, "Pedido inválido"
    tamanho, sabores = d.get("tamanho"), d.get("sabores")
    bebida_id, borda = d.get("bebidaId"), d.get("borda")

    if not isinstance(tamanho, str) or tamanho not in preco_borda:
        return None, "Escolha um tamanho válido"
    if (not isinstance(sabores, list) or not 1 <= len(sabores) <= 2
            or not all(isinstance(s, str) and s in precos_sabor for s in sabores)
            or len(set(sabores)) != len(sabores)):
        return None, "Escolha de 1 a 2 sabores válidos"
    if not isinstance(borda, bool):
        return None, "Pedido inválido"
    if bebida_id is not None and (not isinstance(bebida_id, str) or bebida_id not in bebidas):
        return None, "Bebida inválida"

    # ----- dados do cliente -----
    nome, telefone, endereco = d.get("nome"), d.get("telefone"), d.get("endereco")
    pagamento, obs = d.get("pagamento"), d.get("obs") or ""
    if not isinstance(nome, str) or not 2 <= len(nome.strip()) <= 60:
        return None, "Informe seu nome"
    if not isinstance(telefone, str) or len(re.sub(r"\D", "", telefone)) not in (10, 11):
        return None, "Informe um telefone válido, com DDD"
    if not isinstance(endereco, str) or not 5 <= len(endereco.strip()) <= 120:
        return None, "Informe o endereço de entrega"
    if pagamento not in pagamentos:
        return None, "Escolha a forma de pagamento"
    if not isinstance(obs, str) or len(obs) > 200:
        return None, "Observação muito longa (máximo 200 caracteres)"

    return {"tamanho": tamanho, "sabores": sabores, "borda": borda, "bebidaId": bebida_id,
            "nome": nome.strip(), "telefone": telefone.strip(), "endereco": endereco.strip(),
            "pagamento": pagamento, "obs": obs.strip()}, None


@app.get("/")
def home():
    return app.send_static_file("index.html")


@app.get("/api/cardapio")
def cardapio():
    return jsonify(precosSabor=precos_sabor, precoBorda=preco_borda, bebidas=bebidas,
                   pagamentos=list(pagamentos), frete=frete, freteGratisAcima=frete_gratis_acima)


@app.post("/api/pedido")
def pedido():
    dados, erro = validar(request.get_json(silent=True))
    if erro:
        return jsonify(erro=erro), 400

    valores = calcular(dados["tamanho"], dados["sabores"], dados["borda"], dados["bebidaId"])

    with trava:                               # ler -> numerar -> gravar, sem ninguém no meio
        pedidos = ler_pedidos()
        numero = max((p["numero"] for p in pedidos), default=0) + 1
        pedidos.append({"numero": numero, "criado": time.time(), **dados, **valores})
        salvar_pedidos(pedidos)
    return jsonify(numero=numero, total=valores["total"])


@app.get("/api/pedido/<int:numero>")
def ver_pedido(numero):
    """Devolve o pedido com o status atual, SEM os dados pessoais do cliente."""
    for p in ler_pedidos():
        if p["numero"] == numero:
            publico = {k: v for k, v in p.items() if k not in PRIVADOS}
            bebida = bebidas[p["bebidaId"]]["nome"] if p["bebidaId"] else None
            return jsonify({**publico, "bebida": bebida, "status": status_do(p)})
    return jsonify(erro="Pedido não encontrado"), 404


if __name__ == "__main__":
    app.run(debug=True, port=5000)

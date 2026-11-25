# Cardápio e regras de preço: ÚNICA fonte de verdade.
# É importado pelo servidor (server.py) e pela versão de terminal.

precos_sabor = {
    "Mussarela": {"P": 30, "M": 40, "G": 50},
    "Calabresa": {"P": 32, "M": 42, "G": 52},
    "Frango com catupiry": {"P": 35, "M": 45, "G": 56},
    "Portuguesa": {"P": 36, "M": 47, "G": 58},
    "Quatro queijos": {"P": 38, "M": 50, "G": 62},
    "Camarão": {"P": 45, "M": 58, "G": 72},
}
preco_borda = {"P": 6, "M": 8, "G": 10}  # preço da borda por tamanho
bebidas = {
    "1": {"nome": "Água 500 ml", "preco": 4},
    "2": {"nome": "Refrigerante lata", "preco": 6},
    "3": {"nome": "Suco natural", "preco": 8},
    "4": {"nome": "Refrigerante 2 L", "preco": 14},
}
pagamentos = ("Pix", "Cartão na entrega", "Dinheiro")
frete = 8
frete_gratis_acima = 80


def calcular(tamanho, sabores, borda, bebida_id):
    """Meio a meio cobra o sabor mais caro; frete grátis se subtotal > limite."""
    pizza = max(precos_sabor[s][tamanho] for s in sabores)
    v_borda = preco_borda[tamanho] if borda else 0
    v_bebida = bebidas[bebida_id]["preco"] if bebida_id else 0
    subtotal = pizza + v_borda + v_bebida
    v_frete = 0 if subtotal > frete_gratis_acima else frete
    return {"valorPizza": pizza, "valorBorda": v_borda, "valorBebida": v_bebida,
            "subtotal": subtotal, "frete": v_frete, "total": subtotal + v_frete}

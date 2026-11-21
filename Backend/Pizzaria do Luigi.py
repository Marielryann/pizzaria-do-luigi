# Pizzaria - monte sua pizza (versão terminal)
# O site HTML/CSS/JS usa a API em server.py

# ---------- Dicionários de preços ----------
precos_sabor = {
    "Mussarela": {"P": 30, "M": 40, "G": 50},
    "Calabresa": {"P": 32, "M": 42, "G": 52},
    "Frango com catupiry": {"P": 35, "M": 45, "G": 56},
    "Portuguesa": {"P": 36, "M": 47, "G": 58},
    "Quatro queijos": {"P": 38, "M": 50, "G": 62},
    "Camarão": {"P": 45, "M": 58, "G": 72},
}
preco_borda = {"P": 6, "M": 8, "G": 10}  # preço da borda por tamanho

nome_bebida = {"1": "Água 500 ml", "2": "Refrigerante lata", "3": "Suco natural", "4": "Refrigerante 2 L"}
preco_bebida = {"Água 500 ml": 4, "Refrigerante lata": 6, "Suco natural": 8, "Refrigerante 2 L": 14}

frete = 8
frete_gratis_acima = 80

# ---------- Tamanho ----------
tamanho = input("Tamanho (P, M ou G): ").upper()

if tamanho in preco_borda:
    # ---------- Sabores (como checkboxes: s/n para cada um, máximo 2) ----------
    escolhidos = []
    for sabor in precos_sabor:
        if len(escolhidos) == 2:
            print("Limite de 2 sabores atingido.")
            break
        resp = input(f"Quer {sabor}? (s/n): ").lower()
        if resp == "s":
            escolhidos.append(sabor)

    if len(escolhidos) == 0:
        print("Pedido inválido")
    else:
        # meio a meio cobra o sabor mais caro
        precos_escolhidos = []
        for sabor in escolhidos:
            precos_escolhidos.append(precos_sabor[sabor][tamanho])
        valor_pizza = max(precos_escolhidos)

        # ---------- Borda ----------
        valor_borda = 0
        resp = input("Borda recheada? (s/n): ").lower()
        if resp == "s":
            valor_borda = preco_borda[tamanho]

        # ---------- Bebida ----------
        valor_bebida = 0
        bebida = "Sem bebida"
        print("Bebidas:")
        for codigo in nome_bebida:
            nome = nome_bebida[codigo]
            print(f"  {codigo} - {nome}: R$ {preco_bebida[nome]:.2f}")
        codigo = input("Número da bebida (ou Enter para nenhuma): ")
        if codigo in nome_bebida:
            bebida = nome_bebida[codigo]
            valor_bebida = preco_bebida[bebida]

        # ---------- Cálculo ----------
        subtotal = valor_pizza + valor_borda + valor_bebida
        if subtotal > frete_gratis_acima:
            valor_frete = 0
        else:
            valor_frete = frete
        total = subtotal + valor_frete

        # ---------- Resumo do pedido ----------
        print()
        print("===== RESUMO DO PEDIDO =====")
        print(f"Pizza tamanho {tamanho}: {' + '.join(escolhidos)}")
        if len(escolhidos) == 2:
            print("(meio a meio: vale o preço do sabor mais caro)")
        print(f"Pizza:  R$ {valor_pizza:.2f}")
        if valor_borda > 0:
            print(f"Borda recheada: R$ {valor_borda:.2f}")
        if valor_bebida > 0:
            print(f"{bebida}: R$ {valor_bebida:.2f}")
        print(f"Subtotal: R$ {subtotal:.2f}")
        if valor_frete == 0:
            print("Frete: Grátis")
        else:
            print(f"Frete: R$ {valor_frete:.2f}")
        print(f"Total do pedido: R$ {total:.2f}")
else:
    print("Pedido inválido")

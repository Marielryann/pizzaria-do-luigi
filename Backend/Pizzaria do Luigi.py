# Pizzaria - monte sua pizza (versão terminal)
# Usa o mesmo cardápio e as mesmas regras de preço do site (cardapio.py).
import os, sys
from cardapio import precos_sabor, preco_borda, bebidas, calcular

# ---------- Tamanho ----------
tamanho = input("Tamanho (P, M ou G): ").strip().upper()

if tamanho in preco_borda:
    # ---------- Sabores (como checkboxes: s/n para cada um, máximo 2) ----------
    escolhidos = []
    for sabor in precos_sabor:
        if len(escolhidos) == 2:
            print("Limite de 2 sabores atingido.")
            break
        resp = input(f"Quer {sabor}? (s/n): ").strip().lower()
        if resp == "s":
            escolhidos.append(sabor)

    if len(escolhidos) == 0:
        print("Pedido inválido")
    else:
        # ---------- Borda ----------
        borda = input("Borda recheada? (s/n): ").strip().lower() == "s"

        # ---------- Bebida ----------
        print("Bebidas:")
        for codigo, b in bebidas.items():
            print(f"  {codigo} - {b['nome']}: R$ {b['preco']:.2f}")
        codigo = input("Número da bebida (ou Enter para nenhuma): ").strip()
        bebida_id = codigo if codigo in bebidas else None

        # ---------- Cálculo (a regra mora em cardapio.py) ----------
        v = calcular(tamanho, escolhidos, borda, bebida_id)

        # ---------- Resumo do pedido ----------
        print()
        print("===== RESUMO DO PEDIDO =====")
        print(f"Pizza tamanho {tamanho}: {' + '.join(escolhidos)}")
        if len(escolhidos) == 2:
            print("(meio a meio: vale o preço do sabor mais caro)")
        print(f"Pizza:  R$ {v['valorPizza']:.2f}")
        if borda:
            print(f"Borda recheada: R$ {v['valorBorda']:.2f}")
        if bebida_id:
            print(f"{bebidas[bebida_id]['nome']}: R$ {v['valorBebida']:.2f}")
        print(f"Subtotal: R$ {v['subtotal']:.2f}")
        print("Frete: Grátis" if v["frete"] == 0 else f"Frete: R$ {v['frete']:.2f}")
        print(f"Total do pedido: R$ {v['total']:.2f}")
else:
    print("Pedido inválido")

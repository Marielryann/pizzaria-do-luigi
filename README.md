# Luigi's Pixel Pizzeria

Site de pedidos de pizza inspirado nos jogos clássicos do Mario. Monte a pizza, finalize a missão e acompanhe o pedido.
Projeto de faculdade: frontend em HTML/CSS/JavaScript puro e backend em Python (Flask).

## Funcionalidades
- Escolha de tamanho (P, M, G), 1 a 2 sabores, borda recheada e bebida
- Meio a meio cobra o preço do sabor mais caro
- Frete de R$ 8,00, grátis quando o subtotal passa de R$ 80,00
- Total recalculado no servidor (o navegador não decide o preço)
- Acompanhamento do pedido por número, com etapas atualizadas automaticamente

## Como rodar
```bash
pip install -r requirements.txt
python server.py
```
Abra o link mostrado no terminal

## Estrutura
```
server.py            API Flask e entrega do site
static/              index.html, style.css, app.js
terminal/            versão original do programa, para o terminal
pedidos.json         criado automaticamente ao fazer pedidos (ignorado pelo git)
```

## API
| Rota | O que faz |
|------|-----------|
| `GET /api/cardapio` | Preços, bebidas e regras de frete |
| `POST /api/pedido` | Valida, calcula o total e salva o pedido |
| `GET /api/pedido/<numero>` | Detalhes e andamento do pedido |

O andamento do pedido é simulado pelo tempo (demonstração).

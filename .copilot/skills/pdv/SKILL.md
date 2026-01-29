# 🏪 PDV (Ponto de Venda) Skill

> **Especialista em fluxo de vendas, caixa e operações comerciais**  
> Versão: 1.0.0 | Última Atualização: 28 de Janeiro de 2026

## 📋 Descrição

Esta skill foca no core comercial do GIRO, abrangendo o fluxo de venda otimizado, integração de pagamentos e controle de caixa.

## 🛒 Fluxo de Venda

1. **Identificação**: Busca de produto por código de barras (\*), SKU ou nome.
2. **Itens**: Adição de itens, controle de quantidade e descontos.
3. **Pagamento**: Múltiplas formas (Dinheiro, PIX, Cartão).
4. **Finalização**: Cálculo de troco, emissão de cupom e abertura de gaveta.

## ⌨️ Atalhos de Teclado (Padrão)

- `F3`: Buscar produto
- `F5`: Aplicar Desconto
- `F9`: Ir para Pagamento
- `F10`: Finalizar Venda
- `Esc`: Cancelar/Voltar

## 📐 Padrões de Implementação

### State Machine de Venda

Gerenciar o estado da venda (`idle`, `adding_items`, `payment`, `completed`) para garantir a consistência dos dados.

### Cálculo de Troco

`troco = total_pago - total_venda`. Validar sempre se o pago é maior ou igual ao total.

## 💰 Controle de Caixa

- **Abertura**: Registro de saldo inicial.
- **Movimentações**: Sangria (retirada) e Suprimento (entrada de troco).
- **Fechamento**: Conferência de valores e apuração de diferenças.

## ✅ Checklist

- [ ] Busca por código de barras funcional
- [ ] Atalhos de teclado mapeados
- [ ] Cálculo de troco e subtotal precisos
- [ ] Fluxo de sangria/suprimento implementado
- [ ] Preview de cupom/impressão disponível
- [ ] Tratamento de cancelamento de itens/venda

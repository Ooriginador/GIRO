# Correção de Fluxo: Requisição de Material

**Data:** 26/01/2026
**Responsável:** GitHub Copilot (Frontend Agent)

## Problema Identificado

O fluxo de Requisição de Material apresentava lacunas críticas na integridade dos dados de estoque:

1. **Aprovação sem Reserva:** O comando simples de aprovação apenas alterava o status para 'APPROVED', sem efetuar a reserva física dos itens no `StockLocationRepository`, permitindo que o estoque fosse usado por outras operações.
2. **Separação "Fantasma":** A finalização da separação apenas alterava o status para 'SEPARATED', sem preencher a coluna `separated_qty`. Como a entrega utiliza essa coluna para baixar o estoque, requisições entregues não baixavam nada (`qty=0`).
3. **Inconsistência SQL:** O método de aprovação antigo usava casing errado para tabelas (`MaterialRequest` vs `material_requests`).

## Solução Implementada

### 1. Centralização no EnterpriseService

Refatoramos os comandos para utilizar a lógica de negócio centralizada no `EnterpriseService`, garantindo transacionalidade (lógica).

- **Approval:** Criado método `approve_request_fully` que itera sobre todos os itens e chama `stock_repo.reserve_quantity`.
- **Separation:** Criado método `complete_separation` que preenche automaticamente `separated_qty` com `approved_qty` (caso não definido), garantindo que a entrega subsequente tenha quantidades válidas.

### 2. Atualização de Comandos (API)

- `approve_material_request` -> Usa `EnterpriseService`.
- `complete_request_separation` -> Usa `EnterpriseService` (com auto-fill de quantidades).
- `update_request_item_separated_qty` -> Novo comando exposto para permitir separação parcial via UI no futuro.

### 3. Mobile

- O handler de aprovação mobile foi atualizado para usar a mesma rotina segura, garantindo que aprovações via app também reservem estoque.

## Próximos Passos

- Implementar UI de "Conferência de Separação" no Frontend (Desktop/Mobile) para permitir ajuste fino das quantidades separadas antes de finalizar.

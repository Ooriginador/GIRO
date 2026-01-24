# PDV — Checklist de Revisão e Tarefas Iniciais

Objetivo: auditar e validar o fluxo do PDV para garantir rapidez, precisão e confiabilidade.

**Resumo Rápido**

- Prioridade: alta
- Escopo: busca de produtos, fluxo de venda (métodos mistos), atalhos de teclado, performance, impressão de recibo, integração com hardware (impressora/gaveta)

**Critérios de Aceitação**

- Busca de produto (código/nome/barcode) com latência median < 200ms em ambiente dev.
- Venda com múltiplos métodos (ex.: Dinheiro + PIX) completada e persistida sem erros.
- Atalhos (F1,F2,F4,F6,F10,F12,Esc) funcionais e acessíveis por teclado.
- Impressão de recibo dispara sem erro e gatilha abertura de gaveta quando configurada.
- Logs de erro/rejeição gravam motivo e stack para auditoria.

**Checklist Manual (passo-a-passo)**

1. Preparação
   - Iniciar ambiente dev: `cd GIRO/apps/desktop && pnpm install && pnpm dev`
   - Iniciar backend/tauri se necessário: `cd GIRO/apps/desktop/src-tauri && cargo run` (ou seguir `README.md` local).
2. Testes de Busca
   - Pesquisar por código de produto válido (ex.: barcode). Verificar resposta e seleção rápida.
   - Pesquisar por nome parcial. Verificar ordenação e destaque do resultado.
   - Medir latência (usar profiler ou cronômetro simples).
3. Fluxo de Venda
   - Adicionar 3 produtos diferentes ao carrinho.
   - Aplicar desconto e alteração de quantidade via teclado.
   - Completar pagamento com `Dinheiro + PIX` (simular segundo método quando necessário).
   - Confirmar persistência: venda aparece em `Relatórios > Vendas` e no `Caixa`.
4. Impressão e Hardware
   - Imprimir recibo; verificar layout e campos essenciais (itens, total, troco, pagamentos).
   - Verificar abertura de gaveta (se integrado) após impressão.
5. Atalhos e Acessibilidade
   - Navegar apenas por teclado: foco correto, Enter ativa seleção, Esc cancela.
   - Testar todos os atalhos citados no documento de UX.
6. Testes de Estresse/Performance
   - Rodar 1000 buscas sequenciais e observar memória/latência.
   - Simular 50 vendas rápidas para observar latência de gravação.

**Cenários E2E recomendados (Playwright)**

- TC-001: Busca por código e adição ao carrinho.
- TC-002: Venda com pagamento misto (Dinheiro + PIX) e validação no relatório.
- TC-003: Impressão de recibo + abertura de gaveta (mock hardware se necessário).
- TC-004: Atalhos do teclado completos (fluxo de venda via teclado apenas).

**Onde inspecionar o código (pontos de partida)**

- UI/Frontend PDV: `GIRO/apps/desktop/src/components/pdv` (ou procurar `ProductSearch`, `CartItem`, `PaymentModal`).
- IPC / Tauri commands: `GIRO/apps/desktop/src-tauri/src/commands/sales.rs` e `hardware/*.rs` para impressão/porta de gaveta.
- Repositórios/negócio: `GIRO/apps/desktop/src-tauri/src/repositories/sale_repository.rs` e `stock_repository.rs`.

**Comandos úteis**

- Rodar testes E2E (Playwright):

```bash
cd GIRO/giro-license-server/e2e
pnpm install
pnpm test
```

- Rodar testes unit/fast no desktop (vitest):

```bash
cd GIRO/apps/desktop
pnpm install
pnpm test
```

**Tarefas iniciais (issues sugeridas)**

- PDV: Investigar buscas lentas por barcode — reproduzir e medir (tag: `bug/perf`).
- PDV: Implementar teste E2E TC-002 (tag: `test/e2e`).
- PDV: Revisar layout de recibo para alinhamento e campos obrigatórios (tag: `ux`).
- PDV: Cobertura de atalhos — criar teste que valide foco e comportamento (tag: `test/unit`).

---

Gerado automaticamente — posso abrir PR com este arquivo e criar as issues sugeridas. Deseja que eu prossiga com PR e criação de issues?

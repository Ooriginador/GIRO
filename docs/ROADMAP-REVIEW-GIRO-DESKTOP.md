# Roadmap de Revisão e Refinamento — GIRO Desktop

Data: 23 de janeiro de 2026

## Objetivo

Plano sistemático para auditar, testar e aprimorar cada aba do sistema GIRO Desktop, garantindo experiência premium, funcionalidade e integridade dos dados.

## Pilares da Revisão

- Layout & UI: consistência visual, alinhamento, legibilidade e "wow factor".
- Funcionalidade: testes ponta a ponta e tratamento de erros.
- Integridade: validação de dados locais e sincronizados.
- Necessidade de Update: identificar componentes defasados e novos recursos.

## Passos acionáveis

1. Inventário: listar telas/rotas por aba e dependências (API/local).
2. Testes: criar checklist para testes manuais + casos E2E prioritários.
3. Automação: priorizar 10 E2E críticos + testes unitários para hooks/serviços.
4. Correções: catalogar bugs/UX e aplicar hotfixes por ordem de risco.
5. Validação: rodar regressão e verificar integrações (sincronização/licença).
6. Entrega: gerar relatório por módulo com evidências (screenshots/logs) e PRs.

## Cronograma (sugestão)

- Sprint 0 (1 dia): Inventário + definição de responsáveis.
- Sprint 1 (3 dias): PDV + Gestão de Inventário (prioridade alta).
- Sprint 2 (3 dias): Ordens de Serviço & Garantias + Dashboards.
- Sprint 3 (2 dias): Clientes/Fornecedores + RH/Permissões.
- Sprint 4 (2 dias): Financeiro & Configurações + finalização de automação.

## Cross-cutting

- E2E prioritário: fluxo de venda completo (buscar produto → pagamento misto → recibo).
- Cobertura: focar em hooks, stores e services críticos.
- Infra/Logs: garantir logs de sincronização e falhas em localStorage/DB.
- Acessibilidade: contraste, labels e navegação por teclado.
- Licença: validar ativação/desativação e mensagens amigáveis.

## Critérios por Módulo

1. Dashboards (Geral & Oficina)

- Objetivo: garantir métricas coerentes com o Caixa e filtros confiáveis.
- Checklists: reconciliar faturamento/ticket médio; revisar gráficos/cards; testar filtros (hoje, 7d, 30d, custom).
- Casos de teste: filtro com início > fim (erro amigável); exportar PDF/XLS.
- Aceitação: números reconciliados ±0; filtros preservam estado.

2. Ordens de Serviço & Garantias

- Objetivo: fluxo OS completo, controle de prazos e impressão.
- Checklists: criar/editar/adicionar itens/finalizar/imprimir; alertas de garantia (7d/1d).
- Casos de teste: desconto aplicado corretamente; finalizar offline e sincronizar.
- Aceitação: impressão fiel; alertas gerados por job local.

3. PDV (Ponto de Venda)

- Objetivo: performance e robustez no fluxo de venda.
- Checklists: busca responsiva (<200ms alvo para DB local); pagamentos mistos; atalhos de teclado.
- Casos de teste: venda com 3 formas de pagamento; loop de leitura de barcode sem duplicação.
- Aceitação: busca responsiva; pagamento misto gravado e conciliado.

4. Gestão de Inventário (Produtos & Estoque)

- Objetivo: confiabilidade do cadastro e auditoria.
- Checklists: upload de imagens; ajustes manuais com razão; alertas de estoque baixo.
- Casos de teste: ajuste → histórico e reversão; importação CSV com validação.
- Aceitação: histórico auditável; alertas entregues.

5. Clientes & Fornecedores

- Objetivo: integridade dos dados e histórico financeiro.
- Checklists: histórico de compras/débitos; máscaras CPF/CNPJ/CEP; importação/exportação.
- Casos de teste: CPF inválido bloqueado; cliente com 10+ compras (paginação).
- Aceitação: validações ativas; históricos completos.

6. RH & Permissões (Funcionários)

- Objetivo: segurança por cargos e troca rápida de usuário.
- Checklists: restrição por cargo; troca de usuário sem dados residuais; auditoria de ações.
- Casos de teste: remoção de permissão em tempo real; rota proibida → 403.
- Aceitação: políticas aplicadas; registro de ações.

7. Financeiro & Configurações

- Objetivo: precisão em caixa, exportações e licença.
- Checklists: abertura/fechamento de caixa; exportação PDF/XLS; ativação de licença offline/online.
- Casos de teste: abrir → registrar → fechar caixa e reconciliar; falha de rede na ativação → modo degradado.
- Aceitação: fechamento conciso; exportações corretas; mensagens de licença claras.

## Artefatos e Evidências

Para cada módulo gerar:

- Checklist de testes preenchido.
- Casos E2E (Playwright/Vitest) mínimos.
- Screenshots/GIFs de falhas e correções.
- PRs/tickets com steps to reproduce e prioridade.
- Relatório final com riscos e recomendações de UX.

## Métricas de Sucesso

- 0 discrepâncias críticas entre Dashboard e Caixa.
- E2E crítico com 95% de estabilidade em CI.
- Mensagens de erro claras e rastreáveis para sincronização/licença.
- Acessibilidade: contraste e navegação por teclado testados.

## Próximos passos sugeridos

1. Rodar inventário automatizado das rotas e listar responsáveis.
2. Criar 2 testes E2E prioritários (PDV crítico + OS fluxo) e integrá-los ao CI.
3. Iniciar Sprint 1 focado em PDV e Inventário.

--
Arquivo gerado automaticamente por assistente em 23/01/2026 — revise seletores e paths de testes antes de executar.

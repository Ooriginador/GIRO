# Roadmap de Revisão e Refinamento — GIRO Desktop

Data: 23 de janeiro de 2026

## Resumo

Documento sistemático para auditar, testar e aprimorar cada aba do GIRO Desktop. Objetivo: entregar uma experiência premium, funcional e íntegra, com critérios de aceite e responsáveis definidos.

## Pilares da Revisão

- Layout & UI: Consistência visual, alinhamento, legibilidade e "wow factor".
- Funcionalidade: Fluxos ponta a ponta e tratamento robusto de erros.
- Integridade: Validação de dados locais e sincronizados.
- Necessidade de Update: Identificar componentes defasados e novos requisitos.

## Abordagem e Etapas (resumido)

1. Planejar: definir responsáveis, ambiente e dados de teste.
2. Auditar UI: review visual e checklist de acessibilidade.
3. Testar fluxos: testes manuais e automação mínima (scripts/fixtures).
4. Verificar integridade: comparar dados locais vs servidor.
5. Catalogar issues: severidade, impacto, prioridade.
6. Corrigir e validar: pequenas correções, re-testes, e regression checks.
7. Entregar: checklist de aceite e notas de release.

## Cronograma por Módulo (atividades-chave)

1. Dashboards (Geral & Oficina)

   - Métricas: validar faturamento, ticket médio, total vendas.
   - Visual: revisar cards, gráficos (hover, animações), contraste de cores.
   - Filtros: validar presets (Hoje, 7d, 30d) e range custom.
   - Testes:
     - Comparar valores com fechamento de `Caixa` em amostras de 7/30 dias.
     - Verificar comportamento com timezone/horário de verão.
   - Critério de aceite: métricas reconciliadas com variação <= 0.5%.

2. Ordens de Serviço & Garantias

   - Fluxo OS: criar → editar → adicionar itens → finalizar → imprimir.
   - Garantias: prazos, estado (ativa/expirada), notificações.
   - Impressão: layout do comprovante (margens, QR, dados fiscais).
   - Testes:
     - Criar OS com múltiplos serviços/produtos e confirmar FIFO/estoque.
     - Forçar erro (ex: produto sem estoque) e verificar rollback parcial/erro amigável.
   - Critério de aceite: impressão legível + notificações corretas em 100% dos casos.

3. PDV (Ponto de Venda)

   - Performance: busca por código/barcode, autocomplete por nome.
   - Pagamento: compor pagamentos múltiplos (Dinheiro + PIX + Cartão).
   - Atalhos: fluxo via teclado (F1, Esc, Enter, atalhos customizáveis).
   - Testes:
     - Medir tempo médio de busca (meta < 200ms localmente / < 600ms em ambiente carregado).
     - Vender com 3 formas de pagamento e validar reconciliação do total.
   - Critério de aceite: vendas sem perda de dados e reconciliação automática.

4. Gestão de Inventário (Produtos & Estoque)

   - Cadastro: upload de imagens, vinculação de categoria/fornecedor.
   - Ajustes: entradas/saídas manuais com auditoria (usuario/timestamp/motivo).
   - Alertas: notificação automática de estoque baixo e threshold configurável.
   - Testes:
     - Importar lote de produtos (CSV) e validar campos obrigatórios e duplicates.
     - Simular ajuste manual e verificar histórico de auditoria.
   - Critério de aceite: sem perda de imagens e auditoria completa para cada ajuste.

5. Clientes & Fornecedores

   - Histórico: visualizar compras, saldos e notas fiscais vinculadas.
   - Validação: máscaras CPF/CNPJ/CEP, formatos e validação de dígito verificador.
   - Testes:
     - Inserir CPFs/CNPJs inválidos e validar mensagens de erro.
     - Verificar importação de base de clientes e deduplicação.
   - Critério de aceite: máscaras funcionais e validações bloqueiam dados inválidos.

6. RH & Permissões (Funcionários)

   - Acessos: validar roles (Admin, Gerente, Vendedor) e restrições por rota/aba.
   - Login: troca rápida de usuário e bloqueio após tentativas.
   - Testes:
     - Usuário com role `Vendedor` não vê Relatórios/Configurações.
     - Testar sessão concorrente (dois logins com mesma conta).
   - Critério de aceite: permissões aplicadas e logs de auditoria gerados.

7. Financeiro & Configurações
   - Fechamento: abertura, sangria, sangria parcial e fechamento diário.
   - Exportação: gerar PDF/XLS com filtros e layout aceitos pela contabilidade.
   - Sistema: revisão de configurações globais e fluxo de ativação/licença.
   - Testes:
     - Simular abertura e fechamento com múltiplas transações e conferir reconciliação.
     - Gerar relatório exportado e validar esquema de colunas.
   - Critério de aceite: relatórios exportados sem perda de linhas e números reconciliados.

## Checklists e Casos de Teste (por módulo)

- Preparação:

  - Ambiente: `dev-desktop` com snapshot DB representativo.
  - Dados: conjuntos de 30/90/365 dias, cliente/fornecedor/sample products.
  - Ferramentas: acesso a logs locais, captura de rede/sync.

- Checklist UI:

  - Contraste e legibilidade (WCAG AA mínima).
  - Botões com states: hover, active, disabled.
  - Inputs com mensagens de erro inline.

- Checklist Funcional:

  - Fluxo happy-path validado.
  - Falhas simuladas e mensagens amigáveis.
  - Regras de negócio validadas (impostos, descontos, margens).

- Checklist Integridade:
  - Operações offline: salvar local e sincronizar ao reconectar.
  - Verificar duplicidade e conflitos (merge strategy).
  - Comparar hashes/contagens entre local e servidor pós-sync.

## Template de Report de Issue

- Título: curto e específico.
- Módulo: (ex: PDV)
- Severidade: Critical / High / Medium / Low
- Passos para reproduzir: passo-a-passo mínimo
- Resultado esperado vs atual
- Logs anexos / screenshots / captura de rede
- Branch/commit onde foi reproduzido
- Responsável sugerido

## Priorização e Estimativas (orientativas)

- Sprint 0 (2 dias): ambiente e dados de teste, smoke tests básicos.
- Sprint 1 (5 dias): PDV + Fechamento de Caixa (criticamente sensíveis).
- Sprint 2 (7 dias): Inventário + Ordens de Serviço.
- Sprint 3 (5 dias): Dashboards + Relatórios + Exportação.
- Buffer (3 dias): correções de regressão e QA final.

## Responsabilidades (sugerido)

- Product Owner: validar critérios de aceite e priorização.
- Tech Lead: revisar patches e aprovar merge.
- QA Lead: coordenar execução dos testes e triagem de issues.
- Devs por módulo: implementar correções e escrever testes.

## Ambiente de Teste e Dados

- DB: snapshot `giro_dev_snapshot.sql` (ou container com volume apontado).
- Variantes: testar em modo offline/online, e com latência simulada.
- Ferramentas: `sqlite` (local), `curl` para endpoints de sync, gravação de logs.

## Relatórios e Entrega

- Entregar um relatório por módulo com:
  - Lista de issues por severidade
  - Testes executados e resultados
  - Evidências (screenshots, logs, diffs)
- Para release: changelog resumido e instruções de migração.

## Riscos e Mitigações

- Risco: divergência entre cálculo local e servidor.
  - Mitigação: criar suite de reconciliamento e alertas automáticos.
- Risco: perda de dados em sync.
  - Mitigação: sempre gravar operação em WAL/local journal antes do envio.

## Próximos Passos Imediatos

1. Aprovar responsáveis e datas (PO + Tech Lead).
2. Preparar snapshot DB e criar branch `review/giro-desktop`.
3. Executar Sprint 0: ambiente + smoke tests (2 dias).

## Anexos / Referências

- Verificar `GIRO/README.md` e `giro-license-server/README.md` para notas de deploy.
- Use o histórico de `logs/` para investigar regressões preexistentes.

-- Fim --

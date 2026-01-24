# PDV — Issues Sugeridas (Triagem inicial)

Lista de issues sugeridas para triagem e criação no tracker. Cada item contém título sugerido, labels, steps para reproduzir e severidade.

- Title: PDV - Busca por barcode lenta

  - Labels: `bug/perf`, `pdv`, `investigation`
  - Severity: High
  - Reproduction Steps:
    1. Iniciar app em dev (`cd GIRO/apps/desktop && pnpm dev`).
    2. Abrir PDV e usar campo de busca por barcode com um produto conhecido.
    3. Medir tempo entre Enter e resultado visível (ou visibilidade do dropdown). Repetir 10x.
    4. Anotar median/percentis e qualquer erro no console.
  - Observações: coletar network calls, IPC timings e logs de `sale_repository`/`product_repository`.

- Title: PDV - Implementar E2E: Venda com pagamento misto (Dinheiro + PIX)

  - Labels: `test/e2e`, `pdv`, `automation`
  - Severity: Medium
  - Reproduction Steps:
    1. Garantir ambiente E2E configurado (Playwright). Ver `GIRO/apps/desktop/playwright.config.ts`.
    2. Rodar `pnpm test` em `GIRO/apps/desktop` ou executar o caso `sale-mixed-pix.spec.ts`.
    3. Validar que venda completa aparece no histórico e não há alertas de erro.
  - Observações: o teste foi adicionado em `tests/e2e/sale-mixed-pix.spec.ts`.

- Title: PDV - Revisar layout do recibo/impressão

  - Labels: `ux`, `pdv`, `hardware`
  - Severity: Low
  - Reproduction Steps:
    1. Fazer uma venda de teste e acionar impressão do recibo.
    2. Conferir alinhamento, presença de campos: itens, quantidades, preços, total, pagamentos, troco, CNPJ/empresa.
    3. Testar em impressora térmica real (se possível) e ajustar margens/encoding.

- Title: PDV - Cobertura de atalhos do teclado
  - Labels: `test/unit`, `pdv`, `accessibility`
  - Severity: Medium
  - Reproduction Steps:
    1. Navegar até PDV apenas com teclado (F2, F4, F6, F10, Esc, Enter).
    2. Verificar foco, ações e cancelamento.
    3. Criar teste automatizado que valida foco e execução dos atalhos.

---

Posso transformar cada item em Issue no GitHub (se você autorizar e me informar o repositório remoto), ou gerar PR com estes arquivos e/ou templates locais. Quer que eu crie as issues localmente como arquivos ou tente criar issues diretamente no GitHub?

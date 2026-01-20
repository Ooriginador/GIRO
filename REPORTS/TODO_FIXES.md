# TODO / FIXME / Placeholder Cleanup - Initial Action Plan

Resumo das ações imediatas e prioridades após varredura inicial por `TODO|FIXME|placeholder|mock`.

Alta prioridade

- Fix global test failures caused by incomplete `lucide-react` mocks — implemented in `apps/desktop/tests/setup.ts` (global mock added).
- Sanitize test secrets/placeholders found in tests/reports (tokens like `abc123`, `senha123`) — replace with non-sensitive `TEST_TOKEN_*` fixtures.
- Fix `webMockInvoke` unsupported commands in `apps/desktop/src/lib/tauri.ts` (errors: `comando não suportado: create_employee`, `create_supplier`) — add explicit handlers or improve error messaging.

Média prioridade

- Replace ambiguous TODOs in `docs/UNINSTALL-GUIDE.md` and other docs with concrete steps or convert to tracked issues.
- Normalize templates under `docs/templates/` to use explicit tokens and guidance.
- Remove / annotate placeholders in RELEASE / AUDIT docs and mark actionable tasks as issues.

Baixa prioridade

- Convert development-only mocks (MOCK-HWID-123 etc.) to explicit test fixtures or env-gated values.
- Clean up `.giro_tmp_todo.json` and produce GH issues for items that need decisions.

Próximos passos propostos (posso começar agora):

1. Commitar a alteração do mock global (já aplicada localmente). Rodar testes do `apps/desktop` para validar.
2. Corrigir handlers não-suportados em `apps/desktop/src/lib/tauri.ts` (implementar `create_employee`, `create_supplier` no webMock ou transformar chamadas em stubs seguros).
3. Substituir valores de teste sensíveis em arquivos de teste e relatórios encontrados (gerar patch com mudanças seguras).
4. Criar um conjunto de issues no repositório para itens ambíguos/decisions-needed.

Se concordar, inicio pelo passo 2 (corrigir webMock invoke) e passo 3 (sanitizar tokens em testes). Quer que eu continue com essas correções agora?

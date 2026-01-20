# TODO / FIXME / PLACEHOLDER / MOCK - Master List

Resumo da varredura (regex: `(?i)\\b(TODO|FIXME|PLACEHOLDER|MOCK|STUB)\\b`) e lista priorizada de ações.

**Alta Prioridade**

- **`apps/desktop/test_output_final.txt`**: Erros de testes causados por mocks incompletos em `lucide-react` (export `ChevronDown` faltando) — ação: ajustar `tests/setup` para `vi.mock(import("lucide-react"), async (importOriginal) => ({ ...(await importOriginal()), ChevronDown: /* stub */ }))` ou exportar componente stub; rodar test suite.
- **`apps/desktop/final_coverage_report.txt`**: Erros similares em mocks (`SessionGuard`) — ação: harmonizar mocks globais em `apps/desktop/src/test/setup.ts`.
- **Docs de auditoria/release**: `REPORTS/DOCS_CLEANUP_REPORT.md`, `REPORTS/TODO_SCAN.md` — contêm TODOs com impacto de release; ação: aplicar correções não-ambíguas e abrir issues para decisões necessárias.

**Média Prioridade**

- **`docs/UNINSTALL-GUIDE.md`** — item ambíguo resolvido (substituído por "remover todo o conteúdo da pasta"); já aplicado.
- **Hardware / Tauri mocks**: muitos arquivos `apps/desktop/*test_output*.txt` usam `MOCK-HWID-123` e `[MOCK INVOKE]` — ação: mover para fixtures ou `env`-gated values e documentar que são esperados nos testes.
- **`.github/agents/*.agent.md`** — placeholders `todo` → sugerir `TBD` ou transformar em issues.

**Baixa Prioridade**

- Logs e artefatos de teste (`*.txt`) contendo tokens MOCK — documentar e ignorar em auditorias, remover se não necessários.
- Test fixtures com senhas simples (`senha123`, `abc123`) listadas em `REPORTS/SECRETS_TOP100.md` — ação: substituir por `TEST_PLACEHOLDER_*` e garantir que não comitem credenciais reais.

Próximos passos recomendados (execução):

1. Corrigir mocks de testes que quebram pipeline (lucide-react, SessionGuard) e rodar `pnpm test` em `apps/desktop`.
2. Aplicar correções não-ambíguas em arquivos de alta prioridade (docs de auditoria/release) e criar issues para decisões ambíguas.
3. Normalizar fixtures de hardware (`MOCK-HWID-123`) para `tests/fixtures/hardware.ts` e atualizar testes para usar fixture.
4. Substituir senhas de teste por placeholders seguros e atualizar `REPORTS/SECRETS_*` conforme já recomendado.

Registros rápidos de mudanças feitas:

- `docs/UNINSTALL-GUIDE.md`: substituído trecho ambíguo "TODO o conteúdo da pasta" por "remover todo o conteúdo da pasta".
- `.giro_tmp_todo.json`: adicionada entrada `Applied fix: UNINSTALL-GUIDE.md`.

Se você autorizar, posso começar imediatamente pelo passo 1 (corrigir mocks que quebram os testes) e executar os testes do `apps/desktop` para validar. Ou prefira que eu aplique as mudanças de documentação de alta prioridade primeiro.

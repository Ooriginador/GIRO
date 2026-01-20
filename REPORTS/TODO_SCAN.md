# Varredura TODO/FIXME/PLACEHOLDER/MOCK

Resumo rápido

- Data: 2026-01-20
- Resultados da busca inicial: ~200 correspondências (regex: TODO|FIXME|PLACEHOLDER|MOCK, case-insensitive)

Principais categorias encontradas

- Documentação com placeholders/TO DOs: `docs/UNINSTALL-GUIDE.md`, `docs/00-OVERVIEW.md`, vários arquivos em `docs/`.
- Arquivos de relatório já chamando atenção para placeholders: `REPORTS/DOCS_CLEANUP_REPORT.md`.
- Mocks usados extensivamente no frontend desktop (ex.: `apps/desktop/*test_output*.txt`, `vi.mock('@tauri-apps/api/core')`).
- Testes com mocks incompletos/erros: mensagens indicando mocks faltando exports (ex.: `lucide-react` faltando `ChevronDown`, `@/components/guards` faltando `SessionGuard`).
- Fixtures de testes com senhas/credentials de exemplo (ex.: `senha123`, `test_secret`).

Exemplos de ocorrências (amostra)

- `docs/UNINSTALL-GUIDE.md`: linhas com "TODO o conteúdo da pasta" e instruções ambíguas.
- `apps/desktop/test_output_final.txt`: vários erros de mocking em `lucide-react` e `@/components/guards`.
- `apps/desktop/test_output_regression_4.txt` e `final_coverage_report.txt`: muitos tokens `MOCK-HWID-123`, `MOCK INVOKE` usados em logs.
- `REPORTS/SECRETS_TOP100.md`: testes contendo `TEST_PASSWORD_PLACEHOLDER` e outras credenciais de exemplo.

Riscos e prioridades sugeridas

- Alta: testes e mocks quebrando a pipeline (corrigir `vi.mock` retornos incompletos, garantir partial mocks via `importOriginal`).
- Alta: credenciais em fixtures — remover/substituir por placeholders não sensíveis e garantir que não vazem em releases.
- Média: documentação ambígua/TO-DOs que atrasam entrega (substituir texto ambíguo por instruções acionáveis ou criar issues).
- Baixa: logs e arquivos de saída de teste contendo textos MOCK (podem permanecer, mas documentar que são esperados).

Próximos passos propostos (posso executar)

1. Gerar um relatório detalhado com todas as ocorrências e snippets (por arquivo).
2. Aplicar correções não ambíguas automaticamente:
   - Atualizar docs com textos claros (ex.: `docs/UNINSTALL-GUIDE.md`).
   - Sanitizar fixtures de testes que contém senhas óbvias.
   - Corrigir mocks de testes que causam erros simples (`lucide-react`, `@/components/guards`) adicionando exports de fallback nos mocks de teste global.
3. Para placeholders que exigem decisão (ex.: valores de configuração), criar issues com o contexto e sugerir responsáveis.
4. Rodar suíte de testes do `apps/desktop` e reportar regressões.

Como prefere que eu proceda?

- Opção A: Continuo e aplico as correções não ambíguas agora (docs, fixtures sensíveis, mocks quebrando testes).
- Opção B: Gero o relatório completo primeiro e você aprova por etapa.

Observação: a tentativa automática de criar um todo-list interno falhou (ferramenta desabilitada). Vou manter este arquivo como fonte de verdade local até você confirmar próximos passos.

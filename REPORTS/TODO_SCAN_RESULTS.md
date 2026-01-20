# Scanner de TODOs, FIXMEs e Placeholders

Resumo rápido:

- Resultado inicial: 200+ ocorrências encontradas (docs, roadmaps, testes e alguns arquivos de código).
- Áreas críticas detectadas: `REPORTS/*`, `docs/*`, `STATUS-ATUAL.md`, `SITUACAO-REAL.md`, `.github/agents/*`, testes com mocks/credenciais.

Prioridade proposta:

- Alta: TODOs em auditorias, release notes e roadmaps que podem bloquear entrega.
- Média: Placeholders em templates, agentes e prompts.
- Baixa: Comentários em testes e logs de mock que não impactam release.

Plano em fases (recomendado):

1. Aplicar correções não-ambíguas automaticamente
   - Normalizar marcadores simples (`todo` → `TBD`) em arquivos de agente (`.github/agents/*.agent.md`).
   - Corrigir checklists que já estão sinalizadas como concluídas nos relatórios (marcar como concluído quando o contexto já indica).
2. Criar issues para decisões ambíguas
   - Extrair itens que precisam de input humano (ex.: escolha de token, dados sensíveis, decisões de design).
3. Segurança e testes
   - Substituir fixtures com senhas reais por placeholders não sensíveis e documentar como prover credenciais de teste.
4. Código e testes
   - Listar TODOs em código fonte (src/**, apps/**) e priorizar por risco/impacto. Implementar correções simples e documentar tarefas maiores.

Próximas ações que posso executar agora (aguardando sua confirmação):

- Gerar e aplicar a primeira fase automaticamente (normalizar `.github/agents/*` e outras correções seguras).
- Criar um conjunto de issues (arquivo `REPORTS/TODO_ISSUES_PROPOSED.md`) com itens ambíguos e donos sugeridos.

Se concordar, eu começo aplicando as correções não-ambíguas e posto um resumo das mudanças e arquivos alterados.

-- Scanner automático gerado em 2026-01-20

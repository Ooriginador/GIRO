# TODO — Itens Ambíguos que Devem Virar Issues

Este arquivo lista itens que requerem decisão humana (não aplicarei mudanças automaticamente). Para cada item proponho título de issue, descrição curta, label sugerida e provável responsável.

- **Title:** Clarificar tokens persistentes no `docs/deployment.md`

  - **Descrição:** O documento menciona "token permanente" sem indicar como gerá-lo/armazená-lo. Especificar passos e local seguro (secrets manager) ou transformar em variável de ambiente obrigatória. Incluir exemplos para Railway/Vercel.
  - **Labels:** docs, security
  - **Assignee (sugerido):** DevOps / Owner do deployment

- **Title:** Revisar e consolidar TODOs em `REPORTS/*` que afetam release

  - **Descrição:** Vários relatórios listam TODOs bloqueantes (auditoria/release). Consolidar numa issue única com subtasks para cada arquivo: `AUDIT_*`, `DOCS_CLEANUP_REPORT.md`, `SECRETS_*`.
  - **Labels:** release-blocker, audit
  - **Assignee (sugerido):** Projeto Lead / Release Manager

- **Title:** Padronizar fixtures de teste (remover senhas hardcoded)

  - **Descrição:** Substituir senhas e tokens em fixtures/tests por constantes `TEST_PASSWORD`, `TEST_TOKEN_*`. Garantir que os testes continuam passando e adicionar notas de como prover credenciais seguras em CI.
  - **Labels:** tests, security
  - **Assignee (sugerido):** QA Team / Backend Owner

- **Title:** Hardware mocks e integração (docs/HARDWARE-IMPLEMENTATION.md)

  - **Descrição:** Documento tem checklist "Integration tests com hardware mock" e menções a botões/commands. Decidir estratégia: manter mocks com MSW/mockall ou integrar com hardware em CI. Criar especificação de mocks e API de integração.
  - **Labels:** infra, hardware
  - **Assignee (sugerido):** Hardware / QA

- **Title:** Transformar templates com placeholders (e.g., docs/templates/\*) em exemplos prontos
  - **Descrição:** Vários templates usam placeholders (`[NOME_DO_PROJETO]`, `todo`). Fornecer exemplos preenchidos e instruções para gerar novos projetos a partir do template.
  - **Labels:** docs, enhancement
  - **Assignee (sugerido):** Docs Owner / Architect

Como próximos passos opcionais:

- Posso abrir essas issues no GitHub automaticamente (precisa de token e permissão). Alternativamente, posso criar um branch com mudanças não-ambíguas e gerar um PR contendo apenas: pequenas normalizações em agentes, substituições seguras em testes já afetados, e atualização de relatórios com links para as novas issues.

-- Proposto automaticamente em 2026-01-20

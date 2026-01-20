# Análise de Segredos — Amostra (primeiras 100 ocorrências)

Data: 20/01/2026

Resumo rápido

- `env` files encontrados: 5 (ver `REPORTS/env-files.txt`).
- Resultados de grep: 454 matches (`REPORTS/secrets-grep.txt`).
- Resultados de base64-like: 2146 matches (`REPORTS/secrets-base64-grep.txt`).

Observações iniciais

- Muitos matches são arquivos de configuração, lockfiles e relatórios (package-lock.json, pnpm-lock.yaml, coverage reports, generated schemas). Estes contêm valores como `integrity` hashes e caminhos que acionam heurísticas; não são segredos reais.
- Há vários exemplos explícitos em fluxos CI contendo test credentials e placeholders (ex.: `giro_test_password`, `test_secret_key_for_ci_only_do_not_use_in_production`).
- Alguns arquivos Rust/tauri mostram campos `cert_password`, `client_secret` e `api_key` usados em runtime; revisar uso e garantir que valores reais não estejam commited.

Amostra de achados de alto risco (exemplos, **não** divulgar valores sensíveis em público)

- [`.github/workflows/license-server-ci.yml`](.github/workflows/license-server-ci.yml#L113-L115): `DATABASE_URL` com `postgresql://giro:POSTGRES_PASSWORD_PLACEHOLDER@...` e `JWT_SECRET: JWT_SECRET_PLACEHOLDER` — indica credenciais de teste hardcoded em workflow.
- [`apps/desktop/src-tauri/src/main.rs`](apps/desktop/src-tauri/src/main.rs#L79-L88): `LICENSE_API_KEY` lido de env var; revisar histórico de commits se já houve valor padrão commitado.
- [`apps/desktop/src-tauri/src/commands/seed.rs`](apps/desktop/src-tauri/src/commands/seed.rs#L134): senha de seed `admin123` — apenas para teste, mas documentar e remover em produção.
- Vários `cert_password` em migrations e NFCE commands (p.ex. `apps/desktop/src-tauri/src/nfce/commands.rs`) — confirmar se valores reais estão em repositório.

Classificação de risco (amostra)

- Alto: chaves privadas (BEGIN PRIVATE KEY), certificados com senha, quaisquer credenciais de produção. (Nenhum BEGIN PRIVATE KEY real amostrado nas primeiras 200 linhas, mas varredura completa pode revelar.)
- Médio: tokens e senhas de teste hardcoded em workflows e seed data (ex.: `giro_test_password`, `admin123`, `test_secret_key_for_ci_only_do_not_use_in_production`).
- Baixo: hashes `integrity` em package-lock e pnpm-lock — não sensíveis.

Recomendações imediatas

1. Tratar e rotacionar qualquer credencial real encontrada (se aplicável).
2. Remover credenciais de workflows; usar `secrets` do GitHub Actions em vez de valores inline.
3. Substituir `trufflehog` devDependency por execução `npx trufflehog` ou `gitleaks` em CI, não como dependência fixa, e usar scanning não-interativo.
4. Executar scanner dedicado (`gitleaks` ou `gitleaks` container) para reduzir falsos positivos e gerar um relatório estruturado.
5. Adicionar `pre-commit`/CI secret-scanning que bloqueie commits contendo patterns sensíveis.

Próximo passo proposto

- Gerar relatório com as top 100 linhas relevantes (excluindo lockfile integrity matches) e apontar arquivos que precisam revisão imediata. Quer que eu gere esse relatório agora? Se sim, confirmo e linko o arquivo gerado em `REPORTS/`.

---

Arquivo de suporte:

- `REPORTS/secrets-grep.txt`
- `REPORTS/secrets-base64-grep.txt`
- `REPORTS/env-files.txt`
- `REPORTS/trufflehog-output.txt` (scan interativo — reexecutar em modo não interativo recomendado)

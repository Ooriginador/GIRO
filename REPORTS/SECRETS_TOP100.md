# SECRETS — Top Candidates (filtered)

Generated: 2026-01-20

Method: parsed grep outputs in REPORTS/ and filtered common false-positives (lockfile integrity hashes, pnpm/package-lock/Cargo.lock resolution integrity lines). Prioritized items by explicit-looking secrets, clear tokens, or hardcoded credentials.

Summary: found 36 notable candidates (lockfile integrity hashes suppressed). If you want the full top-100 including noise, request it; recommended next step is an automated scan with `gitleaks` and rotating any high-risk secrets listed here.

-- Prioritized Candidates --

1. [High] `.github/workflows/license-server-ci.yml` — `POSTGRES_PASSWORD: giro_test_password`
2. [High] `.github/workflows/license-server-ci.yml` — `DATABASE_URL: postgresql://giro:giro_test_password@localhost:5432/giro_licenses_test`
3. [High] `.github/workflows/license-server-ci.yml` — `JWT_SECRET: test_secret_key_for_ci_only_do_not_use_in_production`
4. [High] `.github/workflows/license-server-cd.yml` — `RAILWAY_TOKEN_STAGING` (referenced env variable; verify value in repo settings)
5. [High] `.github/workflows/license-server-cd.yml` — `RAILWAY_TOKEN` (referenced env variable)
6. [High] `.github/workflows/release.yml` — `TAURI_SIGNING_PRIVATE_KEY` (secret name used for signing)
7. [High] `.github/workflows/release.yml` — `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (secret name used for signing)
8. [High] `.github/workflows/release.yml` — `LICENSE_API_KEY` (secret name used in release workflow)
9. [High] `apps/desktop/src-tauri/src/services/backup_service.rs` — code contains `client_secret` and uses `creds.client_secret` in OAuth flows (inspect storage/commits for actual values)
10. [High] `apps/desktop/src-tauri/src/services/backup_service.rs` — hardcoded default password fallback: `let pwd = password.unwrap_or("giro-default-key");` (may be risky if used in production)
11. [High] `apps/desktop/src-tauri/src/services/backup_service.rs` — test/demo: `let password = "minha-senha-secreta";` (appears in tests/docs)
12. [High] `apps/desktop/src-tauri/src/main.rs` — reads `LICENSE_API_KEY` from env (verify not stored in repo)
13. [High] `apps/desktop/src-tauri/src/license/client.rs` — struct `api_key: String` (search for any values committed)
14. [High] `apps/desktop/src-tauri/src/nfce/commands.rs` & related — many references to `cert_password` (search history for concrete values)
15. [High] `apps/desktop/src-tauri/src/services/mobile_session.rs` — JWT secret usage: `secret: String` and generation paths (`with_random_secret()` used in tests), verify no production secret was committed
16. [Medium] `packages/database/prisma/seed.ts` — seeded test passwords: `admin123`, `gerente123` (default test credentials; rotate or remove for production seeds)
17. [Medium] `apps/desktop/src-tauri/src/commands/seed.rs` — `password: Some("admin123".to_string())` in seed data (same risk as above)
18. [Medium] `apps/desktop/src/components/nfce/__tests__/ContingencyManager.test.tsx` — `certPassword: 'password123'` in unit tests (test-only secrets)
19. [Medium] `apps/desktop/src-tauri/src/services/backup_service.rs` — many OAuth fields: `client_secret`, `access_token`, `refresh_token` (inspect persisted files/fixtures)
20. [Medium] `docs/deployment.md` & `docs/website/README.md` — list required secret names for CI/CD (`TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, `TAURI_SIGNING_PRIVATE_KEY` content, `LICENSE_API_KEY`) — ensure these are only stored as GitHub secrets
21. [Medium] `.github/workflows/license-server-cd.yml` — `password: ${{ secrets.GITHUB_TOKEN }}` (verify no plain tokens used inline)
22. [Low] `apps/desktop/src-tauri/src/repositories/employee_repository_test.rs` and other tests — many placeholder passwords like `senha123`, `test_secret`, `senha123` (test fixtures)
23. [Low] `apps/desktop/src-tauri/src/repositories/employee_repository.rs` — migration/code shows password hashing logic; ensure no raw plaintext left in migrations
24. [Low] `apps/desktop/src/hooks/__tests__/useAuth.test.tsx` — test tokens: `'abc123'`, `'xyz789'` (test fixtures)
25. [Low] `apps/desktop/src/lib/tauri.ts` — references to localStorage keys like `backup_token` (verify no production tokens committed in frontend source)
26. [Low] `apps/desktop/src-tauri/src/services/backup_service.rs` tests — usage `pwd = "giro-default-key"` at multiple places (could be default dev secret)
27. [Info] Found `.env` files: `apps/desktop/.env.example`, `apps/desktop/src-tauri/.env`, `apps/desktop/.env.local`, `packages/database/.env.example`, `packages/database/.env` — inspect these files for secrets; treat as high priority if values present
28. [Info] Many `integrity` and `sha512` lines from `package-lock.json` / `pnpm-lock.yaml` / `apps/desktop/package-lock.json` / `pnpm-lock.yaml` / `Cargo.lock` — treated as false-positives and suppressed
29. [Info] References to `GITHUB_TOKEN`, `GH_TOKEN`, `RAILWAY_TOKEN` and other secret names across workflows — ensure secrets are configured in the repo settings, not committed
30. [Info] `apps/desktop/src-tauri/src/services/mobile_handlers/auth.rs` and `mobile_server.rs` — token variables and session management; inspect persisted fixtures

-- Notes on filtering --

- Suppressed ~1000+ integrity/hash matches from lockfiles and registries (package-lock/pnpm-lock/Cargo.lock). These are noise for secret scanning and were excluded from Top list.
- The above list mixes: explicit hardcoded strings, test fixtures, environment files, and references to secret-names in CI. Each category has a different remediation priority.

-- Recommended Immediate Actions --

- High: Search and rotate any real secrets found in commit history (e.g., `giro_test_password`, `test_secret_key_for_ci_only_do_not_use_in_production`, any real `client_secret` or `access_token`). Use `git rev-list --objects --all | git grep --stdin` or `git filter-repo`/BFG to remove secrets from history.
- High: Replace any plaintext credentials in repo with environment references and store values in GitHub Actions Secrets / Railway / Vault.
- High: Inspect and remove or secure any `.env` files committed; move them to `.gitignore`.
- Medium: Replace seeded default passwords in `prisma/seed.ts` and `seed.rs` with generated secrets or remove from production seeds; document test fixtures separately.
- Medium: Add `gitleaks` and/or `trufflehog` to CI with a baseline allow-list to catch future leaks; run `gitleaks detect --source . --redact` locally.
- Low: Replace test fixtures containing obvious passwords with non-sensitive placeholders and ensure they do not leak to production builds.

-- Suggested next scans --

- Run gitleaks: `npx gitleaks detect -v --source . --report REPORTS/gitleaks-report.json`
- Run trufflehog (non-interactive) if you still want results: `npx trufflehog filesystem --json . > REPORTS/trufflehog.json`
- If you want me to proceed, I can: (A) generate the Top-100 including suppressed noise, (B) run `gitleaks` here, or (C) prepare a removal/rotation playbook and `git filter-repo` commands.

-- Report produced by automation step from grep outputs. To continue: choose one of the suggested next scans or ask me to expand this to full 100 ranked items including lockfile noise.

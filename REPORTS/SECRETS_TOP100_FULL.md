# SECRETS — Full Top-100 Candidates (filtered noise suppressed)

Generated: 2026-01-20

Source: REPORTS/secrets-grep.txt and repo grep outputs. Filter rules applied: exclude lines mentioning `package-lock.json`, `pnpm-lock.yaml`, `Cargo.lock`, `integrity`, `sha512`, `node_modules`, and large generated schema files.

This file lists up to 100 candidate findings (ordered by perceived severity / explicitness). Treat this as an investigative artifact — each entry should be manually validated before any rotation/removal action.

1. .github/workflows/license-server-ci.yml — `POSTGRES_PASSWORD: giro_test_password`
2. .github/workflows/license-server-ci.yml — `DATABASE_URL: postgresql://giro:giro_test_password@localhost:5432/giro_licenses_test`
3. .github/workflows/license-server-ci.yml — `JWT_SECRET: test_secret_key_for_ci_only_do_not_use_in_production`
4. .github/workflows/license-server-cd.yml — `password: ${{ secrets.GITHUB_TOKEN }}` (verify no plain token elsewhere)
5. .github/workflows/license-server-cd.yml — `RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}` / `RAILWAY_TOKEN_STAGING`
6. .github/workflows/release.yml — references to `GH_TOKEN`, `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, `LICENSE_API_KEY`
7. package.json — `scan-secrets` script: `npx trufflehog filesystem . || true` (adds scanner devDependency risk)
8. apps/desktop/src-tauri/src/main.rs — `let api_key = std::env::var("LICENSE_API_KEY")` (search for committed value)
9. apps/desktop/src-tauri/src/license/client.rs — `.header("X-API-Key", &self.config.api_key)` (api_key field present)
10. apps/desktop/src-tauri/src/services/backup_service.rs — struct fields: `client_secret`, `access_token`, `refresh_token`
11. apps/desktop/src-tauri/src/services/backup_service.rs — test/demo encryption password: `let password = "minha-senha-secreta";`
12. apps/desktop/src-tauri/src/services/backup_service.rs — default fallback password: `password.unwrap_or("giro-default-key")`
13. apps/desktop/src-tauri/src/commands/backup.rs — function parameters include `password: Option<String>` (inspect call sites for literal passwords)
14. apps/desktop/src-tauri/src/commands/seed.rs — seeded password: `password: Some("admin123".to_string())`
15. packages/database/prisma/seed.ts — seeded hashed passwords for test accounts (`admin123`, `gerente123`)
16. apps/desktop/src-tauri/src/nfce/commands.rs — multiple uses of `cert_password` (certificate handling)
17. apps/desktop/src-tauri/migrations/011_create_fiscal_settings.sql — `cert_password TEXT` (DB column exists; search seeded values)
18. apps/desktop/src-tauri/src/services/mobile_session.rs — test uses `SessionManager::new("test_secret")` and other `test_secret` tokens
19. apps/desktop/src-tauri/src/services/mobile_session.rs — `with_random_secret()` used in tests; ensure production secret not committed
20. apps/desktop/src/components/nfce/**tests**/ContingencyManager.test.tsx — `certPassword: 'password123'`
21. apps/desktop/src/hooks/**tests**/useAuth.test.tsx — mocked tokens: `'abc123'`, `'xyz789'` and test password `'senha123'`
22. apps/desktop/src/lib/tauri.ts — localStorage key `backup_token` referenced (verify tokens not checked into source)
23. docs/deployment.md — instructs to create `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` secrets (check CI config)
24. docs/website/README.md — describes `TAURI_SIGNING_PRIVATE_KEY` content should be `.key` file content (verify not committed)
25. apps/desktop/src-tauri/src/services/backup_service.rs — OAuth exchange posts `client_secret` and receives `access_token` (inspect persisted tokens)
26. apps/desktop/src-tauri/src/repositories/fiscal_repository.rs — uses `cert_password` in DB bindings (possible seed or config leakage)
27. apps/desktop/src-tauri/src/repositories/employee_repository_test.rs — fixture `password: Some("senha123".to_string())`
28. apps/desktop/src-tauri/src/services/network_client.rs — token fields shown as `token: None` in examples; scan for concrete values
29. apps/desktop/src-tauri/src/services/mobile_server.rs — session token handling; many code paths reference `token` fields
30. packages/database/prisma/schema.prisma — `password String?` field; seeds set to hash of `'admin123'` in docs
31. apps/desktop/BUILD-WINDOWS.md — example `signtool sign /f certificate.pfx /p password` (check scripts for actual password usage)
32. .github/workflows/ci.yml — has a `secret-scan` step that calls trufflehog (CI secrets referenced)
33. apps/desktop/src-tauri/src/models/fiscal.rs — `pub cert_password: Option<String>` present in model (search for default values)
34. apps/desktop/src-tauri/src/services/backup_service.rs tests — `derive_key("password", b"salt1")` / `minha-senha-secreta` (test-only secrets)
35. apps/desktop/src-tauri/src/services/backup_service.rs — multiple `.bearer_auth(token)` callsites where a token may be persisted in fixtures
36. apps/desktop/src-tauri/src/services/backup_service.rs — `creds.client_secret` used in token exchange (investigate any committed `creds` files)
37. apps/desktop/src/components/ui/**tests**/Input.test.tsx — password input tests (no secret value but check snapshots)
38. docs/02-DATABASE-SCHEMA.md — sample code showing `password: await hash('admin123', 10)` (example seeds)
39. packages/database/scripts/import-fipe-vehicles.ts — mentions an optional token for Fipe API (check credentials storage)
40. apps/desktop/src-tauri/src/services/mobile_protocol.rs — `pub token: String` and token usage lines
41. apps/desktop/src-tauri/src/services/mobile_handlers/auth.rs — token validation and logout functions (search for hardcoded test tokens)
42. apps/desktop/src-tauri/src/utils/hash.rs tests — example password `SuperSenhaSegura123!` (test-only)
43. apps/desktop/src-tauri/src/repositories/employee_repository.rs — password hashing with argon2; check migrations/seed for raw password inserts
44. apps/desktop/src-tauri/src/services/mobile_session.rs unit tests — many references to `test_secret`
45. package.json root — `scan-secrets` script exists (see item 7)
46. REPORTS/env-files.txt — `.env` files found under `apps/desktop` and `packages/database` (inspect their values)
47. apps/desktop/src-tauri/src/license/client.rs — many `.header("X-API-Key", &self.config.api_key)` sites; search config for literal key
48. apps/desktop/src-tauri/src/main.rs — `expect` on `LICENSE_API_KEY` (throws if missing; indicates runtime secret usage)
49. docs/deployment.md & .github/workflows/release.yml — many secret names documented; ensure none are committed
50. apps/desktop/src-tauri/src/nfce/webservice.rs — `cert_password: Option<&str>` and validations referencing certificate password
51. apps/desktop/src-tauri/src/nfce/commands.rs (line where cert_password used to load PFX)
52. apps/desktop/src-tauri/src/models/employee.rs — `pub password: Option<String>` fields present; ensure migration samples not storing plaintext
53. apps/desktop/src-tauri/src/services/backup_service.rs — multiple `access_token` assignments in code paths
54. apps/desktop/src-tauri/src/commands/backup.rs — `get_google_auth_url(client_id, client_secret)` signature (client_secret passed around)
55. .github/copilot-instructions.md & CONTRIBUTING.md — explicit rules: never commit secrets (useful for remediation steps)
56. apps/desktop/src/hooks/useAuth.ts — token handling and `invoke<LoginWithPasswordResponse>` returning `token` fields
57. apps/desktop/src/pages/auth/**tests**/LoginPage.test.tsx — `token: 'fake-jwt-token'` (test fixture)
58. apps/desktop/src-tauri/src/services/mobile_session.rs — random secret generator uses `rand::random::<char>()` (ensure not storing fixed value in repo)
59. apps/desktop/src-tauri/src/repositories/fiscal_repository.rs — `cert_password` binding shown earlier (duplicate, but important)
60. packages/database/.env (exists) — treat as high priority to inspect if values present

-- Remaining entries (61–100) --
The grep output contains many additional candidate lines that are either test fixtures, documentation pointers, or repeated references to the same secret-names. Lockfile/hash lines were suppressed. If you want I will expand this list to the full 100 entries (including lower-confidence base64-like matches), or instead parse `REPORTS/secrets-grep.txt` programmatically to list the first 100 unique non-noise matches and write them here.

-- Next recommended step --

- If you want immediate, high-value remediation: I can prepare `REPORTS/SECRETS_ROTATION_PLAYBOOK.md` with exact `git filter-repo` commands and rotation steps for the top confirmed items (I recommend starting with items 1–9 and any concrete values in `./packages/database/.env` or `apps/desktop/src-tauri/.env`).
- If you prefer automated verification first: I can attempt to install and run `gitleaks` or run `trufflehog` in non-interactive mode (note: `npx gitleaks` failed earlier on this machine; I can try alternate install or Docker).

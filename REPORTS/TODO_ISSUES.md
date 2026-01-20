# Ambiguous TODOs & Placeholders — Converted to Local Issues

Este arquivo lista itens que exigem decisão humana (placeholders, TODOs ambíguos, templates) e os converte em issues locais sugeridas. Crie issues no tracker com estes dados quando apropriado.

1. Title: Clarify `docs/templates/STRUCTURE_INIT.md` project placeholders

   - Path: `docs/templates/STRUCTURE_INIT.md`
   - Description: Template contém `<PROJECT_NAME>` e instruções genéricas que exigem contexto do produto. Definir valores de exemplo e orientações claras para mantenedores.
   - Suggested owner: Documentation / Architecture
   - Priority: Medium

2. Title: Replace ambiguous uninstall checklist steps

   - Path: `docs/UNINSTALL-GUIDE.md`
   - Description: Alguns itens originalmente marcados como "TODO" foram esclarecidos, mas revisar checklist para alinhamento com políticas de dados (ex.: backups, logs, migrações).
   - Suggested owner: DevOps / Product
   - Priority: High

3. Title: Move CI hardcoded secrets to GitHub Secrets

   - Path: `.github/workflows/license-server-ci.yml`
   - Description: Substituí valores hardcoded por referências a `secrets`. Verificar e rotacionar credenciais existentes (`POSTGRES_PASSWORD`, `DATABASE_URL`, `JWT_SECRET`) e documentar procedimento de setup no README do serviço.
   - Suggested owner: DevOps / Security
   - Priority: High

4. Title: Audit test fixtures for sensitive literals

   - Path examples: `apps/desktop/src-tauri/src/repositories/employee_repository_test.rs`, `apps/desktop/src/hooks/__tests__/useAuth.test.tsx`, `apps/desktop/src-tauri/src/services/mobile_session.rs`
   - Description: Padronizar fixtures de teste para usar constantes não-sensíveis (`TEST_PASSWORD`, `TEST_TOKEN`, `TEST_SECRET`). Rever histórico git para detectar commits com real credentials.
   - Suggested owner: QA / Security
   - Priority: High

5. Title: Sanitize templates with `[NOME_DO_PROJETO]` and similar tokens

   - Path: `docs/templates/*`
   - Description: Replace generic tokens with clear placeholders and examples; add contributor notes on how to fill them.
   - Suggested owner: Documentation
   - Priority: Medium

6. Title: Verify hardware mocking and E2E requirements
   - Path: `docs/HARDWARE-IMPLEMENTATION.md`, `apps/desktop/README-HARDWARE.md`
   - Description: Items reference hardware mocks and test harness; decide which mocks remain and document CI simulation steps.
   - Suggested owner: QA / Hardware
   - Priority: Medium

---

Notes:

- Este arquivo foi gerado automaticamente após uma varredura por `TODO|FIXME|placeholder|mock`.
- Para cada item, recomenda-se criar uma issue com a descrição acima e linkar PRs que implementarem as mudanças não-ambíguas.

## PDV — Instruções para executar E2E (Playwright)

Passos rápidos para executar os testes E2E do PDV localmente (inclui o teste `sale-mixed-pix.spec.ts`).

1. Preparar ambiente

   cd GIRO/apps/desktop
   pnpm install

2. Iniciar aplicação (web server esperado pelo Playwright)

Terminal 1 (aplicação):
cd GIRO/apps/desktop
pnpm dev -- --host 127.0.0.1 --port 1420

3. (Se necessário) Rodar backend/tauri local para endpoints IPC

Terminal 2 (tauri/backend):
cd GIRO/apps/desktop/src-tauri
cargo run

4. Executar Playwright (apenas testes E2E do desktop)

   cd GIRO/apps/desktop
   pnpm install # se ainda não instalado
   pnpm test:e2e

Observações:

- O `playwright.config.ts` define `testDir: './tests/e2e'` e um `globalSetup` que injeta estado de autenticação.
- Para executar apenas o novo teste:

  npx playwright test tests/e2e/sale-mixed-pix.spec.ts --project=chromium

- Logs e relatórios são gerados em `playwright-report/` conforme a configuração.

Opções que posso executar agora:

1. Adicionar script `pnpm test:e2e` em `GIRO/apps/desktop/package.json`.
2. Executar os testes aqui e reportar resultados.

import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

/**
 * Configuração específica para simulação de carga de 10 PCs.
 * Executa testes em paralelo com 10 workers.
 */
export default defineConfig({
  testDir: './tests/e2e',
  // Apenas o arquivo de simulação
  testMatch: 'simulation-10pc.spec.ts',

  // Executar tudo em paralelo para simular a rede simultânea
  fullyParallel: true,

  // 10 workers = 10 PCs simulados simultaneamente
  workers: 10,

  // Tenta rodar apenas 1 vez, sem retries para simular fluxo contínuo
  retries: 0,

  // Relatório simples
  reporter: [['list'], ['html', { outputFolder: 'simulation-report', open: 'never' }]],

  // Timeout global alto para permitir simulações longas (padrão 2 horas aqui, configurável)
  globalTimeout: 120 * 60 * 1000,

  // Timeout de cada teste individual (2 horas)
  timeout: 120 * 60 * 1000,

  // Reutiliza o servidor de desenvolvimento existente para economia de recursos
  webServer: {
    command: 'pnpm dev -- --host 127.0.0.1 --port 1420',
    url: 'http://127.0.0.1:1420',
    reuseExistingServer: true,
    stdout: 'ignore',
    stderr: 'pipe',
  },

  use: {
    baseURL: 'http://127.0.0.1:1420',
    trace: 'retain-on-failure',
    screenshot: 'on',
    video: 'on-first-retry',
    viewport: { width: 1280, height: 720 },

    // Ignora erros de certificado https se houver
    ignoreHTTPSErrors: true,

    // Storage state pré-autenticado se disponível,
    // mas a simulação fará login explícito para garantir realismo
    storageState: undefined,
  },

  projects: [
    {
      name: 'network-simulation',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

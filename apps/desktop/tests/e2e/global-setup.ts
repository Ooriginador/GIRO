import type { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Global setup para E2E: gera um arquivo de storageState para evitar a tela de ativação
export default async function globalSetup(config: FullConfig) {
  try {
    const baseURL = config.projects?.[0]?.use?.baseURL ?? 'http://127.0.0.1:1420';

    const licenseState = {
      licenseKey: 'TEST-LOCAL-KEY',
      licenseInfo: {
        status: 'active',
        expires_at: '2099-01-01T00:00:00.000Z',
        metadata: {},
      },
      lastValidation: new Date().toISOString(),
    };

    const storage = {
      origins: [
        {
          origin: baseURL,
          localStorage: [
            {
              name: 'giro-license',
              value: JSON.stringify(licenseState),
            },
            // Seed the web mock DB so the browser-mode backend has an admin
            // employee available for Playwright E2E tests.
            {
              name: '__giro_web_mock_db__',
              value: JSON.stringify({
                employees: [
                  {
                    id: 'seed-admin',
                    name: 'Administrador Semente',
                    role: 'ADMIN',
                    pin: '8899',
                    isActive: true,
                  },
                ],
                currentCashSession: null,
                cashSessionHistory: [],
              }),
            },
          ],
        },
      ],
    };

    // Escrever o arquivo no diretório onde este setup vive (mais robusto em diferentes CWD)
    const outPath = path.resolve(__dirname, '.auth-storage.json');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(storage, null, 2), { encoding: 'utf8' });
    // Também tenta escrever em ./tests/e2e relative ao CWD, pois o ambiente de execução
    // do Playwright pode variar entre processos.
    try {
      const altOut = path.resolve(process.cwd(), 'tests/e2e/.auth-storage.json');
      fs.mkdirSync(path.dirname(altOut), { recursive: true });
      fs.writeFileSync(altOut, JSON.stringify(storage, null, 2), { encoding: 'utf8' });
    } catch {
      // ignore
    }
  } catch {
    // Se por qualquer razão não for possível escrever o arquivo, não falhar o setup.
  }
}

# 📦 Build - Roadmap do Agente

> **Projeto**: GIRO Mobile  
> **Responsabilidade**: EAS Build, distribuição e release

---

## 📋 Tarefas

### Fase 1: Configuração EAS

#### TASK-BUILD-001: Setup EAS Build

- **Prioridade**: 🔴 Crítica
- **Estimativa**: 1.5h
- **Dependências**: TASK-SETUP-006
- **Status**: ⬜ Não iniciado

**Descrição**:
Configurar EAS Build para builds Android e iOS.

**Critérios de Aceite**:

- [ ] EAS CLI instalado
- [ ] Projeto registrado no Expo
- [ ] eas.json configurado
- [ ] Build profiles definidos

**Comandos**:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure
```

**Arquivo**: `eas.json`

```json
{
  "cli": {
    "version": ">= 7.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "gradleCommand": ":app:assembleDebug",
        "buildType": "apk"
      },
      "ios": {
        "simulator": true
      },
      "env": {
        "EXPO_PUBLIC_APP_VARIANT": "development"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_APP_VARIANT": "preview"
      }
    },
    "production": {
      "distribution": "store",
      "android": {
        "buildType": "app-bundle"
      },
      "env": {
        "EXPO_PUBLIC_APP_VARIANT": "production"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-services.json",
        "track": "internal"
      },
      "ios": {
        "appleId": "your@email.com",
        "ascAppId": "1234567890"
      }
    }
  }
}
```

---

#### TASK-BUILD-002: Configurar App Signing

- **Prioridade**: 🔴 Crítica
- **Estimativa**: 1h
- **Dependências**: TASK-BUILD-001
- **Status**: ⬜ Não iniciado

**Descrição**:
Configurar assinatura de apps para Android e iOS.

**Critérios de Aceite**:

- [ ] Keystore Android gerado e armazenado no EAS
- [ ] Certificados iOS configurados (se aplicável)
- [ ] Credenciais seguras no Expo

**Comandos**:

```bash
# Generate and store Android keystore
eas credentials

# For Android, let EAS manage credentials
eas build --platform android --profile production
```

---

### Fase 2: Build Profiles

#### TASK-BUILD-003: Build de Desenvolvimento

- **Prioridade**: 🟡 Alta
- **Estimativa**: 30min
- **Dependências**: TASK-BUILD-001
- **Status**: ⬜ Não iniciado

**Descrição**:
Configurar build de desenvolvimento com dev client.

**Critérios de Aceite**:

- [ ] APK de dev gerado
- [ ] Hot reload funcionando
- [ ] Debug tools habilitados

**Comandos**:

```bash
# Build development APK
eas build --platform android --profile development

# Start development server
npx expo start --dev-client
```

---

#### TASK-BUILD-004: Build de Preview/QA

- **Prioridade**: 🟡 Alta
- **Estimativa**: 30min
- **Dependências**: TASK-BUILD-001
- **Status**: ⬜ Não iniciado

**Descrição**:
Build para testes internos e QA.

**Critérios de Aceite**:

- [ ] APK de preview gerado
- [ ] Distribuição interna configurada
- [ ] QR code para instalação

**Comandos**:

```bash
# Build preview APK
eas build --platform android --profile preview

# After build, share link with QA team
```

---

### Fase 3: Distribuição

#### TASK-BUILD-005: Setup de Distribuição Interna

- **Prioridade**: 🟡 Alta
- **Estimativa**: 1h
- **Dependências**: TASK-BUILD-004
- **Status**: ⬜ Não iniciado

**Descrição**:
Configurar distribuição interna para clientes.

**Critérios de Aceite**:

- [ ] Landing page de download
- [ ] QR code de instalação
- [ ] Instruções de instalação
- [ ] Versionamento visível

**Arquivo**: `docs/INSTALL_MOBILE.md`

```markdown
# 📱 Instalação do GIRO Mobile

## Android

### Opção 1: QR Code

Escaneie o QR code abaixo com a câmera do seu celular:

[QR Code será inserido aqui após o build]

### Opção 2: Link Direto

Acesse o link abaixo no seu celular Android:
https://expo.dev/artifacts/eas/[BUILD_ID].apk

### Instruções de Instalação

1. **Permitir instalação de fontes desconhecidas**
   - Vá em Configurações > Segurança
   - Ative "Fontes desconhecidas" ou "Instalar apps desconhecidos"

2. **Baixar o APK**
   - Clique no link ou escaneie o QR code
   - Aguarde o download completar

3. **Instalar o app**
   - Abra o arquivo APK baixado
   - Clique em "Instalar"
   - Aguarde a instalação

4. **Abrir o GIRO Mobile**
   - Encontre o ícone do app na gaveta de aplicativos
   - Abra e siga as instruções de conexão

## Requisitos Mínimos

- Android 6.0 (API 23) ou superior
- 100MB de espaço livre
- Câmera para scanner
- WiFi para conexão com desktop

## Problemas Comuns

### "App não instalado"

- Verifique se tem espaço suficiente
- Desinstale versão anterior se existir
- Reinicie o dispositivo e tente novamente

### "Conexão não encontrada"

- Verifique se o desktop GIRO está ligado
- Confirme que está na mesma rede WiFi
- Verifique se o firewall não está bloqueando

## Suporte

Em caso de problemas, entre em contato:

- Email: suporte@arkheion-tiktrend.com.br
- WhatsApp: (XX) XXXXX-XXXX
```

**Script de geração de página de download**: `scripts/generate-download-page.sh`

```bash
#!/bin/bash

# Get latest build URL from EAS
BUILD_URL=$(eas build:list --platform android --status finished --limit 1 --json | jq -r '.[0].artifacts.buildUrl')
BUILD_VERSION=$(eas build:list --platform android --status finished --limit 1 --json | jq -r '.[0].appVersion')

# Generate QR code
qrencode -o docs/installer/qr-code.png "$BUILD_URL"

# Update download page
cat > docs/installer/index.html << EOF
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GIRO Mobile - Download</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 min-h-screen flex items-center justify-center p-4">
  <div class="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
    <img src="logo.png" alt="GIRO" class="w-24 h-24 mx-auto mb-4">
    <h1 class="text-2xl font-bold text-gray-900 mb-2">GIRO Mobile</h1>
    <p class="text-gray-600 mb-6">Versão $BUILD_VERSION</p>

    <div class="mb-6">
      <img src="qr-code.png" alt="QR Code" class="w-48 h-48 mx-auto">
      <p class="text-sm text-gray-500 mt-2">Escaneie para baixar</p>
    </div>

    <a href="$BUILD_URL" class="block w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
      Baixar APK
    </a>

    <p class="text-xs text-gray-400 mt-6">
      Apenas para Android 6.0+
    </p>
  </div>
</body>
</html>
EOF

echo "Download page generated at docs/installer/index.html"
```

---

## 📊 Resumo

| Fase           | Tarefas | Estimativa |
| -------------- | ------- | ---------- |
| EAS Setup      | 2       | 2.5h       |
| Build Profiles | 2       | 1h         |
| Distribuição   | 1       | 1h         |
| **Total**      | **5**   | **4.5h**   |

---

## 🔄 Pipeline de Release

```
┌─────────────────────────────────────────────────────────────┐
│                     Release Pipeline                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Code Push to main                                        │
│         │                                                    │
│         ▼                                                    │
│  2. GitHub Actions                                           │
│     ├── Run Tests                                            │
│     ├── Lint & Type Check                                    │
│     └── Build Preview (if tests pass)                        │
│         │                                                    │
│         ▼                                                    │
│  3. EAS Build (preview profile)                              │
│     └── Generate APK                                         │
│         │                                                    │
│         ▼                                                    │
│  4. Internal Testing                                         │
│     └── QA Team validates                                    │
│         │                                                    │
│         ▼                                                    │
│  5. Tag Release (v0.1.0)                                     │
│         │                                                    │
│         ▼                                                    │
│  6. EAS Build (production profile)                           │
│     └── Generate signed APK/AAB                              │
│         │                                                    │
│         ▼                                                    │
│  7. Update Download Page                                     │
│     └── Generate QR code & landing page                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 GitHub Actions Workflow

**Arquivo**: `.github/workflows/mobile-build.yml`

```yaml
name: Mobile Build

on:
  push:
    branches: [main]
    paths:
      - "giro-mobile/**"
  pull_request:
    branches: [main]
    paths:
      - "giro-mobile/**"

jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: giro-mobile
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: giro-mobile/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Lint
        run: npm run lint

      - name: Run tests
        run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: giro-mobile/coverage/lcov.info

  build-preview:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: giro-mobile
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        run: npm ci

      - name: Build preview
        run: eas build --platform android --profile preview --non-interactive

      - name: Get build URL
        id: build
        run: |
          BUILD_URL=$(eas build:list --platform android --status finished --limit 1 --json | jq -r '.[0].artifacts.buildUrl')
          echo "url=$BUILD_URL" >> $GITHUB_OUTPUT

      - name: Comment PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '📱 **Preview Build Ready**\n\nDownload: ${{ steps.build.outputs.url }}'
            })
```

---

## ✅ Checklist Final

- [ ] EAS configurado e funcionando
- [ ] Keystore Android gerado
- [ ] Build de desenvolvimento funcionando
- [ ] Build de preview funcionando
- [ ] Distribuição interna configurada
- [ ] Página de download gerada
- [ ] GitHub Actions configurado
- [ ] Documentação de instalação completa

---

## 🚀 Comandos de Release

```bash
# 1. Criar build de preview para testes
eas build --platform android --profile preview

# 2. Após testes, criar build de produção
eas build --platform android --profile production

# 3. Gerar página de download
./scripts/generate-download-page.sh

# 4. Fazer upload da página (ex: GitHub Pages, Vercel)
# Configure conforme seu hosting
```

---

_Última atualização: Janeiro 2026_

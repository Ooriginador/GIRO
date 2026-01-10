# 📦 GIRO Mobile - Guia de Build

> Instruções para compilar e distribuir o GIRO Mobile

---

## 📋 Pré-requisitos

### Contas Necessárias

1. **Expo Account**: Criar em https://expo.dev
2. **EAS CLI**: Instalado globalmente

```bash
npm install -g eas-cli
eas login
```

### Configuração Inicial

```bash
# Navegar para o projeto
cd giro-mobile

# Instalar dependências
pnpm install

# Verificar configuração
eas whoami
```

---

## 🏗️ Profiles de Build

### 1. Development (Debug)

Para desenvolvimento com hot reload e ferramentas de debug.

```bash
pnpm run build:dev
# ou
eas build --platform android --profile development
```

**Características:**

- APK com dev client
- Hot reload habilitado
- Debug tools disponíveis
- Tamanho maior (~50MB)

### 2. Preview (QA/Testing)

Para testes internos e QA.

```bash
pnpm run build:preview
# ou
eas build --platform android --profile preview
```

**Características:**

- APK otimizado
- Sem debug tools
- Para distribuição interna
- Tamanho médio (~30MB)

### 3. Production (Release)

Para publicação na Play Store.

```bash
pnpm run build:prod
# ou
eas build --platform android --profile production
```

**Características:**

- AAB (App Bundle)
- Otimização máxima
- Assinatura de produção
- Tamanho mínimo (~20MB)

---

## 🔐 Gerenciamento de Credenciais

### Credenciais Gerenciadas pelo EAS (Recomendado)

```bash
# Gerar e armazenar keystore automaticamente
eas credentials

# Selecionar: Android > Keystore > Generate new keystore
```

### Credenciais Locais (Avançado)

```bash
# Gerar keystore manualmente
keytool -genkeypair -v -keystore giro-mobile.keystore \
  -alias giro-mobile -keyalg RSA -keysize 2048 -validity 10000

# Configurar em eas.json
{
  "build": {
    "production": {
      "android": {
        "credentialsSource": "local"
      }
    }
  }
}
```

---

## 📤 Distribuição

### Distribuição Interna (Preview)

```bash
# Build e obter link de download
eas build --platform android --profile preview

# Após build, compartilhar link ou QR code
# Link disponível em: https://expo.dev/accounts/[usuario]/projects/giro-mobile/builds
```

### Play Store (Production)

```bash
# Build + Submit
eas build --platform android --profile production
eas submit --platform android

# Ou em um comando
eas build --platform android --profile production --auto-submit
```

---

## 🔄 CI/CD com GitHub Actions

### Workflow Exemplo

```yaml
# .github/workflows/build.yml
name: Build Android

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install

      - uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: \${{ secrets.EXPO_TOKEN }}

      - name: Build Preview
        if: github.event_name == 'pull_request'
        run: eas build --platform android --profile preview --non-interactive

      - name: Build Production
        if: github.ref == 'refs/heads/main'
        run: eas build --platform android --profile production --non-interactive
```

### Secrets Necessários

| Secret       | Descrição               |
| ------------ | ----------------------- |
| `EXPO_TOKEN` | Token de acesso do Expo |

```bash
# Gerar token
eas credentials:configure-build
```

---

## 🧪 Testes Antes do Build

```bash
# Executar todos os testes
pnpm test

# Verificar tipos
pnpm typecheck

# Lint
pnpm lint

# Coverage
pnpm test:coverage
```

---

## 📊 Monitoramento de Builds

### Dashboard EAS

https://expo.dev/accounts/[usuario]/projects/giro-mobile/builds

### Comandos Úteis

```bash
# Listar builds recentes
eas build:list

# Cancelar build em andamento
eas build:cancel

# Ver detalhes de um build
eas build:view [build-id]

# Download do APK/AAB
eas build:download
```

---

## ⚠️ Troubleshooting

### Erro: "Keystore not found"

```bash
eas credentials
# Selecionar: Setup new keystore
```

### Erro: "Build failed - Gradle error"

```bash
# Limpar cache
cd android && ./gradlew clean && cd ..

# Rebuild
eas build --platform android --profile preview --clear-cache
```

### Erro: "Out of memory"

Adicionar em `eas.json`:

```json
{
  "build": {
    "production": {
      "android": {
        "resourceClass": "large"
      }
    }
  }
}
```

---

## 📝 Checklist de Release

- [ ] Testes passando (`pnpm test`)
- [ ] TypeScript sem erros (`pnpm typecheck`)
- [ ] Lint sem erros (`pnpm lint`)
- [ ] Versão atualizada em `app.config.ts`
- [ ] Changelog atualizado
- [ ] Build preview testado
- [ ] Build production gerado
- [ ] APK/AAB baixado e testado
- [ ] Distribuído para stakeholders

---

_Última atualização: Janeiro 2026_

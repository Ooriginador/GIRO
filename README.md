# 🏪 GIRO - Sistema PDV Completo

<div align="center">

![GIRO Logo](https://img.shields.io/badge/GIRO-PDV-B76E79?style=for-the-badge)
[![Tauri](https://img.shields.io/badge/Tauri-2.2-24C8DB?style=for-the-badge&logo=tauri)](https://tauri.app)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![Rust](https://img.shields.io/badge/Rust-1.83-orange?style=for-the-badge&logo=rust)](https://www.rust-lang.org)
[![Expo](https://img.shields.io/badge/Expo-52-000020?style=for-the-badge&logo=expo)](https://expo.dev)

**Sistema de Ponto de Venda completo com aplicações Desktop e Mobile**

[🚀 Começar](#-instalação) • [📖 Documentação](#-documentação) • [🛠️ Desenvolvimento](#-desenvolvimento) • [🤝 Contribuir](#-contribuindo)

</div>

---

## 📋 Sobre o Projeto

GIRO é um sistema completo de Ponto de Venda (PDV) desenvolvido com tecnologias modernas, oferecendo soluções tanto para Desktop (Windows/Linux) quanto Mobile (iOS/Android).

### ✨ Características Principais

- 🖥️ **Desktop Nativo**: Aplicação Tauri com React + TypeScript
- 📱 **Mobile Cross-Platform**: Expo com React Native
- 🦀 **Backend Rust**: Performance e segurança garantidas
- 💾 **Banco de Dados SQLite**: Leve e eficiente com Prisma ORM
- 🔐 **Autenticação Robusta**: JWT + bcrypt
- 🖨️ **Hardware Integrado**: Impressoras térmicas, balanças, scanners
- 📊 **Relatórios Avançados**: Analytics e dashboards
- 🔄 **Sincronização**: Dados entre desktop e mobile
- 🎨 **UI Moderna**: TailwindCSS + Radix UI

---

## 🏗️ Arquitetura

```
GIRO/
├── apps/
│   ├── desktop/          # Aplicação Tauri (React + Rust)
│   │   ├── src/          # Frontend React
│   │   ├── src-tauri/    # Backend Rust
│   │   └── tests/        # Testes E2E com Playwright
│   └── giro-mobile/      # Aplicação Expo (React Native)
├── packages/
│   └── database/         # Schema Prisma compartilhado
├── docs/                 # Documentação completa
└── scripts/              # Scripts de build e deploy
```

### 🔧 Stack Tecnológica

#### Desktop

- **Frontend**: React 18, TypeScript, TailwindCSS, Radix UI
- **Backend**: Rust, Tauri 2.2, SQLx, Tokio
- **Database**: SQLite com Prisma
- **Testes**: Playwright, Vitest

#### Mobile

- **Framework**: Expo 52, React Native
- **UI**: React Native Paper, NativeWind
- **State**: Zustand
- **Testes**: Jest, React Native Testing Library

---

## 🚀 Instalação

### Pré-requisitos

- **Node.js** 20+
- **pnpm** 9+
- **Rust** 1.83+
- **Git**

#### Desktop (Windows)

```bash
# Instalar dependências do sistema
.\apps\desktop\setup_windows.sh

# Instalar dependências do projeto
pnpm install

# Configurar banco de dados
cd packages/database
pnpm prisma generate
pnpm prisma db push
```

#### Desktop (Linux)

```bash
# Instalar dependências
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev \
  build-essential curl wget libssl-dev \
  libgtk-3-dev libayatana-appindicator3-dev \
  librsvg2-dev libsqlite3-dev

pnpm install
cd packages/database && pnpm prisma generate && pnpm prisma db push
```

#### Mobile

```bash
cd giro-mobile
pnpm install
pnpm expo prebuild
```

---

## 💻 Desenvolvimento

### Desktop

```bash
# Modo desenvolvimento
cd apps/desktop
pnpm tauri dev

# Build de produção
pnpm tauri build

# Testes E2E
pnpm test:e2e

# Testes unitários
pnpm test
```

### Mobile

```bash
cd giro-mobile

# Desenvolvimento iOS
pnpm ios

# Desenvolvimento Android
pnpm android

# Testes
pnpm test
```

---

## 📦 Build de Produção

### Desktop Windows

```bash
cd apps/desktop
.\build-windows.sh
```

Gera instalador em `src-tauri/target/release/bundle/`

### Mobile

```bash
cd giro-mobile

# Build de produção
eas build --platform android
eas build --platform ios
```

---

## 🎯 Funcionalidades

### ✅ Módulos Implementados

- [x] Autenticação e Autorização (Roles: Admin, Caixa, Gerente)
- [x] Gestão de Produtos e Categorias
- [x] Controle de Estoque (entrada, saída, ajustes)
- [x] Cadastro de Clientes e Fornecedores
- [x] PDV completo (vendas, pagamentos múltiplos)
- [x] Integração com hardware (impressoras térmicas, balanças)
- [x] Relatórios e Analytics
- [x] Configurações do sistema
- [x] Sincronização Desktop ↔ Mobile
- [x] Sistema de Garantias
- [x] Backup e Restore

### 🚧 Em Desenvolvimento

- [ ] NF-e / NFC-e (Nota Fiscal Eletrônica)
- [ ] Integração com sistemas de pagamento (PIX, cartões)
- [ ] App mobile offline-first completo
- [ ] Dashboard web para gestão remota

---

## 📖 Documentação

Documentação completa disponível em [`/docs`](./docs/):

- [**00-OVERVIEW.md**](./docs/00-OVERVIEW.md) - Visão geral do projeto
- [**01-ARQUITETURA.md**](./docs/01-ARQUITETURA.md) - Decisões arquiteturais
- [**02-DATABASE-SCHEMA.md**](./docs/02-DATABASE-SCHEMA.md) - Schema do banco
- [**03-FEATURES-CORE.md**](./docs/03-FEATURES-CORE.md) - Funcionalidades principais
- [**04-BUSINESS-MODEL.md**](./docs/04-BUSINESS-MODEL.md) - Modelo de negócio

---

## 🧪 Testes

### Desktop

```bash
# Testes unitários
pnpm test

# Testes E2E
pnpm test:e2e

# Coverage
pnpm test:coverage
```

### Mobile

```bash
cd giro-mobile
pnpm test
pnpm test:coverage
```

**Status atual**: 80%+ de cobertura em módulos críticos

---

## 🔐 Segurança

- ✅ Autenticação JWT com refresh tokens
- ✅ Senhas hasheadas com bcrypt (custo 12)
- ✅ Validação de inputs com Zod
- ✅ SQL injection protection (Prisma ORM)
- ✅ XSS protection
- ✅ CORS configurado
- ✅ Rate limiting
- ✅ Logs de auditoria

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'feat: Add AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Padrões de Commit

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(scope): add new feature
fix(scope): fix bug description
docs(scope): update documentation
refactor(scope): refactor code
test(scope): add tests
chore(scope): maintenance tasks
```

---

## 📄 Licença

Este projeto é proprietário. Todos os direitos reservados.

---

## 👨‍💻 Autor

**Arkheion Corp**

- GitHub: [@jhonslife](https://github.com/jhonslife)

---

## 🙏 Agradecimentos

- [Tauri](https://tauri.app) - Framework desktop
- [Expo](https://expo.dev) - Framework mobile
- [Prisma](https://prisma.io) - ORM
- [Radix UI](https://radix-ui.com) - Componentes React
- Comunidade Open Source

---

<div align="center">

**[⬆ Voltar ao topo](#-giro---sistema-pdv-completo)**

Feito com ❤️ por Arkheion Corp

</div>

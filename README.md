# GIRO Desktop

> Sistema PDV (Ponto de Venda) completo para varejo — Mercearias, Motopeças e pequeno comércio.

[![Version](https://img.shields.io/badge/version-2.4.5-blue.svg)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)
[![Stack](https://img.shields.io/badge/stack-Tauri%20%2B%20React%20%2B%20Rust-orange.svg)]()

---

## 🎯 Visão Geral

O **GIRO Desktop** é um sistema de gestão comercial offline-first desenvolvido para pequenos e médios varejistas. Combina a robustez do Rust com a flexibilidade do React, rodando nativamente em Windows e Linux.

### ✨ Principais Funcionalidades

| Módulo           | Descrição                                            |
| ---------------- | ---------------------------------------------------- |
| **PDV**          | Vendas rápidas, múltiplos pagamentos, scanner mobile |
| **Produtos**     | Cadastro, categorias, códigos de barras, preços      |
| **Estoque**      | Controle FIFO, lotes, validade, alertas automáticos  |
| **Caixa**        | Abertura, fechamento, sangria, suprimento            |
| **Funcionários** | RBAC (Admin, Gerente, Caixa, Visualizador)           |
| **Relatórios**   | Dashboard, vendas, estoque, desempenho               |
| **Hardware**     | Impressora térmica, balança, scanner, gaveta         |
| **Backup**       | Google Drive, sincronização segura                   |

---

## 🛠️ Tech Stack

```
Frontend     → React 18 + TypeScript + TailwindCSS + Shadcn/UI
Backend      → Rust + Tauri 2.0 + SQLx
Database     → SQLite (WAL mode) + Prisma (migrations)
Testes       → Vitest (254) + Rust tests (78) + Playwright (E2E)
```

---

## 📦 Estrutura do Projeto

```
GIRO/
├── apps/
│   └── desktop/           # Aplicação Tauri principal
│       ├── src/           # Frontend React
│       └── src-tauri/     # Backend Rust
├── packages/
│   ├── database/          # Schema Prisma + migrations
│   ├── ui/                # Componentes compartilhados
│   └── config/            # Configurações e tipos
├── e2e/                   # Testes end-to-end Playwright
└── docs/                  # Documentação técnica
```

---

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 20+
- pnpm 9+
- Rust 1.75+
- (Windows) Visual Studio Build Tools

### Instalação

```bash
# Clonar e instalar dependências
git clone https://github.com/Ooriginador/GIRO.git
cd GIRO
pnpm install

# Gerar cliente Prisma e migrations
pnpm db:generate
pnpm db:push

# Iniciar em desenvolvimento
pnpm dev
```

### Build de Produção

```bash
# Windows (.msi)
pnpm build:windows

# Linux (.deb, .AppImage)
pnpm build:linux
```

---

## 📚 Documentação

| Documento                                                | Descrição                  |
| -------------------------------------------------------- | -------------------------- |
| [docs/00-OVERVIEW.md](docs/00-OVERVIEW.md)               | Visão geral do ecossistema |
| [docs/01-ARQUITETURA.md](docs/01-ARQUITETURA.md)         | Arquitetura técnica        |
| [docs/02-DATABASE-SCHEMA.md](docs/02-DATABASE-SCHEMA.md) | Modelagem de dados         |
| [docs/03-FEATURES-CORE.md](docs/03-FEATURES-CORE.md)     | Features principais        |
| [CHANGELOG.md](CHANGELOG.md)                             | Histórico de versões       |
| [CONTRIBUTING.md](CONTRIBUTING.md)                       | Guia de contribuição       |

---

## 🔐 Segurança

- Autenticação por PIN e senha (SHA-256)
- RBAC com 4 níveis de permissão
- Criptografia de dados sensíveis (PII)
- LGPD compliance (consentimento, exportação, exclusão)

Veja [SECURITY.md](SECURITY.md) para reportar vulnerabilidades.

---

## 📄 Licença

**Proprietário** — Arkheion Corp  
Este software é de uso exclusivo mediante licenciamento.

---

## 🏢 Ecossistema GIRO

| Produto             | Descrição               | Status             |
| ------------------- | ----------------------- | ------------------ |
| **GIRO Desktop**    | PDV para varejo         | ✅ Produção        |
| **GIRO Enterprise** | Almoxarifado industrial | 🔄 Desenvolvimento |
| **GIRO Mobile**     | Scanner e inventário    | ✅ Produção        |
| **License Server**  | Licenciamento central   | ✅ Produção        |

---

_Desenvolvido com ❤️ por Arkheion Corp_

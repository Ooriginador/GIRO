# 🏪 Mercearias - Agentes Especializados

> **Sistema de Agentes de Elite para Desenvolvimento Desktop**  
> Versão: 1.0.0 | Atualizado: 7 de Janeiro de 2026

---

## 🎯 Visão Geral

Este diretório contém **agentes especializados** criados exclusivamente para o desenvolvimento do projeto **Mercearias** - Sistema de Gestão para Pequenos Varejos.

Os agentes seguem o formato atualizado do VS Code Copilot (v1.106+) com suporte a:
- **Handoffs**: Transições guiadas entre agentes
- **Tools**: Ferramentas específicas por contexto
- **Models**: Modelos de IA otimizados por tarefa

---

## 🤖 Agentes Disponíveis

| Agente | Arquivo | Especialidade | Stack |
|--------|---------|---------------|-------|
| 🦀 **Rust** | [Rust.agent.md](Rust.agent.md) | Backend Tauri, SQLx, Hardware | Rust, Tauri 2.0 |
| ⚛️ **Frontend** | [Frontend.agent.md](Frontend.agent.md) | UI/UX, React, TailwindCSS | React 18, TypeScript |
| 🏪 **PDV** | [PDV.agent.md](PDV.agent.md) | Ponto de Venda, Caixa, Vendas | Full-stack |
| 🗄️ **Database** | [Database.agent.md](Database.agent.md) | SQLite, Prisma, Migrations | SQLite, Prisma, SQLx |
| 🔌 **Hardware** | [Hardware.agent.md](Hardware.agent.md) | Impressoras, Balanças, Scanner | ESC/POS, Serial, USB |
| 📊 **Relatorios** | [Relatorios.agent.md](Relatorios.agent.md) | Analytics, Charts, Exports | React, Rust |
| 📋 **Planejador** | [Planejador.agent.md](Planejador.agent.md) | Planning, Análise, Documentação | Analítico |
| 🧪 **QA** | [QA.agent.md](QA.agent.md) | Testes, Qualidade, E2E | Vitest, Playwright |
| 🐛 **Debugger** | [Debugger.agent.md](Debugger.agent.md) | Diagnóstico, Fix, Performance | Full-stack |
| 🚀 **DevOps** | [DevOps.agent.md](DevOps.agent.md) | CI/CD, Docker, Deploy | GitHub Actions, Railway |
| 🔒 **Security** | [Security.agent.md](Security.agent.md) | LGPD, Auditoria, Compliance | Full-stack |

---

## 🏗️ Stack do Projeto

```yaml
Frontend:
  Framework: React 18.3+ com TypeScript
  Build: Vite 5.0+
  Styling: TailwindCSS 3.4+ + Shadcn/UI
  State: Zustand + TanStack Query
  Forms: React Hook Form + Zod

Backend:
  Runtime: Tauri 2.0 (Rust)
  Language: Rust 1.75+
  Database: SQLite 3.45+ via SQLx
  Schema: Prisma (design) + SQLx (runtime)
  Async: Tokio

Hardware:
  Impressoras: ESC/POS (Epson, Elgin, Bematech)
  Balanças: Serial/USB (Toledo, Filizola)
  Scanner: USB HID + Mobile PWA (WebSocket)
  Gavetas: Pulso via impressora

DevOps:
  CI/CD: GitHub Actions
  Installer: NSIS (Windows)
  Backup: Google Drive API
```text
---

## 🔄 Workflow Recomendado

### Fluxo de Desenvolvimento

```text
📋 Planejador → 🗄️ Database → 🦀 Rust → ⚛️ Frontend → 🧪 QA
                                  ↓
                            🔌 Hardware
                                  ↓
                            🏪 PDV
```text
### Fluxo Típico de Feature

1. **@Planejador** → Análise e plano de implementação
2. **@Database** → Modelar schema e migrations
3. **@Rust** → Implementar commands e services
4. **@Frontend** → Criar componentes e páginas
5. **@QA** → Escrever e rodar testes
6. **@Debugger** → Resolver problemas encontrados

### Handoffs Automáticos

Os agentes possuem **handoffs** configurados para facilitar transições:

- Após planejamento → Opções: Database, Rust, Frontend, PDV
- Após implementação Rust → Opções: Frontend, QA, Hardware
- Após implementação Frontend → Opções: Rust, QA, Debugger
- Após falha de teste → Opções: Debugger, Rust, Frontend

---

## 💬 Exemplos de Uso

```text
@Planejador crie um plano para implementar o módulo de sangria de caixa

@Database adicione campo de observações na tabela de vendas

@Rust implemente o command para listar vendas do dia

@Frontend crie o modal de fechamento de caixa

@PDV otimize a busca de produtos por código de barras

@Hardware configure suporte para impressora Elgin i9

@Relatorios crie o relatório de curva ABC de produtos

@QA escreva testes para o fluxo de venda completo

@Debugger a impressão de cupom está travando
```text
---

## 📚 Documentação Relacionada

| Documento | Descrição |
|-----------|-----------|
| [docs/00-OVERVIEW.md](../../docs/00-OVERVIEW.md) | Visão geral do produto |
| [docs/01-ARQUITETURA.md](../../docs/01-ARQUITETURA.md) | Arquitetura técnica |
| [docs/02-DATABASE-SCHEMA.md](../../docs/02-DATABASE-SCHEMA.md) | Schema do banco |

---

## ⚙️ Configuração de Ferramentas (MCP)

Os agentes utilizam ferramentas MCP configuradas em `.vscode/mcp.json`:

| Server | Função |
|--------|--------|
| **filesystem** | Acesso ao sistema de arquivos |
| **github** | Integração com GitHub |
| **prisma** | Migrations e schema |
| **postgres** | Queries diretas (dev) |
| **puppeteer** | Automação de browser |
| **sequential-thinking** | Raciocínio estruturado |
| **memory** | Memória persistente entre sessões |

---

## 🆕 Novidades do VS Code Copilot (v1.106+)

Este projeto utiliza as features mais recentes:

### Custom Agents
- Arquivos `.agent.md` na pasta `.github/agents/`
- Frontmatter YAML com `name`, `description`, `tools`, `model`, `handoffs`
- Instruções em Markdown no corpo do arquivo

### Handoffs
- Transições guiadas entre agentes
- Botões aparecem após resposta
- Contexto preservado automaticamente

### Tools Específicos
- Cada agente tem acesso apenas às ferramentas necessárias
- Planejador é read-only (sem `edit`, sem `execute`)
- Agentes especializados têm `prisma/*`, `github/*`, etc.

### Models
- Seleção de modelo por agente
- Claude Sonnet 4 para tarefas complexas
- Modelos rápidos para tarefas simples

---

## 📝 Criando Novos Agentes

Para criar um novo agente:

1. Crie um arquivo `.agent.md` nesta pasta
2. Adicione o frontmatter YAML:

```yaml
---
name: NomeDoAgente
description: Descrição curta do agente
tools:
  - vscode
  - read
  - edit
  - search
  - filesystem/*
model: Claude Sonnet 4
handoffs:
  - label: 🔄 Próximo Passo
    agent: outro-agente
    prompt: Continue a partir daqui.
    send: false
---
```text
3. Adicione instruções em Markdown no corpo
4. O agente aparecerá automaticamente no dropdown

---

_Última atualização: 7 de Janeiro de 2026_
# 🗺️ Roadmap de Transição: Arquitetura Distribuída (v0.2.0)

> **Objetivo:** Migrar do conceito monolítico para uma arquitetura Client-Server (VS Code <-> Docker Kernel).

## 📅 Fase 1: Fundação do Kernel e Protocolo (Semanas 1-2)

### 1.1 Definição de Protocolo (IDL)

- [ ] Criar especificações `.proto` para comunicação gRPC.
  - `auth.proto`: Handshake e segurança.
  - `filesystem.proto`: Sincronização de arquivos.
  - `orchestrator.proto`: Comandos de build e execução.

### 1.2 SelfDev Kernel (Rust/Docker)

- [ ] Configurar workspace Rust com Tokio.
- [ ] Criar `Dockerfile` base (Alpine/Wolfi).
- [ ] Implementar servidor gRPC básico (Tonic).
- [ ] Integrar SQLite (SQLx) para persistência inicial.

### 1.3 VS Code Thin Client

- [ ] Criar nova extensão mínima.
- [ ] Implementar cliente gRPC (Node.js).
- [ ] Criar painel de conexão e status do container.

## 📅 Fase 2: Sincronização e Inteligência (Semanas 3-4)

### 2.1 File System Sync

- [ ] Implementar watcher no VS Code.
- [ ] Criar stream bidirecional de diffs de arquivos.
- [ ] Garantir consistência entre Host e Container.

### 2.2 MCP Bridge

- [ ] Implementar servidor MCP dentro do Kernel (Rust).
- [ ] Criar proxy no VS Code para repassar requests do Copilot.

### 2.3 Knowledge Graph Inicial

- [ ] Portar lógica de indexação para Rust (Tree-sitter).
- [ ] Armazenar símbolos e referências no SQLite/Qdrant.

## 📅 Fase 3: Agentes e Build Isolado (Semanas 5-6)

### 3.1 Task Runner

- [ ] Implementar executor de jobs no Kernel.
- [ ] Sandboxing de processos de build.

### 3.2 Builder Agent

- [ ] Agente capaz de rodar testes e lint dentro do Docker.
- [ ] Política de "Green Build" para commits.

## 📂 Nova Estrutura de Diretórios Sugerida

```
packages/
  kernel/               # O "Cérebro" (Rust)
  vscode-extension/     # O "Terminal" (TypeScript)
  proto/                # O "Idioma" (Protobuf)
  cli/                  # Ferramenta de linha de comando (Opcional)
```

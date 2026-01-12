# 🧠 SelfDev: Sistema Autônomo de Desenvolvimento Enterprise Distribuído

> **Visão:** Um ecossistema de desenvolvimento distribuído onde o VS Code opera como um "Thin Client" conectado a um Kernel Docker de alta performance, orquestrando o GitHub Copilot para construir projetos enterprise-grade com 90%+ de cobertura de testes.

**Versão:** 0.2.0-distributed  
**Data:** 11 de Janeiro de 2026  
**Autor:** GIRO Project / Arkheion Corp

---

## 📋 Índice

1. [Revisão Crítica e Nova Arquitetura](#-revisão-crítica-e-nova-arquitetura)
2. [Visão Geral](#-visão-geral)
3. [Componentes do Ecossistema](#-componentes-do-ecossistema)
4. [SelfDev Kernel (Docker)](#-selfdev-kernel-docker)
5. [Extensões VS Code (Thin Clients)](#-extensões-vs-code-thin-clients)
6. [Sistema de Memória Distribuída](#-sistema-de-memória-distribuída)
7. [Protocolo de Comunicação](#-protocolo-de-comunicação)
8. [Pipeline de Construção Isolado](#-pipeline-de-construção-isolado)
9. [Roadmap de Implementação](#-roadmap-de-implementação)

---

## 🔍 Revisão Crítica e Nova Arquitetura

### Por que abandonar a Monolítica?

Após análise de padrões de extensões de larga escala (Language Servers, Remote Development), identificamos falhas críticas no modelo monolítico original (v0.1.0):

1.  **Gargalo do Extension Host:** Rodar análise pesada (Rust) e orquestração de IA na thread de extensão do VS Code degrada a UI e causa travamentos.
2.  **Dependência de Ambiente:** Exigir que o usuário tenha Rust, Cargo, Julia e ferramentas instaladas localmente cria fricção e "works on my machine" issues. O ambiente de build deve ser determinístico.
3.  **Isolamento de Segurança:** Agentes com permissão de execução de código (Builder/Tester) não devem rodar diretamente no host user space com acesso irrestrito.
4.  **Escalabilidade:** Uma extensão monolítica não escala para computação em nuvem ou clusters de build. O "cérebro" precisa poder rodar remotamente.

### A Solução: Arquitetura Distribuída (Client-Server)

Adotaremos o padrão **LSP++ (Language Server Protocol Extended)**, onde o VS Code age apenas como "Thin Client" (IO/UI) e toda a inteligência reside em um **SelfDev Kernel** rodando em container Docker (local ou remoto).

```
┌───────────────────────────┐          ┌──────────────────────────────────────────────┐
│  VS CODE (HOST MACHINE)   │          │         SELFDEV KERNEL (DOCKER)              │
│ ───────────────────────── │          │ ──────────────────────────────────────────── │
│                           │          │                                              │
│ ┌───────────────────────┐ │   gRPC   │ ┌──────────────┐  ┌───────────────────────┐  │
│ │   selfdev-client      │ │◄────────►│ │ API Gateway  │  │   Orchestrator Core   │  │
│ │   (UI & Chat)         │ │   Sync   │ └──────┬───────┘  │      (Rust/Tokio)     │  │
│ └───────────────────────┘ │          │        │          └───────────┬───────────┘  │
│                           │          │        ▼                      │              │
│ ┌───────────────────────┐ │   MCP    │ ┌──────────────┐  ┌───────────▼───────────┐  │
│ │   selfdev-mcp         │ │◄────────►│ │ MCP Bridge   │  │   Knowledge Engine    │  │
│ │   (Copilot Integ.)    │ │          │ └──────────────┘  │ (Vector DB + Graph)   │  │
│ └───────────────────────┘ │          │                   └───────────┬───────────┘  │
│                           │          │                               │              │
│ ┌───────────────────────┐ │   LSP    │ ┌──────────────┐  ┌───────────▼───────────┐  │
│ │   selfdev-lang        │ │◄────────►│ │ Language     │  │   Build Agents (N)    │  │
│ │   (Syntax Highlight)  │ │          │ │ Servers      │  │   (Isolated Jobs)     │  │
│ └───────────────────────┘ │          │ └──────────────┘  └───────────────────────┘  │
│                           │          │                                              │
└───────────────────────────┘          └──────────────────────────────────────────────┘
```

---

## 🎯 Visão Geral

### O Que É SelfDev Distributed?

Um ecossistema de extensões coordenadas que transforma o VS Code em um terminal de comando para uma "Fábrica de Software de IA" rodando em container. O loop de análise, build e teste acontece em um ambiente controlado e replicável.

### Diferencial da Nova Arquitetura

| Característica | Monólito (Antigo) | Distribuído (Novo) |
|----------------|-------------------|--------------------|
| **Runtime** | Node.js (Extension Host) | Docker (Linux Otimizado - Alpine/Wolfi) |
| **Dependências** | Instaladas no Host | Pré-empacotadas na Imagem |
| **Performance** | Compete com UI do VS Code | Recursos Ilimitados/Dedicados |
| **Segurança** | Acesso total ao disco | Sandbox Containerizado |
| **Multi-Language** | Bindings complexos | Nativo (Rust/Julia/Python) |

---

## 🧩 Componentes do Ecossistema

Esta não é mais "uma extensão", mas uma **Suite SelfDev**:

### 1. `selfdev-core` (A Extensão Mestra)
- Gerencia o ciclo de vida do container Docker (start/stop/restart).
- Provee a UI de Dashboard e Chat Panels.
- Orquestra a instalação das outras extensões.

### 2. `selfdev-mcp-client`
- Registra o SelfDev como um servidor MCP para o GitHub Copilot.
- Permite que o Copilot "converse" diretamente com o Kernel no Docker através de uma bridge segura.

### 3. `selfdev-fs-sync`
- Sincronização bidirecional de arquivos ultra-rápida (via gRPC streaming).
- Espelha o workspace local para o container em tempo real, permitindo que os agents trabalhem em um filesystem virtual otimizado.

### 4. `selfdev-remote-debugger`
- Conecta o debugger do VS Code aos processos rodando no container.
- Suporte a "Auto-Attach" em testes falhando dentro do Docker.

---

## 🐳 SelfDev Kernel (Docker)

Esta é a "mente" do sistema. Uma imagem Docker `selfdev/kernel:latest` contendo:

### Stack Interna
- **OS:** Alpine Linux ou Wolfi (para segurança e tamanho reduzido).
- **Runtime:** Binário Rust estático (Orchestrator).
- **DBs:** 
  - **SQLite:** Para o Knowledge Graph e estado do projeto.
  - **Qdrant/LanceDB:** Embarcado para busca vetorial de alta performance.
- **Compiladores:** Rust, Node.js, Python, Julia pré-instalados e versionados.
- **Tools:** `git`, `docker-in-docker` (para subir serviços do projeto que está sendo criado).

### Módulos do Kernel (Rust)

```rust
// Estrutura do Orquestrador
pub struct Kernel {
    // Gerente de Agentes (Tokio Tasks)
    agent_swarm: SwarmManager,
    
    // Memória Persistente
    knowledge_graph: GraphDatabase,
    
    // Motor de Análise (Tree-sitter)
    code_analyzer: AnalyzerEngine,
    
    // Executor de Tarefas (Build/Test)
    task_runner: JobScheduler,
    
    // Interface gRPC
    api_server: GrpcServer,
}
```

### Agents no Kernel
Os agentes não rodam mais como scripts JS no VS Code, mas como **Processos Leves (Tokio Tasks)** dentro do Kernel. Isso permite:
- **Paralelismo real:** Uso de todos os cores da CPU para análise e build.
- **Memória Compartilhada:** Acesso direto ao Knowledge Graph sem serialização JSON excessiva.
- **Handoffs Rápidos:** Troca de contexto em microssegundos.

---

## 🖥️ Extensões VS Code (Thin Clients)

### Arquitetura de Extensão Limpa

O código do lado do VS Code deve ser mínimo, focado apenas em apresentar dados e capturar intenções.

`extension.ts` (Simplificado):
```typescript
export async function activate(context: ExtensionContext) {
    // 1. Verifica/Inicia Docker
    // Se não existir, baixa a imagem selfdev/kernel:latest em background
    const container = await DockerManager.ensureRunning();
    
    // 2. Conecta gRPC Client
    const client = new SelfDevClient(container.port);
    
    // 3. Registra Providers
    // A UI é apenas um espelho do estado do Kernel recebido via Stream
    registerWebviewView('selfdev.dashboard', new DashboardProvider(client));
    
    // 4. Copilot MCP Bridge
    // Redireciona prompts do Copilot para o Kernel via MCP
    startMcpBridge(client);
    
    // 5. File Watcher
    // Envia mudanças locais para o container instantaneamente
    startFileSync(workspace.rootPath, client);
}
```

---

## 💾 Sistema de Memória Distribuída

### Knowledge Graph no Kernel

O grafo de conhecimento reside inteiramente no container, garantindo persistência mesmo se o VS Code for fechado ou travar.

- **Entidades:** Arquivos, Funções, Classes, Decisões, Requisitos.
- **Relações:** "implementa", "testa", "depende de", "conflita com".
- **Busca:** O Kernel expõe endpoints gRPC para buscas semânticas que o Copilot consome via MCP.

### Decision Log Imutável

Cada decisão tomada pelos agentes é gravada em um log append-only (SQLite) dentro do container, servindo como "caixa preta" do projeto.

---

## 📡 Protocolo de Comunicação

### gRPC + Protobuf
Usaremos gRPC para comunicação de alta performance, tipada e com suporte a streaming bidirecional.

```protobuf
// selfdev.proto

service Orchestrator {
    // Comandos de Controle
    rpc StartProject (ProjectConfig) returns (ProjectStatus);
    rpc CreateTask (TaskRequest) returns (TaskID);
    
    // Streams de Dados em Tempo Real (Live Updates)
    rpc WatchProgress (ProjectID) returns (stream ProgressUpdate);
    rpc FileSync (stream FileChunk) returns (stream FileAck);
    
    // Inteligência (MCP Bridge)
    rpc AskGraph (Query) returns (Answer);
    rpc TriggerAgent (AgentAction) returns (AgentResponse);
}
```

---

## 🏗️ Pipeline de Construção Isolado

O "Builder Agent" agora tem superpoderes. Ele não edita arquivos no seu disco direto, evitando corrupção.

1.  **Sandbox Worktree:** O Kernel cria um worktree Git isolado dentro do container para cada tarefa.
2.  **Implementation:** O Agent aplica mudanças nesse sandbox.
3.  **Kernel Validation:**
    -   Compilação incremental dentro do container.
    -   Análise estática (Rust core).
    -   Testes unitários rodados no ambiente isolado.
4.  **Commit/Revert:** 
    - Se passar 90% coverage -> Commit -> Push para repo local -> Pull no host do usuário.
    - Se falhar -> Revert automático -> Agent tenta novamente ou pede ajuda.

Isso garante que **seu ambiente local nunca quebra**. Você só recebe código que já passou pelo pipeline de qualidade (Green Build Policy).

---

## 📅 Atualização do Roadmap

### Fase 1: Kernel Genesis (4 semanas)
- [ ] Criar Dockerfile otimizado (Alpine/Wolfi) com Rust/Tree-sitter.
- [ ] Implementar servidor gRPC básico em Rust.
- [ ] Desenvolver extensão VS Code capaz de gerenciar o ciclo de vida do container.
- [ ] Implementar sincronização de arquivos host<->container (gRPC Stream).

### Fase 2: Brain Transplant (3 semanas)
- [ ] Mover lógica de memória (Graph/Vector) para o Kernel.
- [ ] Implementar MCP Server dentro do Docker.
- [ ] Criar ponte VS Code MCP Client -> Docker MCP Server.
- [ ] Integrar Julia no container para análises matemáticas complexas.

### Fase 3: The Swarm (3 semanas)
- [ ] Implementar Agentes como Tokio Tasks no Rust.
- [ ] Desenvolver sistema de "Virtual File System" para agentes trabalharem isolados.
- [ ] Criar dashboard de observabilidade em tempo real no VS Code.

### Fase 4: Integração Enterprise (2 semanas)
- [ ] Suporte a execução em Kubernetes (para times remotos).
- [ ] Conectores para Jira/Linear (importação de requisitos).
- [ ] Pipeline de CI/CD integration.

---

## 📞 Conclusão Revisada

A mudança para uma **Arquitetura Distribuída Baseada em Container** eleva o SelfDev de uma "extensão inteligente" para uma **Plataforma de Desenvolvimento Híbrida**.

-   **O VS Code** é o cockpit (interface e controle).
-   **O Docker** é o motor (execução e inteligência).
-   **O Copilot** é o piloto (raciocínio natural).

Trazendo o poder de um ambiente de CI/CD para o loop interno de desenvolvimento (Inner Dev Loop), com latência zero, segurança total e inteligência contextual infinita.

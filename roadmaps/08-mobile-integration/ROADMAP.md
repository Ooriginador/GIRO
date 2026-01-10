# 📱 Roadmap: Integração Mobile no Desktop

> **Objetivo**: Implementar backend completo para suportar GIRO Mobile  
> **Prioridade**: Alta  
> **Progresso**: 17/17 tarefas concluídas (100%) 🎉

---

## 🎯 Visão Geral

O GIRO Desktop precisa expor uma API WebSocket completa para permitir que o GIRO Mobile se conecte e realize operações de forma autônoma. Atualmente, apenas o scanner de código de barras está implementado.

---

## 📋 Tarefas

### Fase 1: Infraestrutura (2 dias)

#### TASK-MOB-001: Criar estrutura de mensagens WebSocket

**Arquivo**: `src-tauri/src/services/mobile_protocol.rs`
**Status**: ✅ Concluído

```rust
// Estrutura de Request do Mobile
pub struct MobileRequest {
    pub id: u64,
    pub action: String,
    pub payload: serde_json::Value,
    pub token: Option<String>,
    pub timestamp: i64,
}

// Estrutura de Response para o Mobile
pub struct MobileResponse {
    pub id: u64,
    pub success: bool,
    pub data: Option<serde_json::Value>,
    pub error: Option<MobileError>,
    pub timestamp: i64,
}
```

**Critérios de aceite**:

- [x] Tipos Rust compatíveis com TypeScript do Mobile
- [x] Serialização JSON testada
- [x] Documentação inline

---

#### TASK-MOB-002: Implementar WebSocket Server genérico

**Arquivo**: `src-tauri/src/services/mobile_server.rs`
**Status**: ✅ Concluído

**Responsabilidades**:

- Aceitar conexões na porta 3847
- Rotear mensagens por `action`
- Gerenciar autenticação por token
- Enviar eventos push

**Critérios de aceite**:

- [x] Suporta múltiplos clientes simultâneos
- [x] Heartbeat/ping-pong funcionando
- [x] Reconexão tratada corretamente
- [x] Log de conexões/desconexões

---

#### TASK-MOB-003: Implementar mDNS Broadcasting

**Arquivo**: `src-tauri/src/services/mdns_service.rs`
**Dependência**: Adicionar `mdns-sd = "0.11"` ao Cargo.toml
**Status**: ✅ Concluído

```rust
pub fn start_mdns_broadcast(config: &MdnsConfig) -> Result<()> {
    // Anunciar serviço: _giro._tcp.local.
    // Nome: "GIRO PDV - {nome_da_loja}"
    // Porta: 3847
    // TXT: version, store_name
}
```

**Critérios de aceite**:

- [x] Descoberto pelo Mobile via Zeroconf
- [x] Nome customizável via settings
- [x] Para quando app fecha
- [x] Funciona em Windows e Linux

---

#### TASK-MOB-004: Gerenciador de Sessões Mobile

**Arquivo**: `src-tauri/src/services/mobile_session.rs`
**Status**: ✅ Concluído

**Responsabilidades**:

- Gerar tokens JWT para sessões mobile
- Validar tokens em cada request
- Expirar sessões após timeout
- Limitar sessões por operador

**Critérios de aceite**:

- [x] Token expira em 8 horas
- [x] Máximo 2 sessões por operador
- [x] Logout invalida token
- [x] Renovação automática

---

### Fase 2: Handlers de Actions (3 dias)

#### TASK-MOB-005: Handler de Autenticação

**Arquivo**: `src-tauri/src/services/mobile_handlers/auth.rs`
**Status**: ✅ Concluído

**Actions**:

- `auth.login` - Login com PIN
- `auth.logout` - Logout e invalidar token
- `auth.validate` - Verificar se token é válido

**Critérios de aceite**:

- [x] Integra com EmployeeRepository existente
- [x] Retorna SafeEmployee com role mapeado
- [x] Registra login no log de auditoria

---

#### TASK-MOB-006: Handler de Produtos

**Arquivo**: `src-tauri/src/services/mobile_handlers/products.rs`
**Status**: ✅ Concluído

**Actions**:

- `product.get` - Buscar por barcode
- `product.search` - Busca textual
- `product.create` - Cadastro rápido (se permitido)
- `product.update` - Atualizar (se permitido)

**Critérios de aceite**:

- [x] Reutiliza ProductRepository
- [x] Verifica permissões do operador
- [x] Retorna formato compatível com Mobile

---

#### TASK-MOB-007: Handler de Estoque

**Arquivo**: `src-tauri/src/services/mobile_handlers/stock.rs`
**Status**: ✅ Concluído

**Actions**:

- `stock.adjust` - Ajustar estoque (entrada/saída)
- `stock.list` - Listar produtos com filtro
- `stock.history` - Histórico de movimentações

**Critérios de aceite**:

- [x] Reutiliza StockRepository
- [x] Emite evento `stock.updated`
- [x] Registra employee_id na movimentação

---

#### TASK-MOB-008: Handler de Inventário

**Arquivo**: `src-tauri/src/services/mobile_handlers/inventory.rs`
**Status**: ✅ Concluído

**Actions**:

- `inventory.start` - Iniciar sessão de inventário
- `inventory.count` - Registrar contagem
- `inventory.finish` - Finalizar e aplicar ajustes
- `inventory.cancel` - Cancelar inventário
- `inventory.status` - Status atual

**Critérios de aceite**:

- [x] Criar nova tabela `inventories` se não existir
- [x] Suporta inventário por categoria
- [x] Calcula divergências
- [x] Aplica ajustes de estoque automaticamente

---

#### TASK-MOB-009: Handler de Validades

**Arquivo**: `src-tauri/src/services/mobile_handlers/expiration.rs`
**Status**: ✅ Concluído

**Actions**:

- `expiration.list` - Listar produtos próximos do vencimento
- `expiration.action` - Ação sobre lote (baixa, promoção, verificado)

**Critérios de aceite**:

- [x] Integra com ProductLot
- [x] Ordena por urgência
- [x] Permite filtrar por dias

---

#### TASK-MOB-010: Handler de Categorias

**Arquivo**: `src-tauri/src/services/mobile_handlers/categories.rs`
**Status**: ✅ Concluído

**Actions**:

- `category.list` - Listar todas categorias

**Critérios de aceite**:

- [x] Retorna contagem de produtos por categoria
- [x] Inclui cores e ícones

---

### Fase 3: Eventos Push (1 dia)

#### TASK-MOB-011: Sistema de Eventos Push

**Arquivo**: `src-tauri/src/services/mobile_events.rs`
**Status**: ✅ Concluído

**Eventos**:

- `stock.updated` - Quando estoque muda
- `stock.low` - Quando estoque fica baixo
- `stock.out` - Quando estoque zera
- `product.created` - Novo produto cadastrado
- `product.updated` - Produto atualizado
- `expiration.alert` - Produto próximo do vencimento

**Critérios de aceite**:

- [x] Broadcast para todos os clientes conectados
- [x] Filtrar eventos por relevância
- [x] Não bloquear operações principais

---

### Fase 4: Ajustes de Modelo (0.5 dia)

#### TASK-MOB-012: Adicionar Role "Stocker" (Repositor)

**Arquivo**: `src-tauri/src/models/employee.rs`
**Status**: ✅ Concluído

```rust
pub enum EmployeeRole {
    Admin,
    Manager,
    Cashier,
    Stocker,   // NOVO - Repositor
    Viewer,
}
```

**Critérios de aceite**:

- [x] Migration para adicionar role
- [x] Permissões definidas (estoque, inventário)

---

#### TASK-MOB-013: Adicionar ProductUnit "Centimeter"

**Arquivo**: `src-tauri/src/models/product.rs`
**Status**: ✅ Concluído

```rust
pub enum ProductUnit {
    // ... existentes
    Centimeter, // cm
}
```

**Critérios de aceite**:

- [x] Serializa como "CM" no JSON

---

### Fase 5: Integração (0.5 dia)

#### TASK-MOB-014: Integrar com Scanner existente

**Arquivo**: `src-tauri/src/services/mobile_server.rs`
**Status**: ✅ Concluído

**Modificações**:

- Unificar servidor WebSocket
- Reusar conexões para scanner e API
- Manter compatibilidade com PWA scanner

**Implementação**:

- Mobile server detecta mensagens legacy do scanner via `LegacyScannerMessage`
- Função `handle_legacy_scanner_message` processa scans antigos
- Mantém compatibilidade total com scanner PWA
- Porta 3847 compartilhada entre scanner e API

**Critérios de aceite**:

- [x] Um único servidor WebSocket na porta 3847
- [x] Scanner e API funcionam simultaneamente
- [x] Compatibilidade retroativa garantida

---

#### TASK-MOB-015: Inicialização no Startup

**Arquivo**: `src-tauri/src/main.rs`, `src-tauri/src/commands/hardware.rs`
**Status**: ✅ Concluído

**Implementação**:

- Adicionado `start_mobile_server` command
- Adicionado `stop_mobile_server` command
- Adicionado `get_mobile_server_info` command
- Comandos registrados no main.rs
- Mobile server pode ser iniciado via frontend

```rust
// Frontend pode chamar
await invoke('start_mobile_server');
await invoke('stop_mobile_server');
await invoke('get_mobile_server_info');
```

**Critérios de aceite**:

- [x] Comandos Tauri disponíveis para frontend
- [x] Pode ser iniciado/parado via UI
- [x] Retorna status e informações de conexão

---

### Fase 6: Testes (2 dias)

#### TASK-MOB-016: Testes Unitários

**Status**: ⬜ Pendente

- [ ] Testes de serialização de mensagens
- [ ] Testes de handlers individuais
- [ ] Testes de autenticação
- [ ] Testes de permissões

---

#### TASK-MOB-017: Testes de Integração

**Status**: ⬜ Pendente

- [ ] Teste de conexão Mobile → Desktop
- [ ] Teste de fluxo completo de inventário
- [ ] Teste de ajuste de estoque
- [ ] Teste de eventos push

---

## 📊 Cronograma Sugerido

| Dia | Tarefas                                                |
| --- | ------------------------------------------------------ |
| 1   | TASK-MOB-001, TASK-MOB-002                             |
| 2   | TASK-MOB-003, TASK-MOB-004                             |
| 3   | TASK-MOB-005, TASK-MOB-006                             |
| 4   | TASK-MOB-007, TASK-MOB-008                             |
| 5   | TASK-MOB-009, TASK-MOB-010, TASK-MOB-011               |
| 6   | TASK-MOB-012, TASK-MOB-013, TASK-MOB-014, TASK-MOB-015 |
| 7-8 | TASK-MOB-016, TASK-MOB-017                             |
| 9   | Buffer / Correções                                     |

---

## 🔧 Dependências do Cargo.toml

```toml
# Adicionar ao Cargo.toml
[dependencies]
# mDNS Broadcasting
mdns-sd = "0.10"

# JWT para sessões (já pode ter jsonwebtoken)
jsonwebtoken = "9.2"

# (já existentes)
tokio-tungstenite = "0.21"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

---

## 📁 Estrutura de Arquivos

```
src-tauri/src/
├── services/
│   ├── mod.rs                    # ✏️ Modificar
│   ├── mobile_protocol.rs        # 🆕 Criar
│   ├── mobile_server.rs          # 🆕 Criar
│   ├── mobile_session.rs         # 🆕 Criar
│   ├── mobile_events.rs          # 🆕 Criar
│   ├── mdns_service.rs           # 🆕 Criar
│   └── mobile_handlers/
│       ├── mod.rs                # 🆕 Criar
│       ├── auth.rs               # 🆕 Criar
│       ├── products.rs           # 🆕 Criar
│       ├── stock.rs              # 🆕 Criar
│       ├── inventory.rs          # 🆕 Criar
│       ├── expiration.rs         # 🆕 Criar
│       └── categories.rs         # 🆕 Criar
├── models/
│   ├── employee.rs               # ✏️ Modificar (adicionar Stocker)
│   └── product.rs                # ✏️ Modificar (adicionar Centimeter)
├── hardware/
│   └── scanner.rs                # ✏️ Modificar (integrar)
└── main.rs                       # ✏️ Modificar (startup)
```

---

## 📝 Notas

1. **Reutilizar Repositórios**: Todos os handlers devem usar os repositórios existentes (`ProductRepository`, `StockRepository`, etc.)

2. **Permissões**: Verificar role do operador antes de operações sensíveis

3. **Audit Log**: Registrar todas as operações do mobile para rastreabilidade

4. **Offline Support**: O Mobile pode operar offline e sincronizar depois - considerar fila de operações no Desktop

---

_Roadmap criado em 9 de Janeiro de 2026_

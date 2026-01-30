---
name: Rust
description: Tauri backend + SQLx + hardware drivers specialist
tools:
  [
    'vscode',
    'execute',
    'read',
    'edit',
    'search',
    'web',
    'context7/*',
    'filesystem/*',
    'github/*',
    'memory/*',
    'postgres/*',
    'prisma/*',
    'puppeteer/*',
    'sequential-thinking/*',
    'github/*',
    'agent',
    'pylance-mcp-server/*',
    'cweijan.vscode-database-client2/dbclient-getDatabases',
    'cweijan.vscode-database-client2/dbclient-getTables',
    'cweijan.vscode-database-client2/dbclient-executeQuery',
    'github.vscode-pull-request-github/copilotCodingAgent',
    'github.vscode-pull-request-github/issue_fetch',
    'github.vscode-pull-request-github/suggest-fix',
    'github.vscode-pull-request-github/searchSyntax',
    'github.vscode-pull-request-github/doSearch',
    'github.vscode-pull-request-github/renderIssues',
    'github.vscode-pull-request-github/activePullRequest',
    'github.vscode-pull-request-github/openPullRequest',
    'ms-azuretools.vscode-containers/containerToolsConfig',
    'ms-python.python/getPythonEnvironmentInfo',
    'ms-python.python/getPythonExecutableCommand',
    'ms-python.python/installPythonPackage',
    'ms-python.python/configurePythonEnvironment',
    'prisma.prisma/prisma-migrate-status',
    'prisma.prisma/prisma-migrate-dev',
    'prisma.prisma/prisma-migrate-reset',
    'prisma.prisma/prisma-studio',
    'prisma.prisma/prisma-platform-login',
    'prisma.prisma/prisma-postgres-create-database',
    'todo',
  ]
model: Claude Sonnet 4
applyTo: 'GIRO/**/src-tauri/**/*.rs,giro-license-server/backend/**/*.rs,**/*.rs,**/Cargo.toml'
handoffs:
  - { label: '⚛️ Frontend', agent: Frontend, prompt: 'Implement UI for these commands' }
  - { label: '📱 Mobile', agent: Mobile, prompt: 'Expose API for mobile' }
  - { label: '🧪 Tests', agent: QA, prompt: 'Create Rust tests' }
  - { label: '🔌 Hardware', agent: Hardware, prompt: 'Integrate hardware drivers' }
  - { label: '🗄️ Schema', agent: Database, prompt: 'Model data entities' }
---

# RUST AGENT

## ROLE

```yaml
domain: Rust + Tauri 2.0 + Axum + SQLx
scope: Commands, services, repositories, APIs, hardware drivers
output: Type-safe, async, performant backend code
```

## ECOSYSTEM CONTEXT

```yaml
projects:
  GIRO-D:
    path: GIRO/apps/desktop/src-tauri/
    framework: Tauri 2.0
    database: SQLite (SQLx)
    pattern: Commands → Services → Repositories
    hardware: ESC/POS, Serial

  LICENSE:
    path: giro-license-server/backend/
    framework: Axum 0.7
    database: PostgreSQL (SQLx)
    pattern: Handlers → Services → Repositories
    deploy: Railway + Docker
```

## IMPORT CHAIN [CRITICAL]

```
UNUSED_USE_DETECTED
├─► EXISTS in module?
│   ├─► NO  → 🔴 IMPLEMENT function/struct first
│   └─► YES → SHOULD_BE_CALLED?
│             ├─► YES → 🟡 IMPLEMENT call in logic
│             └─► NO  → REMOVE only if proven unnecessary
```

| Scenario                | Action                 |
| ----------------------- | ---------------------- |
| Function not in module  | 🔴 IMPLEMENT in mod.rs |
| Struct not instantiated | 🟡 USE where needed    |
| Trait not implemented   | 🔴 IMPLEMENT trait     |
| Type not in signature   | 🟡 ADD to type system  |

### Module Verification

```rust
// Before removing, check:
// 1. mod.rs exports item?
// 2. Cargo.toml has dependency?
// 3. Feature flag active?
// 4. Cfg conditional applies?
```

## STACK

```yaml
runtime: Tauri 2.0+
language: Rust 1.75+ (edition 2021)
database: SQLx 0.7+ (SQLite)
async: Tokio 1.35+
serialization: Serde 1.0+
hardware: serialport 4.3+
error: thiserror + anyhow
```

## STRUCTURE

```
src-tauri/src/
├── main.rs           # Entry
├── lib.rs            # Exports
├── commands/         # Tauri IPC
├── services/         # Business logic
├── repositories/     # Data access
├── models/           # Domain types
├── error.rs          # Error handling
└── hardware/         # Device drivers
```

## PATTERNS

### Tauri Command

```rust
#[tauri::command]
pub async fn get_items(
    state: State<'_, AppState>,
    filter: Option<String>,
) -> Result<Vec<Item>, AppError> {
    let items = state.item_service.list(filter).await?;
    Ok(items)
}
```

### Repository

```rust
impl ItemRepository {
    pub async fn find_by_id(&self, id: &str) -> Result<Option<Item>> {
        sqlx::query_as!(Item, "SELECT * FROM items WHERE id = ?", id)
            .fetch_optional(&self.pool)
            .await
            .map_err(Into::into)
    }
}
```

### Error Handling

```rust
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Not found: {0}")]
    NotFound(String),
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, s: S) -> Result<S::Ok, S::Error> { /*...*/ }
}
```

## RULES

```yaml
- ALWAYS use Result<T, E> for fallible operations
- ALWAYS implement Serialize for frontend communication
- ALWAYS use compile-time checked queries (sqlx::query_as!)
- NEVER use unwrap() in production code
- NEVER remove use statements without verification chain
- NEVER block async runtime with sync operations
```

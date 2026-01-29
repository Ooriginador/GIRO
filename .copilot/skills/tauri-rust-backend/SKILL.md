# 🦀 Tauri Rust Backend Skill

> **Especialização em desenvolvimento backend Tauri 2.0 com Rust**  
> Versão: 1.0.0 | Última Atualização: 25 de Janeiro de 2026

## 📋 Descrição

Esta skill fornece conhecimento especializado para desenvolvimento de aplicações desktop com Tauri 2.0, incluindo:

- Criação de Tauri Commands (IPC)
- Services e Repositories com SQLx
- Integração com hardware (impressoras, balanças, scanners)
- State management com Tauri State
- Plugins Tauri (window, dialog, fs, shell)

## 🛠️ Stack Técnica

| Componente | Versão               | Uso                    |
| ---------- | -------------------- | ---------------------- |
| Tauri      | 2.0+                 | Framework desktop      |
| Rust       | 1.75+ (edition 2021) | Linguagem backend      |
| SQLx       | 0.7+                 | Queries tipadas SQLite |
| Tokio      | 1.35+                | Runtime async          |
| Serde      | 1.0+                 | Serialização JSON      |
| serialport | 4.3+                 | Comunicação hardware   |
| thiserror  | 1.0+                 | Error handling         |

## 📁 Estrutura Padrão

```
apps/desktop/src-tauri/
├── src/
│   ├── main.rs              # Entry point, setup Tauri
│   ├── lib.rs               # Exports públicos
│   ├── commands/            # Tauri commands (IPC)
│   │   ├── mod.rs
│   │   ├── products.rs
│   │   ├── sales.rs
│   │   └── ...
│   ├── services/            # Business logic
│   │   ├── mod.rs
│   │   └── ...
│   ├── repositories/        # Data access (SQLx)
│   │   ├── mod.rs
│   │   └── ...
│   ├── hardware/            # Device drivers
│   │   ├── mod.rs
│   │   ├── printer.rs
│   │   ├── scale.rs
│   │   └── ...
│   ├── models/              # Domain models
│   └── database/            # DB connection pool
├── Cargo.toml
└── tauri.conf.json
```

## 📐 Padrões de Código

### Tauri Command

```rust
use tauri::command;
use crate::services::ProductService;
use crate::models::{Product, ProductFilter};

/// Lista produtos com filtros opcionais
#[command]
pub async fn get_products(
    filter: ProductFilter,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<Product>, String> {
    let service = ProductService::new(state.pool.clone());

    service
        .list(filter)
        .await
        .map_err(|e| e.to_string())
}
```

### Repository Pattern

```rust
pub struct ProductRepository {
    pool: Pool<Sqlite>,
}

impl ProductRepository {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }

    pub async fn find_by_barcode(&self, barcode: &str) -> Result<Option<Product>, sqlx::Error> {
        sqlx::query_as!(
            Product,
            r#"
            SELECT id, barcode, name, sale_price, current_stock
            FROM products
            WHERE barcode = ? AND is_active = true
            "#,
            barcode
        )
        .fetch_optional(&self.pool)
        .await
    }
}
```

### Error Handling

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Produto não encontrado")]
    ProductNotFound,

    #[error("Estoque insuficiente: {available} disponível, {requested} solicitado")]
    InsufficientStock { available: f64, requested: f64 },

    #[error("Erro de banco: {0}")]
    Database(#[from] sqlx::Error),
}

impl From<AppError> for String {
    fn from(error: AppError) -> Self {
        error.to_string()
    }
}
```

## ✅ Checklist de Implementação

- [ ] Command registrado em `main.rs` com `.invoke_handler()`
- [ ] Tipos de retorno são `Result<T, String>`
- [ ] Erros tratados com mensagens em português
- [ ] Logs em pontos críticos com `tracing`
- [ ] Sem `.unwrap()` em produção
- [ ] Transações para operações múltiplas
- [ ] Índices em queries frequentes

## 🔗 Recursos

- [Tauri 2.0 Docs](https://v2.tauri.app/)
- [SQLx Guide](https://github.com/launchbadge/sqlx)
- [Rust Book](https://doc.rust-lang.org/book/)

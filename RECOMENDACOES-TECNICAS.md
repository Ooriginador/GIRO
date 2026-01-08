# 🛡️ Recomendações Técnicas - Database & Backend

> **Data:** 8 de Janeiro de 2026  
> **Agente:** Database  
> **Escopo:** Melhorias, Otimizações e Boas Práticas  
> **Prioridade:** Pós-Release (Sprint 7-8)

---

## 🎯 Recomendações Imediatas (Sprint 7)

### 1. Implementar Paginação em Listagens ⭐⭐⭐

**Prioridade:** Alta  
**Impacto:** Performance e UX  
**Esforço:** 2-3 dias

**Problema:**  
Listagens de produtos, vendas e movimentações podem crescer significativamente  
ao longo do tempo. Sem paginação, a UI pode ficar lenta com muitos registros.

**Solução:**

```rust
// Backend - ProductRepository
pub async fn find_paginated(
    &self,
    page: i32,
    page_size: i32,
    filters: &ProductFilters,
) -> AppResult<PaginatedResult<Product>> {
    let offset = (page - 1) * page_size;

    // Query com paginação
    let products = self.find_with_filters(filters).await?;

    // Count total
    let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM products WHERE is_active = 1")
        .fetch_one(self.pool)
        .await?;

    Ok(PaginatedResult {
        items: products,
        total: total.0 as i32,
        page,
        page_size,
        total_pages: (total.0 as f64 / page_size as f64).ceil() as i32,
    })
}
```

**Benefícios:**

- ✅ Melhor performance em listagens grandes
- ✅ UX mais responsiva
- ✅ Menor consumo de memória

---

### 2. Refatorar Commands para Services ⭐⭐

**Prioridade:** Média  
**Impacto:** Manutenibilidade  
**Esforço:** 1 semana

**Problema:**  
Atualmente, lógica de negócio está nos Tauri Commands. Isso dificulta:

- Testes unitários
- Reuso de lógica
- Separação de responsabilidades

**Solução:**

```rust
// services/sale_service.rs
pub struct SaleService {
    sale_repo: SaleRepository,
    stock_repo: StockRepository,
    cash_repo: CashRepository,
}

impl SaleService {
    pub async fn create_sale(&self, data: CreateSale) -> AppResult<Sale> {
        // Validações
        self.validate_sale(&data)?;

        // Verifica se caixa está aberto
        let session = self.cash_repo.get_current().await?;
        if session.is_none() {
            return Err(AppError::CashSessionClosed);
        }

        // Inicia transação
        let mut tx = self.pool.begin().await?;

        // Cria venda
        let sale = self.sale_repo.create(&data, &mut tx).await?;

        // Atualiza estoque (FIFO)
        for item in &data.items {
            self.stock_repo.decrease_stock(
                &item.product_id,
                item.quantity,
                &mut tx,
            ).await?;
        }

        // Registra movimento de caixa
        self.cash_repo.add_movement(
            &session.unwrap().id,
            CashMovementType::SALE,
            sale.total,
            &mut tx,
        ).await?;

        // Commit
        tx.commit().await?;

        Ok(sale)
    }

    fn validate_sale(&self, data: &CreateSale) -> AppResult<()> {
        // Validações complexas
        if data.items.is_empty() {
            return Err(AppError::Validation("Venda sem itens".into()));
        }

        if data.amount_paid < data.total {
            return Err(AppError::Validation("Valor pago insuficiente".into()));
        }

        Ok(())
    }
}

// commands/sale.rs (simplificado)
#[tauri::command]
pub async fn create_sale(
    state: State<'_, AppState>,
    data: CreateSale,
) -> Result<Sale, ApiError> {
    let service = SaleService::new(state.pool());
    let sale = service.create_sale(data).await?;
    Ok(sale)
}
```

**Benefícios:**

- ✅ Código mais testável
- ✅ Lógica reutilizável
- ✅ Separação de responsabilidades
- ✅ Transações atômicas garantidas

---

### 3. Implementar Testes Unitários ⭐⭐⭐

**Prioridade:** Alta  
**Impacto:** Qualidade e Confiabilidade  
**Esforço:** 1-2 semanas

**Meta:** 80% de cobertura em Services e Repositories

**Exemplo:**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_sale_success() {
        let pool = setup_test_db().await;
        let service = SaleService::new(&pool);

        let data = CreateSale {
            items: vec![
                CreateSaleItem {
                    product_id: "test_product".into(),
                    quantity: 2.0,
                    unit_price: 10.0,
                    discount: None,
                }
            ],
            payment_method: PaymentMethod::CASH,
            amount_paid: 20.0,
            employee_id: "test_employee".into(),
            cash_session_id: "test_session".into(),
            discount_value: None,
            discount_reason: None,
            discount_type: None,
        };

        let sale = service.create_sale(data).await.unwrap();

        assert_eq!(sale.total, 20.0);
        assert_eq!(sale.change, 0.0);
        assert_eq!(sale.status, SaleStatus::COMPLETED);
    }

    #[tokio::test]
    async fn test_create_sale_insufficient_payment() {
        let pool = setup_test_db().await;
        let service = SaleService::new(&pool);

        let data = CreateSale {
            items: vec![...],
            amount_paid: 15.0, // Insuficiente
            // ...
        };

        let result = service.create_sale(data).await;

        assert!(result.is_err());
        assert_eq!(
            result.unwrap_err().to_string(),
            "Valor pago insuficiente"
        );
    }
}
```

**Framework:** [tokio-test](https://docs.rs/tokio-test/)  
**Cobertura:** [cargo-tarpaulin](https://github.com/xd009642/tarpaulin)

---

## 🚀 Recomendações de Performance (Sprint 8)

### 4. Implementar Cache em Memória ⭐

**Prioridade:** Baixa  
**Impacto:** Performance  
**Esforço:** 2-3 dias

**Use Case:** Cachear categorias, settings, funcionários ativos

```rust
use moka::sync::Cache;

pub struct CacheManager {
    categories: Cache<String, Vec<Category>>,
    settings: Cache<String, Setting>,
}

impl CacheManager {
    pub fn new() -> Self {
        Self {
            categories: Cache::builder()
                .max_capacity(100)
                .time_to_live(Duration::from_secs(300)) // 5 min
                .build(),
            settings: Cache::builder()
                .max_capacity(1000)
                .time_to_live(Duration::from_secs(600)) // 10 min
                .build(),
        }
    }

    pub async fn get_categories(&self, repo: &CategoryRepository) -> AppResult<Vec<Category>> {
        if let Some(cached) = self.categories.get("all") {
            return Ok(cached);
        }

        let categories = repo.find_all().await?;
        self.categories.insert("all".into(), categories.clone());

        Ok(categories)
    }
}
```

---

### 5. Vacuum e Analyze Periódicos ⭐

**Prioridade:** Baixa  
**Impacto:** Performance a longo prazo  
**Esforço:** 1 dia

**Problema:**  
SQLite pode fragmentar com muitas operações de escrita/deleção.

**Solução:**

```rust
// services/maintenance_service.rs
pub struct MaintenanceService {
    pool: &SqlitePool,
}

impl MaintenanceService {
    pub async fn vacuum(&self) -> AppResult<()> {
        tracing::info!("Executando VACUUM...");
        sqlx::query("VACUUM").execute(self.pool).await?;
        Ok(())
    }

    pub async fn analyze(&self) -> AppResult<()> {
        tracing::info!("Executando ANALYZE...");
        sqlx::query("ANALYZE").execute(self.pool).await?;
        Ok(())
    }

    pub async fn optimize(&self) -> AppResult<()> {
        // VACUUM + ANALYZE
        self.vacuum().await?;
        self.analyze().await?;

        tracing::info!("Otimização concluída");
        Ok(())
    }
}

// Executar semanalmente ou em horário de baixa atividade
```

**Agendar:** Executar automaticamente às 03:00 (se PC ligado)

---

### 6. Índices Full-Text Search (FTS5) ⭐⭐

**Prioridade:** Média  
**Impacto:** Performance de Busca  
**Esforço:** 2-3 dias

**Use Case:** Busca textual avançada em produtos

```sql
-- Criar tabela FTS5
CREATE VIRTUAL TABLE products_fts USING fts5(
    name,
    description,
    barcode,
    internal_code,
    content=products,
    content_rowid=rowid
);

-- Triggers para manter sincronizado
CREATE TRIGGER products_ai AFTER INSERT ON products BEGIN
    INSERT INTO products_fts(rowid, name, description, barcode, internal_code)
    VALUES (new.rowid, new.name, new.description, new.barcode, new.internal_code);
END;

-- Busca rápida
SELECT p.* FROM products p
JOIN products_fts fts ON p.rowid = fts.rowid
WHERE products_fts MATCH 'coca cola'
ORDER BY rank;
```

**Benefícios:**

- ✅ Busca muito mais rápida (10-100x)
- ✅ Ranking de relevância
- ✅ Suporte a frases exatas

---

## 🔒 Recomendações de Segurança

### 7. Sanitizar Logs ⭐⭐⭐

**Prioridade:** Alta (pré-release)  
**Impacto:** Segurança  
**Esforço:** 1 dia

**Problema:**  
Logs podem conter informações sensíveis (PINs, senhas, dados pessoais)

**Solução:**

```rust
// utils/sanitizer.rs
pub fn sanitize_employee(emp: &Employee) -> SafeEmployee {
    SafeEmployee {
        id: emp.id.clone(),
        name: emp.name.clone(),
        role: emp.role,
        is_active: emp.is_active,
        // NÃO LOGAR: pin, password, cpf
    }
}

// Logs
tracing::info!("Funcionário autenticado: {:?}", sanitize_employee(&employee));
```

---

### 8. Limitar Taxa de Tentativas de Login ⭐⭐

**Prioridade:** Média  
**Impacto:** Segurança  
**Esforço:** 1 dia

**Use Case:** Prevenir brute-force em PINs

```rust
use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::HashMap;

pub struct RateLimiter {
    attempts: Arc<RwLock<HashMap<String, Vec<Instant>>>>,
}

impl RateLimiter {
    pub async fn check_rate_limit(&self, employee_id: &str) -> bool {
        let mut attempts = self.attempts.write().await;
        let now = Instant::now();

        let employee_attempts = attempts.entry(employee_id.to_string())
            .or_insert_with(Vec::new);

        // Remove tentativas antigas (> 15 min)
        employee_attempts.retain(|&t| now.duration_since(t).as_secs() < 900);

        // Máximo 5 tentativas em 15 min
        if employee_attempts.len() >= 5 {
            return false; // Bloqueado
        }

        employee_attempts.push(now);
        true // Permitido
    }
}
```

---

## 📊 Recomendações de Monitoramento

### 9. Métricas de Performance ⭐

**Prioridade:** Baixa  
**Impacto:** Observabilidade  
**Esforço:** 2-3 dias

**Use Case:** Monitorar queries lentas, erros, uso de recursos

```rust
use tracing::instrument;

#[instrument(name = "product_search", skip(self))]
pub async fn search(&self, term: &str, limit: i32) -> AppResult<Vec<Product>> {
    let start = Instant::now();

    let result = sqlx::query_as::<_, Product>(/* ... */)
        .fetch_all(self.pool)
        .await?;

    let duration = start.elapsed();

    // Log se query demorou muito
    if duration.as_millis() > 100 {
        tracing::warn!(
            "Query lenta: {}ms para busca '{}'",
            duration.as_millis(),
            term
        );
    }

    Ok(result)
}
```

---

## 🗄️ Recomendações de Banco de Dados

### 10. Backup Incremental ⭐⭐

**Prioridade:** Média  
**Impacto:** Disaster Recovery  
**Esforço:** 3-5 dias

**Problema:**  
Atualmente, apenas backup completo. Para bancos grandes, pode ser lento.

**Solução:**

```rust
pub async fn incremental_backup(&self) -> AppResult<()> {
    // Usando WAL, copiar apenas WAL file
    let wal_path = format!("{}-wal", self.db_path);

    if Path::new(&wal_path).exists() {
        let backup_path = self.backup_dir.join(
            format!("backup_{}_wal.db", chrono::Utc::now().timestamp())
        );

        std::fs::copy(&wal_path, backup_path)?;

        // Checkpoint para consolidar
        sqlx::query("PRAGMA wal_checkpoint(PASSIVE)")
            .execute(self.pool)
            .await?;
    }

    Ok(())
}
```

---

### 11. Constraints de Validação ⭐⭐

**Prioridade:** Média  
**Impacto:** Integridade de Dados  
**Esforço:** 1 dia

**Use Case:** Adicionar constraints no schema Prisma

```prisma
model Product {
  // ... campos existentes

  // Constraints
  @@check("sale_price > 0", name: "positive_sale_price")
  @@check("current_stock >= 0", name: "non_negative_stock")
  @@check("min_stock >= 0", name: "non_negative_min_stock")
}

model Sale {
  // ... campos existentes

  @@check("amount_paid >= total", name: "sufficient_payment")
  @@check("change >= 0", name: "non_negative_change")
  @@check("subtotal >= 0", name: "positive_subtotal")
}
```

---

## 📝 Priorização das Recomendações

| #   | Recomendação             | Prioridade | Sprint | Esforço  |
| --- | ------------------------ | ---------- | ------ | -------- |
| 1   | Paginação em Listagens   | ⭐⭐⭐     | 7      | 2-3 dias |
| 2   | Refatorar para Services  | ⭐⭐       | 7-8    | 1 semana |
| 3   | Testes Unitários         | ⭐⭐⭐     | 7      | 1-2 sem  |
| 4   | Cache em Memória         | ⭐         | 8      | 2-3 dias |
| 5   | Vacuum Periódico         | ⭐         | 8      | 1 dia    |
| 6   | Full-Text Search (FTS5)  | ⭐⭐       | 8      | 2-3 dias |
| 7   | Sanitizar Logs           | ⭐⭐⭐     | 6      | 1 dia    |
| 8   | Rate Limiting de Login   | ⭐⭐       | 7      | 1 dia    |
| 9   | Métricas de Performance  | ⭐         | 8      | 2-3 dias |
| 10  | Backup Incremental       | ⭐⭐       | 8      | 3-5 dias |
| 11  | Constraints de Validação | ⭐⭐       | 7      | 1 dia    |

---

## 🎯 Roadmap de Implementação

### Sprint 7 (Prioridade Alta)

1. ✅ Paginação (3 dias)
2. ✅ Testes Unitários - Fase 1 (5 dias)
3. ✅ Refatorar SaleService (3 dias)
4. ✅ Rate Limiting (1 dia)
5. ✅ Constraints de Validação (1 dia)

**Total:** ~13 dias úteis

### Sprint 8 (Melhorias)

1. ✅ Testes Unitários - Fase 2 (5 dias)
2. ✅ Cache em Memória (2 dias)
3. ✅ Full-Text Search (3 dias)
4. ✅ Backup Incremental (4 dias)
5. ✅ Métricas (2 dias)
6. ✅ Vacuum Automático (1 dia)

**Total:** ~17 dias úteis

---

_Recomendações compiladas pelo Database Agent - 8 de Janeiro de 2026_

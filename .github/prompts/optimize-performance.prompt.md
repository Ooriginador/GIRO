# Optimize Performance

Analise e otimize a performance do código/feature especificado.

## Contexto

- **Área:** {{area}} (database/frontend/backend/network)
- **Arquivo(s):** {{files}}
- **Problema:** {{problem_description}}
- **Meta:** {{performance_target}}

## Análise de Performance

### 1. Métricas Atuais

Colete métricas antes da otimização:

```
- Tempo de resposta: ___ms
- Uso de memória: ___MB
- Queries executadas: ___
- Bundle size: ___KB
```

### 2. Identificar Gargalos

#### Database
- [ ] N+1 queries
- [ ] Queries sem índice
- [ ] Joins excessivos
- [ ] Falta de paginação

#### Frontend
- [ ] Renders desnecessários
- [ ] Bundle muito grande
- [ ] Imagens não otimizadas
- [ ] Falta de lazy loading

#### Backend
- [ ] Operações síncronas bloqueantes
- [ ] Falta de cache
- [ ] Serialização ineficiente
- [ ] Memory leaks

#### Network
- [ ] Muitas requisições
- [ ] Payloads grandes
- [ ] Falta de compressão
- [ ] WebSocket vs polling

## Técnicas de Otimização

### SQLx (Rust)

```rust
// ❌ N+1 Query
for order in orders {
    let items = sqlx::query_as!(Item, "SELECT * FROM items WHERE order_id = ?", order.id)
        .fetch_all(&pool).await?;
}

// ✅ Single Query com Join
let orders_with_items = sqlx::query_as!(
    OrderWithItems,
    r#"
    SELECT o.*, i.* FROM orders o
    LEFT JOIN items i ON i.order_id = o.id
    WHERE o.user_id = ?
    "#,
    user_id
).fetch_all(&pool).await?;
```

### React (Frontend)

```typescript
// ❌ Re-render em toda mudança
function ProductList({ products }) {
  return products.map(p => <Product key={p.id} {...p} />);
}

// ✅ Memoizado
const MemoizedProduct = React.memo(Product);
function ProductList({ products }) {
  return products.map(p => <MemoizedProduct key={p.id} {...p} />);
}
```

### Tauri (IPC)

```rust
// ❌ Múltiplas chamadas IPC
#[tauri::command]
async fn get_order(id: i64) -> Order { ... }

#[tauri::command]  
async fn get_order_items(id: i64) -> Vec<Item> { ... }

// ✅ Chamada única
#[tauri::command]
async fn get_order_with_items(id: i64) -> OrderWithItems { ... }
```

## Output Esperado

### Métricas Após Otimização

```
- Tempo de resposta: ___ms (↓ __%)
- Uso de memória: ___MB (↓ __%)
- Queries executadas: ___ (↓ __%)
- Bundle size: ___KB (↓ __%)
```

### Entregáveis

- [ ] Código otimizado
- [ ] Benchmark comparativo
- [ ] Documentação das mudanças
- [ ] Testes de regressão

## Ferramentas

- Use `Rust` agent para otimizações backend
- Use `Frontend` agent para React
- Use `Database` agent para queries
- Use Chrome DevTools / Tauri DevTools para profiling

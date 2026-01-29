---
mode: agent
description: Cria um novo Tauri command end-to-end (backend + frontend + types)
variables:
  - name: commandName
    description: Nome do command (ex: get_products, create_sale)
  - name: entityName
    description: Nome da entidade principal (ex: Product, Sale, Customer)
  - name: description
    description: Breve descrição do que o command faz
agent: Rust
---

# Criar Tauri Command E2E: `{{commandName}}`

## Contexto
Criar um novo Tauri command completo para **{{entityName}}** com a seguinte funcionalidade:
> {{description}}

## Instruções

### 1. Backend (Rust)
Crie o command em `apps/desktop/src-tauri/src/commands/`:

```rust
#[tauri::command]
pub async fn {{commandName}}(
    // params tipados
    state: tauri::State<'_, AppState>,
) -> Result<ResponseType, String> {
    // Implementação
}
```

**Padrões a seguir:**
- Use `Result<T, String>` para erros
- Acesse o pool via `state.pool.clone()`
- Use SQLx para queries tipadas
- Docstrings com `///`

### 2. Registrar no main.rs
Adicione ao `invoke_handler`:
```rust
.invoke_handler(tauri::generate_handler![
    // ... existing
    commands::{{commandName}},
])
```

### 3. Types (TypeScript)
Crie/atualize em `apps/desktop/src/types/`:
```typescript
export interface {{entityName}} {
  id: string;
  // ... campos
}
```

### 4. Hook (React)
Crie hook em `apps/desktop/src/hooks/`:
```typescript
export function use{{entityName}}() {
  return useQuery({
    queryKey: ['{{entityName | lowercase}}'],
    queryFn: () => invoke<{{entityName}}[]>('{{commandName}}'),
  });
}
```

### 5. Testes
Adicione teste em `apps/desktop/src-tauri/src/commands/tests/`

## Checklist
- [ ] Command Rust criado e tipado
- [ ] Registrado no invoke_handler
- [ ] Types TypeScript exportados
- [ ] Hook React com TanStack Query
- [ ] Teste unitário adicionado

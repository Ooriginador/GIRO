# 🧪 Guia de Testes - Mercearias

## 📋 Visão Geral

Este documento descreve a estratégia de testes unitários e de integração do projeto Mercearias, com meta de **85%+ de cobertura de código**.

## 🏗️ Estrutura de Testes

```
apps/desktop/
├── src/
│   ├── hooks/__tests__/         # Testes de hooks React Query
│   ├── stores/__tests__/         # Testes de stores Zustand
│   └── components/__tests__/     # Testes de componentes React
├── tests/
│   ├── setup.ts                  # Setup global do Vitest
│   ├── unit/                     # Testes unitários
│   ├── integration/              # Testes de integração
│   └── e2e/                      # Testes E2E Playwright
└── src-tauri/
    └── src/repositories/         # Testes Rust inline (_test.rs)
```

## 🎯 Metas de Cobertura

| Módulo        | Meta | Prioridade |
| ------------- | ---- | ---------- |
| Repositories  | 90%  | Alta       |
| Commands      | 85%  | Alta       |
| Hooks         | 85%  | Alta       |
| Stores        | 90%  | Alta       |
| Services      | 80%  | Média      |
| Components    | 75%  | Média      |
| Utils/Helpers | 95%  | Alta       |

## 🔧 Comandos de Teste

### Frontend (TypeScript/Vitest)

```bash
# Todos os testes (modo watch)
pnpm test

# Todos os testes (single run)
pnpm test:run

# Com cobertura
pnpm test:coverage

# Testes E2E
pnpm test:e2e
pnpm test:e2e:ui
pnpm test:e2e:debug
```

### Backend (Rust/Cargo)

```bash
# Todos os testes
cargo test

# Testes específicos
cargo test repositories

# Com output detalhado
cargo test -- --nocapture

# Com cobertura (requer cargo-llvm-cov)
cargo llvm-cov --html
```

## 📝 Padrões de Teste

### Frontend - Hooks React Query

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useExample', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch data successfully', async () => {
    vi.mocked(tauriInvoke).mockResolvedValue({ id: '1', name: 'Test' });

    const { result } = renderHook(() => useExample(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ id: '1', name: 'Test' });
  });
});
```

### Frontend - Stores Zustand

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useExampleStore } from '@/stores/exampleStore';

describe('Example Store', () => {
  beforeEach(() => {
    useExampleStore.getState().reset();
  });

  it('should update state', () => {
    const { setState } = useExampleStore.getState();

    setState({ value: 'test' });

    const state = useExampleStore.getState();
    expect(state.value).toBe('test');
  });
});
```

### Backend - Rust Repositories

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::SqlitePool;

    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePool::connect(":memory:").await.unwrap();
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();
        pool
    }

    #[tokio::test]
    async fn test_create() {
        let pool = setup_test_db().await;
        let repo = ExampleRepository::new(&pool);

        let input = CreateInput {
            name: "Test".to_string(),
            // ...
        };

        let result = repo.create(input).await;

        assert!(result.is_ok());
        let item = result.unwrap();
        assert_eq!(item.name, "Test");
    }
}
```

## 🎭 Mocking

### Frontend - Tauri Commands

```typescript
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Em cada teste
const { invoke } = await import('@tauri-apps/api/core');
(invoke as any).mockResolvedValue({ data: 'mocked' });
```

### Frontend - React Query

```typescript
vi.mock('@/lib/tauri', () => ({
  getProducts: vi.fn(),
  createProduct: vi.fn(),
  // ...
}));
```

## 📊 Cobertura Atual

### Frontend

```bash
pnpm test:coverage
```

Resultados esperados:

- **Hooks**: 85%+
- **Stores**: 90%+
- **Utils**: 95%+

### Backend

```bash
cargo llvm-cov --html
open target/llvm-cov/html/index.html
```

Resultados esperados:

- **Repositories**: 90%+
- **Commands**: 85%+
- **Services**: 80%+

## 🏃 Testes Implementados

### ✅ Backend (Rust)

- **CashRepository**: 8 testes (CRUD + business logic)
- **ProductRepository**: 10 testes (CRUD + search + stock)
- **EmployeeRepository**: 9 testes (auth + roles + CRUD)

### ✅ Frontend (TypeScript)

- **useProducts**: 5 testes (queries + mutations)
- **useEmployees**: 4 testes (queries + mutations)
- **authStore**: 7 testes
- **pdvStore**: 13 testes

### ⏳ Pendente

- SaleRepository
- CategoryRepository
- SupplierRepository
- StockRepository
- AlertRepository
- SettingsRepository
- Commands (todos)
- Componentes React principais

## 🐛 Debug de Testes

### Frontend

```bash
# Ver output detalhado
pnpm test -- --reporter=verbose

# Rodar teste específico
pnpm test -- ProductSearch

# UI interativa
pnpm test:ui
```

### Backend

```bash
# Output completo
cargo test -- --nocapture --test-threads=1

# Teste específico
cargo test test_create_product

# Com trace
RUST_LOG=debug cargo test
```

## 📚 Referências

- [Vitest Docs](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright](https://playwright.dev/)
- [Cargo Test](https://doc.rust-lang.org/cargo/commands/cargo-test.html)
- [SQLx Testing](https://github.com/launchbadge/sqlx#testing)

## 🔄 CI/CD

Os testes são executados automaticamente em cada PR:

1. **Lint** → ESLint + Clippy
2. **Type Check** → TSC + Cargo Check
3. **Unit Tests** → Vitest + Cargo Test
4. **Coverage** → Relatórios gerados
5. **E2E** → Playwright (smoke tests)

---

**Meta Global**: 85%+ de cobertura até 15/01/2026 ✅

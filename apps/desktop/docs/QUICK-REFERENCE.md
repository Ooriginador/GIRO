# ⚡ Guia Rápido - Testes Windows GIRO

> **Para desenvolvedores**: Copie e cole estes padrões nos seus testes

---

## 🎯 Template Básico

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('MyComponent', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('should render component', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MyComponent />
      </QueryClientProvider>
    );

    await vi.runAllTimersAsync();

    expect(screen.getByText(/hello/i)).toBeInTheDocument();
  });
});
```

---

## 🔥 Snippets Rápidos

### 1. Setup de Teste

```typescript
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});
```

### 2. Render com QueryClient

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

render(
  <QueryClientProvider client={queryClient}>
    <MyComponent />
  </QueryClientProvider>
);

await vi.runAllTimersAsync();
```

### 3. Click + Wait

```typescript
const button = screen.getByRole('button');
fireEvent.click(button);
await vi.runAllTimersAsync();

await waitFor(
  () => {
    expect(screen.getByText('Result')).toBeInTheDocument();
  },
  { timeout: 5000, interval: 50 }
);
```

### 4. Dialog/Modal

```typescript
fireEvent.click(openButton);
await vi.runAllTimersAsync();

const dialog = await screen.findByRole('dialog', {}, { timeout: 5000 });
const confirmBtn = within(dialog).getByRole('button', { name: /confirm/i });

fireEvent.click(confirmBtn);
await vi.runAllTimersAsync();
```

### 5. Keyboard Event

```typescript
const event = new KeyboardEvent('keydown', {
  key: 'F1',
  bubbles: true,
  cancelable: true,
});
window.dispatchEvent(event);

await vi.runAllTimersAsync();
```

### 6. Hover (Tooltip)

```typescript
const user = userEvent.setup({ delay: null });
await user.hover(element);
await vi.runAllTimersAsync();

const tooltip = await screen.findByRole('tooltip', {}, { timeout: 5000 });
```

---

## 📋 Checklist Rápido

Antes de commitar, verifique:

- [ ] `vi.useFakeTimers()` no beforeEach
- [ ] `vi.useRealTimers()` no afterEach
- [ ] `await vi.runAllTimersAsync()` após render
- [ ] `await vi.runAllTimersAsync()` após cada ação
- [ ] `timeout: 5000` em waitFor/findBy
- [ ] QueryClient se usar hooks
- [ ] KeyboardEvent nativo para hotkeys
- [ ] `within(dialog)` para portals

---

## 🚫 Evite

```typescript
// ❌ ERRADO
describe('test', () => {
  it('should work', () => {
    render(<Component />);
    expect(...).toBe(...);
  });
});

// ❌ ERRADO - timeout curto
await waitFor(() => {}, { timeout: 1000 });

// ❌ ERRADO - sem flush
fireEvent.click(button);
expect(screen.getByText('Result')).toBeInTheDocument();

// ❌ ERRADO - sem QueryClient
render(<ComponentWithHooks />);
```

---

## ✅ Faça

```typescript
// ✅ CORRETO
describe('test', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('should work', async () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <Component />
      </QueryClientProvider>
    );

    await vi.runAllTimersAsync();

    fireEvent.click(button);
    await vi.runAllTimersAsync();

    await waitFor(
      () => {
        expect(screen.getByText('Result')).toBeInTheDocument();
      },
      { timeout: 5000, interval: 50 }
    );
  });
});
```

---

## 🔧 Comandos Úteis

```bash
# Rodar um teste específico
npx vitest run src/__tests__/MyComponent.test.tsx

# Rodar com watch
npx vitest src/__tests__/MyComponent.test.tsx

# Ver coverage
pnpm test:coverage

# Rodar E2E
pnpm test:e2e
```

---

## 📚 Documentação Completa

- [WINDOWS-TESTING-GUIDE.md](WINDOWS-TESTING-GUIDE.md) - Guia completo
- [TESTING-BEST-PRACTICES.md](TESTING-BEST-PRACTICES.md) - Boas práticas
- [TESTING-STATUS.md](TESTING-STATUS.md) - Status atual

---

**Última atualização**: 26/01/2026

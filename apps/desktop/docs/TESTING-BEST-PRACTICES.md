# 🧪 Boas Práticas de Testes - GIRO

> Lições aprendidas e padrões descobertos durante implementação dos testes skip

---

## 🎯 Princípios Fundamentais

### 1. Mocks Devem Espelhar o Comportamento Real

```typescript
// ❌ Mock estático - não responde a parâmetros
vi.mocked(useProducts).mockReturnValue({
  data: mockProducts,
  isLoading: false,
});

// ✅ Mock dinâmico - responde aos parâmetros do hook
vi.mocked(useProducts).mockImplementation((search, status) => {
  let filtered = [...mockProducts];

  if (search) {
    filtered = filtered.filter((p) => p.name.includes(search));
  }

  if (status !== undefined) {
    filtered = filtered.filter((p) => p.isActive === status);
  }

  return { data: filtered, isLoading: false };
});
```

### 2. Entenda Como os Hooks Atualizam Estado

```typescript
// Hook que atualiza estado LOCALMENTE
const updateCustomer = async (id: string, data: UpdateCustomerDto) => {
  const updated = await invoke('update_customer', { id, data });

  // ✅ Atualização local - NÃO chama refresh
  setCustomers((prev) => prev.map((c) => (c.id === id ? updated : c)));

  return updated;
};

// ❌ Mock errado - mocka refresh que não acontece
mockInvoke.mockResolvedValueOnce(updated); // update
mockInvoke.mockResolvedValueOnce([updated]); // ❌ refresh extra

// ✅ Mock correto - só mocka o update
mockInvoke.mockResolvedValueOnce(updated); // update
// O estado é atualizado pelo map() interno
```

### 3. Use act() para Operações Assíncronas

```typescript
// ❌ Sem act() - React warnings
const result = await hook.mutateAsync(data);

// ✅ Com act() - limpo
await act(async () => {
  await hook.mutateAsync(data);
});

// ✅ Para retornar valor
const result = await act(async () => {
  return await hook.mutateAsync(data);
});
```

### 4. Conheça os Tipos Reais do Sistema

```typescript
// ❌ Tipos inventados
expect(businessType).toBe('motoparts');
expect(profile.name).toBe('Almoxarifado Industrial');

// ✅ Tipos reais do enum BusinessType
expect(businessType).toBe('MOTOPARTS'); // uppercase
expect(profile.name).toBe('Enterprise'); // nome real

// Tipos válidos:
// - GROCERY (padrão)
// - MOTOPARTS
// - ENTERPRISE
// - GENERAL
```

---

## 📚 Padrões por Categoria

### Testes de Componentes React

```typescript
describe('ProductsPage', () => {
  beforeEach(() => {
    // Setup de mocks dinâmicos
    vi.mocked(useProductsPaginated).mockImplementation((page, perPage, search) => {
      let data = [...mockProducts];
      if (search) data = data.filter(/* ... */);
      return { data: { data, total: data.length }, isLoading: false };
    });
  });

  it('should handle search with debounce', async () => {
    const user = userEvent.setup();
    render(<ProductsPage />);

    // Interação
    const searchInput = screen.getByPlaceholderText(/buscar/i);
    await user.type(searchInput, 'café');

    // Esperar debounce (500ms) com margem
    await waitFor(
      () => {
        expect(screen.getByText('Café Premium')).toBeInTheDocument();
      },
      { timeout: 2000 } // 500ms debounce + margem
    );
  });
});
```

### Testes de Custom Hooks (React Query)

```typescript
describe('useCustomers', () => {
  beforeEach(() => {
    // Mock do invoke com valores iniciais
    mockInvoke.mockResolvedValue([]);

    // Limpar query cache entre testes
    queryClient.clear();
  });

  it('should create customer and update state', async () => {
    const { result } = renderHook(() => useCustomers(), {
      wrapper: createWrapper(),
    });

    // Esperar query inicial
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Mock para create
    mockInvoke.mockResolvedValueOnce(newCustomer);

    // Executar mutation
    await act(async () => {
      await result.current.createCustomer.mutateAsync(customerData);
    });

    // Verificar estado atualizado
    expect(result.current.customers).toContainEqual(
      expect.objectContaining({ id: newCustomer.id })
    );
  });
});
```

### Testes de Zustand Stores

```typescript
describe('useBusinessProfile', () => {
  beforeEach(() => {
    // Reset store para estado inicial
    const { resetProfile } = useBusinessProfile.getState();
    resetProfile();
  });

  it('should update profile when type changes', () => {
    const { result } = renderHook(() => useBusinessProfile());

    act(() => {
      result.current.setBusinessType('MOTOPARTS');
    });

    expect(result.current.businessType).toBe('MOTOPARTS');
    expect(result.current.profile.name).toBe('Autopeças');
    expect(result.current.profile.features.vehicleCompatibility).toBe(true);
  });

  it('should check feature enabled', () => {
    const { result } = renderHook(() => useBusinessProfile());

    // GROCERY não tem vehicleCompatibility
    expect(result.current.isFeatureEnabled('vehicleCompatibility')).toBe(false);

    act(() => {
      result.current.setBusinessType('GENERAL');
    });

    // GENERAL tem vehicleCompatibility
    expect(result.current.isFeatureEnabled('vehicleCompatibility')).toBe(true);
  });
});
```

---

## 🚨 Antipadrões Comuns

### 1. Mock de Refresh Desnecessário

```typescript
// ❌ ERRADO
it('should update customer', async () => {
  mockInvoke.mockResolvedValueOnce([initialCustomer]); // load
  mockInvoke.mockResolvedValueOnce(updatedCustomer); // update
  mockInvoke.mockResolvedValueOnce([updatedCustomer]); // ❌ refresh que não acontece

  await hook.updateCustomer.mutateAsync(data);
});

// ✅ CORRETO
it('should update customer', async () => {
  mockInvoke.mockResolvedValueOnce([initialCustomer]); // load
  mockInvoke.mockResolvedValueOnce(updatedCustomer); // update
  // Hook atualiza estado com map(), não chama refresh

  await act(async () => {
    await hook.updateCustomer.mutateAsync(data);
  });
});
```

### 2. Esperar por Elemento Errado

```typescript
// ❌ ERRADO - espera por elemento que nunca aparece
await waitFor(() => {
  expect(screen.getByText('Produto X')).toBeInTheDocument();
});

// ✅ CORRETO - verifica se mock foi chamado corretamente
await waitFor(() => {
  expect(vi.mocked(useProducts)).toHaveBeenCalledWith(
    expect.anything(),
    expect.anything(),
    'search term'
  );
});
```

### 3. Tipos Hardcoded vs Constantes

```typescript
// ❌ ERRADO - strings hardcoded
expect(businessType).toBe('motoparts');
expect(businessType).toBe('retail');

// ✅ CORRETO - usar enums reais
import { BusinessType } from '@/types/business-profile';

expect(businessType).toBe(BusinessType.MOTOPARTS);
expect(businessType).toBe(BusinessType.GENERAL);

// Ou pelo menos uppercase correto
expect(businessType).toBe('MOTOPARTS');
expect(businessType).toBe('GENERAL');
```

### 4. Esqueceu de Limpar Mocks

```typescript
// ❌ ERRADO - mocks poluem outros testes
describe('MyTests', () => {
  it('test 1', () => {
    vi.mocked(useHook).mockReturnValue(data1);
    // ...
  });

  it('test 2', () => {
    // Ainda tem mock de test 1!
  });
});

// ✅ CORRETO - limpa antes de cada teste
describe('MyTests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ou vi.resetAllMocks() para reset completo
  });

  it('test 1', () => {
    vi.mocked(useHook).mockReturnValue(data1);
  });

  it('test 2', () => {
    vi.mocked(useHook).mockReturnValue(data2);
  });
});
```

---

## ⚡ Otimizações

### 1. Fake Timers para Debounce

```typescript
// Antes: Esperar tempo real (lento)
await user.type(input, 'café');
await waitFor(
  () => {
    expect(screen.getByText('Café Premium')).toBeInTheDocument();
  },
  { timeout: 2000 }
); // Espera 500ms debounce + margem

// Depois: Fake timers (rápido)
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it('should search with debounce', async () => {
  await user.type(input, 'café');

  // Avançar tempo fake
  vi.advanceTimersByTime(500);

  await waitFor(() => {
    expect(screen.getByText('Café Premium')).toBeInTheDocument();
  });
});
```

### 2. Mocks Leves

```typescript
// ❌ Mock pesado - cria objetos completos
const mockProducts = Array.from({ length: 100 }, (_, i) => ({
  id: `product-${i}`,
  name: `Product ${i}`,
  price: 10 + i,
  category: { id: '1', name: 'Category' /* muitos campos */ },
  supplier: { id: '1', name: 'Supplier' /* muitos campos */ },
  // ... 20+ campos
}));

// ✅ Mock leve - só campos usados no teste
const mockProducts = [
  { id: '1', name: 'Product 1', price: 10, isActive: true },
  { id: '2', name: 'Product 2', price: 20, isActive: false },
];
```

### 3. Setup Reutilizável

```typescript
// helpers/test-utils.tsx
export const createWrapper = () => {
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

// Uso
const { result } = renderHook(() => useMyHook(), {
  wrapper: createWrapper(),
});
```

---

## 📊 Debugging de Testes

### Ferramentas

```typescript
// 1. Renderizar estado do componente
import { screen, debug } from '@testing-library/react';

debug(); // Mostra todo o DOM
debug(screen.getByTestId('container')); // Mostra só um elemento

// 2. Ver queries disponíveis
screen.logTestingPlaygroundURL(); // Abre ferramenta online

// 3. Inspecionar chamadas de mock
console.log(vi.mocked(useHook).mock.calls);
console.log(vi.mocked(useHook).mock.results);

// 4. Verificar estado de hook
const { result } = renderHook(() => useMyHook());
console.log(result.current); // Estado atual do hook
```

### Problemas Comuns

| Sintoma                             | Causa Provável                 | Solução                           |
| ----------------------------------- | ------------------------------ | --------------------------------- |
| "Cannot find element"               | Mock retorna dados vazios      | Verificar mockReturnValue         |
| "Act warning"                       | Mutation sem act()             | Envolver em `act()`               |
| "Query failed"                      | Esqueceu de mockar invoke      | Adicionar mock no beforeEach      |
| "Test timeout"                      | Esperando elemento que não vem | Verificar se mock foi configurado |
| Teste passa localmente, falha no CI | Race condition ou timing       | Adicionar waitFor ou fake timers  |

---

## ✅ Checklist de Novo Teste

Antes de commitar um teste:

- [ ] Mock responde aos parâmetros do hook?
- [ ] Usado `act()` para mutations?
- [ ] Limpou mocks no `beforeEach`?
- [ ] Testou fluxo de erro (try/catch)?
- [ ] Nome do teste é descritivo?
- [ ] Não tem console.log esquecido?
- [ ] Passa localmente com `npx vitest run`?
- [ ] Não introduziu skip ou only?

---

**Mantido por**: Equipe GIRO  
**Última atualização**: 26/01/2026

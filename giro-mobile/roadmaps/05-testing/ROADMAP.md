# 🧪 Testing - Roadmap do Agente

> **Projeto**: GIRO Mobile  
> **Responsabilidade**: Testes unitários, integração e E2E para React Native

---

## 📋 Tarefas

### Fase 1: Setup de Testes

#### TASK-TEST-001: Configurar Jest + React Native Testing Library

- **Prioridade**: 🔴 Crítica
- **Estimativa**: 1.5h
- **Dependências**: TASK-SETUP-003
- **Status**: ⬜ Não iniciado

**Descrição**:
Configurar ambiente de testes com Jest e React Native Testing Library.

**Critérios de Aceite**:

- [ ] Jest configurado para React Native
- [ ] @testing-library/react-native instalado
- [ ] Mocks de módulos nativos
- [ ] Scripts npm configurados
- [ ] Coverage report funcionando

**Arquivo**: `jest.config.js`

```javascript
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/app/$1',
    '^@components/(.*)$': '<rootDir>/app/components/$1',
    '^@hooks/(.*)$': '<rootDir>/app/hooks/$1',
    '^@lib/(.*)$': '<rootDir>/app/lib/$1',
    '^@stores/(.*)$': '<rootDir>/app/stores/$1',
    '^@types/(.*)$': '<rootDir>/app/types/$1',
  },
  collectCoverageFrom: ['app/**/*.{ts,tsx}', '!app/**/*.d.ts', '!app/**/types/*.ts'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

**Arquivo**: `jest.setup.js`

```javascript
import '@testing-library/jest-native/extend-expect';

// Mock expo modules
jest.mock('expo-camera', () => ({
  Camera: 'Camera',
  useCameraPermissions: () => [{ granted: true }, jest.fn()],
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Error: 'error', Warning: 'warning' },
}));

jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn(() => Promise.resolve({ sound: { playAsync: jest.fn() } })),
    },
  },
}));

jest.mock('react-native-zeroconf', () => ({
  default: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    scan: jest.fn(),
    stop: jest.fn(),
  })),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Silence console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
};
```

---

#### TASK-TEST-002: Criar Test Utils e Helpers

- **Prioridade**: 🟡 Alta
- **Estimativa**: 1h
- **Dependências**: TASK-TEST-001
- **Status**: ⬜ Não iniciado

**Descrição**:
Criar utilitários para facilitar escrita de testes.

**Critérios de Aceite**:

- [ ] Render wrapper com providers
- [ ] Mock de WebSocket
- [ ] Mock de navigation
- [ ] Factories de dados

**Arquivo**: `app/test/utils.tsx`

```typescript
import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

// Providers wrapper
const AllProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <NavigationContainer>{children}</NavigationContainer>;
};

const customRender = (ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllProviders, ...options });

export * from '@testing-library/react-native';
export { customRender as render };
```

**Arquivo**: `app/test/factories.ts`

```typescript
import type { Product } from '@types/product';

export function createProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: '1',
    barcode: '7891234567890',
    name: 'Produto Teste',
    description: 'Descrição do produto',
    price: 9.99,
    cost: 5.0,
    stock: 100,
    minStock: 10,
    category: 'Geral',
    unit: 'UN',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createProducts(count: number): Product[] {
  return Array.from({ length: count }, (_, i) =>
    createProduct({
      id: String(i + 1),
      barcode: `789${String(i).padStart(10, '0')}`,
      name: `Produto ${i + 1}`,
    })
  );
}
```

**Arquivo**: `app/test/mocks/websocket.ts`

```typescript
import { EventEmitter } from 'events';

export class MockWebSocket extends EventEmitter {
  public readyState = 1; // OPEN
  public url: string;

  constructor(url: string) {
    super();
    this.url = url;
    setTimeout(() => this.emit('open'), 0);
  }

  send(data: string) {
    const message = JSON.parse(data);
    this.emit('sent', message);
  }

  close() {
    this.readyState = 3; // CLOSED
    this.emit('close');
  }

  // Helper to simulate receiving messages
  receiveMessage(type: string, payload: any) {
    const message = { type, payload, timestamp: Date.now() };
    this.emit('message', { data: JSON.stringify(message) });
  }
}

// Mock global WebSocket
export function mockWebSocket() {
  const mock = new MockWebSocket('ws://test:3847');
  (global as any).WebSocket = jest.fn(() => mock);
  return mock;
}
```

---

### Fase 2: Testes de Stores

#### TASK-TEST-003: Testes de Zustand Stores

- **Prioridade**: 🟡 Alta
- **Estimativa**: 2h
- **Dependências**: TASK-CONN-005, TASK-FEAT-004, TASK-FEAT-006
- **Status**: ⬜ Não iniciado

**Descrição**:
Testes unitários para todas as stores Zustand.

**Critérios de Aceite**:

- [ ] ConnectionStore testada
- [ ] ProductsStore testada
- [ ] InventoryStore testada
- [ ] SettingsStore testada
- [ ] Persistência testada

**Arquivo**: `app/stores/__tests__/connectionStore.test.ts`

```typescript
import { useConnectionStore } from '../connectionStore';

describe('ConnectionStore', () => {
  beforeEach(() => {
    useConnectionStore.setState({
      selectedDesktop: null,
      connectionState: 'disconnected',
      operator: null,
      lastConnectedDesktops: [],
    });
  });

  describe('selectDesktop', () => {
    it('should set selected desktop', () => {
      const desktop = { name: 'GIRO-001', host: 'local', port: 3847, ip: '192.168.1.100' };

      useConnectionStore.getState().selectDesktop(desktop);

      expect(useConnectionStore.getState().selectedDesktop).toEqual(desktop);
    });

    it('should add to history', () => {
      const desktop = { name: 'GIRO-001', host: 'local', port: 3847, ip: '192.168.1.100' };

      useConnectionStore.getState().selectDesktop(desktop);

      expect(useConnectionStore.getState().lastConnectedDesktops).toContainEqual(desktop);
    });

    it('should keep only last 5 in history', () => {
      for (let i = 0; i < 7; i++) {
        useConnectionStore.getState().selectDesktop({
          name: `GIRO-${i}`,
          host: 'local',
          port: 3847,
          ip: `192.168.1.${i}`,
        });
      }

      expect(useConnectionStore.getState().lastConnectedDesktops).toHaveLength(5);
    });
  });

  describe('setConnectionState', () => {
    it('should update connection state', () => {
      useConnectionStore.getState().setConnectionState('connected');

      expect(useConnectionStore.getState().connectionState).toBe('connected');
    });
  });

  describe('clearConnection', () => {
    it('should reset connection state', () => {
      useConnectionStore.setState({
        selectedDesktop: { name: 'GIRO-001', host: 'local', port: 3847, ip: '192.168.1.100' },
        connectionState: 'authenticated',
        operator: { id: '1', name: 'Test', role: 'caixa' },
      });

      useConnectionStore.getState().clearConnection();

      expect(useConnectionStore.getState().selectedDesktop).toBeNull();
      expect(useConnectionStore.getState().connectionState).toBe('disconnected');
      expect(useConnectionStore.getState().operator).toBeNull();
    });
  });
});
```

---

### Fase 3: Testes de Componentes

#### TASK-TEST-004: Testes de Componentes UI

- **Prioridade**: 🟡 Alta
- **Estimativa**: 2.5h
- **Dependências**: TASK-UI-002, TASK-UI-003
- **Status**: ⬜ Não iniciado

**Descrição**:
Testes de renderização e interação para componentes UI.

**Critérios de Aceite**:

- [ ] Button testado (variants, loading, disabled)
- [ ] ProductCard testado
- [ ] SearchBar testado
- [ ] Toast testado
- [ ] Snapshot tests para componentes estáveis

**Arquivo**: `app/components/ui/__tests__/Button.test.tsx`

```typescript
import { render, fireEvent, waitFor } from '@/test/utils';
import { Button } from '../Button';
import * as Haptics from 'expo-haptics';

describe('Button', () => {
  it('renders correctly with text', () => {
    const { getByText } = render(<Button onPress={jest.fn()}>Click me</Button>);

    expect(getByText('Click me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button onPress={onPress}>Click me</Button>);

    fireEvent.press(getByText('Click me'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('triggers haptic feedback when pressed', async () => {
    const { getByText } = render(<Button onPress={jest.fn()}>Click me</Button>);

    fireEvent.press(getByText('Click me'));

    await waitFor(() => {
      expect(Haptics.impactAsync).toHaveBeenCalled();
    });
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button onPress={onPress} disabled>
        Click me
      </Button>
    );

    fireEvent.press(getByText('Click me'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows loading indicator when loading', () => {
    const { getByTestId, queryByText } = render(
      <Button onPress={jest.fn()} loading testID="button">
        Click me
      </Button>
    );

    expect(queryByText('Click me')).toBeNull();
    // ActivityIndicator should be rendered
  });

  it('applies variant styles correctly', () => {
    const { getByTestId } = render(
      <Button onPress={jest.fn()} variant="danger" testID="button">
        Delete
      </Button>
    );

    // Check that danger variant class is applied
    const button = getByTestId('button');
    expect(button.props.className).toContain('bg-danger');
  });
});
```

---

### Fase 4: Testes de Hooks

#### TASK-TEST-005: Testes de Custom Hooks

- **Prioridade**: 🟡 Alta
- **Estimativa**: 2h
- **Dependências**: TASK-CONN-002, TASK-CONN-004, TASK-FEAT-002
- **Status**: ⬜ Não iniciado

**Descrição**:
Testes para hooks customizados.

**Critérios de Aceite**:

- [ ] useDiscovery testado
- [ ] useWebSocket testado
- [ ] useScanner testado
- [ ] useConnection testado

**Arquivo**: `app/hooks/__tests__/useScanner.test.ts`

```typescript
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useScanner } from '../useScanner';
import { mockWebSocket } from '@/test/mocks/websocket';
import { useProductsStore } from '@stores/productsStore';
import { createProduct } from '@/test/factories';

jest.mock('../useWebSocket', () => ({
  useWebSocket: () => ({
    send: jest.fn(),
    on: jest.fn((event, handler) => {
      // Store handler for later
      (global as any).wsHandlers = (global as any).wsHandlers || {};
      (global as any).wsHandlers[event] = handler;
      return () => {};
    }),
    isConnected: true,
  }),
}));

describe('useScanner', () => {
  beforeEach(() => {
    useProductsStore.setState({ products: new Map() });
    (global as any).wsHandlers = {};
  });

  it('returns cached product if available', async () => {
    const product = createProduct({ barcode: '7891234567890' });
    useProductsStore.getState().cacheProduct(product);

    const { result } = renderHook(() => useScanner());

    await act(async () => {
      await result.current.handleScan('7891234567890');
    });

    expect(result.current.lastProduct).toEqual(product);
    expect(result.current.isLoading).toBe(false);
  });

  it('requests product from desktop if not cached', async () => {
    const { result } = renderHook(() => useScanner());

    await act(async () => {
      result.current.handleScan('7891234567890');
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('handles product found response', async () => {
    const product = createProduct({ barcode: '7891234567890' });
    const { result } = renderHook(() => useScanner());

    await act(async () => {
      result.current.handleScan('7891234567890');
    });

    // Simulate WebSocket response
    await act(async () => {
      (global as any).wsHandlers['product_lookup_response']({
        barcode: '7891234567890',
        found: true,
        product,
      });
    });

    await waitFor(() => {
      expect(result.current.lastProduct).toEqual(product);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('handles product not found', async () => {
    const { result } = renderHook(() => useScanner());

    await act(async () => {
      result.current.handleScan('7891234567890');
    });

    await act(async () => {
      (global as any).wsHandlers['product_lookup_response']({
        barcode: '7891234567890',
        found: false,
      });
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Produto não encontrado');
      expect(result.current.lastProduct).toBeNull();
    });
  });

  it('clears last product', async () => {
    const product = createProduct();
    const { result } = renderHook(() => useScanner());

    useProductsStore.getState().cacheProduct(product);

    await act(async () => {
      await result.current.handleScan(product.barcode);
    });

    expect(result.current.lastProduct).toBeTruthy();

    act(() => {
      result.current.clearLastProduct();
    });

    expect(result.current.lastProduct).toBeNull();
  });
});
```

---

### Fase 5: Testes E2E

#### TASK-TEST-006: Setup Detox ou Maestro

- **Prioridade**: 🟢 Média
- **Estimativa**: 2h
- **Dependências**: Todas as features
- **Status**: ⬜ Não iniciado

**Descrição**:
Configurar framework de testes E2E para React Native.

**Critérios de Aceite**:

- [ ] Maestro instalado e configurado
- [ ] Primeiro teste de conexão funcionando
- [ ] CI/CD integration preparada

**Arquivo**: `.maestro/connection-flow.yaml`

```yaml
appId: com.giro.mobile
---
- launchApp
- assertVisible: 'Procurando GIRO Desktop...'
- waitForAnimationToEnd
- assertVisible: 'GIRO-'
- tapOn: 'GIRO-.*'
- assertVisible: 'Digite seu PIN'
- tapOn: '1'
- tapOn: '2'
- tapOn: '3'
- tapOn: '4'
- tapOn: 'Entrar'
- assertVisible: 'Scanner'
```

**Arquivo**: `.maestro/scan-product.yaml`

```yaml
appId: com.giro.mobile
---
- launchApp
# Assume already connected
- assertVisible: 'Scanner'
- assertVisible: 'Posicione o código de barras'
# Note: Can't actually scan in E2E, would need mock
- tapOn: 'Estoque'
- assertVisible: 'Consulta de Estoque'
- tapOn:
    id: 'search-input'
- inputText: 'Arroz'
- assertVisible: 'Arroz'
```

---

## 📊 Resumo

| Fase        | Tarefas | Estimativa |
| ----------- | ------- | ---------- |
| Setup       | 2       | 2.5h       |
| Stores      | 1       | 2h         |
| Componentes | 1       | 2.5h       |
| Hooks       | 1       | 2h         |
| E2E         | 1       | 2h         |
| **Total**   | **6**   | **11h**    |

---

## ✅ Checklist Final

- [ ] Jest configurado com mocks
- [ ] Test utils criados
- [ ] Stores 100% testadas
- [ ] Componentes principais testados
- [ ] Hooks testados
- [ ] E2E flows configurados
- [ ] Coverage >70%
- [ ] CI executando testes

---

## 🔗 Próximo Agente

Após conclusão, acionar: **Build** (06-build)

---

_Última atualização: Janeiro 2026_

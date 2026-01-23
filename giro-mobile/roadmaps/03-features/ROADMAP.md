# ⚡ Features - Roadmap do Agente

> **Projeto**: GIRO Mobile  
> **Responsabilidade**: Funcionalidades de negócio (Scanner, Estoque, Inventário, Validade)

---

## 📋 Tarefas

### Fase 1: Scanner de Código de Barras

#### TASK-FEAT-001: Implementar Scanner Camera

- **Prioridade**: 🔴 Crítica
- **Estimativa**: 2h
- **Dependências**: TASK-SETUP-003
- **Status**: ⬜ Não iniciado

**Descrição**:
Componente de scanner usando expo-camera com detecção de código de barras.

**Critérios de Aceite**:

- [ ] Suporte a EAN-13, EAN-8, UPC-A, Code128
- [ ] Feedback visual quando detecta código
- [ ] Haptic feedback ao escanear
- [ ] Som de beep configurável
- [ ] Throttle de scans (evitar duplicados)

**Arquivo**: `app/components/scanner/BarcodeScanner.tsx`

```typescript
import { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

interface BarcodeScannerProps {
  onScan: (barcode: string, type: string) => void;
  enabled?: boolean;
  throttleMs?: number;
}

export function BarcodeScanner({ onScan, enabled = true, throttleMs = 1500 }: BarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [lastScanTime, setLastScanTime] = useState(0);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    const now = Date.now();

    // Throttle scans
    if (data === lastScan && now - lastScanTime < throttleMs) {
      return;
    }

    setLastScan(data);
    setLastScanTime(now);

    // Feedback
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Play beep
    const { sound } = await Audio.Sound.createAsync(require('@/assets/sounds/beep.mp3'));
    await sound.playAsync();

    onScan(data, type);
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return <PermissionRequest onRequest={requestPermission} />;
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'code128'],
        }}
        onBarcodeScanned={enabled ? handleBarCodeScanned : undefined}
      />
      <ScannerOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});
```

---

#### TASK-FEAT-002: Hook useScanner

- **Prioridade**: 🔴 Crítica
- **Estimativa**: 1h
- **Dependências**: TASK-FEAT-001, TASK-CONN-004
- **Status**: ⬜ Não iniciado

**Descrição**:
Hook que integra scanner com WebSocket para buscar produto.

**Critérios de Aceite**:

- [ ] Busca produto ao escanear
- [ ] Cache local de produtos escaneados
- [ ] Loading/error states
- [ ] Retry automático se offline

**Arquivo**: `app/hooks/useScanner.ts`

```typescript
import { useState, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { useProductsStore } from '@stores/productsStore';
import type { Product } from '@types/product';

interface UseScannerResult {
  isScanning: boolean;
  isLoading: boolean;
  lastProduct: Product | null;
  error: string | null;
  handleScan: (barcode: string) => Promise<void>;
  clearLastProduct: () => void;
}

export function useScanner(): UseScannerResult {
  const { send, on, isConnected } = useWebSocket();
  const { getProductByBarcode, cacheProduct } = useProductsStore();

  const [isScanning, setIsScanning] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [lastProduct, setLastProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = useCallback(
    async (barcode: string) => {
      setIsLoading(true);
      setError(null);

      // Check cache first
      const cached = getProductByBarcode(barcode);
      if (cached) {
        setLastProduct(cached);
        setIsLoading(false);
        return;
      }

      if (!isConnected) {
        setError('Sem conexão com o desktop');
        setIsLoading(false);
        return;
      }

      // Request from desktop
      send('product_lookup', { barcode });

      // Wait for response
      const cleanup = on('product_lookup_response', (response) => {
        if (response.barcode === barcode) {
          if (response.found) {
            const product = response.product;
            cacheProduct(product);
            setLastProduct(product);
          } else {
            setError('Produto não encontrado');
          }
          setIsLoading(false);
          cleanup();
        }
      });

      // Timeout
      setTimeout(() => {
        if (isLoading) {
          setError('Timeout ao buscar produto');
          setIsLoading(false);
          cleanup();
        }
      }, 5000);
    },
    [isConnected, send, on, getProductByBarcode, cacheProduct]
  );

  const clearLastProduct = useCallback(() => {
    setLastProduct(null);
    setError(null);
  }, []);

  return {
    isScanning,
    isLoading,
    lastProduct,
    error,
    handleScan,
    clearLastProduct,
  };
}
```

---

#### TASK-FEAT-003: Tela de Scanner Principal

- **Prioridade**: 🔴 Crítica
- **Estimativa**: 2h
- **Dependências**: TASK-FEAT-001, TASK-FEAT-002
- **Status**: ⬜ Não iniciado

**Descrição**:
Tela principal do app com scanner e display de produto.

**Critérios de Aceite**:

- [ ] Scanner ocupando área principal
- [ ] Card de produto quando escaneado
- [ ] Informações: nome, preço, estoque
- [ ] Botões de ação rápida
- [ ] Histórico recente

---

### Fase 2: Consulta de Estoque

#### TASK-FEAT-004: Store de Produtos

- **Prioridade**: 🟡 Alta
- **Estimativa**: 1.5h
- **Dependências**: TASK-SETUP-003
- **Status**: ⬜ Não iniciado

**Descrição**:
Store Zustand para cache de produtos e estoque.

**Critérios de Aceite**:

- [ ] Cache de produtos escaneados
- [ ] Busca local por nome/código
- [ ] Sync com desktop
- [ ] TTL de cache configurável

**Arquivo**: `app/stores/productsStore.ts`

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product } from '@types/product';

interface ProductsStore {
  // State
  products: Map<string, Product>;
  lastSync: number | null;

  // Actions
  cacheProduct: (product: Product) => void;
  getProductByBarcode: (barcode: string) => Product | null;
  searchProducts: (query: string) => Product[];
  syncFromDesktop: (products: Product[]) => void;
  clearCache: () => void;
}

export const useProductsStore = create<ProductsStore>()(
  persist(
    (set, get) => ({
      products: new Map(),
      lastSync: null,

      cacheProduct: (product) => {
        set((state) => {
          const products = new Map(state.products);
          products.set(product.barcode, product);
          return { products };
        });
      },

      getProductByBarcode: (barcode) => {
        return get().products.get(barcode) || null;
      },

      searchProducts: (query) => {
        const products = Array.from(get().products.values());
        const lowerQuery = query.toLowerCase();

        return products.filter(
          (p) => p.name.toLowerCase().includes(lowerQuery) || p.barcode.includes(query)
        );
      },

      syncFromDesktop: (products) => {
        set({
          products: new Map(products.map((p) => [p.barcode, p])),
          lastSync: Date.now(),
        });
      },

      clearCache: () => {
        set({ products: new Map(), lastSync: null });
      },
    }),
    {
      name: 'giro-products-cache',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

---

#### TASK-FEAT-005: Tela de Estoque

- **Prioridade**: 🟡 Alta
- **Estimativa**: 2h
- **Dependências**: TASK-FEAT-004, TASK-CONN-004
- **Status**: ⬜ Não iniciado

**Descrição**:
Tela para consulta de estoque com busca e filtros.

**Critérios de Aceite**:

- [ ] Busca por nome ou código
- [ ] Filtros: baixo estoque, categoria
- [ ] Lista virtualizada (performance)
- [ ] Pull-to-refresh para sync

---

### Fase 3: Inventário

#### TASK-FEAT-006: Lógica de Inventário

- **Prioridade**: 🟡 Alta
- **Estimativa**: 2h
- **Dependências**: TASK-FEAT-002
- **Status**: ⬜ Não iniciado

**Descrição**:
Implementar fluxo de contagem de inventário.

**Critérios de Aceite**:

- [ ] Iniciar/pausar/finalizar inventário
- [ ] Contagem por escaneamento
- [ ] Entrada manual de quantidade
- [ ] Salvar localmente se offline
- [ ] Sync com desktop ao reconectar

**Arquivo**: `app/stores/inventoryStore.ts`

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface InventoryItem {
  barcode: string;
  productName: string;
  expectedQty: number;
  countedQty: number;
  countedAt: number;
}

interface InventoryStore {
  // State
  isActive: boolean;
  startedAt: number | null;
  items: Map<string, InventoryItem>;
  pendingSync: boolean;

  // Actions
  startInventory: () => void;
  pauseInventory: () => void;
  addCount: (barcode: string, productName: string, qty: number) => void;
  updateCount: (barcode: string, qty: number) => void;
  finishInventory: () => InventoryItem[];
  cancelInventory: () => void;
  markSynced: () => void;
}

export const useInventoryStore = create<InventoryStore>()(
  persist(
    (set, get) => ({
      isActive: false,
      startedAt: null,
      items: new Map(),
      pendingSync: false,

      startInventory: () => {
        set({
          isActive: true,
          startedAt: Date.now(),
          items: new Map(),
          pendingSync: false,
        });
      },

      pauseInventory: () => {
        set({ isActive: false });
      },

      addCount: (barcode, productName, qty) => {
        set((state) => {
          const items = new Map(state.items);
          const existing = items.get(barcode);

          if (existing) {
            items.set(barcode, {
              ...existing,
              countedQty: existing.countedQty + qty,
              countedAt: Date.now(),
            });
          } else {
            items.set(barcode, {
              barcode,
              productName,
              expectedQty: 0, // Will be filled by desktop
              countedQty: qty,
              countedAt: Date.now(),
            });
          }

          return { items };
        });
      },

      updateCount: (barcode, qty) => {
        set((state) => {
          const items = new Map(state.items);
          const existing = items.get(barcode);

          if (existing) {
            items.set(barcode, {
              ...existing,
              countedQty: qty,
              countedAt: Date.now(),
            });
          }

          return { items };
        });
      },

      finishInventory: () => {
        const items = Array.from(get().items.values());
        set({ isActive: false, pendingSync: true });
        return items;
      },

      cancelInventory: () => {
        set({
          isActive: false,
          startedAt: null,
          items: new Map(),
          pendingSync: false,
        });
      },

      markSynced: () => {
        set({
          startedAt: null,
          items: new Map(),
          pendingSync: false,
        });
      },
    }),
    {
      name: 'giro-inventory',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

---

#### TASK-FEAT-007: Tela de Inventário

- **Prioridade**: 🟡 Alta
- **Estimativa**: 2.5h
- **Dependências**: TASK-FEAT-006
- **Status**: ⬜ Não iniciado

**Descrição**:
Tela para realizar contagem de inventário.

**Critérios de Aceite**:

- [ ] Botão iniciar inventário
- [ ] Scanner integrado
- [ ] Lista de itens contados
- [ ] Edição de quantidade
- [ ] Resumo de divergências
- [ ] Enviar para desktop

---

### Fase 4: Controle de Validade

#### TASK-FEAT-008: Store de Validades

- **Prioridade**: 🟢 Média
- **Estimativa**: 1.5h
- **Dependências**: TASK-FEAT-004
- **Status**: ⬜ Não iniciado

**Descrição**:
Store para gerenciar produtos com validade.

**Critérios de Aceite**:

- [ ] Listar produtos por data de validade
- [ ] Alertas de vencimento próximo
- [ ] Categorização: vencido, crítico, ok
- [ ] Sync com desktop

---

#### TASK-FEAT-009: Tela de Validades

- **Prioridade**: 🟢 Média
- **Estimativa**: 2h
- **Dependências**: TASK-FEAT-008
- **Status**: ⬜ Não iniciado

**Descrição**:
Tela para visualizar e gerenciar validades.

**Critérios de Aceite**:

- [ ] Tabs: Vencidos, Críticos, OK
- [ ] Filtro por período
- [ ] Ação rápida de baixa
- [ ] Registrar verificação

---

### Fase 5: Cadastro Rápido

#### TASK-FEAT-010: Fluxo de Cadastro Rápido

- **Prioridade**: 🟢 Média
- **Estimativa**: 2.5h
- **Dependências**: TASK-FEAT-001, TASK-CONN-004
- **Status**: ⬜ Não iniciado

**Descrição**:
Permitir cadastro básico de produto não encontrado.

**Critérios de Aceite**:

- [ ] Detectar produto não cadastrado
- [ ] Formulário simplificado (nome, preço, categoria)
- [ ] Foto opcional do produto
- [ ] Enviar para desktop para completar
- [ ] Funciona offline (queue local)

---

## 📊 Resumo

| Fase            | Tarefas | Estimativa |
| --------------- | ------- | ---------- |
| Scanner         | 3       | 5h         |
| Estoque         | 2       | 3.5h       |
| Inventário      | 2       | 4.5h       |
| Validade        | 2       | 3.5h       |
| Cadastro Rápido | 1       | 2.5h       |
| **Total**       | **10**  | **19h**    |

---

## ✅ Checklist Final

- [ ] Scanner funcionando com todos os formatos
- [ ] Busca de produto via WebSocket
- [ ] Consulta de estoque implementada
- [ ] Inventário com contagem e sync
- [ ] Controle de validade com alertas
- [ ] Cadastro rápido funcional
- [ ] Tudo funcionando offline com sync posterior

---

## 🔗 Próximo Agente

Após conclusão, acionar: **UI** (04-ui)

---

_Última atualização: Janeiro 2026_

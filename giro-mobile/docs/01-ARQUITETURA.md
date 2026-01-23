# 🏗️ GIRO Mobile - Arquitetura

> **Versão:** 1.0.0  
> **Status:** Planejamento  
> **Última Atualização:** 8 de Janeiro de 2026

---

## 📋 Sumário

1. [Visão Geral](#visão-geral)
2. [Stack Tecnológica](#stack-tecnológica)
3. [Estrutura do Projeto](#estrutura-do-projeto)
4. [Camadas da Aplicação](#camadas-da-aplicação)
5. [Comunicação com Desktop](#comunicação-com-desktop)
6. [Estado e Persistência](#estado-e-persistência)
7. [Build e Deploy](#build-e-deploy)

---

## 🎯 Visão Geral

O GIRO Mobile é um app Android que funciona como **extensão do GIRO Desktop**, comunicando-se via WiFi local. Não é um app standalone - ele depende do Desktop para funcionar.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         REDE LOCAL DA LOJA                              │
│                            (WiFi 192.168.x.x)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      GIRO DESKTOP                                │    │
│  │                      (Servidor WebSocket)                        │    │
│  │                                                                  │    │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │    │
│  │  │   SQLite     │    │  WebSocket   │    │    Tauri     │       │    │
│  │  │   Database   │◄───│   Server     │◄───│    Backend   │       │    │
│  │  │              │    │   :3847      │    │              │       │    │
│  │  └──────────────┘    └──────┬───────┘    └──────────────┘       │    │
│  │                             │                                    │    │
│  └─────────────────────────────┼────────────────────────────────────┘    │
│                                │                                         │
│            ┌───────────────────┼───────────────────┐                    │
│            │                   │                   │                    │
│            ▼                   ▼                   ▼                    │
│   ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐          │
│   │  GIRO Mobile    │ │  GIRO Mobile    │ │  GIRO Mobile    │          │
│   │   (Celular 1)   │ │   (Celular 2)   │ │   (Celular N)   │          │
│   │                 │ │                 │ │                 │          │
│   │   📱 Scanner    │ │   📱 Estoque    │ │   📱 Inventário │          │
│   └─────────────────┘ └─────────────────┘ └─────────────────┘          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Características Principais

| Característica    | Descrição                                |
| ----------------- | ---------------------------------------- |
| **Dependente**    | Requer GIRO Desktop ligado na mesma rede |
| **Real-time**     | Sincronização instantânea via WebSocket  |
| **Offline Queue** | Operações enfileiradas se desconectar    |
| **Leve**          | App focado em poucas funcionalidades     |
| **One-Hand Use**  | Design para uso com uma mão              |

---

## 🛠️ Stack Tecnológica

### Core

| Tecnologia       | Versão | Responsabilidade         |
| ---------------- | ------ | ------------------------ |
| **React Native** | 0.73+  | Framework mobile         |
| **Expo**         | 50+    | Build, OTA updates, APIs |
| **TypeScript**   | 5.4+   | Type safety              |
| **Expo Router**  | 3+     | Navegação file-based     |

### State & Data

| Tecnologia         | Versão | Responsabilidade        |
| ------------------ | ------ | ----------------------- |
| **Zustand**        | 4.5+   | State management global |
| **TanStack Query** | 5.0+   | Cache e sync de dados   |
| **MMKV**           | 2.11+  | Storage local (rápido)  |

### UI & Styling

| Tecnologia                  | Versão | Responsabilidade            |
| --------------------------- | ------ | --------------------------- |
| **NativeWind**              | 4+     | TailwindCSS para RN         |
| **React Native Reanimated** | 3+     | Animações fluidas           |
| **expo-haptics**            | Latest | Feedback tátil              |
| **expo-camera**             | Latest | Scanner de código de barras |

### Comunicação

| Tecnologia    | Versão | Responsabilidade             |
| ------------- | ------ | ---------------------------- |
| **WebSocket** | Native | Comunicação real-time        |
| **Zeroconf**  | 0.15+  | Descoberta do Desktop (mDNS) |

---

## 📁 Estrutura do Projeto

```
giro-mobile/
├── docs/                          # Documentação
│   ├── 00-OVERVIEW.md
│   ├── 01-ARQUITETURA.md
│   ├── 02-FEATURES.md
│   └── 03-WEBSOCKET-PROTOCOL.md
│
├── src/
│   ├── app/                       # Expo Router (pages)
│   │   ├── _layout.tsx           # Root layout
│   │   ├── index.tsx             # Splash/Redirect
│   │   ├── login.tsx             # Login por PIN
│   │   ├── connect.tsx           # Descoberta do Desktop
│   │   │
│   │   └── (tabs)/               # Tab Navigator
│   │       ├── _layout.tsx       # Tab layout
│   │       ├── scanner.tsx       # Scanner principal
│   │       ├── stock.tsx         # Consulta estoque
│   │       ├── inventory.tsx     # Inventário
│   │       ├── expiration.tsx    # Validades
│   │       └── settings.tsx      # Configurações
│   │
│   ├── components/                # Componentes React
│   │   ├── ui/                   # Componentes base
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Toast.tsx
│   │   │
│   │   ├── scanner/              # Scanner específicos
│   │   │   ├── BarcodeScanner.tsx
│   │   │   ├── ScanOverlay.tsx
│   │   │   └── ScanResult.tsx
│   │   │
│   │   ├── product/              # Produto
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductDetails.tsx
│   │   │   ├── ProductForm.tsx
│   │   │   └── StockBadge.tsx
│   │   │
│   │   ├── inventory/            # Inventário
│   │   │   ├── InventoryItem.tsx
│   │   │   ├── CountInput.tsx
│   │   │   └── InventorySummary.tsx
│   │   │
│   │   └── connection/           # Status de conexão
│   │       ├── ConnectionStatus.tsx
│   │       └── ServerFinder.tsx
│   │
│   ├── hooks/                    # Custom hooks
│   │   ├── useWebSocket.ts       # Conexão WS
│   │   ├── useScanner.ts         # Scanner camera
│   │   ├── useProduct.ts         # CRUD produtos
│   │   ├── useInventory.ts       # Fluxo inventário
│   │   ├── useConnection.ts      # Status conexão
│   │   └── useHaptics.ts         # Feedback tátil
│   │
│   ├── stores/                   # Zustand stores
│   │   ├── auth-store.ts         # Autenticação
│   │   ├── connection-store.ts   # Estado conexão
│   │   ├── inventory-store.ts    # Inventário ativo
│   │   └── offline-store.ts      # Queue offline
│   │
│   ├── services/                 # Comunicação
│   │   ├── websocket.ts          # WebSocket client
│   │   ├── discovery.ts          # mDNS/Zeroconf
│   │   └── api.ts                # Wrappers de requests
│   │
│   ├── lib/                      # Utilitários
│   │   ├── storage.ts            # MMKV wrapper
│   │   ├── barcode.ts            # Parsing barcode
│   │   ├── format.ts             # Formatters
│   │   └── utils.ts              # Helpers gerais
│   │
│   └── types/                    # TypeScript types
│       ├── index.ts
│       ├── product.ts
│       ├── inventory.ts
│       ├── websocket.ts
│       └── user.ts
│
├── assets/                       # Assets estáticos
│   ├── images/
│   ├── sounds/
│   └── fonts/
│
├── app.json                      # Expo config
├── eas.json                      # EAS Build config
├── tailwind.config.js            # NativeWind config
├── babel.config.js
├── tsconfig.json
├── package.json
└── README.md
```

---

## 🧱 Camadas da Aplicação

### 1. Pages (Expo Router)

Responsável por:

- Estrutura de navegação
- Layout das telas
- Composição de componentes

```tsx
// app/(tabs)/scanner.tsx
export default function ScannerPage() {
  const { scan, lastResult, isScanning } = useScanner();
  const { sendMessage } = useWebSocket();

  const handleScan = async (barcode: string) => {
    const product = await sendMessage('product.get', { barcode });
    // ...
  };

  return (
    <View className="flex-1 bg-background">
      <BarcodeScanner onScan={handleScan} />
      {lastResult && <ScanResult product={lastResult} />}
    </View>
  );
}
```

### 2. Components

Responsável por:

- UI reutilizável
- Lógica de apresentação
- Styling com NativeWind

```tsx
// components/product/ProductCard.tsx
interface ProductCardProps {
  product: Product;
  onPress?: () => void;
}

export function ProductCard({ product, onPress }: ProductCardProps) {
  return (
    <Pressable onPress={onPress} className="bg-card rounded-xl p-4 border border-border">
      <Text className="text-lg font-semibold text-foreground">{product.name}</Text>
      <View className="flex-row justify-between mt-2">
        <Text className="text-muted-foreground">{product.barcode}</Text>
        <StockBadge quantity={product.stock} min={product.min_stock} />
      </View>
    </Pressable>
  );
}
```

### 3. Hooks

Responsável por:

- Lógica de negócio reutilizável
- Integração com stores
- Efeitos colaterais

```tsx
// hooks/useProduct.ts
export function useProduct(barcode: string) {
  const { sendMessage } = useWebSocket();

  return useQuery({
    queryKey: ['product', barcode],
    queryFn: async () => {
      const response = await sendMessage('product.get', { barcode });
      if (response.error) throw new Error(response.error);
      return response.data as Product;
    },
    staleTime: 1000 * 60 * 5, // 5 min cache
  });
}
```

### 4. Stores (Zustand)

Responsável por:

- Estado global
- Persistência
- Ações síncronas

```tsx
// stores/connection-store.ts
interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected';
  serverIp: string | null;
  serverPort: number;
  lastPing: Date | null;

  setServer: (ip: string, port: number) => void;
  setStatus: (status: ConnectionState['status']) => void;
  disconnect: () => void;
}

export const useConnectionStore = create<ConnectionState>()(
  persist(
    (set) => ({
      status: 'disconnected',
      serverIp: null,
      serverPort: 3847,
      lastPing: null,

      setServer: (ip, port) => set({ serverIp: ip, serverPort: port }),
      setStatus: (status) => set({ status }),
      disconnect: () => set({ status: 'disconnected', serverIp: null }),
    }),
    {
      name: 'connection-storage',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
```

### 5. Services

Responsável por:

- Comunicação externa
- Protocolos de rede
- Abstrações de baixo nível

```tsx
// services/websocket.ts
class WebSocketService {
  private ws: WebSocket | null = null;
  private messageId = 0;
  private pendingRequests = new Map<number, RequestHandler>();

  connect(ip: string, port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`ws://${ip}:${port}`);

      this.ws.onopen = () => {
        useConnectionStore.getState().setStatus('connected');
        resolve();
      };

      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      };

      this.ws.onerror = (error) => {
        useConnectionStore.getState().setStatus('disconnected');
        reject(error);
      };
    });
  }

  sendMessage<T>(action: string, payload: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = ++this.messageId;

      this.pendingRequests.set(id, { resolve, reject });

      this.ws?.send(
        JSON.stringify({
          id,
          action,
          payload,
          timestamp: Date.now(),
        })
      );
    });
  }
}

export const wsService = new WebSocketService();
```

---

## 📡 Comunicação com Desktop

### Descoberta do Servidor

O app usa **Zeroconf/mDNS** para encontrar o GIRO Desktop na rede:

```tsx
// services/discovery.ts
import Zeroconf from 'react-native-zeroconf';

class DiscoveryService {
  private zeroconf = new Zeroconf();

  startDiscovery(): Promise<{ ip: string; port: number }> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.zeroconf.stop();
        reject(new Error('Timeout: GIRO Desktop não encontrado'));
      }, 10000);

      this.zeroconf.on('resolved', (service) => {
        if (service.name.startsWith('giro-desktop')) {
          clearTimeout(timeout);
          this.zeroconf.stop();
          resolve({
            ip: service.addresses[0],
            port: service.port,
          });
        }
      });

      this.zeroconf.scan('_giro._tcp.', 'local.');
    });
  }
}
```

### Fluxo de Conexão

```
┌──────────────┐                           ┌──────────────┐
│   Mobile     │                           │   Desktop    │
│    App       │                           │    GIRO      │
└──────┬───────┘                           └──────┬───────┘
       │                                          │
       │  1. mDNS Query: _giro._tcp               │
       │─────────────────────────────────────────►│
       │                                          │
       │  2. mDNS Response: 192.168.1.100:3847    │
       │◄─────────────────────────────────────────│
       │                                          │
       │  3. WebSocket Connect                    │
       │─────────────────────────────────────────►│
       │                                          │
       │  4. Connected                            │
       │◄─────────────────────────────────────────│
       │                                          │
       │  5. Auth: { action: 'auth.login', pin }  │
       │─────────────────────────────────────────►│
       │                                          │
       │  6. Auth OK: { user, permissions }       │
       │◄─────────────────────────────────────────│
       │                                          │
       │  7. Ready for operations                 │
       │◄════════════════════════════════════════►│
       │                                          │
```

---

## 💾 Estado e Persistência

### Storage Strategy

| Dado                 | Onde             | TTL        |
| -------------------- | ---------------- | ---------- |
| **Servidor IP**      | MMKV             | Permanente |
| **User Token**       | MMKV (encrypted) | Session    |
| **Último Scan**      | Zustand (memory) | Session    |
| **Inventário Ativo** | Zustand + MMKV   | Permanente |
| **Queue Offline**    | MMKV             | Até sync   |
| **Cache Produtos**   | TanStack Query   | 5 min      |

### Offline Queue

Quando desconecta, operações são enfileiradas:

```tsx
// stores/offline-store.ts
interface QueuedOperation {
  id: string;
  action: string;
  payload: any;
  timestamp: number;
  retries: number;
}

interface OfflineState {
  queue: QueuedOperation[];

  enqueue: (action: string, payload: any) => void;
  processQueue: () => Promise<void>;
  clearQueue: () => void;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      queue: [],

      enqueue: (action, payload) => {
        set((state) => ({
          queue: [
            ...state.queue,
            {
              id: nanoid(),
              action,
              payload,
              timestamp: Date.now(),
              retries: 0,
            },
          ],
        }));
      },

      processQueue: async () => {
        const { queue } = get();
        const ws = wsService;

        for (const op of queue) {
          try {
            await ws.sendMessage(op.action, op.payload);
            set((state) => ({
              queue: state.queue.filter((o) => o.id !== op.id),
            }));
          } catch (error) {
            // Incrementa retries, tenta novamente depois
          }
        }
      },

      clearQueue: () => set({ queue: [] }),
    }),
    { name: 'offline-queue' }
  )
);
```

---

## 🚀 Build e Deploy

### Expo EAS Build

```json
// eas.json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Comandos de Build

```bash
# Desenvolvimento (APK para testar)
eas build --platform android --profile development

# Preview (APK para distribuição interna)
eas build --platform android --profile preview

# Produção (AAB para Play Store)
eas build --platform android --profile production
```

### OTA Updates

```bash
# Publicar update sem rebuild
eas update --branch preview --message "Fix scanner bug"
```

---

## 📱 Requisitos do Dispositivo

### Mínimos

| Requisito         | Valor                |
| ----------------- | -------------------- |
| **Android**       | 8.0+ (API 26)        |
| **RAM**           | 2GB                  |
| **Armazenamento** | 100MB                |
| **Camera**        | Autofoco obrigatório |
| **WiFi**          | 2.4GHz ou 5GHz       |

### Permissões

```json
// app.json
{
  "expo": {
    "android": {
      "permissions": [
        "CAMERA",
        "VIBRATE",
        "ACCESS_NETWORK_STATE",
        "ACCESS_WIFI_STATE",
        "CHANGE_WIFI_MULTICAST_STATE"
      ]
    }
  }
}
```

---

_Este documento define a arquitetura técnica do GIRO Mobile._

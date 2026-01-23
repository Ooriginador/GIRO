# 🔌 Connection - Roadmap do Agente

> **Projeto**: GIRO Mobile  
> **Responsabilidade**: WebSocket, mDNS Discovery e comunicação com Desktop

---

## 📋 Tarefas

### Fase 1: mDNS Discovery

#### TASK-CONN-001: Implementar Service Discovery

- **Prioridade**: 🔴 Crítica
- **Estimativa**: 2h
- **Dependências**: TASK-SETUP-003
- **Status**: ⬜ Não iniciado

**Descrição**:
Implementar descoberta automática do GIRO Desktop na rede local via mDNS/Bonjour.

**Critérios de Aceite**:

- [ ] Detectar serviço `_giro._tcp` na rede
- [ ] Extrair IP e porta do desktop
- [ ] Lidar com múltiplos desktops (selecionar)
- [ ] Timeout de 10s com retry

**Arquivo**: `app/lib/discovery.ts`

```typescript
import Zeroconf from 'react-native-zeroconf';

interface DiscoveredDesktop {
  name: string;
  host: string;
  port: number;
  ip: string;
}

class DiscoveryService {
  private zeroconf: Zeroconf;
  private discovered: Map<string, DiscoveredDesktop> = new Map();

  constructor() {
    this.zeroconf = new Zeroconf();
  }

  async startDiscovery(): Promise<DiscoveredDesktop[]> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.stopDiscovery();
        if (this.discovered.size === 0) {
          reject(new Error('Nenhum GIRO Desktop encontrado na rede'));
        } else {
          resolve(Array.from(this.discovered.values()));
        }
      }, 10000);

      this.zeroconf.on('resolved', (service) => {
        if (service.name.startsWith('GIRO-')) {
          this.discovered.set(service.name, {
            name: service.name,
            host: service.host,
            port: service.port,
            ip: service.addresses[0],
          });
        }
      });

      this.zeroconf.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      this.zeroconf.scan('giro', 'tcp', 'local.');
    });
  }

  stopDiscovery() {
    this.zeroconf.stop();
    this.discovered.clear();
  }
}

export const discoveryService = new DiscoveryService();
```

---

#### TASK-CONN-002: Criar Hook useDiscovery

- **Prioridade**: 🔴 Crítica
- **Estimativa**: 1h
- **Dependências**: TASK-CONN-001
- **Status**: ⬜ Não iniciado

**Descrição**:
Hook React para gerenciar descoberta de desktops.

**Critérios de Aceite**:

- [ ] Estado de loading/error/success
- [ ] Lista de desktops descobertos
- [ ] Função para retry
- [ ] Cleanup automático no unmount

**Arquivo**: `app/hooks/useDiscovery.ts`

```typescript
import { useState, useCallback, useEffect } from 'react';
import { discoveryService, type DiscoveredDesktop } from '@lib/discovery';

interface UseDiscoveryResult {
  desktops: DiscoveredDesktop[];
  isSearching: boolean;
  error: string | null;
  search: () => Promise<void>;
  retry: () => Promise<void>;
}

export function useDiscovery(): UseDiscoveryResult {
  const [desktops, setDesktops] = useState<DiscoveredDesktop[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async () => {
    setIsSearching(true);
    setError(null);

    try {
      const found = await discoveryService.startDiscovery();
      setDesktops(found);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      discoveryService.stopDiscovery();
    };
  }, []);

  return {
    desktops,
    isSearching,
    error,
    search,
    retry: search,
  };
}
```

---

### Fase 2: WebSocket Client

#### TASK-CONN-003: Implementar WebSocket Client

- **Prioridade**: 🔴 Crítica
- **Estimativa**: 3h
- **Dependências**: TASK-CONN-001
- **Status**: ⬜ Não iniciado

**Descrição**:
Cliente WebSocket com reconexão automática e queue de mensagens.

**Critérios de Aceite**:

- [ ] Conexão com retry exponential backoff
- [ ] Queue de mensagens offline
- [ ] Heartbeat/ping-pong
- [ ] Eventos tipados
- [ ] Reconexão automática em disconnect

**Arquivo**: `app/lib/websocket.ts`

```typescript
import { EventEmitter } from 'events';
import type { WSMessage, WSMessageType } from '@types/message';

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'authenticated';

interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private reconnectAttempts = 0;
  private messageQueue: WSMessage[] = [];
  private heartbeatTimer: NodeJS.Timer | null = null;
  private _state: ConnectionState = 'disconnected';

  constructor(config: WebSocketConfig) {
    super();
    this.config = {
      reconnectInterval: 1000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...config,
    };
  }

  get state(): ConnectionState {
    return this._state;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this._state = 'connecting';
    this.emit('stateChange', this._state);

    try {
      this.ws = new WebSocket(this.config.url);
      this.setupEventHandlers();
    } catch (error) {
      this.handleReconnect();
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this._state = 'connected';
      this.reconnectAttempts = 0;
      this.emit('stateChange', this._state);
      this.emit('connected');
      this.flushQueue();
      this.startHeartbeat();
    };

    this.ws.onclose = () => {
      this._state = 'disconnected';
      this.emit('stateChange', this._state);
      this.emit('disconnected');
      this.stopHeartbeat();
      this.handleReconnect();
    };

    this.ws.onerror = (error) => {
      this.emit('error', error);
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WSMessage;
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };
  }

  private handleMessage(message: WSMessage): void {
    // Handle pong
    if (message.type === 'pong') {
      this.emit('pong');
      return;
    }

    // Handle auth response
    if (message.type === 'auth_response') {
      if (message.payload.success) {
        this._state = 'authenticated';
        this.emit('stateChange', this._state);
        this.emit('authenticated', message.payload);
      } else {
        this.emit('authError', message.payload.error);
      }
      return;
    }

    // Emit typed event
    this.emit(message.type, message.payload);
    this.emit('message', message);
  }

  send(type: WSMessageType, payload: any): void {
    const message: WSMessage = {
      type,
      payload,
      timestamp: Date.now(),
    };

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  authenticate(operatorPin: string): void {
    this.send('auth', { pin: operatorPin });
  }

  private flushQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      this.ws?.send(JSON.stringify(message));
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.emit('maxReconnectAttempts');
      return;
    }

    const delay = this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    setTimeout(() => this.connect(), delay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.send('ping', {});
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  disconnect(): void {
    this.stopHeartbeat();
    this.ws?.close();
    this.ws = null;
    this._state = 'disconnected';
  }
}

export { WebSocketClient, type ConnectionState };
```

---

#### TASK-CONN-004: Criar Hook useWebSocket

- **Prioridade**: 🔴 Crítica
- **Estimativa**: 1.5h
- **Dependências**: TASK-CONN-003
- **Status**: ⬜ Não iniciado

**Descrição**:
Hook React para gerenciar conexão WebSocket.

**Critérios de Aceite**:

- [ ] Estado de conexão reativo
- [ ] Métodos para enviar mensagens
- [ ] Listeners tipados para mensagens
- [ ] Auto-connect com desktop selecionado

**Arquivo**: `app/hooks/useWebSocket.ts`

```typescript
import { useEffect, useCallback, useSyncExternalStore } from 'react';
import { WebSocketClient, type ConnectionState } from '@lib/websocket';
import { useConnectionStore } from '@stores/connectionStore';

let wsClient: WebSocketClient | null = null;

export function useWebSocket() {
  const { selectedDesktop, setConnectionState } = useConnectionStore();

  const subscribe = useCallback((callback: () => void) => {
    wsClient?.on('stateChange', callback);
    return () => {
      wsClient?.off('stateChange', callback);
    };
  }, []);

  const getSnapshot = useCallback((): ConnectionState => {
    return wsClient?.state ?? 'disconnected';
  }, []);

  const state = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => {
    if (selectedDesktop) {
      const url = `ws://${selectedDesktop.ip}:${selectedDesktop.port}`;
      wsClient = new WebSocketClient({ url });

      wsClient.on('stateChange', setConnectionState);
      wsClient.connect();

      return () => {
        wsClient?.disconnect();
        wsClient = null;
      };
    }
  }, [selectedDesktop]);

  const send = useCallback((type: string, payload: any) => {
    wsClient?.send(type as any, payload);
  }, []);

  const authenticate = useCallback((pin: string) => {
    wsClient?.authenticate(pin);
  }, []);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    wsClient?.on(event, handler);
    return () => wsClient?.off(event, handler);
  }, []);

  return {
    state,
    send,
    authenticate,
    on,
    isConnected: state === 'connected' || state === 'authenticated',
    isAuthenticated: state === 'authenticated',
  };
}
```

---

### Fase 3: Connection Store

#### TASK-CONN-005: Criar Connection Store

- **Prioridade**: 🟡 Alta
- **Estimativa**: 1h
- **Dependências**: TASK-SETUP-003
- **Status**: ⬜ Não iniciado

**Descrição**:
Store Zustand para gerenciar estado da conexão.

**Critérios de Aceite**:

- [ ] Desktop selecionado persistido
- [ ] Estado da conexão
- [ ] Operador autenticado
- [ ] Histórico de conexões

**Arquivo**: `app/stores/connectionStore.ts`

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ConnectionState } from '@lib/websocket';

interface DiscoveredDesktop {
  name: string;
  host: string;
  port: number;
  ip: string;
}

interface Operator {
  id: string;
  name: string;
  role: 'caixa' | 'gerente' | 'admin';
}

interface ConnectionStore {
  // State
  selectedDesktop: DiscoveredDesktop | null;
  connectionState: ConnectionState;
  operator: Operator | null;
  lastConnectedDesktops: DiscoveredDesktop[];

  // Actions
  selectDesktop: (desktop: DiscoveredDesktop) => void;
  setConnectionState: (state: ConnectionState) => void;
  setOperator: (operator: Operator | null) => void;
  clearConnection: () => void;
  addToHistory: (desktop: DiscoveredDesktop) => void;
}

export const useConnectionStore = create<ConnectionStore>()(
  persist(
    (set, get) => ({
      selectedDesktop: null,
      connectionState: 'disconnected',
      operator: null,
      lastConnectedDesktops: [],

      selectDesktop: (desktop) => {
        set({ selectedDesktop: desktop });
        get().addToHistory(desktop);
      },

      setConnectionState: (connectionState) => set({ connectionState }),

      setOperator: (operator) => set({ operator }),

      clearConnection: () =>
        set({
          selectedDesktop: null,
          connectionState: 'disconnected',
          operator: null,
        }),

      addToHistory: (desktop) => {
        const history = get().lastConnectedDesktops;
        const filtered = history.filter((d) => d.name !== desktop.name);
        set({
          lastConnectedDesktops: [desktop, ...filtered].slice(0, 5),
        });
      },
    }),
    {
      name: 'giro-connection-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        lastConnectedDesktops: state.lastConnectedDesktops,
      }),
    }
  )
);
```

---

### Fase 4: Connection Flow

#### TASK-CONN-006: Tela de Conexão

- **Prioridade**: 🟡 Alta
- **Estimativa**: 2h
- **Dependências**: TASK-CONN-002, TASK-CONN-004
- **Status**: ⬜ Não iniciado

**Descrição**:
Tela para descobrir e conectar ao desktop.

**Critérios de Aceite**:

- [ ] Animação de busca
- [ ] Lista de desktops encontrados
- [ ] Indicador de conexão
- [ ] Histórico de conexões recentes

---

#### TASK-CONN-007: Tela de Autenticação

- **Prioridade**: 🟡 Alta
- **Estimativa**: 1.5h
- **Dependências**: TASK-CONN-006
- **Status**: ⬜ Não iniciado

**Descrição**:
Tela para autenticar operador via PIN.

**Critérios de Aceite**:

- [ ] Teclado numérico customizado
- [ ] Feedback visual de PIN
- [ ] Tratamento de erro de autenticação
- [ ] Haptic feedback

---

#### TASK-CONN-008: Connection Guard

- **Prioridade**: 🟡 Alta
- **Estimativa**: 1h
- **Dependências**: TASK-CONN-005
- **Status**: ⬜ Não iniciado

**Descrição**:
Componente que protege rotas que precisam de conexão.

**Critérios de Aceite**:

- [ ] Redirect para conexão se desconectado
- [ ] Redirect para auth se não autenticado
- [ ] Loading state durante verificação

**Arquivo**: `app/components/shared/ConnectionGuard.tsx`

```typescript
import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useConnectionStore } from '@stores/connectionStore';

export function ConnectionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { connectionState, operator } = useConnectionStore();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    const inConnectScreen = segments.includes('connect');

    if (connectionState === 'disconnected' && !inConnectScreen) {
      router.replace('/connect');
    } else if (connectionState === 'connected' && !operator && !inAuthGroup) {
      router.replace('/login');
    } else if (connectionState === 'authenticated' && operator && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [connectionState, operator, segments]);

  return <>{children}</>;
}
```

---

## 📊 Resumo

| Fase             | Tarefas | Estimativa |
| ---------------- | ------- | ---------- |
| mDNS Discovery   | 2       | 3h         |
| WebSocket Client | 2       | 4.5h       |
| Connection Store | 1       | 1h         |
| Connection Flow  | 3       | 4.5h       |
| **Total**        | **8**   | **13h**    |

---

## ✅ Checklist Final

- [ ] mDNS Discovery funcionando
- [ ] WebSocket conectando ao desktop
- [ ] Autenticação por PIN implementada
- [ ] Reconexão automática funcionando
- [ ] Queue de mensagens offline
- [ ] Connection Guard protegendo rotas
- [ ] Histórico de conexões persistido

---

## 🔗 Próximo Agente

Após conclusão, acionar: **Features** (03-features)

---

_Última atualização: Janeiro 2026_

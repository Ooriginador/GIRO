/**
 * Cliente WebSocket com reconexão automática e queue de mensagens
 */

import type {
  ConnectionState,
  WebSocketConfig,
  WSActionType,
  WSEvent,
  WSEventType,
  WSRequest,
  WSResponse,
} from '@types/index';

const DEFAULT_RECONNECT_ATTEMPTS = 5;
const DEFAULT_RECONNECT_DELAY = 1000;
const DEFAULT_HEARTBEAT_INTERVAL = 30000;
const DEFAULT_TIMEOUT = 10000;

type MessageHandler<T = unknown> = (data: T) => void;
type EventHandler<T = unknown> = (event: WSEvent<T>) => void;
type StateChangeHandler = (state: ConnectionState) => void;

interface PendingRequest {
  resolve: (response: WSResponse) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

class WebSocketClient {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private state: ConnectionState = 'disconnected';
  private token: string | null = null;
  private messageId: number = 0;
  private reconnectAttempts: number = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private pendingRequests: Map<number, PendingRequest> = new Map();
  private messageQueue: WSRequest[] = [];
  private eventHandlers: Map<WSEventType, Set<EventHandler>> = new Map();
  private stateChangeHandlers: Set<StateChangeHandler> = new Set();

  constructor(config: WebSocketConfig) {
    this.config = {
      url: config.url,
      reconnectAttempts: config.reconnectAttempts ?? DEFAULT_RECONNECT_ATTEMPTS,
      reconnectDelay: config.reconnectDelay ?? DEFAULT_RECONNECT_DELAY,
      heartbeatInterval: config.heartbeatInterval ?? DEFAULT_HEARTBEAT_INTERVAL,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
    };
  }

  private setState(newState: ConnectionState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.stateChangeHandlers.forEach((handler) => {
        try {
          handler(newState);
        } catch (error) {
          console.error('Error in state change handler:', error);
        }
      });
    }
  }

  private getNextMessageId(): number {
    return ++this.messageId;
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.state === 'connected' || this.state === 'authenticated') {
        this.send('system.ping', {}).catch(() => {
          // Ping failed, connection might be dead
          this.handleDisconnect();
        });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private processQueue(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      if (message) {
        this.ws.send(JSON.stringify(message));
      }
    }
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      // É uma resposta a uma requisição
      if ('id' in message && 'success' in message) {
        const response = message as WSResponse;
        const pending = this.pendingRequests.get(response.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(response.id);
          pending.resolve(response);
        }
        return;
      }

      // É um evento push do servidor
      if ('event' in message) {
        const event = message as WSEvent;
        const handlers = this.eventHandlers.get(event.event);
        if (handlers) {
          handlers.forEach((handler) => {
            try {
              handler(event);
            } catch (error) {
              console.error('Error in event handler:', error);
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private handleDisconnect(): void {
    this.stopHeartbeat();

    // Rejeitar todas as requisições pendentes
    this.pendingRequests.forEach((pending) => {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection lost'));
    });
    this.pendingRequests.clear();

    if (this.state !== 'disconnected') {
      this.setState('reconnecting');
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.reconnectAttempts) {
      this.setState('error');
      return;
    }

    const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(() => {
        this.attemptReconnect();
      });
    }, delay);
  }

  /**
   * Conecta ao servidor WebSocket
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.setState('connecting');

      try {
        this.ws = new WebSocket(this.config.url);

        const connectionTimeout = setTimeout(() => {
          this.ws?.close();
          reject(new Error('Connection timeout'));
        }, this.config.timeout);

        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          this.reconnectAttempts = 0;
          this.setState('connected');
          this.startHeartbeat();
          this.processQueue();
          resolve();
        };

        this.ws.onclose = () => {
          clearTimeout(connectionTimeout);
          this.handleDisconnect();
        };

        this.ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error('WebSocket error:', error);
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Desconecta do servidor
   */
  disconnect(): void {
    this.setState('disconnected');

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.token = null;
    this.messageQueue = [];
  }

  /**
   * Envia uma mensagem e aguarda resposta
   */
  async send<TPayload = unknown, TResponse = unknown>(
    action: WSActionType,
    payload: TPayload
  ): Promise<WSResponse<TResponse>> {
    const id = this.getNextMessageId();

    const request: WSRequest<TPayload> = {
      id,
      action,
      payload,
      token: this.token || undefined,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout for action: ${action}`));
      }, this.config.timeout);

      this.pendingRequests.set(id, {
        resolve: resolve as (response: WSResponse) => void,
        reject,
        timeout,
      });

      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(request));
      } else {
        this.messageQueue.push(request as WSRequest);
      }
    });
  }

  /**
   * Define o token de autenticação
   */
  setToken(token: string | null): void {
    this.token = token;
    if (token) {
      this.setState('authenticated');
    } else if (this.state === 'authenticated') {
      this.setState('connected');
    }
  }

  /**
   * Retorna o estado atual da conexão
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Registra handler para mudança de estado
   */
  onStateChange(handler: StateChangeHandler): () => void {
    this.stateChangeHandlers.add(handler);
    return () => this.stateChangeHandlers.delete(handler);
  }

  /**
   * Registra handler para evento específico
   */
  onEvent<T = unknown>(event: WSEventType, handler: EventHandler<T>): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler as EventHandler);
    return () => this.eventHandlers.get(event)?.delete(handler as EventHandler);
  }

  /**
   * Remove handler de evento
   */
  offEvent<T = unknown>(event: WSEventType, handler: EventHandler<T>): void {
    this.eventHandlers.get(event)?.delete(handler as EventHandler);
  }

  /**
   * Verifica se está conectado
   */
  isConnected(): boolean {
    return this.state === 'connected' || this.state === 'authenticated';
  }

  /**
   * Verifica se está autenticado
   */
  isAuthenticated(): boolean {
    return this.state === 'authenticated';
  }
}

// Factory function para criar cliente
export function createWebSocketClient(
  url: string,
  config?: Partial<WebSocketConfig>
): WebSocketClient {
  return new WebSocketClient({ url, ...config });
}

export { WebSocketClient };

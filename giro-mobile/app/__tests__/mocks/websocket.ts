/**
 * WebSocket Mock
 * Mock implementation for testing WebSocket connections
 */

import { EventEmitter } from 'events';

type MessageHandler = (data: unknown) => void;

export class MockWebSocket extends EventEmitter {
  public url: string;
  public readyState: number = 1; // OPEN
  public CONNECTING = 0;
  public OPEN = 1;
  public CLOSING = 2;
  public CLOSED = 3;

  private messageQueue: unknown[] = [];
  private eventHandlers: Map<string, Set<MessageHandler>> = new Map();

  constructor(url: string) {
    super();
    this.url = url;

    // Simulate connection open after a tick
    setTimeout(() => {
      this.emit('open');
    }, 0);
  }

  send(data: string): void {
    if (this.readyState !== this.OPEN) {
      throw new Error('WebSocket is not open');
    }

    const message = JSON.parse(data);
    this.messageQueue.push(message);
    this.emit('sent', message);
  }

  close(code?: number, reason?: string): void {
    this.readyState = this.CLOSED;
    this.emit('close', { code, reason });
  }

  // Simulate receiving a message from server
  simulateMessage(data: unknown): void {
    const event = {
      data: JSON.stringify(data),
    };
    this.emit('message', event);
  }

  // Simulate connection error
  simulateError(error: Error): void {
    this.emit('error', error);
  }

  // Simulate reconnection
  simulateReconnect(): void {
    this.readyState = this.OPEN;
    this.emit('open');
  }

  // Get sent messages
  getSentMessages(): unknown[] {
    return this.messageQueue;
  }

  // Clear sent messages
  clearSentMessages(): void {
    this.messageQueue = [];
  }

  // Check if specific message was sent
  hasSentMessage(type: string): boolean {
    return this.messageQueue.some(
      (msg) =>
        typeof msg === 'object' && msg !== null && (msg as Record<string, unknown>).action === type
    );
  }

  // Get last sent message
  getLastSentMessage(): unknown | undefined {
    return this.messageQueue[this.messageQueue.length - 1];
  }

  // Native event handler compatibility
  addEventListener(event: string, handler: MessageHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
    this.on(event, handler);
  }

  removeEventListener(event: string, handler: MessageHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      this.off(event, handler);
    }
  }
}

// Factory function to create mock WebSocket
export function createMockWebSocket(url: string = 'ws://localhost:3847'): MockWebSocket {
  return new MockWebSocket(url);
}

// Mock WebSocket client for stores/hooks
export function createMockWSClient() {
  const ws = createMockWebSocket();

  return {
    ws,
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
    send: jest.fn((action: string, payload: unknown) => {
      ws.send(JSON.stringify({ action, payload }));
    }),
    on: jest.fn((event: string, handler: MessageHandler) => {
      ws.on(event, handler);
      return () => ws.off(event, handler);
    }),
    isConnected: true,
    connectionState: 'connected' as const,
  };
}

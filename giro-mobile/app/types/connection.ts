/**
 * Tipos relacionados a conexão e descoberta
 */

export type ConnectionState =
  | 'disconnected'
  | 'discovering'
  | 'connecting'
  | 'connected'
  | 'authenticated'
  | 'reconnecting'
  | 'error';

export interface DiscoveredDesktop {
  id: string;
  name: string;
  host: string;
  ip: string;
  port: number;
  version?: string;
  lastSeen: number;
}

export interface ConnectionInfo {
  state: ConnectionState;
  desktop: DiscoveredDesktop | null;
  connectedAt: number | null;
  reconnectAttempts: number;
  lastError: string | null;
}

export interface Operator {
  id: string;
  name: string;
  role: OperatorRole;
  avatar?: string;
}

export type OperatorRole = 'caixa' | 'repositor' | 'gerente' | 'admin';

export interface AuthSession {
  token: string;
  operator: Operator;
  expiresAt: string;
  deviceId: string;
}

export interface ConnectionHistory {
  desktop: DiscoveredDesktop;
  lastConnected: number;
  timesConnected: number;
}

export interface NetworkInfo {
  isConnected: boolean;
  type: 'wifi' | 'cellular' | 'none' | 'unknown';
  ssid?: string;
  strength?: number;
}

export interface DiscoveryOptions {
  timeout?: number;
  serviceType?: string;
}

export interface WebSocketConfig {
  url: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  timeout?: number;
}

export interface ConnectionError {
  code: ConnectionErrorCode;
  message: string;
  timestamp: number;
}

export type ConnectionErrorCode =
  | 'DISCOVERY_TIMEOUT'
  | 'DISCOVERY_FAILED'
  | 'CONNECTION_REFUSED'
  | 'CONNECTION_TIMEOUT'
  | 'AUTH_FAILED'
  | 'NETWORK_UNAVAILABLE'
  | 'SERVER_UNREACHABLE'
  | 'UNKNOWN_ERROR';

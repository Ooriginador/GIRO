/**
 * Constantes da aplicação
 */

// WebSocket
export const WS_PORT = 3847;
export const WS_RECONNECT_ATTEMPTS = 5;
export const WS_RECONNECT_DELAY = 1000;
export const WS_HEARTBEAT_INTERVAL = 30000;
export const WS_TIMEOUT = 10000;

// mDNS Discovery
export const MDNS_SERVICE_TYPE = '_giro._tcp';
export const MDNS_DOMAIN = 'local.';
export const DISCOVERY_TIMEOUT = 10000;

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@giro/auth_token',
  DEVICE_ID: '@giro/device_id',
  SELECTED_DESKTOP: '@giro/selected_desktop',
  CONNECTION_HISTORY: '@giro/connection_history',
  SETTINGS: '@giro/settings',
  SCAN_HISTORY: '@giro/scan_history',
} as const;

// Limites
export const LIMITS = {
  SCAN_HISTORY_MAX: 20,
  CONNECTION_HISTORY_MAX: 5,
  SEARCH_DEBOUNCE: 300,
  MIN_PIN_LENGTH: 4,
  MAX_PIN_LENGTH: 6,
} as const;

// Cores de status
export const STATUS_COLORS = {
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  muted: '#9ca3af',
} as const;

// Ícones de tabs
export const TAB_ICONS = {
  scanner: 'barcode-scan',
  stock: 'package-variant',
  inventory: 'clipboard-list',
  expiration: 'calendar-clock',
  settings: 'cog',
} as const;

// Mensagens de erro
export const ERROR_MESSAGES = {
  CONNECTION_FAILED: 'Não foi possível conectar ao GIRO Desktop',
  AUTH_FAILED: 'PIN inválido ou usuário não encontrado',
  NETWORK_UNAVAILABLE: 'Sem conexão com a rede WiFi',
  DISCOVERY_TIMEOUT: 'Nenhum GIRO Desktop encontrado na rede',
  PRODUCT_NOT_FOUND: 'Produto não cadastrado',
  INSUFFICIENT_STOCK: 'Estoque insuficiente para esta operação',
  GENERIC_ERROR: 'Ocorreu um erro inesperado',
} as const;

// Mensagens de sucesso
export const SUCCESS_MESSAGES = {
  CONNECTED: 'Conectado ao GIRO Desktop',
  AUTHENTICATED: 'Login realizado com sucesso',
  STOCK_ADJUSTED: 'Estoque ajustado com sucesso',
  PRODUCT_CREATED: 'Produto cadastrado com sucesso',
  INVENTORY_STARTED: 'Inventário iniciado',
  INVENTORY_FINISHED: 'Inventário finalizado',
} as const;

// Unidades de produto
export const PRODUCT_UNITS = [
  { value: 'UN', label: 'Unidade' },
  { value: 'KG', label: 'Quilograma' },
  { value: 'G', label: 'Grama' },
  { value: 'L', label: 'Litro' },
  { value: 'ML', label: 'Mililitro' },
  { value: 'M', label: 'Metro' },
  { value: 'CM', label: 'Centímetro' },
  { value: 'CX', label: 'Caixa' },
  { value: 'PCT', label: 'Pacote' },
  { value: 'DZ', label: 'Dúzia' },
] as const;

// Motivos de ajuste de estoque
export const STOCK_ADJUSTMENT_REASONS = [
  { value: 'RECEIVING', label: 'Recebimento' },
  { value: 'RETURN', label: 'Devolução' },
  { value: 'LOSS', label: 'Perda/Quebra' },
  { value: 'EXPIRATION', label: 'Vencimento' },
  { value: 'INVENTORY', label: 'Ajuste de Inventário' },
  { value: 'OTHER', label: 'Outro' },
] as const;

// Escopos de inventário
export const INVENTORY_SCOPES = [
  { value: 'full', label: 'Inventário Completo' },
  { value: 'category', label: 'Por Categoria' },
  { value: 'section', label: 'Por Seção' },
] as const;

// Períodos de validade
export const EXPIRATION_PERIODS = [
  { value: 7, label: 'Próximos 7 dias' },
  { value: 15, label: 'Próximos 15 dias' },
  { value: 30, label: 'Próximos 30 dias' },
] as const;

/**
 * @file analytics.ts - Métricas de uso anônimas (opt-in)
 * Placeholder simplificado - configure endpoint para ativar
 */

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, unknown>;
  timestamp: string;
}

// const ANALYTICS_ENDPOINT = '';
const eventBuffer: AnalyticsEvent[] = [];

// Verifica se o usuário deu consentimento
const hasConsent = (): boolean => {
  return localStorage.getItem('analytics_consent') === 'true';
};

/**
 * Rastreia evento de uso (apenas se houver consentimento)
 */
export function trackEvent(event: string, properties?: Record<string, unknown>): void {
  if (!hasConsent()) return;

  eventBuffer.push({
    event,
    properties: sanitizeProperties(properties),
    timestamp: new Date().toISOString(),
  });
}

/**
 * Remove dados sensíveis das propriedades
 */
function sanitizeProperties(props?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!props) return undefined;

  const sanitized = { ...props };
  const sensitiveKeys = ['password', 'pin', 'cpf', 'cnpj', 'email', 'phone', 'name'];

  for (const key of sensitiveKeys) {
    if (key in sanitized) {
      delete sanitized[key];
    }
  }

  return sanitized;
}

/**
 * Solicita consentimento do usuário
 */
export function setConsent(consent: boolean): void {
  localStorage.setItem('analytics_consent', consent ? 'true' : 'false');

  if (consent) {
    trackEvent('consent_granted');
  }
}

/**
 * Retorna status do consentimento
 */
export function getConsent(): boolean {
  return hasConsent();
}

// Eventos comuns pré-definidos
export const AnalyticsEvents = {
  APP_OPENED: 'app_opened',
  LOGIN: 'user_login',
  LOGOUT: 'user_logout',
  SALE_COMPLETED: 'sale_completed',
  CASH_OPENED: 'cash_session_opened',
  CASH_CLOSED: 'cash_session_closed',
  PRODUCT_SCANNED: 'product_scanned',
  PRINTER_USED: 'printer_used',
  SCALE_USED: 'scale_used',
  BACKUP_CREATED: 'backup_created',
  BACKUP_RESTORED: 'backup_restored',
  UPDATE_INSTALLED: 'update_installed',
  ERROR_OCCURRED: 'error_occurred',
} as const;

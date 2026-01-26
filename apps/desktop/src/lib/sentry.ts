/**
 * @file sentry.ts - Configuração do Sentry para crash reports
 * Placeholder - requer npm install @sentry/react
 */

// Constantes de configuração
const SENTRY_DSN = '';
const IS_DEV = import.meta.env.DEV;
// const APP_VERSION = '0.1.0';

/**
 * Inicializa o Sentry para monitoramento de erros (placeholder)
 */
export function initSentry(): void {
  if (!SENTRY_DSN) {
    if (IS_DEV) console.log('[Sentry] DSN não configurado - crash reports desabilitados');
    return;
  }
  if (IS_DEV) console.log('[Sentry] Inicializado');
}

/**
 * Captura exceção manualmente
 */
export function captureException(error: Error, context?: Record<string, unknown>): void {
  console.error('[Sentry] Exceção capturada:', (error as Error)?.message ?? String(error), context);
}

/**
 * Captura mensagem de erro
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info'
): void {
  if (IS_DEV) console.log(`[Sentry] ${level}: ${message}`);
}

/**
 * Define contexto de usuário (sem dados sensíveis)
 */
export function setUserContext(userId: string, role: string): void {
  if (IS_DEV) console.log(`[Sentry] User context: ${userId} (${role})`);
}

/**
 * Limpa contexto de usuário ao deslogar
 */
export function clearUserContext(): void {
  if (IS_DEV) console.log('[Sentry] User context cleared');
}

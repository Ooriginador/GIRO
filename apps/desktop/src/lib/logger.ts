/**
 * @file logger.ts - Logger condicional para ambiente de desenvolvimento
 * Logs são desabilitados em produção para performance e segurança
 */

const IS_DEV = import.meta.env.DEV;

interface LoggerOptions {
  prefix?: string;
  enabled?: boolean;
}

class Logger {
  private prefix: string;
  private enabled: boolean;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix || '';
    this.enabled = options.enabled ?? IS_DEV;
  }

  private formatMessage(message: string): string {
    const timestamp = new Date().toISOString().split('T')[1]?.slice(0, 8) ?? '00:00:00';
    const prefix = this.prefix ? `[${this.prefix}]` : '';
    return `${timestamp} ${prefix} ${message}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.enabled) {
      console.debug(this.formatMessage(message), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.enabled) {
      console.info(this.formatMessage(message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.enabled) {
      console.warn(this.formatMessage(message), ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    // Errors sempre logam, mesmo em produção
    console.error(this.formatMessage(message), ...args);
  }
}

// Logger pré-configurados para diferentes módulos
export const logger = new Logger();
export const navLogger = new Logger({ prefix: 'Navigation' });
export const authLogger = new Logger({ prefix: 'Auth' });
export const licenseLogger = new Logger({ prefix: 'License' });
export const networkLogger = new Logger({ prefix: 'Network' });
export const setupLogger = new Logger({ prefix: 'Setup' });

// Factory para criar loggers customizados
export function createLogger(prefix: string, enabled?: boolean): Logger {
  return new Logger({ prefix, enabled });
}

export default logger;

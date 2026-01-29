import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina classes CSS com merge inteligente de Tailwind
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata valor em moeda brasileira
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata número como quantidade
 */
export function formatQuantity(value: number, unit: string = 'un'): string {
  if (unit === 'KG' || unit === 'KILOGRAM') {
    return `${value.toFixed(3)} kg`;
  }
  if (unit === 'GRAM') {
    return `${value.toFixed(0)} g`;
  }
  if (unit === 'LITER') {
    return `${value.toFixed(3)} L`;
  }
  if (unit === 'MILLILITER') {
    return `${value.toFixed(0)} mL`;
  }
  return `${value} ${unit.toLowerCase()}`;
}

/**
 * Formata número com separadores de milhar
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formata data no padrão brasileiro
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR').format(d);
}

/**
 * Formata data e hora no padrão brasileiro
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d);
}

/**
 * Calcula margem de lucro percentual
 */
export function calculateMargin(salePrice: number, costPrice: number): number {
  if (costPrice === 0) return 100;
  return ((salePrice - costPrice) / costPrice) * 100;
}

/**
 * Gera ID único para uso local
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Debounce para inputs
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Formata bytes em uma string legível (KB, MB, GB)
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Valida código de barras EAN-13
 */
export function isValidEAN13(barcode: string): boolean {
  if (!/^\d{13}$/.test(barcode)) return false;

  const digits = barcode.split('').map(Number);
  const checkDigit = digits.pop()!;

  const sum = digits.reduce((acc, digit, index) => {
    return acc + digit * (index % 2 === 0 ? 1 : 3);
  }, 0);

  const calculatedCheck = (10 - (sum % 10)) % 10;
  return checkDigit === calculatedCheck;
}

/**
 * Extrai informações de código de barras de balança
 * Formato: 2PPPPPVVVVVC (2 = prefixo balança, P = produto, V = valor/peso, C = check)
 */
export function parseWeightedBarcode(barcode: string): {
  productCode: string;
  weight: number;
} | null {
  if (!barcode.startsWith('2') || barcode.length !== 13) {
    return null;
  }

  const productCode = barcode.substring(1, 6);
  const weightRaw = barcode.substring(6, 11);
  const weight = parseInt(weightRaw, 10) / 1000; // Converte para kg

  return { productCode, weight };
}

/**
 * Interface para erros Tauri/AppError do backend
 */
interface TauriAppError {
  code?: string;
  message?: string;
  error?: string;
  details?: {
    entity?: string;
    id?: string;
    field?: string;
    available?: number;
    requested?: number;
  };
}

/**
 * Mapeamento de códigos de erro para mensagens amigáveis
 */
const ERROR_MESSAGES: Record<string, string> = {
  DUPLICATE: 'Este registro já existe no sistema.',
  NOT_FOUND: 'Registro não encontrado.',
  VALIDATION_ERROR: 'Dados inválidos.',
  PERMISSION_DENIED: 'Você não tem permissão para esta operação.',
  INSUFFICIENT_STOCK: 'Estoque insuficiente para esta operação.',
  CASH_SESSION_NOT_OPEN: 'É necessário abrir o caixa primeiro.',
  CASH_SESSION_ALREADY_OPEN: 'O caixa já está aberto.',
  INVALID_CREDENTIALS: 'PIN ou senha inválidos.',
  DATABASE_ERROR: 'Erro ao acessar o banco de dados.',
  CONSTRAINT_VIOLATION: 'Operação viola regras do sistema.',
};

/**
 * Extrai código de erro de um objeto de erro Tauri
 */
export function getErrorCode(error: unknown): string | null {
  if (error && typeof error === 'object') {
    const err = error as TauriAppError;
    return err.code || null;
  }
  return null;
}

/**
 * Extrai mensagem de erro de qualquer tipo de erro
 * Funciona com Error, objetos Tauri, strings e objetos genéricos
 */
export function getErrorMessage(error: unknown): string {
  // String direta
  if (typeof error === 'string') {
    return error;
  }

  // Error nativo
  if (error instanceof Error) {
    return error.message;
  }

  // Objeto com propriedade message (Tauri errors, etc)
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;

    // Tauri error format: { message: string } or { error: string }
    if (typeof err.message === 'string' && err.message) {
      return err.message;
    }
    if (typeof err.error === 'string' && err.error) {
      return err.error;
    }

    // Rust AppError serialized format: { code: string, message: string, details?: any }
    if (typeof err.code === 'string' && typeof err.message === 'string') {
      return err.message;
    }

    // Rust AppError format: may come as { Validation: "message" } or similar
    if (typeof err.Validation === 'string') {
      return err.Validation;
    }
    if (typeof err.NotFound === 'string') {
      return err.NotFound;
    }
    if (typeof err.Database === 'string') {
      return err.Database;
    }
    if (typeof err.PermissionDenied === 'string') {
      return err.PermissionDenied;
    }

    // Try to get a meaningful string representation
    try {
      const str = JSON.stringify(error);
      // Don't return [object Object] or empty objects
      if (str && str !== '{}' && str !== '[]' && !str.includes('[object Object]')) {
        // If it's a simple error object, extract the value
        const parsed = JSON.parse(str);
        if (typeof parsed === 'object' && parsed !== null) {
          // Try to extract message from common error structures
          if (parsed.message && typeof parsed.message === 'string') {
            return parsed.message;
          }
          if (parsed.error && typeof parsed.error === 'string') {
            return parsed.error;
          }
          // Extract first string value
          const values = Object.values(parsed);
          if (values.length === 1 && typeof values[0] === 'string') {
            return values[0];
          }
        }
        // If still too complex, don't show JSON
        if (str.length > 200) {
          return 'Erro ao processar operação';
        }
        return str;
      }
    } catch {
      // Circular reference or other JSON issues
    }
  }

  return 'Erro desconhecido';
}

/**
 * Formata erro para exibição amigável ao usuário
 * Traduz códigos de erro e mensagens técnicas para português
 */
export function formatUserError(error: unknown, context?: string): string {
  const code = getErrorCode(error);
  const message = getErrorMessage(error);

  // Se tem código conhecido, usa mensagem amigável
  if (code && ERROR_MESSAGES[code]) {
    // Mas se a mensagem original tem detalhes específicos, usa ela
    if (message && !message.includes('Error') && message.length < 200) {
      return message;
    }
    return ERROR_MESSAGES[code];
  }

  // Tratamento específico para erros de produto
  if (context === 'product') {
    if (message.includes('barras') || message.includes('barcode')) {
      return message; // Já é uma mensagem amigável do backend
    }
    if (message.includes('UNIQUE constraint') && message.includes('barcode')) {
      return 'Este código de barras já está cadastrado em outro produto.';
    }
    if (message.includes('UNIQUE constraint') && message.includes('internal_code')) {
      return 'Este código interno já está em uso.';
    }
    if (message.includes('FOREIGN KEY') && message.includes('category')) {
      return 'A categoria selecionada não existe.';
    }
    if (message.includes('FOREIGN KEY constraint failed')) {
      return 'Não é possível excluir este produto pois existem vendas ou movimentações relacionadas.';
    }
    if (message.includes('RESTRICT') || message.includes('constraint')) {
      return 'Não é possível excluir este produto. Verifique se não há registros relacionados.';
    }
  }

  // Tratamento genérico de erros SQLite
  if (message.includes('UNIQUE constraint')) {
    return 'Este registro já existe no sistema.';
  }
  if (message.includes('FOREIGN KEY constraint')) {
    return 'Operação inválida: registro relacionado não existe.';
  }
  if (message.includes('NOT NULL constraint')) {
    return 'Campo obrigatório não preenchido.';
  }

  // Se a mensagem é legível (português, sem stack trace), retorna ela
  if (message && !message.includes('Error:') && !message.includes('at ') && message.length < 200) {
    return message;
  }

  // Fallback genérico
  return context
    ? `Erro ao processar ${context}. Tente novamente.`
    : 'Ocorreu um erro. Tente novamente.';
}

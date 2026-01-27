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
    const err = error as TauriAppError;

    // Tauri error format: { message: string } or { error: string }
    if (err.message && typeof err.message === 'string') {
      return err.message;
    }
    if (err.error && typeof err.error === 'string') {
      return err.error;
    }
    // Try to get a meaningful string representation
    try {
      const str = JSON.stringify(error);
      // Don't return [object Object] or empty objects
      if (str && str !== '{}' && str !== '[]') {
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

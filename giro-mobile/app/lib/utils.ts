/**
 * Utilitários gerais
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina classes Tailwind de forma inteligente
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formata preço para exibição
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata quantidade baseado na unidade
 */
export function formatQuantity(quantity: number, unit: string): string {
  const decimalUnits = ['KG', 'G', 'L', 'ML', 'M', 'CM'];

  if (decimalUnits.includes(unit)) {
    return quantity.toFixed(3).replace('.', ',');
  }

  return quantity.toString();
}

/**
 * Formata data relativa (ex: "há 5 minutos")
 */
export function formatRelativeTime(date: Date | string | number): string {
  const now = new Date();
  const target = new Date(date);
  const diffMs = now.getTime() - target.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'agora';
  }
  if (diffMins < 60) {
    return `há ${diffMins} min`;
  }
  if (diffHours < 24) {
    return `há ${diffHours}h`;
  }
  if (diffDays < 7) {
    return `há ${diffDays}d`;
  }

  return target.toLocaleDateString('pt-BR');
}

/**
 * Formata data para exibição
 */
export function formatDate(date: Date | string | number): string {
  return new Date(date).toLocaleDateString('pt-BR');
}

/**
 * Formata data e hora
 */
export function formatDateTime(date: Date | string | number): string {
  return new Date(date).toLocaleString('pt-BR');
}

/**
 * Calcula dias até uma data
 */
export function daysUntil(date: Date | string): number {
  const target = new Date(date);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
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
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Gera ID único para dispositivo
 */
export function generateDeviceId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Valida código de barras EAN-13
 */
export function isValidEAN13(barcode: string): boolean {
  if (!/^\d{13}$/.test(barcode)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(barcode[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(barcode[12], 10);
}

/**
 * Valida código de barras EAN-8
 */
export function isValidEAN8(barcode: string): boolean {
  if (!/^\d{8}$/.test(barcode)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const digit = parseInt(barcode[i], 10);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(barcode[7], 10);
}

/**
 * Valida qualquer código de barras suportado
 */
export function isValidBarcode(barcode: string): boolean {
  return isValidEAN13(barcode) || isValidEAN8(barcode) || /^\d{1,14}$/.test(barcode);
}

/**
 * Sleep/delay async
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Trunca texto com reticências
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Capitaliza primeira letra
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Determina urgência baseado nos dias até vencimento
 */
export function getExpirationUrgency(daysUntil: number): 'critical' | 'warning' | 'notice' | null {
  if (daysUntil <= 2) return 'critical';
  if (daysUntil <= 7) return 'warning';
  if (daysUntil <= 30) return 'notice';
  return null;
}

/**
 * Determina status do estoque
 */
export function getStockStatus(current: number, min: number): 'ok' | 'low' | 'out' {
  if (current <= 0) return 'out';
  if (current <= min) return 'low';
  return 'ok';
}

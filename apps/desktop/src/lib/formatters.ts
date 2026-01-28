/**
 * @file Formatadores e utilitários
 * @description Funções de formatação para exibição de dados
 */

import type { AlertSeverity, EmployeeRole, PaymentMethod, ProductUnit } from '@/types';

// ════════════════════════════════════════════════════════════════════════════
// MOEDA
// ════════════════════════════════════════════════════════════════════════════

/**
 * Formata valor em reais (R$)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Parse de string de moeda para número
 */
export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

// ════════════════════════════════════════════════════════════════════════════
// QUANTIDADE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Formata quantidade com unidade
 */
export function formatQuantity(value: number, unit: ProductUnit): string {
  switch (unit) {
    case 'KILOGRAM':
      return `${value.toFixed(3)} kg`;
    case 'GRAM':
      return `${value.toFixed(0)} g`;
    case 'LITER':
      return `${value.toFixed(3)} L`;
    case 'MILLILITER':
      return `${value.toFixed(0)} ml`;
    case 'METER':
      return `${value.toFixed(2)} m`;
    case 'DOZEN':
      return `${value.toFixed(0)} dz`;
    case 'BOX':
      return `${value.toFixed(0)} cx`;
    case 'PACK':
      return `${value.toFixed(0)} pct`;
    case 'KIT':
      return `${value.toFixed(0)} kit`;
    case 'PAIR':
      return `${value.toFixed(0)} par`;
    case 'UNIT':
    default:
      return `${value.toFixed(0)} un`;
  }
}

/**
 * Label da unidade
 */
export function getUnitLabel(unit: ProductUnit): string {
  const labels: Record<ProductUnit, string> = {
    UNIT: 'Unidade',
    KILOGRAM: 'Quilograma',
    GRAM: 'Grama',
    LITER: 'Litro',
    MILLILITER: 'Mililitro',
    METER: 'Metro',
    CENTIMETER: 'Centímetro',
    BOX: 'Caixa',
    PACK: 'Pacote',
    DOZEN: 'Dúzia',
    KIT: 'Kit',
    PAIR: 'Par',
  };
  return labels[unit];
}

/**
 * Sigla da unidade
 */
export function getUnitAbbr(unit: ProductUnit): string {
  const abbrs: Record<ProductUnit, string> = {
    UNIT: 'un',
    KILOGRAM: 'kg',
    GRAM: 'g',
    LITER: 'L',
    MILLILITER: 'ml',
    METER: 'm',
    CENTIMETER: 'cm',
    BOX: 'cx',
    PACK: 'pct',
    DOZEN: 'dz',
    KIT: 'kit',
    PAIR: 'par',
  };
  return abbrs[unit];
}

// ════════════════════════════════════════════════════════════════════════════
// DATA E HORA
// ════════════════════════════════════════════════════════════════════════════

/**
 * Formata data no padrão brasileiro
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/**
 * Formata data e hora
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Formata apenas hora
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(d);
}

/**
 * Calcula dias até uma data
 */
export function daysUntil(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Texto relativo de vencimento
 */
export function formatExpirationRelative(date: Date | string): string {
  const days = daysUntil(date);

  if (days < 0) return `Vencido há ${Math.abs(days)} dias`;
  if (days === 0) return 'Vence hoje';
  if (days === 1) return 'Vence amanhã';
  if (days <= 7) return `Vence em ${days} dias`;
  if (days <= 30) return `Vence em ${Math.ceil(days / 7)} semanas`;
  return formatDate(date);
}

// ════════════════════════════════════════════════════════════════════════════
// PAGAMENTO
// ════════════════════════════════════════════════════════════════════════════

/**
 * Label do método de pagamento
 */
export function getPaymentMethodLabel(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    CASH: 'Dinheiro',
    PIX: 'PIX',
    CREDIT: 'Crédito',
    DEBIT: 'Débito',
    VOUCHER: 'Vale',
    OTHER: 'Outro',
  };
  return labels[method];
}

/**
 * Ícone do método de pagamento (Lucide icon name)
 */
export function getPaymentMethodIcon(method: PaymentMethod): string {
  const icons: Record<PaymentMethod, string> = {
    CASH: 'banknote',
    PIX: 'qr-code',
    CREDIT: 'credit-card',
    DEBIT: 'credit-card',
    VOUCHER: 'ticket',
    OTHER: 'wallet',
  };
  return icons[method];
}

// ════════════════════════════════════════════════════════════════════════════
// FUNCIONÁRIOS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Label do cargo
 */
export function getRoleLabel(role: EmployeeRole): string {
  const labels: Record<EmployeeRole, string> = {
    ADMIN: 'Administrador',
    MANAGER: 'Gerente',
    CASHIER: 'Operador de Caixa',
    ATTENDANT: 'Atendente',
    STOCKER: 'Estoquista',
    VIEWER: 'Visualizador',
    // Enterprise roles
    CONTRACT_MANAGER: 'Gestor de Contratos',
    SUPERVISOR: 'Supervisor de Frente',
    WAREHOUSE: 'Almoxarife',
    REQUESTER: 'Solicitante',
  };
  return labels[role];
}

/**
 * Cor do badge do cargo
 */
export function getRoleBadgeColor(role: EmployeeRole): string {
  const colors: Record<EmployeeRole, string> = {
    ADMIN: 'destructive',
    MANAGER: 'default',
    CASHIER: 'secondary',
    ATTENDANT: 'secondary',
    STOCKER: 'info',
    VIEWER: 'outline',
    // Enterprise roles
    CONTRACT_MANAGER: 'default',
    SUPERVISOR: 'secondary',
    WAREHOUSE: 'info',
    REQUESTER: 'outline',
  };
  return colors[role];
}

// ════════════════════════════════════════════════════════════════════════════
// ALERTAS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Cor do badge de severidade
 */
export function getSeverityColor(severity: AlertSeverity): string {
  const colors: Record<AlertSeverity, string> = {
    CRITICAL: 'destructive',
    WARNING: 'warning',
    INFO: 'info',
  };
  return colors[severity];
}

// ════════════════════════════════════════════════════════════════════════════
// STRINGS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Trunca texto com ellipsis
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
 * Remove acentos de string
 */
export function removeAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Formata CPF
 */
export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '');
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata CNPJ
 */
export function formatCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/\D/g, '');
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/**
 * Formata telefone
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
}

// ════════════════════════════════════════════════════════════════════════════
// NÚMEROS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Formata número com separador de milhar
 */
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formata porcentagem
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${formatNumber(value, decimals)}%`;
}

/**
 * Calcula margem de lucro
 */
export function calculateMargin(salePrice: number, costPrice: number): number {
  if (costPrice === 0) return 100;
  return ((salePrice - costPrice) / costPrice) * 100;
}

/**
 * Formata peso em kg com 3 casas decimais
 */
export function formatWeight(value: number): string {
  return (
    new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(value) + ' kg'
  );
}

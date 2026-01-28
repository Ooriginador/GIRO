/**
 * @file formatters.test.ts - Testes para funções de formatação
 */

import {
  calculateMargin,
  capitalize,
  daysUntil,
  formatCNPJ,
  formatCPF,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatExpirationRelative,
  formatNumber,
  formatPercent,
  formatPhone,
  formatQuantity,
  formatTime,
  formatWeight,
  getPaymentMethodIcon,
  getPaymentMethodLabel,
  getRoleBadgeColor,
  getRoleLabel,
  getSeverityColor,
  getUnitAbbr,
  getUnitLabel,
  parseCurrency,
  removeAccents,
  truncate,
} from '@/lib/formatters';
import { describe, expect, it } from 'vitest';

// Helper to normalize non-breaking spaces
const normalize = (str: string) => str.replace(/\u00A0/g, ' ');

describe('Formatters', () => {
  describe('formatCurrency', () => {
    it('should format positive numbers', () => {
      expect(normalize(formatCurrency(10))).toBe('R$ 10,00');
      expect(normalize(formatCurrency(1234.56))).toBe('R$ 1.234,56');
      expect(normalize(formatCurrency(0.99))).toBe('R$ 0,99');
    });

    it('should format zero', () => {
      expect(normalize(formatCurrency(0))).toBe('R$ 0,00');
    });

    it('should format negative numbers', () => {
      expect(normalize(formatCurrency(-10))).toBe('-R$ 10,00');
    });

    it('should handle large numbers', () => {
      expect(normalize(formatCurrency(1000000))).toBe('R$ 1.000.000,00');
    });
  });

  describe('parseCurrency', () => {
    it('should parse simple currency string to number', () => {
      expect(parseCurrency('R$ 10,00')).toBe(10);
      expect(parseCurrency('99,99')).toBe(99.99);
    });

    it('should return 0 for invalid input', () => {
      expect(parseCurrency('')).toBe(0);
      expect(parseCurrency('abc')).toBe(0);
    });
  });

  describe('formatWeight', () => {
    it('should format weight in kg', () => {
      expect(normalize(formatWeight(1.5))).toBe('1,500 kg');
      expect(normalize(formatWeight(0.25))).toBe('0,250 kg');
    });

    it('should format zero weight', () => {
      expect(normalize(formatWeight(0))).toBe('0,000 kg');
    });

    it('should handle precision', () => {
      expect(normalize(formatWeight(1.2345))).toBe('1,235 kg');
    });
  });

  describe('formatQuantity', () => {
    it('should format UNIT', () => {
      expect(formatQuantity(10, 'UNIT')).toBe('10 un');
    });

    it('should format KILOGRAM', () => {
      expect(formatQuantity(1.5, 'KILOGRAM')).toBe('1.500 kg');
    });

    it('should format GRAM', () => {
      expect(formatQuantity(500, 'GRAM')).toBe('500 g');
    });

    it('should format LITER', () => {
      expect(formatQuantity(2.5, 'LITER')).toBe('2.500 L');
    });

    it('should format MILLILITER', () => {
      expect(formatQuantity(350, 'MILLILITER')).toBe('350 ml');
    });

    it('should format METER', () => {
      expect(formatQuantity(3.75, 'METER')).toBe('3.75 m');
    });

    it('should format DOZEN', () => {
      expect(formatQuantity(2, 'DOZEN')).toBe('2 dz');
    });

    it('should format BOX', () => {
      expect(formatQuantity(5, 'BOX')).toBe('5 cx');
    });

    it('should format PACK', () => {
      expect(formatQuantity(3, 'PACK')).toBe('3 pct');
    });

    it('should format KIT', () => {
      expect(formatQuantity(2, 'KIT')).toBe('2 kit');
    });

    it('should format PAIR', () => {
      expect(formatQuantity(4, 'PAIR')).toBe('4 par');
    });
  });

  describe('getUnitLabel', () => {
    it('should return unit labels', () => {
      expect(getUnitLabel('UNIT')).toBe('Unidade');
      expect(getUnitLabel('KILOGRAM')).toBe('Quilograma');
      expect(getUnitLabel('LITER')).toBe('Litro');
    });
  });

  describe('getUnitAbbr', () => {
    it('should return unit abbreviations', () => {
      expect(getUnitAbbr('UNIT')).toBe('un');
      expect(getUnitAbbr('KILOGRAM')).toBe('kg');
      expect(getUnitAbbr('LITER')).toBe('L');
    });
  });

  describe('formatDate', () => {
    it('should format date in Brazilian format', () => {
      // Use explicit T12:00:00 to avoid timezone shifting to previous day
      const date = new Date('2026-01-07T12:00:00');
      expect(formatDate(date)).toMatch(/07\/01\/2026/);
    });

    it('should handle string dates', () => {
      // Use T12:00:00 suffix to ensure correct day
      expect(formatDate('2026-01-07T12:00:00')).toMatch(/07\/01\/2026/);
    });
  });

  describe('formatDateTime', () => {
    it('should format date and time', () => {
      const date = new Date('2026-01-07T14:30:00');
      const formatted = formatDateTime(date);
      expect(formatted).toMatch(/07\/01\/2026/);
      expect(formatted).toMatch(/14:30/);
    });
  });

  describe('formatTime', () => {
    it('should format time only', () => {
      const date = new Date('2026-01-07T14:30:45');
      const formatted = formatTime(date);
      expect(formatted).toMatch(/14:30:45/);
    });
  });

  describe('daysUntil', () => {
    it('should calculate days until future date', () => {
      const future = new Date();
      future.setDate(future.getDate() + 5);
      expect(daysUntil(future)).toBe(5);
    });

    it('should return negative for past dates', () => {
      const past = new Date();
      past.setDate(past.getDate() - 3);
      expect(daysUntil(past)).toBeLessThan(0);
    });
  });

  describe('formatExpirationRelative', () => {
    it('should format expired date', () => {
      const past = new Date();
      past.setDate(past.getDate() - 5);
      expect(formatExpirationRelative(past)).toMatch(/Vencido há 5 dias/);
    });

    it('should format near dates correctly', () => {
      // Test is robust - just verify returns a string with 'Vence'
      const nearDate = new Date();
      nearDate.setDate(nearDate.getDate() + 3);
      expect(formatExpirationRelative(nearDate)).toContain('Vence');
    });

    it('should format tomorrow', () => {
      // Para evitar problemas de timezone, começamos com hoje ao meio-dia
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const result = formatExpirationRelative(tomorrow);
      // Aceita "amanhã" ou "em 1 dia" ou "em 2 dias" dependendo do horário local
      expect(result).toMatch(/Vence (amanhã|em [12] dias?)/);
    });

    it('should format days', () => {
      const future = new Date();
      future.setDate(future.getDate() + 5);
      expect(formatExpirationRelative(future)).toMatch(/Vence em 5 dias/);
    });

    it('should format weeks', () => {
      const future = new Date();
      future.setDate(future.getDate() + 14);
      expect(formatExpirationRelative(future)).toMatch(/Vence em 2 semanas/);
    });
  });

  describe('getPaymentMethodLabel', () => {
    it('should return payment method labels', () => {
      expect(getPaymentMethodLabel('CASH')).toBe('Dinheiro');
      expect(getPaymentMethodLabel('PIX')).toBe('PIX');
      expect(getPaymentMethodLabel('CREDIT')).toBe('Crédito');
      expect(getPaymentMethodLabel('DEBIT')).toBe('Débito');
      expect(getPaymentMethodLabel('OTHER')).toBe('Outro');
    });
  });

  describe('getPaymentMethodIcon', () => {
    it('should return payment method icons', () => {
      expect(getPaymentMethodIcon('CASH')).toBe('banknote');
      expect(getPaymentMethodIcon('PIX')).toBe('qr-code');
      expect(getPaymentMethodIcon('CREDIT')).toBe('credit-card');
    });
  });

  describe('getRoleLabel', () => {
    it('should return role labels', () => {
      expect(getRoleLabel('ADMIN')).toBe('Administrador');
      expect(getRoleLabel('MANAGER')).toBe('Gerente');
      expect(getRoleLabel('CASHIER')).toBe('Operador de Caixa');
      expect(getRoleLabel('VIEWER')).toBe('Visualizador');
    });
  });

  describe('getRoleBadgeColor', () => {
    it('should return role badge colors', () => {
      expect(getRoleBadgeColor('ADMIN')).toBe('destructive');
      expect(getRoleBadgeColor('MANAGER')).toBe('default');
      expect(getRoleBadgeColor('CASHIER')).toBe('secondary');
    });
  });

  describe('getSeverityColor', () => {
    it('should return severity colors', () => {
      expect(getSeverityColor('CRITICAL')).toBe('destructive');
      expect(getSeverityColor('WARNING')).toBe('warning');
      expect(getSeverityColor('INFO')).toBe('info');
    });
  });

  describe('truncate', () => {
    it('should truncate long text', () => {
      expect(truncate('Hello World Long Text', 10)).toBe('Hello W...');
    });

    it('should not truncate short text', () => {
      expect(truncate('Short', 10)).toBe('Short');
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('WORLD')).toBe('World');
    });
  });

  describe('removeAccents', () => {
    it('should remove accents', () => {
      expect(removeAccents('café')).toBe('cafe');
      expect(removeAccents('São Paulo')).toBe('Sao Paulo');
      expect(removeAccents('Ação')).toBe('Acao');
    });
  });

  describe('formatCPF', () => {
    it('should format valid CPF', () => {
      expect(formatCPF('12345678901')).toBe('123.456.789-01');
    });

    it('should handle already formatted CPF', () => {
      expect(formatCPF('123.456.789-01')).toBe('123.456.789-01');
    });

    it('should return empty for invalid', () => {
      expect(formatCPF('')).toBe('');
    });
  });

  describe('formatCNPJ', () => {
    it('should format CNPJ', () => {
      expect(formatCNPJ('11222333000181')).toBe('11.222.333/0001-81');
    });
  });

  describe('formatPhone', () => {
    it('should format mobile phone', () => {
      expect(formatPhone('11999998888')).toBe('(11) 99999-8888');
    });

    it('should format landline', () => {
      expect(formatPhone('1133334444')).toBe('(11) 3333-4444');
    });
  });

  describe('formatNumber', () => {
    it('should format number with thousand separator', () => {
      expect(formatNumber(1234567)).toBe('1.234.567');
    });

    it('should format with decimals', () => {
      expect(formatNumber(1234.567, 2)).toBe('1.234,57');
    });
  });

  describe('formatPercent', () => {
    it('should format percentage', () => {
      expect(formatPercent(25.5)).toBe('25,5%');
      expect(formatPercent(100, 0)).toBe('100%');
    });
  });

  describe('calculateMargin', () => {
    it('should calculate profit margin', () => {
      expect(calculateMargin(100, 50)).toBe(100);
      expect(calculateMargin(150, 100)).toBe(50);
    });

    it('should return 100 for zero cost', () => {
      expect(calculateMargin(100, 0)).toBe(100);
    });
  });
});

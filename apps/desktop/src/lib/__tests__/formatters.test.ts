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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Currency Formatters', () => {
  describe('formatCurrency', () => {
    it('should format positive values', () => {
      expect(formatCurrency(10)).toMatch(/R\$\s*10,00/);
      expect(formatCurrency(1234.56)).toMatch(/R\$\s*1\.234,56/);
    });

    it('should format zero', () => {
      expect(formatCurrency(0)).toMatch(/R\$\s*0,00/);
    });

    it('should format negative values', () => {
      expect(formatCurrency(-50)).toMatch(/-.*50,00/);
    });
  });

  describe('parseCurrency', () => {
    it('should parse formatted currency', () => {
      // parseCurrency uses comma as decimal separator in pt-BR
      expect(parseCurrency('R$ 10,00')).toBe(10);
      expect(parseCurrency('123,45')).toBe(123.45);
    });

    it('should handle plain numbers', () => {
      expect(parseCurrency('123.45')).toBe(123.45);
    });

    it('should return 0 for invalid input', () => {
      expect(parseCurrency('abc')).toBe(0);
      expect(parseCurrency('')).toBe(0);
    });
  });
});

describe('Quantity Formatters', () => {
  describe('formatQuantity', () => {
    it('should format kilograms', () => {
      expect(formatQuantity(1.5, 'KILOGRAM')).toBe('1.500 kg');
    });

    it('should format grams', () => {
      expect(formatQuantity(500, 'GRAM')).toBe('500 g');
    });

    it('should format liters', () => {
      expect(formatQuantity(2.5, 'LITER')).toBe('2.500 L');
    });

    it('should format milliliters', () => {
      expect(formatQuantity(350, 'MILLILITER')).toBe('350 ml');
    });

    it('should format meters', () => {
      expect(formatQuantity(1.5, 'METER')).toBe('1.50 m');
    });

    it('should format boxes', () => {
      expect(formatQuantity(5, 'BOX')).toBe('5 cx');
    });

    it('should format packs', () => {
      expect(formatQuantity(3, 'PACK')).toBe('3 pct');
    });

    it('should format dozen', () => {
      expect(formatQuantity(2, 'DOZEN')).toBe('2 dz');
    });

    it('should format units by default', () => {
      expect(formatQuantity(10, 'UNIT')).toBe('10 un');
    });
  });

  describe('getUnitLabel', () => {
    it('should return correct labels', () => {
      expect(getUnitLabel('KILOGRAM')).toBe('Quilograma');
      expect(getUnitLabel('UNIT')).toBe('Unidade');
      expect(getUnitLabel('LITER')).toBe('Litro');
    });
  });

  describe('getUnitAbbr', () => {
    it('should return correct abbreviations', () => {
      expect(getUnitAbbr('KILOGRAM')).toBe('kg');
      expect(getUnitAbbr('UNIT')).toBe('un');
      expect(getUnitAbbr('LITER')).toBe('L');
    });
  });
});

describe('Date Formatters', () => {
  describe('formatDate', () => {
    it('should format Date object', () => {
      const date = new Date(2024, 0, 15);
      expect(formatDate(date)).toBe('15/01/2024');
    });

    it('should format string', () => {
      expect(formatDate('2024-06-20T00:00:00')).toMatch(/20\/06\/2024/);
    });
  });

  describe('formatDateTime', () => {
    it('should include time', () => {
      const date = new Date(2024, 5, 20, 14, 30);
      const result = formatDateTime(date);
      expect(result).toMatch(/14:30/);
    });
  });

  describe('formatTime', () => {
    it('should format time only', () => {
      const date = new Date(2024, 5, 20, 14, 30, 45);
      expect(formatTime(date)).toBe('14:30:45');
    });
  });

  describe('daysUntil', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 5, 15)); // June 15, 2024
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should calculate positive days', () => {
      expect(daysUntil(new Date(2024, 5, 20))).toBe(5);
    });

    it('should calculate negative days', () => {
      expect(daysUntil(new Date(2024, 5, 10))).toBe(-5);
    });

    it('should return 0 for today', () => {
      expect(daysUntil(new Date(2024, 5, 15))).toBe(0);
    });
  });

  describe('formatExpirationRelative', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 5, 15));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should show expired', () => {
      expect(formatExpirationRelative(new Date(2024, 5, 10))).toMatch(/Vencido há 5 dias/);
    });

    it('should show today', () => {
      expect(formatExpirationRelative(new Date(2024, 5, 15))).toBe('Vence hoje');
    });

    it('should show tomorrow', () => {
      expect(formatExpirationRelative(new Date(2024, 5, 16))).toBe('Vence amanhã');
    });

    it('should show days', () => {
      expect(formatExpirationRelative(new Date(2024, 5, 20))).toBe('Vence em 5 dias');
    });

    it('should show weeks', () => {
      expect(formatExpirationRelative(new Date(2024, 6, 1))).toMatch(/Vence em \d+ semanas/);
    });
  });
});

describe('Payment Method Formatters', () => {
  describe('getPaymentMethodLabel', () => {
    it('should return correct labels', () => {
      expect(getPaymentMethodLabel('CASH')).toBe('Dinheiro');
      expect(getPaymentMethodLabel('PIX')).toBe('PIX');
      expect(getPaymentMethodLabel('CREDIT')).toBe('Crédito');
      expect(getPaymentMethodLabel('DEBIT')).toBe('Débito');
    });
  });

  describe('getPaymentMethodIcon', () => {
    it('should return correct icons', () => {
      expect(getPaymentMethodIcon('CASH')).toBe('banknote');
      expect(getPaymentMethodIcon('PIX')).toBe('qr-code');
      expect(getPaymentMethodIcon('CREDIT')).toBe('credit-card');
    });
  });
});

describe('Employee Role Formatters', () => {
  describe('getRoleLabel', () => {
    it('should return correct labels', () => {
      expect(getRoleLabel('ADMIN')).toBe('Administrador');
      expect(getRoleLabel('MANAGER')).toBe('Gerente');
      expect(getRoleLabel('CASHIER')).toBe('Operador de Caixa');
    });
  });

  describe('getRoleBadgeColor', () => {
    it('should return correct colors', () => {
      expect(getRoleBadgeColor('ADMIN')).toBe('destructive');
      expect(getRoleBadgeColor('MANAGER')).toBe('default');
    });
  });
});

describe('Alert Formatters', () => {
  describe('getSeverityColor', () => {
    it('should return correct colors', () => {
      expect(getSeverityColor('CRITICAL')).toBe('destructive');
      expect(getSeverityColor('WARNING')).toBe('warning');
      expect(getSeverityColor('INFO')).toBe('info');
    });
  });
});

describe('String Formatters', () => {
  describe('truncate', () => {
    it('should truncate long text', () => {
      expect(truncate('Hello World', 8)).toBe('Hello...');
    });

    it('should not truncate short text', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('HELLO')).toBe('Hello');
    });
  });

  describe('removeAccents', () => {
    it('should remove accents', () => {
      expect(removeAccents('café')).toBe('cafe');
      expect(removeAccents('ação')).toBe('acao');
      expect(removeAccents('çãéíóú')).toBe('caeiou');
    });
  });

  describe('formatCPF', () => {
    it('should format CPF', () => {
      expect(formatCPF('12345678901')).toBe('123.456.789-01');
    });
  });

  describe('formatCNPJ', () => {
    it('should format CNPJ', () => {
      expect(formatCNPJ('12345678000199')).toBe('12.345.678/0001-99');
    });
  });

  describe('formatPhone', () => {
    it('should format mobile phone', () => {
      expect(formatPhone('11987654321')).toBe('(11) 98765-4321');
    });

    it('should format landline', () => {
      expect(formatPhone('1134567890')).toBe('(11) 3456-7890');
    });
  });
});

describe('Number Formatters', () => {
  describe('formatNumber', () => {
    it('should format with thousands separator', () => {
      expect(formatNumber(1234567)).toBe('1.234.567');
    });

    it('should format with decimals', () => {
      expect(formatNumber(1234.567, 2)).toBe('1.234,57');
    });
  });

  describe('formatPercent', () => {
    it('should format percentage', () => {
      expect(formatPercent(25)).toBe('25,0%');
      expect(formatPercent(33.333, 2)).toBe('33,33%');
    });
  });

  describe('calculateMargin', () => {
    it('should calculate margin', () => {
      expect(calculateMargin(150, 100)).toBe(50);
    });

    it('should return 100 for zero cost', () => {
      expect(calculateMargin(50, 0)).toBe(100);
    });
  });

  describe('formatWeight', () => {
    it('should format weight in kg', () => {
      expect(formatWeight(1.5)).toBe('1,500 kg');
      expect(formatWeight(0.25)).toBe('0,250 kg');
    });
  });
});

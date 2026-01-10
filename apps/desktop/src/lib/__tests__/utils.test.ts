/**
 * @file utils.test.ts - Testes para funções utilitárias
 */

import {
  calculateMargin,
  cn,
  debounce,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatQuantity,
  generateId,
  isValidEAN13,
  parseWeightedBarcode,
} from '@/lib/utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('cn (classNames)', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    const isActive = true;
    const isHidden = false;
    expect(cn('base', isActive && 'active')).toBe('base active');
    expect(cn('base', isHidden && 'hidden')).toBe('base');
  });

  it('should merge tailwind classes intelligently', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('should handle undefined and null', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end');
  });
});

describe('formatCurrency', () => {
  it('should format positive values', () => {
    expect(formatCurrency(10)).toMatch(/R\$\s*10,00/);
    expect(formatCurrency(1234.56)).toMatch(/R\$\s*1\.234,56/);
  });

  it('should format zero', () => {
    expect(formatCurrency(0)).toMatch(/R\$\s*0,00/);
  });

  it('should format negative values', () => {
    expect(formatCurrency(-50)).toMatch(/-.*R?\$?\s*50,00/);
  });

  it('should format large values', () => {
    expect(formatCurrency(1000000)).toMatch(/R\$\s*1\.000\.000,00/);
  });

  it('should round decimals', () => {
    expect(formatCurrency(10.999)).toMatch(/R\$\s*11,00/);
  });
});

describe('formatQuantity', () => {
  it('should format kilograms', () => {
    expect(formatQuantity(1.5, 'KG')).toBe('1.500 kg');
    expect(formatQuantity(0.25, 'KILOGRAM')).toBe('0.250 kg');
  });

  it('should format grams', () => {
    expect(formatQuantity(500, 'GRAM')).toBe('500 g');
  });

  it('should format liters', () => {
    expect(formatQuantity(2.5, 'LITER')).toBe('2.500 L');
  });

  it('should format milliliters', () => {
    expect(formatQuantity(350, 'MILLILITER')).toBe('350 mL');
  });

  it('should format units by default', () => {
    expect(formatQuantity(10)).toBe('10 un');
    expect(formatQuantity(5, 'UNIT')).toBe('5 unit');
  });
});

describe('formatDate', () => {
  it('should format Date object', () => {
    const date = new Date(2024, 0, 15); // Jan 15, 2024
    expect(formatDate(date)).toMatch(/15\/01\/2024/);
  });

  it('should format date string', () => {
    // Note: timezone may affect the exact date
    const result = formatDate('2024-06-20T12:00:00');
    expect(result).toMatch(/\d{2}\/06\/2024/);
  });
});

describe('formatDateTime', () => {
  it('should format date and time', () => {
    const date = new Date(2024, 5, 20, 14, 30); // Jun 20, 2024 14:30
    const result = formatDateTime(date);
    expect(result).toMatch(/20\/06\/2024/);
    expect(result).toMatch(/14:30/);
  });

  it('should handle string input', () => {
    const result = formatDateTime('2024-06-20T10:00:00');
    expect(result).toMatch(/20\/06\/2024/);
  });
});

describe('calculateMargin', () => {
  it('should calculate positive margin', () => {
    expect(calculateMargin(150, 100)).toBe(50); // 50% margin
  });

  it('should calculate zero margin', () => {
    expect(calculateMargin(100, 100)).toBe(0);
  });

  it('should calculate negative margin', () => {
    expect(calculateMargin(80, 100)).toBe(-20);
  });

  it('should return 100 when cost is zero', () => {
    expect(calculateMargin(50, 0)).toBe(100);
  });
});

describe('generateId', () => {
  it('should generate valid UUID', () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('should generate unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should delay function execution', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should only call once for rapid calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced();
    debounced();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should pass arguments to function', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('arg1', 'arg2');
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });
});

describe('isValidEAN13', () => {
  it('should validate correct EAN-13', () => {
    // Using known valid EAN-13 codes
    expect(isValidEAN13('4006381333931')).toBe(true); // Stabilo pen
    expect(isValidEAN13('5901234123457')).toBe(true); // Test barcode
  });

  it('should reject invalid length', () => {
    expect(isValidEAN13('123456789012')).toBe(false); // 12 digits
    expect(isValidEAN13('12345678901234')).toBe(false); // 14 digits
  });

  it('should reject non-numeric', () => {
    expect(isValidEAN13('789123456789A')).toBe(false);
  });

  it('should reject invalid check digit', () => {
    expect(isValidEAN13('4006381333932')).toBe(false); // Wrong check digit (should be 1)
  });
});

describe('parseWeightedBarcode', () => {
  it('should parse valid weight barcode', () => {
    const result = parseWeightedBarcode('2001230150001');
    expect(result).toEqual({
      productCode: '00123',
      weight: 1.5, // 01500 = 1.500 kg
    });
  });

  it('should handle different weights', () => {
    const result = parseWeightedBarcode('2005000025001');
    expect(result?.productCode).toBe('00500');
    expect(result?.weight).toBe(0.25);
  });

  it('should return null for non-weight barcode', () => {
    expect(parseWeightedBarcode('7891234567890')).toBeNull();
  });

  it('should return null for wrong length', () => {
    expect(parseWeightedBarcode('200123015')).toBeNull();
  });
});

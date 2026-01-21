/**
 * @file utils.test.ts - Tests for utility functions
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  cn,
  formatCurrency,
  formatQuantity,
  formatDate,
  formatDateTime,
  calculateMargin,
  generateId,
  debounce,
  isValidEAN13,
  parseWeightedBarcode,
} from '../utils';

describe('cn', () => {
  it('should merge class names', () => {
    const result = cn('class1', 'class2');
    expect(result).toContain('class1');
    expect(result).toContain('class2');
  });

  it('should handle conditional classes', () => {
    const isHidden = false;
    const isVisible = true;
    const result = cn('base', isHidden && 'hidden', isVisible && 'visible');
    expect(result).toContain('base');
    expect(result).toContain('visible');
    expect(result).not.toContain('hidden');
  });

  it('should merge tailwind classes correctly', () => {
    const result = cn('p-4', 'p-2');
    expect(result).toBe('p-2');
  });
});

describe('formatCurrency', () => {
  it('should format positive values', () => {
    expect(formatCurrency(100)).toMatch(/R\$\s*100,00/);
  });

  it('should format decimal values', () => {
    expect(formatCurrency(99.99)).toMatch(/R\$\s*99,99/);
  });

  it('should format zero', () => {
    expect(formatCurrency(0)).toMatch(/R\$\s*0,00/);
  });

  it('should format negative values', () => {
    expect(formatCurrency(-50)).toMatch(/-?\s*R\$\s*50,00/);
  });

  it('should format large values', () => {
    expect(formatCurrency(1000000)).toMatch(/R\$\s*1\.000\.000,00/);
  });
});

describe('formatQuantity', () => {
  it('should format unit quantities', () => {
    expect(formatQuantity(5, 'un')).toBe('5 un');
  });

  it('should format KG quantities with decimals', () => {
    expect(formatQuantity(1.5, 'KG')).toBe('1.500 kg');
  });

  it('should format KILOGRAM same as KG', () => {
    expect(formatQuantity(2.5, 'KILOGRAM')).toBe('2.500 kg');
  });

  it('should format GRAM quantities', () => {
    expect(formatQuantity(500, 'GRAM')).toBe('500 g');
  });

  it('should format LITER quantities', () => {
    expect(formatQuantity(1.5, 'LITER')).toBe('1.500 L');
  });

  it('should format MILLILITER quantities', () => {
    expect(formatQuantity(250, 'MILLILITER')).toBe('250 mL');
  });
});

describe('formatDate', () => {
  it('should format Date object', () => {
    const date = new Date('2024-01-15T12:00:00');
    const result = formatDate(date);
    // Just check it contains the date parts
    expect(result).toContain('2024');
  });

  it('should format ISO string', () => {
    const result = formatDate('2024-12-25T00:00:00Z');
    // Just check it contains the year
    expect(result).toContain('2024');
  });
});

describe('formatDateTime', () => {
  it('should format Date with time', () => {
    const date = new Date('2024-01-15T14:30:00');
    const result = formatDateTime(date);
    expect(result).toMatch(/15\/01\/2024/);
    expect(result).toMatch(/14:30/);
  });
});

describe('calculateMargin', () => {
  it('should calculate positive margin', () => {
    // Cost: 50, Sale: 100 => 100% margin
    expect(calculateMargin(100, 50)).toBe(100);
  });

  it('should calculate fractional margin', () => {
    // Cost: 80, Sale: 100 => 25% margin
    expect(calculateMargin(100, 80)).toBe(25);
  });

  it('should return 100 for zero cost', () => {
    expect(calculateMargin(100, 0)).toBe(100);
  });

  it('should handle negative margin', () => {
    // Cost: 100, Sale: 80 => -20% margin
    expect(calculateMargin(80, 100)).toBe(-20);
  });
});

describe('generateId', () => {
  it('should generate a UUID string', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBe(36);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('should generate unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
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
    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should only call function once for rapid calls', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    debouncedFn();
    debouncedFn();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should pass arguments to function', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn('arg1', 'arg2');
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });
});

describe('isValidEAN13', () => {
  it('should return true for valid EAN-13', () => {
    // Valid EAN-13: 5901234123457
    expect(isValidEAN13('5901234123457')).toBe(true);
  });

  it('should return false for invalid check digit', () => {
    expect(isValidEAN13('5901234123458')).toBe(false);
  });

  it('should return false for wrong length', () => {
    expect(isValidEAN13('123456789')).toBe(false);
    expect(isValidEAN13('12345678901234')).toBe(false);
  });

  it('should return false for non-numeric', () => {
    expect(isValidEAN13('590123412345A')).toBe(false);
  });
});

describe('parseWeightedBarcode', () => {
  it('should parse valid weighted barcode', () => {
    // 2 + product(5) + weight(5) + check(1)
    const result = parseWeightedBarcode('2123451234560');
    expect(result).not.toBeNull();
    expect(result?.productCode).toBe('12345');
    // Weight is parseInt('12345') / 1000 = 12.345
    expect(result?.weight).toBe(12.345);
  });

  it('should return null for non-weighted barcode', () => {
    expect(parseWeightedBarcode('5901234123457')).toBeNull();
  });

  it('should return null for wrong length', () => {
    expect(parseWeightedBarcode('212345')).toBeNull();
  });
});

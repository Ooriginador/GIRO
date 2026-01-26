/**
 * @file export.test.ts
 * @description Testes para funções de exportação
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { exportToCSV, exportToExcel, exportFormatters, type ExportColumn } from '../export';

// Mock URL for jsdom
beforeAll(() => {
  global.URL.createObjectURL = vi.fn(() => 'blob:test');
  global.URL.revokeObjectURL = vi.fn();
});

afterAll(() => {
  vi.restoreAllMocks();
});

interface TestProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  isActive: boolean;
  createdAt: Date;
}

const testData: TestProduct[] = [
  {
    id: '1',
    name: 'Produto A',
    price: 29.9,
    stock: 100,
    isActive: true,
    createdAt: new Date('2026-01-01'),
  },
  {
    id: '2',
    name: 'Produto B',
    price: 49.9,
    stock: 50,
    isActive: false,
    createdAt: new Date('2026-01-15'),
  },
];

const testColumns: ExportColumn<TestProduct>[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'Nome' },
  { key: 'price', header: 'Preço', formatter: exportFormatters.currency },
  { key: 'stock', header: 'Estoque' },
  { key: 'isActive', header: 'Ativo', formatter: exportFormatters.yesNo },
];

describe('Export Functions', () => {
  describe('exportToCSV', () => {
    it('should create a CSV file download without errors', () => {
      expect(() =>
        exportToCSV(testData, testColumns, {
          filename: 'test-export',
          title: 'Test Export',
        })
      ).not.toThrow();
    });

    it('should handle empty data without errors', () => {
      expect(() =>
        exportToCSV([], testColumns, {
          filename: 'empty-export',
        })
      ).not.toThrow();
    });
  });

  describe('exportToExcel', () => {
    it('should create an Excel file download without errors', () => {
      expect(() =>
        exportToExcel(testData, testColumns, {
          filename: 'test-excel',
          title: 'Test Excel Export',
          companyName: 'Test Company',
        })
      ).not.toThrow();
    });
  });

  describe('exportFormatters', () => {
    it('currency should format as BRL', () => {
      const result = exportFormatters.currency(1234.56);
      // Check for BRL format (R$ or just the number format)
      expect(result).toMatch(/1\.234,56/);
    });

    it('percent should format with % sign', () => {
      expect(exportFormatters.percent(75.5)).toBe('75.5%');
    });

    it('yesNo should return Sim/Não', () => {
      expect(exportFormatters.yesNo(true)).toBe('Sim');
      expect(exportFormatters.yesNo(false)).toBe('Não');
    });

    it('activeInactive should return Ativo/Inativo', () => {
      expect(exportFormatters.activeInactive(true)).toBe('Ativo');
      expect(exportFormatters.activeInactive(false)).toBe('Inativo');
    });

    it('integer should format without decimals', () => {
      const result = exportFormatters.integer(1234.56);
      expect(result).toMatch(/1\.235/);
    });

    it('date should format as dd/MM/yyyy', () => {
      const result = exportFormatters.date(new Date('2026-01-15T12:00:00'));
      expect(result).toBe('15/01/2026');
    });

    it('datetime should format as dd/MM/yyyy HH:mm', () => {
      const result = exportFormatters.datetime(new Date('2026-01-15T14:30:00'));
      expect(result).toContain('15/01/2026');
    });

    it('should handle null/undefined gracefully', () => {
      expect(exportFormatters.date(null)).toBe('');
      expect(exportFormatters.datetime(undefined)).toBe('');
    });
  });
});

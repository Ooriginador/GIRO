/**
 * @file scanner.mock.test.ts - Testes para o mock de scanner de código de barras
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MockScanner, createMockScanner } from '../../mocks/scanner.mock';

describe('MockScanner', () => {
  let scanner: MockScanner;

  beforeEach(() => {
    scanner = createMockScanner();
  });

  describe('basic operations', () => {
    it('should create an empty scanner', () => {
      expect(scanner.getScanHistory()).toHaveLength(0);
      expect(scanner.checkConnection()).toBe(true);
    });

    it('should simulate scan and notify callbacks', () => {
      const callback = vi.fn();
      scanner.onScan(callback);

      scanner.simulateScan('7891234567890');

      expect(callback).toHaveBeenCalledWith('7891234567890');
      expect(scanner.getScanCount()).toBe(1);
    });

    it('should store scan history', () => {
      scanner.simulateScan('7891234567890');
      scanner.simulateScan('7898357410015');

      expect(scanner.getScanHistory()).toEqual(['7891234567890', '7898357410015']);
      expect(scanner.getLastScan()).toBe('7898357410015');
    });

    it('should reset scanner', () => {
      const callback = vi.fn();
      scanner.onScan(callback);
      scanner.simulateScan('7891234567890');

      scanner.reset();

      expect(scanner.getScanHistory()).toHaveLength(0);
      expect(scanner.checkConnection()).toBe(true);

      // Old callbacks should be removed
      scanner.simulateScan('7891234567890');
      expect(callback).toHaveBeenCalledTimes(1); // Only the first call
    });
  });

  describe('callbacks', () => {
    it('should support multiple callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      scanner.onScan(callback1);
      scanner.onScan(callback2);

      scanner.simulateScan('7891234567890');

      expect(callback1).toHaveBeenCalledWith('7891234567890');
      expect(callback2).toHaveBeenCalledWith('7891234567890');
    });

    it('should allow unsubscribing callbacks', () => {
      const callback = vi.fn();
      const unsubscribe = scanner.onScan(callback);

      scanner.simulateScan('7891234567890');
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();

      scanner.simulateScan('7898357410015');
      expect(callback).toHaveBeenCalledTimes(1); // Still 1, not called again
    });
  });

  describe('connection', () => {
    it('should be connected by default', () => {
      expect(scanner.checkConnection()).toBe(true);
    });

    it('should not scan when disconnected', () => {
      const callback = vi.fn();
      scanner.onScan(callback);

      scanner.setConnected(false);
      scanner.simulateScan('7891234567890');

      expect(callback).not.toHaveBeenCalled();
      expect(scanner.getScanCount()).toBe(0);
    });
  });

  describe('barcode generation', () => {
    it('should generate valid EAN-13', () => {
      const barcode = MockScanner.generateEAN13();

      expect(barcode).toHaveLength(13);
      expect(barcode).toMatch(/^\d{13}$/);

      // Validate check digit
      const digits = barcode.split('').map(Number);
      const checkSum = digits
        .slice(0, 12)
        .reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
      const expectedCheck = (10 - (checkSum % 10)) % 10;

      expect(digits[12]).toBe(expectedCheck);
    });

    it('should generate unique EAN-13 barcodes', () => {
      const barcodes = new Set<string>();

      for (let i = 0; i < 100; i++) {
        barcodes.add(MockScanner.generateEAN13());
      }

      // Should have generated mostly unique barcodes
      expect(barcodes.size).toBeGreaterThan(90);
    });

    it('should generate weight code for weighted products', () => {
      const code = MockScanner.generateWeightCode('00123', 1.5);

      expect(code).toHaveLength(13);
      expect(code).toMatch(/^2\d{12}$/);
      expect(code.startsWith('2')).toBe(true); // Prefix 2 for weighted items
      expect(code.substring(1, 7)).toBe('000123'); // Product code (6 digits)
    });

    it('should handle different weight formats', () => {
      // 1.5 kg = 1500g (code starts at position 7)
      const code1 = MockScanner.generateWeightCode('00001', 1.5);
      expect(code1.substring(7, 12)).toBe('01500');

      // 0.25 kg = 250g
      const code2 = MockScanner.generateWeightCode('00002', 0.25);
      expect(code2.substring(7, 12)).toBe('00250');
    });
  });

  describe('PDV scenarios', () => {
    it('should simulate rapid scanning', async () => {
      const scans: string[] = [];
      scanner.onScan((barcode) => scans.push(barcode));

      // Simulate rapid scanning
      scanner.simulateScan('7891234567890');
      scanner.simulateScan('7898357410015');
      scanner.simulateScan('7891234567890'); // Same item again

      expect(scans).toEqual(['7891234567890', '7898357410015', '7891234567890']);
    });

    it('should handle product lookup after scan', async () => {
      const products = new Map([
        ['7891234567890', { id: '1', name: 'Arroz 5kg', price: 24.9 }],
        ['7898357410015', { id: '2', name: 'Feijão 1kg', price: 8.9 }],
      ]);

      const cart: Array<{ name: string; price: number }> = [];

      scanner.onScan((barcode) => {
        const product = products.get(barcode);
        if (product) {
          cart.push({ name: product.name, price: product.price });
        }
      });

      scanner.simulateScan('7891234567890');
      scanner.simulateScan('7898357410015');

      expect(cart).toHaveLength(2);
      expect(cart[0]?.name).toBe('Arroz 5kg');
      expect(cart[1]?.name).toBe('Feijão 1kg');
    });

    it('should handle unknown barcode', () => {
      const unknownBarcodes: string[] = [];
      const products = new Map([['7891234567890', { id: '1', name: 'Arroz' }]]);

      scanner.onScan((barcode) => {
        if (!products.has(barcode)) {
          unknownBarcodes.push(barcode);
        }
      });

      scanner.simulateScan('9999999999999'); // Unknown

      expect(unknownBarcodes).toContain('9999999999999');
    });
  });
});

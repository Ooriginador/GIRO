/**
 * @file printer.mock.test.ts - Testes para o mock de impressora térmica
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { MockPrinter, createMockPrinter } from '../../mocks/printer.mock';

describe('MockPrinter', () => {
  let printer: MockPrinter;

  beforeEach(() => {
    printer = createMockPrinter();
  });

  describe('basic operations', () => {
    it('should create an empty printer', () => {
      expect(printer.getBuffer().length).toBe(0);
      expect(printer.getPrintCount()).toBe(0);
    });

    it('should print data to buffer', () => {
      const data = new Uint8Array([65, 66, 67]); // ABC
      printer.print(data);

      expect(printer.getBuffer().length).toBe(3);
      expect(printer.getBufferAsString()).toBe('ABC');
      expect(printer.getPrintCount()).toBe(1);
    });

    it('should accumulate multiple prints', () => {
      printer.print(new Uint8Array([65, 66])); // AB
      printer.print(new Uint8Array([67, 68])); // CD

      expect(printer.getBufferAsString()).toBe('ABCD');
      expect(printer.getPrintCount()).toBe(2);
    });

    it('should reset buffer', () => {
      printer.print(new Uint8Array([65, 66, 67]));
      printer.reset();

      expect(printer.getBuffer().length).toBe(0);
      expect(printer.getPrintCount()).toBe(0);
    });
  });

  describe('text detection', () => {
    it('should detect text in buffer', () => {
      const text = 'Hello World';
      const data = new Uint8Array(text.split('').map((c) => c.charCodeAt(0)));
      printer.print(data);

      expect(printer.containsText('Hello')).toBe(true);
      expect(printer.containsText('World')).toBe(true);
      expect(printer.containsText('Goodbye')).toBe(false);
    });

    it('should filter non-printable characters', () => {
      // Mix of printable and non-printable
      const data = new Uint8Array([0x1b, 65, 66, 0x00, 67]);
      printer.print(data);

      expect(printer.getBufferAsString()).toBe('ABC');
    });
  });

  describe('ESC/POS command detection', () => {
    it('should detect init command', () => {
      // ESC @ (initialize printer)
      printer.print(new Uint8Array([0x1b, 0x40]));

      expect(printer.hasInitCommand()).toBe(true);
    });

    it('should detect cut command', () => {
      // GS V (cut paper)
      printer.print(new Uint8Array([0x1d, 0x56, 0x00]));

      expect(printer.hasCutCommand()).toBe(true);
    });

    it('should detect drawer command', () => {
      // ESC p (open drawer)
      printer.print(new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]));

      expect(printer.hasDrawerCommand()).toBe(true);
    });

    it('should detect bold on command', () => {
      // ESC E 1 (bold on)
      printer.print(new Uint8Array([0x1b, 0x45, 0x01]));

      expect(printer.hasBoldOn()).toBe(true);
    });

    it('should detect center align command', () => {
      // ESC a 1 (center align)
      printer.print(new Uint8Array([0x1b, 0x61, 0x01]));

      expect(printer.hasCenterAlign()).toBe(true);
    });

    it('should detect custom command sequence', () => {
      const customCommand = [0x1b, 0x40, 0x1b, 0x61, 0x01];
      printer.print(new Uint8Array(customCommand));

      expect(printer.containsCommand([0x1b, 0x40])).toBe(true);
      expect(printer.containsCommand([0x1b, 0x61, 0x01])).toBe(true);
      expect(printer.containsCommand([0x1d, 0x56])).toBe(false);
    });
  });

  describe('receipt simulation', () => {
    it('should simulate full receipt printing', () => {
      // Init
      printer.print(new Uint8Array([0x1b, 0x40]));

      // Center align
      printer.print(new Uint8Array([0x1b, 0x61, 0x01]));

      // Bold on
      printer.print(new Uint8Array([0x1b, 0x45, 0x01]));

      // Store name
      const storeName = 'MERCEARIAS GIRO';
      printer.print(new Uint8Array(storeName.split('').map((c) => c.charCodeAt(0))));

      // Bold off
      printer.print(new Uint8Array([0x1b, 0x45, 0x00]));

      // Cut
      printer.print(new Uint8Array([0x1d, 0x56, 0x00]));

      // Open drawer
      printer.print(new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]));

      expect(printer.hasInitCommand()).toBe(true);
      expect(printer.hasCenterAlign()).toBe(true);
      expect(printer.hasBoldOn()).toBe(true);
      expect(printer.containsText('MERCEARIAS GIRO')).toBe(true);
      expect(printer.hasCutCommand()).toBe(true);
      expect(printer.hasDrawerCommand()).toBe(true);
    });
  });
});

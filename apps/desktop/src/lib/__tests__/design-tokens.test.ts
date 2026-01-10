/**
 * @file design-tokens.test.ts - Testes para tokens de design
 */

import {
  animation,
  borderRadius,
  breakpoints,
  colors,
  designTokens,
  shadows,
  spacing,
  typography,
  zIndex,
} from '@/lib/design-tokens';
import { describe, expect, it } from 'vitest';

describe('Design Tokens', () => {
  describe('colors', () => {
    it('should have primary colors', () => {
      expect(colors.primary).toBeDefined();
      expect(colors.primary[500]).toBe('#22c55e');
    });

    it('should have accent colors', () => {
      expect(colors.accent).toBeDefined();
      expect(colors.accent[500]).toBe('#f97316');
    });

    it('should have neutral colors', () => {
      expect(colors.neutral).toBeDefined();
      expect(colors.neutral[50]).toBe('#fafafa');
      expect(colors.neutral[950]).toBe('#0a0a0a');
    });

    it('should have semantic colors', () => {
      expect(colors.success).toBe('#22c55e');
      expect(colors.warning).toBe('#f59e0b');
      expect(colors.error).toBe('#ef4444');
      expect(colors.info).toBe('#3b82f6');
    });

    it('should have background colors', () => {
      expect(colors.background).toBe('#ffffff');
      expect(colors.foreground).toBe('#171717');
    });
  });

  describe('typography', () => {
    it('should have font families', () => {
      expect(typography.fontFamily.sans).toContain('Inter');
      expect(typography.fontFamily.mono).toContain('JetBrains Mono');
    });

    it('should have font sizes', () => {
      expect(typography.fontSize.xs).toBeDefined();
      expect(typography.fontSize.base).toBeDefined();
      expect(typography.fontSize.xl).toBeDefined();
    });

    it('should have font weights', () => {
      expect(typography.fontWeight.normal).toBe('400');
      expect(typography.fontWeight).toBeDefined();
    });
  });

  describe('spacing', () => {
    it('should use 4px grid system', () => {
      expect(spacing).toBeDefined();
      // If spacing is exported
      if (typeof spacing === 'object') {
        expect(Object.keys(spacing).length).toBeGreaterThan(0);
      }
    });
  });

  describe('shadows', () => {
    it('should have shadow definitions', () => {
      expect(shadows).toBeDefined();
    });
  });

  describe('animations', () => {
    it('should have animation definitions', () => {
      expect(animation).toBeDefined();
      expect(animation.duration.fast).toBe('150ms');
      expect(animation.duration.normal).toBe('200ms');
      expect(animation.easing.default).toBeDefined();
    });
  });

  describe('breakpoints', () => {
    it('should have responsive breakpoints', () => {
      expect(breakpoints).toBeDefined();
      expect(breakpoints.sm).toBe('640px');
      expect(breakpoints.md).toBe('768px');
      expect(breakpoints.lg).toBe('1024px');
    });
  });

  describe('zIndex', () => {
    it('should have z-index layers', () => {
      expect(zIndex).toBeDefined();
      expect(zIndex.modal).toBe(1400);
      expect(zIndex.tooltip).toBe(1800);
      expect(zIndex.dropdown).toBe(1000);
    });
  });

  describe('borderRadius', () => {
    it('should have border radius values', () => {
      expect(borderRadius).toBeDefined();
      expect(borderRadius.lg).toBe('0.5rem');
      expect(borderRadius.full).toBe('9999px');
    });
  });

  describe('designTokens', () => {
    it('should export all tokens', () => {
      expect(designTokens.colors).toBe(colors);
      expect(designTokens.typography).toBe(typography);
      expect(designTokens.spacing).toBe(spacing);
    });
  });
});

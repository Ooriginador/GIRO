/**
 * @file usePriceHistory.test.tsx - Testes para hooks de histórico de preços
 */

import {
  calculatePriceChange,
  formatPriceChange,
  usePriceHistoryByProduct,
  useRecentPriceHistory,
} from '@/hooks/usePriceHistory';
import { createWrapper } from '@/test/test-utils';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock do Tauri
vi.mock('@/lib/tauri', () => ({
  getPriceHistoryByProduct: vi.fn(),
  getRecentPriceHistory: vi.fn(),
}));

const { getPriceHistoryByProduct, getRecentPriceHistory } = await import('@/lib/tauri');

describe('Price History Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('usePriceHistoryByProduct', () => {
    it('should fetch price history for a product', async () => {
      const mockHistory = [
        { id: '1', productId: 'prod-1', oldPrice: 10, newPrice: 12, createdAt: '2024-01-01' },
        { id: '2', productId: 'prod-1', oldPrice: 12, newPrice: 15, createdAt: '2024-01-15' },
      ];

      vi.mocked(getPriceHistoryByProduct).mockResolvedValue(mockHistory);

      const { result } = renderHook(() => usePriceHistoryByProduct('prod-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockHistory);
      expect(getPriceHistoryByProduct).toHaveBeenCalledWith('prod-1');
    });

    it('should not fetch when productId is empty', async () => {
      const { result } = renderHook(() => usePriceHistoryByProduct(''), {
        wrapper: createWrapper(),
      });

      // Wait a tick
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(result.current.isFetching).toBe(false);
      expect(getPriceHistoryByProduct).not.toHaveBeenCalled();
    });

    it('should return empty array when no history exists', async () => {
      vi.mocked(getPriceHistoryByProduct).mockResolvedValue([]);

      const { result } = renderHook(() => usePriceHistoryByProduct('prod-new'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useRecentPriceHistory', () => {
    it('should fetch recent price history', async () => {
      const mockHistory = [
        {
          id: '1',
          productId: 'prod-1',
          productName: 'Arroz 5kg',
          oldPrice: 20,
          newPrice: 24.9,
          createdAt: '2024-01-20',
        },
      ];

      vi.mocked(getRecentPriceHistory).mockResolvedValue(mockHistory);

      const { result } = renderHook(() => useRecentPriceHistory(10), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockHistory);
      expect(getRecentPriceHistory).toHaveBeenCalledWith(10);
    });

    it('should use default limit when not specified', async () => {
      vi.mocked(getRecentPriceHistory).mockResolvedValue([]);

      const { result } = renderHook(() => useRecentPriceHistory(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(getRecentPriceHistory).toHaveBeenCalledWith(undefined);
    });
  });
});

describe('Price History Helpers', () => {
  describe('calculatePriceChange', () => {
    it('should calculate positive price change', () => {
      const change = calculatePriceChange(100, 120);
      expect(change).toBe(20);
    });

    it('should calculate negative price change', () => {
      const change = calculatePriceChange(100, 80);
      expect(change).toBe(-20);
    });

    it('should return 0 when old price is 0', () => {
      const change = calculatePriceChange(0, 50);
      expect(change).toBe(0);
    });

    it('should return 0 when prices are equal', () => {
      const change = calculatePriceChange(50, 50);
      expect(change).toBe(0);
    });

    it('should handle decimal prices', () => {
      const change = calculatePriceChange(10, 12.5);
      expect(change).toBe(25);
    });
  });

  describe('formatPriceChange', () => {
    it('should format positive change with plus sign', () => {
      const formatted = formatPriceChange(100, 125);
      expect(formatted).toBe('+25.0%');
    });

    it('should format negative change with minus sign', () => {
      const formatted = formatPriceChange(100, 75);
      expect(formatted).toBe('-25.0%');
    });

    it('should format zero change', () => {
      const formatted = formatPriceChange(100, 100);
      expect(formatted).toBe('+0.0%');
    });

    it('should format small decimal changes', () => {
      const formatted = formatPriceChange(100, 101.5);
      expect(formatted).toBe('+1.5%');
    });
  });
});

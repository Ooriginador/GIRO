import { useProductCompatibility, useVehicles } from '@/hooks/useVehicles';
import { invoke } from '@/lib/tauri';
import { createQueryWrapper } from '@/test/queryWrapper';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock do Tauri
vi.mock('@/lib/tauri', () => ({
  invoke: vi.fn(),
}));

const { Wrapper: queryWrapper } = createQueryWrapper();

describe('useVehicles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load vehicle brands', async () => {
    const mockBrands = [{ id: 'b-1', name: 'Honda' }];
    vi.mocked(invoke).mockResolvedValue(mockBrands);
    const { result } = renderHook(() => useVehicles(), { wrapper: queryWrapper });
    await waitFor(() => expect(result.current.brands).toEqual(mockBrands));
    expect(invoke).toHaveBeenCalledWith('get_vehicle_brands');
  });

  it('should search vehicles', async () => {
    const mockResults = [{ yearId: 'v1', displayName: 'Honda CG 160 2023' }];
    vi.mocked(invoke).mockResolvedValue(mockResults);

    const { result } = renderHook(() => useVehicles(), { wrapper: queryWrapper });

    let found;
    await act(async () => {
      found = await result.current.searchVehicles('honda');
    });

    expect(found).toEqual(mockResults);
    expect(invoke).toHaveBeenCalledWith('search_vehicles', { query: 'honda' });
  });

  it('should reset state', async () => {
    const { result } = renderHook(() => useVehicles(), { wrapper: queryWrapper });

    act(() => {
      result.current.reset();
    });

    expect(result.current.selectedBrand).toBeNull();
    expect(result.current.selectedModel).toBeNull();
    expect(result.current.selectedYear).toBeNull();
  });
});

describe('useProductCompatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCompat = {
    vehicleYearId: 'v1',
    vehicle: { id: 'v1', displayName: 'Honda CG 160' },
  };

  it('should load compatibilities on mount', async () => {
    vi.mocked(invoke).mockResolvedValue([mockCompat]);
    const { result } = renderHook(() => useProductCompatibility('p1'), { wrapper: queryWrapper });

    await waitFor(() => {
      expect(result.current.compatibilities).toHaveLength(1);
    });
    expect(invoke).toHaveBeenCalledWith('get_product_compatibilities', { productId: 'p1' });
  });

  it('should add/remove compatibility locally', async () => {
    vi.mocked(invoke).mockResolvedValue([]);
    const { result } = renderHook(() => useProductCompatibility('p1'), { wrapper: queryWrapper });

    // Esperar primeiro carregamento (vazio)
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.addCompatibility({ yearId: 'v2', displayName: 'Yamaha FZ25' } as any);
    });

    expect(result.current.compatibilities).toHaveLength(1);
    expect(result.current.hasChanges).toBe(true);

    await act(async () => {
      result.current.removeCompatibility('v2');
    });
    expect(result.current.compatibilities).toHaveLength(0);
  });

  it('should save changes', async () => {
    vi.mocked(invoke).mockImplementation(async (cmd) => {
      if (cmd === 'get_product_compatibilities') return [];
      if (cmd === 'save_product_compatibilities') return true;
      return [];
    });

    const { result } = renderHook(() => useProductCompatibility('p1'), { wrapper: queryWrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.addCompatibility({ yearId: 'v2', displayName: 'Yamaha FZ25' } as any);
    });

    await act(async () => {
      await result.current.saveChanges();
    });

    expect(invoke).toHaveBeenCalledWith(
      'save_product_compatibilities',
      expect.objectContaining({
        productId: 'p1',
        compatibilities: [expect.objectContaining({ vehicleYearId: 'v2' })],
      })
    );
  });
});

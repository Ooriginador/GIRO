import { useWarranties, WarrantyUtils } from '@/hooks/useWarranties';
import { invoke } from '@/lib/tauri';
import { createQueryWrapperWithClient } from '@/test/queryWrapper';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Mock do Tauri
vi.mock('@/lib/tauri', () => ({
  invoke: vi.fn(),
}));

const { Wrapper: queryWrapper } = createQueryWrapperWithClient();

describe('useWarranties', () => {
  it('should load active warranties', async () => {
    const mockWarranties = [{ id: 'w-1', customerName: 'João Silva', status: 'OPEN' }];
    vi.mocked(invoke).mockResolvedValue(mockWarranties);

    const { result } = renderHook(() => useWarranties(), {
      wrapper: queryWrapper,
    });

    await waitFor(() => {
      expect(result.current.activeWarranties).toEqual(mockWarranties);
    });

    expect(invoke).toHaveBeenCalledWith('get_active_warranties');
  });

  it('should approve a warranty claim', async () => {
    vi.mocked(invoke).mockResolvedValue({ id: 'w-1', status: 'APPROVED' });

    const { result } = renderHook(() => useWarranties(), {
      wrapper: queryWrapper,
    });

    await act(async () => {
      await result.current.approveWarranty.mutateAsync({ id: 'w-1', employeeId: 'emp-1' });
    });

    expect(invoke).toHaveBeenCalledWith('approve_warranty', { id: 'w-1', employeeId: 'emp-1' });
  });

  it('should deny a warranty claim', async () => {
    vi.mocked(invoke).mockResolvedValue({ id: 'w-1', status: 'DENIED' });

    const { result } = renderHook(() => useWarranties(), {
      wrapper: queryWrapper,
    });

    await act(async () => {
      await result.current.denyWarranty.mutateAsync({
        id: 'w-1',
        employeeId: 'emp-1',
        reason: 'Abuse',
      });
    });

    expect(invoke).toHaveBeenCalledWith('deny_warranty', {
      id: 'w-1',
      employeeId: 'emp-1',
      reason: 'Abuse',
    });
  });

  it('should update a warranty claim', async () => {
    vi.mocked(invoke).mockResolvedValue({ id: 'w-1', status: 'OPEN' });

    const { result } = renderHook(() => useWarranties(), {
      wrapper: queryWrapper,
    });

    await act(async () => {
      await result.current.updateWarranty.mutateAsync({
        id: 'w-1',
        input: { symptoms: 'Updated' } as any,
      });
    });

    expect(invoke).toHaveBeenCalledWith('update_warranty_claim', {
      id: 'w-1',
      symptoms: 'Updated',
    });
  });

  it('should resolve a warranty claim', async () => {
    vi.mocked(invoke).mockResolvedValue({ id: 'w-1', status: 'CLOSED' });

    const { result } = renderHook(() => useWarranties(), {
      wrapper: queryWrapper,
    });

    await act(async () => {
      await result.current.resolveWarranty.mutateAsync({
        id: 'w-1',
        input: {
          employeeId: 'emp-1',
          resolutionType: 'REPLACEMENT',
          resolutionNotes: 'Done',
        } as any,
      });
    });

    expect(invoke).toHaveBeenCalledWith('resolve_warranty', {
      id: 'w-1',
      employeeId: 'emp-1',
      resolutionType: 'REPLACEMENT',
      resolutionNotes: 'Done',
    });
  });

  it('should return correct labels from WarrantyUtils', () => {
    expect(WarrantyUtils.getStatusLabel('OPEN')).toBe('Aberta');
    expect(WarrantyUtils.getStatusColor('APPROVED')).toBe('text-green-600');
    expect(WarrantyUtils.getResolutionTypeLabel('REPAIR')).toBe('Reparo');
  });
});

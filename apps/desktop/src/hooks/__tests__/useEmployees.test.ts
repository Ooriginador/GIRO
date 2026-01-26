import * as tauri from '@/lib/tauri';
import { createQueryWrapperWithClient } from '@/test/queryWrapper';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useCreateEmployee,
  useDeactivateEmployee,
  useEmployees,
  useInactiveEmployees,
  useReactivateEmployee,
  useUpdateEmployee,
} from '../useEmployees';

// Mock all exports from @/lib/tauri
vi.mock('@/lib/tauri', () => ({
  getEmployees: vi.fn(),
  getInactiveEmployees: vi.fn(),
  createEmployee: vi.fn(),
  updateEmployee: vi.fn(),
  deactivateEmployee: vi.fn(),
  reactivateEmployee: vi.fn(),
  invoke: vi.fn(),
}));

const queryWrapper = createQueryWrapperWithClient();

describe('useEmployees hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockEmployee = { id: '1', name: 'John Doe', role: 'ADMIN', isActive: true };

  it('useEmployees should fetch active employees', async () => {
    vi.mocked(tauri.getEmployees).mockResolvedValue([mockEmployee]);
    const { result } = renderHook(() => useEmployees(), { wrapper: queryWrapper.Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([mockEmployee]);
    expect(tauri.getEmployees).toHaveBeenCalled();
  });

  it('useInactiveEmployees should fetch inactive employees', async () => {
    vi.mocked(tauri.getInactiveEmployees).mockResolvedValue([mockEmployee]);
    const { result } = renderHook(() => useInactiveEmployees(), { wrapper: queryWrapper.Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(tauri.getInactiveEmployees).toHaveBeenCalled();
  });

  it('useCreateEmployee should call createEmployee', async () => {
    vi.mocked(tauri.createEmployee).mockResolvedValue(mockEmployee as any);
    const { result } = renderHook(() => useCreateEmployee(), { wrapper: queryWrapper.Wrapper });
    await result.current.mutateAsync({ name: 'New', role: 'CASHIER', pin: '1234', isActive: true });
    expect(tauri.createEmployee).toHaveBeenCalledWith(expect.objectContaining({ name: 'New' }));
  });

  it('useUpdateEmployee should call updateEmployee', async () => {
    vi.mocked(tauri.updateEmployee).mockResolvedValue(mockEmployee as any);
    const { result } = renderHook(() => useUpdateEmployee(), { wrapper: queryWrapper.Wrapper });
    await result.current.mutateAsync({ id: '1', data: { name: 'Updated' } });
    expect(tauri.updateEmployee).toHaveBeenCalledWith('1', { name: 'Updated' });
  });

  it('useDeactivateEmployee should call deactivateEmployee', async () => {
    vi.mocked(tauri.deactivateEmployee).mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeactivateEmployee(), { wrapper: queryWrapper.Wrapper });
    await result.current.mutateAsync('1');
    expect(tauri.deactivateEmployee).toHaveBeenCalledWith('1');
  });

  it('useReactivateEmployee should call reactivateEmployee', async () => {
    vi.mocked(tauri.reactivateEmployee).mockResolvedValue(mockEmployee as any);
    const { result } = renderHook(() => useReactivateEmployee(), { wrapper: queryWrapper.Wrapper });
    await result.current.mutateAsync('1');
    expect(tauri.reactivateEmployee).toHaveBeenCalledWith('1');
  });
});

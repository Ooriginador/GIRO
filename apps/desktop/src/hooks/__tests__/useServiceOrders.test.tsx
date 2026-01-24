import { useServiceOrderItems, useServiceOrders } from '@/hooks/useServiceOrders';
import { invoke } from '@/lib/tauri';
import { createQueryWrapper } from '@/test/queryWrapper';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock do Tauri
vi.mock('@/lib/tauri', () => ({
  invoke: vi.fn(),
}));

const { Wrapper: queryWrapper } = createQueryWrapper();

describe('useServiceOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockOrder = {
    id: 'os-1',
    order_number: 101,
    status: 'OPEN',
    customerName: 'João Silva',
    vehicleDisplayName: 'Honda CG 160',
    total: 150.0,
    isPaid: false,
    created_at: new Date().toISOString(),
  };

  it('should load open service orders', async () => {
    vi.mocked(invoke).mockResolvedValue([mockOrder]);

    const { result } = renderHook(() => useServiceOrders(), {
      wrapper: queryWrapper,
    });

    await waitFor(() => {
      expect(result.current.openOrders).toBeDefined();
    });

    expect(result.current.openOrders).toHaveLength(1);
    expect(invoke).toHaveBeenCalledWith('get_open_service_orders');
  });

  it('should create a service order', async () => {
    vi.mocked(invoke).mockResolvedValue(mockOrder);

    const { result } = renderHook(() => useServiceOrders(), {
      wrapper: queryWrapper,
    });

    const newOrder = await result.current.createOrder.mutateAsync({
      customer_id: 'cust-1',
      customer_vehicle_id: 'veh-1',
      vehicle_year_id: 'year-1',
      employee_id: 'emp-1',
      vehicle_km: 10000,
      status: 'QUOTE',
    });

    expect(newOrder.id).toBe('os-1');
    expect(invoke).toHaveBeenCalledWith('create_service_order', expect.any(Object));
  });

  it('should start service order', async () => {
    vi.mocked(invoke).mockResolvedValue({ ...mockOrder, status: 'IN_PROGRESS' });
    const { result } = renderHook(() => useServiceOrders(), { wrapper: queryWrapper });
    await result.current.startOrder.mutateAsync('os-1');
    expect(invoke).toHaveBeenCalledWith('start_service_order', { id: 'os-1' });
  });

  it('should complete service order', async () => {
    vi.mocked(invoke).mockResolvedValue({ ...mockOrder, status: 'COMPLETED' });
    const { result } = renderHook(() => useServiceOrders(), { wrapper: queryWrapper });
    await result.current.completeOrder.mutateAsync({ id: 'os-1', diagnosis: 'Revisão geral' });
    expect(invoke).toHaveBeenCalledWith('complete_service_order', {
      id: 'os-1',
      diagnosis: 'Revisão geral',
    });
  });

  it('should cancel service order', async () => {
    vi.mocked(invoke).mockResolvedValue({ ...mockOrder, status: 'CANCELED' });
    const { result } = renderHook(() => useServiceOrders(), { wrapper: queryWrapper });
    await result.current.cancelOrder.mutateAsync({ id: 'os-1', notes: 'Cliente desistiu' });
    expect(invoke).toHaveBeenCalledWith('cancel_service_order', {
      id: 'os-1',
      notes: 'Cliente desistiu',
    });
  });

  it('should deliver service order', async () => {
    vi.mocked(invoke).mockResolvedValue({ ...mockOrder, status: 'DELIVERED' });
    const { result } = renderHook(() => useServiceOrders(), { wrapper: queryWrapper });

    await result.current.deliverOrder.mutateAsync({
      id: 'os-1',
      payments: [{ method: 'CASH', amount: 150.0 }],
      amountPaid: 150.0,
      employeeId: 'emp-1',
      sessionId: 'sess-1',
    });

    expect(invoke).toHaveBeenCalledWith('finish_service_order', {
      id: 'os-1',
      payments: [{ method: 'CASH', amount: 150.0 }],
      amount_paid: 150.0,
      employee_id: 'emp-1',
      cash_session_id: 'sess-1',
    });
  });
});

describe('useServiceOrderItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add item', async () => {
    vi.mocked(invoke).mockResolvedValue({ id: 'item-1' });
    const { result } = renderHook(() => useServiceOrderItems('os-1'), { wrapper: queryWrapper });
    await result.current.addItem.mutateAsync({
      order_id: 'os-1',
      description: 'Óleo',
      quantity: 1,
      unit_price: 30,
      item_type: 'PART',
    });
    expect(invoke).toHaveBeenCalledWith('add_service_order_item', expect.any(Object));
  });

  it('should remove item', async () => {
    vi.mocked(invoke).mockResolvedValue(true);
    const { result } = renderHook(() => useServiceOrderItems('os-1'), { wrapper: queryWrapper });
    await result.current.removeItem.mutateAsync('item-1');
    expect(invoke).toHaveBeenCalledWith('remove_service_order_item', { itemId: 'item-1' });
  });
});

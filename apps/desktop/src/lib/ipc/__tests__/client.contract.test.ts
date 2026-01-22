import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { safeCreateSale, safeActivateLicense, safeGetHardwareId } from '../client';

describe('IPC client contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('safeCreateSale resolves with data directly', async () => {
    // New behavior: invoke returns data directly, no envelope
    (invoke as any).mockResolvedValueOnce({ id: 'sale-1' });

    const sale = await safeCreateSale({
      items: [{ productId: 'p1', quantity: 1, unitPrice: 10 }],
      paymentMethod: 'CASH',
      amountPaid: 10,
      employeeId: 'e1',
      cashSessionId: 's1',
    } as any);

    expect(sale).toEqual({ id: 'sale-1' });
    // Expect direct command call
    expect((invoke as any).mock.calls[0][0]).toBe('create_sale');
    expect((invoke as any).mock.calls[0][1]).toHaveProperty('input');
  });

  it('safeCreateSale throws on error', async () => {
    // New behavior: invoke rejects on error
    (invoke as any).mockRejectedValueOnce('backend error');

    await expect(
      safeCreateSale({
        items: [{ productId: 'p1', quantity: 1, unitPrice: 10 }],
        paymentMethod: 'CASH',
        amountPaid: 10,
        employeeId: 'e1',
        cashSessionId: 's1',
      } as any)
    ).rejects.toThrow('backend error');
  });

  it('safeGetHardwareId returns string directly', async () => {
    (invoke as any).mockResolvedValueOnce('HW-1234');
    const id = await safeGetHardwareId();
    expect(id).toBe('HW-1234');
    expect((invoke as any).mock.calls[0][0]).toBe('get_hardware_id');
  });
});

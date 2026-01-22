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

  it('safeCreateSale resolves when envelope ok', async () => {
    // (invoke as unknown as jest.Mock) = invoke as any; // Invalid assignment removed
    (invoke as any).mockResolvedValueOnce({ ok: true, data: { id: 'sale-1' } });

    const sale = await safeCreateSale({
      items: [{ productId: 'p1', quantity: 1, unitPrice: 10 }],
      paymentMethod: 'CASH',
      amountPaid: 10,
      employeeId: 'e1',
      cashSessionId: 's1',
    } as any);

    expect(sale).toEqual({ id: 'sale-1' });
    expect((invoke as any).mock.calls[0][0]).toBe('giro_invoke');
    expect((invoke as any).mock.calls[0][1]).toHaveProperty('cmd', 'create_sale');
  });

  it('safeCreateSale throws when envelope not ok', async () => {
    (invoke as any).mockResolvedValueOnce({ ok: false, error: 'bad' });

    await expect(
      safeCreateSale({
        items: [{ productId: 'p1', quantity: 1, unitPrice: 10 }],
        paymentMethod: 'CASH',
        amountPaid: 10,
        employeeId: 'e1',
        cashSessionId: 's1',
      } as any)
    ).rejects.toThrow('bad');
  });

  it('safeGetHardwareId returns string when ok', async () => {
    (invoke as any).mockResolvedValueOnce({ ok: true, data: 'HW-1234' });
    const id = await safeGetHardwareId();
    expect(id).toBe('HW-1234');
  });
});

import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

let invokeMock: ReturnType<typeof vi.fn>;
let client: typeof import('../client');

beforeAll(async () => {
  const tauri = await import('@tauri-apps/api/core');
  invokeMock = tauri.invoke as unknown as ReturnType<typeof vi.fn>;
  client = await import('../client');
});

describe('ipc client wrappers', () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it('calls activateLicense with licenseKey', async () => {
    invokeMock.mockResolvedValueOnce({ status: 'ok' });
    const res = await client.activateLicense('GIRO-TEST-KEY');
    expect(invokeMock).toHaveBeenCalledWith('activate_license', { licenseKey: 'GIRO-TEST-KEY' });
    expect(res).toEqual({ status: 'ok' });
  });

  it('calls openCashSession with input', async () => {
    const input = { employeeId: 'emp1', openingBalance: 100.0 };
    invokeMock.mockResolvedValueOnce({ ok: true, data: { id: 'sess1' } });
    const res = await client.openCashSession(input as any);
    expect(invokeMock).toHaveBeenCalledWith('open_cash_session', { input });
    expect(res.ok).toBe(true);
    expect(res.data).toEqual({ id: 'sess1' });
  });

  it('calls createSale with input', async () => {
    const sale = {
      items: [],
      paymentMethod: 'CASH',
      amountPaid: 0,
      employeeId: 'e1',
      cashSessionId: 's1',
    };
    invokeMock.mockResolvedValueOnce({ ok: true, data: { id: 'sale1' } });
    const res = await client.createSale(sale as any);
    expect(invokeMock).toHaveBeenCalledWith('create_sale', { input: sale });
    expect(res.ok).toBe(true);
    expect(res.data).toEqual({ id: 'sale1' });
  });

  it('calls printReceipt with receipt', async () => {
    const receipt = {
      companyName: 'X',
      companyAddress: 'Y',
      saleNumber: 1,
      operatorName: 'o',
      dateTime: 'now',
      items: [],
      subtotal: 0,
      discount: 0,
      total: 0,
      paymentMethod: 'CASH',
      amountPaid: 0,
      change: 0,
    };
    invokeMock.mockResolvedValueOnce({ ok: true });
    const res = await client.printReceipt(receipt as any);
    expect(invokeMock).toHaveBeenCalledWith('print_receipt', { receipt });
    expect(res.ok).toBe(true);
  });
});

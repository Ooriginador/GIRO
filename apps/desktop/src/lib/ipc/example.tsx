import { useState } from 'react';
import ipc from './client';

export function LicenseActivateExample() {
  const [status, setStatus] = useState<string | null>(null);

  async function onActivate() {
    try {
      const res = await ipc.safeActivateLicense('GIRO-XXXX-XXXX-XXXX');
      setStatus(`Result: ${JSON.stringify(res)}`);
    } catch (e: unknown) {
      setStatus(`Error: ${(e as Error).message}`);
    }
  }

  async function onGetHardwareId() {
    try {
      const id = await ipc.safeGetHardwareId();
      setStatus(`Hardware ID: ${id}`);
    } catch (e: unknown) {
      setStatus(`Error: ${(e as Error).message}`);
    }
  }

  async function onGetStored() {
    try {
      const store = await ipc.safeGetStoredLicense();
      setStatus(`Stored: ${JSON.stringify(store)}`);
    } catch (e: unknown) {
      setStatus(`Error: ${(e as Error).message}`);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onActivate}>Activate License</button>
        <button onClick={onGetHardwareId}>Get Hardware ID</button>
        <button onClick={onGetStored}>Get Stored License</button>
        <button
          onClick={async () => {
            try {
              const session = await ipc.safeOpenCashSession({
                employeeId: 'admin-1',
                openingBalance: 100,
                notes: 'Test',
              });
              setStatus(`Opened session: ${JSON.stringify(session)}`);
            } catch (e: unknown) {
              setStatus(`Error: ${(e as Error).message}`);
            }
          }}
        >
          Open Cash Session
        </button>
        <button
          onClick={async () => {
            try {
              const sale = await ipc.safeCreateSale({
                items: [{ productId: 'prod-1', quantity: 1, unitPrice: 10, discount: 0 }],
                paymentMethod: 'CASH',
                amountPaid: 10,
                employeeId: 'admin-1',
                cashSessionId: 'YOUR_SESSION_ID',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } as any);
              setStatus(`Created sale: ${JSON.stringify(sale)}`);
            } catch (e: unknown) {
              setStatus(`Error: ${(e as Error).message}`);
            }
          }}
        >
          Create Sale
        </button>
      </div>
      {status && <div style={{ marginTop: 8 }}>{status}</div>}
    </div>
  );
}

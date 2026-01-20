/* Lightweight License Server client for dashboard usage
   - Uses fetch and reads base URL from environment variable `VITE_LICENSE_SERVER_URL`.
   - Does NOT include API key; intended for public dashboard or server-to-server use with proper auth.
*/

import type {
  ActivateRequest,
  ActivateResponse,
  ValidateRequest,
  LicenseInfo,
  TransferRequest,
  MetricsPayload,
} from './types.generated';

const BASE = (import.meta.env.VITE_LICENSE_SERVER_URL as string) || 'https://license.example.com';

export async function activate(licenseKey: string, hardwareId: string): Promise<ActivateResponse> {
  const body: ActivateRequest = { licenseKey, hardwareId };
  const res = await fetch(`${BASE}/activate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`license activate failed: ${res.status}`);
  return (await res.json()) as ActivateResponse;
}

export async function validate(licenseKey: string, hardwareId: string): Promise<LicenseInfo> {
  const body: ValidateRequest = { licenseKey, hardwareId };
  const res = await fetch(`${BASE}/validate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`license validate failed: ${res.status}`);
  return (await res.json()) as LicenseInfo;
}

export async function transfer(
  licenseKey: string,
  targetHardwareId: string,
  adminToken: string
): Promise<{ success: boolean }> {
  const body: TransferRequest = { licenseKey, targetHardwareId };
  const res = await fetch(`${BASE}/transfer`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`license transfer failed: ${res.status}`);
  return (await res.json()) as { success: boolean };
}

export async function submitMetrics(
  licenseKey: string,
  payload: MetricsPayload,
  apiKey?: string
): Promise<number> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (apiKey) headers['x-api-key'] = apiKey;

  const res = await fetch(`${BASE}/metrics`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ licenseKey, metrics: payload }),
  });

  if (![200, 202, 204].includes(res.status))
    throw new Error(`metrics submit failed: ${res.status}`);
  return res.status;
}

export default { activate, validate, transfer, submitMetrics };

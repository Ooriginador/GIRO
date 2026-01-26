import { createLogger } from '@/lib/logger';
const log = createLogger('License');
/* Lightweight License Server client for dashboard usage
   - Uses Tauri IPC to communicate with backend
   - Backend handles direct communication with License Server
*/

import { invoke } from '@tauri-apps/api/core';
import type { components } from './types.generated';

export type ActivateResponse = components['schemas']['ActivateResponse'];
export type LicenseInfo = components['schemas']['LicenseInfo'];
export type MetricsPayload = components['schemas']['MetricsPayload'];

// Unused types but kept for reference/compatibility if needed
// type ActivateRequest = components['schemas']['ActivateRequest'];
// type ValidateRequest = components['schemas']['ValidateRequest'];
// type TransferRequest = components['schemas']['TransferRequest'];

export async function activate(licenseKey: string): Promise<ActivateResponse> {
  // hardwareId is handled by backend if not provided, but we keep signature for compatibility
  // The command expects 'license_key'
  return invoke<ActivateResponse>('activate_license', {
    licenseKey,
  });
}

export async function validate(licenseKey: string): Promise<LicenseInfo> {
  return invoke<LicenseInfo>('validate_license', {
    licenseKey,
  });
}

export async function transfer(
  licenseKey: string,
  targetHardwareId: string,
  adminToken: string
): Promise<{ success: boolean }> {
  // Transfer might not be fully implemented in backend commands yet based on audit
  // But strictly following "Centralize path", we should assume a command exists or create one.
  // Looking at license.rs, there is no explicit 'transfer' command exposed yet.
  // However, the instructions say "Remove direct HTTP calls".
  // If the backend doesn't support it, we should probably mark it or wrap it.
  // For now, I will comment this out or stub it if it's not in license.rs
  // REVIEW: license.rs does NOT have transfer_license.
  // Falling back to throw error for now to enforce backend usage,
  // or we need to add it to backend.
  // Suppressing unused vars logs
  log.debug('Transfer deprecated', licenseKey, targetHardwareId, adminToken);
  throw new Error('Transfer not yet implemented via Tauri backend');
}

export async function submitMetrics(
  licenseKey: string,
  payload: MetricsPayload,
  apiKey?: string
): Promise<number> {
  if (apiKey) console.warn('apiKey ignored in backend call', apiKey);
  await invoke('sync_metrics', {
    licenseKey,
    metrics: payload,
  });
  return 200;
}

export default { activate, validate, transfer, submitMetrics };

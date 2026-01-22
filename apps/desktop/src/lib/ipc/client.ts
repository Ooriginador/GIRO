import { invoke } from '@tauri-apps/api/core';
import type { CreateSale, CreateCashSession, Receipt } from './contracts';

// Re-export safe invoke wrapper if needed by other components, but effectively it's just tauri invoke now
export async function safeInvoke<T>(cmd: string, args?: unknown): Promise<T> {
  // Direct mapping to Tauri commands
  return invoke<T>(cmd, args as Record<string, unknown>);
}

export async function safeActivateLicense(licenseKey: string) {
  return invoke<unknown>('activate_license', { licenseKey });
}

export async function safeGetHardwareId() {
  return invoke<string>('get_hardware_id');
}

export async function safeGetStoredLicense() {
  return invoke<Record<string, unknown> | null>('get_stored_license');
}

export async function safeGetServerTime() {
  return invoke<string>('get_server_time');
}

export async function safeRestoreLicense() {
  return invoke<string | null>('restore_license');
}

export async function safeCreateSale(input: CreateSale) {
  return invoke<unknown>('create_sale', { input });
}

export async function safeOpenCashSession(input: CreateCashSession) {
  return invoke<unknown>('open_cash_session', { input });
}

export async function safePrintReceipt(receipt: Receipt) {
  // Hardware command structure: print_receipt(receipt: Receipt)
  return invoke<unknown>('print_receipt', { receipt });
}

// Legacy direct commands (kept for compatibility)
export async function activateLicense(licenseKey: string) {
  return safeActivateLicense(licenseKey);
}

export async function openCashSession(input: CreateCashSession) {
  return safeOpenCashSession(input);
}

export async function createSale(input: CreateSale) {
  return safeCreateSale(input);
}

export async function printReceipt(receipt: Receipt) {
  return safePrintReceipt(receipt);
}

export default {
  safeInvoke,
  safeActivateLicense,
  safeGetHardwareId,
  safeGetStoredLicense,
  safeGetServerTime,
  safeRestoreLicense,
  safeCreateSale,
  safeOpenCashSession,
  safePrintReceipt,
  activateLicense,
  openCashSession,
  createSale,
  printReceipt,
};

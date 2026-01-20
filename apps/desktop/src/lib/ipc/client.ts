import { invoke } from '@tauri-apps/api/tauri';
import { z } from 'zod';
import { InvokeResult as InvokeResultSchema } from './contracts';
import type { CreateSale, CreateCashSession, Receipt } from '../../types';

async function safeInvoke<T>(cmd: string, payload?: unknown): Promise<T> {
  const res = (await invoke('giro_invoke', { cmd, payload })) as unknown;
  const parsed = InvokeResultSchema.parse(res);
  if (!parsed.ok) throw new Error(parsed.error || 'invoke_error');
  return parsed.data as T;
}

export async function safeActivateLicense(licenseKey: string) {
  return safeInvoke<any>('license.activate', { licenseKey });
}

export async function safeGetHardwareId() {
  return safeInvoke<string>('license.get_hardware_id');
}

export async function safeGetStoredLicense() {
  return safeInvoke<Record<string, any> | null>('license.get_stored');
}

export async function safeGetServerTime() {
  return safeInvoke<string>('license.get_server_time');
}

export async function safeRestoreLicense() {
  return safeInvoke<string | null>('license.restore_license');
}

export async function safeCreateSale(input: CreateSale) {
  return safeInvoke<any>('create_sale', { ...input });
}

export async function safeOpenCashSession(input: CreateCashSession) {
  return safeInvoke<any>('open_cash_session', { ...input });
}

export async function safePrintReceipt(receipt: Receipt) {
  return safeInvoke<any>('print_receipt', { ...receipt });
}

// Legacy direct commands (kept for compatibility)
export async function activateLicense(licenseKey: string) {
  const res = await invoke('activate_license', { licenseKey });
  return res as unknown;
}

export async function openCashSession(input: CreateCashSession) {
  const res = await invoke('open_cash_session', { input });
  return res as any;
}

export async function createSale(input: CreateSale) {
  const res = await invoke('create_sale', { input });
  return res as any;
}

export async function printReceipt(receipt: Receipt) {
  const res = await invoke('print_receipt', { receipt });
  return res as any;
}

export default {
  safeInvoke,
  safeActivateLicense,
  safeGetHardwareId,
  activateLicense,
  openCashSession,
  createSale,
  printReceipt,
};

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './constants';

// License Server API URL - defaults to production, can be overridden via env
export const API_URL =
  (process.env.EXPO_PUBLIC_API_URL as string) ||
  'https://giro-license-server-production.up.railway.app/api/v1';

// --- License Interfaces ---
export interface LicenseInfo {
  license_key: string;
  plan_type: string;
  status: string;
  expires_at?: string;
  is_valid: boolean;
}

export interface LicenseValidationResponse {
  valid: boolean;
  license: LicenseInfo;
  message?: string;
}

async function getToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  } catch {
    return null;
  }
}

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = await getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token && token !== 'undefined') {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL.replace(/\/$/, '')}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    // Remove token if unauthorized
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    throw new Error('Sessão expirada');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Erro na requisição: ${res.statusText}`);
  }

  return res.json();
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL.replace(/\/$/, '')}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Falha no login');
  }

  const data = await res.json();
  if (data?.access_token) {
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.access_token);
  }

  return data;
}

export async function register(payload: any) {
  return fetch(`${API_URL.replace(/\/$/, '')}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(async (r) => {
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || 'Falha');
    return r.json();
  });
}

export async function getProfile() {
  return fetchWithAuth('/auth/me');
}

export async function getLicenses() {
  return fetchWithAuth('/licenses');
}

export async function getHardware() {
  return fetchWithAuth('/hardware');
}

export async function createMercadoPagoPreference(title: string, price: number, quantity = 1) {
  return fetchWithAuth('/mercadopago/create_preference', {
    method: 'POST',
    body: JSON.stringify({ title, price, quantity }),
  });
}

export async function updateProfile(payload: any) {
  return fetchWithAuth('/auth/profile', { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function changePassword(payload: any) {
  return fetchWithAuth('/auth/change-password', { method: 'POST', body: JSON.stringify(payload) });
}

/**
 * Validate a license key directly with the License Server
 * @param licenseKey The license key to validate
 * @param hardwareId Optional hardware ID for validation
 */
export async function validateLicense(
  licenseKey: string,
  hardwareId?: string
): Promise<LicenseValidationResponse> {
  const res = await fetch(`${API_URL.replace(/\/$/, '')}/licenses/${licenseKey}/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hardware_id: hardwareId || 'mobile-device' }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Falha na validação da licença');
  }

  return res.json();
}

export async function logout() {
  await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
}

export default {
  API_URL,
  login,
  register,
  getProfile,
  getLicenses,
  getHardware,
  createMercadoPagoPreference,
  updateProfile,
  changePassword,
  validateLicense,
  logout,
};

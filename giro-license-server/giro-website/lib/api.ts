export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// --- Auth Interfaces ---

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
  company_name?: string;
  license_key?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  admin: {
    id: string;
    email: string;
    name: string;
    company_name?: string;
    is_verified: boolean;
    created_at: string;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  company_name?: string;
  is_verified?: boolean;
  created_at?: string;
}

// --- License & Hardware Interfaces ---

export interface License {
  id: string;
  license_key: string;
  plan_type: string;
  status: string;
  activated_at?: string;
  expires_at?: string;
  last_validated?: string;
  support_expires_at?: string;
  can_offline?: boolean;
  created_at: string;
}

export interface Hardware {
  id: string;
  fingerprint: string;
  machine_name?: string;
  os_version?: string;
  first_seen: string;
  last_seen: string;
  is_active: boolean;
}

// --- Payment Interfaces ---

export interface CreatePreferenceResponse {
  init_point: string;
  sandbox_init_point: string;
  id: string;
}

// --- API Functions ---

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  console.log(`[TRACE] fetchWithAuth called for: ${endpoint}`);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  console.log(`[API] fetchWithAuth: ${endpoint}, token from storage: '${token}', type: ${typeof token}`);

  const headers = {
    'Content-Type': 'application/json',
    ...(token && token !== 'undefined' ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  if ('Authorization' in headers) {
      // @ts-ignore
      console.log(`[API] Sending Auth Header: ${headers.Authorization}`);
  } else {
      console.log(`[API] No Auth Header sent for ${endpoint}`);
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
    }
    throw new Error('Sessão expirada');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Erro na requisição: ${response.statusText}`);
  }

  return response.json();
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Falha no login');
  }

  return response.json();
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  console.log('[API] register called with email:', data.email);
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  console.log('[API] register response status:', response.status);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Falha no cadastro');
  }

  return response.json();
}

export async function getProfile(): Promise<UserProfile> {
  return fetchWithAuth('/auth/me');
}

export async function getLicenses(): Promise<{ data: License[]; pagination: any }> {
  return fetchWithAuth('/licenses');
}

export async function getHardware(): Promise<Hardware[]> {
  return fetchWithAuth('/hardware');
}

export async function createMercadoPagoPreference(
  title: string,
  price: number,
  quantity: number = 1
): Promise<CreatePreferenceResponse> {
  return fetchWithAuth('/mercadopago/create_preference', {
    method: 'POST',
    body: JSON.stringify({
      title,
      price,
      quantity,
    }),
  });
}

// --- Profile Management ---

export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  company_name?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export async function updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
  return fetchWithAuth('/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function changePassword(data: ChangePasswordRequest): Promise<{ message: string }> {
  return fetchWithAuth('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Legacy Stripe function (deprecated)
export async function createCheckoutSession(plan: string, _interval: string) {
  return createMercadoPagoPreference(plan, 99.9); // Fallback to MP
}

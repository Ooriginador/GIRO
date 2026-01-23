/**
 * API Client for GIRO License Server
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  admin: {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'customer';
    company_name: string | null;
    is_verified: boolean;
    created_at: string;
  };
}

class APIClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;

    // Load token from localStorage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('access_token');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error.error?.message || 'Request failed');
    }

    return response.json();
  }

  // Auth endpoints
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    this.setToken(response.access_token);
    if (typeof window !== 'undefined') {
      localStorage.setItem('refresh_token', response.refresh_token);
    }

    return response;
  }

  async logout() {
    const refreshToken =
      typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;

    if (refreshToken) {
      try {
        await this.request('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    this.clearToken();
  }

  async getMe() {
    return this.request('/auth/me');
  }

  // License endpoints
  async getLicenses(params?: { status?: string; page?: number; limit?: number }) {
    const query = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
    return this.request(`/licenses${query ? `?${query}` : ''}`);
  }

  async getLicense(key: string) {
    return this.request(`/licenses/${key}`);
  }

  async createLicenses(planType: string, quantity: number = 1) {
    return this.request('/licenses', {
      method: 'POST',
      body: JSON.stringify({ plan_type: planType, quantity }),
    });
  }

  // Dashboard
  async getDashboard(days: number = 30) {
    return this.request(`/metrics/dashboard?days=${days}`);
  }

  // Hardware
  async getHardware() {
    return this.request('/hardware');
  }

  // Settings
  async updateProfile(data: { name?: string; phone?: string; company_name?: string }) {
    return this.request('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request('/profile/password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  }

  // API Keys
  async getApiKeys() {
    return this.request('/api-keys');
  }

  async createApiKey(name: string, expiresInDays?: number) {
    return this.request('/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name, expires_in_days: expiresInDays }),
    });
  }

  async revokeApiKey(id: string) {
    return this.request(`/api-keys/${id}`, {
      method: 'DELETE',
    });
  }

  // Hardware actions
  async deactivateHardware(id: string) {
    return this.request(`/hardware/${id}/deactivate`, {
      method: 'POST',
    });
  }

  // Analytics
  async getAnalytics(period: number = 30) {
    return this.request(`/metrics/analytics?period=${period}`);
  }
}

export const apiClient = new APIClient();
export type { LoginCredentials, LoginResponse };

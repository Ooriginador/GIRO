/**
 * Unit tests for API Client
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// We need to import after mocking
describe('APIClient', () => {
  let apiClient: any;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    // Mock fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Dynamic import to get fresh instance
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Token Management', () => {
    it('should store token in localStorage on setToken', async () => {
      const { apiClient: client } = await import('@/lib/api');

      client.setToken('test-token-123');

      expect(localStorage.getItem('access_token')).toBe('test-token-123');
    });

    it('should clear tokens on clearToken', async () => {
      localStorage.setItem('access_token', 'old-token');
      localStorage.setItem('refresh_token', 'old-refresh');

      const { apiClient: client } = await import('@/lib/api');
      client.clearToken();

      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
    });
  });

  describe('Login', () => {
    it('should login successfully and store tokens', async () => {
      const mockResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        token_type: 'Bearer',
        expires_in: 3600,
        admin: {
          id: 'admin-1',
          email: 'test@example.com',
          name: 'Test Admin',
          company_name: 'GIRO Corp',
          is_verified: true,
          created_at: '2024-01-01T00:00:00Z',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { apiClient: client } = await import('@/lib/api');
      const result = await client.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
        })
      );

      expect(result.access_token).toBe('new-access-token');
      expect(localStorage.getItem('access_token')).toBe('new-access-token');
      expect(localStorage.getItem('refresh_token')).toBe('new-refresh-token');
    });

    it('should throw error on failed login', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: { message: 'Invalid credentials' } }),
      });

      const { apiClient: client } = await import('@/lib/api');

      await expect(client.login({ email: 'wrong@test.com', password: 'wrong' })).rejects.toThrow(
        'Invalid credentials'
      );
    });
  });

  describe('Licenses', () => {
    it('should fetch licenses with auth header', async () => {
      localStorage.setItem('access_token', 'my-token');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ id: 'lic-1', key: 'XXXX-XXXX' }]),
      });

      const { apiClient: client } = await import('@/lib/api');
      client.setToken('my-token');

      await client.getLicenses();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/licenses'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer my-token',
          }),
        })
      );
    });

    it('should create licenses with correct payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ key: 'NEW-KEY' }]),
      });

      const { apiClient: client } = await import('@/lib/api');
      client.setToken('admin-token');

      await client.createLicenses('monthly', 5);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/licenses'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ plan_type: 'monthly', quantity: 5 }),
        })
      );
    });
  });

  describe('API Keys', () => {
    beforeEach(async () => {
      const { apiClient: client } = await import('@/lib/api');
      client.setToken('admin-token');
    });

    it('should create API key with expiration', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'key-1', name: 'My Key', key: 'giro_xxxx' }),
      });

      const { apiClient: client } = await import('@/lib/api');
      client.setToken('admin-token');

      await client.createApiKey('Production Key', 90);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api-keys'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Production Key', expires_in_days: 90 }),
        })
      );
    });

    it('should revoke API key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { apiClient: client } = await import('@/lib/api');
      client.setToken('admin-token');

      await client.revokeApiKey('key-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api-keys/key-123'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('Hardware', () => {
    it('should deactivate hardware', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { apiClient: client } = await import('@/lib/api');
      client.setToken('admin-token');

      await client.deactivateHardware('hw-456');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/hardware/hw-456/deactivate'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('Analytics', () => {
    it('should fetch analytics with period', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ revenue: 1000, licenses: 50 }),
      });

      const { apiClient: client } = await import('@/lib/api');
      client.setToken('admin-token');

      await client.getAnalytics(90);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/metrics/analytics?period=90'),
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { apiClient: client } = await import('@/lib/api');

      await expect(client.getMe()).rejects.toThrow('Network error');
    });

    it('should handle non-JSON error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Service Unavailable',
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      const { apiClient: client } = await import('@/lib/api');

      await expect(client.getMe()).rejects.toThrow('Service Unavailable');
    });
  });
});

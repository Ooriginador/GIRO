import ApiKeysPage from '@/app/dashboard/api-keys/page';
import { apiClient } from '@/lib/api';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock API
vi.mock('@/lib/api', () => ({
  apiClient: {
    getApiKeys: vi.fn(),
    createApiKey: vi.fn(),
    revokeApiKey: vi.fn(),
  },
}));

describe('API Keys Page', () => {
  const mockApiKeys = {
    api_keys: [
      {
        id: 'key-1',
        name: 'Production Key',
        key_prefix: 'giro_sk_live_XXXX',
        created_at: '2024-01-01T00:00:00Z',
        last_used_at: '2024-01-15T10:00:00Z',
        expires_at: null,
        is_active: true,
      },
      {
        id: 'key-2',
        name: 'Test Key',
        key_prefix: 'giro_sk_test_YYYY',
        created_at: '2024-01-02T00:00:00Z',
        last_used_at: null,
        expires_at: '2024-12-31T23:59:59Z',
        is_active: true,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading skeleton initially', () => {
      vi.mocked(apiClient.getApiKeys).mockImplementation(() => new Promise(() => {}));
      render(<ApiKeysPage />);
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('Page Render', () => {
    it('should render page title after loading', async () => {
      vi.mocked(apiClient.getApiKeys).mockResolvedValue(mockApiKeys);
      render(<ApiKeysPage />);

      await waitFor(() => {
        expect(screen.getByText('API Keys')).toBeInTheDocument();
      });
    });

    it('should render description', async () => {
      vi.mocked(apiClient.getApiKeys).mockResolvedValue(mockApiKeys);
      render(<ApiKeysPage />);

      await waitFor(() => {
        expect(screen.getByText('Gerencie chaves de API para integração')).toBeInTheDocument();
      });
    });

    it('should render create button', async () => {
      vi.mocked(apiClient.getApiKeys).mockResolvedValue(mockApiKeys);
      render(<ApiKeysPage />);

      await waitFor(() => {
        expect(screen.getByText('Nova API Key')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty message when no keys', async () => {
      vi.mocked(apiClient.getApiKeys).mockResolvedValue({ api_keys: [] });
      render(<ApiKeysPage />);

      await waitFor(() => {
        expect(screen.getByText(/Nenhuma API key criada ainda/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(apiClient.getApiKeys).mockRejectedValue(new Error('API Error'));

      render(<ApiKeysPage />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load API keys:', expect.any(Error));
      });
      consoleSpy.mockRestore();
    });
  });
});

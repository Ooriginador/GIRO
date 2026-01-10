import SettingsPage from '@/app/dashboard/settings/page';
import { apiClient } from '@/lib/api';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock API
vi.mock('@/lib/api', () => ({
  apiClient: {
    getMe: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
  },
}));

describe('Settings Page', () => {
  const mockProfile = {
    id: 'admin-1',
    email: 'admin@giro.com',
    name: 'Admin User',
    phone: '+55 11 99999-9999',
    company_name: 'GIRO Corp',
    created_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading skeleton initially', () => {
      vi.mocked(apiClient.getMe).mockImplementation(() => new Promise(() => {}));
      render(<SettingsPage />);
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('Page Render', () => {
    it('should render page title after loading', async () => {
      vi.mocked(apiClient.getMe).mockResolvedValue(mockProfile);
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('Configurações')).toBeInTheDocument();
      });
    });

    it('should render profile section', async () => {
      vi.mocked(apiClient.getMe).mockResolvedValue(mockProfile);
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText('Perfil')).toBeInTheDocument();
      });
    });

    it('should display user name in form', async () => {
      vi.mocked(apiClient.getMe).mockResolvedValue(mockProfile);
      render(<SettingsPage />);

      await waitFor(() => {
        const nameInput = screen.getByLabelText('Nome') as HTMLInputElement;
        expect(nameInput.value).toBe('Admin User');
      });
    });

    it('should display email as disabled', async () => {
      vi.mocked(apiClient.getMe).mockResolvedValue(mockProfile);
      render(<SettingsPage />);

      await waitFor(() => {
        const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
        expect(emailInput).toBeDisabled();
        expect(emailInput.value).toBe('admin@giro.com');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(apiClient.getMe).mockRejectedValue(new Error('API Error'));

      render(<SettingsPage />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load profile:', expect.any(Error));
      });
      consoleSpy.mockRestore();
    });
  });
});

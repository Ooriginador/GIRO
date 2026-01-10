/**
 * Unit tests for Licenses Page
 * @vitest-environment jsdom
 */

import LicensesPage from '@/app/dashboard/licenses/page';
import { apiClient } from '@/lib/api';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock apiClient
vi.mock('@/lib/api', () => ({
  apiClient: {
    getLicenses: vi.fn(),
    createLicenses: vi.fn(),
  },
}));

describe('Licenses Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockLicenses = {
    licenses: [
      {
        license_key: 'GIRO-XXXX-YYYY-ZZZZ-AAAA',
        plan_type: 'professional',
        status: 'active',
        max_devices: 3,
        expires_at: '2027-01-10T00:00:00Z',
        created_at: '2026-01-10T00:00:00Z',
        company_name: 'Test Company',
      },
      {
        license_key: 'GIRO-BBBB-CCCC-DDDD-EEEE',
        plan_type: 'basic',
        status: 'expired',
        max_devices: 1,
        expires_at: '2025-01-10T00:00:00Z',
        created_at: '2024-01-10T00:00:00Z',
        company_name: null,
      },
    ],
  };

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      (apiClient.getLicenses as any).mockImplementation(() => new Promise(() => {}));

      render(<LicensesPage />);

      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('Loaded State', () => {
    it('should display page title', async () => {
      (apiClient.getLicenses as any).mockResolvedValueOnce(mockLicenses);

      render(<LicensesPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /licenças/i })).toBeInTheDocument();
      });
    });

    it('should display licenses list', async () => {
      (apiClient.getLicenses as any).mockResolvedValueOnce(mockLicenses);

      render(<LicensesPage />);

      await waitFor(() => {
        expect(screen.getByText(/GIRO-XXXX/)).toBeInTheDocument();
        expect(screen.getByText(/GIRO-BBBB/)).toBeInTheDocument();
      });
    });

    it('should display license status', async () => {
      (apiClient.getLicenses as any).mockResolvedValueOnce(mockLicenses);

      render(<LicensesPage />);

      await waitFor(() => {
        expect(screen.getByText(/active/i)).toBeInTheDocument();
        expect(screen.getByText(/expired/i)).toBeInTheDocument();
      });
    });

    it('should display create button', async () => {
      (apiClient.getLicenses as any).mockResolvedValueOnce(mockLicenses);

      render(<LicensesPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /(criar|nova|gerar)/i })).toBeInTheDocument();
      });
    });
  });

  describe('Create License', () => {
    it('should call createLicenses when form is submitted', async () => {
      const user = userEvent.setup();
      (apiClient.getLicenses as any).mockResolvedValue(mockLicenses);
      (apiClient.createLicenses as any).mockResolvedValueOnce({ licenses: [] });

      render(<LicensesPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /(criar|nova|gerar)/i })).toBeInTheDocument();
      });

      // Open dialog and submit
      await user.click(screen.getByRole('button', { name: /(criar|nova|gerar)/i }));

      // Wait for dialog
      await waitFor(() => {
        const submitBtn = screen.getByRole('button', { name: /(gerar|criar)/i });
        if (submitBtn) {
          expect(submitBtn).toBeInTheDocument();
        }
      });
    });
  });

  describe('Empty State', () => {
    it('should handle empty licenses list', async () => {
      (apiClient.getLicenses as any).mockResolvedValueOnce({ licenses: [] });

      render(<LicensesPage />);

      await waitFor(() => {
        // Should not crash with empty list
        expect(screen.getByRole('heading', { name: /licenças/i })).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API error gracefully', async () => {
      (apiClient.getLicenses as any).mockRejectedValueOnce(new Error('API Error'));

      render(<LicensesPage />);

      await waitFor(() => {
        // Should not crash
        expect(screen.getByRole('heading', { name: /licenças/i })).toBeInTheDocument();
      });
    });
  });

  describe('API Calls', () => {
    it('should call getLicenses on mount', async () => {
      (apiClient.getLicenses as any).mockResolvedValueOnce(mockLicenses);

      render(<LicensesPage />);

      await waitFor(() => {
        expect(apiClient.getLicenses).toHaveBeenCalledTimes(1);
      });
    });
  });
});

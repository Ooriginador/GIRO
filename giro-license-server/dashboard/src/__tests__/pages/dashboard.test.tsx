/**
 * Unit tests for Dashboard Page
 * @vitest-environment jsdom
 */

import DashboardPage from '@/app/dashboard/page';
import { apiClient } from '@/lib/api';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock apiClient
vi.mock('@/lib/api', () => ({
  apiClient: {
    getDashboard: vi.fn(),
  },
}));

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockStats = {
    total_licenses: 150,
    active_licenses: 120,
    expired_licenses: 30,
    revenue_current_month: '15000.00',
    revenue_last_month: '12500.00',
    active_devices: 95,
  };

  describe('Loading State', () => {
    it('should show loading skeleton initially', () => {
      (apiClient.getDashboard as any).mockImplementation(() => new Promise(() => {}));

      render(<DashboardPage />);

      // Should have animate-pulse skeleton
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('Loaded State', () => {
    it('should display dashboard title', async () => {
      (apiClient.getDashboard as any).mockResolvedValueOnce(mockStats);

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
      });
    });

    it('should display total licenses', async () => {
      (apiClient.getDashboard as any).mockResolvedValueOnce(mockStats);

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument();
        expect(screen.getByText(/total de licenças/i)).toBeInTheDocument();
      });
    });

    it('should display active licenses', async () => {
      (apiClient.getDashboard as any).mockResolvedValueOnce(mockStats);

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('120')).toBeInTheDocument();
        expect(screen.getByText(/licenças ativas/i)).toBeInTheDocument();
      });
    });

    it('should display expired licenses', async () => {
      (apiClient.getDashboard as any).mockResolvedValueOnce(mockStats);

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('30')).toBeInTheDocument();
        expect(screen.getByText(/licenças expiradas/i)).toBeInTheDocument();
      });
    });

    it('should display revenue information', async () => {
      (apiClient.getDashboard as any).mockResolvedValueOnce(mockStats);

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/15000\.00/)).toBeInTheDocument();
        expect(screen.getByText(/12500\.00/)).toBeInTheDocument();
      });
    });

    it('should display active devices', async () => {
      (apiClient.getDashboard as any).mockResolvedValueOnce(mockStats);

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('95')).toBeInTheDocument();
        expect(screen.getByText(/dispositivos ativos/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API error gracefully', async () => {
      (apiClient.getDashboard as any).mockRejectedValueOnce(new Error('API Error'));

      render(<DashboardPage />);

      // Should not crash, show zeros
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
      });
    });

    it('should display zeros when no data', async () => {
      (apiClient.getDashboard as any).mockResolvedValueOnce(null);

      render(<DashboardPage />);

      await waitFor(() => {
        // Should show 0 for all stats
        const zeros = screen.getAllByText('0');
        expect(zeros.length).toBeGreaterThan(0);
      });
    });
  });

  describe('API Calls', () => {
    it('should call getDashboard on mount', async () => {
      (apiClient.getDashboard as any).mockResolvedValueOnce(mockStats);

      render(<DashboardPage />);

      await waitFor(() => {
        expect(apiClient.getDashboard).toHaveBeenCalledTimes(1);
      });
    });
  });
});

import AnalyticsPage from '@/app/dashboard/analytics/page';
import { apiClient } from '@/lib/api';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Recharts components
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
}));

// Mock API
vi.mock('@/lib/api', () => ({
  apiClient: {
    getAnalytics: vi.fn(),
  },
}));

describe('Analytics Page', () => {
  const mockAnalytics = {
    revenue_chart: [
      { date: '2024-01-01', value: 1000 },
      { date: '2024-01-02', value: 1500 },
    ],
    licenses_chart: [
      { date: '2024-01-01', total: 10, active: 8, expired: 2 },
      { date: '2024-01-02', total: 12, active: 10, expired: 2 },
    ],
    devices_chart: [
      { date: '2024-01-01', devices: 5 },
      { date: '2024-01-02', devices: 7 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading skeleton initially', () => {
      vi.mocked(apiClient.getAnalytics).mockImplementation(() => new Promise(() => {}));
      render(<AnalyticsPage />);
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('Page Render', () => {
    it('should render page title after loading', async () => {
      vi.mocked(apiClient.getAnalytics).mockResolvedValue(mockAnalytics);
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Analytics')).toBeInTheDocument();
      });
    });

    it('should render description', async () => {
      vi.mocked(apiClient.getAnalytics).mockResolvedValue(mockAnalytics);
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Visualize métricas e tendências')).toBeInTheDocument();
      });
    });

    it('should render period buttons', async () => {
      vi.mocked(apiClient.getAnalytics).mockResolvedValue(mockAnalytics);
      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('7 dias')).toBeInTheDocument();
        expect(screen.getByText('30 dias')).toBeInTheDocument();
        expect(screen.getByText('90 dias')).toBeInTheDocument();
      });
    });
  });

  describe('Charts', () => {
    it('should render charts after loading', async () => {
      vi.mocked(apiClient.getAnalytics).mockResolvedValue(mockAnalytics);
      render(<AnalyticsPage />);

      await waitFor(() => {
        // Check for chart containers
        expect(screen.getAllByTestId('responsive-container').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(apiClient.getAnalytics).mockRejectedValue(new Error('API Error'));

      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load analytics:', expect.any(Error));
      });
      consoleSpy.mockRestore();
    });

    it('should show page with empty data on error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(apiClient.getAnalytics).mockRejectedValue(new Error('API Error'));

      render(<AnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText('Analytics')).toBeInTheDocument();
      });
    });
  });
});

import HardwarePage from '@/app/dashboard/hardware/page';
import { apiClient } from '@/lib/api';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock API
vi.mock('@/lib/api', () => ({
  apiClient: {
    getHardware: vi.fn(),
    deactivateHardware: vi.fn(),
  },
}));

describe('Hardware Page', () => {
  const mockHardware = {
    devices: [
      {
        id: 'hw-1',
        license_key: 'GIRO-AAAA-BBBB-CCCC',
        hardware_id: 'HW-123456789',
        device_name: 'Desktop Loja 1',
        activated_at: '2024-01-01T00:00:00Z',
        last_heartbeat: '2024-01-15T10:00:00Z',
        is_active: true,
      },
      {
        id: 'hw-2',
        license_key: 'GIRO-DDDD-EEEE-FFFF',
        hardware_id: 'HW-987654321',
        device_name: null,
        activated_at: '2024-01-02T00:00:00Z',
        last_heartbeat: null,
        is_active: false,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading skeleton initially', () => {
      vi.mocked(apiClient.getHardware).mockImplementation(() => new Promise(() => {}));
      render(<HardwarePage />);
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('Page Render', () => {
    it('should render page title after loading', async () => {
      vi.mocked(apiClient.getHardware).mockResolvedValue(mockHardware);
      render(<HardwarePage />);

      await waitFor(() => {
        expect(screen.getByText('Hardware')).toBeInTheDocument();
      });
    });

    it('should render description', async () => {
      vi.mocked(apiClient.getHardware).mockResolvedValue(mockHardware);
      render(<HardwarePage />);

      await waitFor(() => {
        expect(screen.getByText('Dispositivos ativados com licenças')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty message when no devices', async () => {
      vi.mocked(apiClient.getHardware).mockResolvedValue({ devices: [] });
      render(<HardwarePage />);

      await waitFor(() => {
        expect(screen.getByText('Nenhum dispositivo ativado ainda')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(apiClient.getHardware).mockRejectedValue(new Error('API Error'));

      render(<HardwarePage />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load hardware:', expect.any(Error));
      });
      consoleSpy.mockRestore();
    });
  });
});

import * as tauri from '@/lib/tauri';
import fixtures from '@/test/fixtures';
import { createQueryWrapper } from '@/test/queryWrapper';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContingencyManager } from '../ContingencyManager';

// Define hoisted variables
const { mockToast, mockFiscal, mockCompany } = vi.hoisted(() => ({
  mockToast: vi.fn(),
  mockFiscal: {
    certPath: 'path/to/cert.pfx',
    certPassword: fixtures.TEST_TOKEN_USER,
    environment: 2,
    uf: 'SP',
    serie: 1,
    nextNumber: 1,
  },
  mockCompany: {
    name: 'Test Company',
    state: 'SP',
  },
}));

// Mock Lucide icons (extend original exports when available)
vi.mock('lucide-react', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    AlertTriangle: () => <div data-testid="icon-alert" />,
    CheckCircle2: () => <div data-testid="icon-check" />,
    Loader2: () => <div data-testid="icon-loader" />,
    RefreshCw: () => <div data-testid="icon-refresh" />,
    Send: () => <div data-testid="icon-send" />,
  };
});

// Mock Tauri functions
vi.mock('@/lib/tauri', () => ({
  listOfflineNotes: vi.fn(),
  transmitOfflineNote: vi.fn(),
}));

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  toast: mockToast,
}));

// Mock Settings Store
vi.mock('@/stores/settings-store', () => ({
  useSettingsStore: vi.fn(() => ({
    fiscal: mockFiscal,
    company: mockCompany,
  })),
}));

describe('ContingencyManager', () => {
  const queryWrapper = createQueryWrapper();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render empty state when no notes exist', async () => {
    vi.mocked(tauri.listOfflineNotes).mockResolvedValue([]);

    render(<ContingencyManager />, { wrapper: queryWrapper.Wrapper });

    expect(await screen.findByText(/Nenhuma nota pendente/i)).toBeInTheDocument();
  });

  it('should list offline notes when they exist', async () => {
    const mockNotes = [
      {
        access_key: '1234567890',
        created_at: new Date().toISOString(),
        sale_id: 'sale-1',
        xml: '<xml/>',
        status: 'PENDING' as const,
      },
    ];
    vi.mocked(tauri.listOfflineNotes).mockResolvedValue(mockNotes);

    render(<ContingencyManager />, { wrapper: queryWrapper.Wrapper });

    expect(await screen.findByText('1234567890')).toBeInTheDocument();
    expect(screen.getByText('PENDENTE')).toBeInTheDocument();
  });

  it('should handle transmission success', async () => {
    const mockNote = {
      access_key: '1234567890',
      created_at: new Date().toISOString(),
      sale_id: 'sale-1',
      xml: '<xml/>',
      status: 'PENDING' as const,
    };
    vi.mocked(tauri.listOfflineNotes).mockResolvedValue([mockNote]);
    vi.mocked(tauri.transmitOfflineNote).mockResolvedValue({
      success: true,
      protocol: '123456',
      message: 'Success',
    });

    render(<ContingencyManager />, { wrapper: queryWrapper.Wrapper });

    const transmitButton = await screen.findByRole('button', { name: /Transmitir/i });
    fireEvent.click(transmitButton);

    await waitFor(() => {
      expect(tauri.transmitOfflineNote).toHaveBeenCalledWith(
        '1234567890',
        mockFiscal.certPath,
        mockFiscal.certPassword,
        expect.any(String),
        mockFiscal.environment
      );
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Nota Transmitida!',
        })
      );
    });
  });

  it('should handle transmission failure/rejection', async () => {
    const mockNote = {
      access_key: '1234567890',
      created_at: new Date().toISOString(),
      sale_id: 'sale-1',
      xml: '<xml/>',
      status: 'PENDING' as const,
    };
    vi.mocked(tauri.listOfflineNotes).mockResolvedValue([mockNote]);
    vi.mocked(tauri.transmitOfflineNote).mockResolvedValue({
      success: false,
      message: 'Rejeição: Duplicidade',
    });

    render(<ContingencyManager />, { wrapper: queryWrapper.Wrapper });

    const transmitButton = await screen.findByRole('button', { name: /Transmitir/i });
    fireEvent.click(transmitButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Rejeição SEFAZ',
          description: 'Rejeição: Duplicidade',
        })
      );
    });
  });

  it('should show error if settings are missing', async () => {
    const { useSettingsStore } = await import('@/stores/settings-store');
    vi.mocked(useSettingsStore).mockReturnValue({
      fiscal: { ...mockFiscal, certPath: '' },
      company: mockCompany,
    });

    const mockNote = {
      access_key: '1234',
      created_at: new Date().toISOString(),
      sale_id: '1',
      xml: '<xml/>',
      status: 'PENDING' as const,
    };
    vi.mocked(tauri.listOfflineNotes).mockResolvedValue([mockNote]);

    render(<ContingencyManager />, { wrapper: queryWrapper.Wrapper });

    const transmitButton = await screen.findByRole('button', { name: /Transmitir/i });
    fireEvent.click(transmitButton);

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Configuração Fiscal Incompleta',
      })
    );
  });
});

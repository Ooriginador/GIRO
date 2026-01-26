import { createQueryWrapperWithClient } from '@/test/queryWrapper';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Define hoisted mocks first - use inline values instead of imports
const { mockListOfflineNotes, mockTransmitOfflineNote, mockToast, mockFiscal, mockCompany } =
  vi.hoisted(() => ({
    mockListOfflineNotes: vi.fn(),
    mockTransmitOfflineNote: vi.fn(),
    mockToast: vi.fn(),
    mockFiscal: {
      certPath: 'path/to/cert.pfx',
      certPassword: 'TEST_TOKEN_USER_0000',
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

// Mock Tauri functions
vi.mock('@/lib/tauri', () => ({
  listOfflineNotes: mockListOfflineNotes,
  transmitOfflineNote: mockTransmitOfflineNote,
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
  const queryWrapper = createQueryWrapperWithClient();
  // Lazy import to ensure mocks are set up first
  let ContingencyManager: typeof import('../ContingencyManager').ContingencyManager;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await import('../ContingencyManager');
    ContingencyManager = module.ContingencyManager;
  });

  it('should render empty state when no notes exist', async () => {
    mockListOfflineNotes.mockResolvedValue([]);

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
    mockListOfflineNotes.mockResolvedValue(mockNotes);

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
    mockListOfflineNotes.mockResolvedValue([mockNote]);
    mockTransmitOfflineNote.mockResolvedValue({
      success: true,
      protocol: '123456',
      message: 'Success',
    });

    render(<ContingencyManager />, { wrapper: queryWrapper.Wrapper });

    const transmitButton = await screen.findByRole('button', { name: /Transmitir/i });
    fireEvent.click(transmitButton);

    await waitFor(() => {
      expect(mockTransmitOfflineNote).toHaveBeenCalledWith(
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
    mockListOfflineNotes.mockResolvedValue([mockNote]);
    mockTransmitOfflineNote.mockResolvedValue({
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
    mockListOfflineNotes.mockResolvedValue([mockNote]);

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

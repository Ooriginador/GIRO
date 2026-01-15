import * as tauri from '@/lib/tauri';
import { useLicenseStore } from '@/stores/license-store';
import { createQueryWrapper } from '@/test/queryWrapper';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LicenseActivationPage } from '../LicenseActivationPage';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Key: () => <div data-testid="icon-key" />,
  Monitor: () => <div data-testid="icon-monitor" />,
  ShieldCheck: () => <div data-testid="icon-shield" />,
  AlertCircle: () => <div data-testid="icon-alert" />,
  Loader2: () => <div data-testid="icon-loader" className="animate-spin" />,
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock hooks
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock Tauri functions
vi.mock('@/lib/tauri', () => ({
  getHardwareId: vi.fn(),
  activateLicense: vi.fn(),
  validateLicense: vi.fn(),
  setSetting: vi.fn(),
  getStoredLicense: vi.fn().mockResolvedValue(null),
}));

const queryWrapper = createQueryWrapper();

describe('LicenseActivationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLicenseStore.setState({
      licenseKey: null,
      state: 'unlicensed',
      isHydrated: true,
      isWithinGracePeriod: () => false,
    } as any);
  });

  it('should show loading state on mount', async () => {
    vi.mocked(tauri.getHardwareId).mockReturnValue(new Promise(() => {})); // Never resolves to keep loading

    render(<LicenseActivationPage />, { wrapper: queryWrapper.Wrapper });

    expect(screen.getByText(/Verificando licença/)).toBeInTheDocument();
  });

  it('should render activation form when no license exists', async () => {
    vi.mocked(tauri.getHardwareId).mockResolvedValue('MOCK-HWID-123');

    render(<LicenseActivationPage />, { wrapper: queryWrapper.Wrapper });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Ativar Licença' })).toBeInTheDocument();
    });
    expect(screen.getByText('MOCK-HWID-123')).toBeInTheDocument();
  });

  it('should format license key during typing', async () => {
    vi.mocked(tauri.getHardwareId).mockResolvedValue('MOCK-HWID-123');
    render(<LicenseActivationPage />, { wrapper: queryWrapper.Wrapper });

    const input = await screen.findByPlaceholderText('GIRO-XXXX-XXXX-XXXX');
    fireEvent.change(input, { target: { value: 'abcd1234efgh5678' } });

    expect(input).toHaveValue('ABCD-1234-EFGH-5678');
  });

  it('should handle successful activation', async () => {
    vi.mocked(tauri.getHardwareId).mockResolvedValue('MOCK-HWID-123');
    vi.mocked(tauri.activateLicense).mockResolvedValue({
      status: 'active',
      company_name: 'Test Company',
      license_key: 'AAAA-BBBB-CCCC-DDDD',
    } as any);

    render(<LicenseActivationPage />, { wrapper: queryWrapper.Wrapper });

    const input = await screen.findByPlaceholderText('GIRO-XXXX-XXXX-XXXX');
    fireEvent.change(input, { target: { value: 'AAAABBBBCCCCDDDD' } });

    fireEvent.click(screen.getByRole('button', { name: /ativar licença/i }));

    await waitFor(() => {
      expect(tauri.activateLicense).toHaveBeenCalledWith('AAAA-BBBB-CCCC-DDDD');
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Licença Ativada!' })
      );
    });

    await waitFor(
      () => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
      },
      { timeout: 3000 }
    );
  });

  it('should handle activation error', async () => {
    vi.mocked(tauri.getHardwareId).mockResolvedValue('MOCK-HWID-123');
    vi.mocked(tauri.activateLicense).mockRejectedValue('Chave inválida');

    render(<LicenseActivationPage />, { wrapper: queryWrapper.Wrapper });

    const input = await screen.findByPlaceholderText('GIRO-XXXX-XXXX-XXXX');
    fireEvent.change(input, { target: { value: 'WRONGKEY1234' } });

    fireEvent.click(screen.getByRole('button', { name: /ativar licença/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Erro na Ativação',
          variant: 'destructive',
        })
      );
    });
  });

  it('should redirect if valid license is found on mount', async () => {
    vi.mocked(tauri.getHardwareId).mockResolvedValue('MOCK-HWID-123');
    useLicenseStore.setState({
      licenseKey: 'EXISTING-KEY',
      state: 'valid',
      isHydrated: true,
      isWithinGracePeriod: () => true,
      hydrateFromDisk: vi.fn().mockResolvedValue(undefined),
    } as any);

    render(<LicenseActivationPage />, { wrapper: queryWrapper.Wrapper });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
  });
});

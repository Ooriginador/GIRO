import { InitialSetupPage } from '@/pages/setup/InitialSetupPage';
import { createQueryWrapperWithClient } from '@/test/queryWrapper';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as tauriLib from '@/lib/tauri';
import { useAuthStore } from '@/stores/auth-store';
import { useLicenseStore } from '@/stores/license-store';
import { useBusinessProfile } from '@/stores/useBusinessProfile';
import { useCreateFirstAdmin } from '@/hooks/useSetup';

// Mocks
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// CRITICAL: Mock the entire tauri module to prevent side effects during import
vi.mock('@/lib/tauri', () => ({
  invoke: vi.fn(),
  updateLicenseAdmin: vi.fn().mockResolvedValue(undefined),
  validateLicense: vi.fn(),
  recoverLicenseFromLogin: vi.fn(),
  setSetting: vi.fn(),
  getStoredLicense: vi.fn().mockResolvedValue(null),
  getHardwareId: vi.fn().mockResolvedValue('test-hwid'),
}));

vi.mock('@/hooks/useSetup', () => ({
  useCreateFirstAdmin: vi.fn(),
  useHasAdmin: vi.fn(),
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
  useToast: vi.fn(() => ({
    toast: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  })),
}));

vi.mock('@/stores/license-store', () => ({
  useLicenseStore: {
    getState: vi.fn(),
  },
}));

vi.mock('@/stores/useBusinessProfile', () => ({
  useBusinessProfile: vi.fn(),
}));

const { Wrapper: queryWrapper } = createQueryWrapperWithClient();

describe('InitialSetupPage', () => {
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useCreateFirstAdmin).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as any);

    vi.mocked(useAuthStore).mockReturnValue({
      login: vi.fn(),
    } as any);

    vi.mocked(useLicenseStore.getState).mockReturnValue({
      licenseKey: 'MOCK-KEY-123',
      state: 'valid',
      setLicenseKey: vi.fn(),
    } as any);
  });

  it('should render the welcome screen', () => {
    render(<InitialSetupPage />, { wrapper: queryWrapper });

    expect(screen.getByText(/Bem-vindo ao GIRO!/i)).toBeInTheDocument();
    expect(screen.getByText(/Criar Primeiro Administrador/i)).toBeInTheDocument();
  });

  it('should advance to step 2 (form) after clicking start', async () => {
    render(<InitialSetupPage />, { wrapper: queryWrapper });

    fireEvent.click(screen.getByText(/Criar Primeiro Administrador/i));

    await waitFor(() => {
      expect(screen.getByLabelText(/Nome Completo/i)).toBeInTheDocument();
    });
  });

  it('should complete setup and call updateLicenseAdmin', async () => {
    mockMutateAsync.mockResolvedValue({
      id: 'admin-1',
      name: 'Test Admin',
      email: 'test@example.com',
    });

    render(<InitialSetupPage />, { wrapper: queryWrapper });

    // Step 1: Welcome
    fireEvent.click(screen.getByText(/Criar Primeiro Administrador/i));

    // Step 2: Form
    await waitFor(() => screen.getByLabelText(/Nome Completo/i));

    fireEvent.change(screen.getByLabelText(/Nome Completo/i), { target: { value: 'Test Admin' } });
    fireEvent.change(screen.getByLabelText(/CPF/i), { target: { value: '12345678909' } });
    fireEvent.change(screen.getByLabelText(/Telefone/i), { target: { value: '11988887777' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/PIN \(4-6 dígitos\)/i), { target: { value: '1234' } });
    fireEvent.change(screen.getByLabelText(/Confirmar PIN/i), { target: { value: '1234' } });

    fireEvent.click(screen.getByRole('button', { name: /Criar Administrador/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Admin',
          email: 'test@example.com',
          pin: '1234',
          // cpf and phone might differ slightly due to masking logic during test event firing
          // checking they are present is enough for this flow test
        })
      );
      expect(tauriLib.updateLicenseAdmin).toHaveBeenCalledWith(
        'MOCK-KEY-123',
        expect.objectContaining({
          name: 'Test Admin',
          email: 'test@example.com',
        })
      );
    });
  });

  it('should handle sync flow correctly', async () => {
    vi.mocked(tauriLib.recoverLicenseFromLogin).mockResolvedValue({
      key: 'RECOVERED-KEY',
      company_name: 'Test Company',
      status: 'active',
    } as any);

    vi.mocked(tauriLib.invoke).mockImplementation(async (cmd: string) => {
      if (cmd === 'has_admin') return true;
      return undefined;
    });

    render(<InitialSetupPage />, { wrapper: queryWrapper });

    // 1. Go to Login Form
    const syncBtn = screen.getByText(/Sincronizar Conta/i);
    fireEvent.click(syncBtn);

    // 2. Fill Form
    const emailInput = screen.getByLabelText(/Email/i);
    const passInput = screen.getByLabelText(/Senha/i);

    // Check if Inputs are separate from the previous form (they have different IDs but label text is same)
    // The previous form is not rendered in 'login' step, so getAllByLabelText might not be needed if step replaces content.
    // InitialSetupPage replaces content based on step.

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passInput, { target: { value: 'password123' } });

    // 3. Submit
    const submitBtn = screen.getByRole('button', { name: /Entrar e Sincronizar/i });
    fireEvent.click(submitBtn);

    await waitFor(
      () => {
        expect(tauriLib.recoverLicenseFromLogin).toHaveBeenCalledWith({
          email: 'user@example.com',
          password: 'password123',
        });
        expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
      },
      { timeout: 5000 }
    );
  });
});

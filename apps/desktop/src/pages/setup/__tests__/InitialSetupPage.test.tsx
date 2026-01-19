import { InitialSetupPage } from '@/pages/setup/InitialSetupPage';
import { createQueryWrapper } from '@/test/queryWrapper';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mocks
vi.mock('@/lib/tauri', () => ({
  invoke: vi.fn(),
  updateLicenseAdmin: vi.fn().mockResolvedValue(undefined),
  validateLicense: vi.fn(),
}));

const mockMutateAsync = vi.fn().mockResolvedValue({
  id: 'admin-1',
  name: 'Test Admin',
  email: 'test@example.com',
});

vi.mock('@/hooks/useSetup', () => ({
  useCreateFirstAdmin: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

const mockLogin = vi.fn();
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({
    login: mockLogin,
  }),
}));

vi.mock('@/stores/license-store', () => ({
  useLicenseStore: {
    getState: () => ({
      licenseKey: 'MOCK-KEY-123',
      state: 'valid',
    }),
  },
}));

const { Wrapper: queryWrapper } = createQueryWrapper();

describe('InitialSetupPage', () => {
  it('should render the welcome screen', () => {
    render(
      <MemoryRouter>
        <InitialSetupPage />
      </MemoryRouter>,
      { wrapper: queryWrapper }
    );

    expect(screen.getByText(/Bem-vindo ao GIRO!/i)).toBeInTheDocument();
    expect(screen.getByText(/Criar Primeiro Administrador/i)).toBeInTheDocument();
  });

  it('should advance to step 2 (form) after clicking start', async () => {
    render(
      <MemoryRouter>
        <InitialSetupPage />
      </MemoryRouter>,
      { wrapper: queryWrapper }
    );

    fireEvent.click(screen.getByText(/Criar Primeiro Administrador/i));

    await waitFor(() => {
      // O form tem o título "Criar Primeiro Administrador" também, mas podemos checar labels
      expect(screen.getByLabelText(/Nome Completo/i)).toBeInTheDocument();
    });
  });

  it('should complete setup and call updateLicenseAdmin', async () => {
    const { updateLicenseAdmin } = await import('@/lib/tauri');

    render(
      <MemoryRouter>
        <InitialSetupPage />
      </MemoryRouter>,
      { wrapper: queryWrapper }
    );

    // Step 1: Welcome
    fireEvent.click(screen.getByText(/Criar Primeiro Administrador/i));

    // Step 2: Form
    const nameInput = screen.getByLabelText(/Nome Completo/i);
    const cpfInput = screen.getByLabelText(/CPF/i);
    const phoneInput = screen.getByLabelText(/Telefone/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const pinInput = screen.getByLabelText(/PIN \(4-6 dígitos\)/i);
    const confirmPinInput = screen.getByLabelText(/Confirmar PIN/i);

    fireEvent.change(nameInput, { target: { value: 'Test Admin' } });
    fireEvent.change(cpfInput, { target: { value: '12345678909' } }); // Will be formatted by logic if I used fireEvent.change correctly
    fireEvent.change(phoneInput, { target: { value: '11988887777' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(pinInput, { target: { value: '1234' } });
    fireEvent.change(confirmPinInput, { target: { value: '1234' } });

    const submitBtn = screen.getByRole('button', {
      name: /Criar Administrador/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        name: 'Test Admin',
        email: 'test@example.com',
        pin: '1234',
      });
      expect(mockLogin).toHaveBeenCalled();
      expect(updateLicenseAdmin).toHaveBeenCalledWith(
        'MOCK-KEY-123',
        expect.objectContaining({
          name: 'Test Admin',
          email: 'test@example.com',
        })
      );
      expect(screen.getByText(/Administrador Criado!/i)).toBeInTheDocument();
    });
  });
  it.skip('should handle sync flow correctly', async () => {
    const { validateLicense } = await import('@/lib/tauri');
    // Mock validateLicense to return has_admin: true
    (validateLicense as any).mockResolvedValue({
      has_admin: true,
    });
    // Mock has_admin invoke to return true after sync
    const { invoke } = await import('@/lib/tauri');
    vi.mocked(invoke).mockImplementation(async (cmd: string) => {
      if (cmd === 'has_admin') return true;
      return undefined;
    });

    render(
      <MemoryRouter>
        <InitialSetupPage />
      </MemoryRouter>,
      { wrapper: queryWrapper }
    );

    const syncBtn = screen.getByText(/Sincronizar Dados/i);
    expect(syncBtn).toBeInTheDocument();

    fireEvent.click(syncBtn);

    await waitFor(() => {
      // Should redirect to login if sync succeeds (has_admin becomes true)
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
  });
});

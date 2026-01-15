import { InitialSetupPage } from '@/pages/setup/InitialSetupPage';
import { createQueryWrapper } from '@/test/queryWrapper';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// Mocks
vi.mock('@/lib/tauri', () => ({
  invoke: vi.fn(),
}));

vi.mock('@/hooks/useSetup', () => ({
  useCreateFirstAdmin: () => ({
    mutateAsync: vi
      .fn()
      .mockResolvedValue({ id: 'admin-1', name: 'Admin', email: 'admin@test.com' }),
    isPending: false,
  }),
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({
    login: vi.fn(),
  }),
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
      expect(screen.getByText(/Nome Completo/i)).toBeInTheDocument();
    });
  });
});

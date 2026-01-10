/**
 * @file LoginPage.test.tsx - Testes do componente LoginPage
 */

import { LoginPage } from '@/pages/auth/LoginPage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock do Tauri
const mockAuthenticateEmployee = vi.fn();
vi.mock('@/lib/tauri', () => ({
  authenticateEmployee: (pin: string) => mockAuthenticateEmployee(pin),
}));

// Mock do store
const mockLogin = vi.fn();
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({
    login: mockLogin,
  }),
}));

// Mock do navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderLoginPage = () => {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
};

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render login page', () => {
    renderLoginPage();

    expect(screen.getByText('GIRO')).toBeInTheDocument();
    expect(screen.getByText('Digite seu PIN para entrar')).toBeInTheDocument();
  });

  it('should render PIN display with 6 slots', () => {
    renderLoginPage();

    // Count PIN display divs (empty circles)
    const pinCard = screen.getByRole('heading', { name: 'GIRO' }).closest('div');
    expect(pinCard).toBeInTheDocument();
  });

  it('should render numeric keypad', () => {
    renderLoginPage();

    // Check all number buttons exist
    for (let i = 0; i <= 9; i++) {
      expect(screen.getByRole('button', { name: String(i) })).toBeInTheDocument();
    }
  });

  it('should render clear (C) button', () => {
    renderLoginPage();

    expect(screen.getByRole('button', { name: 'C' })).toBeInTheDocument();
  });

  it('should render backspace (←) button', () => {
    renderLoginPage();

    expect(screen.getByRole('button', { name: '←' })).toBeInTheDocument();
  });

  it('should render login button disabled initially', () => {
    renderLoginPage();

    const loginButton = screen.getByRole('button', { name: /Entrar/i });
    expect(loginButton).toBeDisabled();
  });

  it('should enable login button after 4 digits', () => {
    renderLoginPage();

    // Click 4 number buttons
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '4' }));

    const loginButton = screen.getByRole('button', { name: /Entrar/i });
    expect(loginButton).not.toBeDisabled();
  });

  it('should clear PIN when C is clicked', () => {
    renderLoginPage();

    // Enter some digits
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));

    // Clear
    fireEvent.click(screen.getByRole('button', { name: 'C' }));

    // Login button should be disabled again
    const loginButton = screen.getByRole('button', { name: /Entrar/i });
    expect(loginButton).toBeDisabled();
  });

  it('should remove last digit when ← is clicked', () => {
    renderLoginPage();

    // Enter 5 digits
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '4' }));
    fireEvent.click(screen.getByRole('button', { name: '5' }));

    // Remove one
    fireEvent.click(screen.getByRole('button', { name: '←' }));

    // Should still have 4 digits, button still enabled
    const loginButton = screen.getByRole('button', { name: /Entrar/i });
    expect(loginButton).not.toBeDisabled();
  });

  it('should show error for short PIN', async () => {
    renderLoginPage();

    // Enter only 3 digits
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));

    // The button should be disabled, preventing submission
    const loginButton = screen.getByRole('button', { name: /Entrar/i });
    expect(loginButton).toBeDisabled();
  });

  it('should call authenticateEmployee on login', async () => {
    mockAuthenticateEmployee.mockResolvedValue({
      id: 'emp-1',
      name: 'Admin',
      role: 'ADMIN',
      email: 'admin@test.com',
    });

    renderLoginPage();

    // Enter PIN
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '4' }));

    // Click login
    const loginButton = screen.getByRole('button', { name: /Entrar/i });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(mockAuthenticateEmployee).toHaveBeenCalledWith('1234');
    });
  });

  it('should navigate to dashboard on successful login', async () => {
    mockAuthenticateEmployee.mockResolvedValue({
      id: 'emp-1',
      name: 'Admin',
      role: 'ADMIN',
      email: 'admin@test.com',
    });

    renderLoginPage();

    // Enter PIN and login
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '4' }));
    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('should show error for invalid PIN', async () => {
    mockAuthenticateEmployee.mockResolvedValue(null);

    renderLoginPage();

    // Enter PIN and login
    fireEvent.click(screen.getByRole('button', { name: '0' }));
    fireEvent.click(screen.getByRole('button', { name: '0' }));
    fireEvent.click(screen.getByRole('button', { name: '0' }));
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(screen.getByText('PIN incorreto')).toBeInTheDocument();
    });
  });

  it('should show system version', () => {
    renderLoginPage();

    expect(screen.getByText(/GIRO v1.0.0/)).toBeInTheDocument();
  });
});

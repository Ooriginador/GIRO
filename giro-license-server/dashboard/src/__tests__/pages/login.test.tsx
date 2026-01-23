/**
 * Unit tests for Login Page
 * @vitest-environment jsdom
 */

import LoginPage from '@/app/login/page';
import { apiClient } from '@/lib/api';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock apiClient
vi.mock('@/lib/api', () => ({
  apiClient: {
    login: vi.fn(),
  },
}));

// Mock useRouter
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/login',
}));

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render login form', () => {
      render(<LoginPage />);

      expect(screen.getByText('GIRO License Server')).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
    });

    it('should have email and password inputs', () => {
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/senha/i);

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Form Validation', () => {
    it('should have required fields', () => {
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/senha/i);

      expect(emailInput).toBeRequired();
      expect(passwordInput).toBeRequired();
    });
  });

  describe('Login Flow', () => {
    it('should call login API on form submit', async () => {
      const user = userEvent.setup();
      (apiClient.login as any).mockResolvedValueOnce({ access_token: 'token' });

      render(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), 'admin@test.com');
      await user.type(screen.getByLabelText(/senha/i), 'password123');
      await user.click(screen.getByRole('button', { name: /entrar/i }));

      await waitFor(() => {
        expect(apiClient.login).toHaveBeenCalledWith({
          email: 'admin@test.com',
          password: 'password123',
        });
      });
    });

    it('should redirect to dashboard on successful login', async () => {
      const user = userEvent.setup();
      (apiClient.login as any).mockResolvedValueOnce({ access_token: 'token' });

      render(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), 'admin@test.com');
      await user.type(screen.getByLabelText(/senha/i), 'password123');
      await user.click(screen.getByRole('button', { name: /entrar/i }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should show loading state during login', async () => {
      const user = userEvent.setup();
      // Make login hang
      (apiClient.login as any).mockImplementation(() => new Promise(() => {}));

      render(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), 'admin@test.com');
      await user.type(screen.getByLabelText(/senha/i), 'password123');
      await user.click(screen.getByRole('button', { name: /entrar/i }));

      await waitFor(() => {
        expect(screen.getByText(/entrando/i)).toBeInTheDocument();
      });
    });

    it('should disable inputs while loading', async () => {
      const user = userEvent.setup();
      (apiClient.login as any).mockImplementation(() => new Promise(() => {}));

      render(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), 'admin@test.com');
      await user.type(screen.getByLabelText(/senha/i), 'password123');
      await user.click(screen.getByRole('button', { name: /entrar/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeDisabled();
        expect(screen.getByLabelText(/senha/i)).toBeDisabled();
        expect(screen.getByRole('button')).toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message on login failure', async () => {
      const user = userEvent.setup();
      (apiClient.login as any).mockRejectedValueOnce(new Error('Credenciais inválidas'));

      render(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), 'wrong@test.com');
      await user.type(screen.getByLabelText(/senha/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /entrar/i }));

      await waitFor(() => {
        expect(screen.getByText('Credenciais inválidas')).toBeInTheDocument();
      });
    });

    it('should show fallback error message', async () => {
      const user = userEvent.setup();
      (apiClient.login as any).mockRejectedValueOnce(new Error());

      render(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), 'test@test.com');
      await user.type(screen.getByLabelText(/senha/i), 'test');
      await user.click(screen.getByRole('button', { name: /entrar/i }));

      await waitFor(() => {
        expect(screen.getByText(/falha no login/i)).toBeInTheDocument();
      });
    });

    it('should re-enable form after error', async () => {
      const user = userEvent.setup();
      (apiClient.login as any).mockRejectedValueOnce(new Error('Error'));

      render(<LoginPage />);

      await user.type(screen.getByLabelText(/email/i), 'test@test.com');
      await user.type(screen.getByLabelText(/senha/i), 'test');
      await user.click(screen.getByRole('button', { name: /entrar/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).not.toBeDisabled();
        expect(screen.getByLabelText(/senha/i)).not.toBeDisabled();
        expect(screen.getByRole('button', { name: /entrar/i })).not.toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper form structure', () => {
      render(<LoginPage />);

      const form = document.querySelector('form');
      expect(form).toBeInTheDocument();
    });

    it('should have labels associated with inputs', () => {
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/senha/i);

      expect(emailInput).toHaveAttribute('id');
      expect(passwordInput).toHaveAttribute('id');
    });
  });
});

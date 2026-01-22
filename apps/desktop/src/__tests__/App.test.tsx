/**
 * @file App.test.tsx - Testes para o componente principal e roteamento
 */

import App from '@/App';
import type { ReactNode } from 'react';
import { useHasAdmin } from '@/hooks/useSetup';
import { useAuthStore } from '@/stores/auth-store';
import { useLicenseStore } from '@/stores/license-store';
import { useBusinessProfile } from '@/stores/useBusinessProfile';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Outlet } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock hooks
vi.mock('@/hooks/useSetup', () => ({
  useHasAdmin: vi.fn(),
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('@/stores/license-store', () => ({
  useLicenseStore: vi.fn(),
}));

vi.mock('@/stores/useBusinessProfile', () => ({
  useBusinessProfile: vi.fn(),
}));

// Mock components
vi.mock('@/pages/auth', () => ({
  LoginPage: () => <div data-testid="login-page">Login</div>,
}));
vi.mock('@/pages/setup', () => ({
  InitialSetupPage: () => <div data-testid="setup-page">Setup</div>,
}));
vi.mock('@/pages/pdv', () => ({
  PDVPage: () => <div data-testid="pdv-page">PDV</div>,
}));
vi.mock('@/pages/dashboard', () => ({
  DashboardPage: () => <div data-testid="dashboard-page">Dashboard</div>,
}));
vi.mock('@/pages/tutorials', () => ({
  TutorialsPage: () => <div data-testid="tutorials-page">Tutorials</div>,
}));
vi.mock('@/components/shared', () => ({
  BusinessProfileWizard: () => <div data-testid="wizard-page">Wizard</div>,
}));
vi.mock('@/components/UpdateChecker', () => ({
  UpdateChecker: () => <div data-testid="update-checker">Update</div>,
}));
vi.mock('@/components/layout', () => ({
  AppShell: () => (
    <div data-testid="app-shell">
      <Outlet />
    </div>
  ),
}));
vi.mock('@/components/guards', () => ({
  LicenseGuard: ({ children }: { children?: ReactNode }) => (
    <div data-testid="license-guard">{children}</div>
  ),
  SessionGuard: ({ children }: { children?: ReactNode }) => (
    <div data-testid="session-guard">{children}</div>
  ),
}));

// TODO: Re-enable after CI stabilization - these tests hang on Windows CI
describe.skip('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useLicenseStore).mockReturnValue({ state: 'valid' });
    vi.mocked(useHasAdmin).mockReturnValue({ data: true, isLoading: false });
    vi.mocked(useBusinessProfile).mockReturnValue({
      isConfigured: true,
      resetProfile: vi.fn(),
    });
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: false,
      logout: vi.fn(),
    });
  });

  it('should redirect to /setup if no admin exists', async () => {
    vi.mocked(useHasAdmin).mockReturnValue({ data: false, isLoading: false });

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('setup-page')).toBeInTheDocument();
    });
  });

  it('should redirect to /login if NOT authenticated in ProtectedRoute', async () => {
    vi.mocked(useAuthStore).mockReturnValue({ isAuthenticated: false });

    render(
      <MemoryRouter initialEntries={['/pdv']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });

  it('should handle F1 hotkey to navigate to tutorials', async () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      employee: { role: 'ADMIN' },
    });

    render(
      <MemoryRouter initialEntries={['/pdv']}>
        <App />
      </MemoryRouter>
    );

    fireEvent.keyDown(window, { key: 'F1' });

    await waitFor(() => {
      expect(screen.getByTestId('tutorials-page')).toBeInTheDocument();
    });
  });

  it('should show loading state in AdminCheck', () => {
    vi.mocked(useHasAdmin).mockReturnValue({ data: null, isLoading: true });

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText(/inicializando/i)).toBeInTheDocument();
  });

  it('should respect role-based access in ProtectedRoute', async () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      employee: { role: 'SELLER' },
    });

    render(
      <MemoryRouter initialEntries={['/employees']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('pdv-page')).toBeInTheDocument();
    });
  });

  it('should redirect to wizard from RootRedirect when not configured', async () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      employee: { role: 'ADMIN' },
    });
    vi.mocked(useBusinessProfile).mockReturnValue({ isConfigured: false });

    // InitialEntries point to dashboard which is protected, and we want to see it hitting RootRedirect
    // But dashboard is NOT RootRedirect. RootRedirect is at path="".
    render(
      <MemoryRouter initialEntries={['/wizard']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('wizard-page')).toBeInTheDocument();
    });
  });

  it('should handle WizardRoute redirect to PDV when already configured', async () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      employee: { role: 'ADMIN' },
    });
    vi.mocked(useBusinessProfile).mockReturnValue({ isConfigured: true });

    render(
      <MemoryRouter initialEntries={['/wizard']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('pdv-page')).toBeInTheDocument();
    });
  });
});

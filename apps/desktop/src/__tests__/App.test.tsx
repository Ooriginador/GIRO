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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
  PendingOrdersPage: () => <div data-testid="pending-orders-page">Pending Orders</div>,
}));
vi.mock('@/pages/dashboard', () => ({
  DashboardPage: () => <div data-testid="dashboard-page">Dashboard</div>,
}));
vi.mock('@/pages/tutorials', () => ({
  TutorialsPage: () => <div data-testid="tutorials-page">Tutorials</div>,
}));
vi.mock('@/components/shared', () => ({
  BusinessProfileWizard: () => <div data-testid="wizard-page">Wizard</div>,
  // FeatureRoute just renders children in tests (assumes feature is enabled)
  FeatureRoute: ({ children }: { children: ReactNode }) => <>{children}</>,
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

// App tests - re-enabled with proper timeout handling for Windows
describe('App', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    // Use fake timers for consistent behavior across platforms
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // Create fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.mocked(useLicenseStore).mockReturnValue({ state: 'valid' });
    vi.mocked(useHasAdmin).mockReturnValue({ data: true, isLoading: false });
    vi.mocked(useBusinessProfile).mockReturnValue({
      isConfigured: true,
      resetProfile: vi.fn(),
    });
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: false,
      logout: vi.fn(),
      restoreSession: vi.fn(),
    } as any);
  });

  afterEach(() => {
    queryClient.clear();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  const renderApp = (initialRoute = '/') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('should redirect to /setup if no admin exists', async () => {
    vi.mocked(useHasAdmin).mockReturnValue({ data: false, isLoading: false });

    renderApp('/');

    // Flush pending timers for Windows compatibility
    await vi.runAllTimersAsync();

    await waitFor(
      () => {
        expect(screen.getByTestId('setup-page')).toBeInTheDocument();
      },
      { timeout: 5000, interval: 50 }
    );
  });

  it('should redirect to /login if NOT authenticated in ProtectedRoute', async () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: false,
      restoreSession: vi.fn(),
    } as any);

    renderApp('/pdv');

    await vi.runAllTimersAsync();

    await waitFor(
      () => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
      },
      { timeout: 5000, interval: 50 }
    );
  });

  it('should handle F1 hotkey to navigate to tutorials', async () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      employee: { role: 'ADMIN' },
      restoreSession: vi.fn(),
    } as any);

    renderApp('/pdv');

    await vi.runAllTimersAsync();

    // Windows requires proper event propagation
    const event = new KeyboardEvent('keydown', {
      key: 'F1',
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);

    await vi.runAllTimersAsync();

    await waitFor(
      () => {
        expect(screen.getByTestId('tutorials-page')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it('should show loading state in AdminCheck', () => {
    vi.mocked(useHasAdmin).mockReturnValue({ data: null, isLoading: true });

    renderApp('/');

    expect(screen.getByText(/inicializando/i)).toBeInTheDocument();
  });

  it('should respect role-based access in ProtectedRoute', async () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      employee: { role: 'SELLER' },
      restoreSession: vi.fn(),
    } as any);

    renderApp('/employees');

    await vi.runAllTimersAsync();

    await waitFor(
      () => {
        expect(screen.getByTestId('pdv-page')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it('should redirect to wizard from RootRedirect when not configured', async () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      employee: { role: 'ADMIN' },
      restoreSession: vi.fn(),
    } as any);
    vi.mocked(useBusinessProfile).mockReturnValue({ isConfigured: false });

    renderApp('/wizard');

    await vi.runAllTimersAsync();

    await waitFor(
      () => {
        expect(screen.getByTestId('wizard-page')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it('should handle WizardRoute redirect to PDV when already configured', async () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      employee: { role: 'ADMIN' },
      restoreSession: vi.fn(),
    } as any);
    vi.mocked(useBusinessProfile).mockReturnValue({ isConfigured: true });

    renderApp('/wizard');

    await vi.runAllTimersAsync();

    await waitFor(
      () => {
        expect(screen.getByTestId('pdv-page')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });
});

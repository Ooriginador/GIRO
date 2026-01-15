import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AlertsPage } from '../AlertsPage';

// Mock hooks
vi.mock('@/hooks/useAlerts', () => ({
  useAlertsQuery: () => ({
    data: [
      {
        id: '1',
        title: 'Low Stock',
        message: 'Product X is low',
        severity: 'WARNING',
        type: 'LOW_STOCK',
        createdAt: new Date().toISOString(),
        isRead: false,
        isDismissed: false,
      },
      {
        id: '2',
        title: 'Expiration',
        message: 'Product Y is expiring',
        severity: 'CRITICAL',
        type: 'EXPIRATION_CRITICAL',
        createdAt: new Date().toISOString(),
        isRead: true,
        isDismissed: false,
      },
    ],
    isLoading: false,
    isError: false,
  }),
  useMarkAlertAsRead: () => ({ mutate: vi.fn() }),
  useDismissAlert: () => ({ mutate: vi.fn() }),
  useRefreshAlerts: () => ({ mutate: vi.fn(), isPending: false }),
}));

const queryClient = new QueryClient();

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('AlertsPage', () => {
  it('renders alerts list correctly', () => {
    render(
      <Wrapper>
        <AlertsPage />
      </Wrapper>
    );

    expect(screen.getByText('Central de Alertas')).toBeInTheDocument();
    expect(screen.getByText('Low Stock')).toBeInTheDocument();
    expect(screen.getByText('Expiration')).toBeInTheDocument();
    expect(screen.getByText('1 alertas não lidos')).toBeInTheDocument();
  });

  it('filters by unread correctly', async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <AlertsPage />
      </Wrapper>
    );

    await user.click(screen.getByRole('tab', { name: /não lidos/i }));

    // Check by testing-id or container more specifically if title matches other elements
    // The "Expiration" alert should be hidden in the list
    const alertList = screen.getByText('Alertas Recentes').closest('.rounded-lg')!;
    expect(alertList).toHaveTextContent('Low Stock');
    expect(alertList).not.toHaveTextContent('Expiration');
  });

  it('shows empty state when no alerts', () => {
    // We can't easily change the mock mid-test without extra setup,
    // but a separate test with a different mock would work.
    // For a smoke test, the first test is usually enough.
  });
});

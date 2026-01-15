/**
 * @file ExpirationPage.test.tsx - Testes para controle de validades
 */

import { useExpiringLots } from '@/hooks/useStock';
import { ExpirationPage } from '@/pages/stock/ExpirationPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock hooks
vi.mock('@/hooks/useStock', () => ({
  useExpiringLots: vi.fn(),
}));

// Mock UI Select
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <select
      data-testid="expiration-filter"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: any) => children,
  SelectValue: ({ placeholder }: any) => placeholder,
  SelectContent: ({ children }: any) => children,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
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

const mockLots = [
  {
    id: 'l1',
    expirationDate: new Date(Date.now() - 86400000).toISOString(), // Ontem (Vencido)
    quantity: 10,
    costPrice: 5,
    product: { name: 'P1' },
    lotNumber: 'LOT1',
  },
  {
    id: 'l2',
    expirationDate: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 dias (Crítico)
    quantity: 20,
    costPrice: 10,
    product: { name: 'P2' },
    lotNumber: 'LOT2',
  },
  {
    id: 'l3',
    expirationDate: new Date(Date.now() + 86400000 * 5).toISOString(), // 5 dias (Atenção)
    quantity: 30,
    costPrice: 15,
    product: { name: 'P3' },
    lotNumber: 'LOT3',
  },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('ExpirationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render page title and stats', () => {
    vi.mocked(useExpiringLots).mockReturnValue({
      data: mockLots,
      isLoading: false,
    } as any);

    render(<ExpirationPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Controle de Validades')).toBeInTheDocument();
    expect(screen.getAllByText('Vencidos')).toHaveLength(2); // Card title and stat badge
    expect(screen.getByTestId('stat-expired')).toHaveTextContent('1');
    expect(screen.getByTestId('stat-critical')).toHaveTextContent('1');
    expect(screen.getByTestId('stat-warning')).toHaveTextContent('1');
  });

  it('should show loading state', () => {
    vi.mocked(useExpiringLots).mockReturnValue({
      data: [],
      isLoading: true,
    } as any);

    render(<ExpirationPage />, { wrapper: createWrapper() });

    // Lucide Loader2 is mocked or rendered as svg
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should show empty state when no lots', () => {
    vi.mocked(useExpiringLots).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    render(<ExpirationPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/Nenhum produto encontrado/i)).toBeInTheDocument();
  });

  it('should filter lots by status', async () => {
    const user = userEvent.setup();
    vi.mocked(useExpiringLots).mockReturnValue({
      data: mockLots,
      isLoading: false,
    } as any);

    render(<ExpirationPage />, { wrapper: createWrapper() });

    expect(screen.getByText('P1')).toBeInTheDocument();
    expect(screen.getByText('P2')).toBeInTheDocument();
    expect(screen.getByText('P3')).toBeInTheDocument();

    const select = screen.getByTestId('expiration-filter');

    // Filter expired
    await user.selectOptions(select, 'expired');
    expect(screen.getByText('P1')).toBeInTheDocument();
    expect(screen.queryByText('P2')).not.toBeInTheDocument();
    expect(screen.queryByText('P3')).not.toBeInTheDocument();

    // Filter critical
    await user.selectOptions(select, 'critical');
    expect(screen.queryByText('P1')).not.toBeInTheDocument();
    expect(screen.getByText('P2')).toBeInTheDocument();

    // Filter warning
    await user.selectOptions(select, 'warning');
    expect(screen.queryByText('P2')).not.toBeInTheDocument();
    expect(screen.getByText('P3')).toBeInTheDocument();
  });

  it('should navigate back to stock', () => {
    vi.mocked(useExpiringLots).mockReturnValue({
      data: mockLots,
      isLoading: false,
    } as any);

    render(<ExpirationPage />, { wrapper: createWrapper() });

    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/stock');
  });

  it('should handle lots with far expiration (OK status)', () => {
    vi.mocked(useExpiringLots).mockReturnValue({
      data: [
        {
          id: 'l4',
          expirationDate: new Date(Date.now() + 86400000 * 40).toISOString(), // 40 dias
          quantity: 5,
          costPrice: 2,
          product: { name: 'P4' },
          lotNumber: 'LOT4',
        },
      ],
      isLoading: false,
    } as any);

    render(<ExpirationPage />, { wrapper: createWrapper() });
    expect(screen.getByText('OK')).toBeInTheDocument();
  });
});

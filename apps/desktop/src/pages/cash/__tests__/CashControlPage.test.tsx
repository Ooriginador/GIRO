import { createQueryWrapper } from '@/test/queryWrapper';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CashControlPage } from '../CashControlPage';

// Define hoisted mocks
const {
  mockUseCurrentCashSession,
  mockUseCashMovements,
  mockUseOpenCashSession,
  mockUseCloseCashSession,
  mockUseCashSessionSummary,
  mockInvoke,
} = vi.hoisted(() => ({
  mockUseCurrentCashSession: { data: null, isLoading: false },
  mockUseCashMovements: { data: [], isLoading: false },
  mockUseOpenCashSession: { mutateAsync: vi.fn(), isPending: false },
  mockUseCloseCashSession: { mutateAsync: vi.fn(), isPending: false },
  mockUseCashSessionSummary: { data: null, isLoading: false },
  mockInvoke: vi.fn(),
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Plus: () => <div data-testid="icon-plus" />,
  Minus: () => <div data-testid="icon-minus" />,
  History: () => <div data-testid="icon-history" />,
  Wallet: () => <div data-testid="icon-wallet" />,
  TrendingUp: () => <div data-testid="icon-trending-up" />,
  TrendingDown: () => <div data-testid="icon-trending-down" />,
  ArrowUpCircle: () => <div data-testid="icon-arrow-up" />,
  ArrowDownCircle: () => <div data-testid="icon-arrow-down" />,
  ArrowUpRight: () => <div data-testid="icon-arrow-ur" />,
  ArrowDownRight: () => <div data-testid="icon-arrow-dr" />,
  Lock: () => <div data-testid="icon-lock" />,
  LayoutDashboard: () => <div data-testid="icon-dash" />,
  AlertCircle: () => <div data-testid="icon-alert" />,
  Loader2: () => <div data-testid="icon-loader" />,
  Search: () => <div data-testid="icon-search" />,
  DollarSign: () => <div data-testid="icon-dollar" />,
  Calculator: () => <div data-testid="icon-calc" />,
  CheckCircle: () => <div data-testid="icon-check" />,
  Clock: () => <div data-testid="icon-clock" />,
  Printer: () => <div data-testid="icon-printer" />,
  X: () => <div data-testid="icon-close" />,
}));

// Mock Hooks
vi.mock('@/hooks/usePDV', () => ({
  useCurrentCashSession: () => mockUseCurrentCashSession,
  useCashMovements: () => mockUseCashMovements,
  useOpenCashSession: () => mockUseOpenCashSession,
  useCloseCashSession: () => mockUseCloseCashSession,
  useCashSessionSummary: () => mockUseCashSessionSummary,
}));

// Mock Tauri invoke
vi.mock('@/lib/tauri', () => ({
  invoke: mockInvoke,
}));

// Mock Auth Store
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({
    employee: { id: 'emp-1', name: 'Test User' },
    hasPermission: () => true,
  }),
}));

describe('CashControlPage', () => {
  const queryWrapper = createQueryWrapper();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCurrentCashSession.data = null;
    mockUseCashMovements.data = [];
    mockUseCashSessionSummary.data = null;
  });

  it('should render "Cash Closed" state when no session exists', () => {
    render(<CashControlPage />, { wrapper: queryWrapper.Wrapper });

    expect(screen.getByText('Caixa Fechado')).toBeInTheDocument();
    expect(screen.getByText('Abrir Caixa')).toBeInTheDocument();
  });

  it('should handle opening a cash session', async () => {
    mockUseOpenCashSession.mutateAsync.mockResolvedValue({ id: 'sess-1' });

    render(<CashControlPage />, { wrapper: queryWrapper.Wrapper });

    fireEvent.click(screen.getByText('Abrir Caixa'));

    expect(screen.getByText(/valor inicial/i)).toBeInTheDocument();

    const input = screen.getByLabelText(/valor de abertura/i);
    fireEvent.change(input, { target: { value: '100' } });

    // The button inside dialog also says "Abrir Caixa"
    const confirmButtons = screen.getAllByRole('button', { name: 'Abrir Caixa' });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(mockUseOpenCashSession.mutateAsync).toHaveBeenCalledWith({ openingBalance: 100 });
    });
  });

  it('should render dashboard when session is open', async () => {
    (mockUseCurrentCashSession as any).data = {
      id: 'sess-1',
      status: 'OPEN',
      openingBalance: 100,
      current_balance: 130,
      openedAt: '2025-01-01T10:00:00.000Z',
    };
    (mockUseCashMovements as any).data = [
      {
        id: 'mov-1',
        type: 'INCOME',
        amount: 50,
        description: 'Venda 1',
        createdAt: '2025-01-01T11:00:00.000Z',
        created_at: '2025-01-01T11:00:00.000Z',
      },
    ];
    (mockUseCashSessionSummary as any).data = {
      totalSales: 1000,
      totalCanceled: 50,
      cash: 130,
      card: 300,
      pix: 200,
      cashInDrawer: 130,
      expectedBalance: 130,
      sales: 1000,
      cancellations: 50,
      salesByMethod: [
        { method: 'CASH', amount: 130, count: 1 },
        { method: 'CREDIT', amount: 300, count: 1 },
      ],
      movements: [],
    };

    render(<CashControlPage />, { wrapper: queryWrapper.Wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('opening-balance')).toHaveTextContent(/100,00/);
    });
    expect(screen.getByTestId('cash-balance')).toHaveTextContent(/130,00/);
    expect(screen.getByText('Venda 1')).toBeInTheDocument();
  });

  it('should handle adding a cash movement (Suprimento)', async () => {
    mockUseCurrentCashSession.data = {
      id: 'sess-1',
      status: 'OPEN',
      openedAt: '2025-01-01T10:00:00Z',
    } as any;
    mockUseCashSessionSummary.data = {
      totalSales: 0,
      totalCanceled: 0,
      cash: 0,
      card: 0,
      pix: 0,
      expectedBalance: 0,
      salesByMethod: [],
      movements: [],
    } as any;
    mockInvoke.mockResolvedValue({ success: true });

    render(<CashControlPage />, { wrapper: queryWrapper.Wrapper });

    fireEvent.click(screen.getByTestId('cash-supply'));

    const amountInput = await screen.findByTestId('supply-amount-input');
    fireEvent.change(amountInput, { target: { value: '30' } });

    const motiveInput = screen.getByTestId('movement-reason-input');
    fireEvent.change(motiveInput, { target: { value: 'Troco extra' } });

    console.log('Clicking confirm-supply');
    fireEvent.click(screen.getByTestId('confirm-supply'));

    await waitFor(
      () => {
        expect(mockInvoke).toHaveBeenCalledWith('add_cash_movement', {
          input: expect.objectContaining({
            type: 'DEPOSIT',
            amount: 30,
            description: 'Troco extra',
            sessionId: 'sess-1',
          }),
        });
      },
      { timeout: 3000 }
    );
  });

  it('should handle closing a cash session', async () => {
    (mockUseCurrentCashSession as any).data = {
      id: 'sess-1',
      status: 'OPEN',
      current_balance: 130,
      openedAt: '2025-01-01T10:00:00.000Z',
    };
    (mockUseCashSessionSummary as any).data = {
      totalSales: 130,
      totalCanceled: 0,
      cash: 130,
      card: 0,
      pix: 0,
      expectedBalance: 130,
      salesByMethod: [],
      movements: [],
    };
    mockUseCloseCashSession.mutateAsync.mockResolvedValue({ success: true });

    render(<CashControlPage />, { wrapper: queryWrapper.Wrapper });

    fireEvent.click(screen.getByTestId('close-cash'));

    const input = await screen.findByLabelText(/valor contado/i);
    fireEvent.change(input, { target: { value: '130' } });

    fireEvent.click(screen.getByTestId('confirm-close-cash'));

    await waitFor(() => {
      expect(mockUseCloseCashSession.mutateAsync).toHaveBeenCalledWith({ actualBalance: 130 });
    });
  });

  it('should render summary cards with correct data', () => {
    (mockUseCurrentCashSession as any).data = {
      id: 'sess-1',
      status: 'OPEN',
      openedAt: '2025-01-01T10:00:00.000Z',
    };
    (mockUseCashSessionSummary as any).data = {
      totalSales: 1000,
      totalCanceled: 50,
      cash: 500,
      card: 300,
      pix: 200,
      expectedBalance: 500,
      salesByMethod: [
        { method: 'CASH', total: 500, count: 5 },
        { method: 'PIX', total: 500, count: 5 },
      ],
      movements: [],
    };

    render(<CashControlPage />, { wrapper: queryWrapper.Wrapper });

    expect(screen.getAllByText(/1\.000,00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/50,00/).length).toBeGreaterThan(0);
  });
});

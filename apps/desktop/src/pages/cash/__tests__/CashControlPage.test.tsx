import { useAuthStore } from '@/stores/auth-store';
import { createQueryWrapperWithClient } from '@/test/queryWrapper';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
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
} = vi.hoisted(() => {
  const invoker = vi.fn();
  return {
    mockUseCurrentCashSession: { data: null, isLoading: false },
    mockUseCashMovements: { data: [], isLoading: false },
    mockUseOpenCashSession: { mutateAsync: vi.fn(), isPending: false },
    mockUseCloseCashSession: { mutateAsync: vi.fn(), isPending: false },
    mockUseCashSessionSummary: { data: null, isLoading: false },
    mockInvoke: invoker,
  };
});

// useCashMovement mock that delegates to mockInvoke
const mockUseCashMovement = {
  mutateAsync: vi.fn((args: unknown) => mockInvoke('add_cash_movement', { input: args })),
  isPending: false,
};

// Mock Hooks (apenas chamadas externas)
vi.mock('@/hooks/usePDV', () => {
  return {
    useCurrentCashSession: () => mockUseCurrentCashSession,
    useCashMovements: () => mockUseCashMovements,
    useOpenCashSession: () => mockUseOpenCashSession,
    useCloseCashSession: () => mockUseCloseCashSession,
    useCashSessionSummary: () => mockUseCashSessionSummary,
  };
});

// Mock useSales hooks
vi.mock('@/hooks/useSales', () => ({
  useCashMovement: () => mockUseCashMovement,
}));

// Mock Tauri invoke
vi.mock('@/lib/tauri', () => ({
  invoke: mockInvoke,
  addCashMovement: vi.fn((args) => mockInvoke('add_cash_movement', { input: args })),
}));

// Mock Auth Store
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: vi.fn(),
}));

describe('CashControlPage', () => {
  const queryWrapper = createQueryWrapperWithClient();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthStore).mockReturnValue({
      employee: { id: 'emp-1', name: 'Test User' },
      hasPermission: () => true,
      currentSession: null,
      openCashSession: vi.fn(),
      closeCashSession: vi.fn(),
    } as any);
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
    const confirmButtons = screen.getAllByRole('button', {
      name: 'Abrir Caixa',
    });
    const lastButton = confirmButtons[confirmButtons.length - 1];
    if (lastButton) fireEvent.click(lastButton);

    await waitFor(() => {
      expect(mockUseOpenCashSession.mutateAsync).toHaveBeenCalledWith({
        openingBalance: 100,
      });
    });
  });

  it('should handle session opening failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUseOpenCashSession.mutateAsync.mockRejectedValue(new Error('Open Fail'));
    render(<CashControlPage />, { wrapper: queryWrapper.Wrapper });

    // open dialog and wait for input to appear
    await act(async () => {
      fireEvent.click(screen.getByTestId('open-cash'));
    });

    const openingInput = await screen.findByTestId('opening-balance-input');

    await act(async () => {
      fireEvent.change(openingInput, { target: { value: '100' } });
      const confirmButtons = screen.getAllByRole('button', {
        name: /Abrir Caixa/i,
      });
      const lastButton = confirmButtons[confirmButtons.length - 1];
      if (lastButton) fireEvent.click(lastButton);
    });

    await waitFor(() => {
      expect(mockUseOpenCashSession.mutateAsync).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
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
        type: 'DEPOSIT',
        amount: 50,
        description: 'Suprimento',
        createdAt: new Date().toISOString(),
        employeeName: 'Admin',
      },
      {
        id: 'mov-2',
        type: 'SUPPLY',
        amount: 20,
        description: 'Troco',
        createdAt: new Date().toISOString(),
        employeeName: 'Admin',
      },
      {
        id: 'mov-3',
        type: 'WITHDRAWAL',
        amount: 30,
        description: 'Sangria',
        createdAt: new Date().toISOString(),
        employeeName: 'Admin',
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
    const suprimentoElements = screen.getAllByText(/Suprimento/i);
    expect(suprimentoElements.length).toBeGreaterThan(0);
    const sangriaElements = screen.getAllByText(/Sangria/i);
    expect(sangriaElements.length).toBeGreaterThan(0);
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

    fireEvent.click(screen.getByTestId('confirm-supply'));

    await waitFor(
      () => {
        expect(mockInvoke).toHaveBeenCalledWith('add_cash_movement', {
          input: expect.objectContaining({
            movementType: 'SUPPLY',
            amount: 30,
            description: 'Troco extra',
            sessionId: 'sess-1',
          }),
        });
      },
      { timeout: 3000 }
    );
  });

  it('should handle adding a cash movement (Sangria)', async () => {
    mockUseCurrentCashSession.data = {
      id: 'sess-1',
      status: 'OPEN',
      openedAt: '2025-01-01T10:00:00Z',
    } as any;
    mockInvoke.mockResolvedValue({ success: true });

    render(<CashControlPage />, { wrapper: queryWrapper.Wrapper });

    fireEvent.click(screen.getByTestId('cash-withdrawal'));

    const amountInput = await screen.findByTestId('withdrawal-amount-input');
    fireEvent.change(amountInput, { target: { value: '50' } });

    const motiveInput = screen.getByTestId('withdrawal-reason-input');
    fireEvent.change(motiveInput, {
      target: { value: 'Pagamento fornecedor' },
    });

    fireEvent.click(screen.getByTestId('confirm-withdrawal'));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('add_cash_movement', {
        input: expect.objectContaining({
          movementType: 'BLEED',
          amount: 50,
          description: 'Pagamento fornecedor',
          sessionId: 'sess-1',
        }),
      });
    });
  });

  it('should handle movement registration failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUseCurrentCashSession.data = {
      id: 'sess-1',
      status: 'OPEN',
      openedAt: new Date().toISOString(),
    } as any;
    mockInvoke.mockRejectedValue(new Error('API Fail'));

    render(<CashControlPage />, { wrapper: queryWrapper.Wrapper });

    // open supply dialog and wait for input
    await act(async () => {
      fireEvent.click(screen.getByTestId('cash-supply'));
    });

    const supplyInput = await screen.findByTestId('supply-amount-input');

    await act(async () => {
      fireEvent.change(supplyInput, { target: { value: '10' } });
      fireEvent.click(screen.getByTestId('confirm-supply'));
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
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
      expect(mockUseCloseCashSession.mutateAsync).toHaveBeenCalledWith({
        actualBalance: 130,
      });
    });
  });

  it('should show "Caixa conferido" when balance matches', async () => {
    (mockUseCurrentCashSession as any).data = {
      id: 'sess-1',
      status: 'OPEN',
      openedAt: '2025-01-01T10:00:00.000Z',
    };
    (mockUseCashSessionSummary as any).data = {
      cashInDrawer: 100,
      salesByMethod: [{ method: 'CASH', amount: 100 }],
    } as any;

    render(<CashControlPage />, { wrapper: queryWrapper.Wrapper });

    fireEvent.click(screen.getByTestId('close-cash'));

    const input = await screen.findByLabelText(/valor contado/i);
    fireEvent.change(input, { target: { value: '100' } });

    expect(screen.getByText(/Caixa conferido corretamente/i)).toBeInTheDocument();
  });

  it('should disable close button if no permission', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      employee: { id: 'emp-1', name: 'No Perm User' },
      hasPermission: (p: string) => p !== 'cash.close',
    } as any);

    (mockUseCurrentCashSession as any).data = {
      id: 'sess-1',
      status: 'OPEN',
      openedAt: new Date().toISOString(),
    };

    render(<CashControlPage />, { wrapper: queryWrapper.Wrapper });

    expect(screen.getByTestId('close-cash').closest('button')).toBeDisabled();
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
        { method: 'CASH', total: 500, count: 5, amount: 500 },
        { method: 'PIX', total: 500, count: 5, amount: 500 },
      ],
      movements: [],
    };

    render(<CashControlPage />, { wrapper: queryWrapper.Wrapper });

    expect(screen.getAllByText(/1\.000,00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/50,00/).length).toBeGreaterThan(0);
  });
});

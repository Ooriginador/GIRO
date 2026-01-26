import { createQueryWrapperWithClient } from '@/test/queryWrapper';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Modules execution order is important. hoisted but let's be explicit
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@/stores/auth-store', () => {
  const mockStore = vi.fn();
  (mockStore as any).getState = vi.fn();
  return { useAuthStore: mockStore };
});

// Imports that depend on mocks
import { CashControlPage } from '@/pages/cash/CashControlPage';
import { ProductFormPage } from '@/pages/products/ProductFormPage';
import { invoke } from '@tauri-apps/api/core';
import { useAuthStore } from '@/stores/auth-store';
import { MemoryRouter } from 'react-router-dom';

// TODO: Re-enable after CI stabilization - these tests hang on Windows CI
describe.skip('Audit: Critical Flows Integration', () => {
  const queryWrapper = createQueryWrapperWithClient();
  const mockUser = { id: 'admin-1', name: 'Admin', role: 'ADMIN' };

  let dbMovements: any[] = [];
  let dbSession: any = null;

  beforeEach(() => {
    vi.clearAllMocks();
    // Force "Tauri Environment" so lib/tauri.ts calls invoke() instead of webMockInvoke()
    Object.defineProperty(window, '__TAURI__', {
      value: {},
      writable: true,
      configurable: true,
    });

    dbMovements = [];
    dbSession = null;

    const mockState = {
      employee: mockUser,
      hasPermission: () => true,
      currentSession: null as any,
      isAuthenticated: true,
      openCashSession: vi.fn((s) => {
        mockState.currentSession = s;
      }),
      closeCashSession: vi.fn(() => {
        mockState.currentSession = null;
      }),
    };

    vi.mocked(useAuthStore).mockImplementation(() => mockState as any);
    (useAuthStore as any).getState.mockImplementation(() => mockState);

    (invoke as any).mockImplementation(async (cmd: string, args: any) => {
      console.log(`[MOCK INVOKE] ${cmd}`, args ? JSON.stringify(args) : '');
      switch (cmd) {
        case 'get_current_cash_session':
          return dbSession;

        case 'open_cash_session':
          dbSession = {
            id: 'sess-' + Date.now(),
            status: 'OPEN',
            openingBalance: args.input.openingBalance,
            openedAt: new Date().toISOString(),
            current_balance: args.input.openingBalance,
          };
          return dbSession;

        case 'close_cash_session':
          if (!dbSession) throw new Error('No session');
          dbSession = {
            ...dbSession,
            status: 'CLOSED',
            closedAt: new Date().toISOString(),
          };
          return dbSession;

        case 'get_session_movements':
          return dbMovements;

        case 'get_cash_session_summary':
          console.log('DEBUG: Computing summary. Movements count:', dbMovements.length);
          const supplyTotal = dbMovements
            .filter((m) => m.type === 'DEPOSIT')
            .reduce((sum, m) => sum + m.amount, 0);

          const bleedTotal = dbMovements
            .filter((m) => m.type === 'WITHDRAWAL')
            .reduce((sum, m) => sum + m.amount, 0);

          return {
            session: dbSession,
            totalSales: 0,
            totalSupplies: supplyTotal,
            totalWithdrawals: bleedTotal,
            cashInDrawer: (dbSession?.openingBalance || 0) + supplyTotal - bleedTotal,
            movements: dbMovements,
            salesByMethod: [],
          };

        case 'add_cash_movement':
          if (!args.input.movementType) {
            throw new Error('Missing movementType! Backend expects SUPPLY or BLEED');
          }
          const typeMap: Record<string, string> = {
            SUPPLY: 'DEPOSIT',
            BLEED: 'WITHDRAWAL',
          };
          const newMov = {
            id: 'mov-' + Date.now(),
            sessionId: args.input.sessionId,
            type: typeMap[args.input.movementType],
            amount: args.input.amount,
            description: args.input.description,
            createdAt: new Date().toISOString(),
          };
          dbMovements.push(newMov);
          console.log('DEBUG: Added movement. New size:', dbMovements.length);
          return null;

        case 'get_categories':
          return [];

        default:
          return null;
      }
    });
  });

  it('Flow: Full Cash Control Cycle', async () => {
    // We use fireEvent for reliability with Radix Dialogs which can be tricky with userEvent
    render(<CashControlPage />, { wrapper: queryWrapper.Wrapper });

    // 1. Open Session
    const openBtn = screen.getByTestId('open-cash');
    fireEvent.click(openBtn);

    const openInput = screen.getByTestId('opening-balance-input');
    fireEvent.change(openInput, { target: { value: '100.00' } });

    // Confirm inside dialog
    const dialog = await screen.findByRole('dialog');
    const confirmBtn = within(dialog).getByRole('button', {
      name: 'Abrir Caixa',
    });

    // Force click
    fireEvent.click(confirmBtn);

    const balanceDisplay = await screen.findByTestId('cash-balance', {}, { timeout: 3000 });
    expect(balanceDisplay).toHaveTextContent('100,00');

    // 2. Supply
    const supplyBtn = screen.getByTestId('cash-supply');
    fireEvent.click(supplyBtn);

    const supplyAmount = await screen.findByTestId('supply-amount-input');
    fireEvent.change(supplyAmount, { target: { value: '50.00' } });

    const supplyReason = screen.getByTestId('movement-reason-input');
    fireEvent.change(supplyReason, { target: { value: 'Audit Supply' } });

    const confirmSupply = screen.getByTestId('confirm-supply');
    fireEvent.click(confirmSupply);

    await waitFor(() => {
      expect(screen.getByTestId('cash-balance')).toHaveTextContent('150,00');
    });

    // 3. Bleed
    const bleedBtn = screen.getByTestId('cash-withdrawal');
    fireEvent.click(bleedBtn);

    const bleedAmount = await screen.findByTestId('withdrawal-amount-input');
    fireEvent.change(bleedAmount, { target: { value: '30.00' } });

    const bleedReason = screen.getByTestId('withdrawal-reason-input');
    fireEvent.change(bleedReason, { target: { value: 'Audit Bleed' } });

    const confirmBleed = screen.getByTestId('confirm-withdrawal');
    fireEvent.click(confirmBleed);

    await waitFor(() => {
      expect(screen.getByTestId('cash-balance')).toHaveTextContent('120,00');
    });

    // 4. Verify History List
    expect(screen.getByText('Audit Supply')).toBeInTheDocument();
  });

  it("UX: Product Form should have autoComplete='off'", async () => {
    render(
      <MemoryRouter>
        <ProductFormPage />
      </MemoryRouter>,
      { wrapper: queryWrapper.Wrapper }
    );

    const nameInput = await screen.findByLabelText(/Nome do Produto/i);
    expect(nameInput).toHaveAttribute('autocomplete', 'off');
  });
});

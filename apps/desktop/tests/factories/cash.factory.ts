/**
 * @file cash.factory.ts - Factory para dados de caixa em testes
 */

import type { CashMovement, CashSession, CashSessionSummary } from '@/types';

let sessionCounter = 0;
let movementCounter = 0;

/**
 * Cria uma sessão de caixa mockada
 */
export const createCashSession = (overrides: Partial<CashSession> = {}): CashSession => {
  sessionCounter++;
  const id = `session-${sessionCounter}`;

  return {
    id,
    employeeId: 'emp-1',
    openedAt: new Date().toISOString(),
    closedAt: undefined,
    openingBalance: 200,
    actualBalance: 200,
    expectedBalance: 200,
    difference: 0,
    status: 'OPEN',
    notes: '',
    movements: [],
    sales: [],
    employee: {
      id: 'emp-1',
      name: 'Admin',
      role: 'ADMIN',
      pin: '8899',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    ...overrides,
  };
};

/**
 * Cria uma sessão de caixa fechada
 */
export const createClosedCashSession = (overrides: Partial<CashSession> = {}): CashSession => {
  return createCashSession({
    status: 'CLOSED',
    closedAt: new Date().toISOString(),
    actualBalance: 1500,
    expectedBalance: 1500,
    difference: 0,
    ...overrides,
  });
};

/**
 * Cria uma movimentação de caixa
 */
export const createCashMovement = (overrides: Partial<CashMovement> = {}): CashMovement => {
  movementCounter++;

  return {
    id: `movement-${movementCounter}`,
    sessionId: 'session-1',
    type: 'SALE',
    amount: 50,
    description: 'Venda #1',
    employeeId: 'emp-1',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
};

/**
 * Cria uma sangria
 */
export const createWithdrawal = (
  amount: number,
  overrides: Partial<CashMovement> = {}
): CashMovement => {
  return createCashMovement({
    type: 'WITHDRAWAL',
    amount: -amount,
    description: 'Sangria',
    ...overrides,
  });
};

/**
 * Cria um suprimento
 */
export const createDeposit = (
  amount: number,
  overrides: Partial<CashMovement> = {}
): CashMovement => {
  return createCashMovement({
    type: 'DEPOSIT',
    amount,
    description: 'Suprimento',
    ...overrides,
  });
};

/**
 * Cria resumo de sessão
 */
export const createCashSessionSummary = (
  overrides: Partial<CashSessionSummary> = {}
): CashSessionSummary => {
  return {
    session: createCashSession(),
    totalSales: 1500,
    totalCanceled: 0,
    totalWithdrawals: 100,
    totalSupplies: 50,
    movementCount: 25,
    salesByMethod: [],
    cashInDrawer: 1650,
    ...overrides,
  };
};

/**
 * Reset counters (use in beforeEach)
 */
export const resetCashFactoryCounters = () => {
  sessionCounter = 0;
  movementCounter = 0;
};

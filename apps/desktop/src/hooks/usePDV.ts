import {
  closeCashSession,
  getCashSessionMovements,
  getCashSessionSummary,
  getCurrentCashSession,
  openCashSession,
} from '@/lib/tauri';
import { useAuthStore } from '@/stores';
import type { CashSession as AuthCashSession } from '@/stores/auth-store';
import type {
  CashSession as BackendCashSession,
  CloseCashSessionInput,
  OpenCashSessionInput,
} from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const cashSessionKeys = {
  all: ['cashSession'] as const,
  current: () => [...cashSessionKeys.all, 'current'] as const,
  summary: (id: string) => [...cashSessionKeys.all, 'summary', id] as const,
  movements: (id: string) => [...cashSessionKeys.all, 'movements', id] as const,
};

/**
 * Busca resumo da sessão de caixa
 */
export function useCashSessionSummary(sessionId?: string) {
  return useQuery({
    queryKey: cashSessionKeys.summary(sessionId ?? ''),
    queryFn: () => getCashSessionSummary(sessionId!),
    enabled: !!sessionId,
    refetchInterval: 1000 * 30, // 30 segundos
  });
}

/**
 * Busca movimentações de uma sessão de caixa
 */
export function useCashMovements(sessionId?: string) {
  return useQuery({
    queryKey: cashSessionKeys.movements(sessionId ?? ''),
    queryFn: () => getCashSessionMovements(sessionId!),
    enabled: !!sessionId,
    refetchInterval: 1000 * 15, // 15 segundos
  });
}

/**
 * Busca sessão de caixa ativa (backend)
 */
export function useCurrentCashSession() {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: cashSessionKeys.current(),
    queryFn: (): Promise<BackendCashSession | null> => getCurrentCashSession(),
    enabled: isAuthenticated,
    staleTime: 1000 * 30,
  });
}

function toAuthCashSession(session: BackendCashSession): AuthCashSession {
  const employeeName =
    session.employee?.name ?? useAuthStore.getState().employee?.name ?? 'Não identificado';

  return {
    id: session.id,
    employeeId: session.employeeId,
    employeeName,
    openedAt: session.openedAt,
    closedAt: session.closedAt,
    openingBalance: session.openingBalance,
    closingBalance: session.actualBalance,
    status: session.status === 'OPEN' ? 'OPEN' : 'CLOSED',
  };
}

// Tipo simplificado para a UI (employeeId é injetado)
export type UIOpenCashSessionInput = Omit<OpenCashSessionInput, 'employeeId'>;

/**
 * Abre sessão de caixa
 */
export function useOpenCashSession() {
  const queryClient = useQueryClient();
  const { openCashSession: setOpenCashSession, employee } = useAuthStore();

  return useMutation({
    mutationFn: (input: UIOpenCashSessionInput) => {
      if (!employee?.id) {
        throw new Error('Usuário não autenticado');
      }
      return openCashSession({
        ...input,
        employeeId: employee.id,
      });
    },
    onSuccess: (session) => {
      setOpenCashSession(toAuthCashSession(session));
      queryClient.invalidateQueries({ queryKey: cashSessionKeys.current() });
    },
  });
}

/**
 * Fecha sessão de caixa
 */
// Tipo simplificado para a UI (id é injetado)
export type UICloseCashSessionInput = Omit<CloseCashSessionInput, 'id'>;

/**
 * Fecha sessão de caixa
 */
export function useCloseCashSession() {
  const queryClient = useQueryClient();
  const { closeCashSession: clearCashSession, currentSession } = useAuthStore();

  return useMutation({
    mutationFn: (input: UICloseCashSessionInput) => {
      if (!currentSession?.id) {
        throw new Error('Nenhuma sessão aberta');
      }
      return closeCashSession({
        ...input,
        id: currentSession.id,
      });
    },
    onSuccess: () => {
      clearCashSession();
      queryClient.invalidateQueries({ queryKey: cashSessionKeys.current() });
    },
  });
}

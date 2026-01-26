/**
 * @file ExpirationPage.test.tsx - Testes para controle de validades
 */

import { useExpiringLots } from '@/hooks/useStock';
import { ExpirationPage } from '@/pages/stock/ExpirationPage';
import { createQueryWrapper } from '@/test/queryWrapper';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock apenas o hook que faz chamadas externas
vi.mock('@/hooks/useStock', () => ({
  useExpiringLots: vi.fn(),
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
    product: { name: 'Produto Vencido' },
    lotNumber: 'LOT1',
  },
  {
    id: 'l2',
    expirationDate: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 dias (Crítico)
    quantity: 20,
    costPrice: 10,
    product: { name: 'Produto Crítico' },
    lotNumber: 'LOT2',
  },
  {
    id: 'l3',
    expirationDate: new Date(Date.now() + 86400000 * 5).toISOString(), // 5 dias (Atenção)
    quantity: 30,
    costPrice: 15,
    product: { name: 'Produto Atenção' },
    lotNumber: 'LOT3',
  },
];

describe('ExpirationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render page title and stats', () => {
    vi.mocked(useExpiringLots).mockReturnValue({
      data: mockLots,
      isLoading: false,
    } as ReturnType<typeof useExpiringLots>);

    render(<ExpirationPage />, { wrapper: createQueryWrapper() });

    expect(screen.getByText('Controle de Validades')).toBeInTheDocument();
    expect(screen.getByText('Monitore produtos próximos ao vencimento')).toBeInTheDocument();
    expect(screen.getByTestId('stat-expired')).toHaveTextContent('1');
    expect(screen.getByTestId('stat-critical')).toHaveTextContent('1');
    expect(screen.getByTestId('stat-warning')).toHaveTextContent('1');
  });

  it('should show loading state', () => {
    vi.mocked(useExpiringLots).mockReturnValue({
      data: [],
      isLoading: true,
    } as ReturnType<typeof useExpiringLots>);

    render(<ExpirationPage />, { wrapper: createQueryWrapper() });

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should show empty state when no lots', () => {
    vi.mocked(useExpiringLots).mockReturnValue({
      data: [],
      isLoading: false,
    } as ReturnType<typeof useExpiringLots>);

    render(<ExpirationPage />, { wrapper: createQueryWrapper() });

    expect(screen.getByText(/Nenhum produto encontrado/i)).toBeInTheDocument();
  });

  it('should display lots in table', () => {
    vi.mocked(useExpiringLots).mockReturnValue({
      data: mockLots,
      isLoading: false,
    } as ReturnType<typeof useExpiringLots>);

    render(<ExpirationPage />, { wrapper: createQueryWrapper() });

    expect(screen.getByText('Produto Vencido')).toBeInTheDocument();
    expect(screen.getByText('Produto Crítico')).toBeInTheDocument();
    expect(screen.getByText('Produto Atenção')).toBeInTheDocument();
    expect(screen.getByText('LOT1')).toBeInTheDocument();
    expect(screen.getByText('LOT2')).toBeInTheDocument();
    expect(screen.getByText('LOT3')).toBeInTheDocument();
  });

  it('should display quantity and value for each lot', () => {
    vi.mocked(useExpiringLots).mockReturnValue({
      data: mockLots,
      isLoading: false,
    } as ReturnType<typeof useExpiringLots>);

    render(<ExpirationPage />, { wrapper: createQueryWrapper() });

    // Quantities
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('should navigate back to stock', async () => {
    const user = userEvent.setup();
    vi.mocked(useExpiringLots).mockReturnValue({
      data: mockLots,
      isLoading: false,
    } as ReturnType<typeof useExpiringLots>);

    render(<ExpirationPage />, { wrapper: createQueryWrapper() });

    const backButton = screen.getByRole('button', { name: /voltar para estoque/i });
    await user.click(backButton);
    expect(mockNavigate).toHaveBeenCalledWith('/stock');
  });

  it('should show correct status badges', () => {
    vi.mocked(useExpiringLots).mockReturnValue({
      data: mockLots,
      isLoading: false,
    } as ReturnType<typeof useExpiringLots>);

    render(<ExpirationPage />, { wrapper: createQueryWrapper() });

    // Check for status text in badges
    const badges = screen.getAllByText(/vencido|crítico|urgente|atenção|ok/i);
    expect(badges.length).toBeGreaterThan(0);
  });

  it('should handle lots with far expiration (OK status)', () => {
    vi.mocked(useExpiringLots).mockReturnValue({
      data: [
        {
          id: 'l4',
          expirationDate: new Date(Date.now() + 86400000 * 40).toISOString(), // 40 dias
          quantity: 5,
          costPrice: 2,
          product: { name: 'Produto OK' },
          lotNumber: 'LOT4',
        },
      ],
      isLoading: false,
    } as ReturnType<typeof useExpiringLots>);

    render(<ExpirationPage />, { wrapper: createQueryWrapper() });
    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(screen.getByText('Produto OK')).toBeInTheDocument();
  });

  it('should display stats cards with correct labels', () => {
    vi.mocked(useExpiringLots).mockReturnValue({
      data: mockLots,
      isLoading: false,
    } as ReturnType<typeof useExpiringLots>);

    render(<ExpirationPage />, { wrapper: createQueryWrapper() });

    expect(screen.getByText('Retirar do estoque')).toBeInTheDocument();
    expect(screen.getByText('Vender com urgência')).toBeInTheDocument();
    expect(screen.getByText('Críticos (3 dias)')).toBeInTheDocument();
    expect(screen.getByText('Atenção (7 dias)')).toBeInTheDocument();
  });
});

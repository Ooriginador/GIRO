import { createQueryWrapper } from '@/test/queryWrapper';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SalesReportPage } from '../SalesReportPage';

// Mock hooks
const mockUseSalesReport = vi.fn();
vi.mock('@/hooks/useSales', () => ({
  useSalesReport: () => mockUseSalesReport(),
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="icon-back" />,
  BarChart3: () => <div data-testid="icon-chart" />,
  CalendarIcon: () => <div data-testid="icon-calendar" />,
  DollarSign: () => <div data-testid="icon-dollar" />,
  Download: () => <div data-testid="icon-download" />,
  Printer: () => <div data-testid="icon-printer" />,
  ShoppingCart: () => <div data-testid="icon-cart" />,
  TrendingUp: () => <div data-testid="icon-trending" />,
  ChevronDown: () => <div data-testid="icon-chevron-down" />,
  ChevronUp: () => <div data-testid="icon-chevron-up" />,
  Check: () => <div data-testid="icon-check" />,
}));

// Mock Radix UI components
vi.mock('@/components/ui/calendar', () => ({
  Calendar: () => <div data-testid="mock-calendar" />,
}));

describe('SalesReportPage', () => {
  const queryWrapper = createQueryWrapper();

  const mockReportData = {
    totalAmount: 5000,
    salesCount: 50,
    averageTicket: 100,
    totalItems: 120,
    grossProfit: 2000,
    profitMargin: 40,
    periods: [
      { date: '2025-01-01', salesCount: 10, revenue: 1000, percentage: 20 },
      { date: '2025-01-02', salesCount: 40, revenue: 4000, percentage: 80 },
    ],
    topProducts: [{ id: 'p1', name: 'Product A', quantity: 20, amount: 2000 }],
    paymentBreakdown: [
      { method: 'CASH', label: 'Dinheiro', count: 30, amount: 3000, percentage: 60 },
      { method: 'PIX', label: 'PIX', count: 20, amount: 2000, percentage: 40 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSalesReport.mockReturnValue({
      data: mockReportData,
      isLoading: false,
    });
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <SalesReportPage />
      </MemoryRouter>,
      { wrapper: queryWrapper.Wrapper }
    );
  };

  it('should render page title and description', () => {
    renderPage();
    expect(screen.getByText('Relatório de Vendas')).toBeInTheDocument();
  });

  it('should render summary cards with correct data', () => {
    renderPage();
    expect(screen.getByTestId('total-amount')).toHaveTextContent(/5\.000,00/);
    expect(screen.getByText(/50 vendas/i)).toBeInTheDocument();
    expect(screen.getByTestId('average-ticket')).toHaveTextContent(/100,00/);
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByTestId('gross-profit')).toHaveTextContent(/2\.000,00/);
    expect(screen.getByTestId('profit-margin')).toHaveTextContent(/40\.0%/);
  });

  it('should render periods table', () => {
    renderPage();
    expect(screen.getByText('2025-01-01')).toBeInTheDocument();
    expect(screen.getByText(/1\.000,00/)).toBeInTheDocument();
    expect(screen.getByText('20.0%')).toBeInTheDocument();
  });

  it('should render top products', () => {
    renderPage();
    expect(screen.getByText('Product A')).toBeInTheDocument();
    expect(screen.getByText('20 unidades')).toBeInTheDocument();
  });

  it('should render payment breakdown', () => {
    renderPage();
    expect(screen.getByText('Dinheiro')).toBeInTheDocument();
    expect(screen.getByText('30 vendas')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    mockUseSalesReport.mockReturnValue({
      data: null,
      isLoading: true,
    });
    renderPage();
    const pulseElements = document.querySelectorAll('.animate-pulse');
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it('should handle print action', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    renderPage();
    fireEvent.click(screen.getByText(/Imprimir/i));
    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });

  it('should handle export action', () => {
    // Mock the global document.createElement but return real elements for non-'a' tags
    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement;
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      const el = originalCreateElement.call(document, tagName);
      if (tagName === 'a') {
        el.click = clickSpy;
      }
      return el;
    });

    renderPage();
    fireEvent.click(screen.getByText(/Exportar/i));

    expect(clickSpy).toHaveBeenCalled();

    createElementSpy.mockRestore();
  });

  it('should render group by selection', () => {
    renderPage();
    const selectTrigger = screen.getByRole('combobox');
    expect(selectTrigger).toHaveTextContent(/Por Dia/i);
  });
});

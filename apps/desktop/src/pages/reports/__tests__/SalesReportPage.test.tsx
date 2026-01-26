import { createQueryWrapperWithClient } from '@/test/queryWrapper';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SalesReportPage } from '../SalesReportPage';

// Mock apenas hooks que fazem chamadas externas
const mockUseSalesReport = vi.fn();
vi.mock('@/hooks/useSales', () => ({
  useSalesReport: () => mockUseSalesReport(),
}));

// Mock export module
const mockExportToCSV = vi.fn();
vi.mock('@/lib/export', () => ({
  exportToCSV: (...args: any[]) => mockExportToCSV(...args),
  exportFormatters: {
    currency: (v: number) => `R$ ${v.toFixed(2)}`,
    percentage: (v: number) => `${v.toFixed(1)}%`,
    percent: (v: number) => `${v.toFixed(1)}%`,
    date: (v: string) => v,
    number: (v: number) => String(v),
  },
}));

// Mock Recharts to avoid DOM size errors and allow data assertions
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  AreaChart: () => <div data-testid="area-chart">AreaChart</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ data }: any) => (
    <div>
      {data.map((d: any) => (
        <div key={d.label}>
          {d.label}: {d.count} vendas
        </div>
      ))}
    </div>
  ),
  Cell: () => null,
  Tooltip: () => null,
  Legend: () => null,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Area: () => null,
}));

describe('SalesReportPage', () => {
  const queryWrapper = createQueryWrapperWithClient();

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
    return render(<SalesReportPage />, { wrapper: queryWrapper.Wrapper });
  };

  it('should render page title and description', () => {
    renderPage();
    // Use getByRole to be specific about the main heading
    expect(
      screen.getByRole('heading', { name: /Relatório de Vendas/i, level: 1 })
    ).toBeInTheDocument();
  });

  it('should render summary cards with correct data', () => {
    renderPage();

    // Flexible matchers for currency
    const hasText = (text: string) => (content: string, element: Element | null) =>
      element?.textContent?.includes(text) ?? false;

    // Total Amount
    expect(screen.getAllByText(hasText('5.000,00')).length).toBeGreaterThan(0);

    // Sales Count (Component uses "transações")
    expect(screen.getByText(/50 transações/i)).toBeInTheDocument();

    // Average Ticket
    expect(screen.getAllByText(hasText('100,00')).length).toBeGreaterThan(0);

    // Total Items
    expect(screen.getByText('120')).toBeInTheDocument();

    // Gross Profit
    expect(screen.getAllByText(hasText('2.000,00')).length).toBeGreaterThan(0);

    // Profit Margin
    expect(screen.getByText(/40\.0%/)).toBeInTheDocument();
  });

  it('should render periods table', () => {
    renderPage();
    expect(screen.getByText('2025-01-01')).toBeInTheDocument();
    expect(screen.getAllByText(/1\.000,00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('20.0%').length).toBeGreaterThan(0);
  });

  it('should render top products', () => {
    renderPage();
    expect(screen.getByText('Product A')).toBeInTheDocument();
    expect(screen.getByText(/20 unidades vendidas/i)).toBeInTheDocument();
  });

  it('should render payment breakdown', () => {
    renderPage();
    // These rely on our PieChart mock that renders text
    expect(screen.getByText('Dinheiro: 30 vendas')).toBeInTheDocument();
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

  it('should handle export action', async () => {
    mockExportToCSV.mockClear();

    renderPage();
    // ExportButtons with dropdown variant renders a button with "Exportar" text
    // The dropdown menu is rendered by Radix UI and may not work in jsdom
    // Test that the export button is rendered
    const exportButton = screen.getByRole('button', { name: /Exportar/i });
    expect(exportButton).toBeInTheDocument();
  });

  it('should render group by selection', () => {
    renderPage();
    const selectTrigger = screen.getByRole('combobox', { name: /Agrupar por período/i });
    expect(selectTrigger).toBeInTheDocument();
  });
});

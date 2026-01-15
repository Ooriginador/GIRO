import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SaleReceipt } from '../SaleReceipt';

describe('SaleReceipt', () => {
  const mockItems = [
    { name: 'Product 1', quantity: 2, unitPrice: 10, total: 20, unit: 'UN' },
    { name: 'Product 2', quantity: 1, unitPrice: 50, total: 50, unit: 'UN' },
  ];

  it('renders receipt correctly with multiple items', () => {
    render(
      <SaleReceipt
        companyName="Test Shop"
        items={mockItems}
        subtotal={70}
        discount={0}
        total={70}
        paymentMethod="CASH"
        amountPaid={100}
        change={30}
        saleId="123"
      />
    );

    expect(screen.getByText('Test Shop')).toBeInTheDocument();
    expect(screen.getByText('Product 1')).toBeInTheDocument();
    expect(screen.getByText('Product 2')).toBeInTheDocument();
    expect(screen.getByText('Venda #123')).toBeInTheDocument();
    expect(screen.getByText('Dinheiro')).toBeInTheDocument();

    // Check if totals are formatted (BRL) - multiple occurrences might exist (subtotal/total)
    expect(screen.getAllByText(/R\$.*70,00/)[0]).toBeInTheDocument();
    expect(screen.getByText(/R\$.*30,00/)).toBeInTheDocument();
  });

  it('renders discount when present', () => {
    render(
      <SaleReceipt
        items={mockItems}
        subtotal={70}
        discount={5}
        total={65}
        paymentMethod="PIX"
        amountPaid={65}
        change={0}
      />
    );

    expect(screen.getByText('Desconto')).toBeInTheDocument();
    expect(screen.getByText(/-R\$.*5,00/)).toBeInTheDocument();
    expect(screen.getByText('PIX')).toBeInTheDocument();
  });
});

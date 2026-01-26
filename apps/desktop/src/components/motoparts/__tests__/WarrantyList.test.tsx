import { WarrantyList } from '@/components/motoparts/WarrantyList';
import { useWarranties } from '@/hooks/useWarranties';
import { createQueryWrapperWithClient } from '@/test/queryWrapper';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Mock do hook e utils
vi.mock('@/hooks/useWarranties', () => ({
  useWarranties: vi.fn(),
  WarrantyUtils: {
    getStatusLabel: (s: string) => s,
    getStatusColor: (s: string) => 'text-blue-600',
    getSourceTypeLabel: (s: string) => s,
  },
}));

const { Wrapper: queryWrapper } = createQueryWrapperWithClient();

describe('WarrantyList', () => {
  it('should render the list of warranties', () => {
    const mockWarranties = [
      {
        id: 'w-1',
        customer_name: 'João Silva',
        status: 'OPEN',
        product_name: 'Bateria',
        source_type: 'SALE',
        source_number: '123',
        created_at: '2023-10-27',
      },
    ];

    vi.mocked(useWarranties).mockReturnValue({
      activeWarranties: mockWarranties,
      isLoadingActive: false,
    } as any);

    render(<WarrantyList onSelectWarranty={vi.fn()} onCreateNew={vi.fn()} />, {
      wrapper: queryWrapper,
    });

    expect(screen.getByText(/João Silva/)).toBeInTheDocument();
    expect(screen.getByText(/Bateria/)).toBeInTheDocument();
  });

  it('should call onCreateNew when button is clicked', () => {
    const onCreateNew = vi.fn();
    vi.mocked(useWarranties).mockReturnValue({
      activeWarranties: [],
      isLoadingActive: false,
    } as any);

    render(<WarrantyList onSelectWarranty={vi.fn()} onCreateNew={onCreateNew} />, {
      wrapper: queryWrapper,
    });

    fireEvent.click(screen.getByText(/Nova Garantia/i));
    expect(onCreateNew).toHaveBeenCalled();
  });
});

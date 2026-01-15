import { WarrantyForm } from '@/components/motoparts/WarrantyForm';
import { useWarranties } from '@/hooks/useWarranties';
import { createQueryWrapper } from '@/test/queryWrapper';
import { invoke } from '@tauri-apps/api/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock do hook e tauri
vi.mock('@/hooks/useWarranties', () => ({
  useWarranties: vi.fn(),
  WarrantyUtils: {
    getSourceTypeLabel: (s: string) => s,
  },
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('../CustomerSearch', () => ({
  CustomerSearch: ({ onSelect }: any) => (
    <button onClick={() => onSelect({ id: 'cust-1', name: 'João Silva' })}>Select Customer</button>
  ),
}));

// Mock simplificado para Popover e Command para evitar problemas com JSDOM
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/command', () => ({
  Command: ({ children }: any) => <div>{children}</div>,
  CommandInput: ({ onValueChange, placeholder }: any) => (
    <input
      data-testid="mock-command-input"
      placeholder={placeholder}
      onChange={(e) => onValueChange(e.target.value)}
    />
  ),
  CommandList: ({ children }: any) => <div>{children}</div>,
  CommandEmpty: ({ children }: any) => <div>{children}</div>,
  CommandGroup: ({ children }: any) => <div>{children}</div>,
  CommandItem: ({ children, onSelect, value }: any) => (
    <div data-testid={`item-${value}`} onClick={() => onSelect(value)}>
      {children}
    </div>
  ),
}));

describe('WarrantyForm', () => {
  const mockCreateWarranty = vi.fn();
  let queryWrapper: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const { Wrapper } = createQueryWrapper();
    queryWrapper = Wrapper;
    vi.mocked(useWarranties).mockReturnValue({
      createWarranty: { mutateAsync: mockCreateWarranty, isPending: false },
    } as any);
  });

  it('should render the form', () => {
    render(<WarrantyForm onCancel={vi.fn()} onSuccess={vi.fn()} />, {
      wrapper: queryWrapper,
    });

    expect(screen.getByText(/Nova Solicitação de Garantia/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Motivo/i)).toBeInTheDocument();
  });

  it('should search for products', async () => {
    vi.mocked(invoke).mockResolvedValue([
      { id: 'p1', name: 'Bateria' },
      { id: 'p2', name: 'Pastilha' },
    ]);

    render(<WarrantyForm onCancel={vi.fn()} onSuccess={vi.fn()} />, {
      wrapper: queryWrapper,
    });

    const searchButton = screen.getByText('Buscar produto...');
    fireEvent.click(searchButton);

    const input = screen.getByPlaceholderText(/Buscar por nome/i);
    fireEvent.change(input, { target: { value: 'Bat' } });

    await waitFor(() => {
      expect(screen.getByText('Bateria')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Bateria')!);
    expect(screen.getAllByText('Bateria').length).toBeGreaterThan(0);
  });

  it('should handle submission', async () => {
    mockCreateWarranty.mockResolvedValueOnce({ id: 'w1' });

    render(<WarrantyForm onCancel={vi.fn()} onSuccess={vi.fn()} />, {
      wrapper: queryWrapper,
    });

    fireEvent.click(screen.getByText('Select Customer'));

    // Fill product (search and select)
    vi.mocked(invoke).mockResolvedValue([{ id: 'p1', name: 'Bateria' }]);
    fireEvent.click(screen.getByText('Buscar produto...'));
    fireEvent.change(screen.getByPlaceholderText(/Buscar por nome/i), { target: { value: 'Bat' } });

    const battery = await screen.findByText('Bateria');
    fireEvent.click(battery);

    fireEvent.change(screen.getByLabelText(/Motivo/i), { target: { value: 'Defeito de fábrica' } });

    fireEvent.click(screen.getByText('Registrar Garantia'));

    await waitFor(() => {
      expect(mockCreateWarranty).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_id: 'cust-1',
          product_id: 'p1',
          reason: 'Defeito de fábrica',
          source_type: 'SALE',
        })
      );
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Garantia Aberta' }));
    });
  });

  it('should handle cancellation', () => {
    const onCancel = vi.fn();
    render(<WarrantyForm onCancel={onCancel} onSuccess={vi.fn()} />, {
      wrapper: queryWrapper,
    });

    fireEvent.click(screen.getByText('Cancelar'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('should show error toast on failure', async () => {
    mockCreateWarranty.mockRejectedValueOnce(new Error('Fail'));

    render(<WarrantyForm onCancel={vi.fn()} onSuccess={vi.fn()} />, {
      wrapper: queryWrapper,
    });

    fireEvent.click(screen.getByText('Select Customer'));

    // Fill product
    vi.mocked(invoke).mockResolvedValue([{ id: 'p1', name: 'Bateria' }]);
    fireEvent.click(screen.getByText('Buscar produto...'));
    fireEvent.change(screen.getByPlaceholderText(/Buscar por nome/i), { target: { value: 'Bat' } });

    const battery = await screen.findByText('Bateria');
    fireEvent.click(battery);

    fireEvent.change(screen.getByLabelText(/Motivo/i), { target: { value: 'Defeito grave' } });

    fireEvent.click(screen.getByText('Registrar Garantia'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Erro ao registrar' })
      );
    });
  });
});

import {
  CompatibilityQuickView,
  ProductCompatibilityEditor,
} from '@/components/motoparts/ProductCompatibilityEditor';
import { useProductCompatibility } from '@/hooks/useVehicles';
import { createQueryWrapper } from '@/test/queryWrapper';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock do hook
vi.mock('@/hooks/useVehicles', () => ({
  useProductCompatibility: vi.fn(),
}));

// Mock dos sub-componentes (hoisted)
vi.mock('../VehicleSelector', () => ({
  VehicleBadge: ({ vehicle, onRemove }: any) => (
    <div data-testid="vehicle-badge">
      {vehicle.displayName}
      <button onClick={onRemove}>Remove</button>
    </div>
  ),
  VehicleSearch: ({ onSelect }: any) => (
    <div
      data-testid="vehicle-search"
      onClick={() => onSelect({ id: 'v1', displayName: 'New Vehicle' })}
    />
  ),
  VehicleSelector: ({ onSelect }: any) => (
    <div
      data-testid="vehicle-selector"
      onClick={() => onSelect({ id: 'v-sel', displayName: 'Selected' })}
    />
  ),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, layout, initial, animate, exit, transition, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const { Wrapper: queryWrapper } = createQueryWrapper();

describe('ProductCompatibilityEditor', () => {
  const user = userEvent.setup();
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockHookValue = (overrides = {}) => {
    vi.mocked(useProductCompatibility).mockReturnValue({
      compatibilities: [
        {
          vehicleYearId: 'v1',
          vehicle: { id: 'v1', displayName: 'Honda CG 160' },
        },
      ],
      pendingChanges: 0,
      isLoading: false,
      isSaving: false,
      error: null,
      addCompatibility: vi.fn(),
      removeCompatibility: vi.fn(),
      saveChanges: vi.fn(),
      hasChanges: false,
      ...overrides,
    } as any);
  };

  it('should render the editor in full mode', () => {
    mockHookValue();
    render(<ProductCompatibilityEditor productId="p1" productName="Peça Teste" />, {
      wrapper: queryWrapper,
    });

    expect(screen.getByText(/Honda CG 160/i)).toBeInTheDocument();
  });

  it('should render the editor in compact mode', () => {
    mockHookValue();
    render(<ProductCompatibilityEditor productId="p1" productName="Peça Teste" compact />, {
      wrapper: queryWrapper,
    });

    expect(screen.getByText(/Veículos Compatíveis/i)).toBeInTheDocument();
    expect(screen.getByTestId('vehicle-search')).toBeInTheDocument();
  });

  it('should handle quick add in compact mode', () => {
    const addCompatibility = vi.fn();
    mockHookValue({ addCompatibility });

    render(<ProductCompatibilityEditor productId="p1" productName="Peça Teste" compact />, {
      wrapper: queryWrapper,
    });

    fireEvent.click(screen.getByTestId('vehicle-search'));
    expect(addCompatibility).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'New Vehicle' })
    );
  });

  it('should show error state', () => {
    mockHookValue({ error: 'Erro de conexão' });
    render(<ProductCompatibilityEditor productId="p1" productName="Peça Teste" />, {
      wrapper: queryWrapper,
    });

    expect(screen.getByText('Erro de conexão')).toBeInTheDocument();
  });

  it('should handle "Add via Selector" toggle', () => {
    mockHookValue();
    render(<ProductCompatibilityEditor productId="p1" productName="Peça Teste" />, {
      wrapper: queryWrapper,
    });

    fireEvent.click(screen.getByText(/Adicionar via Seletor/i));
    expect(screen.getByTestId('vehicle-selector')).toBeInTheDocument();
  });

  it('should handle removal confirmation', async () => {
    const removeCompatibility = vi.fn();
    mockHookValue({ removeCompatibility });

    render(<ProductCompatibilityEditor productId="p1" productName="Peça Teste" />, {
      wrapper: queryWrapper,
    });

    // O botão de lixeira não tem texto, então vamos buscar pelo ícone ou pela classe
    const removeButtons = screen.getAllByRole('button');
    const trashButton = removeButtons.find((b) => b.className.includes('text-destructive'));
    await user.click(trashButton!);

    const confirmButton = await screen.findByRole('button', { name: /^Remover$/ });
    await user.click(confirmButton);

    expect(removeCompatibility).toHaveBeenCalledWith('v1');
  });

  it('should handle saving changes', async () => {
    const saveChanges = vi.fn().mockResolvedValue([{ vehicleYearId: 'v1' }]);
    mockHookValue({ hasChanges: true, pendingChanges: 1, saveChanges });

    render(<ProductCompatibilityEditor productId="p1" productName="Peça Teste" />, {
      wrapper: queryWrapper,
    });

    await user.click(screen.getByRole('button', { name: /Salvar Alterações/i }));

    await act(async () => {
      await Promise.resolve(); // Wait for handleSave's await saveChanges()
    });

    expect(saveChanges).toHaveBeenCalled();
  });

  it('should handle full selector flow: select and confirm', () => {
    const addCompatibility = vi.fn();
    mockHookValue({ addCompatibility });

    render(<ProductCompatibilityEditor productId="p1" productName="Peça Teste" />, {
      wrapper: queryWrapper,
    });

    // Open selector
    fireEvent.click(screen.getByText(/Adicionar via Seletor/i));

    // Select vehicle in mock selector
    fireEvent.click(screen.getByTestId('vehicle-selector'));

    // Confirm addition
    fireEvent.click(screen.getByText(/Adicionar Selected/i));

    expect(addCompatibility).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'Selected' })
    );
    expect(screen.queryByTestId('vehicle-selector')).not.toBeInTheDocument();
  });

  it('should show loading state', () => {
    mockHookValue({ isLoading: true });
    const { container } = render(
      <ProductCompatibilityEditor productId="p1" productName="Peça Teste" />,
      {
        wrapper: queryWrapper,
      }
    );

    // The loader is a Loader2 icon with animate-spin
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();

    // Verify compatibility data is not shown
    expect(screen.queryByText(/Honda CG 160/i)).not.toBeInTheDocument();
  });
});

describe('CompatibilityQuickView', () => {
  const compatibilities = [
    { vehicleYearId: '1', vehicle: { displayName: 'Moto A' } },
    { vehicleYearId: '2', vehicle: { displayName: 'Moto B' } },
    { vehicleYearId: '3', vehicle: { displayName: 'Moto C' } },
    { vehicleYearId: '4', vehicle: { displayName: 'Moto D' } },
  ];

  it('should render universal if empty', () => {
    render(<CompatibilityQuickView compatibilities={[]} />);
    expect(screen.getByText(/universal/i)).toBeInTheDocument();
  });

  it('should render items up to maxVisible and show hidden count', () => {
    render(<CompatibilityQuickView compatibilities={compatibilities as any} maxVisible={2} />);

    expect(screen.getByText('Moto A')).toBeInTheDocument();
    expect(screen.getByText('Moto B')).toBeInTheDocument();
    expect(screen.queryByText('Moto C')).not.toBeInTheDocument();
    expect(screen.getByText('+2 mais')).toBeInTheDocument();
  });
});

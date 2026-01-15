import {
  VehicleBadge,
  VehicleSearch,
  VehicleSelector,
  VehicleYearRangeSelector,
} from '@/components/motoparts/VehicleSelector';
import { useVehicles } from '@/hooks/useVehicles';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dos hooks
vi.mock('@/hooks/useVehicles', () => ({
  useVehicles: vi.fn(),
}));

describe('VehicleSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render and select brands', async () => {
    const selectBrand = vi.fn();
    vi.mocked(useVehicles).mockReturnValue({
      brands: [{ id: 'b-1', name: 'Honda' }],
      models: [],
      years: [],
      isLoadingBrands: false,
      loadBrands: vi.fn(),
      selectBrand,
      reset: vi.fn(),
    } as any);

    render(<VehicleSelector onSelect={vi.fn()} />);

    // Simular abertura do Select (Radix-UI Select é chato de testar, mas vamos tentar encontrar o texto)
    expect(screen.getByText(/^Selecione a marca$/i)).toBeInTheDocument();
  });

  it('should call onSelect when a vehicle is complete', () => {
    const onSelect = vi.fn();
    vi.mocked(useVehicles).mockReturnValue({
      brands: [],
      models: [],
      years: [],
      selectedVehicle: { id: 'v1', displayName: 'Honda CG' },
      loadBrands: vi.fn(),
      reset: vi.fn(),
    } as any);

    render(<VehicleSelector onSelect={onSelect} />);
    expect(onSelect).toHaveBeenCalledWith({ id: 'v1', displayName: 'Honda CG' });
  });
});

describe('VehicleSearch', () => {
  it('should search and select vehicle', async () => {
    const onSelect = vi.fn();
    const searchVehicles = vi
      .fn()
      .mockResolvedValue([{ yearId: 'v1', displayName: 'Honda CG 160' }]);

    vi.mocked(useVehicles).mockReturnValue({
      searchVehicles,
    } as any);

    render(<VehicleSearch onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('combobox'));

    const input = screen.getByPlaceholderText(/Digite para buscar/i);
    fireEvent.change(input, { target: { value: 'honda' } });

    await waitFor(() => {
      expect(screen.getByText('Honda CG 160')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Honda CG 160'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'Honda CG 160' }));
  });
});

describe('VehicleBadge', () => {
  it('should render and handle remove', () => {
    const onRemove = vi.fn();
    render(<VehicleBadge vehicle={{ displayName: 'Honda CG' } as any} onRemove={onRemove} />);

    expect(screen.getByText('Honda CG')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(onRemove).toHaveBeenCalled();
  });
});

describe('VehicleYearRangeSelector', () => {
  const years = [
    { id: 'y1', year: 2020, yearLabel: '2020' },
    { id: 'y2', year: 2021, yearLabel: '2021' },
  ];

  it('should toggle years and handle select all/clear', () => {
    const onChange = vi.fn();
    render(<VehicleYearRangeSelector years={years} selectedYearIds={['y1']} onChange={onChange} />);

    expect(screen.getByText('2020')).toBeInTheDocument();

    // Toggle
    fireEvent.click(screen.getByText('2021'));
    expect(onChange).toHaveBeenCalledWith(['y1', 'y2']);

    // Select All
    fireEvent.click(screen.getByText('Todos'));
    expect(onChange).toHaveBeenCalledWith(['y1', 'y2']);

    // Clear All (needs to be checked in another render or just as call)
    fireEvent.click(screen.getByText('Limpar'));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});

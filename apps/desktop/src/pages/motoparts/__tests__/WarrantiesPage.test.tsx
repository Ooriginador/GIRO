import { WarrantyManager } from '@/components/motoparts';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WarrantiesPage } from '../WarrantiesPage';

// Mock the component being wrapped
vi.mock('@/components/motoparts', () => ({
  WarrantyManager: vi.fn(() => <div data-testid="warranty-manager">Warranty Manager</div>),
}));

describe('WarrantiesPage', () => {
  it('should render WarrantyManager component', () => {
    render(<WarrantiesPage />);
    expect(screen.getByTestId('warranty-manager')).toBeInTheDocument();
    expect(WarrantyManager).toHaveBeenCalled();
  });
});

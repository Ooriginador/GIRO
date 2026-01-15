import { WarrantyManager } from '@/components/motoparts/WarrantyManager';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Mock sub-components (Caminhos relativos ao local do arquivo de teste: __tests__/)
vi.mock('../WarrantyList', () => ({
  WarrantyList: ({ onSelectWarranty, onCreateNew }: any) => (
    <div>
      <div data-testid="warranty-list">List View</div>
      <button onClick={() => onSelectWarranty('w-1')}>Select Warranty</button>
      <button onClick={onCreateNew}>Create New</button>
    </div>
  ),
}));

vi.mock('../WarrantyForm', () => ({
  WarrantyForm: ({ onCancel, onSuccess }: any) => (
    <div>
      <div data-testid="warranty-form">Form View</div>
      <button onClick={onCancel}>Cancel</button>
      <button onClick={onSuccess}>Success</button>
    </div>
  ),
}));

vi.mock('../WarrantyDetails', () => ({
  WarrantyDetails: ({ warrantyId, onBack }: any) => (
    <div>
      <div data-testid="warranty-details">Details View {warrantyId}</div>
      <button onClick={onBack}>Back</button>
    </div>
  ),
}));

describe('WarrantyManager', () => {
  it('should switch between warranty views', () => {
    render(<WarrantyManager />);

    // Initial: List
    expect(screen.getByTestId('warranty-list')).toBeInTheDocument();

    // Create
    fireEvent.click(screen.getByText('Create New'));
    expect(screen.getByTestId('warranty-form')).toBeInTheDocument();

    // Cancel
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.getByTestId('warranty-list')).toBeInTheDocument();

    // Select
    fireEvent.click(screen.getByText('Select Warranty'));
    expect(screen.getByTestId('warranty-details')).toBeInTheDocument();
    expect(screen.getByText(/w-1/)).toBeInTheDocument();

    // Back
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByTestId('warranty-list')).toBeInTheDocument();

    // Create -> Success -> List
    fireEvent.click(screen.getByText('Create New'));
    fireEvent.click(screen.getByText('Success'));
    expect(screen.getByTestId('warranty-list')).toBeInTheDocument();
  });
});

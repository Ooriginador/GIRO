import { ServiceOrderManager } from '@/components/motoparts/ServiceOrderManager';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Mock sub-components (Caminhos relativos ao local do arquivo de teste: __tests__/)
vi.mock('../ServiceOrderList', () => ({
  ServiceOrderList: ({ onSelectOrder, onCreateNew }: any) => (
    <div>
      <div data-testid="list-view">List View</div>
      <button onClick={() => onSelectOrder('os-1')}>Select OS</button>
      <button onClick={onCreateNew}>Create New</button>
    </div>
  ),
}));

vi.mock('../ServiceOrderForm', () => ({
  ServiceOrderForm: ({ onCancel, onSuccess }: any) => (
    <div>
      <div data-testid="form-view">Form View</div>
      <button onClick={onCancel}>Cancel</button>
      <button onClick={() => onSuccess('os-new')}>Success</button>
    </div>
  ),
}));

vi.mock('../ServiceOrderDetails', () => ({
  ServiceOrderDetails: ({ orderId, onClose }: any) => (
    <div>
      <div data-testid="details-view">Details View {orderId}</div>
      <button onClick={onClose}>Back</button>
    </div>
  ),
}));

describe('ServiceOrderManager', () => {
  it('should switch between views', async () => {
    await act(async () => {
      render(<ServiceOrderManager />);
    });

    // Initial view: List
    expect(screen.getByTestId('list-view')).toBeInTheDocument();

    // Switch to Create
    await act(async () => {
      fireEvent.click(screen.getByText('Create New'));
    });
    expect(screen.getByTestId('form-view')).toBeInTheDocument();

    // Cancel back to List
    await act(async () => {
      fireEvent.click(screen.getByText('Cancel'));
    });
    expect(screen.getByTestId('list-view')).toBeInTheDocument();

    // Select OS -> Details
    await act(async () => {
      fireEvent.click(screen.getByText('Select OS'));
    });
    expect(screen.getByTestId('details-view')).toBeInTheDocument();
    expect(screen.getByText(/os-1/)).toBeInTheDocument();

    // Back to List
    await act(async () => {
      fireEvent.click(screen.getByText('Back'));
    });
    expect(screen.getByTestId('list-view')).toBeInTheDocument();

    // Create -> Success -> Details
    await act(async () => {
      fireEvent.click(screen.getByText('Create New'));
    });
    await act(async () => {
      fireEvent.click(screen.getByText('Success'));
    });
    expect(screen.getByTestId('details-view')).toBeInTheDocument();
    expect(screen.getByText(/os-new/)).toBeInTheDocument();
  });
});

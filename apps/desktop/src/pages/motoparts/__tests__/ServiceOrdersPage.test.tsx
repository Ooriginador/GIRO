import { ServiceOrderManager } from '@/components/motoparts';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ServiceOrdersPage } from '../ServiceOrdersPage';

// Mock the component being wrapped
vi.mock('@/components/motoparts', () => ({
  ServiceOrderManager: vi.fn(() => (
    <div data-testid="service-order-manager">Service Order Manager</div>
  )),
}));

describe('ServiceOrdersPage', () => {
  it('should render ServiceOrderManager component', () => {
    render(<ServiceOrdersPage />);
    expect(screen.getByTestId('service-order-manager')).toBeInTheDocument();
    expect(ServiceOrderManager).toHaveBeenCalled();
  });
});

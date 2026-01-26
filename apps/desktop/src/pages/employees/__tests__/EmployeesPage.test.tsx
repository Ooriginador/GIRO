import { EmployeesPage } from '@/pages/employees/EmployeesPage';
import { createQueryWrapperWithClient } from '@/test/queryWrapper';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

const mockEmployees = [
  { id: '1', name: 'Admin User', email: 'admin@test.com', role: 'ADMIN', isActive: true },
  { id: '2', name: 'Cashier User', email: 'cashier@test.com', role: 'CASHIER', isActive: true },
];

const mockInactiveEmployees = [
  { id: '3', name: 'Inactive User', email: 'inactive@test.com', role: 'VIEWER', isActive: false },
];

const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockDeactivateMutate = vi.fn();
const mockReactivateMutate = vi.fn();

vi.mock('@/hooks/useEmployees', () => ({
  useEmployees: () => ({ data: mockEmployees, isLoading: false }),
  useInactiveEmployees: () => ({ data: mockInactiveEmployees, isLoading: false }),
  useCreateEmployee: () => ({ mutateAsync: mockCreateMutate }),
  useUpdateEmployee: () => ({ mutateAsync: mockUpdateMutate }),
  useDeactivateEmployee: () => ({ mutateAsync: mockDeactivateMutate }),
  useReactivateEmployee: () => ({ mutateAsync: mockReactivateMutate }),
}));

// Mock window.confirm
const mockConfirm = vi.fn().mockReturnValue(true);
vi.stubGlobal('confirm', mockConfirm);

const { Wrapper: queryWrapper } = createQueryWrapperWithClient();

describe('EmployeesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () => {
    const user = userEvent.setup();
    const result = render(<EmployeesPage />, { wrapper: queryWrapper });
    return { ...result, user };
  };

  it('should render the employees list', () => {
    renderPage();
    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('Cashier User')).toBeInTheDocument();
    expect(screen.queryByText('Inactive User')).not.toBeInTheDocument();
  });

  it('should filter by search query', async () => {
    const { user } = renderPage();
    const searchInput = screen.getByPlaceholderText(/Buscar por nome ou email/i);
    await user.type(searchInput, 'Admin');

    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.queryByText('Cashier User')).not.toBeInTheDocument();
  });

  it('should filter by status (active/inactive/all)', async () => {
    const { user } = renderPage();

    // Switch to Inactive
    const filterSelect = screen.getByRole('combobox');
    await user.click(filterSelect);
    const inactiveOption = await screen.findByText('Inativos');
    await user.click(inactiveOption);

    expect(screen.queryByText('Admin User')).not.toBeInTheDocument();
    expect(screen.getByText('Inactive User')).toBeInTheDocument();
  });

  it('should create a new employee', async () => {
    const { user } = renderPage();

    await user.click(screen.getByText(/Novo Funcionário/i));

    await user.type(screen.getByLabelText(/Nome Completo/i), 'New Employee');
    await user.type(screen.getByLabelText(/E-mail/i), 'new@test.com');

    const submitBtn = screen.getByTestId('submit-employee');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Employee',
          email: 'new@test.com',
          role: 'CASHIER',
          isActive: true,
        })
      );
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Funcionário criado com sucesso' })
    );
  });

  it('should edit an employee', async () => {
    const { user } = renderPage();

    const trigger = screen.getByTestId('employee-actions-1');
    await user.click(trigger);

    const editOption = await screen.findByTestId('edit-employee');
    await user.click(editOption);

    const nameInput = screen.getByLabelText(/Nome Completo/i);
    expect(nameInput).toHaveValue('Admin User');

    await user.clear(nameInput);
    await user.type(nameInput, 'Admin Updated');
    await user.click(screen.getByTestId('submit-employee'));

    await waitFor(() => {
      expect(mockUpdateMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          data: expect.objectContaining({ name: 'Admin Updated' }),
        })
      );
    });
  });

  it('should deactivate an employee via toggle', async () => {
    const { user } = renderPage();

    await user.click(screen.getByTestId('employee-actions-1'));

    const deactivateOption = await screen.findByTestId('toggle-active');
    await user.click(deactivateOption);

    await waitFor(() => {
      expect(mockDeactivateMutate).toHaveBeenCalledWith('1');
    });
  });

  it('should handle soft delete/deactivation with confirmation', async () => {
    const { user } = renderPage();

    await user.click(screen.getByTestId('employee-actions-1'));

    const powerOption = await screen.findByTestId('soft-delete');
    await user.click(powerOption);

    expect(mockConfirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockDeactivateMutate).toHaveBeenCalledWith('1');
    });
  });
});

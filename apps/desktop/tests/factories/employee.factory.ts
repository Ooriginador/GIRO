import { Employee, EmployeeRole } from '@/types';

export const createEmployee = (overrides: Partial<Employee> = {}): Employee => {
  return {
    id: crypto.randomUUID(),
    name: 'John Doe',
    email: 'john@example.com',
    pin: '8899',
    role: 'CASHIER' as EmployeeRole,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
};

export const createSafeEmployee = (overrides: Partial<Employee> = {}): Employee => {
  return createEmployee(overrides);
};

export const createAdmin = (overrides: Partial<Employee> = {}): Employee => {
  return createEmployee({ role: 'ADMIN', name: 'Admin User', ...overrides });
};

export const createCashier = (overrides: Partial<Employee> = {}): Employee => {
  return createEmployee({ role: 'CASHIER', name: 'Cashier User', ...overrides });
};

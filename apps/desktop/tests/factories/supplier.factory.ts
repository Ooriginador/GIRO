/**
 * @file supplier.factory.ts - Factory para geração de dados de fornecedores
 */

import type { Supplier } from '@/types';

let supplierCounter = 0;

/**
 * Cria um fornecedor mockado
 */
export const createSupplier = (overrides: Partial<Supplier> = {}): Supplier => {
  supplierCounter++;
  const id = `supplier-${String(supplierCounter).padStart(6, '0')}`;

  return {
    id,
    name: `Fornecedor ${supplierCounter}`,
    tradeName: `Fornecedor ${supplierCounter} Comercial`,
    cnpj: generateCNPJ(),
    email: `fornecedor${supplierCounter}@example.com`,
    phone: `(11) 9${String(supplierCounter).padStart(4, '0')}-${String(supplierCounter).padStart(
      4,
      '0'
    )}`,
    address: `Rua ${supplierCounter}, ${supplierCounter * 100}`,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
};

/**
 * Cria um fornecedor ativo
 */
export const createActiveSupplier = (overrides: Partial<Supplier> = {}): Supplier => {
  return createSupplier({
    isActive: true,
    ...overrides,
  });
};

/**
 * Cria um fornecedor inativo
 */
export const createInactiveSupplier = (overrides: Partial<Supplier> = {}): Supplier => {
  return createSupplier({
    isActive: false,
    ...overrides,
  });
};

/**
 * Cria um fornecedor distribuidor
 */
export const createDistributor = (overrides: Partial<Supplier> = {}): Supplier => {
  return createSupplier({
    name: 'Distribuidora Regional',
    tradeName: 'Distri Regional LTDA',
    ...overrides,
  });
};

/**
 * Cria um fornecedor de bebidas
 */
export const createBeverageSupplier = (overrides: Partial<Supplier> = {}): Supplier => {
  return createSupplier({
    name: 'Bebidas Brasil',
    tradeName: 'BB Distribuidora',
    ...overrides,
  });
};

/**
 * Cria lista de fornecedores
 */
export const createSupplierList = (count: number = 5): Supplier[] => {
  return Array.from({ length: count }, () => createSupplier());
};

/**
 * Gera CNPJ formatado (não validado)
 */
function generateCNPJ(): string {
  const base = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join('');
  return `${base.slice(0, 2)}.${base.slice(2, 5)}.${base.slice(5, 8)}/0001-00`;
}

/**
 * Reset counter (para beforeEach)
 */
export const resetSupplierFactoryCounter = () => {
  supplierCounter = 0;
};

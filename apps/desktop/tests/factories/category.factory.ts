/**
 * @file category.factory.ts - Factory para dados de categorias em testes
 */

import type { Category } from '@/types';

let categoryCounter = 0;

/**
 * Cria uma categoria mockada
 */
export const createCategory = (overrides: Partial<Category> = {}): Category => {
  categoryCounter++;

  return {
    id: `cat-${categoryCounter}`,
    name: `Categoria ${categoryCounter}`,
    color: '#3b82f6',
    icon: 'shopping-basket',
    parentId: null,
    isActive: true,
    productCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
};

/**
 * Cria uma subcategoria
 */
export const createSubcategory = (
  parentId: string,
  overrides: Partial<Category> = {}
): Category => {
  return createCategory({
    parentId,
    ...overrides,
  });
};

/**
 * Cria categorias padrão do sistema
 */
export const createDefaultCategories = (): Category[] => {
  return [
    createCategory({ id: 'cat-bebidas', name: 'Bebidas', icon: 'wine', color: '#3b82f6' }),
    createCategory({ id: 'cat-laticinios', name: 'Laticínios', icon: 'milk', color: '#22c55e' }),
    createCategory({
      id: 'cat-mercearia',
      name: 'Mercearia',
      icon: 'shopping-basket',
      color: '#f97316',
    }),
    createCategory({ id: 'cat-carnes', name: 'Carnes', icon: 'beef', color: '#ef4444' }),
    createCategory({ id: 'cat-higiene', name: 'Higiene', icon: 'spray-can', color: '#8b5cf6' }),
  ];
};

/**
 * Reset counter (use in beforeEach)
 */
export const resetCategoryFactoryCounter = () => {
  categoryCounter = 0;
};

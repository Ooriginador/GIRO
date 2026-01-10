/**
 * ProductsStore Tests  
 */

import { useProductsStore } from '@/stores/productsStore';
import type { Product } from '@/types/product';
import { act } from '@testing-library/react-native';

const createMockProduct = (overrides?: Partial<Product>): Product => ({
  id: '1',
  barcode: '7891000001',
  name: 'Test Product',
  description: '',
  categoryId: 'cat1',
  category: 'Bebidas',
  costPrice: 5.0,
  salePrice: 10.0,
  currentStock: 100,
  minStock: 10,
  unit: 'UN',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('productsStore', () => {
  beforeEach(() => {
    act(() => {
      useProductsStore.getState().reset();
    });
  });

  describe('initial state', () => {
    it('should have empty products cache', () => {
      const state = useProductsStore.getState();
      expect(state.products.size).toBe(0);
      expect(state.categories).toEqual([]);
      expect(state.recentScans).toEqual([]);
    });
  });

  describe('setProduct', () => {
    it('should add product to cache', () => {
      const product = createMockProduct();

      act(() => {
        useProductsStore.getState().setProduct(product);
      });

      const state = useProductsStore.getState();
      expect(state.products.size).toBeGreaterThan(0);
      expect(state.products.get(product.id)).toEqual(product);
    });

    it('should update existing product in cache', () => {
      const product = createMockProduct({ name: 'Original' });
      const updatedProduct = { ...product, name: 'Updated' };

      act(() => {
        useProductsStore.getState().setProduct(product);
        useProductsStore.getState().setProduct(updatedProduct);
      });

      const state = useProductsStore.getState();
      expect(state.products.get(product.id)?.name).toBe('Updated');
    });
  });

  describe('setProducts', () => {
    it('should set multiple products', () => {
      const products = [
        createMockProduct({ id: '1', name: 'Product 1' }),
        createMockProduct({ id: '2', name: 'Product 2', barcode: '7891000002' }),
      ];

      act(() => {
        useProductsStore.getState().setProducts(products);
      });

      const state = useProductsStore.getState();
      expect(state.products.size).toBeGreaterThan(0);
      expect(state.products.get('1')?.name).toBe('Product 1');
      expect(state.products.get('2')?.name).toBe('Product 2');
    });
  });

  describe('getProductByBarcode', () => {
    beforeEach(() => {
      const product = createMockProduct({ barcode: '7891000001' });
      act(() => {
        useProductsStore.getState().setProduct(product);
      });
    });

    it('should return product if exists', () => {
      const found = useProductsStore.getState().getProductByBarcode('7891000001');
      expect(found).toBeDefined();
      expect(found?.barcode).toBe('7891000001');
    });

    it('should return undefined if product not found', () => {
      const found = useProductsStore.getState().getProductByBarcode('9999999999999');
      expect(found).toBeUndefined();
    });
  });

  describe('getProductById', () => {
    beforeEach(() => {
      const product = createMockProduct({ id: 'prod-123' });
      act(() => {
        useProductsStore.getState().setProduct(product);
      });
    });

    it('should return product by id', () => {
      const found = useProductsStore.getState().getProductById('prod-123');
      expect(found).toBeDefined();
      expect(found?.id).toBe('prod-123');
    });

    it('should return undefined if not found', () => {
      const found = useProductsStore.getState().getProductById('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('removeProduct', () => {
    it('should remove product from cache', () => {
      const product = createMockProduct({ id: 'to-remove' });

      act(() => {
        useProductsStore.getState().setProduct(product);
      });

      expect(useProductsStore.getState().products.get('to-remove')).toBeDefined();

      act(() => {
        useProductsStore.getState().removeProduct('to-remove');
      });

      expect(useProductsStore.getState().products.get('to-remove')).toBeUndefined();
    });
  });

  describe('updateProductStock', () => {
    it('should update product stock', () => {
      const product = createMockProduct({ id: 'prod-1', currentStock: 100 });

      act(() => {
        useProductsStore.getState().setProduct(product);
        useProductsStore.getState().updateProductStock('prod-1', 50);
      });

      const updated = useProductsStore.getState().products.get('prod-1');
      expect(updated?.currentStock).toBe(50);
    });
  });

  describe('scan history', () => {
    it('should add scan to history', () => {
      const product = createMockProduct();

      act(() => {
        useProductsStore.getState().setProduct(product);
        useProductsStore.getState().addToScanHistory(product.barcode, product);
      });

      const state = useProductsStore.getState();
      expect(state.recentScans.length).toBeGreaterThan(0);
      expect(state.recentScans[0].barcode).toBe(product.barcode);
    });

    it('should clear scan history', () => {
      const product = createMockProduct();

      act(() => {
        useProductsStore.getState().addToScanHistory(product.barcode, product);
        useProductsStore.getState().clearScanHistory();
      });

      expect(useProductsStore.getState().recentScans).toEqual([]);
    });
  });

  describe('categories', () => {
    it('should set categories', () => {
      const categories = [
        { id: '1', name: 'Bebidas', description: '' },
        { id: '2', name: 'Alimentos', description: '' },
      ];

      act(() => {
        useProductsStore.getState().setCategories(categories);
      });

      expect(useProductsStore.getState().categories).toHaveLength(2);
      expect(useProductsStore.getState().categories[0].name).toBe('Bebidas');
    });

    it('should get category by id', () => {
      const categories = [{ id: 'cat-1', name: 'Test Category', description: '' }];

      act(() => {
        useProductsStore.getState().setCategories(categories);
      });

      const found = useProductsStore.getState().getCategoryById('cat-1');
      expect(found).toBeDefined();
      expect(found?.name).toBe('Test Category');
    });
  });

  describe('search', () => {
    it('should set search query', () => {
      act(() => {
        useProductsStore.getState().setSearchQuery('test');
      });

      expect(useProductsStore.getState().searchQuery).toBe('test');
    });

    it('should set search results', () => {
      const products = [createMockProduct({ name: 'Result 1' })];

      act(() => {
        useProductsStore.getState().setSearchResults(products);
      });

      expect(useProductsStore.getState().searchResults).toHaveLength(1);
    });

    it('should set searching state', () => {
      act(() => {
        useProductsStore.getState().setIsSearching(true);
      });

      expect(useProductsStore.getState().isSearching).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', () => {
      const product = createMockProduct();

      act(() => {
        useProductsStore.getState().setProduct(product);
        useProductsStore.getState().setSearchQuery('test');
        useProductsStore.getState().reset();
      });

      const state = useProductsStore.getState();
      expect(state.products.size).toBe(0);
      expect(state.searchQuery).toBe('');
      expect(state.recentScans).toEqual([]);
    });
  });
});

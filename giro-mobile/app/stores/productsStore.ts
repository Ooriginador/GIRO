/**
 * Store de produtos - cache local e busca
 */

import type { Category, Product, StockMovement } from '@types/product';
import { create } from 'zustand';

interface ScanHistoryItem {
  barcode: string;
  product: Product | null;
  scannedAt: number;
}

interface ProductsStore {
  // State
  products: Map<string, Product>;
  categories: Category[];
  recentScans: ScanHistoryItem[];
  searchResults: Product[];
  isSearching: boolean;
  searchQuery: string;
  selectedProduct: Product | null;
  lastMovements: StockMovement[];

  // Actions
  setProduct: (product: Product) => void;
  setProducts: (products: Product[]) => void;
  removeProduct: (productId: string) => void;
  updateProductStock: (productId: string, newStock: number) => void;
  setCategories: (categories: Category[]) => void;
  addToScanHistory: (barcode: string, product: Product | null) => void;
  clearScanHistory: () => void;
  setSearchResults: (products: Product[]) => void;
  setIsSearching: (isSearching: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSelectedProduct: (product: Product | null) => void;
  setLastMovements: (movements: StockMovement[]) => void;

  // Getters
  getProductByBarcode: (barcode: string) => Product | undefined;
  getProductById: (id: string) => Product | undefined;
  getCategoryById: (id: string) => Category | undefined;

  // Reset
  reset: () => void;
}

const MAX_SCAN_HISTORY = 20;

const initialState = {
  products: new Map<string, Product>(),
  categories: [],
  recentScans: [],
  searchResults: [],
  isSearching: false,
  searchQuery: '',
  selectedProduct: null,
  lastMovements: [],
};

export const useProductsStore = create<ProductsStore>((set, get) => ({
  ...initialState,

  // Actions
  setProduct: (product) =>
    set((state) => {
      const newProducts = new Map(state.products);
      newProducts.set(product.id, product);
      // Também indexa por barcode
      if (product.barcode) {
        newProducts.set(`barcode:${product.barcode}`, product);
      }
      return { products: newProducts };
    }),

  setProducts: (products) =>
    set(() => {
      const newProducts = new Map<string, Product>();
      products.forEach((product) => {
        newProducts.set(product.id, product);
        if (product.barcode) {
          newProducts.set(`barcode:${product.barcode}`, product);
        }
      });
      return { products: newProducts };
    }),

  removeProduct: (productId) =>
    set((state) => {
      const newProducts = new Map(state.products);
      const product = newProducts.get(productId);
      if (product) {
        newProducts.delete(productId);
        if (product.barcode) {
          newProducts.delete(`barcode:${product.barcode}`);
        }
      }
      return { products: newProducts };
    }),

  updateProductStock: (productId, newStock) =>
    set((state) => {
      const newProducts = new Map(state.products);
      const product = newProducts.get(productId);
      if (product) {
        const updatedProduct = { ...product, currentStock: newStock };
        newProducts.set(productId, updatedProduct);
        if (product.barcode) {
          newProducts.set(`barcode:${product.barcode}`, updatedProduct);
        }
      }
      return { products: newProducts };
    }),

  setCategories: (categories) => set({ categories }),

  addToScanHistory: (barcode, product) =>
    set((state) => {
      const newItem: ScanHistoryItem = {
        barcode,
        product,
        scannedAt: Date.now(),
      };

      // Remove duplicata se existir
      const filtered = state.recentScans.filter((item) => item.barcode !== barcode);

      // Adiciona no início e limita tamanho
      const updated = [newItem, ...filtered].slice(0, MAX_SCAN_HISTORY);

      return { recentScans: updated };
    }),

  clearScanHistory: () => set({ recentScans: [] }),

  setSearchResults: (products) => set({ searchResults: products }),

  setIsSearching: (isSearching) => set({ isSearching }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSelectedProduct: (product) => set({ selectedProduct: product }),

  setLastMovements: (movements) => set({ lastMovements: movements }),

  // Getters
  getProductByBarcode: (barcode) => {
    return get().products.get(`barcode:${barcode}`);
  },

  getProductById: (id) => {
    return get().products.get(id);
  },

  getCategoryById: (id) => {
    return get().categories.find((c) => c.id === id);
  },

  // Reset
  reset: () =>
    set({
      ...initialState,
      products: new Map<string, Product>(),
    }),
}));

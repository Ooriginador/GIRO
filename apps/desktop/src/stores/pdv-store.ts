import { create } from 'zustand';
import { getHeldSales, saveHeldSale, deleteHeldSale } from '@/lib/tauri';
import type { HeldSale, PaymentMethod, CashSession, HeldSaleItem } from '@/types';
export type { PaymentMethod };

// Local definition matching UI needs (Flat structure)
export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  barcode?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  unit: string;
  isWeighted: boolean;
}

interface PDVState {
  // Estado do carrinho
  items: CartItem[];
  discount: number;
  discountReason: string;
  paymentMethod: PaymentMethod | null;
  amountPaid: number;
  customerId: string | null;
  heldSales: HeldSale[];

  // Estado da sessão de caixa
  cashSession: CashSession | null;
  currentSession: CashSession | null; // alias for compatibility

  // Estado do modal de pagamento
  isPaymentModalOpen: boolean;
  selectedPaymentMethod: PaymentMethod | null;

  // Status
  isProcessing: boolean;
  lastSaleId: string | null;

  // Ações do carrinho
  addItem: (item: Omit<CartItem, 'id' | 'discount'>) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  updateItemDiscount: (itemId: string, discount: number) => void;
  setDiscount: (discount: number, reason?: string) => void;
  clearCart: () => void;

  // Ações de sessão
  setCashSession: (session: CashSession | null) => void;
  setCustomer: (customerId: string | null) => void;
  holdSale: () => Promise<void>;
  resumeSale: (id: string) => Promise<void>;
  removeHeldSale: (id: string) => Promise<void>;
  loadHeldSales: () => Promise<void>;

  // Ações de modal
  openPaymentModal: () => void;
  closePaymentModal: () => void;

  // Ações de pagamento
  setPaymentMethod: (method: PaymentMethod) => void;
  setSelectedPaymentMethod: (method: PaymentMethod | null) => void;
  setAmountPaid: (amount: number) => void;
  resetPayment: () => void;

  // Ações de processamento
  setProcessing: (processing: boolean) => void;
  setLastSaleId: (saleId: string | null) => void;

  // Computed
  getSubtotal: () => number;
  getTotal: () => number;
  getChange: () => number;
  getItemCount: () => number;
}

export const usePDVStore = create<PDVState>()((set, get) => ({
  // Estado inicial
  items: [],
  discount: 0,
  discountReason: '',
  paymentMethod: null,
  amountPaid: 0,
  cashSession: null,
  currentSession: null,
  isPaymentModalOpen: false,
  selectedPaymentMethod: null,
  isProcessing: false,
  lastSaleId: null,
  customerId: null,
  heldSales: [],

  loadHeldSales: async () => {
    try {
      const sales = await getHeldSales();
      set({ heldSales: sales });
    } catch (e) {
      console.error('Failed to load held sales:', e);
    }
  },

  // Adicionar item ao carrinho
  addItem: (item) => {
    set((state) => {
      const existingIndex = state.items.findIndex(
        (i) => i.productId === item.productId && !item.isWeighted
      );

      if (existingIndex >= 0) {
        const updatedItems = [...state.items];
        const existing = updatedItems[existingIndex];
        if (existing) {
          existing.quantity += item.quantity;
        }
        return { items: updatedItems };
      }

      const newItem: CartItem = {
        ...item,
        id: crypto.randomUUID(),
        discount: 0,
      };

      return { items: [...state.items, newItem] };
    });
  },

  removeItem: (itemId) => {
    set((state) => ({
      items: state.items.filter((i) => i.id !== itemId),
    }));
  },

  updateQuantity: (itemId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(itemId);
      return;
    }
    set((state) => ({
      items: state.items.map((i) => (i.id === itemId ? { ...i, quantity } : i)),
    }));
  },

  updateItemQuantity: (itemId, quantity) => {
    get().updateQuantity(itemId, quantity);
  },

  updateItemDiscount: (itemId, discount) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.id === itemId ? { ...i, discount: Math.max(0, discount) } : i
      ),
    }));
  },

  setDiscount: (discount, reason = '') => {
    set({ discount: Math.max(0, discount), discountReason: reason });
  },

  clearCart: () => {
    set({
      items: [],
      discount: 0,
      discountReason: '',
      paymentMethod: null,
      amountPaid: 0,
      isProcessing: false,
      isPaymentModalOpen: false,
      selectedPaymentMethod: null,
      customerId: null,
    });
  },

  setCashSession: (session) => {
    set({ cashSession: session, currentSession: session });
  },
  setCustomer: (customerId) => {
    set({ customerId });
  },

  holdSale: async () => {
    const { items, discount, discountReason, customerId, clearCart } = get();
    if (items.length === 0) return;

    try {
      const heldItems: HeldSaleItem[] = items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        barcode: i.barcode,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount,
        unit: i.unit,
        isWeighted: i.isWeighted,
      }));

      const newHold = {
        id: crypto.randomUUID(),
        customerId: customerId || null,
        discountValue: discount,
        discountReason,
        items: heldItems,
      };

      const result = await saveHeldSale(newHold);

      set((state) => ({
        heldSales: [result, ...state.heldSales],
      }));

      clearCart();
    } catch (e) {
      console.error('Failed to hold sale:', e);
    }
  },

  resumeSale: async (id) => {
    const { heldSales, items } = get();
    if (items.length > 0) return;

    const sale = heldSales.find((s) => s.id === id);
    if (!sale) return;

    try {
      await deleteHeldSale(id);

      const restoredItems: CartItem[] = sale.items.map((i) => ({
        id: crypto.randomUUID(),
        productId: i.productId,
        productName: i.productName,
        barcode: i.barcode,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount,
        unit: i.unit,
        isWeighted: i.isWeighted,
      }));

      set({
        items: restoredItems,
        discount: sale.discountValue,
        discountReason: sale.discountReason || '',
        customerId: sale.customerId || null,
        heldSales: heldSales.filter((s) => s.id !== id),
      });
    } catch (e) {
      console.error('Failed to resume sale:', e);
    }
  },

  removeHeldSale: async (id) => {
    try {
      await deleteHeldSale(id);

      set((state) => ({
        heldSales: state.heldSales.filter((s) => s.id !== id),
      }));
    } catch (e) {
      console.error('Failed to remove held sale:', e);
    }
  },

  openPaymentModal: () => {
    set({ isPaymentModalOpen: true });
  },

  closePaymentModal: () => {
    set({ isPaymentModalOpen: false, selectedPaymentMethod: null });
  },

  setPaymentMethod: (method) => {
    set({ paymentMethod: method, selectedPaymentMethod: method });
  },

  setSelectedPaymentMethod: (method) => {
    set({ selectedPaymentMethod: method });
  },

  setAmountPaid: (amount) => {
    set({ amountPaid: Math.max(0, amount) });
  },

  resetPayment: () => {
    set({
      paymentMethod: null,
      amountPaid: 0,
      selectedPaymentMethod: null,
      isPaymentModalOpen: false,
    });
  },

  setProcessing: (processing) => {
    set({ isProcessing: processing });
  },

  setLastSaleId: (saleId) => {
    set({ lastSaleId: saleId });
  },

  getSubtotal: () => {
    const { items } = get();
    return items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unitPrice - item.discount;
      return sum + Math.max(0, itemTotal);
    }, 0);
  },

  getTotal: () => {
    const { discount } = get();
    const subtotal = get().getSubtotal();
    return Math.max(0, subtotal - discount);
  },

  getChange: () => {
    const { amountPaid } = get();
    const total = get().getTotal();
    return Math.max(0, amountPaid - total);
  },

  getItemCount: () => {
    const { items } = get();
    return items.reduce((sum, item) => sum + item.quantity, 0);
  },
}));

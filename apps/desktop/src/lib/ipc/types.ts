// IPC Types mirroring Rust structs (serde)

export type PaymentMethod = 'CASH' | 'PIX' | 'CREDIT' | 'DEBIT' | 'VOUCHER' | 'OTHER';

export interface CreateSaleItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount?: number | null;
}

export interface CreateSale {
  items: CreateSaleItem[];
  paymentMethod: PaymentMethod;
  amountPaid: number;
  discountType?: 'PERCENTAGE' | 'FIXED' | null;
  discountValue?: number | null;
  discountReason?: string | null;
  employeeId: string;
  cashSessionId: string;
}

export interface CreateCashSession {
  employeeId: string;
  openingBalance: number;
  notes?: string | null;
}

export interface ReceiptItem {
  code: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface Receipt {
  companyName: string;
  companyAddress: string;
  companyCnpj?: string | null;
  companyPhone?: string | null;

  saleNumber: number;
  operatorName: string;
  dateTime: string;

  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  total: number;

  paymentMethod: string;
  amountPaid: number;
  change: number;
}

// Generic server envelope
export interface InvokeResult<T> {
  ok: boolean;
  code?: string | null;
  error?: string | null;
  data?: T | null;
}

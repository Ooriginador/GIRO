import { z } from 'zod';

// Envelope para respostas padrão
export const InvokeResult = z.object({
  ok: z.boolean(),
  code: z.string().optional(),
  error: z.string().optional(),
  data: z.any().optional(),
});

// Mensagem de scanner mobile
export const ScanMessage = z.object({
  type: z.literal('scan'),
  barcode: z.string(),
  ts: z.string(),
  deviceId: z.string(),
});

// License activation request/response
export const LicenseActivateRequest = z.object({
  hardwareId: z.string(),
  licenseKey: z.string(),
});

export const LicenseActivateResponse = z.object({
  status: z.enum(['active', 'invalid', 'expired', 'suspended']),
  activatedAt: z.string().optional(),
  expiresAt: z.string().optional(),
  message: z.string().optional(),
});

// Stored license file structure (partial)
export const StoredLicense = z.object({
  key: z.string(),
  activated_at: z.string().optional(),
  last_validated_at: z.string().optional(),
  info: z.any().optional(),
});

export const ServerTime = z.string();

// CreateSale and related
export const CreateSaleItem = z.object({
  productId: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  discount: z.number().optional(),
});

export const CreateSale = z.object({
  items: z.array(CreateSaleItem),
  paymentMethod: z.enum(['CASH', 'PIX', 'CREDIT', 'DEBIT', 'VOUCHER', 'OTHER']),
  amountPaid: z.number(),
  discountType: z.string().optional(),
  discountValue: z.number().optional(),
  discountReason: z.string().optional(),
  employeeId: z.string(),
  cashSessionId: z.string(),
});

// Cash session
export const CreateCashSession = z.object({
  employeeId: z.string(),
  openingBalance: z.number(),
  notes: z.string().optional(),
});

// Receipt for printing
export const ReceiptItem = z.object({
  code: z.string(),
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  unitPrice: z.number(),
  total: z.number(),
});

export const Receipt = z.object({
  companyName: z.string(),
  companyAddress: z.string(),
  companyCnpj: z.string().optional(),
  companyPhone: z.string().optional(),
  saleNumber: z.number(),
  operatorName: z.string(),
  dateTime: z.string(),
  items: z.array(ReceiptItem),
  subtotal: z.number(),
  discount: z.number(),
  total: z.number(),
  paymentMethod: z.string(),
  amountPaid: z.number(),
  change: z.number(),
});

export type CreateSale = z.infer<typeof CreateSale>;
export type CreateSaleItem = z.infer<typeof CreateSaleItem>;
export type CreateCashSession = z.infer<typeof CreateCashSession>;
export type Receipt = z.infer<typeof Receipt>;

export type ScanMessage = z.infer<typeof ScanMessage>;
export type LicenseActivateRequest = z.infer<typeof LicenseActivateRequest>;
export type LicenseActivateResponse = z.infer<typeof LicenseActivateResponse>;

export default {
  InvokeResult,
  ScanMessage,
  LicenseActivateRequest,
  LicenseActivateResponse,
};

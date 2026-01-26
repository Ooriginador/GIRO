/**
 * @file Enterprise Test Utilities
 * @description Helpers e factories para testes do módulo Enterprise
 */

import type {
  Contract,
  WorkFront,
  Activity,
  MaterialRequest,
  RequestItem,
  StockTransfer,
  TransferItem,
  StockLocation,
  StockBalance,
} from '@/types/enterprise';

// =============================================================================
// FACTORIES
// =============================================================================

let idCounter = 0;

export function createTestId(): string {
  return `test-${++idCounter}-${Date.now()}`;
}

export function createContract(overrides: Partial<Contract> = {}): Contract {
  const id = createTestId();
  return {
    id,
    code: `OBRA-${id.slice(-4)}`,
    name: 'Contrato de Teste',
    clientName: 'Cliente Teste Ltda',
    clientDocument: '12.345.678/0001-90',
    managerId: 'mgr-1',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createWorkFront(overrides: Partial<WorkFront> = {}): WorkFront {
  const id = createTestId();
  return {
    id,
    code: `FR-${id.slice(-4)}`,
    name: 'Frente de Teste',
    contractId: 'contract-1',
    supervisorId: 'sup-1',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createActivity(overrides: Partial<Activity> = {}): Activity {
  const id = createTestId();
  return {
    id,
    code: `AT-${id.slice(-4)}`,
    name: 'Atividade de Teste',
    workFrontId: 'wf-1',
    status: 'IN_PROGRESS',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createMaterialRequest(overrides: Partial<MaterialRequest> = {}): MaterialRequest {
  const id = createTestId();
  return {
    id,
    code: `REQ-${id.slice(-4)}`,
    contractId: 'contract-1',
    workFrontId: 'wf-1',
    requesterId: 'user-1',
    destinationLocationId: 'loc-1',
    status: 'PENDING',
    priority: 'NORMAL',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createRequestItem(overrides: Partial<RequestItem> = {}): RequestItem {
  const id = createTestId();
  return {
    id,
    requestId: 'req-1',
    productId: 'prod-1',
    requestedQuantity: 10,
    unit: 'UN',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createStockTransfer(overrides: Partial<StockTransfer> = {}): StockTransfer {
  const id = createTestId();
  return {
    id,
    code: `TRF-${id.slice(-4)}`,
    sourceLocationId: 'loc-1',
    destinationLocationId: 'loc-2',
    requesterId: 'user-1',
    status: 'PENDING',
    priority: 'NORMAL',
    requestedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createTransferItem(overrides: Partial<TransferItem> = {}): TransferItem {
  const id = createTestId();
  return {
    id,
    transferId: 'tr-1',
    productId: 'prod-1',
    quantity: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createStockLocation(overrides: Partial<StockLocation> = {}): StockLocation {
  const id = createTestId();
  return {
    id,
    code: `LOC-${id.slice(-4)}`,
    name: 'Local de Teste',
    type: 'WAREHOUSE',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createStockBalance(overrides: Partial<StockBalance> = {}): StockBalance {
  const id = createTestId();
  return {
    id,
    locationId: 'loc-1',
    productId: 'prod-1',
    quantity: 100,
    reservedQuantity: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// =============================================================================
// MOCK HELPERS
// =============================================================================

export function createMockInvoke() {
  const responses: Record<string, unknown> = {};

  const mockInvoke = async (command: string, args?: unknown) => {
    if (command in responses) {
      const response = responses[command];
      if (typeof response === 'function') {
        return response(args);
      }
      return response;
    }
    throw new Error(`Unmocked command: ${command}`);
  };

  mockInvoke.mockCommand = (command: string, response: unknown) => {
    responses[command] = response;
  };

  mockInvoke.mockCommandOnce = (command: string, response: unknown) => {
    const originalResponse = responses[command];
    responses[command] = () => {
      responses[command] = originalResponse;
      return response;
    };
  };

  return mockInvoke;
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

export function isValidContractCode(code: string): boolean {
  return /^[A-Z]{2,5}-\d{4}-\d{3,4}$/.test(code);
}

export function isValidRequestCode(code: string): boolean {
  return /^REQ-\d{4}-\d{4,6}$/.test(code);
}

export function isValidTransferCode(code: string): boolean {
  return /^TRF-\d{4}-\d{4,6}$/.test(code);
}

// =============================================================================
// WORKFLOW HELPERS
// =============================================================================

export const REQUEST_STATUS_FLOW = [
  'DRAFT',
  'PENDING',
  'APPROVED',
  'SEPARATING',
  'DELIVERED',
] as const;

export const TRANSFER_STATUS_FLOW = [
  'DRAFT',
  'PENDING',
  'SEPARATING',
  'IN_TRANSIT',
  'RECEIVED',
  'COMPLETED',
] as const;

export function getNextRequestStatus(
  current: (typeof REQUEST_STATUS_FLOW)[number]
): (typeof REQUEST_STATUS_FLOW)[number] | null {
  const index = REQUEST_STATUS_FLOW.indexOf(current);
  if (index === -1 || index === REQUEST_STATUS_FLOW.length - 1) {
    return null;
  }
  return REQUEST_STATUS_FLOW[index + 1];
}

export function getNextTransferStatus(
  current: (typeof TRANSFER_STATUS_FLOW)[number]
): (typeof TRANSFER_STATUS_FLOW)[number] | null {
  const index = TRANSFER_STATUS_FLOW.indexOf(current);
  if (index === -1 || index === TRANSFER_STATUS_FLOW.length - 1) {
    return null;
  }
  return TRANSFER_STATUS_FLOW[index + 1];
}

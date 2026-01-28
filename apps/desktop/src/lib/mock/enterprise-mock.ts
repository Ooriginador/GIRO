/**
 * Mock Data para Enterprise Module
 * Dados de exemplo tipados corretamente para desenvolvimento
 */

import type {
  Contract,
  WorkFront,
  Activity,
  MaterialRequest,
  MaterialRequestItem,
  StockTransfer,
  StockTransferItem,
  StockLocation,
} from '@/types/enterprise';
import type { Employee } from '@/stores/auth-store';

// ============================================================================
// Timestamps helper
// ============================================================================
const now = new Date().toISOString();
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

// ============================================================================
// Employees
// ============================================================================
export const mockEmployees: Employee[] = [
  { id: 'emp-1', name: 'Carlos Ferreira', role: 'CONTRACT_MANAGER' },
  { id: 'emp-2', name: 'João Silva', role: 'SUPERVISOR' },
  { id: 'emp-3', name: 'Maria Santos', role: 'WAREHOUSE' },
  { id: 'emp-4', name: 'Pedro Alves', role: 'REQUESTER' },
  { id: 'emp-5', name: 'Ana Costa', role: 'ADMIN' },
];

// ============================================================================
// Contracts
// ============================================================================
export const mockContract: Contract = {
  id: 'contract-1',
  code: 'OBR-2026-001',
  name: 'Obra Nova Industrial',
  clientName: 'Cliente Industrial S.A.',
  startDate: lastMonth,
  costCenter: 'CC-001',
  status: 'ACTIVE',
  managerId: 'emp-1',
  manager: mockEmployees[0],
  createdAt: lastMonth,
  updatedAt: now,
};

// ============================================================================
// Stock Locations
// ============================================================================
export const mockStockLocation: StockLocation = {
  id: 'loc-1',
  code: 'ALM-CENTRAL',
  name: 'Almoxarifado Central',
  type: 'CENTRAL',
  isActive: true,
  createdAt: lastMonth,
  updatedAt: now,
};

export const mockStockLocationField: StockLocation = {
  id: 'loc-2',
  code: 'ALM-OBRA-001',
  name: 'Almoxarifado Obra',
  type: 'OBRA',
  contractId: 'contract-1',
  isActive: true,
  createdAt: lastMonth,
  updatedAt: now,
};

// ============================================================================
// Work Fronts
// ============================================================================
export const mockWorkFront: WorkFront = {
  id: 'wf-1',
  code: 'FR-001',
  name: 'Frente A - Fundação',
  contractId: 'contract-1',
  contract: mockContract,
  supervisorId: 'emp-2',
  supervisor: mockEmployees[1],
  status: 'ACTIVE',
  progress: 35,
  createdAt: lastMonth,
  updatedAt: now,
};

// ============================================================================
// Activities
// ============================================================================
export const mockActivities: Activity[] = [
  {
    id: 'act-1',
    code: 'AT-001',
    name: 'Escavação',
    workFrontId: 'wf-1',
    status: 'COMPLETED',
    progress: 100,
    createdAt: lastMonth,
    updatedAt: lastWeek,
  },
  {
    id: 'act-2',
    code: 'AT-002',
    name: 'Forma e Armação',
    workFrontId: 'wf-1',
    status: 'IN_PROGRESS',
    progress: 60,
    createdAt: lastWeek,
    updatedAt: now,
  },
  {
    id: 'act-3',
    code: 'AT-003',
    name: 'Concretagem',
    workFrontId: 'wf-1',
    status: 'PENDING',
    progress: 0,
    createdAt: yesterday,
    updatedAt: now,
  },
];

// ============================================================================
// Material Requests
// ============================================================================
export const mockMaterialRequest: MaterialRequest = {
  id: 'req-1',
  code: 'REQ-2026-0001',
  contractId: 'contract-1',
  contract: mockContract,
  workFrontId: 'wf-1',
  workFront: mockWorkFront,
  activityId: 'act-1',
  sourceLocationId: 'loc-1',
  requesterId: 'emp-4',
  requester: mockEmployees[3],
  status: 'PENDING',
  priority: 'HIGH',
  requestedAt: yesterday,
  createdAt: yesterday,
  updatedAt: now,
};

export const mockMaterialRequestItems: MaterialRequestItem[] = [
  {
    id: 'item-1',
    requestId: 'req-1',
    productId: 'prod-1',
    requestedQuantity: 100,
    approvedQuantity: 100,
    deliveredQuantity: 0,
  },
  {
    id: 'item-2',
    requestId: 'req-1',
    productId: 'prod-2',
    requestedQuantity: 50,
    approvedQuantity: 50,
    deliveredQuantity: 0,
  },
];

// ============================================================================
// Stock Transfers
// ============================================================================
export const mockStockTransfer: StockTransfer = {
  id: 'trf-1',
  code: 'TRF-2026-0001',
  sourceLocationId: 'loc-1',
  sourceLocation: mockStockLocation,
  destinationLocationId: 'loc-2',
  destinationLocation: mockStockLocationField,
  requesterId: 'emp-3',
  requester: mockEmployees[2],
  status: 'PENDING',
  priority: 'NORMAL',
  requestedAt: yesterday,
  createdAt: yesterday,
  updatedAt: now,
};

export const mockTransferItems: StockTransferItem[] = [
  {
    id: 'trf-item-1',
    transferId: 'trf-1',
    productId: 'prod-1',
    quantity: 50,
    requestedQty: 50,
    receivedQty: 0,
  },
];

// ============================================================================
// Factory functions for creating mock data with custom IDs
// ============================================================================
export function createMockMaterialRequest(id: string): MaterialRequest {
  return {
    ...mockMaterialRequest,
    id,
    code: `REQ-${id.substring(0, 8).toUpperCase()}`,
  };
}

export function createMockWorkFront(id: string): WorkFront {
  return {
    ...mockWorkFront,
    id,
    code: `FR-${id.substring(0, 3).toUpperCase()}`,
  };
}

export function createMockContract(id: string): Contract {
  return {
    ...mockContract,
    id,
    code: `CTR-${id.substring(0, 8).toUpperCase()}`,
  };
}

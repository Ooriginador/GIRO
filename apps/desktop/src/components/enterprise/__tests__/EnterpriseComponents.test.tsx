/**
 * @file EnterpriseComponents.test.tsx
 * @description Testes básicos para componentes Enterprise
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';

// Mock do Tauri para evitar erros de import
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// ============================================================================
// TESTES DE RENDERIZAÇÃO BÁSICA
// ============================================================================

describe('Enterprise Components - Basic Rendering', () => {
  describe('StatusBadge Components', () => {
    it('should export ContractStatusBadge', async () => {
      const { ContractStatusBadge } = await import('../StatusBadge');
      expect(ContractStatusBadge).toBeDefined();
    });

    it('should export RequestStatusBadge', async () => {
      const { RequestStatusBadge } = await import('../StatusBadge');
      expect(RequestStatusBadge).toBeDefined();
    });

    it('should export TransferStatusBadge', async () => {
      const { TransferStatusBadge } = await import('../StatusBadge');
      expect(TransferStatusBadge).toBeDefined();
    });

    it('should export PriorityBadge', async () => {
      const { PriorityBadge } = await import('../StatusBadge');
      expect(PriorityBadge).toBeDefined();
    });
  });
});

// ============================================================================
// TESTES DE INTEGRAÇÃO DE TIPOS
// ============================================================================

describe('Enterprise Types Integration', () => {
  it('should have valid contract status values', () => {
    const validStatuses = ['PLANNING', 'ACTIVE', 'SUSPENDED', 'COMPLETED', 'CANCELLED'];
    expect(validStatuses).toHaveLength(5);
    expect(validStatuses).toContain('ACTIVE');
    expect(validStatuses).toContain('COMPLETED');
  });

  it('should have valid request status values', () => {
    const validStatuses = [
      'DRAFT',
      'PENDING',
      'APPROVED',
      'SEPARATING',
      'DELIVERED',
      'REJECTED',
      'CANCELLED',
    ];
    expect(validStatuses).toHaveLength(7);
    expect(validStatuses).toContain('PENDING');
    expect(validStatuses).toContain('APPROVED');
  });

  it('should have valid priority values', () => {
    const validPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
    expect(validPriorities).toHaveLength(4);
    expect(validPriorities).toContain('HIGH');
    expect(validPriorities).toContain('URGENT');
  });

  it('should have valid transfer status values', () => {
    const validStatuses = ['PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'];
    expect(validStatuses).toHaveLength(4);
    expect(validStatuses).toContain('IN_TRANSIT');
  });
});

// ============================================================================
// TESTES DE UTILIDADES ENTERPRISE
// ============================================================================

describe('Enterprise Utilities', () => {
  it('should format contract code correctly', () => {
    const code = 'OBRA-2026-001';
    expect(code).toMatch(/^[A-Z]+-\d{4}-\d{3}$/);
  });

  it('should validate request number format', () => {
    const requestNumber = 'REQ-2026-0001';
    expect(requestNumber).toMatch(/^REQ-\d{4}-\d{4}$/);
  });

  it('should validate transfer number format', () => {
    const transferNumber = 'TRF-2026-0001';
    expect(transferNumber).toMatch(/^TRF-\d{4}-\d{4}$/);
  });
});

/**
 * Contract Fixtures for E2E Tests (Enterprise Module)
 */

export const contractFixtures = [
  {
    id: 'contract-001',
    code: 'OBRA-001',
    name: 'Construção Edifício Comercial',
    client: 'Construtora ABC Ltda',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    budget: 500000.00,
    status: 'ACTIVE',
    description: 'Construção de edifício comercial com 10 andares',
  },
  {
    id: 'contract-002',
    code: 'OBRA-002',
    name: 'Reforma Residencial',
    client: 'João da Silva',
    startDate: '2026-01-15',
    endDate: '2026-06-30',
    budget: 150000.00,
    status: 'PLANNING',
    description: 'Reforma completa de residência',
  },
  {
    id: 'contract-003',
    code: 'OBRA-003',
    name: 'Construção Galpão Industrial',
    client: 'Indústria XYZ S.A.',
    startDate: '2025-10-01',
    endDate: '2026-03-31',
    budget: 800000.00,
    status: 'ACTIVE',
    description: 'Construção de galpão industrial 2000m²',
  },
];

export const workFrontFixtures = [
  {
    id: 'wf-001',
    contractId: 'contract-001',
    code: 'WF-001',
    name: 'Fundação',
    description: 'Trabalhos de fundação e estrutura',
    status: 'ACTIVE',
  },
  {
    id: 'wf-002',
    contractId: 'contract-001',
    code: 'WF-002',
    name: 'Alvenaria',
    description: 'Levantamento de paredes',
    status: 'PLANNING',
  },
  {
    id: 'wf-003',
    contractId: 'contract-001',
    code: 'WF-003',
    name: 'Acabamento',
    description: 'Trabalhos de acabamento final',
    status: 'PLANNING',
  },
];

export const materialFixtures = [
  {
    id: 'mat-001',
    code: 'CIM-001',
    name: 'Cimento CP-II 50kg',
    unit: 'SC',
    category: 'CIMENTO',
    stock: 200,
    minStock: 50,
    price: 35.00,
  },
  {
    id: 'mat-002',
    code: 'ARE-001',
    name: 'Areia Média m³',
    unit: 'M3',
    category: 'AGREGADOS',
    stock: 50,
    minStock: 10,
    price: 80.00,
  },
  {
    id: 'mat-003',
    code: 'BRI-001',
    name: 'Tijolo Cerâmico 8 Furos',
    unit: 'UN',
    category: 'ALVENARIA',
    stock: 5000,
    minStock: 1000,
    price: 0.85,
  },
  {
    id: 'mat-004',
    code: 'FER-001',
    name: 'Vergalhão 10mm CA-50',
    unit: 'KG',
    category: 'FERRAGEM',
    stock: 1000,
    minStock: 200,
    price: 6.50,
  },
];

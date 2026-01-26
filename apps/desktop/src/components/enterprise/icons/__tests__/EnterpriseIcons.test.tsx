import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeAll } from 'vitest';

// Unmock lucide-react for this test file
beforeAll(async () => {
  vi.unmock('lucide-react');
});

import {
  ActivityIcon,
  CentralWarehouseIcon,
  ConsumptionIcon,
  ContractIcon,
  CrewIcon,
  EnterpriseIcons,
  EquipmentIcon,
  InTransitIcon,
  InventoryIcon,
  MaterialCheckedIcon,
  MaterialIcon,
  MaterialRequestIcon,
  SiteLocationIcon,
  StockInIcon,
  StockLocationIcon,
  StockOutIcon,
  StockTransferIcon,
  WorkFrontIcon,
  locationTypeIcons,
  requestStatusIcons,
  transferStatusIcons,
} from '../EnterpriseIcons';

describe('EnterpriseIcons', () => {
  describe('Individual Icon Components', () => {
    const iconComponents = [
      { name: 'ContractIcon', Component: ContractIcon },
      { name: 'WorkFrontIcon', Component: WorkFrontIcon },
      { name: 'ActivityIcon', Component: ActivityIcon },
      { name: 'StockLocationIcon', Component: StockLocationIcon },
      { name: 'MaterialRequestIcon', Component: MaterialRequestIcon },
      { name: 'StockTransferIcon', Component: StockTransferIcon },
      { name: 'InventoryIcon', Component: InventoryIcon },
      { name: 'ConsumptionIcon', Component: ConsumptionIcon },
      { name: 'StockInIcon', Component: StockInIcon },
      { name: 'StockOutIcon', Component: StockOutIcon },
      { name: 'MaterialCheckedIcon', Component: MaterialCheckedIcon },
      { name: 'InTransitIcon', Component: InTransitIcon },
      { name: 'CentralWarehouseIcon', Component: CentralWarehouseIcon },
      { name: 'SiteLocationIcon', Component: SiteLocationIcon },
      { name: 'CrewIcon', Component: CrewIcon },
      { name: 'EquipmentIcon', Component: EquipmentIcon },
      { name: 'MaterialIcon', Component: MaterialIcon },
    ];

    it.each(iconComponents)('should render $name correctly', ({ Component }) => {
      const { container } = render(<Component data-testid="icon" />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it.each(iconComponents)('should accept custom size for $name', ({ Component }) => {
      const { container } = render(<Component size={32} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '32');
      expect(svg).toHaveAttribute('height', '32');
    });

    it.each(iconComponents)('should accept custom className for $name', ({ Component }) => {
      const { container } = render(<Component className="custom-class" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('custom-class');
    });
  });

  describe('EnterpriseIcons Object', () => {
    it('should export all icons', () => {
      expect(EnterpriseIcons.Contract).toBeDefined();
      expect(EnterpriseIcons.WorkFront).toBeDefined();
      expect(EnterpriseIcons.Activity).toBeDefined();
      expect(EnterpriseIcons.StockLocation).toBeDefined();
      expect(EnterpriseIcons.MaterialRequest).toBeDefined();
      expect(EnterpriseIcons.StockTransfer).toBeDefined();
      expect(EnterpriseIcons.Inventory).toBeDefined();
      expect(EnterpriseIcons.Consumption).toBeDefined();
      expect(EnterpriseIcons.StockIn).toBeDefined();
      expect(EnterpriseIcons.StockOut).toBeDefined();
      expect(EnterpriseIcons.MaterialChecked).toBeDefined();
      expect(EnterpriseIcons.InTransit).toBeDefined();
      expect(EnterpriseIcons.CentralWarehouse).toBeDefined();
      expect(EnterpriseIcons.SiteLocation).toBeDefined();
      expect(EnterpriseIcons.Crew).toBeDefined();
      expect(EnterpriseIcons.Equipment).toBeDefined();
      expect(EnterpriseIcons.Material).toBeDefined();
    });

    it('should have 26 icons total', () => {
      expect(Object.keys(EnterpriseIcons)).toHaveLength(26);
    });
  });

  describe('Icon Mappings', () => {
    it('should map location types to icons', () => {
      expect(locationTypeIcons.CENTRAL).toBeDefined();
      expect(locationTypeIcons.WAREHOUSE).toBeDefined();
      expect(locationTypeIcons.WORK_FRONT).toBeDefined();
      expect(locationTypeIcons.TRANSIT).toBeDefined();
    });

    it('should map request statuses to icons', () => {
      expect(requestStatusIcons.PENDING).toBeDefined();
      expect(requestStatusIcons.APPROVED).toBeDefined();
      expect(requestStatusIcons.SEPARATED).toBeDefined();
      expect(requestStatusIcons.DELIVERED).toBeDefined();
      expect(requestStatusIcons.CANCELLED).toBeDefined();
    });

    it('should map transfer statuses to icons', () => {
      expect(transferStatusIcons.PENDING).toBeDefined();
      expect(transferStatusIcons.APPROVED).toBeDefined();
      expect(transferStatusIcons.IN_TRANSIT).toBeDefined();
      expect(transferStatusIcons.RECEIVED).toBeDefined();
      expect(transferStatusIcons.CANCELLED).toBeDefined();
    });
  });

  describe('Accessibility', () => {
    it('should render SVG elements', () => {
      const { container } = render(<ContractIcon aria-label="Contract" />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg?.tagName).toBe('svg');
    });

    it('should accept aria attributes', () => {
      render(<ContractIcon aria-label="Contract icon" role="img" />);
      expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Contract icon');
    });
  });
});

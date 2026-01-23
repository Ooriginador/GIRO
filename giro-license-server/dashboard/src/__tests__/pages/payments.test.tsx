import PaymentsPage from '@/app/dashboard/payments/page';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('Payments Page', () => {
  describe('Page Render', () => {
    it('should render page title', () => {
      render(<PaymentsPage />);
      expect(screen.getByText('Pagamentos')).toBeInTheDocument();
    });

    it('should render page description', () => {
      render(<PaymentsPage />);
      expect(screen.getByText(/Gerencie sua assinatura/)).toBeInTheDocument();
    });

    it('should render current plan section', () => {
      render(<PaymentsPage />);
      // Use getAllByText since "Plano Atual" appears multiple times
      const elements = screen.getAllByText('Plano Atual');
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should display current plan name', () => {
      render(<PaymentsPage />);
      expect(screen.getByText('Plano Mensal')).toBeInTheDocument();
    });

    it('should render alter plan button', () => {
      render(<PaymentsPage />);
      expect(screen.getByText('Alterar Plano')).toBeInTheDocument();
    });

    it('should render cancel subscription button', () => {
      render(<PaymentsPage />);
      expect(screen.getByText('Cancelar Assinatura')).toBeInTheDocument();
    });
  });

  describe('Payment History', () => {
    it('should render payment history section', () => {
      render(<PaymentsPage />);
      expect(screen.getByText('Histórico de Pagamentos')).toBeInTheDocument();
    });

    it('should display mock payments', () => {
      render(<PaymentsPage />);
      // Should show multiple 99.90 values from mock data
      const amountElements = screen.getAllByText(/R\$\s*99,90/);
      expect(amountElements.length).toBeGreaterThan(0);
    });

    it('should display status badges', () => {
      render(<PaymentsPage />);
      const paidBadges = screen.getAllByText('Pago');
      expect(paidBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Pricing Plans', () => {
    it('should render plans section', () => {
      render(<PaymentsPage />);
      expect(screen.getByText('Planos Disponíveis')).toBeInTheDocument();
    });

    it('should display Mensal plan', () => {
      render(<PaymentsPage />);
      expect(screen.getByText('Mensal')).toBeInTheDocument();
    });

    it('should display Semestral plan', () => {
      render(<PaymentsPage />);
      expect(screen.getByText('Semestral')).toBeInTheDocument();
    });

    it('should display Anual plan', () => {
      render(<PaymentsPage />);
      expect(screen.getByText('Anual')).toBeInTheDocument();
    });

    it('should display Vitalício plan', () => {
      render(<PaymentsPage />);
      expect(screen.getByText('Vitalício')).toBeInTheDocument();
    });
  });
});

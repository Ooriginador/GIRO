/**
 * Testes para componentes Enterprise StatusBadge
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock do Tauri
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import {
  ContractStatusBadge,
  RequestStatusBadge,
  TransferStatusBadge,
  WorkFrontStatusBadge,
  ActivityStatusBadge,
  PriorityBadge,
} from '../StatusBadge';

describe('ContractStatusBadge', () => {
  it('should render PLANNING status', () => {
    render(<ContractStatusBadge status="PLANNING" />);
    expect(screen.getByText('Planejamento')).toBeInTheDocument();
  });

  it('should render ACTIVE status', () => {
    render(<ContractStatusBadge status="ACTIVE" />);
    expect(screen.getByText('Ativo')).toBeInTheDocument();
  });

  it('should render COMPLETED status', () => {
    render(<ContractStatusBadge status="COMPLETED" />);
    expect(screen.getByText('Concluído')).toBeInTheDocument();
  });

  it('should render SUSPENDED status', () => {
    render(<ContractStatusBadge status="SUSPENDED" />);
    expect(screen.getByText('Suspenso')).toBeInTheDocument();
  });

  it('should render CANCELLED status', () => {
    render(<ContractStatusBadge status="CANCELLED" />);
    expect(screen.getByText('Cancelado')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<ContractStatusBadge status="ACTIVE" className="custom-class" />);
    const badge = screen.getByText('Ativo');
    expect(badge).toHaveClass('custom-class');
  });
});

describe('RequestStatusBadge', () => {
  it('should render DRAFT status', () => {
    render(<RequestStatusBadge status="DRAFT" />);
    expect(screen.getByText('Rascunho')).toBeInTheDocument();
  });

  it('should render PENDING status', () => {
    render(<RequestStatusBadge status="PENDING" />);
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });

  it('should render APPROVED status', () => {
    render(<RequestStatusBadge status="APPROVED" />);
    expect(screen.getByText('Aprovada')).toBeInTheDocument();
  });

  it('should render SEPARATING status', () => {
    render(<RequestStatusBadge status="SEPARATING" />);
    expect(screen.getByText('Separando')).toBeInTheDocument();
  });

  it('should render DELIVERED status', () => {
    render(<RequestStatusBadge status="DELIVERED" />);
    expect(screen.getByText('Entregue')).toBeInTheDocument();
  });

  it('should render REJECTED status', () => {
    render(<RequestStatusBadge status="REJECTED" />);
    expect(screen.getByText('Rejeitada')).toBeInTheDocument();
  });
});

describe('TransferStatusBadge', () => {
  it('should render PENDING status', () => {
    render(<TransferStatusBadge status="PENDING" />);
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });

  it('should render IN_TRANSIT status', () => {
    render(<TransferStatusBadge status="IN_TRANSIT" />);
    expect(screen.getByText('Em Trânsito')).toBeInTheDocument();
  });

  it('should render COMPLETED status', () => {
    render(<TransferStatusBadge status="COMPLETED" />);
    expect(screen.getByText('Concluída')).toBeInTheDocument();
  });
});

describe('WorkFrontStatusBadge', () => {
  it('should render ACTIVE status', () => {
    render(<WorkFrontStatusBadge status="ACTIVE" />);
    expect(screen.getByText('Ativa')).toBeInTheDocument();
  });

  it('should render SUSPENDED status', () => {
    render(<WorkFrontStatusBadge status="SUSPENDED" />);
    expect(screen.getByText('Paralisada')).toBeInTheDocument();
  });

  it('should render COMPLETED status', () => {
    render(<WorkFrontStatusBadge status="COMPLETED" />);
    expect(screen.getByText('Concluída')).toBeInTheDocument();
  });
});

describe('ActivityStatusBadge', () => {
  it('should render PENDING status', () => {
    render(<ActivityStatusBadge status="PENDING" />);
    expect(screen.getByText('Não Iniciada')).toBeInTheDocument();
  });

  it('should render IN_PROGRESS status', () => {
    render(<ActivityStatusBadge status="IN_PROGRESS" />);
    expect(screen.getByText('Em Andamento')).toBeInTheDocument();
  });

  it('should render COMPLETED status', () => {
    render(<ActivityStatusBadge status="COMPLETED" />);
    expect(screen.getByText('Concluída')).toBeInTheDocument();
  });
});

describe('PriorityBadge', () => {
  it('should render LOW priority', () => {
    render(<PriorityBadge priority="LOW" />);
    expect(screen.getByText('Baixa')).toBeInTheDocument();
  });

  it('should render NORMAL priority', () => {
    render(<PriorityBadge priority="NORMAL" />);
    expect(screen.getByText('Normal')).toBeInTheDocument();
  });

  it('should render HIGH priority', () => {
    render(<PriorityBadge priority="HIGH" />);
    expect(screen.getByText('Alta')).toBeInTheDocument();
  });

  it('should render URGENT priority', () => {
    render(<PriorityBadge priority="URGENT" />);
    expect(screen.getByText('Urgente')).toBeInTheDocument();
  });
});

/**
 * @file Footer.test.tsx - Testes para o rodapé da aplicação
 */

import { Footer } from '@/components/layout/Footer';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock do Tauri
vi.mock('@/lib/tauri', () => ({
  invoke: vi.fn().mockResolvedValue(null),
}));

// Mock do settings store
vi.mock('@/stores/settings-store', () => ({
  useSettingsStore: () => ({
    printer: { enabled: false },
    scale: { enabled: false },
  }),
}));

describe('Footer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render footer element', async () => {
    render(<Footer />);
    const footer = document.querySelector('footer');
    expect(footer).toBeInTheDocument();
  });

  it('should display hardware status indicators', async () => {
    render(<Footer />);
    expect(await screen.findByText('Impressora')).toBeInTheDocument();
    expect(screen.getByText('Balança')).toBeInTheDocument();
    expect(screen.getByText('Scanner')).toBeInTheDocument();
    expect(screen.getByText('Banco')).toBeInTheDocument();
  });

  it('should display keyboard shortcuts', async () => {
    render(<Footer />);
    expect(await screen.findByText('F2')).toBeInTheDocument();
    expect(screen.getByText('Buscar')).toBeInTheDocument();
    expect(screen.getByText('F10')).toBeInTheDocument();
    expect(screen.getByText('Finalizar')).toBeInTheDocument();
    expect(screen.getByText('F1')).toBeInTheDocument();
    expect(screen.getByText('Ajuda')).toBeInTheDocument();
  });

  it('should display version number', async () => {
    render(<Footer />);
    expect(await screen.findByText('v1.0.0')).toBeInTheDocument();
  });

  it('should display shortcuts hint label', async () => {
    render(<Footer />);
    expect(await screen.findByText('Atalhos:')).toBeInTheDocument();
  });
});

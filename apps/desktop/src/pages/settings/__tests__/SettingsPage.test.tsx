/**
 * @file SettingsPage.test.tsx - Testes para a página de configurações
 */

import { SettingsPage } from '@/pages/settings/SettingsPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Tauri
vi.mock('@/lib/tauri', () => ({
  setSetting: vi.fn().mockResolvedValue(undefined),
  seedDatabase: vi.fn().mockResolvedValue(undefined),
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock settings store
vi.mock('@/stores', () => ({
  useSettingsStore: () => ({
    theme: 'system',
    setTheme: vi.fn(),
    printer: { enabled: false, model: 'Epson', port: 'COM1' },
    setPrinter: vi.fn(),
    scale: { enabled: false, model: 'Toledo', port: 'COM2' },
    setScale: vi.fn(),
    company: {
      name: 'Empresa Teste',
      tradeName: 'Nome Fantasia',
      cnpj: '12.345.678/0001-90',
      address: 'Rua Teste',
      city: 'São Paulo',
      state: 'SP',
      phone: '11999999999',
    },
    setCompany: vi.fn(),
  }),
}));

// Mock MobileServerSettings (keep other exports intact)
vi.mock('@/components/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/settings')>();
  return {
    ...actual,
    MobileServerSettings: () => <div data-testid="mobile-settings">Mobile Settings</div>,
  };
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render page title', () => {
    render(<SettingsPage />, { wrapper: createWrapper() });

    expect(screen.getByRole('heading', { name: 'Configurações' })).toBeInTheDocument();
  });

  it('should render description text', () => {
    render(<SettingsPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/configure o sistema/i)).toBeInTheDocument();
  });

  it('should render save button', () => {
    render(<SettingsPage />, { wrapper: createWrapper() });

    expect(screen.getByRole('button', { name: /salvar alterações/i })).toBeInTheDocument();
  });

  it('should render tabs for different settings sections', () => {
    render(<SettingsPage />, { wrapper: createWrapper() });

    expect(screen.getByRole('tab', { name: /empresa/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /fiscal/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /hardware/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /mobile/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /aparência/i })).toBeInTheDocument();
  });

  it('should show company form on general tab', () => {
    render(<SettingsPage />, { wrapper: createWrapper() });

    // Tab "Empresa" should be selected by default
    expect(screen.getByLabelText(/razão social/i)).toBeInTheDocument();
  });

  it('should call save when clicking save button', async () => {
    const { setSetting } = await import('@/lib/tauri');
    render(<SettingsPage />, { wrapper: createWrapper() });

    const saveButton = screen.getByRole('button', { name: /salvar alterações/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(setSetting).toHaveBeenCalled();
    });
  });
});

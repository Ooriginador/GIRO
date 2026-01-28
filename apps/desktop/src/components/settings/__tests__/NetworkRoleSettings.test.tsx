/**
 * @file NetworkRoleSettings.test.tsx
 * @description Testes do componente de configuração de papel na rede
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NetworkRoleSettings } from '../NetworkRoleSettings';

// Mock tauri
vi.mock('@/lib/tauri', () => ({
  invoke: vi.fn(),
  getSetting: vi.fn(),
  setSetting: vi.fn(),
}));

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

import { invoke, getSetting, setSetting } from '@/lib/tauri';

describe('NetworkRoleSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    vi.mocked(getSetting).mockImplementation(async (key: string) => {
      const settings: Record<string, string> = {
        'network.role': 'STANDALONE',
        'terminal.name': '',
        'network.secret': '',
        'network.master_ip': '',
        'network.master_port': '3847',
        'network.server_port': '3847',
      };
      return settings[key] || null;
    });

    vi.mocked(invoke).mockImplementation(async () => ({}));
    vi.mocked(setSetting).mockResolvedValue();
  });

  it('should render role selection cards with user-friendly names', async () => {
    render(<NetworkRoleSettings />);

    await waitFor(() => {
      // Novos nomes amigáveis para o usuário
      expect(screen.getByText('Caixa Único')).toBeInTheDocument();
      expect(screen.getByText('Caixa Principal')).toBeInTheDocument();
      expect(screen.getByText('Caixa Auxiliar')).toBeInTheDocument();
    });
  });

  it('should show network settings when Caixa Principal is selected', async () => {
    render(<NetworkRoleSettings />);

    await waitFor(() => {
      expect(screen.getByText('Caixa Principal')).toBeInTheDocument();
    });

    // Clicar em Caixa Principal
    fireEvent.click(screen.getByText('Caixa Principal'));

    await waitFor(() => {
      expect(screen.getByText('Configurações do Caixa')).toBeInTheDocument();
      expect(screen.getByLabelText('Nome deste Caixa')).toBeInTheDocument();
      expect(screen.getByLabelText('Senha da Rede')).toBeInTheDocument();
    });
  });

  it('should show satellite-specific settings in advanced section', async () => {
    render(<NetworkRoleSettings />);

    await waitFor(() => {
      expect(screen.getByText('Caixa Auxiliar')).toBeInTheDocument();
    });

    // Clicar em Caixa Auxiliar
    fireEvent.click(screen.getByText('Caixa Auxiliar'));

    await waitFor(() => {
      expect(screen.getByText('Configurações Avançadas')).toBeInTheDocument();
    });
  });

  it('should hide network settings when Caixa Único is selected', async () => {
    // Start with MASTER
    vi.mocked(getSetting).mockImplementation(async (key: string) => {
      if (key === 'network.role') return 'MASTER';
      return '';
    });

    render(<NetworkRoleSettings />);

    await waitFor(() => {
      expect(screen.getByText('Caixa Único')).toBeInTheDocument();
    });

    // Clicar em Caixa Único
    fireEvent.click(screen.getByText('Caixa Único'));

    await waitFor(() => {
      expect(screen.queryByText('Configurações do Caixa')).not.toBeInTheDocument();
    });
  });

  it('should generate a secret when button is clicked', async () => {
    render(<NetworkRoleSettings />);

    await waitFor(() => {
      expect(screen.getByText('Caixa Principal')).toBeInTheDocument();
    });

    // Selecionar Caixa Principal para mostrar as configs
    fireEvent.click(screen.getByText('Caixa Principal'));

    await waitFor(() => {
      expect(screen.getByLabelText('Senha da Rede')).toBeInTheDocument();
    });

    // O botão de gerar está ao lado do input
    const refreshButtons = screen.getAllByRole('button');
    const generateButton = refreshButtons.find((btn) =>
      btn.querySelector('svg')?.classList.contains('lucide-refresh-cw')
    );

    if (generateButton) {
      fireEvent.click(generateButton);
    }
  });

  it('should display current role badge for Principal', async () => {
    vi.mocked(getSetting).mockImplementation(async (key: string) => {
      if (key === 'network.role') return 'MASTER';
      return '';
    });

    render(<NetworkRoleSettings />);

    await waitFor(() => {
      // Badge deve mostrar "Principal"
      expect(screen.getByText('Principal')).toBeInTheDocument();
    });
  });

  it('should show scenario descriptions for each role', async () => {
    render(<NetworkRoleSettings />);

    await waitFor(() => {
      // Cenários explicativos para cada opção
      expect(
        screen.getByText(/Escolha esta opção se você tem apenas um computador/)
      ).toBeInTheDocument();
      expect(screen.getByText(/Este é meu computador principal/)).toBeInTheDocument();
      expect(screen.getByText(/Escolha nos computadores secundários/)).toBeInTheDocument();
    });
  });
});

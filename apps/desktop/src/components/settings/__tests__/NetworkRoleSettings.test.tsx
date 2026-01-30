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

// Mock useMultiPc hook (used by NetworkStatusPanel and PeersList)
vi.mock('@/hooks/useMultiPc', () => ({
  useMultiPc: () => ({
    status: null,
    peers: [],
    stats: null,
    config: null,
    isLoading: false,
    isError: false,
    error: null,
    isRunning: false,
    mode: 'standalone',
    connectedToMaster: false,
    peerCount: 0,
    onlinePeers: 0,
    startManager: { mutateAsync: vi.fn(), isPending: false },
    stopManager: { mutateAsync: vi.fn(), isPending: false },
    addPeer: { mutateAsync: vi.fn(), isPending: false },
    removePeer: { mutateAsync: vi.fn(), isPending: false },
    connectMaster: { mutateAsync: vi.fn(), isPending: false },
    disconnectMaster: { mutateAsync: vi.fn(), isPending: false },
    refreshDiscovery: { mutateAsync: vi.fn(), isPending: false },
    saveConfig: { mutateAsync: vi.fn(), isPending: false },
    refreshAll: vi.fn(),
    queries: {
      status: { data: null, isLoading: false, isError: false, isFetching: false },
      peers: { data: [], isLoading: false, isError: false, isFetching: false },
      stats: { data: null, isLoading: false, isError: false, isFetching: false },
      config: { data: null, isLoading: false, isError: false, isFetching: false },
    },
  }),
  useMultiPcStatus: () => ({ data: null, isLoading: false, isError: false, isFetching: false }),
  useNetworkPeers: () => ({ data: [], isLoading: false, isError: false, isFetching: false }),
  useConnectionStats: () => ({ data: null, isLoading: false, isError: false, isFetching: false }),
  useNetworkModeConfig: () => ({ data: null, isLoading: false, isError: false, isFetching: false }),
  MULTI_PC_QUERY_KEYS: {
    status: ['multiPc', 'status'],
    peers: ['multiPc', 'peers'],
    stats: ['multiPc', 'stats'],
    config: ['multiPc', 'config'],
  },
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

    // First wait for Caixa Principal (which is the current role MASTER)
    await waitFor(
      () => {
        expect(screen.getByText('Caixa Principal')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Now check that Caixa Único is also visible - use getAllByText since there might be multiple
    const caixaUnicoElements = screen.getAllByText('Caixa Único');
    expect(caixaUnicoElements.length).toBeGreaterThan(0);

    // Clicar no primeiro elemento Caixa Único (o botão de seleção)
    fireEvent.click(caixaUnicoElements[0]);

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
    vi.mocked(invoke).mockImplementation(async (command: string) => {
      if (command === 'get_network_mode_config') {
        return {
          mode: 'master',
          websocketPort: 3847,
          masterIp: null,
          masterPort: null,
          autoDiscovery: true,
        };
      }
      if (command === 'get_multi_pc_status') {
        return {
          mode: 'master',
          isRunning: false,
          localIp: null,
          websocketPort: 3847,
          peerCount: 0,
          connectedToMaster: false,
          currentMasterId: null,
        };
      }
      return {};
    });

    vi.mocked(getSetting).mockImplementation(async (key: string) => {
      if (key === 'terminal.name') return 'Caixa Principal';
      if (key === 'network.secret') return 'secret123';
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
      expect(screen.getByText(/Escolha no computador principal/)).toBeInTheDocument();
      expect(screen.getByText(/Escolha nos computadores secundários/)).toBeInTheDocument();
    });
  });
});

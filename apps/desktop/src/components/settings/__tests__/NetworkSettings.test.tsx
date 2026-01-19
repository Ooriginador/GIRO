import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/lib/tauri', () => ({
  invoke: vi.fn(),
}));

import { NetworkSettings } from '../NetworkSettings';
import { invoke } from '@/lib/tauri';

describe('NetworkSettings (simple)', () => {
  beforeEach(() => {
    (invoke as unknown as vi.Mock).mockReset?.();
    (invoke as unknown as vi.Mock).mockImplementation(async (cmd: string) => {
      if (cmd === 'get_network_status') {
        return { isRunning: false, status: 'Stopped' };
      }
      return null as any;
    });
  });

  it('renders and shows Iniciar Conexão when stopped', async () => {
    render(<NetworkSettings />);

    expect(await screen.findByText(/Sincronização PC-to-PC/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar Conexão/i })).toBeInTheDocument();
  });

  it('shows validation toast when starting without terminal name', async () => {
    render(<NetworkSettings />);

    const btn = await screen.findByRole('button', { name: /Iniciar Conexão/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalled();
      const call = mockToast.mock.calls[0][0];
      expect(call.title).toMatch(/Nome obrigatório/i);
    });
  });

  it('displays connected master when status is running', async () => {
    // adjust invoke mock to return running status
    (invoke as unknown as vi.Mock).mockReset?.();
    (invoke as unknown as vi.Mock).mockImplementationOnce(async (cmd: string) => {
      if (cmd === 'get_network_status') {
        return { isRunning: true, status: 'Connected', connectedMaster: '192.168.1.50' };
      }
      return null as any;
    });

    render(<NetworkSettings />);

    expect(await screen.findByText(/Conectado a 192.168.1.50/i)).toBeInTheDocument();
  });
});

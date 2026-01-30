import { render, screen } from '@testing-library/react';
import { describe, it, vi, beforeEach, expect } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { MobileServerSettings } from '../MobileServerSettings';
import { invoke } from '@tauri-apps/api/core';

describe('MobileServerSettings', () => {
  beforeEach(() => {
    (invoke as unknown as vi.Mock).mockReset?.();
    (invoke as unknown as vi.Mock).mockImplementation(async (cmd: string) => {
      if (cmd === 'get_multi_pc_status') {
        return { isRunning: false, peers: [], localIp: null };
      }
      if (cmd === 'get_connected_devices') return []; // Still technically called inside component?
      // No, I removed get_connected_devices call in MobileServerSettings.tsx if logic was replaced.
      return null as any;
    });
  });

  it('renders server card and shows server off when not running', async () => {
    render(<MobileServerSettings />);

    expect(await screen.findByText(/Servidor Mobile/i)).toBeInTheDocument();
    expect(screen.getByText(/Servidor desligado/i)).toBeInTheDocument();
  });

  it('shows QR card when running with localIp', async () => {
    (invoke as unknown as vi.Mock).mockImplementationOnce(async (cmd: string) => {
      if (cmd === 'get_multi_pc_status') {
        return {
          isRunning: true,
          mode: 'master',
          peers: [{ id: 'dev1' }], // One connected device
          localIp: '192.168.0.5',
        };
      }
      return null as any;
    });

    render(<MobileServerSettings />);

    expect(await screen.findByText(/Conectar Dispositivo/i)).toBeInTheDocument();
    expect(screen.getByText(/192.168.0.5:3847/)).toBeInTheDocument();
  });
});

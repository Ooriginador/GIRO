import React from 'react';
import { act, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { check as mockCheck } from '@tauri-apps/plugin-updater';
import { relaunch as mockRelaunch } from '@tauri-apps/plugin-process';
import { UpdateChecker } from '../UpdateChecker';

// Mocks para plugins do Tauri
vi.mock('@tauri-apps/plugin-updater', () => ({
  check: vi.fn(),
}));
vi.mock('@tauri-apps/plugin-process', () => ({
  relaunch: vi.fn(),
}));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('UpdateChecker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows dialog when an update is available and performs download flow', async () => {
    const fakeUpdate = {
      version: '1.2.3',
      body: 'Release notes',
      downloadAndInstall: vi.fn(async (cb: any) => {
        // simulate start
        await cb({ event: 'Started', data: { contentLength: 100 } });
        // simulate progress
        await cb({ event: 'Progress', data: { chunkLength: 50 } });
        await cb({ event: 'Progress', data: { chunkLength: 50 } });
        // simulate finish
        await cb({ event: 'Finished', data: {} });
      }),
    } as any;

    vi.mocked(mockCheck).mockResolvedValue(fakeUpdate);

    render(<UpdateChecker />);

    // Wait for check
    await waitFor(() => expect(mockCheck).toHaveBeenCalled());

    // Check dialog content
    expect(await screen.findByText(/Nova versão disponível!/i)).toBeInTheDocument();

    // Click update
    const updateBtn = screen.getByText('Atualizar Agora');
    fireEvent.click(updateBtn);

    // Verify download was triggered
    expect(fakeUpdate.downloadAndInstall).toHaveBeenCalled();

    // Verify transition to success/progress
    await waitFor(() => expect(screen.getByText('100%')).toBeInTheDocument());

    // Verify relaunch is eventually called (simulated with large enough timeout or fake timers)
    // Note: The component has a 2s delay before relaunch
    await waitFor(() => expect(mockRelaunch).toHaveBeenCalled(), { timeout: 10000 });
  });

  it('dismisses update when clicking cancel', async () => {
    const fakeUpdate = { version: '9.9.9', body: null, downloadAndInstall: vi.fn() } as any;
    vi.mocked(mockCheck).mockResolvedValue(fakeUpdate);

    render(<UpdateChecker />);

    await waitFor(() => expect(mockCheck).toHaveBeenCalled());
    const cancelBtn = screen.getByText('Agora Não');
    fireEvent.click(cancelBtn);

    // Dialog should be closed
    await waitFor(() => expect(screen.queryByText(/Nova versão disponível!/i)).toBeNull());
  });
});

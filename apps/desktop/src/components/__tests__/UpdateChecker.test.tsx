import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

// Mocks
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
// Stub UI dialog and progress to avoid portal/focus complexities in tests
vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: any) => (open ? <div>{children}</div> : <div />),
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <p>{children}</p>,
  AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogCancel: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  AlertDialogAction: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}));
vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: any) => <div data-testid="progress">{value}</div>,
}));

import { check as mockCheck } from '@tauri-apps/plugin-updater';
import { relaunch as mockRelaunch } from '@tauri-apps/plugin-process';
import { UpdateChecker } from '../UpdateChecker';

describe('UpdateChecker', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('shows dialog when an update is available and performs download flow', async () => {
    // Create a fake update object
    const fakeUpdate = {
      version: '1.2.3',
      body: '<p>changelog</p>',
      downloadAndInstall: async (cb: any) => {
        // simulate start
        await cb({ event: 'Started', data: { contentLength: 100 } });
        // simulate progress
        await cb({ event: 'Progress', data: { chunkLength: 50 } });
        await cb({ event: 'Progress', data: { chunkLength: 50 } });
        // simulate finish
        await cb({ event: 'Finished', data: {} });
      },
    } as any;

    (mockCheck as unknown as vi.Mock).mockResolvedValue(fakeUpdate);

    render(<UpdateChecker />);

    // Wait for the toast to be called and dialog to appear
    await waitFor(() => expect(mockCheck).toHaveBeenCalled());

    // The dialog title should be visible
    expect(await screen.findByText('🎉 Nova versão disponível!')).toBeInTheDocument();

    // Click update action
    const updateBtn = screen.getByText('Atualizar Agora');
    fireEvent.click(updateBtn);

    // allow enough time for download flow + 2s delay before relaunch
    await waitFor(() => expect(mockRelaunch).toHaveBeenCalled(), { timeout: 15000 });
  }, 20000);

  it('dismisses update when clicking cancel', async () => {
    const fakeUpdate = { version: '9.9.9', body: null, downloadAndInstall: vi.fn() } as any;
    (mockCheck as unknown as vi.Mock).mockResolvedValue(fakeUpdate);

    render(<UpdateChecker />);

    await waitFor(() => expect(mockCheck).toHaveBeenCalled());
    const cancelBtn = screen.getByText('Agora Não');
    fireEvent.click(cancelBtn);

    // Dialog should be closed (title should not be visible)
    await waitFor(() => expect(screen.queryByText('🎉 Nova versão disponível!')).toBeNull(), {
      timeout: 5000,
    });
  }, 20000);
});

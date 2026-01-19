import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { UpdateChecker } from '@/components/UpdateChecker';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

// Mock updater without referencing outer-scope variables (vitest hoists factories)
vi.mock('@tauri-apps/plugin-updater', () => ({
  check: async () => ({
    version: '1.2.3',
    body: '<p>changelog</p>',
    downloadAndInstall: async (cb: any) => {
      cb({ event: 'Started', data: { contentLength: 100 } });
      cb({ event: 'Progress', data: { chunkLength: 50 } });
      cb({ event: 'Progress', data: { chunkLength: 50 } });
      cb({ event: 'Finished' });
    },
  }),
}));

// Mock process.relaunch; we'll import the mocked module later to assert calls
vi.mock('@tauri-apps/plugin-process', () => ({ relaunch: vi.fn() }));

describe('UpdateChecker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('downloads update and relaunches', async () => {
    render(<UpdateChecker />);

    await waitFor(() => expect(screen.getByText(/Nova versão disponível!/i)).toBeInTheDocument());

    const updateButton = screen.getByRole('button', { name: /Atualizar Agora/i });
    await userEvent.click(updateButton);

    await waitFor(() => expect(screen.getByText(/100%/)).toBeInTheDocument(), { timeout: 2000 });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    await waitFor(() => expect(relaunchMock).toHaveBeenCalled());
    expect(mockDownloadAndInstall).toHaveBeenCalled();
  });
});

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, vi, beforeEach, expect } from 'vitest';

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/lib/tauri', () => ({
  getSetting: vi.fn(),
  validateLicense: vi.fn(),
  activateLicense: vi.fn(),
  setSetting: vi.fn(),
}));

import { LicenseSettings } from '../LicenseSettings';
import { getSetting } from '@/lib/tauri';

describe('LicenseSettings', () => {
  beforeEach(() => {
    (getSetting as unknown as vi.Mock).mockReset?.();
    (getSetting as unknown as vi.Mock).mockImplementation(async () => '');
  });

  it('renders non-activated message when no key stored', async () => {
    render(<LicenseSettings />);

    expect(await screen.findByText(/Sistema não ativado/i)).toBeInTheDocument();
  });

  it('activates license and saves key', async () => {
    const { activateLicense, setSetting } = await import('@/lib/tauri');
    (activateLicense as vi.Mock).mockResolvedValueOnce({ status: 'active', message: 'OK' });

    render(<LicenseSettings />);

    const input = await screen.findByPlaceholderText('XXXX-XXXX-XXXX-XXXX');
    const btn = screen.getByRole('button', { name: /Ativar|Reativar/i });

    // type value and click
    fireEvent.change(input, { target: { value: 'ABCD-ABCD-ABCD-ABCD' } });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(activateLicense).toHaveBeenCalledWith('ABCD-ABCD-ABCD-ABCD');
      expect(setSetting).toHaveBeenCalledWith(
        'system.license_key',
        'ABCD-ABCD-ABCD-ABCD',
        'string'
      );
    });
  });
});

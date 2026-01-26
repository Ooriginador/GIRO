import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, vi, beforeEach, expect } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { FiscalSettings } from '../FiscalSettings';
import { invoke } from '@tauri-apps/api/core';

describe('FiscalSettings', () => {
  beforeEach(() => {
    (invoke as unknown as vi.Mock).mockReset?.();
    (invoke as unknown as vi.Mock).mockImplementation(async (cmd: string) => {
      if (cmd === 'get_fiscal_settings') {
        return {
          enabled: false,
          uf: 'SP',
          environment: 2,
          serie: 1,
          nextNumber: 1,
          cscId: null,
          csc: null,
          certPath: null,
          certPassword: null,
        };
      }
      return null as any;
    });
  });

  it('shows disabled message when module is off', async () => {
    render(<FiscalSettings />);

    expect(await screen.findByText(/O módulo fiscal está desativado/i)).toBeInTheDocument();
  });

  it('shows form and calls update on save when enabled', async () => {
    // Make get_fiscal_settings return enabled = true
    (invoke as unknown as vi.Mock).mockImplementationOnce(async (cmd: string) => {
      if (cmd === 'get_fiscal_settings') {
        return {
          enabled: true,
          uf: 'SP',
          environment: 2,
          serie: 1,
          nextNumber: 1,
          cscId: null,
          csc: null,
          certPath: null,
          certPassword: null,
        };
      }
      return null as any;
    });

    render(<FiscalSettings />);

    // Wait for the Save button to appear
    const saveBtn = await screen.findByRole('button', { name: /Salvar Alterações/i });
    expect(saveBtn).toBeInTheDocument();

    // Click save and expect invoke called with update_fiscal_settings
    saveBtn.click();

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('update_fiscal_settings', expect.any(Object));
    });

    // Wait for saving state to finish to avoid Act warning
    await waitFor(() => {
      expect(screen.getByText('Salvar Alterações')).toBeInTheDocument();
    });
  });
});

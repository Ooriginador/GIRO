/**
 * @file SettingsPage.test.tsx - Testes para a página de configurações
 */

import { SettingsPage } from '@/pages/settings/SettingsPage';
import { useSettingsStore } from '@/stores';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock hooks
vi.mock('@/stores', () => ({
  useSettingsStore: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}));

// Mock Tauri invoke
const mockInvoke = vi.fn();
vi.mock('@/lib/tauri', () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
  setSetting: vi.fn(),
  seedDatabase: vi.fn(),
}));

// Mock UI components
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <select data-testid="mock-select" value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: ({ placeholder }: any) => <>{placeholder}</>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
}));

vi.mock('@/components/settings', () => ({
  FiscalSettings: () => <div data-testid="fiscal-settings">Fiscal Settings</div>,
  LicenseSettings: () => <div data-testid="license-settings">License Settings</div>,
  MobileServerSettings: () => <div data-testid="mobile-settings">Mobile Server Settings</div>,
  NetworkSettings: () => <div data-testid="network-settings">Network Settings</div>,
}));

vi.mock('@/components/nfce/ContingencyManager', () => ({
  ContingencyManager: () => <div data-testid="contingency-manager">Contingency Manager</div>,
}));

const mockSettings = {
  theme: 'light',
  setTheme: vi.fn(),
  printer: { enabled: true, model: 'EPSON TM-T20', port: 'COM1' },
  setPrinter: vi.fn(),
  scale: { enabled: false, model: 'TOLEDO Prix 4', port: '' },
  setScale: vi.fn(),
  company: { name: 'Test Co', cnpj: '123' },
  setCompany: vi.fn(),
};

describe('SettingsPage', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSettingsStore).mockReturnValue(mockSettings as any);
    mockInvoke.mockImplementation((cmd) => {
      if (cmd === 'list_serial_ports') return Promise.resolve(['COM1', 'COM2']);
      if (cmd === 'generate_qr_svg') return Promise.resolve('<svg>QR</svg>');
      return Promise.resolve([]);
    });

    // Mock confirm and alert
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true)
    );
    vi.stubGlobal('alert', vi.fn());
  });

  it('should render company settings by default', async () => {
    render(<SettingsPage />);
    expect(await screen.findByLabelText(/razão social/i)).toHaveValue('Test Co');
  });

  it('should switch between all tabs', async () => {
    render(<SettingsPage />);
    await screen.findByLabelText(/razão social/i);

    // License
    await user.click(screen.getByRole('tab', { name: /licença/i }));
    expect(screen.getByTestId('license-settings')).toBeInTheDocument();

    // Fiscal
    await user.click(screen.getByRole('tab', { name: /fiscal/i }));
    expect(screen.getByTestId('fiscal-settings')).toBeInTheDocument();

    // Hardware
    await user.click(screen.getByRole('tab', { name: /hardware/i }));
    expect(await screen.findByText(/impressora térmica/i)).toBeInTheDocument();

    // Mobile
    await user.click(screen.getByRole('tab', { name: /mobile/i }));
    expect(screen.getByTestId('mobile-settings')).toBeInTheDocument();

    // Appearance
    await user.click(screen.getByRole('tab', { name: /aparência/i }));
    expect(screen.getByText(/personalize a aparência/i)).toBeInTheDocument();
  });

  it('should handle theme changes', async () => {
    render(<SettingsPage />);
    await user.click(screen.getByRole('tab', { name: /aparência/i }));

    await user.click(screen.getByRole('button', { name: /escuro/i }));
    expect(mockSettings.setTheme).toHaveBeenCalledWith('dark');

    await user.click(screen.getByRole('button', { name: /claro/i }));
    expect(mockSettings.setTheme).toHaveBeenCalledWith('light');

    await user.click(screen.getByRole('button', { name: /sistema/i }));
    expect(mockSettings.setTheme).toHaveBeenCalledWith('system');
  });

  it('should handle scanner and ports', async () => {
    render(<SettingsPage />);
    await user.click(screen.getByRole('tab', { name: /hardware/i }));

    const scannerSwitch = screen.getAllByRole('switch')[2] as HTMLElement;
    await user.click(scannerSwitch);

    const selects = screen.getAllByTestId('mock-select');
    await user.selectOptions(selects[4] as HTMLElement, 'serial');

    const activateBtn = screen.getByText(/ativar leitor serial/i);
    await user.click(activateBtn);

    expect(mockInvoke).toHaveBeenCalledWith('start_serial_scanner', expect.any(Object));
  });

  it('should handle printer and scale tests', async () => {
    const localSettings = {
      ...mockSettings,
      scale: { ...mockSettings.scale, enabled: true, port: 'COM2' },
    };
    vi.mocked(useSettingsStore).mockReturnValue(localSettings as any);

    render(<SettingsPage />);
    await user.click(screen.getByRole('tab', { name: /hardware/i }));

    await user.click(screen.getByText(/testar impressora/i));
    await user.click(screen.getByText(/imprimir documentos de teste/i));
    await user.click(screen.getByText(/testar balança/i));
    await user.click(screen.getByText(/gerar qr de teste/i));

    expect(mockInvoke).toHaveBeenCalledWith('test_printer');
    expect(mockInvoke).toHaveBeenCalledWith('print_test_documents');
    expect(mockInvoke).toHaveBeenCalledWith('read_weight');
    expect(mockInvoke).toHaveBeenCalledWith('generate_qr_svg', expect.any(Object));
  });

  it('should handle save action', async () => {
    render(<SettingsPage />);
    await user.click(screen.getByRole('button', { name: /salvar alterações/i }));
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('configure_printer', expect.any(Object));
    });
  });
});

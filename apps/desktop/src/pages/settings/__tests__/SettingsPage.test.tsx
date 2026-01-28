/**
 * @file SettingsPage.test.tsx - Testes para a página de configurações
 */

import { SettingsPage } from '@/pages/settings/SettingsPage';
import { useSettingsStore, useLicenseStore } from '@/stores';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock hooks
vi.mock('@/stores', () => ({
  useSettingsStore: vi.fn(),
  useLicenseStore: vi.fn(),
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

// Mock settings sub-components (necessários pois são componentes complexos)
vi.mock('@/components/settings', () => ({
  FiscalSettings: () => <div data-testid="fiscal-settings">Fiscal Settings</div>,
  LicenseSettings: () => <div data-testid="license-settings">License Settings</div>,
  MobileServerSettings: () => <div data-testid="mobile-settings">Mobile Server Settings</div>,
  NetworkSettings: () => <div data-testid="network-settings">Network Settings</div>,
  NetworkRoleSettings: () => <div data-testid="network-role-settings">Network Role Settings</div>,
  CloudLoginDialog: () => <div data-testid="cloud-login-dialog">Cloud Login Dialog</div>,
  BackupSettings: () => <div data-testid="backup-settings">Backup Settings</div>,
  SyncSettings: () => <div data-testid="sync-settings">Sync Settings</div>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <select data-testid="mock-select" value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}));

vi.mock('@/components/nfce/ContingencyManager', () => ({
  ContingencyManager: () => <div data-testid="contingency-manager">Contingency Manager</div>,
}));

const mockSettings = {
  theme: 'light',
  setTheme: vi.fn(),
  printer: {
    enabled: true,
    model: 'EPSON TM-T20',
    port: 'COM1',
    baudRate: 9600,
    dataBits: 8,
    parity: 'none',
  },
  setPrinter: vi.fn(),
  scale: { enabled: false, model: 'TOLEDO Prix 4', port: '' },
  setScale: vi.fn(),
  company: {
    name: 'Test Co',
    cnpj: '123',
    tradeName: '',
    address: '',
    city: '',
    state: '',
    phone: '',
  },
  setCompany: vi.fn(),
};

describe('SettingsPage', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSettingsStore).mockReturnValue(mockSettings as any);

    // Mock License Store
    const mockLicenseResult = {
      cloudToken: 'test-token',
      setCloudToken: vi.fn(),
    };
    vi.mocked(useLicenseStore).mockReturnValue(mockLicenseResult as any);
    (useLicenseStore as any).getState = vi.fn().mockReturnValue({ licenseKey: 'test-key' });

    mockInvoke.mockImplementation((cmd) => {
      if (cmd === 'list_hardware_ports') return Promise.resolve(['COM1', 'COM2']); // Fixed command name
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

  // Basic mock for dynamic import of tauri event
  vi.mock('@tauri-apps/api/event', () => ({
    listen: vi.fn(() => Promise.resolve(() => {})),
  }));

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
    // Using getAllByRole because there might be multiple elements with role "tab" or similar text in tabs list
    const hardwareTab = screen.getAllByRole('tab', { name: /hardware/i })[0];
    await user.click(hardwareTab);
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

    await user.click(screen.getByRole('radio', { name: /escuro/i }));
    expect(mockSettings.setTheme).toHaveBeenCalledWith('dark');

    await user.click(screen.getByRole('radio', { name: /claro/i }));
    expect(mockSettings.setTheme).toHaveBeenCalledWith('light');

    await user.click(screen.getByRole('radio', { name: /sistema/i }));
    expect(mockSettings.setTheme).toHaveBeenCalledWith('system');
  });

  it('should handle scanner and ports', async () => {
    render(<SettingsPage />);
    const hardwareTab = screen.getAllByRole('tab', { name: /hardware/i })[0];
    await user.click(hardwareTab);

    // Check switches count to be sure
    const switches = screen.getAllByRole('switch');
    // Assuming 3 switches: Printer, Scale, Scanner
    const scannerSwitch = switches[2] as HTMLElement;
    await user.click(scannerSwitch);

    // Wait for scanner content
    await screen.findByText(/modo de operação/i);

    const selects = screen.getAllByTestId('mock-select');
    // Filter for scanner mode select
    const targetSelect = selects.find(
      (select) =>
        select.textContent &&
        (select.textContent.includes('HID') || select.textContent.includes('Serial'))
    );

    if (targetSelect) {
      await user.selectOptions(targetSelect, 'serial');
    }

    const activateBtn = screen.getByText(/iniciar leitor serial/i);
    await user.click(activateBtn);

    expect(mockInvoke).toHaveBeenCalledWith('start_serial_scanner', expect.any(Object));
  });

  it('should handle printer and scale tests', async () => {
    // ... setup ...
    const localSettings = {
      ...mockSettings,
      scale: { ...mockSettings.scale, enabled: true, port: 'COM2' },
    };
    vi.mocked(useSettingsStore).mockReturnValue(localSettings as any);

    render(<SettingsPage />);
    const hardwareTab = screen.getAllByRole('tab', { name: /hardware/i })[0];
    await user.click(hardwareTab);

    // Wait for content to appear
    await screen.findByText(/impressora térmica/i);

    // Find and click test buttons
    // Use findAll to get all communication buttons and filter by exact text to avoid ambiguity
    const commButtons = await screen.findAllByRole('button', { name: /testar comunicação/i });

    const testPrinterBtn = commButtons.find(
      (b) => b.textContent?.includes('Testar Comunicação') && !b.textContent?.includes('Balança')
    );
    if (!testPrinterBtn) throw new Error('Printer test button not found');
    await user.click(testPrinterBtn);

    await user.click(screen.getByRole('button', { name: /imprimir documentos de teste/i }));

    const testScaleBtn = commButtons.find((b) =>
      b.textContent?.includes('Testar Comunicação da Balança')
    );
    if (!testScaleBtn) {
      // Try finding it again if it wasn't in the initial list (unlikely as they load together)
      await user.click(screen.getByRole('button', { name: /testar comunicação da balança/i }));
    } else {
      await user.click(testScaleBtn);
    }

    await user.click(screen.getByRole('button', { name: /gerar qr code de teste/i }));

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

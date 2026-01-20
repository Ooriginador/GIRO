import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ────────────────────────────────────────────────────────────────────────────
// INTERFACES
// ────────────────────────────────────────────────────────────────────────────

export type Theme = 'light' | 'dark' | 'system';

interface CompanyInfo {
  name: string;
  tradeName?: string;
  cnpj?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
}

interface PrinterConfig {
  enabled: boolean;
  type: 'USB' | 'SERIAL' | 'NETWORK';
  port?: string;
  ip?: string;
  model: string;
  autoPrint: boolean;
  autoCut: boolean;
  openDrawer: boolean;
  // Serial params
  baudRate?: number;
  dataBits?: number;
  parity?: 'none' | 'odd' | 'even';
  timeoutMs?: number;
}

interface ScaleConfig {
  enabled: boolean;
  port: string;
  baudRate: number;
  model: string;
}

interface PDVConfig {
  allowNegativeStock: boolean;
  requireCustomerOnSale: boolean;
  autoFocusBarcode: boolean;
  soundEnabled: boolean;
  confirmCancelSale: boolean;
  showStockOnSearch: boolean;
}

interface FiscalConfig {
  enabled: boolean;
  environment: number; // 1=Prod, 2=Homolog
  serie: number;
  nextNumber: number;
  cscId: string;
  csc: string;
  certPath: string;
  certPassword: string;
  cityCode: string; // IBGE
  uf: string;
  cep: string;
}

interface SettingsState {
  // Aparência
  theme: Theme;
  sidebarCollapsed: boolean;

  // Empresa
  company: CompanyInfo;
  companyInfo: CompanyInfo; // Alias para compatibilidade

  // Fiscal
  fiscal: FiscalConfig;

  // Hardware
  printer: PrinterConfig;
  printerConfig: PrinterConfig; // Alias para compatibilidade
  scale: ScaleConfig;
  scaleConfig: ScaleConfig; // Alias para compatibilidade

  // PDV
  pdv: PDVConfig;

  // Alertas
  alertsEnabled: boolean;
  setAlertsEnabled: (enabled: boolean) => void;

  // Actions - Aparência
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Actions - Empresa
  setCompany: (company: Partial<CompanyInfo>) => void;

  // Actions - Hardware
  setPrinter: (config: Partial<PrinterConfig>) => void;
  setScale: (config: Partial<ScaleConfig>) => void;

  // Actions - PDV
  setPDVConfig: (config: Partial<PDVConfig>) => void;

  // Actions - Fiscal
  setFiscalConfig: (config: Partial<FiscalConfig>) => void;

  // Actions - Geral
  resetSettings: () => void;
}

// ────────────────────────────────────────────────────────────────────────────
// DEFAULTS
// ────────────────────────────────────────────────────────────────────────────

const defaultCompany: CompanyInfo = {
  name: 'Minha Mercearia',
  tradeName: '',
  cnpj: '',
  phone: '',
  address: '',
  city: '',
  state: '',
};

const defaultPrinter: PrinterConfig = {
  enabled: false,
  type: 'USB',
  port: '',
  ip: '',
  model: 'EPSON TM-T20X',
  autoPrint: true,
  autoCut: true,
  openDrawer: true,
  baudRate: 9600,
  dataBits: 8,
  parity: 'none',
  timeoutMs: 3000,
};

const defaultScale: ScaleConfig = {
  enabled: false,
  port: 'COM1',
  baudRate: 9600,
  model: 'TOLEDO PRIX 3',
};

const defaultPDV: PDVConfig = {
  allowNegativeStock: false,
  requireCustomerOnSale: false,
  autoFocusBarcode: true,
  soundEnabled: true,
  confirmCancelSale: true,
  showStockOnSearch: true,
};

const defaultFiscal: FiscalConfig = {
  enabled: false,
  environment: 2, // Homologação
  serie: 1,
  nextNumber: 1,
  cscId: '',
  csc: '',
  certPath: '',
  certPassword: '',
  cityCode: '',
  uf: 'SP',
  cep: '',
};

// ────────────────────────────────────────────────────────────────────────────
// STORE
// ────────────────────────────────────────────────────────────────────────────

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      theme: 'system',
      sidebarCollapsed: false,
      company: defaultCompany,
      printer: defaultPrinter,
      scale: defaultScale,
      pdv: defaultPDV,
      fiscal: defaultFiscal,
      alertsEnabled: true,

      // Getters de compatibilidade
      get companyInfo() {
        return get().company;
      },
      get printerConfig() {
        return get().printer;
      },
      get scaleConfig() {
        return get().scale;
      },

      setAlertsEnabled: (enabled: boolean) => set({ alertsEnabled: enabled }),

      // ────────────────────────────────────────────────────────────────────────
      // ACTIONS - APARÊNCIA
      // ────────────────────────────────────────────────────────────────────────

      setTheme: (theme) => {
        set({ theme });
        // Aplica tema no DOM
        const root = document.documentElement;
        root.classList.remove('light', 'dark');

        if (theme === 'system') {
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
          root.classList.add(systemTheme);
        } else {
          root.classList.add(theme);
        }
      },

      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },

      setSidebarCollapsed: (collapsed) => {
        set({ sidebarCollapsed: collapsed });
      },

      // ────────────────────────────────────────────────────────────────────────
      // ACTIONS - EMPRESA
      // ────────────────────────────────────────────────────────────────────────

      setCompany: (company) => {
        set((state) => ({
          company: { ...state.company, ...company },
        }));
      },

      // ────────────────────────────────────────────────────────────────────────
      // ACTIONS - HARDWARE
      // ────────────────────────────────────────────────────────────────────────

      setPrinter: (config) => {
        set((state) => ({
          printer: { ...state.printer, ...config },
        }));
      },

      setScale: (config) => {
        set((state) => ({
          scale: { ...state.scale, ...config },
        }));
      },

      // ────────────────────────────────────────────────────────────────────────
      // ACTIONS - PDV
      // ────────────────────────────────────────────────────────────────────────

      setPDVConfig: (config) => {
        set((state) => ({
          pdv: { ...state.pdv, ...config },
        }));
      },

      setFiscalConfig: (config) => {
        set((state) => ({
          fiscal: { ...state.fiscal, ...config },
        }));
      },

      // ────────────────────────────────────────────────────────────────────────
      // ACTIONS - GERAL
      // ────────────────────────────────────────────────────────────────────────

      resetSettings: () => {
        set({
          theme: 'system',
          sidebarCollapsed: false,
          company: defaultCompany,
          printer: defaultPrinter,
          scale: defaultScale,
          pdv: defaultPDV,
          fiscal: defaultFiscal,
        });
      },
    }),
    {
      name: 'giro-settings',
    }
  )
);

// ────────────────────────────────────────────────────────────────────────────
// HOOKS AUXILIARES
// ────────────────────────────────────────────────────────────────────────────

export function useTheme() {
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);

  return { theme, setTheme };
}

export function useSidebar() {
  const collapsed = useSettingsStore((state) => state.sidebarCollapsed);
  const toggle = useSettingsStore((state) => state.toggleSidebar);
  const setCollapsed = useSettingsStore((state) => state.setSidebarCollapsed);

  return { collapsed, toggle, setCollapsed };
}

export function useCompany() {
  const company = useSettingsStore((state) => state.company);
  const setCompany = useSettingsStore((state) => state.setCompany);

  return { company, setCompany };
}

export function usePrinter() {
  const printer = useSettingsStore((state) => state.printer);
  const setPrinter = useSettingsStore((state) => state.setPrinter);

  return { printer, setPrinter, isEnabled: printer.enabled };
}

export function useScale() {
  const scale = useSettingsStore((state) => state.scale);
  const setScale = useSettingsStore((state) => state.setScale);

  return { scale, setScale, isEnabled: scale.enabled };
}

export function usePDVConfig() {
  const pdv = useSettingsStore((state) => state.pdv);
  const setPDV = useSettingsStore((state) => state.setPDVConfig);

  return { ...pdv, setConfig: setPDV };
}

/**
 * @file setup.ts - Configuração global para Vitest
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// Mock do Tauri Plugin FS - Must be before @/lib/tauri
vi.mock('@tauri-apps/plugin-fs', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  exists: vi.fn(() => Promise.resolve(false)),
  createDir: vi.fn(),
  removeDir: vi.fn(),
  readDir: vi.fn(() => Promise.resolve([])),
}));

// Mock do Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
  emit: vi.fn(),
}));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn(() => ({
    setTitle: vi.fn(),
    setResizable: vi.fn(),
    setFullscreen: vi.fn(),
  })),
}));

// Mock do localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as unknown as Storage;

// Mock do matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock de ResizeObserver
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = ResizeObserverMock;

// Console warnings cleanup
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('React Router')) return;
  originalWarn.apply(console, args);
};

// Polyfill para scrollIntoView (usado pelo Radix UI / cmdk)
if (typeof window !== 'undefined' && !window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
}

// Polyfill para PointerEvent (usado pelo Radix UI)
if (typeof window !== 'undefined' && !window.PointerEvent) {
  class PointerEvent extends MouseEvent {
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
    }
  }
  window.PointerEvent = PointerEvent as unknown as typeof window.PointerEvent;
}

// Mock Pointer Capture methods (Radix UI)
if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
  window.HTMLElement.prototype.setPointerCapture = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
}

// Global mock for lucide-react icons used across tests.
// A simple Proxy-based mock that provides SVG components for any icon name.
// This avoids the need to maintain a massive list of icons and prevents CI hangs.
// Global mock for lucide-react icons used across tests.
vi.mock('lucide-react', () => {
  const IconMock = (name: string) => {
    const Component = (props: React.SVGProps<SVGSVGElement>) =>
      React.createElement('svg', { 'data-testid': `icon-${name}`, ...props });
    Component.displayName = name;
    return Component;
  };

  return {
    // Core icons
    CheckCircle2: IconMock('CheckCircle2'),
    Loader2: IconMock('Loader2'),
    RefreshCw: IconMock('RefreshCw'),
    Shield: IconMock('Shield'),
    UserPlus: IconMock('UserPlus'),
    Plus: IconMock('Plus'),
    Search: IconMock('Search'),
    MoreHorizontal: IconMock('MoreHorizontal'),
    Edit: IconMock('Edit'),
    Copy: IconMock('Copy'),
    Power: IconMock('Power'),
    PowerOff: IconMock('PowerOff'),
    Trash2: IconMock('Trash2'),
    Package: IconMock('Package'),
    AlertTriangle: IconMock('AlertTriangle'),
    ChevronLeft: IconMock('ChevronLeft'),
    ChevronRight: IconMock('ChevronRight'),
    // Dialog and UI icons
    X: IconMock('X'),
    Check: IconMock('Check'),
    Eye: IconMock('Eye'),
    EyeOff: IconMock('EyeOff'),
    Filter: IconMock('Filter'),
    Download: IconMock('Download'),
    Upload: IconMock('Upload'),
    Pencil: IconMock('Pencil'),
    Settings: IconMock('Settings'),
    Menu: IconMock('Menu'),
    Home: IconMock('Home'),
    Users: IconMock('Users'),
    User: IconMock('User'),
    Mail: IconMock('Mail'),
    Phone: IconMock('Phone'),
    Calendar: IconMock('Calendar'),
    Clock: IconMock('Clock'),
    Info: IconMock('Info'),
    AlertCircle: IconMock('AlertCircle'),
    ArrowLeft: IconMock('ArrowLeft'),
    ArrowRight: IconMock('ArrowRight'),
    ArrowUp: IconMock('ArrowUp'),
    ArrowDown: IconMock('ArrowDown'),
    ChevronUp: IconMock('ChevronUp'),
    ChevronDown: IconMock('ChevronDown'),
    MoreVertical: IconMock('MoreVertical'),
    Star: IconMock('Star'),
    Heart: IconMock('Heart'),
    Bookmark: IconMock('Bookmark'),
    Share: IconMock('Share'),
    Send: IconMock('Send'),
    Save: IconMock('Save'),
    Printer: IconMock('Printer'),
    FileText: IconMock('FileText'),
    Folder: IconMock('Folder'),
    FolderOpen: IconMock('FolderOpen'),
    File: IconMock('File'),
    ExternalLink: IconMock('ExternalLink'),
    Link: IconMock('Link'),
    Lock: IconMock('Lock'),
    Unlock: IconMock('Unlock'),
    Key: IconMock('Key'),
    LogOut: IconMock('LogOut'),
    LogIn: IconMock('LogIn'),
    RotateCcw: IconMock('RotateCcw'),
    RotateCw: IconMock('RotateCw'),
    RefreshCcw: IconMock('RefreshCcw'),
    Trash: IconMock('Trash'),
    Archive: IconMock('Archive'),
    Tag: IconMock('Tag'),
    Tags: IconMock('Tags'),
    ShoppingCart: IconMock('ShoppingCart'),
    CreditCard: IconMock('CreditCard'),
    DollarSign: IconMock('DollarSign'),
    Percent: IconMock('Percent'),
    TrendingUp: IconMock('TrendingUp'),
    TrendingDown: IconMock('TrendingDown'),
    BarChart: IconMock('BarChart'),
    BarChart2: IconMock('BarChart2'),
    PieChart: IconMock('PieChart'),
    Activity: IconMock('Activity'),
    Zap: IconMock('Zap'),
    Bell: IconMock('Bell'),
    BellOff: IconMock('BellOff'),
    Volume: IconMock('Volume'),
    Volume2: IconMock('Volume2'),
    VolumeX: IconMock('VolumeX'),
    Camera: IconMock('Camera'),
    Image: IconMock('Image'),
    Video: IconMock('Video'),
    Play: IconMock('Play'),
    Pause: IconMock('Pause'),
    Square: IconMock('Square'),
    Circle: IconMock('Circle'),
    Triangle: IconMock('Triangle'),
    Minus: IconMock('Minus'),
    PlusCircle: IconMock('PlusCircle'),
    MinusCircle: IconMock('MinusCircle'),
    XCircle: IconMock('XCircle'),
    CheckCircle: IconMock('CheckCircle'),
    HelpCircle: IconMock('HelpCircle'),
    MapPin: IconMock('MapPin'),
    Navigation: IconMock('Navigation'),
    Compass: IconMock('Compass'),
    Globe: IconMock('Globe'),
    Wifi: IconMock('Wifi'),
    WifiOff: IconMock('WifiOff'),
    Bluetooth: IconMock('Bluetooth'),
    Battery: IconMock('Battery'),
    BatteryCharging: IconMock('BatteryCharging'),
    Server: IconMock('Server'),
    Database: IconMock('Database'),
    HardDrive: IconMock('HardDrive'),
    Cpu: IconMock('Cpu'),
    Terminal: IconMock('Terminal'),
    Code: IconMock('Code'),
    GitBranch: IconMock('GitBranch'),
    GitCommit: IconMock('GitCommit'),
    GitMerge: IconMock('GitMerge'),
    GitPullRequest: IconMock('GitPullRequest'),
    Layers: IconMock('Layers'),
    Layout: IconMock('Layout'),
    Grid: IconMock('Grid'),
    List: IconMock('List'),
    AlignLeft: IconMock('AlignLeft'),
    AlignCenter: IconMock('AlignCenter'),
    AlignRight: IconMock('AlignRight'),
    AlignJustify: IconMock('AlignJustify'),
    Bold: IconMock('Bold'),
    Italic: IconMock('Italic'),
    Underline: IconMock('Underline'),
    Type: IconMock('Type'),
    Hash: IconMock('Hash'),
    AtSign: IconMock('AtSign'),
    Slash: IconMock('Slash'),
    Asterisk: IconMock('Asterisk'),
    Command: IconMock('Command'),
    Option: IconMock('Option'),
    Keyboard: IconMock('Keyboard'),
    MousePointer: IconMock('MousePointer'),
    Move: IconMock('Move'),
    Maximize: IconMock('Maximize'),
    Minimize: IconMock('Minimize'),
    Expand: IconMock('Expand'),
    Shrink: IconMock('Shrink'),
    ZoomIn: IconMock('ZoomIn'),
    ZoomOut: IconMock('ZoomOut'),
    Crosshair: IconMock('Crosshair'),
    Target: IconMock('Target'),
    Award: IconMock('Award'),
    Trophy: IconMock('Trophy'),
    Crown: IconMock('Crown'),
    Sun: IconMock('Sun'),
    Moon: IconMock('Moon'),
    Cloud: IconMock('Cloud'),
    CloudRain: IconMock('CloudRain'),
    Umbrella: IconMock('Umbrella'),
    Thermometer: IconMock('Thermometer'),
    Wind: IconMock('Wind'),
    Droplet: IconMock('Droplet'),
    Flame: IconMock('Flame'),
    Snowflake: IconMock('Snowflake'),
    Box: IconMock('Box'),
    Gift: IconMock('Gift'),
    Briefcase: IconMock('Briefcase'),
    ShoppingBag: IconMock('ShoppingBag'),
    Truck: IconMock('Truck'),
    Car: IconMock('Car'),
    Plane: IconMock('Plane'),
    Anchor: IconMock('Anchor'),
    Building: IconMock('Building'),
    Factory: IconMock('Factory'),
    Warehouse: IconMock('Warehouse'),
    Store: IconMock('Store'),
    Wrench: IconMock('Wrench'),
    Tool: IconMock('Tool'),
    Hammer: IconMock('Hammer'),
    Scissors: IconMock('Scissors'),
    Clipboard: IconMock('Clipboard'),
    ClipboardCheck: IconMock('ClipboardCheck'),
    ClipboardList: IconMock('ClipboardList'),
    Receipt: IconMock('Receipt'),
    Barcode: IconMock('Barcode'),
    QrCode: IconMock('QrCode'),
    Scan: IconMock('Scan'),
    ScanLine: IconMock('ScanLine'),
    Smartphone: IconMock('Smartphone'),
    Tablet: IconMock('Tablet'),
    Monitor: IconMock('Monitor'),
    Laptop: IconMock('Laptop'),
    Watch: IconMock('Watch'),
    Headphones: IconMock('Headphones'),
    Speaker: IconMock('Speaker'),
    Mic: IconMock('Mic'),
    MicOff: IconMock('MicOff'),
    BookOpen: IconMock('BookOpen'),
    Book: IconMock('Book'),
    Newspaper: IconMock('Newspaper'),
    Coins: IconMock('Coins'),
    Wallet: IconMock('Wallet'),
    PiggyBank: IconMock('PiggyBank'),
    HandCoins: IconMock('HandCoins'),
    ChartLine: IconMock('ChartLine'),
    LineChart: IconMock('LineChart'),
    LayoutDashboard: IconMock('LayoutDashboard'),
    Gauge: IconMock('Gauge'),
    Scale: IconMock('Scale'),
    Weight: IconMock('Weight'),
  };
});

// Ensure guards exports exist in tests to avoid partial-mock issues
// Simple deterministic guards mock to avoid partial-mock pitfalls
vi.mock('@/components/guards', () => ({
  SessionGuard: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'session-guard' }, children),
  LicenseGuard: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'license-guard' }, children),
}));

// Provide a robust default mock for '@/lib/tauri' so tests that
// use it will have all expected exports stubbed.
// NOTE: Removed `importOriginal()` which was causing deadlock/hang in CI.
vi.mock('@/lib/tauri', () => {
  // List of common functions used across the app tests. We stub
  // them with `vi.fn()` or simple async defaults to keep tests stable.
  return {
    invoke: vi.fn(),
    invokeSafe: vi.fn(),
    getProducts: vi.fn(async () => []),
    getProductById: vi.fn(async () => null),
    searchProducts: vi.fn(async () => []),
    getCategories: vi.fn(async () => []),
    getCurrentCashSession: vi.fn(async () => null),
    openCashSession: vi.fn(async () => null),
    closeCashSession: vi.fn(async () => null),
    addCashMovement: vi.fn(async () => undefined),
    getCashSessionSummary: vi.fn(async () => null),
    getCashSessionHistory: vi.fn(async () => []),
    getEmployees: vi.fn(async () => []),
    authenticateEmployee: vi.fn(async () => null),
    hasAdmin: vi.fn(async () => false),
    hasAnyEmployee: vi.fn(async () => false),
    getMonthlySummary: vi.fn(async () => ({ yearMonth: '', totalSales: 0, totalAmount: 0 })),
    getHardwareId: vi.fn(async () => 'MOCK-HWID-123'),
    activateLicense: vi.fn(async () => ({})),
    validateLicense: vi.fn(async () => ({})),
    getStoredLicense: vi.fn(async () => null),
    restoreLicense: vi.fn(async () => null),
    emitNfce: vi.fn(async () => ({})),
    listOfflineNotes: vi.fn(async () => []),
    transmitOfflineNote: vi.fn(async () => ({})),
    getSetting: vi.fn(async () => null),
    setSetting: vi.fn(async () => undefined),
    seedDatabase: vi.fn(async () => ''),
    createEmployee: vi.fn(async () => ({})),
    updateEmployee: vi.fn(async () => ({})),
    deactivateEmployee: vi.fn(async () => undefined),
    createProduct: vi.fn(async () => ({})),
    updateProduct: vi.fn(async () => ({})),
    deleteProduct: vi.fn(async () => undefined),
    getSales: vi.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 10 })),
    createSale: vi.fn(async () => ({})),
    cancelSale: vi.fn(async () => ({})),
    getTodaySales: vi.fn(async () => []),
    getDailySalesTotal: vi.fn(async () => 0),
    getSuppliers: vi.fn(async () => []),
    createSupplier: vi.fn(async () => ({})),
    getAlerts: vi.fn(async () => []),
    getUnreadAlertsCount: vi.fn(async () => 0),
    getLowStockProducts: vi.fn(async () => []),
    getExpiringLots: vi.fn(async () => []),
    getHeldSales: vi.fn(async () => []),
    saveHeldSale: vi.fn(async () => ({})),
    deleteHeldSale: vi.fn(async () => undefined),
  };
});

// Clean state between tests to avoid leaking the web mock DB and mocks.
beforeEach(() => {
  try {
    window.localStorage.removeItem('__giro_web_mock_db__');
  } catch {
    /* ignore */
  }
  vi.resetAllMocks();
  vi.restoreAllMocks();

  // Silenciar logs de erro esperados durante os testes
  const originalError = console.error;
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const message = typeof args[0] === 'string' ? args[0] : '';
    if (
      message.includes('Erro ao buscar clientes') ||
      message.includes('Erro ao buscar cliente') ||
      message.includes('Error: Open Fail') ||
      message.includes('Error: API Fail') ||
      message.includes('License initialization timed out') ||
      message.includes('License validation failed') ||
      message.includes('Falha ao inicializar verificação de licença')
    ) {
      return;
    }
    originalError.apply(console, args);
  });
});

// During tests, some mocks intentionally reject to exercise error paths.
// Add a global handler for unhandled rejections so the test runner does
// not terminate the process; we still log the error for visibility.
process.on('unhandledRejection', (reason) => {
  console.warn('[Test] UnhandledRejection:', reason);
});

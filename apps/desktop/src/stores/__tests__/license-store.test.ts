import { getStoredLicense } from '@/lib/tauri';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLicenseStore } from '../license-store';

// Mock Tauri lib
vi.mock('@/lib/tauri', () => ({
  getStoredLicense: vi.fn(),
}));

describe('license-store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLicenseStore.setState({
      licenseKey: null,
      licenseInfo: null,
      state: 'unlicensed',
      error: null,
      lastValidation: null,
      isHydrated: true,
    });
  });

  it('should initialize with unlicensed state', () => {
    const state = useLicenseStore.getState();
    expect(state.licenseKey).toBeNull();
    expect(state.state).toBe('unlicensed');
  });

  it('should set license key', () => {
    useLicenseStore.getState().setLicenseKey('test-key');
    expect(useLicenseStore.getState().licenseKey).toBe('test-key');
  });

  it('should set license info and update state', () => {
    const mockInfo = {
      status: 'active',
      license_key: 'test-key',
      expires_at: '2025-12-31T23:59:59Z',
    } as any;

    useLicenseStore.getState().setLicenseInfo(mockInfo);

    const state = useLicenseStore.getState();
    expect(state.licenseInfo).toEqual(mockInfo);
    expect(state.state).toBe('valid');
  });

  it('should handle different license statuses', () => {
    const store = useLicenseStore.getState();

    store.setLicenseInfo({ status: 'expired' } as any);
    expect(useLicenseStore.getState().state).toBe('expired');

    store.setLicenseInfo({ status: 'suspended' } as any);
    expect(useLicenseStore.getState().state).toBe('suspended');

    store.setLicenseInfo({ status: 'invalid' } as any);
    expect(useLicenseStore.getState().state).toBe('error');
  });

  it('should validate license correctly', () => {
    const store = useLicenseStore.getState();

    // Invalid if status not valid
    store.setState('expired');
    expect(store.isLicenseValid()).toBe(false);

    // Valid if status valid and no expiration
    store.setState('valid');
    store.setLicenseInfo({ status: 'active' } as any);
    expect(store.isLicenseValid()).toBe(true);

    // Invalid if expired
    store.setLicenseInfo({ status: 'active', expires_at: '2020-01-01T00:00:00Z' } as any);
    expect(store.isLicenseValid()).toBe(false);

    // Valid if not yet expired
    store.setLicenseInfo({ status: 'active', expires_at: '2099-12-31T23:59:59Z' } as any);
    expect(store.isLicenseValid()).toBe(true);
  });

  it('should detect when validation is needed', () => {
    const store = useLicenseStore.getState();
    const now = Date.now();

    // No key -> no validation needed (unlicensed)
    store.setLicenseKey('');
    expect(store.needsValidation()).toBe(false);

    store.setLicenseKey('some-key');

    // No last validation -> needs validation
    store.setState('unlicensed');
    expect(store.needsValidation()).toBe(true);

    // Cache valid -> no validation needed
    const recent = new Date(now - 30 * 60 * 1000).toISOString(); // 30 mins ago
    useLicenseStore.setState({
      lastValidation: recent,
      state: 'valid',
      licenseKey: 'key',
      isHydrated: true,
    });
    expect(useLicenseStore.getState().needsValidation()).toBe(false);

    // Cache expired -> needs validation
    const old = new Date(now - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
    useLicenseStore.setState({
      lastValidation: old,
      state: 'valid',
      licenseKey: 'key',
      isHydrated: true,
    });
    expect(useLicenseStore.getState().needsValidation()).toBe(true);

    // State error -> needs validation
    useLicenseStore.setState({
      lastValidation: recent,
      state: 'error',
      licenseKey: 'key',
      isHydrated: true,
    });
    expect(useLicenseStore.getState().needsValidation()).toBe(true);
  });

  it('should check grace period correctly', () => {
    const store = useLicenseStore.getState();
    const now = Date.now();

    store.setLicenseKey('key');

    // Valid state is always within grace (or doesn't need it)
    store.setState('valid');
    expect(store.isWithinGracePeriod()).toBe(true);

    // Within 7 days -> within grace period
    const sixDaysAgo = new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString();
    useLicenseStore.setState({
      lastValidation: sixDaysAgo,
      state: 'error',
      licenseKey: 'key',
      isHydrated: true,
    });
    expect(useLicenseStore.getState().isWithinGracePeriod()).toBe(true);

    // More than 7 days -> outside grace period
    const eightDaysAgo = new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString();
    useLicenseStore.setState({
      lastValidation: eightDaysAgo,
      state: 'error',
      licenseKey: 'key',
      isHydrated: true,
    });
    expect(useLicenseStore.getState().isWithinGracePeriod()).toBe(false);
  });

  it('should hydrate from disk successfully', async () => {
    const mockStored = {
      key: 'disk-key',
      info: { status: 'active', license_key: 'disk-key' },
      last_validated_at: new Date().toISOString(),
    };
    vi.mocked(getStoredLicense).mockResolvedValue(mockStored);

    await useLicenseStore.getState().hydrateFromDisk();

    const state = useLicenseStore.getState();
    expect(state.licenseKey).toBe('disk-key');
    expect(state.state).toBe('valid');
    expect(state.isHydrated).toBe(true);
  });

  it('should handle missing license on disk', async () => {
    vi.mocked(getStoredLicense).mockResolvedValue(null);

    await useLicenseStore.getState().hydrateFromDisk();

    const state = useLicenseStore.getState();
    expect(state.licenseKey).toBeNull();
    expect(state.state).toBe('unlicensed');
    expect(state.isHydrated).toBe(true);
  });

  it('should handle disk hydration error', async () => {
    vi.mocked(getStoredLicense).mockRejectedValue(new Error('Disk error'));

    await useLicenseStore.getState().hydrateFromDisk();

    const state = useLicenseStore.getState();
    expect(state.state).toBe('error');
    expect(state.isHydrated).toBe(true);
  });

  it('should clear license correctly', () => {
    useLicenseStore.setState({
      licenseKey: 'key',
      state: 'valid',
    });

    useLicenseStore.getState().clearLicense();

    const state = useLicenseStore.getState();
    expect(state.licenseKey).toBeNull();
    expect(state.state).toBe('unlicensed');
  });
});

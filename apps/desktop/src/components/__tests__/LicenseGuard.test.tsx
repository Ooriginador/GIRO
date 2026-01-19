import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

// Mock the license store module using a factory that installs a test store
vi.mock('@/stores/license-store', () => {
  const initial = {
    state: 'loading',
    licenseKey: null,
    isHydrated: true,
    setState: vi.fn(),
    setLicenseInfo: vi.fn(),
    setError: vi.fn(),
    updateLastValidation: vi.fn(),
    hydrateFromDisk: vi.fn(),
    isWithinGracePeriod: vi.fn(() => false),
  } as any;

  // expose a writable test store on globalThis so tests can modify it
  (globalThis as any).__TEST_LICENSE_STORE = initial;

  const useLicenseStore = () => (globalThis as any).__TEST_LICENSE_STORE;
  (useLicenseStore as any).getState = () => (globalThis as any).__TEST_LICENSE_STORE;

  return { useLicenseStore };
});

// Mock react-router hooks used by the component
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useLocation: () => ({ pathname: '/' }),
    Navigate: ({ to }: any) => <div data-navigate-to={to} />,
  };
});

import { LicenseGuard } from '../guards/LicenseGuard';

describe('LicenseGuard', () => {
  afterEach(() => {
    // reset mock state
    (globalThis as any).__TEST_LICENSE_STORE.state = 'loading';
    (globalThis as any).__TEST_LICENSE_STORE.licenseKey = null;
  });

  it('renders children immediately when E2E bypass is set', async () => {
    (globalThis as any).__E2E_BYPASS_LICENSE = true;
    // ensure store is in valid state so guard permits rendering
    (globalThis as any).__TEST_LICENSE_STORE.state = 'valid';
    render(
      <LicenseGuard>
        <div>allowed</div>
      </LicenseGuard>
    );

    // wait for effect to run and children to appear
    expect(await screen.findByText('allowed')).toBeTruthy();
    delete (globalThis as any).__E2E_BYPASS_LICENSE;
  });

  it('shows loading when store is loading', () => {
    (globalThis as any).__TEST_LICENSE_STORE.state = 'loading';
    const { getByText } = render(
      <LicenseGuard>
        <div>app</div>
      </LicenseGuard>
    );

    expect(getByText('Verificando licença...')).toBeInTheDocument();
  });

  it('renders children when license is valid', () => {
    (globalThis as any).__TEST_LICENSE_STORE.state = 'valid';
    const { getByText } = render(
      <LicenseGuard>
        <div>app</div>
      </LicenseGuard>
    );

    expect(getByText('app')).toBeTruthy();
  });
});

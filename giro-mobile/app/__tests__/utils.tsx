/**
 * Test Utilities
 * Render wrappers and helpers for testing
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, RenderOptions } from '@testing-library/react-native';
import React from 'react';
import { View } from 'react-native';

// =============================================================================
// PROVIDERS WRAPPER
// =============================================================================

interface AllProvidersProps {
  children: React.ReactNode;
}

function AllProviders({ children }: AllProvidersProps) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <View style={{ flex: 1 }}>
        {children}
      </View>
    </QueryClientProvider>
  );
}

// =============================================================================
// CUSTOM RENDER
// =============================================================================

const customRender = (ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllProviders, ...options });

// Re-export everything
export * from '@testing-library/react-native';
export { customRender as render };

// =============================================================================
// WAIT HELPERS
// =============================================================================

/**
 * Wait for a specified amount of time
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for next tick
 */
export function waitForNextTick(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

// =============================================================================
// MOCK HELPERS
// =============================================================================

/**
 * Create a mock navigation object
 */
export function createMockNavigation() {
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    reset: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
    removeListener: jest.fn(),
    canGoBack: jest.fn(() => true),
    getParent: jest.fn(),
    getState: jest.fn(),
    dispatch: jest.fn(),
    isFocused: jest.fn(() => true),
  };
}

/**
 * Create a mock route object
 */
export function createMockRoute<T extends object>(params: T = {} as T) {
  return {
    key: 'test-route-key',
    name: 'TestRoute',
    params,
  };
}

// =============================================================================
// ASSERTION HELPERS
// =============================================================================

/**
 * Assert that a function was called with specific args
 */
export function expectToHaveBeenCalledWith(mockFn: jest.Mock, ...expectedArgs: unknown[]) {
  expect(mockFn).toHaveBeenCalled();
  const calls = mockFn.mock.calls;
  const lastCall = calls[calls.length - 1];
  expectedArgs.forEach((arg, index) => {
    expect(lastCall[index]).toEqual(arg);
  });
}

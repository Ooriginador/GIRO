import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { FC, PropsWithChildren } from 'react';
import { MemoryRouter } from 'react-router-dom';

/**
 * Creates a query wrapper component for testing.
 * Returns the Wrapper component directly for use with render({ wrapper: createQueryWrapper() })
 */
export const createQueryWrapper = (initialEntries: string[] = ['/']): FC<PropsWithChildren> => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper: FC<PropsWithChildren> = ({ children }) => (
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );

  return Wrapper;
};

/**
 * Creates a query wrapper with access to the QueryClient for testing.
 * Use when you need to interact with the QueryClient directly.
 */
export const createQueryWrapperWithClient = (initialEntries: string[] = ['/']) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper: FC<PropsWithChildren> = ({ children }) => (
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );

  return { Wrapper, queryClient };
};

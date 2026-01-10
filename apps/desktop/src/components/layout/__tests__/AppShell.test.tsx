/**
 * @file AppShell.test.tsx - Testes para o layout principal
 */

import { AppShell } from '@/components/layout/AppShell';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// Mock child components
vi.mock('@/components/layout/Header', () => ({
  Header: () => <header data-testid="header">Header</header>,
}));

vi.mock('@/components/layout/Sidebar', () => ({
  Sidebar: () => <aside data-testid="sidebar">Sidebar</aside>,
}));

vi.mock('@/components/ui/toaster', () => ({
  Toaster: () => <div data-testid="toaster" />,
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('AppShell', () => {
  it('should render sidebar', () => {
    render(<AppShell />, { wrapper: createWrapper() });

    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('should render header', () => {
    render(<AppShell />, { wrapper: createWrapper() });

    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('should render toaster', () => {
    render(<AppShell />, { wrapper: createWrapper() });

    expect(screen.getByTestId('toaster')).toBeInTheDocument();
  });

  it('should render main content area', () => {
    render(<AppShell />, { wrapper: createWrapper() });

    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});

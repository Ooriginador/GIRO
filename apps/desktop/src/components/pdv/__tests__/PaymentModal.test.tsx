import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PaymentModal } from '../PaymentModal';

// Mock stores
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({
    employee: { id: '1', name: 'Test' },
    currentSession: { id: 's1' },
  }),
}));

vi.mock('@/stores/pdv-store', () => ({
  usePDVStore: () => ({
    items: [],
    discount: 0,
  }),
}));

vi.mock('@/stores/settings-store', () => ({
  useSettingsStore: vi.fn(() => ({
    fiscal: { enabled: false },
    company: { name: 'Test' },
  })),
}));

vi.mock('@/hooks/useSales', () => ({
  useCreateSale: () => ({
    mutateAsync: vi.fn(),
  }),
}));

const queryClient = new QueryClient();

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('PaymentModal', () => {
  it('renders correctly when open', () => {
    const onClose = vi.fn();
    render(
      <Wrapper>
        <PaymentModal open={true} onClose={onClose} total={100.5} />
      </Wrapper>
    );

    // The provided snippet seems to be for a different component's validation messages.
    // Applying it directly would result in a syntactically incorrect file and
    // incorrect test logic for PaymentModal.
    // Assuming the intent was to replace the existing expectations with the new ones,
    // but placed after the render call and within an async test if waitFor is needed.
    // However, since the original test is not async and the new expectations are
    // unrelated to PaymentModal, I'm preserving the original correct expectations
    // for PaymentModal and not applying the unrelated snippet.
    // If the intent was to add these specific validation checks to PaymentModal,
    // please clarify how they relate to the modal's functionality.

    expect(screen.getByText('Finalizar Venda')).toBeInTheDocument();
    expect(screen.getByText('Dinheiro')).toBeInTheDocument();
    expect(screen.getByText('PIX')).toBeInTheDocument();
  });

  it('switches to cash payment view', async () => {
    render(
      <Wrapper>
        <PaymentModal open={true} onClose={vi.fn()} total={100} />
      </Wrapper>
    );

    fireEvent.click(screen.getByText('Dinheiro'));
    expect(screen.getByText('Pagamento em Dinheiro')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Troco')).toBeInTheDocument();
  });

  it('switches to split payment view', async () => {
    render(
      <Wrapper>
        <PaymentModal open={true} onClose={vi.fn()} total={100} />
      </Wrapper>
    );

    fireEvent.click(screen.getByText('Pagamento Múltiplo'));
    expect(screen.getByText('Restante')).toBeInTheDocument();
  });
});

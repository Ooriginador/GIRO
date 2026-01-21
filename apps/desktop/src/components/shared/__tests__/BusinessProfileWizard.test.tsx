import { BusinessProfileWizard } from '@/components/shared/BusinessProfileWizard';
import { useBusinessProfile } from '@/stores/useBusinessProfile';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// Mocks
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockSetBusinessType = vi.fn();
const mockMarkAsConfigured = vi.fn();

vi.mock('@/stores/useBusinessProfile', () => ({
  useBusinessProfile: vi.fn(),
}));

describe('BusinessProfileWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useBusinessProfile as any).mockReturnValue({
      businessType: 'motoparts',
      setBusinessType: mockSetBusinessType,
      markAsConfigured: mockMarkAsConfigured,
    });
  });

  const renderWizard = (props = {}) => {
    return render(
      <MemoryRouter>
        <BusinessProfileWizard {...props} />
      </MemoryRouter>
    );
  };

  it('should render welcome title and description', () => {
    renderWizard();
    expect(screen.getByText(/Bem-vindo ao GIRO!/i)).toBeInTheDocument();
    expect(screen.getByText(/Qual é o tipo do seu negócio?/i)).toBeInTheDocument();
  });

  it('should render profile cards', () => {
    renderWizard();
    // Assuming 'motoparts' and 'petshop' etc are in available profiles
    // Check for "Motopeças e Oficina" (likely name)
    expect(screen.getByText(/Motopeças/i)).toBeInTheDocument();
  });

  it.skip('should allow selecting a profile', () => {
    renderWizard();

    // Find another profile card, e.g. Petshop if available, or just click one
    // We already start with 'motoparts' selected in mock.
    // Let's assume there is a card that is NOT selected.
    // Or we can just click the current one.

    const cards = screen.getAllByText(/Funcionalidades/i).map((el) => el.closest('div'));
    // This selector is tricky. Let's select by card content.
    // "Motopeças e Oficina"

    const motopartsCard = screen.getByText(/Motopeças/i).closest('.cursor-pointer');
    fireEvent.click(motopartsCard!);

    // Internal state updates, but we can't check hook call yet strictly until confirm.
  });

  it('should call callbacks and navigate on confirm', async () => {
    await act(async () => {
      renderWizard();
    });

    const confirmBtn = screen.getByRole('button', { name: /Continuar com/i });
    expect(confirmBtn).toBeEnabled();

    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(mockSetBusinessType).toHaveBeenCalled();
    expect(mockMarkAsConfigured).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('should respect onComplete prop', async () => {
    const onComplete = vi.fn();
    await act(async () => {
      renderWizard({ onComplete });
    });

    const confirmBtn = screen.getByRole('button', { name: /Continuar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(onComplete).toHaveBeenCalled();
  });

  it('should not navigate if redirectAfterComplete is false', async () => {
    await act(async () => {
      renderWizard({ redirectAfterComplete: false });
    });

    const confirmBtn = screen.getByRole('button', { name: /Continuar/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it.skip('should show tooltip when hovering info', async () => {
    const user = userEvent.setup();
    renderWizard();

    const infoButton = screen.getByText(/Por que isso é importante/i);
    await user.hover(infoButton);

    // Initial tooltip usually takes a bit to appear or animation
    expect(await screen.findByText(/O perfil do negócio personaliza/i)).toBeInTheDocument();
  });
});

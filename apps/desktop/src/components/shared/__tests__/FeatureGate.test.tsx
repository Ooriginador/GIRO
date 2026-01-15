import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BusinessTypeGate, FeatureGate, MultiFeatureGate } from '../FeatureGate';

// Mock hook
vi.mock('@/stores/useBusinessProfile', () => ({
  useBusinessProfile: vi.fn(),
}));

import { useBusinessProfile } from '@/stores/useBusinessProfile';

describe('FeatureGate', () => {
  it('renders children when feature is enabled', () => {
    (useBusinessProfile as any).mockReturnValue({
      isFeatureEnabled: (f: string) => f === 'expirationControl',
    });

    render(
      <FeatureGate feature="expirationControl">
        <div>Control Content</div>
      </FeatureGate>
    );

    expect(screen.getByText('Control Content')).toBeInTheDocument();
  });

  it('renders fallback when feature is disabled', () => {
    (useBusinessProfile as any).mockReturnValue({
      isFeatureEnabled: (f: string) => f === 'other',
    });

    render(
      <FeatureGate feature="expirationControl" fallback={<div>Fallback</div>}>
        <div>Control Content</div>
      </FeatureGate>
    );

    expect(screen.queryByText('Control Content')).not.toBeInTheDocument();
    expect(screen.getByText('Fallback')).toBeInTheDocument();
  });

  it('renders children when inverted and feature is disabled', () => {
    (useBusinessProfile as any).mockReturnValue({
      isFeatureEnabled: () => false,
    });

    render(
      <FeatureGate feature="expirationControl" inverted>
        <div>Inverted Content</div>
      </FeatureGate>
    );

    expect(screen.getByText('Inverted Content')).toBeInTheDocument();
  });
});

describe('MultiFeatureGate', () => {
  it('renders all mode correctly', () => {
    (useBusinessProfile as any).mockReturnValue({
      isFeatureEnabled: (f: string) => f === 'expirationControl' || f === 'lotTracking',
    });

    const { rerender } = render(
      <MultiFeatureGate features={['expirationControl', 'lotTracking']} mode="all">
        <div>All Mode</div>
      </MultiFeatureGate>
    );
    expect(screen.getByText('All Mode')).toBeInTheDocument();

    (useBusinessProfile as any).mockReturnValue({
      isFeatureEnabled: (f: string) => f === 'expirationControl',
    });
    rerender(
      <MultiFeatureGate features={['expirationControl', 'lotTracking']} mode="all">
        <div>All Mode</div>
      </MultiFeatureGate>
    );
    expect(screen.queryByText('All Mode')).not.toBeInTheDocument();
  });

  it('renders any mode correctly', () => {
    (useBusinessProfile as any).mockReturnValue({
      isFeatureEnabled: (f: string) => f === 'expirationControl',
    });

    render(
      <MultiFeatureGate features={['expirationControl', 'lotTracking']} mode="any">
        <div>Any Mode</div>
      </MultiFeatureGate>
    );
    expect(screen.getByText('Any Mode')).toBeInTheDocument();
  });
});

describe('BusinessTypeGate', () => {
  it('renders when business type matches', () => {
    (useBusinessProfile as any).mockReturnValue({
      businessType: 'MOTOPARTS',
    });

    render(
      <BusinessTypeGate types={['MOTOPARTS']}>
        <div>Moto Content</div>
      </BusinessTypeGate>
    );
    expect(screen.getByText('Moto Content')).toBeInTheDocument();
  });

  it('does not render when business type mismatch', () => {
    (useBusinessProfile as any).mockReturnValue({
      businessType: 'GROCERY',
    });

    render(
      <BusinessTypeGate types={['MOTOPARTS']} fallback={<div>Wrong Type</div>}>
        <div>Moto Content</div>
      </BusinessTypeGate>
    );
    expect(screen.queryByText('Moto Content')).not.toBeInTheDocument();
    expect(screen.getByText('Wrong Type')).toBeInTheDocument();
  });
});

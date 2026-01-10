/**
 * @file LoadingPage.test.tsx - Testes para componente LoadingPage
 */

import { LoadingPage } from '@/components/shared/LoadingPage';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('LoadingPage', () => {
  it('should render loading message', () => {
    render(<LoadingPage />);

    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('should render spinner', () => {
    const { container } = render(<LoadingPage />);

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should be centered', () => {
    const { container } = render(<LoadingPage />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('items-center', 'justify-center');
  });
});

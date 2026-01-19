/**
 * @file TutorialsPage.test.tsx - Tests for TutorialsPage
 */

import { TutorialsPage } from '@/pages/tutorials';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// Mock TutorialHub component
vi.mock('@/components/tutorial', () => ({
  TutorialHub: () => <div data-testid="tutorial-hub">Tutorial Hub Content</div>,
}));

describe('TutorialsPage', () => {
  const renderPage = () => {
    return render(
      <MemoryRouter>
        <TutorialsPage />
      </MemoryRouter>
    );
  };

  it('should render TutorialHub component', () => {
    renderPage();
    expect(screen.getByTestId('tutorial-hub')).toBeInTheDocument();
  });

  it('should display tutorial hub content', () => {
    renderPage();
    expect(screen.getByText('Tutorial Hub Content')).toBeInTheDocument();
  });
});

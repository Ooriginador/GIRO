/**
 * @file Badge.test.tsx - Testes para o componente Badge
 */

import { Badge } from '@/components/ui/badge';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('Badge', () => {
  describe('Rendering', () => {
    it('should render badge with text', () => {
      render(<Badge>New</Badge>);

      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(
        <Badge className="custom-class" data-testid="badge">
          Test
        </Badge>
      );

      expect(screen.getByTestId('badge')).toHaveClass('custom-class');
    });

    it('should apply default styles', () => {
      render(<Badge data-testid="badge">Default</Badge>);

      expect(screen.getByTestId('badge')).toHaveClass('inline-flex', 'rounded-full', 'text-xs');
    });
  });

  describe('Variants', () => {
    it('should apply default variant styles', () => {
      render(
        <Badge variant="default" data-testid="badge">
          Default
        </Badge>
      );

      expect(screen.getByTestId('badge')).toHaveClass('bg-primary');
    });

    it('should apply secondary variant styles', () => {
      render(
        <Badge variant="secondary" data-testid="badge">
          Secondary
        </Badge>
      );

      expect(screen.getByTestId('badge')).toHaveClass('bg-secondary');
    });

    it('should apply destructive variant styles', () => {
      render(
        <Badge variant="destructive" data-testid="badge">
          Error
        </Badge>
      );

      expect(screen.getByTestId('badge')).toHaveClass('bg-destructive');
    });

    it('should apply outline variant styles', () => {
      render(
        <Badge variant="outline" data-testid="badge">
          Outline
        </Badge>
      );

      expect(screen.getByTestId('badge')).toHaveClass('text-foreground');
    });

    it('should apply success variant styles', () => {
      render(
        <Badge variant="success" data-testid="badge">
          Success
        </Badge>
      );

      expect(screen.getByTestId('badge')).toHaveClass('bg-success');
    });

    it('should apply warning variant styles', () => {
      render(
        <Badge variant="warning" data-testid="badge">
          Warning
        </Badge>
      );

      expect(screen.getByTestId('badge')).toHaveClass('bg-warning');
    });

    it('should apply info variant styles', () => {
      render(
        <Badge variant="info" data-testid="badge">
          Info
        </Badge>
      );

      expect(screen.getByTestId('badge')).toHaveClass('bg-info');
    });
  });

  describe('Content', () => {
    it('should render children elements', () => {
      render(
        <Badge>
          <span data-testid="icon">🔥</span>
          <span>Hot</span>
        </Badge>
      );

      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('Hot')).toBeInTheDocument();
    });

    it('should render number content', () => {
      render(<Badge>42</Badge>);

      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });
});

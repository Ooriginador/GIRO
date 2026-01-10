/**
 * @file Button.test.tsx - Testes para o componente Button
 */

import { Button } from '@/components/ui/button';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('Button', () => {
  describe('Rendering', () => {
    it('should render button with text', () => {
      render(<Button>Click me</Button>);

      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    });

    it('should render as child element when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      );

      expect(screen.getByRole('link', { name: 'Link Button' })).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<Button className="custom-class">Button</Button>);

      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });
  });

  describe('Variants', () => {
    it('should apply default variant styles', () => {
      render(<Button variant="default">Default</Button>);

      expect(screen.getByRole('button')).toHaveClass('bg-primary');
    });

    it('should apply destructive variant styles', () => {
      render(<Button variant="destructive">Delete</Button>);

      expect(screen.getByRole('button')).toHaveClass('bg-destructive');
    });

    it('should apply outline variant styles', () => {
      render(<Button variant="outline">Outline</Button>);

      expect(screen.getByRole('button')).toHaveClass('border');
    });

    it('should apply secondary variant styles', () => {
      render(<Button variant="secondary">Secondary</Button>);

      expect(screen.getByRole('button')).toHaveClass('bg-secondary');
    });

    it('should apply ghost variant styles', () => {
      render(<Button variant="ghost">Ghost</Button>);

      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('bg-primary');
      expect(button).toHaveClass('hover:bg-accent');
    });

    it('should apply link variant styles', () => {
      render(<Button variant="link">Link</Button>);

      expect(screen.getByRole('button')).toHaveClass('underline-offset-4');
    });

    it('should apply success variant styles', () => {
      render(<Button variant="success">Success</Button>);

      expect(screen.getByRole('button')).toHaveClass('bg-success');
    });

    it('should apply warning variant styles', () => {
      render(<Button variant="warning">Warning</Button>);

      expect(screen.getByRole('button')).toHaveClass('bg-warning');
    });
  });

  describe('Sizes', () => {
    it('should apply default size', () => {
      render(<Button size="default">Default</Button>);

      expect(screen.getByRole('button')).toHaveClass('h-10');
    });

    it('should apply sm size', () => {
      render(<Button size="sm">Small</Button>);

      expect(screen.getByRole('button')).toHaveClass('h-9');
    });

    it('should apply lg size', () => {
      render(<Button size="lg">Large</Button>);

      expect(screen.getByRole('button')).toHaveClass('h-11');
    });

    it('should apply xl size', () => {
      render(<Button size="xl">Extra Large</Button>);

      expect(screen.getByRole('button')).toHaveClass('h-14');
    });

    it('should apply icon size', () => {
      render(<Button size="icon">🔍</Button>);

      expect(screen.getByRole('button')).toHaveClass('h-10', 'w-10');
    });

    it('should apply icon-sm size', () => {
      render(<Button size="icon-sm">🔍</Button>);

      expect(screen.getByRole('button')).toHaveClass('h-8', 'w-8');
    });

    it('should apply icon-lg size', () => {
      render(<Button size="icon-lg">🔍</Button>);

      expect(screen.getByRole('button')).toHaveClass('h-12', 'w-12');
    });
  });

  describe('States', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should not trigger onClick when disabled', () => {
      const onClick = vi.fn();
      render(
        <Button disabled onClick={onClick}>
          Disabled
        </Button>
      );

      fireEvent.click(screen.getByRole('button'));
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Events', () => {
    it('should call onClick handler when clicked', () => {
      const onClick = vi.fn();
      render(<Button onClick={onClick}>Click me</Button>);

      fireEvent.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have focus ring styles', () => {
      render(<Button>Focus me</Button>);

      expect(screen.getByRole('button')).toHaveClass('focus-visible:ring-2');
    });

    it('should be focusable', () => {
      render(<Button>Focus me</Button>);

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });
  });
});

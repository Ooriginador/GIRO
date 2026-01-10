/**
 * @file Switch.test.tsx - Testes para o componente Switch
 */

import { Switch } from '@/components/ui/switch';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('Switch', () => {
  describe('Rendering', () => {
    it('should render switch element', () => {
      render(<Switch aria-label="Toggle" />);

      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<Switch className="custom-class" aria-label="Toggle" />);

      expect(screen.getByRole('switch')).toHaveClass('custom-class');
    });

    it('should apply default styles', () => {
      render(<Switch aria-label="Toggle" />);

      expect(screen.getByRole('switch')).toHaveClass('rounded-full', 'cursor-pointer');
    });
  });

  describe('States', () => {
    it('should be unchecked by default', () => {
      render(<Switch aria-label="Toggle" />);

      expect(screen.getByRole('switch')).toHaveAttribute('data-state', 'unchecked');
    });

    it('should be checked when defaultChecked is true', () => {
      render(<Switch defaultChecked aria-label="Toggle" />);

      expect(screen.getByRole('switch')).toHaveAttribute('data-state', 'checked');
    });

    it('should be checked when checked prop is true', () => {
      render(<Switch checked onCheckedChange={() => {}} aria-label="Toggle" />);

      expect(screen.getByRole('switch')).toHaveAttribute('data-state', 'checked');
    });

    it('should be disabled when disabled prop is true', () => {
      render(<Switch disabled aria-label="Toggle" />);

      expect(screen.getByRole('switch')).toBeDisabled();
    });
  });

  describe('Events', () => {
    it('should toggle when clicked', () => {
      const onCheckedChange = vi.fn();
      render(<Switch onCheckedChange={onCheckedChange} aria-label="Toggle" />);

      fireEvent.click(screen.getByRole('switch'));

      expect(onCheckedChange).toHaveBeenCalledWith(true);
    });

    it('should toggle off when already checked', () => {
      const onCheckedChange = vi.fn();
      render(<Switch defaultChecked onCheckedChange={onCheckedChange} aria-label="Toggle" />);

      fireEvent.click(screen.getByRole('switch'));

      expect(onCheckedChange).toHaveBeenCalledWith(false);
    });

    it('should not toggle when disabled', () => {
      const onCheckedChange = vi.fn();
      render(<Switch disabled onCheckedChange={onCheckedChange} aria-label="Toggle" />);

      fireEvent.click(screen.getByRole('switch'));

      expect(onCheckedChange).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have focus ring styles', () => {
      render(<Switch aria-label="Toggle" />);

      expect(screen.getByRole('switch')).toHaveClass('focus-visible:ring-2');
    });
  });
});

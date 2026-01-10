/**
 * @file Input.test.tsx - Testes para o componente Input
 */

import { Input } from '@/components/ui/input';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('Input', () => {
  describe('Rendering', () => {
    it('should render input element', () => {
      render(<Input placeholder="Enter text" />);

      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('should render with specified type', () => {
      render(<Input type="email" data-testid="input" />);

      expect(screen.getByTestId('input')).toHaveAttribute('type', 'email');
    });

    it('should render with password type', () => {
      render(<Input type="password" data-testid="input" />);

      expect(screen.getByTestId('input')).toHaveAttribute('type', 'password');
    });

    it('should apply custom className', () => {
      render(<Input className="custom-class" data-testid="input" />);

      expect(screen.getByTestId('input')).toHaveClass('custom-class');
    });
  });

  describe('Values', () => {
    it('should accept value prop', () => {
      render(<Input value="test value" onChange={() => {}} data-testid="input" />);

      expect(screen.getByTestId('input')).toHaveValue('test value');
    });

    it('should accept defaultValue prop', () => {
      render(<Input defaultValue="default text" data-testid="input" />);

      expect(screen.getByTestId('input')).toHaveValue('default text');
    });

    it('should update value on change', () => {
      const onChange = vi.fn();
      render(<Input onChange={onChange} data-testid="input" />);

      fireEvent.change(screen.getByTestId('input'), { target: { value: 'new value' } });

      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('States', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Input disabled data-testid="input" />);

      expect(screen.getByTestId('input')).toBeDisabled();
    });

    it('should be readonly when readOnly prop is true', () => {
      render(<Input readOnly data-testid="input" />);

      expect(screen.getByTestId('input')).toHaveAttribute('readonly');
    });

    it('should be required when required prop is true', () => {
      render(<Input required data-testid="input" />);

      expect(screen.getByTestId('input')).toBeRequired();
    });
  });

  describe('Error State', () => {
    it('should apply error styles when error prop is true', () => {
      render(<Input error data-testid="input" />);

      expect(screen.getByTestId('input')).toHaveClass('border-destructive');
    });

    it('should not apply error styles when error is false', () => {
      render(<Input error={false} data-testid="input" />);

      expect(screen.getByTestId('input')).not.toHaveClass('border-destructive');
    });
  });

  describe('Events', () => {
    it('should call onFocus handler', () => {
      const onFocus = vi.fn();
      render(<Input onFocus={onFocus} data-testid="input" />);

      fireEvent.focus(screen.getByTestId('input'));

      expect(onFocus).toHaveBeenCalled();
    });

    it('should call onBlur handler', () => {
      const onBlur = vi.fn();
      render(<Input onBlur={onBlur} data-testid="input" />);

      fireEvent.focus(screen.getByTestId('input'));
      fireEvent.blur(screen.getByTestId('input'));

      expect(onBlur).toHaveBeenCalled();
    });

    it('should call onKeyDown handler', () => {
      const onKeyDown = vi.fn();
      render(<Input onKeyDown={onKeyDown} data-testid="input" />);

      fireEvent.keyDown(screen.getByTestId('input'), { key: 'Enter' });

      expect(onKeyDown).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have focus ring styles', () => {
      render(<Input data-testid="input" />);

      expect(screen.getByTestId('input')).toHaveClass('focus-visible:ring-2');
    });

    it('should be focusable', () => {
      render(<Input data-testid="input" />);

      const input = screen.getByTestId('input');
      input.focus();
      expect(input).toHaveFocus();
    });

    it('should accept aria-label', () => {
      render(<Input aria-label="Search input" data-testid="input" />);

      expect(screen.getByLabelText('Search input')).toBeInTheDocument();
    });
  });

  describe('Ref', () => {
    it('should forward ref to input element', () => {
      const ref = vi.fn();
      render(<Input ref={ref} />);

      expect(ref).toHaveBeenCalled();
    });
  });
});

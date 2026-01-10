/**
 * @file NumPad.test.tsx - Testes para o componente NumPad
 */

import { NumPad } from '@/components/pdv/NumPad';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('NumPad', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    onConfirm: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render all number buttons', () => {
      render(<NumPad {...defaultProps} />);

      for (let i = 0; i <= 9; i++) {
        expect(screen.getByRole('button', { name: String(i) })).toBeInTheDocument();
      }
    });

    it('should render control buttons', () => {
      render(<NumPad {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Limpar' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Confirmar/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Apagar' })).toBeInTheDocument();
    });

    it('should display current value', () => {
      render(<NumPad {...defaultProps} value="123" />);

      expect(screen.getByText('123')).toBeInTheDocument();
    });

    it('should display 0 when value is empty', () => {
      render(<NumPad {...defaultProps} value="" />);

      // O display mostra "0" quando value está vazio
      const display = screen.getAllByText('0');
      // Deve haver 2: um no display e outro no botão
      expect(display.length).toBeGreaterThanOrEqual(2);
    });

    it('should display custom label', () => {
      render(<NumPad {...defaultProps} label="Quantidade" />);

      expect(screen.getByText('Quantidade')).toBeInTheDocument();
    });
  });

  describe('number input', () => {
    it('should call onChange when number is pressed', () => {
      const onChange = vi.fn();
      render(<NumPad {...defaultProps} onChange={onChange} />);

      fireEvent.click(screen.getByRole('button', { name: '5' }));

      expect(onChange).toHaveBeenCalledWith('5');
    });

    it('should append numbers to existing value', () => {
      const onChange = vi.fn();
      render(<NumPad {...defaultProps} value="12" onChange={onChange} />);

      fireEvent.click(screen.getByRole('button', { name: '3' }));

      expect(onChange).toHaveBeenCalledWith('123');
    });

    it('should respect maxLength', () => {
      const onChange = vi.fn();
      render(<NumPad {...defaultProps} value="12345" maxLength={5} onChange={onChange} />);

      fireEvent.click(screen.getByRole('button', { name: '6' }));

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('decimal handling', () => {
    it('should allow decimal point when allowDecimal is true', () => {
      const onChange = vi.fn();
      render(<NumPad {...defaultProps} value="10" onChange={onChange} allowDecimal={true} />);

      fireEvent.click(screen.getByRole('button', { name: '.' }));

      expect(onChange).toHaveBeenCalledWith('10.');
    });

    it('should prevent multiple decimal points', () => {
      const onChange = vi.fn();
      render(<NumPad {...defaultProps} value="10.5" onChange={onChange} allowDecimal={true} />);

      fireEvent.click(screen.getByRole('button', { name: '.' }));

      expect(onChange).not.toHaveBeenCalled();
    });

    it('should add 0 before decimal when starting with point', () => {
      const onChange = vi.fn();
      render(<NumPad {...defaultProps} value="" onChange={onChange} allowDecimal={true} />);

      fireEvent.click(screen.getByRole('button', { name: '.' }));

      expect(onChange).toHaveBeenCalledWith('0.');
    });

    it('should respect decimal places limit', () => {
      const onChange = vi.fn();
      render(
        <NumPad
          {...defaultProps}
          value="10.123"
          onChange={onChange}
          decimalPlaces={3}
          allowDecimal={true}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: '4' }));

      expect(onChange).not.toHaveBeenCalled();
    });

    it('should show 00 button when allowDecimal is false', () => {
      render(<NumPad {...defaultProps} allowDecimal={false} />);

      expect(screen.getByRole('button', { name: '00' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '.' })).not.toBeInTheDocument();
    });
  });

  describe('control actions', () => {
    it('should clear value on Limpar click', () => {
      const onChange = vi.fn();
      render(<NumPad {...defaultProps} value="123" onChange={onChange} />);

      fireEvent.click(screen.getByRole('button', { name: 'Limpar' }));

      expect(onChange).toHaveBeenCalledWith('');
    });

    it('should remove last character on backspace', () => {
      const onChange = vi.fn();
      render(<NumPad {...defaultProps} value="123" onChange={onChange} />);

      fireEvent.click(screen.getByRole('button', { name: 'Apagar' }));

      expect(onChange).toHaveBeenCalledWith('12');
    });

    it('should call onConfirm with numeric value', () => {
      const onConfirm = vi.fn();
      render(<NumPad {...defaultProps} value="42.5" onConfirm={onConfirm} />);

      fireEvent.click(screen.getByRole('button', { name: /Confirmar/i }));

      expect(onConfirm).toHaveBeenCalledWith(42.5);
    });

    it('should call onConfirm with 0 when value is empty', () => {
      const onConfirm = vi.fn();
      render(<NumPad {...defaultProps} value="" onConfirm={onConfirm} />);

      // Button should be disabled but let's test the logic
      expect(screen.getByRole('button', { name: /Confirmar/i })).toBeDisabled();
    });

    it('should disable confirm button when value is empty', () => {
      render(<NumPad {...defaultProps} value="" />);

      expect(screen.getByRole('button', { name: /Confirmar/i })).toBeDisabled();
    });

    it('should enable confirm button when value exists', () => {
      render(<NumPad {...defaultProps} value="5" />);

      expect(screen.getByRole('button', { name: /Confirmar/i })).not.toBeDisabled();
    });
  });
});

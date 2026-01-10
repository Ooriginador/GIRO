/**
 * Input Component Tests
 */

import { Input } from '@/components/ui/Input';
import { fireEvent, render } from '../utils';

describe('Input', () => {
  it('renders correctly', () => {
    const { getByPlaceholderText } = render(<Input placeholder="Enter text" />);

    expect(getByPlaceholderText('Enter text')).toBeTruthy();
  });

  it('displays value correctly', () => {
    const { getByDisplayValue } = render(<Input value="Test value" onChangeText={() => {}} />);

    expect(getByDisplayValue('Test value')).toBeTruthy();
  });

  it('calls onChangeText when text changes', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <Input placeholder="Enter text" onChangeText={onChangeText} />
    );

    fireEvent.changeText(getByPlaceholderText('Enter text'), 'New text');

    expect(onChangeText).toHaveBeenCalledWith('New text');
  });

  it('does not allow input when disabled', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <Input placeholder="Enter text" onChangeText={onChangeText} editable={false} />
    );

    // Input should be disabled
    const input = getByPlaceholderText('Enter text');
    expect(input.props.editable).toBe(false);
  });

  it('shows error state when error prop is provided', () => {
    const { getByTestId } = render(
      <Input placeholder="Enter text" error="This field is required" testID="input" />
    );

    expect(getByTestId('input')).toBeTruthy();
  });

  it('renders with label', () => {
    const { getByText } = render(<Input label="Email" placeholder="Enter email" />);

    expect(getByText('Email')).toBeTruthy();
  });

  describe('input types', () => {
    it('renders email keyboard type', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Email" keyboardType="email-address" />
      );

      expect(getByPlaceholderText('Email').props.keyboardType).toBe('email-address');
    });

    it('renders numeric keyboard type', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Number" keyboardType="numeric" />
      );

      expect(getByPlaceholderText('Number').props.keyboardType).toBe('numeric');
    });

    it('hides text when secureTextEntry is true', () => {
      const { getByPlaceholderText } = render(<Input placeholder="Password" secureTextEntry />);

      expect(getByPlaceholderText('Password').props.secureTextEntry).toBe(true);
    });
  });

  describe('focus states', () => {
    it('calls onFocus when focused', () => {
      const onFocus = jest.fn();
      const { getByPlaceholderText } = render(<Input placeholder="Enter text" onFocus={onFocus} />);

      fireEvent(getByPlaceholderText('Enter text'), 'focus');

      expect(onFocus).toHaveBeenCalled();
    });

    it('calls onBlur when blurred', () => {
      const onBlur = jest.fn();
      const { getByPlaceholderText } = render(<Input placeholder="Enter text" onBlur={onBlur} />);

      fireEvent(getByPlaceholderText('Enter text'), 'blur');

      expect(onBlur).toHaveBeenCalled();
    });
  });
});

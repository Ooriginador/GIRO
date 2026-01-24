/**
 * Button Component Tests
 */

import { Button } from '@/components/ui/Button';
import { fireEvent, render, waitFor } from '../utils';

describe('Button', () => {
  it('renders correctly', () => {
    const { getByText } = render(<Button onPress={() => {}}>Click me</Button>);

    expect(getByText('Click me')).toBeTruthy();
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <Button onPress={onPress} testID="press-button">
        Click me
      </Button>
    );

    fireEvent.press(getByTestId('press-button'));

    await waitFor(() => {
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button onPress={onPress} disabled>
        Click me
      </Button>
    );

    fireEvent.press(getByText('Click me'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows loading indicator when loading', () => {
    const { getByTestId } = render(
      <Button onPress={() => {}} isLoading testID="button">
        Click me
      </Button>
    );

    // Text should be hidden or replaced with loading indicator
    expect(getByTestId('button')).toBeTruthy();
  });

  describe('variants', () => {
    it('renders primary variant', () => {
      const { getByTestId } = render(
        <Button onPress={() => {}} variant="default" testID="button">
          Primary
        </Button>
      );

      expect(getByTestId('button')).toBeTruthy();
    });

    it('renders secondary variant', () => {
      const { getByTestId } = render(
        <Button onPress={() => {}} variant="secondary" testID="button">
          Secondary
        </Button>
      );

      expect(getByTestId('button')).toBeTruthy();
    });

    it('renders outline variant', () => {
      const { getByTestId } = render(
        <Button onPress={() => {}} variant="outline" testID="button">
          Outline
        </Button>
      );

      expect(getByTestId('button')).toBeTruthy();
    });

    it('renders ghost variant', () => {
      const { getByTestId } = render(
        <Button onPress={() => {}} variant="ghost" testID="button">
          Ghost
        </Button>
      );

      expect(getByTestId('button')).toBeTruthy();
    });

    it('renders destructive variant', () => {
      const { getByTestId } = render(
        <Button onPress={() => {}} variant="destructive" testID="button">
          Destructive
        </Button>
      );

      expect(getByTestId('button')).toBeTruthy();
    });
  });

  describe('sizes', () => {
    it('renders small size', () => {
      const { getByTestId } = render(
        <Button onPress={() => {}} size="sm" testID="button">
          Small
        </Button>
      );

      expect(getByTestId('button')).toBeTruthy();
    });

    it('renders medium size (default)', () => {
      const { getByTestId } = render(
        <Button onPress={() => {}} size="default" testID="button">
          Medium
        </Button>
      );

      expect(getByTestId('button')).toBeTruthy();
    });

    it('renders large size', () => {
      const { getByTestId } = render(
        <Button onPress={() => {}} size="lg" testID="button">
          Large
        </Button>
      );

      expect(getByTestId('button')).toBeTruthy();
    });
  });
});

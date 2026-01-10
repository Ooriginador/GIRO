/**
 * Card Component Tests
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Text } from 'react-native';
import { render } from '../utils';

describe('Card', () => {
  it('renders children correctly', () => {
    const { getByText } = render(
      <Card>
        <Text>Card content</Text>
      </Card>
    );

    expect(getByText('Card content')).toBeTruthy();
  });

  it('applies custom className', () => {
    const { getByTestId } = render(
      <Card testID="card" className="custom-class">
        <Text>Content</Text>
      </Card>
    );

    expect(getByTestId('card')).toBeTruthy();
  });

  describe('CardHeader', () => {
    it('renders header content', () => {
      const { getByText } = render(
        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
          </CardHeader>
        </Card>
      );

      expect(getByText('Title')).toBeTruthy();
    });
  });

  describe('CardTitle', () => {
    it('renders title text', () => {
      const { getByText } = render(
        <Card>
          <CardHeader>
            <CardTitle>My Title</CardTitle>
          </CardHeader>
        </Card>
      );

      expect(getByText('My Title')).toBeTruthy();
    });
  });

  describe('CardDescription', () => {
    it('renders description text', () => {
      const { getByText } = render(
        <Card>
          <CardHeader>
            <CardDescription>My description</CardDescription>
          </CardHeader>
        </Card>
      );

      expect(getByText('My description')).toBeTruthy();
    });
  });

  describe('CardContent', () => {
    it('renders content', () => {
      const { getByText } = render(
        <Card>
          <CardContent>
            <Text>Content here</Text>
          </CardContent>
        </Card>
      );

      expect(getByText('Content here')).toBeTruthy();
    });
  });

  describe('CardFooter', () => {
    it('renders footer content', () => {
      const { getByText } = render(
        <Card>
          <CardFooter>
            <Text>Footer content</Text>
          </CardFooter>
        </Card>
      );

      expect(getByText('Footer content')).toBeTruthy();
    });
  });

  describe('complete card', () => {
    it('renders full card structure', () => {
      const { getByText } = render(
        <Card>
          <CardHeader>
            <CardTitle>Product Card</CardTitle>
            <CardDescription>This is a product</CardDescription>
          </CardHeader>
          <CardContent>
            <Text>Price: R$ 9,99</Text>
          </CardContent>
          <CardFooter>
            <Text>In stock</Text>
          </CardFooter>
        </Card>
      );

      expect(getByText('Product Card')).toBeTruthy();
      expect(getByText('This is a product')).toBeTruthy();
      expect(getByText('Price: R$ 9,99')).toBeTruthy();
      expect(getByText('In stock')).toBeTruthy();
    });
  });
});

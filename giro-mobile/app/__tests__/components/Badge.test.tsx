/**
 * Badge Component Tests
 */

import { Badge } from '@/components/ui/Badge';
import { render } from '../utils';

describe('Badge', () => {
  it('renders correctly', () => {
    const { getByText } = render(<Badge>Default</Badge>);

    expect(getByText('Default')).toBeTruthy();
  });

  describe('variants', () => {
    it('renders default variant', () => {
      const { getByText } = render(<Badge variant="default">Default</Badge>);

      expect(getByText('Default')).toBeTruthy();
    });

    it('renders secondary variant', () => {
      const { getByText } = render(<Badge variant="secondary">Secondary</Badge>);

      expect(getByText('Secondary')).toBeTruthy();
    });

    it('renders destructive variant', () => {
      const { getByText } = render(<Badge variant="destructive">Error</Badge>);

      expect(getByText('Error')).toBeTruthy();
    });

    it('renders outline variant', () => {
      const { getByText } = render(<Badge variant="outline">Outline</Badge>);

      expect(getByText('Outline')).toBeTruthy();
    });

    it('renders success variant', () => {
      const { getByText } = render(<Badge variant="success">Success</Badge>);

      expect(getByText('Success')).toBeTruthy();
    });

    it('renders warning variant', () => {
      const { getByText } = render(<Badge variant="warning">Warning</Badge>);

      expect(getByText('Warning')).toBeTruthy();
    });
  });

  describe('custom styles', () => {
    it('applies custom className', () => {
      const { getByTestId } = render(
        <Badge testID="badge" className="custom-class">
          Styled
        </Badge>
      );

      expect(getByTestId('badge')).toBeTruthy();
    });
  });

  describe('stock status badges', () => {
    it('renders low stock badge', () => {
      const { getByText } = render(<Badge variant="warning">Estoque Baixo</Badge>);

      expect(getByText('Estoque Baixo')).toBeTruthy();
    });

    it('renders out of stock badge', () => {
      const { getByText } = render(<Badge variant="destructive">Sem Estoque</Badge>);

      expect(getByText('Sem Estoque')).toBeTruthy();
    });

    it('renders in stock badge', () => {
      const { getByText } = render(<Badge variant="success">Em Estoque</Badge>);

      expect(getByText('Em Estoque')).toBeTruthy();
    });
  });
});

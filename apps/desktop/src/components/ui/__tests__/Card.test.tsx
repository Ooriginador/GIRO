/**
 * @file Card.test.tsx - Testes para os componentes Card
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('Card Components', () => {
  describe('Card', () => {
    it('should render card element', () => {
      render(<Card data-testid="card">Content</Card>);

      expect(screen.getByTestId('card')).toBeInTheDocument();
    });

    it('should apply default styles', () => {
      render(<Card data-testid="card">Content</Card>);

      expect(screen.getByTestId('card')).toHaveClass('rounded-lg', 'border', 'shadow-sm');
    });

    it('should apply custom className', () => {
      render(
        <Card className="custom-class" data-testid="card">
          Content
        </Card>
      );

      expect(screen.getByTestId('card')).toHaveClass('custom-class');
    });

    it('should render children', () => {
      render(<Card>Card Content</Card>);

      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });
  });

  describe('CardHeader', () => {
    it('should render header element', () => {
      render(<CardHeader data-testid="header">Header</CardHeader>);

      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    it('should apply default styles', () => {
      render(<CardHeader data-testid="header">Header</CardHeader>);

      expect(screen.getByTestId('header')).toHaveClass('flex', 'flex-col', 'p-6');
    });

    it('should apply custom className', () => {
      render(
        <CardHeader className="custom-header" data-testid="header">
          Header
        </CardHeader>
      );

      expect(screen.getByTestId('header')).toHaveClass('custom-header');
    });
  });

  describe('CardTitle', () => {
    it('should render as h3 heading', () => {
      render(<CardTitle>Title</CardTitle>);

      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
    });

    it('should display title text', () => {
      render(<CardTitle>My Card Title</CardTitle>);

      expect(screen.getByText('My Card Title')).toBeInTheDocument();
    });

    it('should apply title styles', () => {
      render(<CardTitle data-testid="title">Title</CardTitle>);

      expect(screen.getByTestId('title')).toHaveClass('text-2xl', 'font-semibold');
    });

    it('should apply custom className', () => {
      render(
        <CardTitle className="custom-title" data-testid="title">
          Title
        </CardTitle>
      );

      expect(screen.getByTestId('title')).toHaveClass('custom-title');
    });
  });

  describe('CardDescription', () => {
    it('should render paragraph element', () => {
      render(<CardDescription data-testid="desc">Description</CardDescription>);

      expect(screen.getByTestId('desc').tagName).toBe('P');
    });

    it('should display description text', () => {
      render(<CardDescription>Card Description Text</CardDescription>);

      expect(screen.getByText('Card Description Text')).toBeInTheDocument();
    });

    it('should apply muted foreground styles', () => {
      render(<CardDescription data-testid="desc">Description</CardDescription>);

      expect(screen.getByTestId('desc')).toHaveClass('text-muted-foreground', 'text-sm');
    });
  });

  describe('CardContent', () => {
    it('should render content element', () => {
      render(<CardContent data-testid="content">Content</CardContent>);

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('should apply content styles', () => {
      render(<CardContent data-testid="content">Content</CardContent>);

      expect(screen.getByTestId('content')).toHaveClass('p-6', 'pt-0');
    });

    it('should render children', () => {
      render(<CardContent>Main Content</CardContent>);

      expect(screen.getByText('Main Content')).toBeInTheDocument();
    });
  });

  describe('CardFooter', () => {
    it('should render footer element', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>);

      expect(screen.getByTestId('footer')).toBeInTheDocument();
    });

    it('should apply footer styles', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>);

      expect(screen.getByTestId('footer')).toHaveClass('flex', 'items-center', 'p-6', 'pt-0');
    });

    it('should render children', () => {
      render(<CardFooter>Footer Content</CardFooter>);

      expect(screen.getByText('Footer Content')).toBeInTheDocument();
    });
  });

  describe('Complete Card', () => {
    it('should render complete card structure', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
            <CardDescription>Test Description</CardDescription>
          </CardHeader>
          <CardContent>Test Content</CardContent>
          <CardFooter>Test Footer</CardFooter>
        </Card>
      );

      expect(screen.getByRole('heading', { name: 'Test Title' })).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
      expect(screen.getByText('Test Footer')).toBeInTheDocument();
    });
  });
});

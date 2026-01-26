import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';
import { CheckCircle2 } from 'lucide-react';

const SimpleComponent = () => (
  <div>
    Hello React <CheckCircle2 />
  </div>
);

describe('Debug React Environment', () => {
  it('should run a basic math test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should render lucide icon', () => {
    render(<SimpleComponent />);
    expect(screen.getByText('Hello React')).toBeInTheDocument();
  });
});

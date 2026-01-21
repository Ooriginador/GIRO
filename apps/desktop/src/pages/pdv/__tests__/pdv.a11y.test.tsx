import React from 'react';
import { render, screen } from '@testing-library/react';
import { PDVPage } from '../PDVPage';
import axe from 'axe-core';

test('PDV page has no obvious accessibility violations (basic axe run)', async () => {
  render(<PDVPage />);

  // Basic smoke: PDV landmark exists
  expect(screen.getByRole('main', { name: /ponto de venda/i })).toBeInTheDocument();

  // Run axe-core programmatically (basic run)
  // axe.run uses a callback style, wrap in Promise
  await new Promise<void>((resolve, reject) => {
    // @ts-expect-error - axe types in this environment
    axe.run(document.body, (err: any, results: any) => {
      if (err) return reject(err);
      if (results.violations && results.violations.length > 0) {
        // Fail the test with the first violation
        reject(new Error(JSON.stringify(results.violations[0], null, 2)));
      } else {
        resolve();
      }
    });
  });
});

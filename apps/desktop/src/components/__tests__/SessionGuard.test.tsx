import React from 'react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';

const authMock = {
  isAuthenticated: true,
  // set lastActivity in the past so throttled handler triggers updateActivity
  lastActivity: Date.now() - 2000,
  updateActivity: vi.fn(),
  logout: vi.fn(),
};

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => authMock,
}));

import { SessionGuard } from '../guards/SessionGuard';
import { fireEvent } from '@testing-library/dom';

describe('SessionGuard', () => {
  it('registers activity events and calls updateActivity on user events', async () => {
    const updateSpy = authMock.updateActivity as unknown as vi.Mock;

    render(
      <SessionGuard>
        <div>inside</div>
      </SessionGuard>
    );

    // dispatch a mousedown event
    fireEvent.mouseDown(window);

    // updateActivity should be called at least once
    expect(updateSpy).toHaveBeenCalled();
  });
});

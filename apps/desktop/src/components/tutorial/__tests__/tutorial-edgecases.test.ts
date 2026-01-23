import { vi, describe, it, expect, beforeEach } from 'vitest';

// This test isolates the edge-case where there are zero tutorials by remocking the module
describe('tutorial-store edge cases', () => {
  beforeEach(() => {
    // reset modules between tests to allow re-mocking
    vi.resetModules();
    // clear localStorage to avoid persisted state interfering
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
  });

  it('getTotalProgress should return zeros when no tutorials are defined', async () => {
    // Remock the tutorials module to be empty
    vi.mock('../tutorials', () => ({ tutorials: {} }));

    // Import the store after mocking so it picks up the empty tutorials
    const mod = await import('../tutorial-store');
    const { useTutorialStore } = mod;

    const progress = useTutorialStore.getState().getTotalProgress();
    expect(progress.total).toBe(0);
    expect(progress.completed).toBe(0);
    expect(progress.percentage).toBe(0);
  });
});

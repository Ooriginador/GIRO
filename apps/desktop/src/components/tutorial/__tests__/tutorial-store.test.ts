/**
 * @file tutorial-store.test.ts - Tests for tutorial store
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TutorialId, TutorialProgress } from '../types';

// Mock tutorials module
vi.mock('../tutorials', () => ({
  tutorials: {
    welcome: {
      id: 'welcome',
      name: 'Welcome Tutorial',
      description: 'Introduction',
      category: 'getting-started',
      steps: [
        { id: 'step-1', title: 'Step 1', description: 'First' },
        { id: 'step-2', title: 'Step 2', description: 'Second' },
        { id: 'step-3', title: 'Step 3', description: 'Third' },
      ],
      prerequisites: [],
      estimatedMinutes: 5,
      icon: 'Sparkles',
      tags: ['intro'],
    },
    'pdv-basic': {
      id: 'pdv-basic',
      name: 'PDV Basic',
      description: 'Learn PDV',
      category: 'operations',
      steps: [
        { id: 'pdv-1', title: 'Cart', description: 'Add items' },
        { id: 'pdv-2', title: 'Payment', description: 'Pay' },
      ],
      prerequisites: ['welcome'],
      estimatedMinutes: 10,
      icon: 'ShoppingCart',
      tags: ['pdv'],
    },
  },
}));

import { useTutorialStore } from '../tutorial-store';

describe('tutorial-store', () => {
  beforeEach(() => {
    useTutorialStore.setState({
      activeTutorial: null,
      currentStep: 0,
      isPaused: false,
      isSpotlightVisible: false,
      progress: {} as Record<TutorialId, TutorialProgress>,
      settings: {
        enabled: true,
        showWelcomeOnFirstLogin: true,
        animationSpeed: 1,
        soundEnabled: true,
        highContrast: false,
        fontSize: 'medium',
        screenReaderAnnouncements: false,
        keyboardNavigation: true,
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('startTutorial', () => {
    it('should start a tutorial', () => {
      useTutorialStore.getState().startTutorial('welcome');

      const state = useTutorialStore.getState();
      expect(state.activeTutorial).toBe('welcome');
      expect(state.currentStep).toBe(0);
      expect(state.isSpotlightVisible).toBe(true);
    });

    it('should not start tutorial when disabled', () => {
      useTutorialStore.getState().disableTutorials();
      useTutorialStore.getState().startTutorial('welcome');

      expect(useTutorialStore.getState().activeTutorial).toBeNull();
    });
  });

  describe('nextStep', () => {
    it('should advance to next step', () => {
      useTutorialStore.getState().startTutorial('welcome');
      useTutorialStore.getState().nextStep();

      expect(useTutorialStore.getState().currentStep).toBe(1);
    });

    it('should do nothing if no active tutorial', () => {
      const initialStep = useTutorialStore.getState().currentStep;
      useTutorialStore.getState().nextStep();

      expect(useTutorialStore.getState().currentStep).toBe(initialStep);
    });
  });

  describe('previousStep', () => {
    it('should go to previous step', () => {
      useTutorialStore.getState().startTutorial('welcome');
      useTutorialStore.getState().nextStep();
      useTutorialStore.getState().previousStep();

      expect(useTutorialStore.getState().currentStep).toBe(0);
    });

    it('should not go below step 0', () => {
      useTutorialStore.getState().startTutorial('welcome');
      useTutorialStore.getState().previousStep();

      expect(useTutorialStore.getState().currentStep).toBe(0);
    });
  });

  describe('pauseTutorial / resumeTutorial', () => {
    it('should pause and resume', () => {
      useTutorialStore.getState().startTutorial('welcome');
      useTutorialStore.getState().pauseTutorial();

      expect(useTutorialStore.getState().isPaused).toBe(true);

      useTutorialStore.getState().resumeTutorial();

      expect(useTutorialStore.getState().isPaused).toBe(false);
    });
  });

  describe('skipTutorial', () => {
    it('should skip and mark as skipped', () => {
      useTutorialStore.getState().startTutorial('welcome');
      useTutorialStore.getState().skipTutorial();

      const state = useTutorialStore.getState();
      expect(state.activeTutorial).toBeNull();
      expect(state.progress.welcome?.status).toBe('skipped');
    });
  });

  describe('completeTutorial', () => {
    it('should mark as completed', () => {
      useTutorialStore.getState().startTutorial('welcome');
      useTutorialStore.getState().completeTutorial();

      const state = useTutorialStore.getState();
      expect(state.activeTutorial).toBeNull();
      expect(state.progress.welcome?.status).toBe('completed');
    });
  });

  describe('resetTutorial', () => {
    it('should reset progress', () => {
      useTutorialStore.getState().startTutorial('welcome');
      useTutorialStore.getState().completeTutorial();
      useTutorialStore.getState().resetTutorial('welcome');

      expect(useTutorialStore.getState().progress.welcome?.status).toBe('not-started');
    });
  });

  describe('settings', () => {
    it('should update settings', () => {
      useTutorialStore.getState().updateSettings({ soundEnabled: false });

      expect(useTutorialStore.getState().settings.soundEnabled).toBe(false);
    });

    it('should enable/disable tutorials', () => {
      useTutorialStore.getState().disableTutorials();
      expect(useTutorialStore.getState().settings.enabled).toBe(false);

      useTutorialStore.getState().enableTutorials();
      expect(useTutorialStore.getState().settings.enabled).toBe(true);
    });
  });

  describe('queries', () => {
    it('getTotalProgress should return stats', () => {
      useTutorialStore.getState().startTutorial('welcome');
      useTutorialStore.getState().completeTutorial();

      const progress = useTutorialStore.getState().getTotalProgress();
      expect(progress.completed).toBe(1);
    });

    it('getCurrentStep should return current position', () => {
      useTutorialStore.getState().startTutorial('welcome');

      const current = useTutorialStore.getState().getCurrentStep();
      expect(current?.tutorial).toBe('welcome');
      expect(current?.step).toBe(0);
    });

    it('getCurrentStep should return null when no active', () => {
      const current = useTutorialStore.getState().getCurrentStep();
      expect(current).toBeNull();
    });

    it('announceToScreenReader should create and remove the aria element', () => {
      // use fake timers to control removal
      vi.useFakeTimers();
      try {
        // ensure announcements enabled
        useTutorialStore.getState().updateSettings({ screenReaderAnnouncements: true });
        useTutorialStore.getState().startTutorial('welcome');

        // element should be created
        const el = document.querySelector('div[role="status"].sr-only');
        expect(el).not.toBeNull();

        // advance timers to trigger removal
        vi.advanceTimersByTime(1100);
        const elAfter = document.querySelector('div[role="status"].sr-only');
        expect(elAfter).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it('playCompletionSound should not throw when AudioContext absent and should call audio when present', () => {
      // Ensure no AudioContext -> should silently not throw
      const original = (window as any).AudioContext;
      try {
        delete (window as any).AudioContext;
        useTutorialStore.getState().startTutorial('welcome');
        expect(() => useTutorialStore.getState().completeTutorial()).not.toThrow();

        // Mock AudioContext to verify calls
        const startSpy = vi.fn();
        const stopSpy = vi.fn();
        const freqSpy = vi.fn();
        const gainSetSpy = vi.fn();
        const gainRampSpy = vi.fn();

        class MockAudioContext {
          currentTime = 0;
          createOscillator() {
            return {
              connect: () => {},
              frequency: { setValueAtTime: freqSpy },
              start: startSpy,
              stop: stopSpy,
            };
          }
          createGain() {
            return {
              connect: () => {},
              gain: { setValueAtTime: gainSetSpy, exponentialRampToValueAtTime: gainRampSpy },
            };
          }
        }

        (window as any).AudioContext = MockAudioContext;
        useTutorialStore.getState().startTutorial('welcome');
        useTutorialStore.getState().completeTutorial();

        expect(freqSpy).toHaveBeenCalled();
        expect(gainSetSpy).toHaveBeenCalled();
        expect(startSpy).toHaveBeenCalled();
        expect(stopSpy).toHaveBeenCalled();
      } finally {
        (window as any).AudioContext = original;
      }
    });
  });
});

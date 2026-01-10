/**
 * ConnectionStore Tests
 */

import { useConnectionStore } from '@/stores/connectionStore';
import { act } from '@testing-library/react-native';
import { createDiscoveredDesktop, createOperator } from '../factories';

describe('connectionStore', () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useConnectionStore.getState().reset?.() ??
        useConnectionStore.setState({
          selectedDesktop: null,
          connectionState: 'disconnected',
          operator: null,
          connectionHistory: [],
        });
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useConnectionStore.getState();

      expect(state.selectedDesktop).toBeNull();
      expect(state.connectionState).toBe('disconnected');
      expect(state.operator).toBeNull();
    });
  });

  describe('selectDesktop', () => {
    it('should set selected desktop', () => {
      const desktop = createDiscoveredDesktop();

      act(() => {
        useConnectionStore.getState().selectDesktop(desktop);
      });

      const state = useConnectionStore.getState();
      expect(state.selectedDesktop).toEqual(desktop);
    });

    it('should add desktop to history', () => {
      const desktop = createDiscoveredDesktop();

      act(() => {
        useConnectionStore.getState().selectDesktop(desktop);
      });

      const state = useConnectionStore.getState();
      expect(state.connectionHistory).toContainEqual(desktop);
    });

    it('should not duplicate desktops in history', () => {
      const desktop = createDiscoveredDesktop();

      act(() => {
        useConnectionStore.getState().selectDesktop(desktop);
        useConnectionStore.getState().selectDesktop(desktop);
      });

      const state = useConnectionStore.getState();
      const matchingDesktops = state.connectionHistory.filter((d) => d.name === desktop.name);
      expect(matchingDesktops).toHaveLength(1);
    });
  });

  describe('setConnectionState', () => {
    it('should update connection state', () => {
      act(() => {
        useConnectionStore.getState().setConnectionState('connecting');
      });

      expect(useConnectionStore.getState().connectionState).toBe('connecting');

      act(() => {
        useConnectionStore.getState().setConnectionState('connected');
      });

      expect(useConnectionStore.getState().connectionState).toBe('connected');
    });
  });

  describe('setOperator', () => {
    it('should set operator on login', () => {
      const operator = createOperator();

      act(() => {
        useConnectionStore.getState().setOperator(operator);
      });

      const state = useConnectionStore.getState();
      expect(state.operator).toEqual(operator);
      expect(state.connectionState).toBe('authenticated');
    });
  });

  describe('logout', () => {
    it('should clear operator on logout', () => {
      const operator = createOperator();

      act(() => {
        useConnectionStore.getState().setOperator(operator);
        useConnectionStore.getState().logout();
      });

      const state = useConnectionStore.getState();
      expect(state.operator).toBeNull();
      expect(state.connectionState).toBe('connected');
    });
  });

  describe('disconnect', () => {
    it('should clear all connection state', () => {
      const desktop = createDiscoveredDesktop();
      const operator = createOperator();

      act(() => {
        useConnectionStore.getState().selectDesktop(desktop);
        useConnectionStore.getState().setOperator(operator);
        useConnectionStore.getState().disconnect();
      });

      const state = useConnectionStore.getState();
      expect(state.selectedDesktop).toBeNull();
      expect(state.operator).toBeNull();
      expect(state.connectionState).toBe('disconnected');
    });

    it('should preserve connection history', () => {
      const desktop = createDiscoveredDesktop();

      act(() => {
        useConnectionStore.getState().selectDesktop(desktop);
        useConnectionStore.getState().disconnect();
      });

      const state = useConnectionStore.getState();
      expect(state.connectionHistory).toHaveLength(1);
    });
  });
});

/**
 * @file useBusinessProfile.test.tsx - Tests for useBusinessProfile store
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useBusinessProfile, useBusinessProfileStore } from '../useBusinessProfile';

describe('useBusinessProfileStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    act(() => {
      useBusinessProfileStore.getState().resetProfile();
    });
  });

  describe('Initial State', () => {
    it('should have default business type', () => {
      const { result } = renderHook(() => useBusinessProfileStore());
      expect(result.current.businessType).toBe('GROCERY'); // DEFAULT_BUSINESS_TYPE é GROCERY
    });

    it('should not be configured initially', () => {
      const { result } = renderHook(() => useBusinessProfileStore());
      expect(result.current.isConfigured).toBe(false);
    });

    it('should have a profile object', () => {
      const { result } = renderHook(() => useBusinessProfileStore());
      expect(result.current.profile).toBeDefined();
      expect(result.current.profile.name).toBeDefined();
    });

    it('should have features and labels', () => {
      const { result } = renderHook(() => useBusinessProfileStore());
      expect(result.current.features).toBeDefined();
      expect(result.current.labels).toBeDefined();
    });
  });

  describe('setBusinessType', () => {
    it('should update business type', () => {
      const { result } = renderHook(() => useBusinessProfileStore());

      act(() => {
        result.current.setBusinessType('MOTOPARTS');
      });

      expect(result.current.businessType).toBe('MOTOPARTS');
    });

    it('should update profile when type changes', () => {
      const { result } = renderHook(() => useBusinessProfileStore());

      const originalProfile = result.current.profile.name;

      act(() => {
        result.current.setBusinessType('ENTERPRISE');
      });

      expect(result.current.profile.name).not.toBe(originalProfile);
      expect(result.current.profile.name).toBe('Enterprise'); // Nome correto do perfil
    });

    it('should update features when type changes', () => {
      const { result } = renderHook(() => useBusinessProfileStore());

      act(() => {
        result.current.setBusinessType('MOTOPARTS');
      });

      // Motoparts should have vehicle compatibility
      expect(result.current.features.vehicleCompatibility).toBe(true);
    });
  });

  describe('markAsConfigured', () => {
    it('should set isConfigured to true', () => {
      const { result } = renderHook(() => useBusinessProfileStore());

      expect(result.current.isConfigured).toBe(false);

      act(() => {
        result.current.markAsConfigured();
      });

      expect(result.current.isConfigured).toBe(true);
    });
  });

  describe('resetProfile', () => {
    it('should reset to default state', () => {
      const { result } = renderHook(() => useBusinessProfileStore());

      // Change state
      act(() => {
        result.current.setBusinessType('MOTOPARTS');
        result.current.markAsConfigured();
      });

      expect(result.current.businessType).toBe('MOTOPARTS');
      expect(result.current.isConfigured).toBe(true);

      // Reset
      act(() => {
        result.current.resetProfile();
      });

      expect(result.current.businessType).toBe('GROCERY'); // DEFAULT_BUSINESS_TYPE
      expect(result.current.isConfigured).toBe(false);
    });
  });

  describe('isFeatureEnabled', () => {
    it('should return true for enabled features', () => {
      const { result } = renderHook(() => useBusinessProfileStore());

      act(() => {
        result.current.setBusinessType('MOTOPARTS');
      });

      expect(result.current.isFeatureEnabled('vehicleCompatibility')).toBe(true);
      expect(result.current.isFeatureEnabled('serviceOrders')).toBe(true);
    });

    it('should return false for disabled features', () => {
      const { result } = renderHook(() => useBusinessProfileStore());

      act(() => {
        result.current.setBusinessType('GROCERY'); // GROCERY não tem vehicleCompatibility
      });

      expect(result.current.isFeatureEnabled('vehicleCompatibility')).toBe(false);
    });
  });

  describe('getLabel', () => {
    it('should return correct labels for business type', () => {
      const { result } = renderHook(() => useBusinessProfileStore());

      const label = result.current.getLabel('product');
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    });
  });
});

describe('useBusinessProfile hook', () => {
  beforeEach(() => {
    act(() => {
      useBusinessProfileStore.getState().resetProfile();
    });
  });

  it('should return all necessary properties', () => {
    const { result } = renderHook(() => useBusinessProfile());

    expect(result.current.businessType).toBeDefined();
    expect(result.current.profile).toBeDefined();
    expect(result.current.features).toBeDefined();
    expect(result.current.labels).toBeDefined();
    expect(result.current.isConfigured).toBeDefined();
    expect(result.current.setBusinessType).toBeInstanceOf(Function);
    expect(result.current.markAsConfigured).toBeInstanceOf(Function);
    expect(result.current.resetProfile).toBeInstanceOf(Function);
    expect(result.current.isFeatureEnabled).toBeInstanceOf(Function);
    expect(result.current.getLabel).toBeInstanceOf(Function);
  });

  it('should update when store changes', () => {
    const { result } = renderHook(() => useBusinessProfile());

    expect(result.current.businessType).toBe('GROCERY');

    act(() => {
      result.current.setBusinessType('MOTOPARTS');
    });

    expect(result.current.businessType).toBe('MOTOPARTS');
  });
});

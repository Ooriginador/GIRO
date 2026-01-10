/**
 * @file useBusinessProfile.test.ts - Testes para o store de perfil de negócio
 */

import { useBusinessProfileStore } from '@/stores/useBusinessProfile';
import { beforeEach, describe, expect, it } from 'vitest';

describe('useBusinessProfileStore', () => {
  beforeEach(() => {
    // Reset store state
    useBusinessProfileStore.getState().resetProfile();
  });

  it('should have default business type GROCERY', () => {
    const { businessType } = useBusinessProfileStore.getState();

    // DEFAULT_BUSINESS_TYPE é 'GROCERY'
    expect(businessType).toBe('GROCERY');
  });

  it('should not be configured initially', () => {
    const { isConfigured } = useBusinessProfileStore.getState();

    expect(isConfigured).toBe(false);
  });

  it('should set business type', () => {
    const store = useBusinessProfileStore.getState();

    store.setBusinessType('MOTOPARTS');

    const state = useBusinessProfileStore.getState();
    expect(state.businessType).toBe('MOTOPARTS');
  });

  it('should update profile when business type changes', () => {
    const store = useBusinessProfileStore.getState();

    store.setBusinessType('MOTOPARTS');

    const state = useBusinessProfileStore.getState();
    expect(state.profile).toBeDefined();
  });

  it('should mark as configured', () => {
    const store = useBusinessProfileStore.getState();

    store.markAsConfigured();

    const state = useBusinessProfileStore.getState();
    expect(state.isConfigured).toBe(true);
  });

  it('should reset profile', () => {
    const store = useBusinessProfileStore.getState();

    store.setBusinessType('MOTOPARTS');
    store.markAsConfigured();
    store.resetProfile();

    const state = useBusinessProfileStore.getState();
    expect(state.businessType).toBe('GROCERY');
    expect(state.isConfigured).toBe(false);
  });

  it('should check if feature is enabled', () => {
    const store = useBusinessProfileStore.getState();

    const isEnabled = store.isFeatureEnabled('pdv');
    expect(isEnabled).toBe(true);
  });

  it('should get label', () => {
    const store = useBusinessProfileStore.getState();

    const label = store.getLabel('product');
    expect(typeof label).toBe('string');
    expect(label.length).toBeGreaterThan(0);
  });
});

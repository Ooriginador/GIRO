/**
 * @file scale.mock.test.ts - Testes para o mock de balança serial
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { MockScale, createMockScale } from '../../mocks/scale.mock';

describe('MockScale', () => {
  let scale: MockScale;

  beforeEach(() => {
    scale = createMockScale();
  });

  describe('basic operations', () => {
    it('should create scale with initial weight of 0', () => {
      expect(scale.getWeight()).toBe(0);
      expect(scale.isWeightStable()).toBe(true);
      expect(scale.checkConnection()).toBe(true);
    });

    it('should create scale with custom initial weight', () => {
      const customScale = createMockScale(1.5);
      expect(customScale.getWeight()).toBe(1.5);
    });

    it('should set weight', () => {
      scale.setWeight(2.5);
      expect(scale.getWeight()).toBe(2.5);
    });

    it('should not allow negative weight', () => {
      scale.setWeight(-1);
      expect(scale.getWeight()).toBe(0);
    });

    it('should reset scale', () => {
      scale.setWeight(5);
      scale.setStable(false);
      scale.setConnected(false);

      scale.reset();

      expect(scale.getWeight()).toBe(0);
      expect(scale.isWeightStable()).toBe(true);
      expect(scale.checkConnection()).toBe(true);
    });
  });

  describe('stability', () => {
    it('should be stable by default', () => {
      expect(scale.isWeightStable()).toBe(true);
    });

    it('should change stability state', () => {
      scale.setStable(false);
      expect(scale.isWeightStable()).toBe(false);

      scale.setStable(true);
      expect(scale.isWeightStable()).toBe(true);
    });
  });

  describe('connection', () => {
    it('should be connected by default', () => {
      expect(scale.checkConnection()).toBe(true);
    });

    it('should throw error when reading disconnected scale', () => {
      scale.setConnected(false);

      expect(() => scale.getWeight()).toThrow('Scale not connected');
    });

    it('should change connection state', () => {
      scale.setConnected(false);
      expect(scale.checkConnection()).toBe(false);

      scale.setConnected(true);
      expect(scale.checkConnection()).toBe(true);
    });
  });

  describe('protocol response', () => {
    it('should generate Toledo/Filizola protocol response', () => {
      scale.setWeight(1.234);
      scale.setStable(true);

      const response = scale.readProtocolResponse();

      expect(response).toMatch(/S\+\d+\.\d{3}\r\n/);
      expect(response).toBe('S+001.234\r\n');
    });

    it('should indicate instable weight', () => {
      scale.setWeight(2.5);
      scale.setStable(false);

      const response = scale.readProtocolResponse();

      expect(response.startsWith('I')).toBe(true);
    });

    it('should format weight with proper padding', () => {
      scale.setWeight(0.05);
      const response = scale.readProtocolResponse();

      expect(response).toBe('S+000.050\r\n');
    });
  });

  describe('weight fluctuation simulation', () => {
    it('should simulate fluctuation within variance', () => {
      scale.setWeight(1.0);
      const initialWeight = scale.getWeight();

      // Run multiple fluctuations
      for (let i = 0; i < 10; i++) {
        scale.simulateFluctuation(0.01);
      }

      const finalWeight = scale.getWeight();

      // Weight should have changed but stay within reasonable bounds
      expect(finalWeight).toBeGreaterThan(0);
      expect(Math.abs(finalWeight - initialWeight)).toBeLessThan(0.1);
    });

    it('should not fluctuate when weight is 0', () => {
      scale.setWeight(0);
      scale.simulateFluctuation();

      expect(scale.getWeight()).toBe(0);
    });
  });

  describe('PDV scenarios', () => {
    it('should simulate weighing produce', () => {
      // Customer puts bananas on scale
      scale.setWeight(1.234);
      expect(scale.isWeightStable()).toBe(true);

      // Weight is stable, can be used for sale
      const weight = scale.getWeight();
      expect(weight).toBe(1.234);
    });

    it('should simulate unstable reading', () => {
      // Customer is still placing items
      scale.setStable(false);
      scale.setWeight(0.5);

      // Should wait for stability before accepting weight
      expect(scale.isWeightStable()).toBe(false);

      // Once stable
      scale.setStable(true);
      expect(scale.isWeightStable()).toBe(true);
      expect(scale.getWeight()).toBe(0.5);
    });

    it('should handle tare weight', () => {
      // Container weight
      const containerWeight = 0.05;
      scale.setWeight(containerWeight);

      // Add product
      const productWeight = 0.75;
      scale.setWeight(containerWeight + productWeight);

      // Net weight after tare
      const netWeight = scale.getWeight() - containerWeight;
      expect(netWeight).toBeCloseTo(productWeight, 3);
    });
  });
});

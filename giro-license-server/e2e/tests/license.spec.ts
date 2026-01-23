import { test, expect, request } from '@playwright/test';

const API_BASE = 'http://localhost:8001/api/v1';

test.describe('License Activation API', () => {
  let authToken: string;

  test.beforeAll(async () => {
    // Login via API to get token
    const apiContext = await request.newContext();
    const loginResponse = await apiContext.post(`${API_BASE}/auth/login`, {
      data: {
        email: 'e2e-test@giro.com.br',
        password: 'testpassword123',
      },
    });

    const loginData = await loginResponse.json();
    authToken = loginData.token;
  });

  test('should list licenses for authenticated user', async () => {
    const apiContext = await request.newContext();
    const response = await apiContext.get(`${API_BASE}/licenses`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.data).toBeDefined();
    expect(Array.isArray(data.data)).toBeTruthy();
  });

  test('should activate a pending license', async () => {
    const apiContext = await request.newContext();
    const licenseKey = 'E2E-TEST-LICENSE-KEY';
    const response = await apiContext.post(`${API_BASE}/licenses/${licenseKey}/activate`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: {
        hardware_id: 'e2e-test-hardware-fingerprint-001',
        machine_name: 'E2E Test Machine',
        os_version: 'Linux E2E 1.0',
        cpu_info: 'E2E Test CPU',
      },
    });

    // Should succeed or indicate already activated
    const data = await response.json();
    expect(response.status()).toBeLessThan(500);

    if (response.ok()) {
      expect(data.valid).toBe(true);
      expect(data.license_key).toBe(licenseKey);
    }
  });

  test('should validate an active license', async () => {
    const apiContext = await request.newContext();
    const licenseKey = 'E2E-TEST-LICENSE-KEY';
    const response = await apiContext.post(`${API_BASE}/licenses/${licenseKey}/validate`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: {
        hardware_id: 'e2e-test-hardware-fingerprint-001',
        client_time: new Date().toISOString(),
      },
    });

    const data = await response.json();
    expect(response.status()).toBeLessThan(500);

    if (response.ok()) {
      expect(data.valid).toBeDefined();
    }
  });

  test('should reject invalid license key', async () => {
    const apiContext = await request.newContext();
    const invalidKey = 'INVALID-LICENSE-KEY-12345';
    const response = await apiContext.post(`${API_BASE}/licenses/${invalidKey}/activate`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: {
        hardware_id: 'some-hardware-id',
      },
    });

    expect(response.ok()).toBeFalsy();
    expect(response.status()).toBe(404);
  });
});

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const successRate = new Rate('success_rate');
const healthCheckDuration = new Trend('health_check_duration');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'giro_sk_test_123456789';

export const options = {
  scenarios: {
    // Smoke test - basic sanity check
    smoke: {
      executor: 'constant-vus',
      vus: 5,
      duration: '1m',
      startTime: '0s',
    },
    // Load test - normal traffic
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },  // Ramp up to 100 VUs
        { duration: '5m', target: 100 },  // Stay at 100 VUs
        { duration: '2m', target: 0 },    // Ramp down
      ],
      startTime: '1m',
    },
    // Stress test - heavy traffic (1000 req/s goal)
    stress: {
      executor: 'ramping-arrival-rate',
      startRate: 100,
      timeUnit: '1s',
      preAllocatedVUs: 200,
      maxVUs: 500,
      stages: [
        { duration: '2m', target: 500 },  // Ramp up to 500 req/s
        { duration: '5m', target: 1000 }, // Reach 1000 req/s
        { duration: '5m', target: 1000 }, // Hold at 1000 req/s
        { duration: '2m', target: 0 },    // Ramp down
      ],
      startTime: '10m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],  // 95% requests < 500ms
    http_req_failed: ['rate<0.01'],                  // Less than 1% errors
    error_rate: ['rate<0.01'],
    success_rate: ['rate>0.99'],
  },
};

// Default headers
const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY,
};

// API helper
function api(method, endpoint, body = null) {
  const url = `${BASE_URL}${endpoint}`;
  const params = { headers };

  let response;
  switch (method.toUpperCase()) {
    case 'GET':
      response = http.get(url, params);
      break;
    case 'POST':
      response = http.post(url, body ? JSON.stringify(body) : null, params);
      break;
    case 'PUT':
      response = http.put(url, body ? JSON.stringify(body) : null, params);
      break;
    case 'DELETE':
      response = http.del(url, null, params);
      break;
    default:
      response = http.get(url, params);
  }

  return response;
}

export default function () {
  // Health Check
  group('Health Check', () => {
    const start = Date.now();
    const res = api('GET', '/health');
    healthCheckDuration.add(Date.now() - start);

    const passed = check(res, {
      'health status is 200': (r) => r.status === 200,
      'health response is OK': (r) => r.json('status') === 'healthy',
    });

    errorRate.add(!passed);
    successRate.add(passed);
  });

  sleep(0.1);

  // Validate License
  group('License Validation', () => {
    const res = api('POST', '/api/v1/licenses/validate', {
      license_key: 'GIRO-TEST-LOAD-0001',
      hardware_id: `HW-${__VU}-${__ITER}`,
    });

    const passed = check(res, {
      'validate status is 2xx or 4xx': (r) => r.status >= 200 && r.status < 500,
      'validate has response body': (r) => r.body.length > 0,
    });

    errorRate.add(!passed);
    successRate.add(passed);
  });

  sleep(0.1);

  // License Activation
  group('License Activation', () => {
    const res = api('POST', '/api/v1/licenses/activate', {
      license_key: 'GIRO-TEST-LOAD-0001',
      hardware_id: `HW-${__VU}-${__ITER}`,
      device_name: `LoadTest VU${__VU}`,
      os_info: 'Linux LoadTest',
    });

    const passed = check(res, {
      'activate status is 2xx or 4xx': (r) => r.status >= 200 && r.status < 500,
    });

    errorRate.add(!passed);
    successRate.add(passed);
  });

  sleep(0.1);

  // Heartbeat
  group('Heartbeat', () => {
    const res = api('POST', '/api/v1/heartbeat', {
      hardware_id: `HW-${__VU}-${__ITER}`,
      metrics: {
        cpu_usage: Math.random() * 100,
        memory_usage: Math.random() * 8000,
        uptime: Math.floor(Math.random() * 86400),
      },
    });

    const passed = check(res, {
      'heartbeat status is 2xx or 4xx': (r) => r.status >= 200 && r.status < 500,
    });

    errorRate.add(!passed);
    successRate.add(passed);
  });

  sleep(0.5);
}

// Setup function - runs once before test
export function setup() {
  console.log(`Starting load test against: ${BASE_URL}`);

  // Verify API is reachable
  const healthRes = http.get(`${BASE_URL}/api/v1/health`);
  if (healthRes.status !== 200) {
    throw new Error(`API not reachable at ${BASE_URL}/api/v1/health`);
  }

  console.log('API is reachable. Starting tests...');
  return { startTime: new Date().toISOString() };
}

// Teardown function - runs once after test
export function teardown(data) {
  console.log(`Load test completed. Started at: ${data.startTime}`);
}

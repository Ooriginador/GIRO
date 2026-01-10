import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const successRate = new Rate('success_rate');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'http_req_failed': ['rate<0.01'],
    'error_rate': ['rate<0.01'],
    'success_rate': ['rate>0.99'],
  },
};

// Setup function
export function setup() {
  console.log(`Starting smoke test against: ${BASE_URL}`);

  const healthRes = http.get(`${BASE_URL}/api/v1/health`);
  if (healthRes.status !== 200) {
    throw new Error(`API not reachable at ${BASE_URL}/api/v1/health`);
  }

  console.log('API is reachable. Starting smoke test...');
  return { startTime: new Date().toISOString() };
}

// Main test function
export default function() {
  // Test health endpoint
  const healthRes = http.get(`${BASE_URL}/api/v1/health`);
  const healthPassed = check(healthRes, {
    'health status is 200': (r) => r.status === 200,
    'health has database field': (r) => r.json('database') !== undefined,
    'health response time < 200ms': (r) => r.timings.duration < 200,
  });

  errorRate.add(!healthPassed);
  successRate.add(healthPassed);

  sleep(1);
}

// Teardown function
export function teardown(data) {
  console.log(`Smoke test completed. Started at: ${data.startTime}`);
}

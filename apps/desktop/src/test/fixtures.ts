export const TEST_PIN = 'TEST_PIN_0000';
export const TEST_TOKEN_USER = 'TEST_TOKEN_USER_0000';
export const TEST_TOKEN_ADMIN = 'TEST_TOKEN_ADMIN_0000';
export const TEST_SESSION_ID = 'session-test-0000';

export const MOCK_EMPLOYEE_ADMIN = {
  id: 'admin-1',
  name: 'Admin',
  role: 'ADMIN',
  pin: TEST_PIN,
  isActive: true,
};

export const MOCK_EMPLOYEE_OPERATOR = {
  id: 'emp1',
  name: 'João',
  role: 'OPERATOR',
  pin: TEST_PIN,
  isActive: true,
};

export default {
  TEST_PIN,
  TEST_TOKEN_USER,
  TEST_TOKEN_ADMIN,
  TEST_SESSION_ID,
  MOCK_EMPLOYEE_ADMIN,
  MOCK_EMPLOYEE_OPERATOR,
};

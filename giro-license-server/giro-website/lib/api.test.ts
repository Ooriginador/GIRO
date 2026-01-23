import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  login, 
  register, 
  getLicenses, 
  getHardware,
  getProfile,
  createMercadoPagoPreference 
} from './api';

describe('api.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    
    // Improved localStorage mock
    const store: Record<string, string> = {};
    global.localStorage = {
      getItem: vi.fn((key) => store[key] || null),
      setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
      removeItem: vi.fn((key) => { delete store[key]; }),
      clear: vi.fn(() => { for (const key in store) delete store[key]; }),
    } as any;
    
    // Mock window.location
    vi.stubGlobal('location', { href: '' });
  });

  it('should handle login successfully', async () => {
    const mockResponse = { token: 'fake-token', user: { id: '1', email: 't@t.com', name: 'T' } };
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await login({ email: 'test@test.com', password: 'password' });
    expect(result).toEqual(mockResponse);
    // Note: api.ts login doesn't set localStorage, component does.
  });

  it('should handle login failure', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Invalid credentials' }),
    });

    await expect(login({ email: 't@t.com', password: 'p' })).rejects.toThrow('Invalid credentials');
  });

  it('should handle registration', async () => {
    const mockResponse = { token: 'fake-token', user: { id: '1', email: 't@t.com', name: 'T' } };
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await register({
      email: 'test@test.com',
      password: 'password',
      name: 'Test',
    });
    expect(result).toEqual(mockResponse);
  });

  it('should fetch licenses with token from localStorage', async () => {
    global.localStorage.setItem('token', 'fake-token');
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: '1' }], pagination: {} }),
    });

    const result = await getLicenses();
    expect(result.data).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/licenses'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer fake-token',
        }),
      })
    );
  });

  it('should create MercadoPago preference', async () => {
    global.localStorage.setItem('token', 'fake-token');
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ init_point: 'http://mp.com' }),
    });

    const result = await createMercadoPagoPreference('Mensal', 49.9);
    expect(result).toEqual({ init_point: 'http://mp.com' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/mercadopago/create_preference'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: 'Mensal', price: 49.9, quantity: 1 }),
      })
    );
  });

  it('should handle 401 and redirect to login', async () => {
    global.localStorage.setItem('token', 'old-token');
    (global.fetch as any).mockResolvedValue({
      status: 401,
      ok: false,
    });

    await expect(getLicenses()).rejects.toThrow('Sessão expirada');
    expect(global.localStorage.removeItem).toHaveBeenCalledWith('token');
    expect(window.location.href).toBe('/login');
  });

  it('should get profile', async () => {
    global.localStorage.setItem('token', 'fake-token');
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ id: '1', email: 't@t.com', name: 'T' }),
    });

    const result = await getProfile();
    expect(result.id).toBe('1');
  });

  it('should get hardware info', async () => {
    global.localStorage.setItem('token', 'fake-token');
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [{ id: '1', fingerprint: 'xyz' }],
    });

    const result = await getHardware();
    expect(result).toHaveLength(1);
    expect(result[0].fingerprint).toBe('xyz');
  });

  it('should handle registration failure', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Email already exists' }),
    });

    await expect(register({ email: 't@t.com', password: 'p', name: 'T' }))
      .rejects.toThrow('Email already exists');
  });

  it('should handle generic error in fetchWithAuth when json() fails', async () => {
    global.localStorage.setItem('token', 'fake-token');
    (global.fetch as any).mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
      json: async () => { throw new Error('No JSON'); },
    });

    await expect(getLicenses()).rejects.toThrow('Erro na requisição: Internal Server Error');
  });
});

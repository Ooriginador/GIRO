# 🎨 Dashboard Frontend

> Documentação do Dashboard Next.js

---

## 🎯 Overview

Dashboard web para gerenciamento de licenças do GIRO PDV.

**Stack:**

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5
- **Styling**: TailwindCSS 3 + shadcn/ui
- **State**: React Hooks
- **API Client**: Axios
- **Auth**: JWT (localStorage)
- **Testing**: Vitest + Playwright

---

## 📁 Estrutura

```
dashboard/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home (redirect)
│   │   ├── login/
│   │   │   └── page.tsx       # Login page
│   │   └── dashboard/
│   │       ├── layout.tsx     # Auth layout
│   │       ├── page.tsx       # Dashboard home
│   │       ├── licenses/
│   │       ├── hardware/
│   │       ├── metrics/
│   │       └── settings/
│   │
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui base
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   ├── LoginForm.tsx
│   │   ├── LicenseTable.tsx
│   │   └── CreateLicenseDialog.tsx
│   │
│   └── lib/                   # Utilities
│       ├── api.ts            # Axios client
│       ├── auth.ts           # Auth helpers
│       ├── utils.ts          # General utils
│       └── types.ts          # TypeScript types
│
├── e2e/                       # Playwright tests
│   ├── login.spec.ts
│   └── dashboard.spec.ts
│
├── public/                    # Static assets
│   └── logo.svg
│
├── .env.local                 # Environment vars
├── next.config.ts             # Next.js config
├── tailwind.config.ts         # TailwindCSS
├── tsconfig.json              # TypeScript
└── package.json
```

---

## 🚀 Instalação

### Pré-requisitos

- Node.js 20+
- npm ou yarn

### Setup

```bash
cd dashboard

# Instalar dependências
npm install

# Copiar .env
cp .env.example .env.local

# Editar .env.local
nano .env.local
```

**`.env.local`:**

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
# Produção: https://giro-license-server-production.up.railway.app
```

### Rodar

```bash
# Development
npm run dev
# http://localhost:3000

# Build
npm run build

# Production
npm start
```

---

## 🔐 Autenticação

### Flow

```
1. User acessa /login
   ↓
2. Preenche email + senha
   ↓
3. POST /auth/login
   ↓
4. Recebe access_token + refresh_token
   ↓
5. Armazena em localStorage
   ↓
6. Redirect para /dashboard
   ↓
7. Cada request inclui: Authorization: Bearer <token>
   ↓
8. Se 401 → tentar refresh
   ↓
9. Se refresh falha → redirect /login
```

### Implementação

#### API Client

```typescript
// lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - adiciona token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        localStorage.setItem('access_token', data.access_token);
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;

        return api(originalRequest);
      } catch (refreshError) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

#### Auth Context

```typescript
// lib/auth.ts
import { createContext, useContext, useState, useEffect } from 'react';
import api from './api';

interface User {
  id: string;
  email: string;
  name: string;
  company_name?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const { data } = await api.get('/profile');
      setUser(data);
    } catch (error) {
      localStorage.clear();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });

    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);

    setUser(data.admin);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.clear();
      setUser(null);
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

---

## 📄 Páginas Principais

### Login (`/login`)

```tsx
// app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Login - GIRO License</h1>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>}

        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
    </div>
  );
}
```

---

### Dashboard Home (`/dashboard`)

```tsx
// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface Stats {
  total: number;
  active: number;
  pending: number;
  expired: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const { data } = await api.get('/licenses/stats');
    setStats(data);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.total || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{stats?.active || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">{stats?.pending || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expiradas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{stats?.expired || 0}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

---

### Licenses (`/dashboard/licenses`)

```tsx
// app/dashboard/licenses/page.tsx
'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { CreateLicenseDialog } from '@/components/CreateLicenseDialog';
import { LicenseTable } from '@/components/LicenseTable';

export default function LicensesPage() {
  const [licenses, setLicenses] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchLicenses();
  }, []);

  const fetchLicenses = async () => {
    const { data } = await api.get('/licenses');
    setLicenses(data.data);
  };

  const handleCreateSuccess = () => {
    setIsDialogOpen(false);
    fetchLicenses();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Licenças</h1>
        <Button onClick={() => setIsDialogOpen(true)}>Criar Licença</Button>
      </div>

      <LicenseTable licenses={licenses} onUpdate={fetchLicenses} />

      <CreateLicenseDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
```

---

## 🧩 Componentes Principais

### LicenseTable

```tsx
// components/LicenseTable.tsx
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface License {
  id: string;
  license_key: string;
  plan_type: string;
  status: string;
  activated_at?: string;
  expires_at?: string;
}

export function LicenseTable({
  licenses,
  onUpdate,
}: {
  licenses: License[];
  onUpdate: () => void;
}) {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    expired: 'bg-red-100 text-red-800',
    suspended: 'bg-gray-100 text-gray-800',
    revoked: 'bg-black text-white',
  };

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b">
          <th className="text-left p-3">Chave</th>
          <th className="text-left p-3">Plano</th>
          <th className="text-left p-3">Status</th>
          <th className="text-left p-3">Ativada em</th>
          <th className="text-left p-3">Expira em</th>
          <th className="text-right p-3">Ações</th>
        </tr>
      </thead>
      <tbody>
        {licenses.map((license) => (
          <tr key={license.id} className="border-b hover:bg-gray-50">
            <td className="p-3 font-mono text-sm">{license.license_key}</td>
            <td className="p-3">{license.plan_type}</td>
            <td className="p-3">
              <Badge className={statusColors[license.status]}>{license.status}</Badge>
            </td>
            <td className="p-3">
              {license.activated_at ? new Date(license.activated_at).toLocaleDateString() : '-'}
            </td>
            <td className="p-3">
              {license.expires_at ? new Date(license.expires_at).toLocaleDateString() : '-'}
            </td>
            <td className="p-3 text-right">
              <Button variant="ghost" size="sm">
                Detalhes
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## 🧪 Testing

### Unit Tests (Vitest)

```typescript
// __tests__/api.test.ts
import { describe, it, expect, vi } from 'vitest';
import api from '@/lib/api';

describe('API Client', () => {
  it('adds Authorization header when token exists', async () => {
    localStorage.setItem('access_token', 'test-token');

    const request = api.interceptors.request.handlers[0].fulfilled;
    const config = { headers: {} };

    const result = request(config);

    expect(result.headers.Authorization).toBe('Bearer test-token');
  });
});
```

### E2E Tests (Playwright)

```typescript
// e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'password123');

    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'wrong@test.com');
    await page.fill('input[type="password"]', 'wrong');

    await page.click('button[type="submit"]');

    await expect(page.locator('.bg-red-50')).toBeVisible();
  });
});
```

---

## 🎨 Styling

### TailwindCSS

```tsx
// Padrões usados
<div className="flex items-center justify-between mb-4">
  <h1 className="text-3xl font-bold text-gray-900">Title</h1>
  <Button className="bg-blue-600 hover:bg-blue-700">Action</Button>
</div>

<Card className="shadow-sm border border-gray-200">
  <CardContent className="p-6">
    Content
  </CardContent>
</Card>
```

### shadcn/ui

Componentes base instalados:

- `button` - Botões
- `card` - Cards
- `input` - Inputs
- `dialog` - Modais
- `badge` - Tags de status
- `table` - Tabelas

---

## 🚀 Próximos Passos

- [ ] Página de métricas com gráficos (recharts)
- [ ] Gerenciamento de hardware
- [ ] Perfil do usuário
- [ ] Notificações em tempo real (WebSocket)
- [ ] Temas claro/escuro
- [ ] Internacionalização (i18n)

---

## 📚 Recursos

- **Next.js Docs**: https://nextjs.org/docs
- **shadcn/ui**: https://ui.shadcn.com
- **TailwindCSS**: https://tailwindcss.com/docs
- **Playwright**: https://playwright.dev

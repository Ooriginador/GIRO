# 📱 Mobile Development Skill

> **Especialista em React Native + Expo para GIRO Mobile**  
> Versão: 1.0.0 | Última Atualização: 29 de Janeiro de 2026

## 📋 Descrição

Esta skill fornece conhecimento especializado em:

- React Native com Expo SDK 51+
- NativeWind (TailwindCSS para RN)
- Expo Router (file-based routing)
- Integração com GIRO Desktop via API
- Offline-first com sync

## 🛠️ Stack Técnica

| Componente     | Versão  | Uso                |
| -------------- | ------- | ------------------ |
| Expo           | SDK 51+ | Framework mobile   |
| React Native   | 0.74+   | Runtime            |
| NativeWind     | 4.0+    | Styling (Tailwind) |
| Expo Router    | 3.0+    | Navigation         |
| TanStack Query | 5.0+    | Data fetching      |
| Zustand        | 4.5+    | State management   |
| Zod            | 3.22+   | Validation         |

## 📁 Estrutura do Projeto

```
giro-mobile/
├── app/                      # Expo Router pages
│   ├── (auth)/              # Auth group
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/              # Tab navigation
│   │   ├── _layout.tsx
│   │   ├── home.tsx
│   │   ├── products.tsx
│   │   └── settings.tsx
│   ├── _layout.tsx          # Root layout
│   └── +not-found.tsx
├── components/              # Shared components
│   ├── ui/                  # Primitives
│   └── features/            # Feature components
├── hooks/                   # Custom hooks
├── services/                # API services
├── stores/                  # Zustand stores
├── utils/                   # Helpers
├── app.config.ts            # Expo config
└── tailwind.config.cjs      # NativeWind config
```

## 📐 Padrões de Código

### Componente com NativeWind

```tsx
import { View, Text, Pressable } from 'react-native';
import { cn } from '@/utils/cn';

interface ProductCardProps {
  name: string;
  price: number;
  onPress?: () => void;
  className?: string;
}

export function ProductCard({ name, price, onPress, className }: ProductCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className={cn('bg-white rounded-xl p-4 shadow-sm', 'active:bg-gray-50', className)}
    >
      <Text className="text-lg font-semibold text-gray-900">{name}</Text>
      <Text className="text-primary-600 font-bold mt-1">R$ {price.toFixed(2)}</Text>
    </Pressable>
  );
}
```

### Expo Router Layout

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Home, Package, Settings } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#6b7280',
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Produtos',
          tabBarIcon: ({ color, size }) => <Package size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Config',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
```

### API Service com TanStack Query

```tsx
// services/products.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { Product, CreateProductDto } from '@/types';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get<Product[]>('/products');
      return response.data;
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProductDto) => {
      const response = await api.post<Product>('/products', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
```

### Zustand Store

```typescript
// stores/auth.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      login: (token, user) =>
        set({
          token,
          user,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

## 📡 Integração com GIRO Desktop

### Descoberta via mDNS/QR Code

```tsx
// hooks/useDesktopConnection.ts
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface DesktopServer {
  ip: string;
  port: number;
  name: string;
}

export function useDesktopDiscovery() {
  const [servers, setServers] = useState<DesktopServer[]>([]);

  // Scan local network for GIRO servers
  useEffect(() => {
    const discover = async () => {
      // mDNS discovery or manual IP scan
      // GIRO Desktop broadcasts on port 3847
    };

    discover();
  }, []);

  return { servers };
}

export function useConnectToDesktop(server: DesktopServer) {
  return useQuery({
    queryKey: ['desktop-connection', server.ip],
    queryFn: async () => {
      const response = await fetch(`http://${server.ip}:${server.port}/api/ping`);
      return response.json();
    },
    enabled: !!server.ip,
  });
}
```

### Scanner de Código de Barras

```tsx
// components/BarcodeScanner.tsx
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
}

export function BarcodeScanner({ onScan }: BarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-center mb-4">Precisamos de acesso à câmera</Text>
        <Pressable onPress={requestPermission} className="bg-primary-600 px-6 py-3 rounded-lg">
          <Text className="text-white font-semibold">Permitir Câmera</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <CameraView
      className="flex-1"
      barcodeScannerSettings={{
        barcodeTypes: ['ean13', 'ean8', 'code128', 'code39'],
      }}
      onBarcodeScanned={
        scanned
          ? undefined
          : (result) => {
              setScanned(true);
              onScan(result.data);
              setTimeout(() => setScanned(false), 2000);
            }
      }
    />
  );
}
```

## 📴 Offline-First Pattern

```typescript
// hooks/useOfflineSync.ts
import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getOfflineQueue, clearOfflineQueue } from '@/utils/offline';

export function useOfflineSync() {
  const queryClient = useQueryClient();

  const syncMutation = useMutation({
    mutationFn: async () => {
      const queue = await getOfflineQueue();

      for (const action of queue) {
        await fetch(action.url, {
          method: action.method,
          body: JSON.stringify(action.data),
        });
      }

      await clearOfflineQueue();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        syncMutation.mutate();
      }
    });

    return () => unsubscribe();
  }, []);

  return syncMutation;
}
```

## ✅ Checklist de Desenvolvimento

### Setup

- [ ] Expo SDK atualizado
- [ ] NativeWind configurado
- [ ] Expo Router estruturado
- [ ] TanStack Query provider

### Features

- [ ] Autenticação funcional
- [ ] Navegação por tabs
- [ ] Scanner de código de barras
- [ ] Conexão com GIRO Desktop
- [ ] Modo offline

### Quality

- [ ] TypeScript sem erros
- [ ] Componentes testados
- [ ] Performance otimizada
- [ ] Acessibilidade básica

## 🔗 Referências

- [Expo Docs](https://docs.expo.dev/)
- [NativeWind](https://www.nativewind.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [TanStack Query](https://tanstack.com/query/latest)

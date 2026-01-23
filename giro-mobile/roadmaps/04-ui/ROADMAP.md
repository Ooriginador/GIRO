# 🎨 UI - Roadmap do Agente

> **Projeto**: GIRO Mobile  
> **Responsabilidade**: Design System, Componentes e Telas

---

## 📋 Tarefas

### Fase 1: Design System Base

#### TASK-UI-001: Configurar Design Tokens

- **Prioridade**: 🔴 Crítica
- **Estimativa**: 1h
- **Dependências**: TASK-SETUP-004
- **Status**: ⬜ Não iniciado

**Descrição**:
Definir tokens de design (cores, espaçamentos, tipografia) seguindo identidade GIRO.

**Critérios de Aceite**:

- [ ] Paleta de cores definida
- [ ] Escala de espaçamentos
- [ ] Tipografia configurada
- [ ] Sombras e bordas
- [ ] Dark mode preparado

**Arquivo**: `app/lib/theme.ts`

```typescript
export const colors = {
  // Primary - Blue
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },

  // Semantic
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#0ea5e9',

  // Neutral
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // Surface
  surface: '#ffffff',
  background: '#f8fafc',

  // Dark mode variants
  dark: {
    surface: '#1f2937',
    background: '#111827',
    text: '#f9fafb',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;
```

---

#### TASK-UI-002: Componentes Base (Atoms)

- **Prioridade**: 🔴 Crítica
- **Estimativa**: 3h
- **Dependências**: TASK-UI-001
- **Status**: ⬜ Não iniciado

**Descrição**:
Criar componentes base reutilizáveis.

**Critérios de Aceite**:

- [ ] Button (variants: primary, secondary, ghost, danger)
- [ ] Text (variants: heading, body, caption, label)
- [ ] Input (text, search, number)
- [ ] Card (elevations, interactive)
- [ ] Badge (status, count)
- [ ] Icon (wrapper para icons)

**Arquivo**: `app/components/ui/Button.tsx`

```typescript
import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import * as Haptics from 'expo-haptics';
import { cn } from '@lib/utils';

const buttonVariants = cva('flex-row items-center justify-center rounded-lg active:opacity-80', {
  variants: {
    variant: {
      primary: 'bg-primary-600',
      secondary: 'bg-gray-100 border border-gray-300',
      ghost: 'bg-transparent',
      danger: 'bg-danger',
    },
    size: {
      sm: 'px-3 py-2',
      md: 'px-4 py-3',
      lg: 'px-6 py-4',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

const textVariants = cva('font-medium', {
  variants: {
    variant: {
      primary: 'text-white',
      secondary: 'text-gray-800',
      ghost: 'text-primary-600',
      danger: 'text-white',
    },
    size: {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

interface ButtonProps extends VariantProps<typeof buttonVariants> {
  onPress: () => void;
  children: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  haptic?: boolean;
  className?: string;
}

export function Button({
  variant,
  size,
  onPress,
  children,
  leftIcon,
  rightIcon,
  loading,
  disabled,
  haptic = true,
  className,
}: ButtonProps) {
  const handlePress = async () => {
    if (haptic) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size }), disabled && 'opacity-50', className)}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'danger' ? 'white' : '#3b82f6'}
        />
      ) : (
        <>
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <Text className={cn(textVariants({ variant, size }))}>{children}</Text>
          {rightIcon && <View className="ml-2">{rightIcon}</View>}
        </>
      )}
    </Pressable>
  );
}
```

---

#### TASK-UI-003: Componentes Compostos (Molecules)

- **Prioridade**: 🟡 Alta
- **Estimativa**: 2.5h
- **Dependências**: TASK-UI-002
- **Status**: ⬜ Não iniciado

**Descrição**:
Criar componentes compostos para funcionalidades comuns.

**Critérios de Aceite**:

- [ ] ProductCard (exibe produto escaneado)
- [ ] SearchBar (busca com ícone)
- [ ] ListItem (item de lista genérico)
- [ ] EmptyState (estado vazio)
- [ ] ConnectionStatus (indicador de conexão)
- [ ] NumericKeypad (teclado numérico)

**Arquivo**: `app/components/ui/ProductCard.tsx`

```typescript
import { View, Text, Image } from 'react-native';
import { Card } from './Card';
import { Badge } from './Badge';
import type { Product } from '@types/product';

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  showStock?: boolean;
  showPrice?: boolean;
}

export function ProductCard({
  product,
  onPress,
  showStock = true,
  showPrice = true,
}: ProductCardProps) {
  const stockStatus =
    product.stock <= 0 ? 'danger' : product.stock <= product.minStock ? 'warning' : 'success';

  return (
    <Card onPress={onPress} className="p-4">
      <View className="flex-row">
        {/* Image */}
        <View className="w-16 h-16 bg-gray-100 rounded-lg mr-4 items-center justify-center">
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} className="w-full h-full rounded-lg" />
          ) : (
            <Text className="text-gray-400 text-2xl">📦</Text>
          )}
        </View>

        {/* Info */}
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900" numberOfLines={2}>
            {product.name}
          </Text>

          <Text className="text-sm text-gray-500 mt-1">{product.barcode}</Text>

          <View className="flex-row items-center mt-2 space-x-2">
            {showPrice && (
              <Text className="text-lg font-bold text-primary-600">
                R$ {product.price.toFixed(2)}
              </Text>
            )}

            {showStock && <Badge variant={stockStatus}>{product.stock} un</Badge>}
          </View>
        </View>
      </View>
    </Card>
  );
}
```

---

### Fase 2: Componentes de Scanner

#### TASK-UI-004: Scanner Overlay

- **Prioridade**: 🟡 Alta
- **Estimativa**: 1.5h
- **Dependências**: TASK-UI-001
- **Status**: ⬜ Não iniciado

**Descrição**:
Overlay visual para área de escaneamento.

**Critérios de Aceite**:

- [ ] Moldura de escaneamento animada
- [ ] Linha de scan animada
- [ ] Corners destacados
- [ ] Área de código detectado

**Arquivo**: `app/components/scanner/ScannerOverlay.tsx`

```typescript
import { View, Animated, Dimensions } from 'react-native';
import { useEffect, useRef } from 'react';

const { width } = Dimensions.get('window');
const SCAN_AREA_SIZE = width * 0.7;

export function ScannerOverlay() {
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const scanLineTranslate = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCAN_AREA_SIZE - 4],
  });

  return (
    <View className="absolute inset-0 items-center justify-center">
      {/* Dark overlay */}
      <View className="absolute inset-0 bg-black/50" />

      {/* Scan area (transparent) */}
      <View
        style={{ width: SCAN_AREA_SIZE, height: SCAN_AREA_SIZE }}
        className="bg-transparent border-2 border-white rounded-2xl overflow-hidden"
      >
        {/* Animated scan line */}
        <Animated.View
          style={{
            transform: [{ translateY: scanLineTranslate }],
          }}
          className="h-1 bg-primary-500 opacity-70"
        />

        {/* Corner decorations */}
        <View className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary-500 rounded-tl-xl" />
        <View className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary-500 rounded-tr-xl" />
        <View className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary-500 rounded-bl-xl" />
        <View className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary-500 rounded-br-xl" />
      </View>

      {/* Instructions */}
      <View className="absolute bottom-32">
        <View className="bg-black/70 px-4 py-2 rounded-full">
          <Text className="text-white text-sm">Posicione o código de barras na área</Text>
        </View>
      </View>
    </View>
  );
}
```

---

### Fase 3: Layout e Navegação

#### TASK-UI-005: Tab Bar Customizada

- **Prioridade**: 🟡 Alta
- **Estimativa**: 1.5h
- **Dependências**: TASK-UI-002
- **Status**: ⬜ Não iniciado

**Descrição**:
Tab bar customizada com indicador de conexão.

**Critérios de Aceite**:

- [ ] Ícones animados
- [ ] Badge de notificação
- [ ] Indicador de conexão
- [ ] Haptic feedback

---

#### TASK-UI-006: Header Customizado

- **Prioridade**: 🟢 Média
- **Estimativa**: 1h
- **Dependências**: TASK-UI-002
- **Status**: ⬜ Não iniciado

**Descrição**:
Header reutilizável com status de conexão.

**Critérios de Aceite**:

- [ ] Título dinâmico
- [ ] Botões de ação
- [ ] Status de conexão
- [ ] Nome do desktop conectado

---

### Fase 4: Feedback e Estados

#### TASK-UI-007: Estados de Loading e Error

- **Prioridade**: 🟢 Média
- **Estimativa**: 1.5h
- **Dependências**: TASK-UI-002
- **Status**: ⬜ Não iniciado

**Descrição**:
Componentes para estados de carregamento e erro.

**Critérios de Aceite**:

- [ ] FullScreenLoader
- [ ] InlineLoader
- [ ] ErrorView com retry
- [ ] Toast notifications
- [ ] Skeleton loaders

**Arquivo**: `app/components/ui/Toast.tsx`

```typescript
import { useEffect } from 'react';
import { View, Text, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  show: (type: ToastType, message: string, duration?: number) => void;
  hide: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  show: (type, message, duration = 3000) => {
    const id = Math.random().toString(36).slice(2);

    // Haptic based on type
    if (type === 'error') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else if (type === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    set((state) => ({
      toasts: [...state.toasts, { id, type, message, duration }],
    }));

    if (duration > 0) {
      setTimeout(() => get().hide(id), duration);
    }
  },

  hide: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

const toastColors = {
  success: 'bg-success',
  error: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-info',
};

const toastIcons = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

export function ToastContainer() {
  const { toasts } = useToastStore();

  return (
    <View className="absolute top-12 left-4 right-4 z-50">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </View>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={{ opacity }}
      className={`${
        toastColors[toast.type]
      } flex-row items-center px-4 py-3 rounded-lg mb-2 shadow-lg`}
    >
      <Text className="text-white text-lg mr-2">{toastIcons[toast.type]}</Text>
      <Text className="text-white flex-1">{toast.message}</Text>
    </Animated.View>
  );
}
```

---

#### TASK-UI-008: Animações e Transições

- **Prioridade**: 🟢 Média
- **Estimativa**: 1.5h
- **Dependências**: TASK-UI-002
- **Status**: ⬜ Não iniciado

**Descrição**:
Animações para melhorar UX.

**Critérios de Aceite**:

- [ ] Fade in/out de telas
- [ ] Slide de cards
- [ ] Pulse para loading
- [ ] Shake para erro
- [ ] Spring para botões

---

## 📊 Resumo

| Fase          | Tarefas | Estimativa |
| ------------- | ------- | ---------- |
| Design System | 3       | 6.5h       |
| Scanner       | 1       | 1.5h       |
| Layout        | 2       | 2.5h       |
| Feedback      | 2       | 3h         |
| **Total**     | **8**   | **13.5h**  |

---

## ✅ Checklist Final

- [ ] Design tokens configurados
- [ ] Todos componentes atoms criados
- [ ] Todos componentes molecules criados
- [ ] Scanner overlay animado
- [ ] Tab bar customizada
- [ ] Sistema de toasts funcionando
- [ ] Loading states implementados
- [ ] Animações suaves

---

## 🔗 Próximo Agente

Após conclusão, acionar: **Testing** (05-testing)

---

_Última atualização: Janeiro 2026_

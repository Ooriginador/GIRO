# ⚛️ React Tauri Frontend Skill

> **Desenvolvimento de interfaces para aplicações desktop Tauri**  
> Versão: 1.0.0 | Última Atualização: 25 de Janeiro de 2026

## 📋 Descrição

Esta skill fornece conhecimento especializado para desenvolvimento de interfaces React em aplicações Tauri, incluindo:

- Componentes React com TypeScript
- Integração com Tauri Commands via `@tauri-apps/api`
- Estado global com Zustand
- Server state com TanStack Query
- Design system com TailwindCSS + Shadcn/UI
- Acessibilidade e responsividade

## 🛠️ Stack Técnica

| Componente      | Versão        | Uso               |
| --------------- | ------------- | ----------------- |
| React           | 18.3+         | UI Framework      |
| TypeScript      | 5.4+ (strict) | Type safety       |
| Vite            | 5.0+          | Build tool        |
| TailwindCSS     | 3.4+          | Styling           |
| Shadcn/UI       | latest        | Component library |
| Zustand         | 4.5+          | Client state      |
| TanStack Query  | 5.0+          | Server state      |
| @tauri-apps/api | 2.0+          | IPC bridge        |

## 📁 Estrutura Padrão

```
apps/desktop/src/
├── components/
│   ├── ui/              # Shadcn components
│   ├── layout/          # Shell, Sidebar, Header
│   ├── pdv/             # PDV específicos
│   ├── products/        # Produtos
│   └── common/          # Compartilhados
├── pages/
│   ├── pdv/
│   ├── products/
│   └── reports/
├── hooks/
│   ├── useProducts.ts
│   ├── usePDV.ts
│   └── useAuth.ts
├── stores/
│   ├── authStore.ts
│   └── pdvStore.ts
├── services/
│   └── tauri.ts         # Wrappers para commands
├── types/
│   └── index.ts
└── lib/
    └── utils.ts
```

## 📐 Padrões de Código

### Componente React

```tsx
'use client'; // Apenas se usar hooks

import { type FC, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ProductCardProps {
  product: Product;
  onSelect?: (product: Product) => void;
  className?: string;
}

export const ProductCard: FC<ProductCardProps> = ({ product, onSelect, className }) => {
  const handleClick = useCallback(() => {
    onSelect?.(product);
  }, [product, onSelect]);

  return (
    <div
      className={cn('p-4 rounded-lg border hover:shadow-md transition-shadow', className)}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`Selecionar ${product.name}`}
    >
      <h3 className="font-semibold">{product.name}</h3>
      <p className="text-2xl font-bold text-primary">{formatCurrency(product.salePrice)}</p>
    </div>
  );
};
```

### Hook com Tauri

```tsx
import { invoke } from '@tauri-apps/api/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useProducts(filter?: ProductFilter) {
  return useQuery({
    queryKey: ['products', filter],
    queryFn: () => invoke<Product[]>('get_products', { filter }),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProductInput) => invoke<Product>('create_product', { input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
```

### Zustand Store

```tsx
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PDVStore {
  items: SaleItem[];
  customer: Customer | null;
  addItem: (product: Product, quantity: number) => void;
  removeItem: (index: number) => void;
  clear: () => void;
  total: () => number;
}

export const usePDVStore = create<PDVStore>()(
  persist(
    (set, get) => ({
      items: [],
      customer: null,

      addItem: (product, quantity) => {
        set((state) => ({
          items: [...state.items, { product, quantity }],
        }));
      },

      removeItem: (index) => {
        set((state) => ({
          items: state.items.filter((_, i) => i !== index),
        }));
      },

      clear: () => set({ items: [], customer: null }),

      total: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.product.salePrice * item.quantity, 0);
      },
    }),
    { name: 'pdv-storage' }
  )
);
```

## 🎨 Design Tokens

```css
/* Cores GIRO */
--primary: #2563eb; /* Blue 600 */
--primary-hover: #1d4ed8; /* Blue 700 */
--success: #16a34a; /* Green 600 */
--warning: #ea580c; /* Orange 600 */
--error: #dc2626; /* Red 600 */
--background: #f8fafc; /* Slate 50 */
--foreground: #0f172a; /* Slate 900 */
```

## ✅ Checklist

- [ ] TypeScript types completos
- [ ] className prop para customização
- [ ] Acessibilidade (aria-labels, roles, tabIndex)
- [ ] Mobile-first responsive
- [ ] Loading e error states
- [ ] Keyboard navigation

## 🔗 Recursos

- [Tauri JS API](https://v2.tauri.app/reference/javascript/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Shadcn/UI](https://ui.shadcn.com/)
- [Zustand](https://zustand-demo.pmnd.rs/)

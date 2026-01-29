---
mode: agent
description: Adiciona um novo componente React seguindo padrões do projeto
variables:
  - name: componentName
    description: Nome do componente (PascalCase, ex: ProductCard, SalesSummary)
  - name: type
    description: Tipo (page, feature, ui, form)
  - name: description
    description: O que o componente faz
agent: Frontend
---

# Criar Componente React: `{{componentName}}`

## Tipo: {{type}}
> {{description}}

---

## Instruções por Tipo

### Se `type === 'page'`
Criar em `apps/desktop/src/pages/{{componentName}}.tsx`:

```tsx
import { useEffect } from 'react';
import { useKeyboard } from '@/hooks/useKeyboard';

export default function {{componentName}}Page() {
  // Registrar atalhos
  useKeyboard({
    'F1': () => console.log('Help'),
    'Escape': () => navigate(-1),
  });

  return (
    <div className="flex flex-col h-full p-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{{componentName}}</h1>
      </header>
      
      <main className="flex-1">
        {/* Content */}
      </main>
    </div>
  );
}
```

### Se `type === 'feature'`
Criar em `apps/desktop/src/components/features/{{componentName}}/`:
- `index.tsx` - Export principal
- `{{componentName}}.tsx` - Componente
- `use{{componentName}}.ts` - Hook dedicado
- `{{componentName}}.test.tsx` - Testes

### Se `type === 'ui'`
Criar em `apps/desktop/src/components/ui/{{componentName}}.tsx`:

```tsx
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const {{componentName | camelCase}}Variants = cva(
  'base-classes',
  {
    variants: {
      variant: {
        default: 'variant-classes',
        secondary: 'secondary-classes',
      },
      size: {
        sm: 'text-sm px-2 py-1',
        md: 'text-base px-4 py-2',
        lg: 'text-lg px-6 py-3',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

interface {{componentName}}Props
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof {{componentName | camelCase}}Variants> {
  // Custom props
}

export function {{componentName}}({
  className,
  variant,
  size,
  ...props
}: {{componentName}}Props) {
  return (
    <div
      className={cn({{componentName | camelCase}}Variants({ variant, size }), className)}
      {...props}
    />
  );
}
```

### Se `type === 'form'`
Criar com React Hook Form + Zod:

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const {{componentName | camelCase}}Schema = z.object({
  // Define schema
});

type {{componentName}}Data = z.infer<typeof {{componentName | camelCase}}Schema>;

interface {{componentName}}Props {
  onSubmit: (data: {{componentName}}Data) => void;
  defaultValues?: Partial<{{componentName}}Data>;
}

export function {{componentName}}({ onSubmit, defaultValues }: {{componentName}}Props) {
  const form = useForm<{{componentName}}Data>({
    resolver: zodResolver({{componentName | camelCase}}Schema),
    defaultValues,
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Form fields */}
      <button type="submit" className="btn-primary">
        Salvar
      </button>
    </form>
  );
}
```

---

## Padrões Obrigatórios

1. **TypeScript** - Tipos explícitos para props
2. **TailwindCSS** - Usar classes utilitárias
3. **Acessibilidade** - aria-labels, keyboard nav
4. **Responsividade** - Mobile-first
5. **Testes** - Pelo menos smoke test

## Checklist
- [ ] Componente criado com tipos
- [ ] Props documentadas
- [ ] Estilos com Tailwind
- [ ] Acessibilidade básica
- [ ] Teste adicionado
- [ ] Export no index.ts

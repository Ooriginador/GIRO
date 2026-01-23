---
description: Cria um novo componente React seguindo o Design System
name: Criar Componente
tools: ['search', 'createFile', 'editFiles']
---

# 🧱 Criar Novo Componente React

Crie um componente React completo seguindo os padrões da Arkheion Corp.

## Informações Necessárias

- **Nome do componente:** $COMPONENT_NAME
- **Projeto:** $PROJECT_NAME (Beautiful-Queen, TikTrend, Daily)
- **Tipo:** $COMPONENT_TYPE (atom, molecule, organism, page)
- **Props necessárias:** $PROPS_DESCRIPTION

## Estrutura de Arquivos a Criar

```
src/components/[tipo]/[ComponentName]/
├── index.tsx           # Export principal
├── [ComponentName].tsx # Implementação
├── [ComponentName].test.tsx # Testes
└── [ComponentName].stories.tsx # Storybook (opcional)
```

## Template do Componente

```tsx
'use client'; // Apenas se usar hooks de client

import { type FC } from 'react';
import { cn } from '@/lib/utils';

interface ${COMPONENT_NAME}Props {
  className?: string;
  // adicionar props
}

export const ${COMPONENT_NAME}: FC<${COMPONENT_NAME}Props> = ({
  className,
  ...props
}) => {
  return (
    <div className={cn('', className)} {...props}>
      {/* Implementação */}
    </div>
  );
};
```

## Checklist

- [ ] TypeScript types completos
- [ ] Prop className para customização
- [ ] Acessibilidade (aria-labels, roles)
- [ ] Responsivo (mobile-first)
- [ ] Teste unitário básico
- [ ] Documentação de props

## Variações do Design System

### Beautiful-Queen
- Cores: rose-gold, champagne
- Bordas arredondadas
- Sombras suaves
- Fonte: Playfair Display (títulos)

### TikTrend
- Cores vibrantes (vermelho, ciano)
- Gradientes
- Animações dinâmicas

### Daily
- Minimalista
- Preto e dourado
- Linhas retas

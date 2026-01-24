/**
 * Componente Badge - Indicadores de status
 */

import { cn } from '@lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { Text, View, type ViewProps } from 'react-native';

const badgeVariants = cva('flex-row items-center justify-center rounded-full', {
  variants: {
    variant: {
      default: 'bg-primary-100',
      secondary: 'bg-secondary-100',
      success: 'bg-success/10',
      warning: 'bg-warning/10',
      error: 'bg-error/10',
      info: 'bg-info/10',
      muted: 'bg-background-tertiary',
      destructive: 'bg-error/10',
      outline: 'bg-transparent border border-border',
    },
    size: {
      sm: 'px-2 py-0.5',
      default: 'px-2.5 py-1',
      lg: 'px-3 py-1.5',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

const textVariants = cva('font-medium text-center', {
  variants: {
    variant: {
      default: 'text-primary-700',
      success: 'text-success',
      warning: 'text-warning',
      error: 'text-error',
      info: 'text-info',
      muted: 'text-foreground-muted',
      secondary: 'text-secondary-700',
      outline: 'text-muted-foreground',
      destructive: 'text-error',
    },
    size: {
      sm: 'text-xs',
      default: 'text-xs',
      lg: 'text-sm',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

interface BadgeProps extends ViewProps, VariantProps<typeof badgeVariants> {
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export function Badge({ children, variant, size, icon, className, ...props }: BadgeProps) {
  return (
    <View className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {icon && <View className="mr-1">{icon}</View>}
      <Text className={textVariants({ variant, size })}>{children}</Text>
    </View>
  );
}

// Badge específico para estoque
interface StockBadgeProps extends ViewProps {
  current: number;
  minimum: number;
}

export function StockBadge({ current, minimum, className, ...props }: StockBadgeProps) {
  let variant: 'success' | 'warning' | 'error' = 'success';
  let label = 'OK';

  if (current <= 0) {
    variant = 'error';
    label = 'Sem estoque';
  } else if (current <= minimum) {
    variant = 'warning';
    label = 'Baixo';
  }

  return (
    <Badge variant={variant} className={className} {...props}>
      {label}
    </Badge>
  );
}

// Badge para validade
interface ExpirationBadgeProps extends ViewProps {
  daysUntil?: number;
  expirationDate?: string | Date; // Compatibilidade com datas diretas
}

export function ExpirationBadge({
  daysUntil,
  expirationDate,
  className,
  ...props
}: ExpirationBadgeProps) {
  let days = daysUntil;

  // Se passou data, calcula dias restantes
  if (expirationDate) {
    const date = new Date(expirationDate);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  if (days === undefined) return null;

  let variant: 'success' | 'warning' | 'error' = 'success';
  let label = `${days}d`;

  if (days <= 0) {
    variant = 'error';
    label = 'Vencido';
  } else if (days <= 2) {
    variant = 'error';
    label = days === 1 ? 'Amanhã' : `${days}d`;
  } else if (days <= 7) {
    variant = 'warning';
  }

  return (
    <Badge variant={variant} className={className} {...props}>
      {label}
    </Badge>
  );
}

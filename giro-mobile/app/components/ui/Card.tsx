/**
 * Componente Card - Container com estilo de cartão
 */

import { cn } from '@lib/utils';
import React from 'react';
import { View, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'default' | 'lg';
}

export function Card({
  children,
  variant = 'default',
  padding = 'default',
  className,
  ...props
}: CardProps) {
  return (
    <View
      className={cn(
        'bg-background rounded-xl',
        {
          // Variantes
          'border border-border': variant === 'default' || variant === 'outlined',
          'shadow-lg': variant === 'elevated',

          // Padding
          'p-0': padding === 'none',
          'p-2': padding === 'sm',
          'p-4': padding === 'default',
          'p-6': padding === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </View>
  );
}

interface CardHeaderProps extends ViewProps {
  children: React.ReactNode;
}

export function CardHeader({ children, className, ...props }: CardHeaderProps) {
  return (
    <View className={cn('pb-3 border-b border-border', className)} {...props}>
      {children}
    </View>
  );
}

interface CardContentProps extends ViewProps {
  children: React.ReactNode;
}

export function CardContent({ children, className, ...props }: CardContentProps) {
  return (
    <View className={cn('py-3', className)} {...props}>
      {children}
    </View>
  );
}

interface CardFooterProps extends ViewProps {
  children: React.ReactNode;
}

export function CardFooter({ children, className, ...props }: CardFooterProps) {
  return (
    <View className={cn('pt-3 border-t border-border', className)} {...props}>
      {children}
    </View>
  );
}

// =============================================================================
// TEXT COMPONENTS
// =============================================================================

import { Text, type TextProps } from 'react-native';

interface CardTitleProps extends TextProps {
  children: React.ReactNode;
}

export function CardTitle({ children, className, ...props }: CardTitleProps) {
  return (
    <Text className={cn('text-lg font-semibold text-foreground', className)} {...props}>
      {children}
    </Text>
  );
}

interface CardDescriptionProps extends TextProps {
  children: React.ReactNode;
}

export function CardDescription({ children, className, ...props }: CardDescriptionProps) {
  return (
    <Text className={cn('text-sm text-muted-foreground', className)} {...props}>
      {children}
    </Text>
  );
}

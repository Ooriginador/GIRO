/**
 * Componente Button - Botões reutilizáveis
 */

import { useHaptics } from '@hooks/useHaptics';
import { cn } from '@lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  type TouchableOpacityProps,
} from 'react-native';

const buttonVariants = cva('flex-row items-center justify-center rounded-lg', {
  variants: {
    variant: {
      default: 'bg-primary-500',
      secondary: 'bg-background-secondary border border-border',
      outline: 'bg-transparent border border-primary-500',
      ghost: 'bg-transparent',
      destructive: 'bg-error',
    },
    size: {
      sm: 'px-3 py-2',
      default: 'px-4 py-3',
      lg: 'px-6 py-4',
      icon: 'p-3',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

const textVariants = cva('font-semibold text-center', {
  variants: {
    variant: {
      default: 'text-white',
      secondary: 'text-foreground',
      outline: 'text-primary-500',
      ghost: 'text-foreground',
      destructive: 'text-white',
    },
    size: {
      sm: 'text-sm',
      default: 'text-base',
      lg: 'text-lg',
      icon: 'text-base',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

interface ButtonProps extends TouchableOpacityProps, VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  children,
  variant,
  size,
  isLoading,
  leftIcon,
  rightIcon,
  disabled,
  className,
  style,
  onPress,
  ...props
}: ButtonProps) {
  const { selection } = useHaptics();

  const handlePress = async (event: any) => {
    await selection();
    onPress?.(event);
  };

  const isDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      className={cn(buttonVariants({ variant, size }), isDisabled && 'opacity-50', className)}
      style={style}
      disabled={isDisabled}
      onPress={handlePress}
      activeOpacity={0.7}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'default' || variant === 'destructive' ? '#fff' : '#22c55e'}
        />
      ) : (
        <>
          {leftIcon && <>{leftIcon}</>}
          <Text
            className={cn(textVariants({ variant, size }), leftIcon && 'ml-2', rightIcon && 'mr-2')}
          >
            {children}
          </Text>
          {rightIcon && <>{rightIcon}</>}
        </>
      )}
    </TouchableOpacity>
  );
}

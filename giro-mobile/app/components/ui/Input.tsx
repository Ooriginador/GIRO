/**
 * Componente Input - Campo de entrada de texto
 */

import { cn } from '@lib/utils';
import React, { forwardRef } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      containerClassName,
      className,
      editable = true,
      ...props
    },
    ref
  ) => {
    const hasError = !!error;

    return (
      <View className={cn('w-full', containerClassName)}>
        {label && <Text className="text-sm font-medium text-foreground mb-1.5">{label}</Text>}

        <View
          className={cn(
            'flex-row items-center bg-background-secondary rounded-lg border',
            hasError ? 'border-error' : 'border-border',
            !editable && 'opacity-50'
          )}
        >
          {leftIcon && <View className="pl-3">{leftIcon}</View>}

          <TextInput
            ref={ref}
            className={cn(
              'flex-1 px-4 py-3 text-base text-foreground',
              leftIcon && 'pl-2',
              rightIcon && 'pr-2',
              className
            )}
            placeholderTextColor="#9ca3af"
            editable={editable}
            {...props}
          />

          {rightIcon && <View className="pr-3">{rightIcon}</View>}
        </View>

        {(error || helperText) && (
          <Text className={cn('text-xs mt-1.5', hasError ? 'text-error' : 'text-foreground-muted')}>
            {error || helperText}
          </Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

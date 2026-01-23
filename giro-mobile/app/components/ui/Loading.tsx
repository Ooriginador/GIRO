/**
 * Componente Loading - Indicadores de carregamento
 */

import { cn } from '@lib/utils';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

interface LoadingProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

export function Loading({
  size = 'large',
  color = '#22c55e',
  text,
  fullScreen = false,
  className,
}: LoadingProps) {
  const content = (
    <>
      <ActivityIndicator size={size} color={color} />
      {text && <Text className="text-foreground-secondary mt-3 text-center">{text}</Text>}
    </>
  );

  if (fullScreen) {
    return (
      <View className={cn('flex-1 justify-center items-center bg-background', className)}>
        {content}
      </View>
    );
  }

  return <View className={cn('justify-center items-center py-8', className)}>{content}</View>;
}

// Loading overlay
interface LoadingOverlayProps {
  visible: boolean;
  text?: string;
}

export function LoadingOverlay({ visible, text }: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <View className="absolute inset-0 bg-black/50 justify-center items-center z-50">
      <View className="bg-background rounded-xl p-6 items-center">
        <ActivityIndicator size="large" color="#22c55e" />
        {text && <Text className="text-foreground mt-3">{text}</Text>}
      </View>
    </View>
  );
}

// Skeleton loading
interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  className?: string;
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 4,
  className,
}: SkeletonProps) {
  return (
    <View
      className={cn('bg-background-tertiary animate-pulse', className)}
      style={{
        width,
        height,
        borderRadius,
      }}
    />
  );
}

// Empty state
interface EmptyStateProps {
  icon?: string | React.ReactNode;
  title: string;
  description?: string;
  message?: string; // alias for description
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon = '📦',
  title,
  description,
  message,
  action,
  className,
}: EmptyStateProps) {
  const desc = description || message;
  const isStringIcon = typeof icon === 'string';
  return (
    <View className={cn('items-center justify-center py-12 px-6', className)}>
      {isStringIcon ? (
        <Text className="text-5xl mb-4">{icon}</Text>
      ) : (
        <View className="mb-4">{icon}</View>
      )}
      <Text className="text-lg font-semibold text-foreground text-center mb-2">{title}</Text>
      {desc && <Text className="text-foreground-secondary text-center mb-6">{desc}</Text>}
      {action}
    </View>
  );
}

/**
 * ConnectionGuard Component
 * Protects routes that require connection/authentication
 */

import { useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Loading } from '@/components/ui/Loading';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useConnectionStore } from '@/stores/connectionStore';

interface ConnectionGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  fallback?: React.ReactNode;
}

export function ConnectionGuard({ children, requireAuth = true, fallback }: ConnectionGuardProps) {
  const router = useRouter();
  const segments = useSegments();
  const [isChecking, setIsChecking] = useState(true);

  const { connectionState, selectedDesktop, operator } = useConnectionStore();
  const { isConnected } = useWebSocket();

  useEffect(() => {
    const checkAuth = async () => {
      // Small delay to allow state to hydrate
      await new Promise((resolve) => setTimeout(resolve, 100));
      setIsChecking(false);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (isChecking) return;

    const inAuthGroup = segments[0] === '(tabs)';
    const inConnectScreen = segments[0] === 'connect';
    const inLoginScreen = segments[0] === 'login';

    // If in protected area
    if (inAuthGroup) {
      if (!isConnected || connectionState !== 'authenticated') {
        // Not authenticated, redirect to connect
        if (!selectedDesktop) {
          router.replace('/connect');
        } else if (!operator) {
          router.replace('/login');
        }
      }
    }

    // If in login screen but not connected
    if (inLoginScreen && !isConnected) {
      router.replace('/connect');
    }

    // If in connect screen but already authenticated
    if (inConnectScreen && connectionState === 'authenticated' && operator) {
      router.replace('/(tabs)');
    }
  }, [isChecking, isConnected, connectionState, operator, segments]);

  // Show loading while checking
  if (isChecking) {
    return (
      fallback || (
        <View className="flex-1 items-center justify-center bg-background">
          <Loading size="large" />
          <Text className="text-muted-foreground mt-4">Verificando conexão...</Text>
        </View>
      )
    );
  }

  // Check connection requirement
  if (requireAuth && connectionState !== 'authenticated') {
    return (
      fallback || (
        <View className="flex-1 items-center justify-center bg-background">
          <Loading size="large" />
          <Text className="text-muted-foreground mt-4">Redirecionando...</Text>
        </View>
      )
    );
  }

  return <>{children}</>;
}

/**
 * RequireConnection HOC
 * Wrapper to require connection for a component
 */
export function withConnectionGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: { requireAuth?: boolean }
) {
  return function WithConnectionGuard(props: P) {
    return (
      <ConnectionGuard requireAuth={options?.requireAuth}>
        <WrappedComponent {...props} />
      </ConnectionGuard>
    );
  };
}

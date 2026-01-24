/**
 * ConnectionStatus Component
 * Displays current connection status with desktop
 */

import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useWebSocket } from '@/hooks/useWebSocket';
import { useConnectionStore } from '@/stores/connectionStore';

interface ConnectionStatusProps {
  variant?: 'badge' | 'bar' | 'minimal';
  onPress?: () => void;
  showDesktopName?: boolean;
}

export function ConnectionStatus({
  variant = 'badge',
  onPress,
  showDesktopName = true,
}: ConnectionStatusProps) {
  const { selectedDesktop, connectionState: _connectionState, operator } = useConnectionStore();
  const { isConnected, isConnecting } = useWebSocket();

  // Pulse animation for connecting state
  const opacity = useSharedValue(1);

  if (isConnecting) {
    opacity.value = withRepeat(
      withTiming(0.5, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  } else {
    opacity.value = 1;
  }

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Get status info
  const getStatusInfo = () => {
    if (isConnecting) {
      return {
        icon: RefreshCw,
        color: 'text-warning',
        bgColor: 'bg-warning/20',
        label: 'Conectando...',
      };
    }
    if (isConnected) {
      return {
        icon: Wifi,
        color: 'text-primary',
        bgColor: 'bg-primary/20',
        label: 'Conectado',
      };
    }
    return {
      icon: WifiOff,
      color: 'text-destructive',
      bgColor: 'bg-destructive/20',
      label: 'Desconectado',
    };
  };

  const status = getStatusInfo();
  const Icon = status.icon;

  // Minimal variant
  if (variant === 'minimal') {
    return (
      <Animated.View style={pulseStyle}>
        <View
          className={`w-3 h-3 rounded-full ${
            isConnected ? 'bg-primary' : isConnecting ? 'bg-warning' : 'bg-destructive'
          }`}
        />
      </Animated.View>
    );
  }

  // Badge variant
  if (variant === 'badge') {
    return (
      <Pressable onPress={onPress} disabled={!onPress}>
        <Animated.View
          style={pulseStyle}
          className={`flex-row items-center px-3 py-2 rounded-full ${status.bgColor}`}
        >
          <Icon size={14} className={status.color} />
          {showDesktopName && selectedDesktop && (
            <Text className={`ml-2 text-sm font-medium ${status.color}`} numberOfLines={1}>
              {selectedDesktop.name}
            </Text>
          )}
          {!showDesktopName && (
            <Text className={`ml-2 text-sm font-medium ${status.color}`}>{status.label}</Text>
          )}
        </Animated.View>
      </Pressable>
    );
  }

  // Bar variant
  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <Animated.View
        style={pulseStyle}
        className={`flex-row items-center justify-between px-4 py-3 ${status.bgColor}`}
      >
        <View className="flex-row items-center">
          <Icon size={18} className={status.color} />
          <View className="ml-3">
            <Text className={`font-medium ${status.color}`}>{status.label}</Text>
            {selectedDesktop && (
              <Text className="text-xs text-muted-foreground">
                {selectedDesktop.name} • {selectedDesktop.ip}
              </Text>
            )}
          </View>
        </View>

        {operator && (
          <View className="flex-row items-center">
            <View className="w-8 h-8 bg-white rounded-full items-center justify-center">
              <Text className="text-primary font-semibold">
                {operator.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

/**
 * ConnectionAlert Component
 * Shows when connection is lost
 */
interface ConnectionAlertProps {
  onReconnect?: () => void;
}

export function ConnectionAlert({ onReconnect }: ConnectionAlertProps) {
  const { isConnected } = useWebSocket();

  if (isConnected) return null;

  return (
    <View className="absolute top-0 left-0 right-0 bg-destructive/95 px-4 py-3 flex-row items-center">
      <AlertCircle size={20} className="text-white mr-3" />
      <View className="flex-1">
        <Text className="text-white font-medium">Conexão perdida</Text>
        <Text className="text-white/80 text-xs">Tentando reconectar automaticamente...</Text>
      </View>
      {onReconnect && (
        <Pressable onPress={onReconnect} className="bg-white/20 px-3 py-1 rounded">
          <Text className="text-white text-sm">Reconectar</Text>
        </Pressable>
      )}
    </View>
  );
}

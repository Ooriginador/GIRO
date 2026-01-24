/**
 * Login Screen - PIN Authentication
 * Numeric keypad for operator authentication
 */

import { useRouter } from 'expo-router';
import { Delete, LogIn, Wifi, WifiOff } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { useToast } from '@/components/ui/Toast';
import { useHaptics } from '@/hooks/useHaptics';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useConnectionStore } from '@/stores/connectionStore';

const PIN_LENGTH = 4;
const KEYPAD_NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'];

export default function LoginScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { hapticSelection, hapticSuccess, hapticError } = useHaptics();

  const { login, isConnected } = useWebSocket();
  const { selectedDesktop, connectionState: _connectionState } = useConnectionStore();

  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shake animation for error
  const shakeX = useSharedValue(0);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const triggerShake = () => {
    shakeX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  };

  const handleKeyPress = useCallback(
    (key: string) => {
      hapticSelection();
      setError(null);

      if (key === 'delete') {
        setPin((prev) => prev.slice(0, -1));
      } else if (pin.length < PIN_LENGTH) {
        const newPin = pin + key;
        setPin(newPin);

        // Auto-submit when PIN is complete
        if (newPin.length === PIN_LENGTH) {
          handleLogin(newPin);
        }
      }
    },
    [pin]
  );

  const handleLogin = async (pinToSubmit: string) => {
    if (pinToSubmit.length !== PIN_LENGTH) return;

    setIsLoading(true);
    setError(null);

    try {
      await login(pinToSubmit);
      hapticSuccess();
      showToast({
        type: 'success',
        title: 'Bem-vindo!',
        message: 'Login realizado com sucesso',
      });
      router.replace('/(tabs)');
    } catch (err: any) {
      hapticError();
      triggerShake();
      setPin('');
      setError(err.message || 'PIN inválido');
      showToast({
        type: 'error',
        title: 'Erro de Autenticação',
        message: 'PIN incorreto. Tente novamente.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    router.replace('/connect');
  };

  // PIN dots
  const renderPinDots = () => (
    <View className="flex-row justify-center gap-4 my-8">
      {Array.from({ length: PIN_LENGTH }).map((_, index) => (
        <Animated.View
          key={index}
          style={shakeStyle}
          className={`w-4 h-4 rounded-full ${
            index < pin.length ? 'bg-primary' : 'bg-muted border-2 border-border'
          }`}
        />
      ))}
    </View>
  );

  // Keypad button
  const KeypadButton = ({ value }: { value: string }) => {
    if (value === '') return <View className="w-20 h-20" />;

    const isDelete = value === 'delete';

    return (
      <Pressable
        onPress={() => handleKeyPress(value)}
        disabled={isLoading}
        className="w-20 h-20 items-center justify-center rounded-full bg-card border border-border active:bg-muted active:scale-95"
      >
        {isDelete ? (
          <Delete size={28} className="text-foreground" />
        ) : (
          <Text className="text-3xl font-semibold text-foreground">{value}</Text>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-6 py-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-3xl font-bold text-foreground">Login</Text>
            <Text className="text-muted-foreground mt-1">Digite seu PIN de acesso</Text>
          </View>

          {/* Connection Status */}
          <Pressable
            onPress={handleDisconnect}
            className="flex-row items-center bg-muted px-3 py-2 rounded-full"
          >
            {isConnected ? (
              <Wifi size={16} className="text-primary mr-2" />
            ) : (
              <WifiOff size={16} className="text-destructive mr-2" />
            )}
            <Text className="text-sm text-foreground" numberOfLines={1}>
              {selectedDesktop?.name || 'Desconectado'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Main Content */}
      <View className="flex-1 justify-center px-6">
        {/* User Icon */}
        <View className="items-center mb-4">
          <View className="w-20 h-20 bg-primary/10 rounded-full items-center justify-center">
            <LogIn size={40} className="text-primary" />
          </View>
        </View>

        {/* PIN Dots */}
        {renderPinDots()}

        {/* Error Message */}
        {error && <Text className="text-destructive text-center mb-4">{error}</Text>}

        {/* Loading */}
        {isLoading && (
          <View className="items-center mb-4">
            <Loading size="small" />
            <Text className="text-muted-foreground mt-2">Autenticando...</Text>
          </View>
        )}

        {/* Keypad */}
        <View className="items-center">
          <View className="flex-row flex-wrap justify-center gap-4 max-w-[280px]">
            {KEYPAD_NUMBERS.map((num, index) => (
              <KeypadButton key={index} value={num} />
            ))}
          </View>
        </View>
      </View>

      {/* Footer */}
      <View className="px-6 py-4">
        <Button variant="ghost" onPress={handleDisconnect} className="w-full">
          <Text className="text-muted-foreground">Trocar Desktop</Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}

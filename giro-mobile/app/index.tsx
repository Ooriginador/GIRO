/**
 * Index Screen - Splash/Redirect
 * Checks connection state and redirects accordingly
 */

import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Loading } from '@/components/ui/Loading';
import { useConnectionStore } from '@/stores/connectionStore';

export default function IndexScreen() {
  const router = useRouter();
  const { connectionState, selectedDesktop, operator } = useConnectionStore();

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    // Animate in
    opacity.value = withTiming(1, { duration: 500 });
    scale.value = withSequence(
      withTiming(1.1, { duration: 300 }),
      withTiming(1, { duration: 200 })
    );

    // Check state and redirect after animation
    const timer = setTimeout(() => {
      if (connectionState === 'authenticated' && operator) {
        // User is authenticated, go to main app
        router.replace('/(tabs)');
      } else if (connectionState === 'connected' && selectedDesktop) {
        // Connected but not authenticated, go to login
        router.replace('/login');
      } else if (selectedDesktop) {
        // Has a saved desktop, try to connect
        router.replace('/connect');
      } else {
        // No saved desktop, discover
        router.replace('/connect');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View className="flex-1 items-center justify-center bg-primary">
      <Animated.View style={animatedStyle} className="items-center">
        {/* Logo */}
        <View className="w-32 h-32 bg-white rounded-3xl items-center justify-center mb-6 shadow-lg">
          <Text className="text-5xl font-bold text-primary">G</Text>
        </View>

        {/* App Name */}
        <Text className="text-4xl font-bold text-white mb-2">GIRO</Text>
        <Text className="text-lg text-white/80">Mobile</Text>

        {/* Loading indicator */}
        <View className="mt-12">
          <Loading size="large" color="white" />
        </View>

        {/* Version */}
        <Text className="absolute bottom-8 text-white/60 text-sm">v0.1.0</Text>
      </Animated.View>
    </View>
  );
}

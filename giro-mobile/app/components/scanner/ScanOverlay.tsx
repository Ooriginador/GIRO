/**
 * ScanOverlay Component
 * Overlay with corners and scan line animation
 */

import { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface ScanOverlayProps {
  isActive?: boolean;
  scanAreaSize?: { width: number; height: number };
  message?: string;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function ScanOverlay({
  isActive = true,
  scanAreaSize = { width: 280, height: 180 },
  message = 'Posicione o código de barras',
}: ScanOverlayProps) {
  const scanLineY = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      scanLineY.value = withRepeat(
        withSequence(
          withTiming(scanAreaSize.height - 10, {
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0, {
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        false
      );
    }
  }, [isActive, scanAreaSize.height]);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
  }));

  const horizontalOverlayWidth = (SCREEN_WIDTH - scanAreaSize.width) / 2;
  const verticalOverlayHeight = (SCREEN_HEIGHT - scanAreaSize.height) / 2;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {/* Top overlay */}
      <View className="bg-black/50" style={{ height: verticalOverlayHeight - 50, width: '100%' }} />

      {/* Middle row */}
      <View className="flex-row" style={{ height: scanAreaSize.height }}>
        {/* Left overlay */}
        <View className="bg-black/50" style={{ width: horizontalOverlayWidth }} />

        {/* Scan area */}
        <View
          className="relative"
          style={{
            width: scanAreaSize.width,
            height: scanAreaSize.height,
          }}
        >
          {/* Corner: Top-Left */}
          <View className="absolute top-0 left-0">
            <View className="w-6 h-1 bg-white" />
            <View className="w-1 h-6 bg-white" />
          </View>

          {/* Corner: Top-Right */}
          <View className="absolute top-0 right-0">
            <View className="w-6 h-1 bg-white absolute right-0" />
            <View className="w-1 h-6 bg-white absolute right-0" />
          </View>

          {/* Corner: Bottom-Left */}
          <View className="absolute bottom-0 left-0">
            <View className="w-6 h-1 bg-white absolute bottom-0" />
            <View className="w-1 h-6 bg-white absolute bottom-0" />
          </View>

          {/* Corner: Bottom-Right */}
          <View className="absolute bottom-0 right-0">
            <View className="w-6 h-1 bg-white absolute bottom-0 right-0" />
            <View className="w-1 h-6 bg-white absolute bottom-0 right-0" />
          </View>

          {/* Scan line */}
          {isActive && (
            <Animated.View
              style={[scanLineStyle, styles.scanLine]}
              className="absolute left-4 right-4 h-0.5 bg-primary"
            />
          )}
        </View>

        {/* Right overlay */}
        <View className="bg-black/50" style={{ width: horizontalOverlayWidth }} />
      </View>

      {/* Bottom overlay with message */}
      <View className="bg-black/50 items-center pt-6" style={{ flex: 1 }}>
        <Text className="text-white text-sm text-center">{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scanLine: {
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  },
});

/**
 * BarcodeScanner Component
 * Camera-based barcode scanning with overlay
 */

import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { Flashlight, FlashlightOff } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { useHaptics } from '@/hooks/useHaptics';
import { useSettingsStore } from '@/stores/settingsStore';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  isActive?: boolean;
  showFlashButton?: boolean;
  scanDelay?: number;
}

export function BarcodeScanner({
  onScan,
  isActive = true,
  showFlashButton = true,
  scanDelay = 1500,
}: BarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [canScan, setCanScan] = useState(true);

  const { hapticSelection } = useHaptics();
  const { continuousScan, vibrationEnabled } = useSettingsStore();

  // Scan line animation
  const scanLineY = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      scanLineY.value = withRepeat(
        withSequence(
          withTiming(150, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    }
  }, [isActive]);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
  }));

  // Handle barcode scanned
  const handleBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (!canScan || !isActive) return;

      const { data } = result;

      // Prevent duplicate scans
      if (data === lastScanned) return;

      setLastScanned(data);
      setCanScan(false);

      // Haptic feedback
      if (vibrationEnabled) {
        hapticSelection();
      }

      // Call onScan callback
      onScan(data);

      // Reset scan ability after delay
      setTimeout(() => {
        setCanScan(true);
        if (!continuousScan) {
          setLastScanned(null);
        }
      }, scanDelay);
    },
    [canScan, isActive, lastScanned, onScan, scanDelay, continuousScan, vibrationEnabled]
  );

  // Permission not determined yet
  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Loading size="large" color="white" />
      </View>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text className="text-xl font-semibold text-foreground text-center mb-2">
          Permissão de Câmera
        </Text>
        <Text className="text-muted-foreground text-center mb-6">
          Precisamos de acesso à câmera para escanear códigos de barras
        </Text>
        <Button onPress={requestPermission}>
          <Text className="text-primary-foreground">Permitir Acesso</Text>
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={flashEnabled}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e', 'qr'],
        }}
        onBarcodeScanned={isActive ? handleBarcodeScanned : undefined}
      />

      {/* Scan Overlay */}
      <View className="flex-1 items-center justify-center">
        {/* Dimmed areas */}
        <View className="absolute inset-0 bg-black/40" />

        {/* Scan area */}
        <View className="w-72 h-48 relative">
          {/* Clear area */}
          <View className="absolute inset-0 bg-transparent" style={styles.clearArea} />

          {/* Corner indicators */}
          <View className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
          <View className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
          <View className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
          <View className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />

          {/* Scan line */}
          {isActive && (
            <Animated.View
              style={[scanLineStyle, styles.scanLine]}
              className="absolute left-2 right-2 h-0.5 bg-primary"
            />
          )}
        </View>

        {/* Instructions */}
        <Text className="text-white text-sm mt-6 text-center px-8">
          {isActive ? 'Posicione o código de barras dentro da área' : 'Scanner pausado'}
        </Text>
      </View>

      {/* Flash Button */}
      {showFlashButton && (
        <Pressable
          onPress={() => setFlashEnabled(!flashEnabled)}
          className="absolute top-4 right-4 w-12 h-12 bg-black/50 rounded-full items-center justify-center"
        >
          {flashEnabled ? (
            <Flashlight size={24} className="text-yellow-400" />
          ) : (
            <FlashlightOff size={24} className="text-white" />
          )}
        </Pressable>
      )}

      {/* Scan Status Indicator */}
      {!canScan && (
        <View className="absolute bottom-20 left-0 right-0 items-center">
          <View className="bg-primary px-4 py-2 rounded-full">
            <Text className="text-white text-sm font-medium">Processando...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  clearArea: {
    // This creates a transparent hole in the overlay
    backgroundColor: 'transparent',
  },
  scanLine: {
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
});
